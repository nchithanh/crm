import type { Role } from "@/types";

export function canSeeContact(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canSeeMoney(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canApproveHold(role: Role | undefined) {
  return role === "owner";
}

export function canEditSchedule(role: Role | undefined) {
  return role === "owner" || role === "teacher";
}

export function canCollect(role: Role | undefined) {
  return role === "owner" || role === "reception";
}

export function canManageCatalog(role: Role | undefined) {
  return role === "owner" || role === "reception";
}
