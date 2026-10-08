"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card } from "@/components/ui";
import { toggleTask } from "@/lib/actions";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { localDayKey } from "@/lib/utils";

export default function TasksPage() {
  const { t } = useI18n();
  const tasks = useLiveQuery(() => db.tasks.orderBy("day").reverse().toArray(), []) ?? [];
  const today = localDayKey();
  return (
    <div>
      <h1 className="text-xl font-bold">{t.pages.tasks}</h1>
      <ul className="mt-4 space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <Card className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className={task.done ? "text-slate-400 line-through" : "font-medium"}>{task.title}</p>
                <p className="text-xs text-slate-400">{task.day}{task.day < today && !task.done ? ` · ${t.pages.overdue}` : ""}</p>
              </div>
              <Button variant={task.done ? "outline" : "primary"} onClick={() => void toggleTask(task.id, !task.done)}>
                {task.done ? t.pages.reopen : t.pages.done}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
