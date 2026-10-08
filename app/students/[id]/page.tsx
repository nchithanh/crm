"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui";
import { canSeeContact, canSeeMoney } from "@/lib/access";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { formatVnd, initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function StudentDetailPage() {
  const { t } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const seeContact = canSeeContact(role);
  const seeMoney = canSeeMoney(role);
  const params = useParams();
  const id = String(params?.id ?? "");
  const student = useLiveQuery(() => db.students.get(id), [id]);
  const course = useLiveQuery(() => (student ? db.courses.get(student.courseId) : undefined), [student?.courseId]);
  const sub = useLiveQuery(() => (student?.subscriptionId ? db.subscriptions.get(student.subscriptionId) : undefined), [student?.subscriptionId]);
  const plan = useLiveQuery(() => (sub ? db.subscriptionPlans.get(sub.planId) : undefined), [sub?.planId]);
  const classLinks = useLiveQuery(() => db.classStudents.where("studentId").equals(id).toArray(), [id]) ?? [];
  const classes = useLiveQuery(() => db.classes.toArray(), []) ?? [];

  if (student === undefined) return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  if (!student) return <p className="text-sm text-slate-500">{t.common.notFound}</p>;

  const linkedClasses = classLinks
    .map((cs) => classes.find((c) => c.id === cs.classId))
    .filter(Boolean)
    .sort((a, b) => (a && b ? a.day.localeCompare(b.day) : 0))
    .slice(0, 12);

  return (
    <div>
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/students" className="font-semibold text-[var(--brand-600)] hover:underline">{t.nav.students}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{student.name}</span>
      </nav>

      <header className="mt-3 flex items-center gap-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: student.avatarColor }}>
          {initials(student.name)}
        </span>
        <div>
          <h1 className="crm-page-title">{student.name}</h1>
          <p className="text-sm text-slate-500">{seeContact ? student.phone : t.common.noPhone}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge>{student.status}</Badge>
            {seeMoney && student.debt > 0 ? <Badge tone="danger">{formatVnd(student.debt)}</Badge> : null}
          </div>
        </div>
      </header>

      <dl className="mt-6 grid gap-3 rounded-[12px] border border-[#E2E8F0] bg-white p-4 text-sm md:grid-cols-2">
        <div>
          <dt className="text-slate-400">{t.nav.courses}</dt>
          <dd className="font-semibold">
            {course ? <Link href={`/courses/${course.id}`} className="text-[var(--brand-600)] hover:underline">{course.name}</Link> : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Subscription</dt>
          <dd className="font-semibold text-slate-800">
            {plan?.name ?? "—"}
            {sub ? <span className="mt-0.5 block text-xs font-normal text-slate-500">{sub.day} → {sub.endDay} · left {sub.remainingSessions}</span> : null}
          </dd>
        </div>
        {seeMoney ? (
          <div>
            <dt className="text-slate-400">{t.students.debt}</dt>
            <dd className="font-semibold">
              <Link href={`/finance/collect?student=${student.id}`} className="text-[var(--brand-600)] hover:underline">
                {formatVnd(student.debt)}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-6">
        <h2 className="text-base font-bold">{t.nav.classes}</h2>
        <ul className="mt-2 space-y-2">
          {linkedClasses.map((c) => (
            <li key={c!.id}>
              <Link href={`/classes/${c!.id}`} className="block rounded-[12px] border border-[#E2E8F0] bg-white px-4 py-3 hover:border-[var(--brand-300)]">
                <span className="font-semibold">{c!.name}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{c!.day} · {c!.start}–{c!.end}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
