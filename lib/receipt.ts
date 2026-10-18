import { db } from "@/lib/db";
import { vietnameseMoneyWords } from "@/lib/number-words";
import type { Branch } from "@/types";

export type ReceiptData = {
  receiptNo: string;
  studioName: string;
  studioEmail: string;
  studioAddress: string;
  branches: Branch[];
  day: string;
  studentName: string;
  studentPhone: string;
  payForm: string;
  methodLabel: string;
  courseLabel: string;
  branchLabel: string;
  planName: string;
  price: number;
  due: number;
  paid: number;
  remaining: number;
  amountInWords: string;
  payerName: string;
  staffName: string;
  note: string;
};

/** Mã studio = 2 chữ cái đầu của tên (Edu Dance -> ED). */
export function studioCode(name: string) {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return letters.slice(0, 2) || "DS";
}

/** Số phiếu dạng {MÃ}{yy}.{mm}.{seq}, seq đếm số phiếu đã lập trong tháng. */
export async function nextReceiptNo(day: string) {
  const settings = await db.settings.toCollection().first();
  const prefix = `${studioCode(settings?.name ?? "")}${day.slice(2, 4)}.${day.slice(5, 7)}.`;
  const payments = await db.payments.toArray();
  const seq = payments.filter((p) => p.receiptNo?.startsWith(prefix)).length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function weekdayCodes(weekdays: number[]) {
  return [...weekdays]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => WEEKDAY_LABELS[d] ?? "")
    .join("");
}

export async function buildReceipt(paymentId: string): Promise<ReceiptData | null> {
  const payment = await db.payments.get(paymentId);
  if (!payment) return null;
  const [settings, student, branches, allPayments] = await Promise.all([
    db.settings.toCollection().first(),
    db.students.get(payment.studentId),
    db.branches.toArray(),
    db.payments.toArray(),
  ]);
  const subscription = payment.subscriptionId ? await db.subscriptions.get(payment.subscriptionId) : undefined;
  const [installments, course, plan, staff] = await Promise.all([
    subscription ? db.installments.where("subscriptionId").equals(subscription.id).toArray() : Promise.resolve([]),
    subscription ? db.courses.get(subscription.courseId) : undefined,
    subscription ? db.subscriptionPlans.get(subscription.planId) : undefined,
    payment.actorId ? db.users.get(payment.actorId) : undefined,
  ]);
  const sorted = [...installments].sort((a, b) => a.dueDay.localeCompare(b.dueDay));
  const due = sorted.length ? sorted.reduce((s, i) => s + i.amount, 0) : payment.amount;
  const subscriptionPayments = allPayments
    .filter((p) => p.subscriptionId && p.subscriptionId === payment.subscriptionId)
    .sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
  const paid = subscriptionPayments
    .filter((p) => p.day < payment.day || (p.day === payment.day && p.id <= payment.id))
    .reduce((s, p) => s + p.amount, 0);
  const branch = branches.find((b) => b.id === payment.branchId) ?? branches.find((b) => b.id === course?.branchId);
  const installmentIndex = payment.installmentId ? sorted.findIndex((i) => i.id === payment.installmentId) : -1;
  const receiptNo = payment.receiptNo ?? (await nextReceiptNo(payment.day));

  return {
    receiptNo,
    studioName: settings?.name ?? "Dolphin CRM",
    studioEmail: settings?.email ?? "",
    studioAddress: settings?.address ?? "",
    branches,
    day: payment.day,
    studentName: student?.name ?? "",
    studentPhone: student?.phone ?? "",
    payForm: sorted.length <= 1 ? "Thanh toán trọn gói" : `Theo đợt (đợt ${installmentIndex + 1}/${sorted.length})`,
    methodLabel: payment.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
    courseLabel: course ? `${course.name} - ${weekdayCodes(course.weekdays)} (${course.start} - ${course.end})` : "—",
    branchLabel: branch?.name ?? "—",
    planName: plan?.name ?? payment.note ?? "—",
    price: due,
    due,
    paid,
    remaining: Math.max(0, due - paid),
    amountInWords: vietnameseMoneyWords(payment.amount),
    payerName: student?.name ?? "",
    staffName: staff?.name ?? "",
    note: payment.note,
  };
}

export const RECEIPT_POLICY_NOTES: Array<{ title: string; items: string[] }> = [
  {
    title: "1. Về học phí & phiếu:",
    items: [
      "Học phí đã đóng rồi sẽ không hoàn lại.",
      "Học viên vui lòng giữ phiếu cẩn thận.",
    ],
  },
  {
    title: "2. Về lịch học và lớp học:",
    items: [
      "Lịch học có thể thay đổi vì lý do khách quan, Quản lý học vụ hoặc Giáo viên sẽ thông báo trước cho học viên.",
      "Vui lòng tham dự đầy đủ và đúng giờ để đảm bảo chất lượng lớp học.",
      "Trung tâm không giải quyết học bù/hoàn tiền nếu học viên nghỉ học vì lý do cá nhân.",
      "Gói học đã kích hoạt sẽ tự động trừ buổi nếu học viên vắng mặt.",
    ],
  },
  {
    title: "3. Về quy tắc lớp học:",
    items: [
      "Khuyến khích không sử dụng điện thoại, giữ gìn vệ sinh và tài sản lớp học.",
      "Khi đến lớp, học viên vui lòng mang giày thể thao phù hợp, không mang dép để đảm bảo an toàn trong quá trình học.",
    ],
  },
  {
    title: "4. Về bảo lưu & quyền lợi:",
    items: [
      "Phí bảo lưu khóa học: 200.000đ/lần, thời hạn sử dụng tối đa 03 tháng kể từ ngày đăng ký.",
      "Gói 1 - 3 tháng: giữ tối đa 03 tháng kể từ ngày đăng ký. Gói 4 tháng: giữ tối đa 04 tháng. Gói 6 tháng: giữ tối đa 06 tháng.",
      "Hoàn thành cấp độ đầu nhưng chưa học tiếp cấp sau: thời hạn bảo lưu số buổi còn lại theo gói (gói 1 tháng không áp dụng bảo lưu; gói 3 tháng giữ tối đa 01 tháng; gói 6 tháng giữ tối đa 03 tháng).",
      "Sau thời hạn trên, nếu học viên chưa kích hoạt lớp phù hợp, gói học sẽ tự động hết hiệu lực.",
    ],
  },
];
