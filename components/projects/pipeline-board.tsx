"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CalendarDays, User, Pencil, Archive } from "lucide-react";
import { Board, type BoardColumn } from "@/components/board";
import { Button, Dialog, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { createProject, updateProject, archiveProject, moveProject } from "@/server/actions/projects";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type Project, type ProjectStatus } from "@/types";
import { formatMoney } from "@/lib/utils";
import { formatDateHuman, todayInTz } from "@/lib/dates";
import { confirmDialog } from "@/lib/swal";

export interface ProjectRow extends Project {
  client_name: string | null;
  owner_name: string;
}

const COLUMNS: BoardColumn[] = PROJECT_STATUSES.map((s) => ({
  key: s,
  title: PROJECT_STATUS_LABEL[s],
  ...(s === "paid" ? { hint: "CTO/COO only" } : {}),
}));

export function PipelineBoard({
  projects,
  canMarkPaid,
  canCreate,
  detailBase,
  staff,
  clients,
}: {
  projects: ProjectRow[];
  canMarkPaid: boolean;
  canCreate: boolean;
  detailBase: string;
  staff: { id: string; full_name: string }[];
  clients: { id: string; name: string; company: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const today = todayInTz("Asia/Tokyo");

  return (
    <div>
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> New project
          </Button>
        </div>
      )}

      <Board<ProjectRow>
        columns={COLUMNS}
        items={projects}
        getId={(p) => p.id}
        getCol={(p) => p.status}
        getSort={(p) => p.sort_order}
        canDropTo={(col, p) =>
          canMarkPaid || ((col !== "paid") === (p.status !== "paid"))
        }
        onMove={(p, col, sort) => moveProject(p.id, col as ProjectStatus, sort)}
        renderCard={(p) => (
          <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`${detailBase}/${p.id}`}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-sm font-semibold hover:text-accent hover:underline"
              >
                {p.name}
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                {Number(p.amount) > 0 && (
                  <span className="text-xs font-medium text-success">{formatMoney(p.amount)}</span>
                )}
                {canCreate && (
                  <button
                    aria-label="Edit project"
                    className="rounded p-1 text-muted hover:bg-surface-2 hover:text-ink"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>
            {p.client_name && <div className="mt-1 text-xs text-muted">{p.client_name}</div>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <User size={12} /> {p.owner_name}
              </span>
              {p.deadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} /> {formatDateHuman(p.deadline)}
                </span>
              )}
              {p.deadline && p.deadline < today && p.status !== "done" && p.status !== "paid" && (
                <Badge tone="danger">Overdue</Badge>
              )}
            </div>
          </div>
        )}
      />

      {/* Create */}
      <ProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New project"
        staff={staff}
        clients={clients}
        onSubmit={async (input) => {
          const result = await createProject(input);
          if (result.ok) {
            setCreating(false);
            router.refresh();
          }
          return result;
        }}
      />

      {/* Edit + archive */}
      {editing && (
        <ProjectDialog
          open
          onClose={() => setEditing(null)}
          title="Edit project"
          project={editing}
          staff={staff}
          clients={clients}
          onSubmit={async (input) => {
            const result = await updateProject(editing.id, input);
            if (result.ok) {
              setEditing(null);
              router.refresh();
            }
            return result;
          }}
          onArchive={async () => {
            if (
              await confirmDialog(
                `Archive "${editing.name}"?`,
                "It moves to trash and can be restored later.",
                { confirmText: "Archive" },
              )
            ) {
              await archiveProject(editing.id, true);
              setEditing(null);
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}

function ProjectDialog({
  open,
  onClose,
  title,
  project,
  staff,
  clients,
  onSubmit,
  onArchive,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  project?: ProjectRow;
  staff: { id: string; full_name: string }[];
  clients: { id: string; name: string; company: string }[];
  onSubmit: (input: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  onArchive?: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setFormError(null);
    const result = await onSubmit({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      client_id: formData.get("client_id") || null,
      owner_id: formData.get("owner_id"),
      deadline: formData.get("deadline") || null,
      amount: formData.get("amount") || 0,
    });
    setPending(false);
    if (!result.ok) setFormError(result.error ?? "Failed");
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} wide>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label>Project name *</Label>
          <Input name="name" required maxLength={200} defaultValue={project?.name} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea name="description" rows={3} maxLength={5000} defaultValue={project?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Owner *</Label>
            <Select name="owner_id" required defaultValue={project?.owner_id}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Client</Label>
            <Select name="client_id" defaultValue={project?.client_id ?? ""}>
              <option value="">— none —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Deadline</Label>
            <Input name="deadline" type="date" defaultValue={project?.deadline ?? ""} />
          </div>
          <div>
            <Label>Amount (project value)</Label>
            <Input name="amount" type="number" min={0} step="0.01" defaultValue={project ? Number(project.amount) : 0} />
          </div>
        </div>
        {formError && <p className="text-sm text-danger">{formError}</p>}
        <div className="flex items-center justify-between">
          <div>
            {onArchive && (
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
              {pending ? "Saving…" : project ? "Save" : "Create project"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
