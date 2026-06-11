"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, User, Building2 } from "lucide-react";
import { Select, Button, Badge } from "@/components/ui";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types";
import { moveProject, archiveProject } from "@/server/actions/projects";
import { confirmDialog } from "@/lib/swal";
import { formatDateHuman } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";

export function ProjectHeader({
  project,
  clientName,
  ownerName,
  canManage,
  canMarkPaid,
  canArchive,
}: {
  project: {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    deadline: string | null;
    amount: number;
    sort_order: number;
    is_archived: boolean;
  };
  clientName: string | null;
  ownerName: string;
  canManage: boolean;
  canMarkPaid: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.is_archived && <Badge tone="warning">Archived</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <User size={14} /> {ownerName}
            </span>
            {clientName && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={14} /> {clientName}
              </span>
            )}
            {project.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} /> {formatDateHuman(project.deadline)}
              </span>
            )}
            {Number(project.amount) > 0 && (
              <span className="font-medium text-success">{formatMoney(project.amount)}</span>
            )}
          </div>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <Select
              value={project.status}
              className="w-40"
              onChange={async (e) => {
                setError(null);
                const result = await moveProject(
                  project.id,
                  e.target.value as ProjectStatus,
                  project.sort_order,
                );
                if (!result.ok) setError(result.error ?? "Failed");
                else router.refresh();
              }}
            >
              {PROJECT_STATUSES.map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={s === "paid" && !canMarkPaid && project.status !== "paid"}
                >
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          ) : (
            <Badge tone={project.status === "paid" ? "success" : "accent"}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
          )}
          {canArchive && !project.is_archived && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (await confirmDialog(
                  "Archive this project?",
                  "It moves to trash and can be restored later.",
                  { confirmText: "Archive" },
                )) {
                  await archiveProject(project.id, true);
                  router.refresh();
                }
              }}
            >
              <Archive size={14} /> Archive
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
