"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, CircleHelp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "map", titleKey: "mapTitle" },
  { id: "diagram", titleKey: "diagramTitle" },
  { id: "course", titleKey: "courseTitle" },
  { id: "class", titleKey: "classTitle" },
  { id: "sku", titleKey: "skuTitle" },
  { id: "sub", titleKey: "subTitle" },
  { id: "money", titleKey: "moneyTitle" },
  { id: "flow", titleKey: "flowTitle" },
  { id: "leads", titleKey: "leadTitle" },
  { id: "tips", titleKey: "tipTitle" },
] as const;

function GuideSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`guide-${id}-h`} className="crm-card-elev scroll-mt-20 p-4 sm:p-5">
      <h2 id={`guide-${id}-h`} className="crm-section-title text-[var(--foreground)]">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--brand-600)] hover:bg-[var(--brand-50)]"
    >
      {children}
    </Link>
  );
}

function FlowNode({
  label,
  href,
  tone = "default",
}: {
  label: string;
  href?: string;
  tone?: "default" | "brand" | "money" | "hub" | "danger" | "ok";
}) {
  const className = cn(
    "inline-flex min-h-10 min-w-[7rem] max-w-[14rem] items-center justify-center whitespace-pre-line rounded-xl border px-3 py-2 text-center text-xs font-bold leading-snug sm:text-sm",
    tone === "default" && "border-[var(--border)] bg-white text-[var(--foreground)]",
    tone === "brand" && "border-[var(--brand-200)] bg-[var(--brand-50)] text-[var(--brand-700)]",
    tone === "money" && "border-emerald-200 bg-emerald-50 text-emerald-800",
    tone === "hub" && "border-[var(--brand-400)] bg-[var(--brand-500)] text-white shadow-sm",
    tone === "danger" && "border-rose-200 bg-rose-50 text-rose-800",
    tone === "ok" && "border-emerald-300 bg-emerald-100 text-emerald-900",
  );
  if (href) {
    return (
      <Link href={href} className={cn(className, "transition hover:-translate-y-px hover:opacity-95")}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}

function DecisionCard({ question }: { question: string }) {
  return (
    <div className="w-full max-w-xl rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">?</p>
      <p className="mt-1 whitespace-pre-line text-sm font-bold leading-snug text-amber-950">{question}</p>
    </div>
  );
}

function BranchLabel({ children, tone }: { children: React.ReactNode; tone: "yes" | "no" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone === "yes" && "bg-emerald-100 text-emerald-800",
        tone === "no" && "bg-rose-100 text-rose-800",
      )}
    >
      {children}
    </span>
  );
}

function ArrowV() {
  return <ChevronDown className="mx-auto my-1 size-4 shrink-0 text-slate-400" aria-hidden />;
}

function ArrowH() {
  return <ChevronRight className="mx-0.5 hidden size-4 shrink-0 text-slate-400 sm:inline" aria-hidden />;
}

function BranchCol({
  tone,
  label,
  children,
}: {
  tone: "yes" | "no";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-3",
        tone === "yes" && "border-emerald-200 bg-emerald-50/70",
        tone === "no" && "border-rose-200 bg-rose-50/70",
      )}
    >
      <BranchLabel tone={tone}>{label}</BranchLabel>
      <ArrowV />
      {children}
    </div>
  );
}

function FlowDiagram({ g }: { g: ReturnType<typeof useI18n>["t"]["guide"] }) {
  return (
    <div
      role="img"
      aria-label={g.diagramAria}
      className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 sm:p-5"
    >
      {/* Start: buy Sub */}
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
        <FlowNode label={g.diagramNodeStudent} href="/students" />
        <ArrowH />
        <FlowNode label={g.diagramNodeCourse} href="/courses" tone="brand" />
        <ArrowH />
        <FlowNode label={g.diagramNodeSku} href="/subscriptions" tone="money" />
      </div>
      <ArrowV />
      <FlowNode label={g.diagramNodeEnroll} href="/mid-course-enroll" tone="hub" />
      <ArrowV />
      <FlowNode label={g.diagramNodeSub} href="/subscriptions" tone="brand" />
      <p className="mt-1 max-w-lg text-center text-[11px] text-slate-500">{g.diagramHintBuy}</p>
      <p className="mb-1 max-w-lg text-center text-[11px] text-slate-500">{g.diagramHintRoster}</p>

      <ArrowV />

      {/* Parallel money check (same workflow, not a separate section) */}
      <DecisionCard question={g.diagramQDebt} />
      <div className="mt-2 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        <BranchCol tone="yes" label={g.diagramYes}>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <FlowNode label={g.diagramNodeInst} href="/collect-fees" tone="money" />
            <ArrowH />
            <FlowNode label={g.diagramNodePay} href="/collect-fees" tone="money" />
          </div>
          <p className="mt-1 text-center text-[10px] text-slate-500">↓</p>
        </BranchCol>
        <BranchCol tone="no" label={g.diagramNo}>
          <FlowNode label={g.diagramNodeOk} tone="ok" />
          <p className="mt-1 text-center text-[10px] text-slate-500">↓</p>
        </BranchCol>
      </div>

      <ArrowV />

      {/* Validity gate */}
      <DecisionCard question={g.diagramQValid} />
      <div className="mt-2 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        <BranchCol tone="yes" label={g.diagramYes}>
          <FlowNode label={g.diagramNodeClass} href="/classes" />
          <ArrowV />
          <FlowNode label={g.diagramNodeAttend} href="/attendance" tone="ok" />
          <ArrowV />
          <DecisionCard question={g.diagramQExpired} />
          <div className="mt-2 grid w-full gap-2">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-rose-100 bg-white/80 p-2.5">
              <BranchLabel tone="yes">{g.diagramYes}</BranchLabel>
              <ArrowV />
              <FlowNode label={g.diagramNodeBlock} tone="danger" />
              <ArrowV />
              <FlowNode label={g.diagramNodeRenew} href="/mid-course-enroll" tone="hub" />
              <p className="mt-1 text-center text-[10px] leading-snug text-slate-500">{g.diagramHintRenew}</p>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-emerald-100 bg-white/80 p-2.5">
              <BranchLabel tone="no">{g.diagramNo}</BranchLabel>
              <ArrowV />
              <FlowNode label={g.diagramNodeOk} tone="ok" />
              <p className="mt-1 text-center text-[10px] leading-snug text-slate-500">{g.diagramHintLoop}</p>
            </div>
          </div>
        </BranchCol>

        <BranchCol tone="no" label={g.diagramNo}>
          <FlowNode label={g.diagramNodeBlock} tone="danger" />
          <ArrowV />
          <p className="max-w-[14rem] text-center text-[11px] font-medium leading-snug text-rose-700">{g.diagramHintRenew}</p>
          <FlowNode label={g.diagramNodeRenew} href="/subscriptions" tone="hub" />
        </BranchCol>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const { t } = useI18n();
  const g = t.guide;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="crm-page-title inline-flex items-center gap-2">
          <span className="crm-icon-tile inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)]">
            <CircleHelp size={18} aria-hidden />
          </span>
          {g.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{g.lead}</p>
      </div>

      <nav aria-label={g.toc} className="crm-card-elev p-3 sm:p-4">
        <p className="crm-kpi-eyebrow text-slate-500">{g.toc}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "inline-flex h-8 items-center rounded-xl border border-[var(--border)] bg-white px-2.5 text-xs font-semibold text-slate-600",
                  "hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]",
                )}
              >
                {g[s.titleKey]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-3">
        <GuideSection id="map" title={g.mapTitle}>
          <p>{g.mapLead}</p>
          <p className="rounded-xl bg-[var(--brand-50)] px-3 py-2 font-semibold text-[var(--brand-700)]">{g.mapLine}</p>
        </GuideSection>

        <GuideSection id="diagram" title={g.diagramTitle}>
          <FlowDiagram g={g} />
        </GuideSection>

        <GuideSection id="course" title={g.courseTitle}>
          <p>{g.courseBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/courses">{g.openCourses}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="class" title={g.classTitle}>
          <p>{g.classBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/classes">{t.nav.classes}</GuideLink>
            <GuideLink href="/schedule">{t.nav.schedule}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="sku" title={g.skuTitle}>
          <p>{g.skuBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/subscriptions">{g.openSubs}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="sub" title={g.subTitle}>
          <p>{g.subBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/subscriptions">{g.openSubs}</GuideLink>
            <GuideLink href="/mid-course-enroll">{g.openEnroll}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="money" title={g.moneyTitle}>
          <p>{g.moneyBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/collect-fees">{g.openCollect}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="flow" title={g.flowTitle}>
          <ol className="list-none space-y-2">
            <li>{g.flow1}</li>
            <li>{g.flow2}</li>
            <li>{g.flow3}</li>
            <li>{g.flow4}</li>
            <li>{g.flow5}</li>
          </ol>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{g.teacherNote}</p>
        </GuideSection>

        <GuideSection id="leads" title={g.leadTitle}>
          <p>{g.leadBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <GuideLink href="/follow-up">{g.openCare}</GuideLink>
            <GuideLink href="/campaigns">{g.openCampaigns}</GuideLink>
            <GuideLink href="/promotion">{t.nav.promotion}</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="tips" title={g.tipTitle}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{g.tip1}</li>
            <li>{g.tip2}</li>
            <li>{g.tip3}</li>
          </ul>
        </GuideSection>
      </div>
    </div>
  );
}
