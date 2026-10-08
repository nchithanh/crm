import { localDayKey } from "@/lib/utils";
import type { Subscription } from "@/types";

export type SubInvalidReason = "missing" | "inactive" | "not_started" | "expired" | "no_sessions" | "wrong_course";

/** Student may attend a course class only while subscription is valid. */
export function isSubscriptionValid(
  sub: Subscription | undefined | null,
  opts?: { day?: string; courseId?: string },
): boolean {
  return subscriptionInvalidReason(sub, opts) === null;
}

export function subscriptionInvalidReason(
  sub: Subscription | undefined | null,
  opts?: { day?: string; courseId?: string },
): SubInvalidReason | null {
  if (!sub) return "missing";
  if (sub.status !== "active") return "inactive";
  const day = opts?.day ?? localDayKey();
  if (day < sub.day) return "not_started";
  if (day > sub.endDay) return "expired";
  if (sub.remainingSessions <= 0) return "no_sessions";
  if (opts?.courseId && sub.courseId !== opts.courseId) return "wrong_course";
  return null;
}

export function needsRenew(sub: Subscription, today = localDayKey()) {
  if (sub.status !== "active") return true;
  return today > sub.endDay || sub.remainingSessions <= 0;
}
