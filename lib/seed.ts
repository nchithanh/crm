import { db, reopenDb } from "@/lib/db";
import { loadSeed } from "@/lib/seed-data";
import { classStatus, sessionDates } from "@/lib/schedule";
import { dayFromOffset, localDayKey } from "@/lib/utils";
import type { VerticalId } from "@/lib/vertical";
import type {
  Attendance,
  ClassStudent,
  Course,
  CourseRoom,
  CourseTeacher,
  Hold,
  Installment,
  Lead,
  Payment,
  PaymentAccount,
  PaymentRoute,
  Promotion,
  RoomBooking,
  Student,
  StudioClass,
  StudioSettings,
  StudioTask,
  Subscription,
  SubscriptionPlan,
  TaskParent,
  LeadStage,
  SocialChannel,
  SocialPost,
  TeacherAbsence,
  User,
} from "@/types";
import { defaultAllRoleAccess } from "@/lib/access-defaults";
import { sourceLabel } from "@/lib/social-cta";

const SEED_KEY = "seedVersion";
const SEED_VERSION = "17c";

const CTA_LEAD_NAMES = [
  "Nguyễn Hà My",
  "Trần Minh Anh",
  "Lê Bảo Ngọc",
  "Phạm Gia Hân",
  "Hoàng Nhật Nam",
  "Vũ Khánh Linh",
  "Đặng Thuỳ Dương",
  "Bùi Quang Huy",
  "Đỗ Mai Chi",
  "Ngô Đức Anh",
  "Phan Thanh Tú",
  "Lý Phương Anh",
  "Võ Hải Đăng",
  "Trương Yến Nhi",
  "Huỳnh Gia Bảo",
  "Đinh Ngọc Lan",
  "Cao Minh Quân",
  "Mai Thảo Vy",
  "Lương Hoàng Khang",
  "Tạ Kim Ngân",
];

const CTA_STAGES: LeadStage[] = ["new", "new", "contacted", "contacted", "trial", "won", "lost", "new"];

type SocialPostDef = {
  id: string;
  title: string;
  channel: SocialChannel;
  externalUrl: string;
  slug: string;
  headline: string;
  subhead: string;
  status: SocialPost["status"];
  createdOffset: number;
  clickCount: number;
  formViewCount: number;
  leadCount: number;
  note: string;
};

function buildSocialCtaSeed(): { posts: SocialPost[]; leads: Lead[] } {
  const defs: SocialPostDef[] = [
    {
      id: "sp-tiktok-hiphop",
      title: "Hip-hop sáng · clip thử 15s",
      channel: "tiktok",
      externalUrl: "https://www.tiktok.com/",
      slug: "hk2x9a",
      headline: "Để lại SĐT — nhận lịch học thử Hip-hop",
      subhead: "Studio Edu Dance sẽ liên hệ trong ngày làm việc.",
      status: "active",
      createdOffset: 0,
      clickCount: 148,
      formViewCount: 62,
      leadCount: 12,
      note: "Seed demo CTA TikTok",
    },
    {
      id: "sp-fb-openday",
      title: "Open day Q4",
      channel: "facebook",
      externalUrl: "",
      slug: "fb7k2m",
      headline: "Đăng ký Open day — giữ chỗ học thử",
      subhead: "Điền SĐT để nhận lịch và địa chỉ cơ sở.",
      status: "active",
      createdOffset: -1,
      clickCount: 96,
      formViewCount: 41,
      leadCount: 9,
      note: "",
    },
    {
      id: "sp-zalo-oa-trial",
      title: "Zalo OA · học thử tuần này",
      channel: "zalo",
      externalUrl: "",
      slug: "zl4n8p",
      headline: "Nhận lịch học thử trong tuần",
      subhead: "Lễ tân gọi lại trong 24 giờ làm việc.",
      status: "active",
      createdOffset: -2,
      clickCount: 110,
      formViewCount: 48,
      leadCount: 11,
      note: "CTA tin Zalo OA",
    },
    {
      id: "sp-ig-reel-kpop",
      title: "IG Reel · K-pop beginner",
      channel: "instagram",
      externalUrl: "https://www.instagram.com/",
      slug: "ig9c2w",
      headline: "Đăng ký lớp K-pop beginner",
      subhead: "Để lại SĐT — nhận lịch và học phí gói thử.",
      status: "active",
      createdOffset: -3,
      clickCount: 132,
      formViewCount: 55,
      leadCount: 10,
      note: "",
    },
    {
      id: "sp-tiktok-ballet",
      title: "Ballet thiếu nhi · hook 9s",
      channel: "tiktok",
      externalUrl: "https://www.tiktok.com/",
      slug: "bl3q7t",
      headline: "Phụ huynh để lại SĐT — tư vấn Ballet",
      subhead: "Có lớp thiếu nhi cuối tuần.",
      status: "active",
      createdOffset: -4,
      clickCount: 210,
      formViewCount: 88,
      leadCount: 14,
      note: "Top convert tuần trước",
    },
    {
      id: "sp-fb-boost-summer",
      title: "FB Boost · Summer pack",
      channel: "facebook",
      externalUrl: "",
      slug: "sm5r1d",
      headline: "Giữ chỗ gói hè — điền form nhanh",
      subhead: "Ưu đãi có hạn — studio liên hệ xác nhận.",
      status: "paused",
      createdOffset: -8,
      clickCount: 180,
      formViewCount: 40,
      leadCount: 7,
      note: "Tắt sau hết budget ads",
    },
    {
      id: "sp-tiktok-duet",
      title: "TikTok duet GV · Contemporary",
      channel: "tiktok",
      externalUrl: "https://www.tiktok.com/",
      slug: "ct6m4e",
      headline: "Học thử Contemporary với GV",
      subhead: "Form nhanh — nhận slot tuần tới.",
      status: "active",
      createdOffset: -5,
      clickCount: 125,
      formViewCount: 52,
      leadCount: 10,
      note: "",
    },
    {
      id: "sp-other-qr-flyer",
      title: "Flyer QR · Open house",
      channel: "other",
      externalUrl: "",
      slug: "qr8h0k",
      headline: "Quét QR — đăng ký Open house",
      subhead: "In flyer + standee quầy.",
      status: "active",
      createdOffset: -6,
      clickCount: 48,
      formViewCount: 36,
      leadCount: 8,
      note: "Offline → online",
    },
    {
      id: "sp-tiktok-jazz",
      title: "Jazz Funk · trend audio",
      channel: "tiktok",
      externalUrl: "https://www.tiktok.com/",
      slug: "jz1a9c",
      headline: "Đăng ký Jazz Funk — lịch học thử",
      subhead: "Studio gọi lại trong ngày.",
      status: "active",
      createdOffset: -1,
      clickCount: 102,
      formViewCount: 44,
      leadCount: 9,
      note: "",
    },
    {
      id: "sp-zalo-story",
      title: "Zalo Story · lớp tối CN",
      channel: "zalo",
      externalUrl: "",
      slug: "zs2b7f",
      headline: "Giữ chỗ lớp tối Chủ nhật",
      subhead: "Điền SĐT — nhận xác nhận lịch.",
      status: "active",
      createdOffset: -3,
      clickCount: 64,
      formViewCount: 28,
      leadCount: 6,
      note: "",
    },
    {
      id: "sp-fb-moms",
      title: "FB nhóm phụ huynh · Kids",
      channel: "facebook",
      externalUrl: "",
      slug: "fm3d5h",
      headline: "Phụ huynh đăng ký lớp Kids",
      subhead: "Tư vấn lịch và học phí gói tháng.",
      status: "active",
      createdOffset: -7,
      clickCount: 88,
      formViewCount: 39,
      leadCount: 8,
      note: "Group organic",
    },
    {
      id: "sp-ig-adult",
      title: "IG Story · Adult beginner",
      channel: "instagram",
      externalUrl: "https://www.instagram.com/",
      slug: "ia4e6j",
      headline: "Người lớn mới bắt đầu — để lại SĐT",
      subhead: "Lớp tối trong tuần.",
      status: "active",
      createdOffset: -2,
      clickCount: 76,
      formViewCount: 33,
      leadCount: 7,
      note: "",
    },
    {
      id: "sp-tiktok-challenge",
      title: "Challenge #EduDanceWeek",
      channel: "tiktok",
      externalUrl: "https://www.tiktok.com/",
      slug: "ch5g8k",
      headline: "Tham gia challenge — nhận học thử",
      subhead: "Form nhanh sau khi duet.",
      status: "active",
      createdOffset: 0,
      clickCount: 165,
      formViewCount: 70,
      leadCount: 11,
      note: "Hashtag campaign",
    },
    {
      id: "sp-other-web",
      title: "Landing web · CTA footer",
      channel: "other",
      externalUrl: "",
      slug: "wb6h0m",
      headline: "Đăng ký tư vấn từ website",
      subhead: "Team tuyển sinh liên hệ sớm.",
      status: "active",
      createdOffset: -9,
      clickCount: 40,
      formViewCount: 22,
      leadCount: 5,
      note: "Site embed",
    },
  ];

  const posts: SocialPost[] = [];
  const leads: Lead[] = [];
  let seq = 0;

  for (const def of defs) {
    posts.push({
      id: def.id,
      title: def.title,
      channel: def.channel,
      externalUrl: def.externalUrl,
      slug: def.slug,
      headline: def.headline,
      subhead: def.subhead,
      status: def.status,
      createdDay: dayFromOffset(def.createdOffset),
      clickCount: def.clickCount,
      formViewCount: def.formViewCount,
      leadCount: def.leadCount,
      note: def.note,
    });

    const source = sourceLabel(def.channel, def.title);
    for (let i = 0; i < def.leadCount; i++) {
      seq += 1;
      const stage = CTA_STAGES[i % CTA_STAGES.length];
      const day = dayFromOffset(Math.min(0, def.createdOffset + (i % 4)));
      const phoneCore = String(3000000 + seq).padStart(7, "0");
      const ownerId = seq % 3 === 0 ? "u_reception" : "u_marketing";
      leads.push({
        id: `ld-cta-${def.slug}-${String(i + 1).padStart(2, "0")}`,
        name: CTA_LEAD_NAMES[(seq - 1) % CTA_LEAD_NAMES.length],
        phone: `09${phoneCore.slice(0, 3)} ${phoneCore.slice(3)}`,
        email: seq % 4 === 0 ? `cta${seq}@mail.demo` : undefined,
        source,
        stage,
        interest: def.title,
        ownerId,
        day,
        note: "",
        activities: [
          {
            day,
            text: `Lead từ Link CTA · ${source}.`,
            kind: "note",
          },
        ],
        channel: def.channel,
        postId: def.id,
        linkSlug: def.slug,
      });
    }
  }

  return { posts, leads };
}

function birthFromYears(years: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  return localDayKey(d);
}

function addMonths(day: string, months: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1 + months, d ?? 1, 12);
  return localDayKey(dt);
}

/** Số TK giả. Mã bank theo SePay (qr.sepay.vn). Khoảng tiền khớp giá gói demo. */
const paymentAccounts: PaymentAccount[] = [
  {
    id: "pa-mbbank",
    name: "Thu gói ngắn",
    bank: "MBBank",
    accountNumber: "0901234001",
    accountHolder: "EDU DANCE",
    active: true,
    isDefault: true,
  },
  {
    id: "pa-acb",
    name: "Thu gói 3 tháng",
    bank: "ACB",
    accountNumber: "0901234002",
    accountHolder: "EDU DANCE",
    active: true,
    isDefault: false,
  },
  {
    id: "pa-vcb",
    name: "Thu gói dài",
    bank: "Vietcombank",
    accountNumber: "0901234003",
    accountHolder: "EDU DANCE",
    active: true,
    isDefault: false,
  },
];

const paymentRoutes: PaymentRoute[] = [
  { id: "pr-short", accountId: "pa-mbbank", minAmount: 0, maxAmount: 1_500_000, priority: 1 },
  { id: "pr-mid", accountId: "pa-acb", minAmount: 1_500_001, maxAmount: 5_000_000, priority: 2 },
  { id: "pr-long", accountId: "pa-vcb", minAmount: 5_000_001, maxAmount: null, priority: 3 },
];

let bootPromise: Promise<void> | null = null;
let bootVertical: VerticalId | null = null;

/** Mở DB và seed. Lần gọi sau cùng lĩnh vực dùng lại promise đang chạy. */
export function bootStudio(id: VerticalId) {
  if (bootPromise && bootVertical === id) return bootPromise;
  bootVertical = id;
  reopenDb(id);
  const run = ensureSeed(id).catch((error) => {
    bootPromise = null;
    throw error;
  });
  bootPromise = run;
  return run;
}

export function resetBoot() {
  bootPromise = null;
  bootVertical = null;
}

export async function ensureSeed(id: VerticalId) {
  const current = await db.meta.get(SEED_KEY);
  if (current?.value === SEED_VERSION) return;
  const raw = loadSeed(id);

  const courseRows: Course[] = [];
  const classRows: StudioClass[] = [];
  for (const rawCourse of raw.courses as {
    id: string;
    name: string;
    style: string;
    level: Course["level"];
    slot: string;
    teacherId: string;
    branchId: string;
    roomId?: string;
    startOffset: number;
    weekdays: number[];
    start: string;
    end: string;
    cancelIndex?: number;
    description: string;
    active: boolean;
    sessionCount?: number;
    durationMonths?: number;
    capacity?: number;
  }[]) {
    const startDay = dayFromOffset(rawCourse.startOffset);
    const count = rawCourse.sessionCount ?? 8;
    const capacity = Math.max(1, rawCourse.capacity ?? 12);
    const days = sessionDates(startDay, rawCourse.weekdays, count);
    const endDay = days[days.length - 1] ?? startDay;
    courseRows.push({
      id: rawCourse.id,
      name: rawCourse.name,
      style: rawCourse.style,
      level: rawCourse.level,
      slot: rawCourse.slot,
      teacherId: rawCourse.teacherId,
      branchId: rawCourse.branchId,
      roomId: rawCourse.roomId ?? "",
      startDay,
      endDay,
      weekdays: rawCourse.weekdays,
      start: rawCourse.start,
      end: rawCourse.end,
      sessionCount: count,
      capacity,
      durationMonths: rawCourse.durationMonths ?? 1,
      description: rawCourse.description,
      active: rawCourse.active,
    });
    days.forEach((day, i) => {
      const index = i + 1;
      classRows.push({
        id: `${rawCourse.id}-c${index}`,
        courseId: rawCourse.id,
        branchId: rawCourse.branchId,
        index,
        name: `${rawCourse.name} · #${index}`,
        day,
        start: rawCourse.start,
        end: rawCourse.end,
        teacherId: rawCourse.teacherId,
        roomId: rawCourse.roomId ?? "",
        status: classStatus(day, index, rawCourse.cancelIndex),
        capacity,
        note: rawCourse.cancelIndex === index ? "Nghỉ lễ" : "",
      });
    });
  }

  const classOverrides = (
    raw as {
      classOverrides?: { classId: string; teacherId?: string; roomId?: string; note?: string }[];
    }
  ).classOverrides ?? [];
  for (const ov of classOverrides) {
    const klass = classRows.find((c) => c.id === ov.classId);
    if (!klass) continue;
    if (ov.teacherId) klass.teacherId = ov.teacherId;
    if (ov.roomId !== undefined) klass.roomId = ov.roomId;
    if (ov.note) klass.note = ov.note;
  }

  const courseTeachers = raw.courseTeachers as CourseTeacher[];
  const courseRooms = raw.courseRooms as CourseRoom[];

  const studentRows: Student[] = (raw.students as {
    id: string;
    name: string;
    phone: string;
    email: string;
    birthYears: number;
    avatarColor: string;
    status: Student["status"];
    subscriptionId: string;
    courseId: string;
    branchId: string;
    level: Student["level"];
    remainingSessions: number;
    debt: number;
    parentName: string;
    parentPhone: string;
    flagged?: boolean;
    joinedOffset: number;
    notes: { offset: number; text: string }[];
  }[]).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    birthDay: birthFromYears(s.birthYears),
    avatarColor: s.avatarColor,
    status: s.status,
    subscriptionId: s.subscriptionId,
    courseId: s.courseId,
    branchId: s.branchId,
    level: s.level,
    remainingSessions: s.remainingSessions,
    debt: s.debt,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    flagged: Boolean(s.flagged),
    joinedDay: dayFromOffset(s.joinedOffset),
    notes: s.notes.map((n) => ({ day: dayFromOffset(n.offset), text: n.text })),
  }));

  const leadRowsBase: Lead[] = raw.leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    source: l.source,
    stage: l.stage as Lead["stage"],
    interest: l.interest,
    ownerId: l.ownerId,
    day: dayFromOffset(l.offset),
    note: l.note,
    activities: l.activities.map((a) => ({
      day: dayFromOffset(a.offset),
      text: a.text,
    })),
  }));

  const { posts: socialPostRows, leads: ctaLeadRows } = buildSocialCtaSeed();
  const leadRows: Lead[] = [...leadRowsBase, ...ctaLeadRows];

  const subscriptionRows: Subscription[] = (raw.subscriptions as {
    id: string;
    studentId: string;
    courseId: string;
    planId: string;
    offset: number;
    sessions: number;
    remainingSessions: number;
    status: Subscription["status"];
    months?: number;
  }[]).map((s) => {
    const day = dayFromOffset(s.offset);
    return {
      id: s.id,
      studentId: s.studentId,
      courseId: s.courseId,
      planId: s.planId,
      day,
      endDay: addMonths(day, s.months ?? 1),
      sessions: s.sessions,
      remainingSessions: s.remainingSessions,
      status: s.status,
    };
  });

  const paymentRows: Payment[] = (raw.payments as {
    id: string;
    studentId: string;
    subscriptionId?: string;
    installmentId?: string;
    branchId: string;
    amount: number;
    method: Payment["method"];
    offset: number;
    note: string;
    billNote: string;
  }[]).map((p) => ({
    id: p.id,
    studentId: p.studentId,
    subscriptionId: p.subscriptionId ?? "",
    installmentId: p.installmentId ?? "",
    branchId: p.branchId,
    amount: p.amount,
    method: p.method,
    day: dayFromOffset(p.offset),
    note: p.note,
    billNote: p.billNote,
  }));

  const installmentRows: Installment[] = (raw.installments as {
    id: string;
    subscriptionId: string;
    studentId: string;
    branchId: string;
    title: string;
    amount: number;
    paid: number;
    dueOffset: number;
  }[]).map((r) => ({
    id: r.id,
    subscriptionId: r.subscriptionId,
    studentId: r.studentId,
    branchId: r.branchId,
    title: r.title,
    amount: r.amount,
    paid: r.paid,
    dueDay: dayFromOffset(r.dueOffset),
  }));

  const taskRows: StudioTask[] = raw.tasks.map((t) => {
    const row = t as {
      id: string;
      title: string;
      offset: number;
      status?: string;
      priority?: StudioTask["priority"];
      assigneeId?: string;
      branchId?: string;
      parentId?: string;
      note?: string;
      done?: boolean;
      comments?: { id: string; actorId: string; offset: number; text: string }[];
    };
    const rawStatus = row.status === "doing" ? "inprogress" : row.status;
    const status: StudioTask["status"] =
      rawStatus === "todo" ||
      rawStatus === "inprogress" ||
      rawStatus === "verify" ||
      rawStatus === "feedback" ||
      rawStatus === "done"
        ? rawStatus
        : row.done
          ? "done"
          : "todo";
    return {
      id: row.id,
      title: row.title,
      status,
      priority: row.priority ?? "medium",
      assigneeId: row.assigneeId ?? "",
      branchId: row.branchId ?? "",
      parentId: row.parentId ?? "",
      dueDay: dayFromOffset(row.offset),
      note: row.note ?? "",
      comments: (row.comments ?? []).map((c) => ({
        id: c.id,
        actorId: c.actorId,
        day: dayFromOffset(c.offset),
        text: c.text,
      })),
    };
  });
  const taskParentRows = (raw.taskParents ?? []) as TaskParent[];
  const teacherAbsenceRows: TeacherAbsence[] = ((raw.teacherAbsences ?? []) as { id: string; teacherId: string; offset: number; note?: string }[]).map((row) => ({
    id: row.id,
    teacherId: row.teacherId,
    day: dayFromOffset(row.offset),
    note: row.note ?? "",
  }));

  const legacyMap = raw.legacyClassMap ?? {};
  const attendanceRows: Attendance[] = [];
  const attendanceUsed = new Set<string>();
  for (const a of raw.attendance as {
    legacyClassId: string;
    personId: string;
    subject: Attendance["subject"];
    offset: number;
    status: Attendance["status"];
    waived: boolean;
  }[]) {
    const day = dayFromOffset(a.offset);
    const courseId = legacyMap[a.legacyClassId];
    if (!courseId) continue;
    const dayMs = Date.parse(`${day}T12:00:00`);
    const candidates = classRows
      .filter((c) => c.courseId === courseId && c.status !== "cancelled")
      .slice()
      .sort((x, y) => Math.abs(Date.parse(`${x.day}T12:00:00`) - dayMs) - Math.abs(Date.parse(`${y.day}T12:00:00`) - dayMs) || x.index - y.index);
    // Prefer exact/nearest day; skip classes already used for this person (avoid bulkAdd key clash).
    const klass = candidates.find((c) => !attendanceUsed.has(`${c.id}_${a.subject}_${a.personId}`));
    if (!klass) continue;
    const id = `${klass.id}_${a.subject}_${a.personId}`;
    attendanceUsed.add(id);
    attendanceRows.push({
      id,
      classId: klass.id,
      personId: a.personId,
      subject: a.subject,
      day: klass.day,
      status: a.status,
      waived: a.waived,
    });
  }

  const classStudentRows: ClassStudent[] = [];
  for (const st of studentRows) {
    if (st.status === "paused") continue;
    for (const klass of classRows.filter((c) => c.courseId === st.courseId && c.status !== "cancelled")) {
      classStudentRows.push({
        id: `${klass.id}_${st.id}`,
        classId: klass.id,
        studentId: st.id,
      });
    }
  }

  const holdRows: Hold[] = raw.holds.map((h) => ({
    id: h.id,
    studentId: h.studentId,
    fromDay: dayFromOffset(h.fromOffset),
    toDay: dayFromOffset(h.toOffset),
    reason: h.reason,
    status: h.status as Hold["status"],
    credits: h.credits,
    needsPackage: h.needsPackage,
  }));

  const bookingRows: RoomBooking[] = raw.bookings.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    renter: b.renter,
    phone: b.phone,
    day: dayFromOffset(b.offset),
    start: b.start,
    end: b.end,
    fee: b.fee,
    status: b.status as RoomBooking["status"],
  }));

  const promotionRows: Promotion[] = raw.promotions.map((p) => ({
    id: p.id,
    name: p.name,
    startDay: dayFromOffset(p.startOffset),
    endDay: dayFromOffset(p.endOffset),
    weekdays: [...p.weekdays],
    branchIds: [...p.branchIds],
    courseIds: [...p.courseIds],
    minTuition: p.minTuition,
    benefit: p.benefit as Promotion["benefit"],
    benefitValue: p.benefitValue,
    codeMode: p.codeMode as Promotion["codeMode"],
    codes: p.codes.map((code) => ({
      code: code.code,
      maxUses: code.maxUses,
      used: code.used,
    })),
    oncePerStudent: p.oncePerStudent,
    active: p.active,
    note: p.note,
  }));

  await db.transaction(
    "rw",
    [
      db.settings,
      db.users,
      db.subscriptionPlans,
      db.classes,
      db.classStudents,
      db.students,
      db.leads,
      db.subscriptions,
      db.payments,
      db.paymentAccounts,
      db.paymentRoutes,
      db.installments,
      db.tasks,
      db.taskParents,
      db.attendance,
      db.courses,
      db.courseTeachers,
      db.courseRooms,
      db.rooms,
      db.promotions,
      db.holds,
      db.bookings,
      db.branches,
      db.teacherAbsences,
      db.roleAccess,
      db.socialPosts,
      db.linkEvents,
      db.meta,
    ],
    async () => {
      await db.settings.clear();
      await db.users.clear();
      await db.roleAccess.clear();
      await db.subscriptionPlans.clear();
      await db.classes.clear();
      await db.classStudents.clear();
      await db.students.clear();
      await db.leads.clear();
      await db.subscriptions.clear();
      await db.payments.clear();
      await db.paymentAccounts.clear();
      await db.paymentRoutes.clear();
      await db.installments.clear();
      await db.tasks.clear();
      await db.taskParents.clear();
      await db.attendance.clear();
      await db.courses.clear();
      await db.courseTeachers.clear();
      await db.courseRooms.clear();
      await db.rooms.clear();
      await db.promotions.clear();
      await db.holds.clear();
      await db.bookings.clear();
      await db.branches.clear();
      await db.teacherAbsences.clear();
      await db.socialPosts.clear();
      await db.linkEvents.clear();

      await db.settings.add(raw.settings as StudioSettings);
      await db.users.bulkAdd(raw.users as User[]);
      await db.roleAccess.bulkPut(defaultAllRoleAccess());
      await db.subscriptionPlans.bulkAdd(raw.subscriptionPlans as SubscriptionPlan[]);
      await db.courses.bulkAdd(courseRows);
      await db.courseTeachers.bulkAdd(courseTeachers);
      await db.courseRooms.bulkAdd(courseRooms);
      await db.classes.bulkAdd(classRows);
      await db.classStudents.bulkAdd(classStudentRows);
      await db.branches.bulkAdd(raw.branches);
      await db.students.bulkAdd(studentRows);
      await db.leads.bulkAdd(leadRows);
      await db.socialPosts.bulkAdd(socialPostRows);
      await db.subscriptions.bulkAdd(subscriptionRows);
      await db.payments.bulkAdd(paymentRows);
      await db.paymentAccounts.bulkAdd(paymentAccounts);
      await db.paymentRoutes.bulkAdd(paymentRoutes);
      await db.installments.bulkAdd(installmentRows);
      await db.tasks.bulkAdd(taskRows);
      await db.taskParents.bulkAdd(taskParentRows);
      await db.attendance.bulkAdd(attendanceRows);
      await db.rooms.bulkAdd(raw.rooms);
      await db.promotions.bulkAdd(promotionRows);
      await db.holds.bulkAdd(holdRows);
      await db.bookings.bulkAdd(bookingRows);
      await db.teacherAbsences.bulkAdd(teacherAbsenceRows);
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION });
    },
  );
}
