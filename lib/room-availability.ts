import { GRID_END, GRID_START, minutesOf, rangesOverlap } from "@/lib/schedule";
import { localDayKey } from "@/lib/utils";
import type { RoomBooking, StudioClass } from "@/types";

export type BusyKind = "class" | "booking";

export type BusyBlock = {
  id: string;
  roomId: string;
  day: string;
  start: string;
  end: string;
  kind: BusyKind;
  title: string;
  status: string;
};

export function busyFromClasses(classes: StudioClass[]): BusyBlock[] {
  return classes
    .filter((c) => c.roomId && c.status !== "cancelled")
    .map((c) => ({
      id: c.id,
      roomId: c.roomId,
      day: c.day,
      start: c.start,
      end: c.end,
      kind: "class" as const,
      title: c.name,
      status: c.status,
    }));
}

export function busyFromBookings(bookings: RoomBooking[]): BusyBlock[] {
  return bookings
    .filter((b) => b.roomId && b.status === "booked")
    .map((b) => ({
      id: b.id,
      roomId: b.roomId,
      day: b.day,
      start: b.start,
      end: b.end,
      kind: "booking" as const,
      title: b.renter,
      status: b.status,
    }));
}

export function allBusyBlocks(classes: StudioClass[], bookings: RoomBooking[]) {
  return [...busyFromClasses(classes), ...busyFromBookings(bookings)];
}

export function blocksForRoomDay(blocks: BusyBlock[], roomId: string, day: string) {
  return blocks
    .filter((b) => (roomId === "all" || b.roomId === roomId) && b.day === day)
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start) || a.roomId.localeCompare(b.roomId));
}

/** True if any busy block overlaps [hour, hour+1). */
export function hourIsBusy(blocks: BusyBlock[], roomId: string, day: string, hour: number) {
  const slotStart = `${String(hour).padStart(2, "0")}:00`;
  const slotEnd = `${String(hour + 1).padStart(2, "0")}:00`;
  return blocksForRoomDay(blocks, roomId, day).some((b) => rangesOverlap(b.start, b.end, slotStart, slotEnd));
}

export function blocksInHour(blocks: BusyBlock[], roomId: string, day: string, hour: number) {
  const slotStart = `${String(hour).padStart(2, "0")}:00`;
  const slotEnd = `${String(hour + 1).padStart(2, "0")}:00`;
  return blocksForRoomDay(blocks, roomId, day).filter((b) => rangesOverlap(b.start, b.end, slotStart, slotEnd));
}

export function dayOccupancy(
  blocks: BusyBlock[],
  roomId: string,
  day: string,
  gridStart = GRID_START,
  gridEnd = GRID_END,
) {
  const hours = gridEnd - gridStart;
  if (hours <= 0) return 0;
  let busy = 0;
  for (let h = gridStart; h < gridEnd; h++) {
    if (hourIsBusy(blocks, roomId, day, h)) busy += 1;
  }
  return busy / hours;
}

export function weekDaysFrom(anchor: string): string[] {
  const d = new Date(`${anchor}T12:00:00`);
  const dow = d.getDay(); // 0 Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return localDayKey(x);
  });
}

export function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDayKey(d);
}

export function monthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1, 12);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: startPad }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(localDayKey(new Date(year, monthIndex, day, 12)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const HOUR_ROWS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
