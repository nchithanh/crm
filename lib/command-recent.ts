/** Recent picks for Command Palette (Ctrl+K). Browser localStorage only. */

export type CmdKind =
  | "recent"
  | "action"
  | "nav"
  | "student"
  | "course"
  | "class"
  | "teacher"
  | "room"
  | "task";

export type CmdRecentItem = {
  href: string;
  title: string;
  hint: string;
  kind: CmdKind;
};

const KEY = "crm-cmd-recent-v1";
const MAX = 8;

export function loadCmdRecent(): CmdRecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CmdRecentItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.href === "string" && typeof x.title === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushCmdRecent(item: CmdRecentItem) {
  if (typeof window === "undefined") return;
  const next = [item, ...loadCmdRecent().filter((x) => x.href !== item.href)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
