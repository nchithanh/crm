import type { Course, Promotion, PromotionCode } from "@/types";
import { formatVnd, localDayKey } from "@/lib/utils";

export type PromotionPhase = "running" | "upcoming" | "off";

export function asPromotion(row: Promotion): Promotion {
  return {
    id: row.id,
    name: row.name,
    startDay: row.startDay ?? "",
    endDay: row.endDay ?? "",
    weekdays: row.weekdays ?? [],
    branchIds: row.branchIds ?? [],
    courseIds: row.courseIds ?? [],
    minTuition: row.minTuition ?? null,
    benefit: row.benefit ?? "amount",
    benefitValue: row.benefitValue ?? 0,
    codeMode: row.codeMode ?? "none",
    codes: row.codes ?? [],
    oncePerStudent: Boolean(row.oncePerStudent),
    active: Boolean(row.active),
    note: row.note ?? "",
  };
}

export function promotionPhase(row: Promotion, today = localDayKey()): PromotionPhase {
  const promo = asPromotion(row);
  if (!promo.active || (promo.endDay && today > promo.endDay)) return "off";
  if (promo.startDay && today < promo.startDay) return "upcoming";
  return "running";
}

export function benefitText(row: Promotion) {
  const promo = asPromotion(row);
  if (promo.benefit === "percent") return `Giảm ${promo.benefitValue}%`;
  if (promo.benefit === "sessions") return `Tặng ${promo.benefitValue} buổi`;
  return `Giảm ${formatVnd(promo.benefitValue)}`;
}

export function splitCodes(raw: string) {
  return raw
    .split(/[\s,;]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

export function weekdayHits(promo: Promotion, course: Pick<Course, "weekdays"> | undefined, today: string) {
  if (promo.weekdays.length === 0) return true;
  const days = course?.weekdays ?? [];
  if (days.length > 0) return days.some((day) => promo.weekdays.includes(day));
  const todayWeekday = new Date(`${today}T12:00:00`).getDay();
  return promo.weekdays.includes(todayWeekday);
}

export type PromoQuote = {
  listPrice: number;
  discount: number;
  payable: number;
  extraSessions: number;
  usedCodes: string[];
};

/** Điều kiện AND. Mã OR cần một mã. Mã AND cần đủ bộ. */
export function quotePromotion(input: {
  promotion: Promotion;
  tuition: number;
  course?: Pick<Course, "id" | "branchId" | "weekdays">;
  today?: string;
  codes?: string[];
  alreadyUsed?: boolean;
}): { quote: PromoQuote | null; error: string } {
  const promo = asPromotion(input.promotion);
  const today = input.today ?? localDayKey();
  const tuition = Math.max(0, Math.round(input.tuition));
  if (!promo.active) return { quote: null, error: "Chương trình đang tắt." };
  if (promo.startDay && today < promo.startDay) return { quote: null, error: "Chương trình chưa bắt đầu." };
  if (promo.endDay && today > promo.endDay) return { quote: null, error: "Chương trình đã hết hạn." };
  if (!weekdayHits(promo, input.course, today)) return { quote: null, error: "Không đúng thứ của chương trình." };
  if (promo.branchIds.length > 0 && input.course && !promo.branchIds.includes(input.course.branchId)) {
    return { quote: null, error: "Không áp dụng cho chi nhánh này." };
  }
  if (promo.courseIds.length > 0 && input.course && !promo.courseIds.includes(input.course.id)) {
    return { quote: null, error: "Không áp dụng cho khóa này." };
  }
  if (promo.minTuition != null && tuition < promo.minTuition) {
    return { quote: null, error: "Học phí chưa đạt ngưỡng." };
  }
  if (promo.oncePerStudent && input.alreadyUsed) {
    return { quote: null, error: "Học viên đã dùng chương trình này." };
  }
  const entered = input.codes ?? [];
  const usedCodes = codesUsed(promo, entered);
  if (!usedCodes) return { quote: null, error: "Mã không khớp hoặc đã hết lượt." };
  const discount = discountOf(promo, tuition);
  const extraSessions = promo.benefit === "sessions" ? Math.max(0, Math.round(promo.benefitValue)) : 0;
  return {
    quote: {
      listPrice: tuition,
      discount,
      payable: Math.max(0, tuition - discount),
      extraSessions,
      usedCodes,
    },
    error: "",
  };
}

function discountOf(promo: Promotion, tuition: number) {
  if (promo.benefit === "percent") {
    const pct = Math.min(100, Math.max(0, promo.benefitValue));
    return Math.min(tuition, Math.round((tuition * pct) / 100));
  }
  if (promo.benefit === "amount") return Math.min(tuition, Math.max(0, Math.round(promo.benefitValue)));
  return 0;
}

function codesUsed(promo: Promotion, entered: string[]): string[] | null {
  if (promo.codeMode === "none") return [];
  const live = (code: PromotionCode) => code.maxUses == null || code.used < code.maxUses;
  if (promo.codeMode === "or") {
    const hit = promo.codes.find((code) => live(code) && entered.includes(code.code.trim().toUpperCase()));
    return hit ? [hit.code.trim().toUpperCase()] : null;
  }
  if (promo.codes.length === 0) return null;
  const wanted = promo.codes.map((code) => code.code.trim().toUpperCase());
  const ready = promo.codes.every(live) && wanted.every((code) => entered.includes(code));
  return ready ? wanted : null;
}

export function eligiblePromotions(input: {
  promotions: Promotion[];
  tuition: number;
  course?: Pick<Course, "id" | "branchId" | "weekdays">;
  codes: string[];
  usedIds: string[];
  today?: string;
}) {
  const today = input.today ?? localDayKey();
  const autos: Promotion[] = [];
  const coded: Promotion[] = [];
  for (const row of input.promotions) {
    const promo = asPromotion(row);
    const alreadyUsed = input.usedIds.includes(promo.id);
    if (promo.codeMode === "none") {
      const quoted = quotePromotion({ promotion: promo, tuition: input.tuition, course: input.course, today, alreadyUsed });
      if (quoted.quote) autos.push(promo);
      continue;
    }
    if (input.codes.length === 0) continue;
    const quoted = quotePromotion({
      promotion: promo,
      tuition: input.tuition,
      course: input.course,
      today,
      codes: input.codes,
      alreadyUsed,
    });
    if (quoted.quote) coded.push(promo);
  }
  return { autos, coded };
}
