"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Archive, ArchiveRestore, Trash2, Repeat } from "lucide-react";
import { Board, type BoardColumn } from "@/components/board";
import { Button, Dialog, Input, Label, Select, Textarea, Badge, Empty } from "@/components/ui";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  quadrantOf,
  QUADRANT_LABEL,
  type PersonalTask,
  type TaskStatus,
  type Quadrant,
} from "@/types";
import {
  createPersonalTask,
  updatePersonalTask,
  movePersonalTask,
  setPersonalTags,
  archivePersonalTask,
  deletePersonalTask,
} from "@/server/actions/personal";
import { formatDateHuman, todayInTz } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/lib/swal";

const COLUMNS: BoardColumn[] = TASK_STATUSES.map((s) => ({ key: s, title: TASK_STATUS_LABEL[s] }));
const QUADRANTS: Quadrant[] = ["do_first", "schedule", "plan", "someday"];
const MATRIX_COLUMNS: BoardColumn[] = QUADRANTS.map((q) => ({ key: q, title: QUADRANT_LABEL[q] }));
const TAGS: Record<Quadrant, [boolean, boolean]> = {
  do_first: [true, true],
  schedule: [true, false],
  plan: [false, true],
  someday: [false, false],
};

type View = "board" | "matrix" | "archive";

export function PersonalBoard({ tasks, timezone }: { tasks: PersonalTask[]; timezone: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const [editing, setEditing] = useState<PersonalTask | null>(null);
  const [creating, setCreating] = useState(false);

  const active = useMemo(
    () => tasks.filter((t) => !t.is_archived && !t.is_fully_complete),
    [tasks],
  );
  const completed = useMemo(
    () => tasks.filter((t) => !t.is_archived && t.is_fully_complete),
    [tasks],
  );
  const archived = useMemo(() => tasks.filter((t) => t.is_archived), [tasks]);

  // Recurring tasks done today live in the Done column for today.
  const boardItems = active;

  const tabs: { key: View; label: string }[] = [
    { key: "board", label: "Kanban" },
    { key: "matrix", label: "Priority matrix" },
    { key: "archive", label: `Archive (${archived.length + completed.length})` },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                view === t.key ? "bg-accent/15 font-medium text-accent" : "text-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> New todo
        </Button>
      </div>

      {view === "board" && (
        <Board<PersonalTask>
          columns={COLUMNS}
          items={boardItems}
          getId={(t) => t.id}
          getCol={(t) => t.status}
          getSort={(t) => new Date(t.created_at).getTime() / 1e7}
          onMove={(t, col) => movePersonalTask(t.id, col as TaskStatus)}
          onCardClick={(t) => setEditing(t)}
          renderCard={(t) => <PersonalCard task={t} timezone={timezone} />}
        />
      )}

      {view === "matrix" && (
        <Board<PersonalTask>
          columns={MATRIX_COLUMNS}
          items={boardItems.filter((t) => t.status !== "done")}
          getId={(t) => t.id}
          getCol={(t) => quadrantOf(t)}
          getSort={(t) => new Date(t.created_at).getTime() / 1e7}
          onMove={(t, col) => {
            const [urgent, important] = TAGS[col as Quadrant];
            return setPersonalTags(t.id, urgent, important);
          }}
          onCardClick={(t) => setEditing(t)}
          renderCard={(t) => <PersonalCard task={t} timezone={timezone} />}
          layout="grid2"
        />
      )}

      {view === "archive" && (
        <div className="space-y-2">
          {archived.length + completed.length === 0 && <Empty>Nothing archived or completed.</Empty>}
          {[...completed, ...archived].map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-muted">
                  {t.is_archived ? "archived" : "completed"}
                  {t.is_recurring && " · recurring"}
                </div>
              </div>
              <div className="flex gap-2">
                {t.is_archived ? (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await archivePersonalTask(t.id, false);
                      router.refresh();
                    }}
                  >
                    <ArchiveRestore size={14} /> Restore
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await movePersonalTask(t.id, "todo");
                      router.refresh();
                    }}
                  >
                    Reopen
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (await confirmDialog("Delete permanently?", undefined, { danger: true, confirmText: "Delete" })) {
                      await deletePersonalTask(t.id);
                      router.refresh();
                    }
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PersonalDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New personal todo"
        onSubmit={async (input) => {
          const result = await createPersonalTask(input);
          if (result.ok) {
            setCreating(false);
            router.refresh();
          }
          return result;
        }}
      />

      {editing && (
        <PersonalDialog
          open
          onClose={() => setEditing(null)}
          title="Edit todo"
          task={editing}
          onSubmit={async (input) => {
            const result = await updatePersonalTask(editing.id, input);
            if (result.ok) {
              setEditing(null);
              router.refresh();
            }
            return result;
          }}
          onArchive={async () => {
            await archivePersonalTask(editing.id, true);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PersonalCard({ task, timezone }: { task: PersonalTask; timezone: string }) {
  const today = todayInTz(timezone);
  const deadline = task.is_recurring ? task.due_date : (task.due_date ?? task.date);
  const overdue = !task.is_recurring && deadline && deadline < today && task.status !== "done";
  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        {task.is_recurring && <Repeat size={13} className="mt-0.5 shrink-0 text-accent" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {task.is_urgent && <Badge tone="danger">Urgent</Badge>}
        {task.is_important && <Badge tone="warning">Important</Badge>}
        {deadline && (
          <span className={cn("text-muted", overdue && "font-medium text-danger")}>
            {task.is_recurring ? `until ${formatDateHuman(deadline)}` : formatDateHuman(deadline)}
          </span>
        )}
        {task.time && <span className="text-muted">{task.time.slice(0, 5)}</span>}
      </div>
    </div>
  );
}

function PersonalDialog({
  open,
  onClose,
  title,
  task,
  onSubmit,
  onArchive,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  task?: PersonalTask;
  onSubmit: (input: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  onArchive?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [repeat, setRepeat] = useState(task?.repeat_type ?? "none");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await onSubmit({
      title: formData.get("title"),
      description: (formData.get("description") as string) || null,
      date: formData.get("date") || null,
      time: formData.get("time") || null,
      due_date: formData.get("due_date") || null,
      repeat_type: formData.get("repeat_type") ?? "none",
      repeat_interval: formData.get("repeat_interval") || 1,
      is_urgent: formData.get("is_urgent") === "on",
      is_important: formData.get("is_important") === "on",
    });
    setPending(false);
    if (!result.ok) setError(result.error ?? "Failed");
  }

  const isRecurring = repeat !== "none";

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input name="title" required maxLength={300} defaultValue={task?.title} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={2} maxLength={5000} defaultValue={task?.description ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Date</Label>
            <Input name="date" type="date" defaultValue={task?.date ?? ""} />
          </div>
          <div>
            <Label>Time</Label>
            <Input name="time" type="time" defaultValue={task?.time?.slice(0, 5) ?? ""} />
          </div>
          <div>
            <Label>{isRecurring ? "Repeat until *" : "Due date"}</Label>
            <Input name="due_date" type="date" defaultValue={task?.due_date ?? ""} required={isRecurring} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Repeat</Label>
            <Select
              name="repeat_type"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as PersonalTask["repeat_type"])}
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="workdays">Workdays (Mon–Fri)</option>
              <option value="weekends">Weekends</option>
              <option value="custom">Every N days</option>
            </Select>
          </div>
          {repeat === "custom" && (
            <div>
              <Label>Every N days</Label>
              <Input
                name="repeat_interval"
                type="number"
                min={1}
                max={365}
                defaultValue={task?.repeat_interval ?? 2}
              />
            </div>
          )}
        </div>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_urgent" defaultChecked={task?.is_urgent} /> Urgent
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_important" defaultChecked={task?.is_important} /> Important
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center justify-between">
          <div>
            {task && onArchive && (
              <Button type="button" variant="ghost" onClick={onArchive}>
                <Archive size={14} /> Archive
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
