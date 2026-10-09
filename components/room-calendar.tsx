"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, inputClassInline } from "@/components/ui";
import {
  HOUR_ROWS,
  allBusyBlocks,
  blocksForRoomDay,
  blocksInHour,
  dayOccupancy,
  monthCells,
  shiftDay,
  weekDaysFrom,
  type BusyBlock,
} from "@/lib/room-availability";
import { useI18n } from "@/lib/i18n";
import { cn, localDayKey, weekdayShort } from "@/lib/utils";
import type { Room, RoomBooking, StudioClass } from "@/types";

type Mode = "week" | "day" | "month";

export function RoomCalendar({
  rooms,
  classes,
  bookings,
  branchId,
  initialRoomId,
}: {
  rooms: Room[];
  classes: StudioClass[];
  bookings: RoomBooking[];
  branchId: string;
  initialRoomId?: string;
}) {
  const { lang, t } = useI18n();
  const scopedRooms = useMemo(
    () => rooms.filter((r) => branchId === "all" || r.branchId === branchId),
    [rooms, branchId],
  );
  const [roomId, setRoomId] = useState(initialRoomId || scopedRooms[0]?.id || "");
  const [mode, setMode] = useState<Mode>("week");
  const [focusDay, setFocusDay] = useState(localDayKey());
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (initialRoomId && scopedRooms.some((r) => r.id === initialRoomId)) {
      setRoomId(initialRoomId);
    } else if (!scopedRooms.some((r) => r.id === roomId) && scopedRooms[0]) {
      setRoomId(scopedRooms[0].id);
    }
  }, [initialRoomId, scopedRooms, roomId]);

  const room = scopedRooms.find((r) => r.id === roomId) ?? scopedRooms[0];
  const activeRoomId = room?.id ?? "";

  const blocks = useMemo(() => {
    const all = allBusyBlocks(classes, bookings);
    return branchId === "all"
      ? all
      : all.filter((b) => {
          const r = rooms.find((x) => x.id === b.roomId);
          return r?.branchId === branchId;
        });
  }, [classes, bookings, rooms, branchId]);

  const week = useMemo(() => weekDaysFrom(focusDay), [focusDay]);

  if (scopedRooms.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{t.roomsCal.noRooms}</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={inputClassInline}
          style={{ minWidth: "12rem" }}
          value={activeRoomId}
          onChange={(e) => setRoomId(e.target.value)}
          aria-label={t.common.room}
        >
          {scopedRooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {([
            ["week", t.roomsCal.week],
            ["day", t.roomsCal.day],
            ["month", t.roomsCal.month],
          ] as const).map(([id, label]) => (
            <Button key={id} type="button" variant={mode === id ? "primary" : "outline"} onClick={() => setMode(id)}>
              {label}
            </Button>
          ))}
        </div>
        {mode === "week" || mode === "day" ? (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" onClick={() => setFocusDay(shiftDay(focusDay, mode === "week" ? -7 : -1))}>
              {t.roomsCal.prev}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFocusDay(localDayKey())}>
              {t.roomsCal.today}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFocusDay(shiftDay(focusDay, mode === "week" ? 7 : 1))}>
              {t.roomsCal.next}
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setMonthCursor((c) => {
                  const d = new Date(c.y, c.m - 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              {t.roomsCal.prev}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const d = new Date();
                setMonthCursor({ y: d.getFullYear(), m: d.getMonth() });
              }}
            >
              {t.roomsCal.today}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setMonthCursor((c) => {
                  const d = new Date(c.y, c.m + 1, 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })
              }
            >
              {t.roomsCal.next}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-emerald-100 ring-1 ring-emerald-300" />{t.roomsCal.free}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-[var(--brand-100)] ring-1 ring-[var(--brand-400)]" />{t.roomsCal.busyClass}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-sky-100 ring-1 ring-sky-400" />{t.roomsCal.busyBooking}</span>
      </div>

      {mode === "week" && room ? (
        <WeekGrid room={room} week={week} blocks={blocks} lang={lang} t={t} onPickDay={(d) => { setFocusDay(d); setMode("day"); }} />
      ) : null}
      {mode === "day" && room ? (
        <DayTimeline room={room} day={focusDay} blocks={blocks} t={t} />
      ) : null}
      {mode === "month" && room ? (
        <MonthHeat
          room={room}
          year={monthCursor.y}
          month={monthCursor.m}
          blocks={blocks}
          lang={lang}
          t={t}
          onPickDay={(d) => { setFocusDay(d); setMode("day"); }}
        />
      ) : null}

      <p className="text-xs text-slate-400">
        {t.roomsCal.hint}{" "}
        <Link href="/room-bookings" className="font-semibold text-[var(--brand-600)]">{t.nav.bookings}</Link>
      </p>
    </div>
  );
}

function WeekGrid({
  room,
  week,
  blocks,
  lang,
  t,
  onPickDay,
}: {
  room: Room;
  week: string[];
  blocks: BusyBlock[];
  lang: "vi" | "en";
  t: ReturnType<typeof useI18n>["t"];
  onPickDay: (day: string) => void;
}) {
  return (
    <Card className="overflow-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50 text-xs font-semibold">
          <div className="p-2 text-slate-400">{t.roomsCal.hour}</div>
          {week.map((day) => {
            const d = new Date(`${day}T12:00:00`);
            return (
              <button
                key={day}
                type="button"
                onClick={() => onPickDay(day)}
                className="border-l border-slate-100 p-2 text-left hover:bg-white"
              >
                <span className="block">{weekdayShort(d.getDay(), lang)}</span>
                <span className="text-slate-500">{day.slice(8)}/{day.slice(5, 7)}</span>
              </button>
            );
          })}
        </div>
        {HOUR_ROWS.map((hour) => (
          <div key={hour} className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-50 text-xs">
            <div className="p-2 tabular-nums text-slate-400">{String(hour).padStart(2, "0")}:00</div>
            {week.map((day) => {
              const hits = blocksInHour(blocks, room.id, day, hour);
              const kind = hits.some((h) => h.kind === "class")
                ? "class"
                : hits.some((h) => h.kind === "booking")
                  ? "booking"
                  : "free";
              return (
                <button
                  key={`${day}-${hour}`}
                  type="button"
                  title={hits.map((h) => `${h.start}–${h.end} ${h.title}`).join("\n") || t.roomsCal.free}
                  onClick={() => onPickDay(day)}
                  className={cn(
                    "min-h-10 border-l border-slate-50 px-1 py-1 text-left",
                    kind === "free" && "bg-emerald-50/70 hover:bg-emerald-100",
                    kind === "class" && "bg-[var(--brand-50)] hover:bg-[var(--brand-100)]",
                    kind === "booking" && "bg-sky-50 hover:bg-sky-100",
                  )}
                >
                  {hits[0] ? (
                    <span className="line-clamp-2 font-medium text-slate-800">{hits[0].title}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DayTimeline({
  room,
  day,
  blocks,
  t,
}: {
  room: Room;
  day: string;
  blocks: BusyBlock[];
  t: ReturnType<typeof useI18n>["t"];
}) {
  const rows = blocksForRoomDay(blocks, room.id, day);
  return (
    <Card className="p-4">
      <h2 className="crm-section-title">{room.name} · {day}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {rows.length === 0 ? t.roomsCal.dayFree : t.roomsCal.dayBusy.replace("{n}", String(rows.length))}
      </p>
      <ul className="mt-4 space-y-2">
        {HOUR_ROWS.map((hour) => {
          const hits = blocksInHour(blocks, room.id, day, hour);
          return (
            <li key={hour} className="flex gap-3 text-sm">
              <span className="w-14 shrink-0 tabular-nums text-slate-400">{String(hour).padStart(2, "0")}:00</span>
              {hits.length === 0 ? (
                <span className="flex-1 rounded-[10px] bg-emerald-50 px-3 py-2 text-emerald-800">{t.roomsCal.free}</span>
              ) : (
                <div className="flex flex-1 flex-col gap-1">
                  {hits.map((h) => (
                    <div
                      key={h.id}
                      className={cn(
                        "rounded-[10px] px-3 py-2",
                        h.kind === "class" ? "bg-[var(--brand-50)] text-[var(--brand-700)]" : "bg-sky-50 text-sky-900",
                      )}
                    >
                      <span className="font-semibold">{h.start}–{h.end}</span>
                      <span className="mx-2">·</span>
                      <span>{h.title}</span>
                      <span className="ml-2 text-xs font-semibold uppercase opacity-70">
                        {h.kind === "class" ? t.roomsCal.busyClass : t.roomsCal.busyBooking}
                      </span>
                      {h.kind === "class" ? (
                        <Link href={`/classes/${h.id}`} className="ml-2 text-xs font-semibold underline">
                          {t.roomsCal.openClass}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function MonthHeat({
  room,
  year,
  month,
  blocks,
  lang,
  t,
  onPickDay,
}: {
  room: Room;
  year: number;
  month: number;
  blocks: BusyBlock[];
  lang: "vi" | "en";
  t: ReturnType<typeof useI18n>["t"];
  onPickDay: (day: string) => void;
}) {
  const cells = monthCells(year, month);
  const title = new Date(year, month, 1).toLocaleDateString(lang === "en" ? "en-US" : "vi-VN", {
    month: "long",
    year: "numeric",
  });
  const headers = lang === "en"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <Card className="p-4">
      <h2 className="crm-section-title capitalize">{room.name} · {title}</h2>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {headers.map((h) => <div key={h} className="py-1">{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-16 rounded-[10px] bg-slate-50/50" />;
          const occ = dayOccupancy(blocks, room.id, day);
          const pct = Math.round(occ * 100);
          const tone =
            occ === 0
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : occ < 0.35
                ? "bg-amber-50 text-amber-900 ring-amber-200"
                : occ < 0.7
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] ring-[var(--brand-100)]"
                  : "bg-rose-50 text-rose-900 ring-rose-200";
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPickDay(day)}
              className={cn("min-h-16 rounded-[10px] p-2 text-left ring-1", tone)}
            >
              <span className="block text-sm font-bold">{Number(day.slice(8))}</span>
              <span className="mt-1 block text-[10px] font-semibold">
                {occ === 0 ? t.roomsCal.free : `${pct}%`}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
