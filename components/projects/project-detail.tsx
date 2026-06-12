"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Archive, ArchiveRestore, UserPlus, X, MessageSquare } from "lucide-react";
import { Board, type BoardColumn } from "@/components/board";
import { Button, Dialog, Input, Label, Select, Textarea, Badge, Empty } from "@/components/ui";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  quadrantOf,
  QUADRANT_LABEL,
  type Task,
  type TaskStatus,
  type ProjectStatus,
  type ProjectMilestone,
  type Quadrant,
} from "@/types";
import {
  createTask,
  updateTask,
  moveTask,
  setTaskTags,
  archiveTask,
  deleteTask,
  addComment,
} from "@/server/actions/tasks";
import {
  addMember,
  removeMember,
  createMilestone,
  moveMilestone,
  deleteMilestone,
} from "@/server/actions/projects";
import { formatDateHuman, formatDateTime, todayInTz } from "@/lib/dates";
import { cn, formatMoney, initials } from "@/lib/utils";
import { confirmDialog } from "@/lib/swal";

export interface TaskRow extends Task {
  assignee_name: string | null;
}
export interface MemberRow {
  user_id: string;
  full_name: string;
  email: string;
}
export interface CommentRow {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_name: string;
}
export interface AllocationRow {
  id: string;
  full_name: string;
  email: string;
  department: string;
  active_projects: number;
}

const TASK_COLUMNS: BoardColumn[] = TASK_STATUSES.map((s) => ({
  key: s,
  title: TASK_STATUS_LABEL[s],
  ...(s === "done" ? { hint: "Owner approves into Done" } : {}),
}));

const QUADRANTS: Quadrant[] = ["do_first", "schedule", "plan", "someday"];
const MATRIX_COLUMNS: BoardColumn[] = QUADRANTS.map((q) => ({
  key: q,
  title: QUADRANT_LABEL[q],
}));

const TAGS_FOR_QUADRANT: Record<Quadrant, { is_urgent: boolean; is_important: boolean }> = {
  do_first: { is_urgent: true, is_important: true },
  schedule: { is_urgent: true, is_important: false },
  plan: { is_urgent: false, is_important: true },
  someday: { is_urgent: false, is_important: false },
};

type View = "board" | "matrix" | "milestones" | "members" | "archive";

export function ProjectDetail({
  projectId,
  ownerName,
  tasks,
  milestones,
  members,
  comments,
  allocation,
  meId,
  canManage,
  canMarkPaid,
}: {
  projectId: string;
  ownerName: string;
  tasks: TaskRow[];
  milestones: ProjectMilestone[];
  members: MemberRow[];
  comments: CommentRow[];
  allocation: AllocationRow[];
  meId: string;
  canManage: boolean;
  canMarkPaid: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_archived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t) => t.is_archived), [tasks]);

  // Deep link from notifications: ?task=<id> opens that task's modal.
  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get("task");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) setSelected(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeTask() {
    setSelected(null);
    // Strip ?task= so refresh/back doesn't reopen the modal.
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  const tabs: { key: View; label: string }[] = [
    { key: "board", label: "Kanban" },
    { key: "matrix", label: "Priority matrix" },
    { key: "milestones", label: `Milestones (${milestones.length})` },
    { key: "members", label: `Members (${members.length})` },
    ...(canManage ? [{ key: "archive" as View, label: `Archive (${archivedTasks.length})` }] : []),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded border border-line bg-surface p-1">
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
          <Plus size={16} /> New task
        </Button>
      </div>

      {view === "board" && (
        <Board<TaskRow>
          columns={TASK_COLUMNS}
          items={activeTasks}
          getId={(t) => t.id}
          getCol={(t) => t.status}
          getSort={(t) => t.sort_order}
          canDrag={(t) => canManage || t.status !== "done"}
          canDropTo={(col, t) => canManage || ((col === "done") === (t.status === "done"))}
          onMove={(t, col, sort) => moveTask(t.id, projectId, col as TaskStatus, sort)}
          onCardClick={(t) => setSelected(t)}
          renderCard={(t) => <TaskCard task={t} />}
        />
      )}

      {view === "matrix" && (
        <Board<TaskRow>
          columns={MATRIX_COLUMNS}
          items={activeTasks.filter((t) => t.status !== "done")}
          getId={(t) => t.id}
          getCol={(t) => quadrantOf(t)}
          getSort={(t) => t.sort_order}
          onMove={(t, col) => {
            const tags = TAGS_FOR_QUADRANT[col as Quadrant];
            return setTaskTags(t.id, projectId, tags.is_urgent, tags.is_important);
          }}
          onCardClick={(t) => setSelected(t)}
          renderCard={(t) => <TaskCard task={t} />}
          layout="grid2"
        />
      )}

      {view === "milestones" && (
        <MilestonesPanel
          projectId={projectId}
          milestones={milestones}
          canManage={canManage}
          canMarkPaid={canMarkPaid}
        />
      )}

      {view === "members" && (
        <MembersPanel
          projectId={projectId}
          ownerName={ownerName}
          members={members}
          allocation={allocation}
          canManage={canManage}
        />
      )}

      {view === "archive" && canManage && (
        <div className="space-y-2">
          {archivedTasks.length === 0 && <Empty>Archive is empty.</Empty>}
          {archivedTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-muted">archived {formatDateTime(t.archived_at ?? undefined)}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await archiveTask(t.id, projectId, false);
                    router.refresh();
                  }}
                >
                  <ArchiveRestore size={14} /> Restore
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (await confirmDialog("Delete permanently?", "This cannot be undone.", { danger: true, confirmText: "Delete" })) {
                      await deleteTask(t.id, projectId);
                      router.refresh();
                    }
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create task */}
      <TaskDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New task"
        members={members}
        milestones={milestones}
        onSubmit={async (input) => {
          const result = await createTask(projectId, input);
          if (result.ok) {
            setCreating(false);
            router.refresh();
          }
          return result;
        }}
      />

      {/* Edit task + comments */}
      {selected && (
        <TaskDialog
          open
          onClose={closeTask}
          title="Task"
          task={selected}
          members={members}
          milestones={milestones}
          canManage={canManage}
          projectId={projectId}
          comments={comments.filter((c) => c.task_id === selected.id)}
          meId={meId}
          onSubmit={async (input) => {
            const result = await updateTask(selected.id, projectId, input);
            if (result.ok) {
              closeTask();
              router.refresh();
            }
            return result;
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ task }: { task: TaskRow }) {
  const today = todayInTz("Asia/Tokyo");
  const overdue = task.due_date && task.due_date < today && task.status !== "done";
  return (
    <div className="rounded border border-line bg-surface p-3 shadow-sm">
      <div className="text-sm font-medium">{task.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {task.is_urgent && <Badge tone="danger">Urgent</Badge>}
        {task.is_important && <Badge tone="warning">Important</Badge>}
        {task.due_date && (
          <span className={cn("text-muted", overdue && "font-medium text-danger")}>
            {formatDateHuman(task.due_date)}
          </span>
        )}
      </div>
      {task.assignee_name && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
            {initials(task.assignee_name)}
          </span>
          {task.assignee_name}
        </div>
      )}
    </div>
  );
}

function TaskDialog({
  open,
  onClose,
  title,
  task,
  members,
  milestones,
  canManage,
  projectId,
  comments,
  meId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  task?: TaskRow;
  members: MemberRow[];
  milestones: ProjectMilestone[];
  canManage?: boolean;
  projectId?: string;
  comments?: CommentRow[];
  meId?: string;
  onSubmit: (input: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [commentBody, setCommentBody] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await onSubmit({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      assignee_id: formData.get("assignee_id") || null,
      milestone_id: formData.get("milestone_id") || null,
      due_date: formData.get("due_date") || null,
      is_urgent: formData.get("is_urgent") === "on",
      is_important: formData.get("is_important") === "on",
    });
    setPending(false);
    if (!result.ok) setError(result.error ?? "Failed");
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input name="title" required maxLength={300} defaultValue={task?.title} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={3} maxLength={5000} defaultValue={task?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Assignee</Label>
            <Select name="assignee_id" defaultValue={task?.assignee_id ?? ""}>
              <option value="">— unassigned —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Milestone</Label>
            <Select name="milestone_id" defaultValue={task?.milestone_id ?? ""}>
              <option value="">— none —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
          </div>
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
            {task && canManage && projectId && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await archiveTask(task.id, projectId, true);
                  onClose();
                  router.refresh();
                }}
              >
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

      {task && projectId && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <MessageSquare size={14} /> Comments ({comments?.length ?? 0})
          </h3>
          <div className="max-h-48 space-y-3 overflow-y-auto">
            {(comments ?? []).map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.user_name}</span>
                <span className="ml-2 text-xs text-muted">{formatDateTime(c.created_at)}</span>
                <p className="mt-0.5 text-muted">{c.body}</p>
              </div>
            ))}
            {(comments ?? []).length === 0 && (
              <p className="text-sm text-muted">No comments yet.</p>
            )}
          </div>
          <form
            className="mt-3 flex gap-2"
            action={async () => {
              if (!commentBody.trim()) return;
              const result = await addComment(task.id, projectId, commentBody);
              if (result.ok) {
                setCommentBody("");
                router.refresh();
              }
            }}
          >
            <Input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              maxLength={5000}
            />
            <Button type="submit" variant="secondary">
              Post
            </Button>
          </form>
        </div>
      )}
    </Dialog>
  );
}

function MilestonesPanel({
  projectId,
  milestones,
  canManage,
  canMarkPaid,
}: {
  projectId: string;
  milestones: ProjectMilestone[];
  canManage: boolean;
  canMarkPaid: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidTotal = milestones
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const total = milestones.reduce((sum, m) => sum + Number(m.amount), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Received <span className="font-semibold text-success">{formatMoney(paidTotal)}</span> of{" "}
          <span className="font-semibold text-ink">{formatMoney(total)}</span>
          {" — project goes Paid when every milestone is Paid."}
        </p>
        {canManage && (
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add milestone
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {milestones.length === 0 && <Empty>No milestones — the project is paid as a whole.</Empty>}

      {milestones.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-surface p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{m.title}</span>
              <Badge tone={m.status === "paid" ? "success" : m.status === "done" ? "accent" : "default"}>
                {PROJECT_STATUS_LABEL[m.status]}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted">
              {Number(m.amount) > 0 && <span className="mr-3">{formatMoney(m.amount)}</span>}
              {m.deadline && <span>due {formatDateHuman(m.deadline)}</span>}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Select
                value={m.status}
                className="w-40"
                onChange={async (e) => {
                  setError(null);
                  const result = await moveMilestone(m.id, projectId, e.target.value as ProjectStatus);
                  if (!result.ok) setError(result.error ?? "Failed");
                  else router.refresh();
                }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === "paid" && !canMarkPaid && m.status !== "paid"}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (await confirmDialog("Delete this milestone?", undefined, { danger: true, confirmText: "Delete" })) {
                    await deleteMilestone(m.id, projectId);
                    router.refresh();
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
      ))}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add milestone">
        <form
          action={async (formData: FormData) => {
            const result = await createMilestone(projectId, {
              title: formData.get("title"),
              deadline: formData.get("deadline") || null,
              amount: formData.get("amount") || 0,
            });
            if (!result.ok) setError(result.error ?? "Failed");
            else {
              setAdding(false);
              router.refresh();
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>Title *</Label>
            <Input name="title" required maxLength={200} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Deadline</Label>
              <Input name="deadline" type="date" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input name="amount" type="number" min={0} step="0.01" defaultValue={0} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function MembersPanel({
  projectId,
  ownerName,
  members,
  allocation,
  canManage,
}: {
  projectId: string;
  ownerName: string;
  members: MemberRow[];
  allocation: AllocationRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = allocation.filter((a) => !memberIds.has(a.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Owner: <span className="font-medium text-ink">{ownerName}</span>
        </p>
        {canManage && (
          <Button onClick={() => setAdding(true)}>
            <UserPlus size={16} /> Add members
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {members.length === 0 && <Empty>No members yet — add staff so they can see this project.</Empty>}

      <div className="grid gap-2 sm:grid-cols-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between rounded border border-line bg-surface p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {initials(m.full_name)}
              </span>
              <div>
                <div className="text-sm font-medium">{m.full_name}</div>
                <div className="text-xs text-muted">{m.email}</div>
              </div>
            </div>
            {canManage && (
              <button
                className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                aria-label={`Remove ${m.full_name}`}
                onClick={async () => {
                  if (await confirmDialog(
                    `Remove ${m.full_name} from this project?`,
                    "Their tasks stay on the board, unassigned.",
                    { confirmText: "Remove" },
                  )) {
                    const result = await removeMember(projectId, m.user_id);
                    if (!result.ok) setError(result.error ?? "Failed");
                    else router.refresh();
                  }
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add members" wide>
        <p className="mb-3 text-sm text-muted">
          Free staff first — they get a notification and the project appears in their workspace.
        </p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {candidates.length === 0 && <Empty>Everyone is already on this project.</Empty>}
          {candidates.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded border border-line bg-surface p-3">
              <div>
                <div className="text-sm font-medium">{a.full_name}</div>
                <div className="text-xs text-muted">
                  {a.department || "—"} · {a.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.active_projects === 0 ? (
                  <Badge tone="success">Free</Badge>
                ) : (
                  <Badge>{a.active_projects} project{a.active_projects > 1 ? "s" : ""}</Badge>
                )}
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const result = await addMember(projectId, a.id);
                    if (!result.ok) setError(result.error ?? "Failed");
                    else router.refresh();
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
