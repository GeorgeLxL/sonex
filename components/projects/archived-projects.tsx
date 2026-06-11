"use client";

import { useRouter } from "next/navigation";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { archiveProject, deleteProject } from "@/server/actions/projects";
import { confirmDialog } from "@/lib/swal";
import { formatDateTime } from "@/lib/dates";
import type { ProjectRow } from "@/components/projects/pipeline-board";

export function ArchivedProjects({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();

  return (
    <details className="mt-8">
      <summary className="cursor-pointer text-sm font-semibold text-muted">
        Archive ({projects.length}) — pre-deleted projects
      </summary>
      <div className="mt-3 space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-line bg-surface p-3"
          >
            <div>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-muted">
                archived {formatDateTime(p.archived_at ?? undefined)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await archiveProject(p.id, false);
                  router.refresh();
                }}
              >
                <ArchiveRestore size={14} /> Restore
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await confirmDialog(
                    `Permanently delete "${p.name}"?`,
                    "All its tasks are deleted too. This cannot be undone.",
                    { danger: true, confirmText: "Delete forever" },
                  )) {
                    await deleteProject(p.id);
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
    </details>
  );
}
