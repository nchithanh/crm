"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card } from "@/components/ui";
import { toggleTask } from "@/lib/actions";
import { db } from "@/lib/db";
import { localDayKey } from "@/lib/utils";

export default function TasksPage() {
  const tasks = useLiveQuery(() => db.tasks.orderBy("day").reverse().toArray(), []) ?? [];
  const today = localDayKey();
  return (
    <div>
      <h1 className="text-xl font-bold">Tác vụ</h1>
      <ul className="mt-4 space-y-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <Card className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className={t.done ? "text-slate-400 line-through" : "font-medium"}>{t.title}</p>
                <p className="text-xs text-slate-400">{t.day}{t.day < today && !t.done ? " · quá hạn" : ""}</p>
              </div>
              <Button variant={t.done ? "outline" : "primary"} onClick={() => void toggleTask(t.id, !t.done)}>
                {t.done ? "Mở lại" : "Xong"}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
