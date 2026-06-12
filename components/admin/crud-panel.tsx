"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, Input, Label, Select, Textarea, Empty, Badge, FileInput } from "@/components/ui";
import { upsertEntity, deleteEntity, uploadCmsImage } from "@/server/actions/crud";
import { confirmDialog } from "@/lib/swal";
import type { EntityDef } from "@/lib/admin-entities";

/** File picker that uploads immediately and stores the URL in a hidden input. */
function ImageField({ name, current }: { name: string; current: string }) {
  const [url, setUrl] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-24 rounded border border-line object-cover" />
      )}
      <input type="hidden" name={name} value={url} />
      <FileInput
        accept="image/jpeg,image/png,image/webp"
        label="Choose image"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          const fd = new FormData();
          fd.append("file", file);
          const result = await uploadCmsImage(fd);
          setBusy(false);
          if (!result.ok || !result.url) setError(result.error ?? "Upload failed");
          else setUrl(result.url);
        }}
      />
      {busy && <p className="text-xs text-muted">Uploading…</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export type Row = Record<string, unknown> & { id: string };

export function CrudPanel({
  entityKey,
  entity,
  rows,
  columns,
  canWrite,
  canCreate = true,
  canDelete = true,
  extra,
  refOptions,
}: {
  entityKey: string;
  entity: EntityDef;
  rows: Row[];
  /** Column keys shown in the table (subset of row fields). */
  columns: { key: string; label: string }[];
  canWrite: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  /** Optional read-only details rendered under the first cell, keyed by row id
   *  (pre-rendered server-side — functions cannot cross to client components). */
  extra?: Record<string, React.ReactNode>;
  /** Options for "ref" fields, keyed by field name (provided by the page). */
  refOptions?: Record<string, { value: string; label: string }[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(id: string | null, formData: FormData) {
    setPending(true);
    setError(null);
    const raw: Record<string, unknown> = {};
    for (const f of entity.fields) {
      raw[f.name] = f.type === "bool" ? formData.get(f.name) === "on" : formData.get(f.name);
    }
    const result = await upsertEntity(entityKey, id, raw);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Failed");
      return;
    }
    setEditing(null);
    setCreating(false);
    router.refresh();
  }

  function cellValue(row: Row, key: string): React.ReactNode {
    const v = row[key];
    if (typeof v === "boolean")
      return v ? <Badge tone="success">yes</Badge> : <Badge>no</Badge>;
    if (Array.isArray(v)) return v.join(", ");
    if (v == null || v === "") return <span className="text-muted">—</span>;
    const s = String(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  }

  const form = (row: Row | null) => (
    <form action={(fd) => submit(row?.id ?? null, fd)} className="space-y-4">
      {entity.fields.map((f) => (
        <div key={f.name}>
          {f.type !== "bool" && <Label>{f.label}{f.required ? " *" : ""}</Label>}
          {f.type === "text" && (
            <Input name={f.name} defaultValue={(row?.[f.name] as string) ?? ""} required={f.required} maxLength={1000} />
          )}
          {f.type === "textarea" && (
            <Textarea name={f.name} rows={4} defaultValue={(row?.[f.name] as string) ?? ""} required={f.required} />
          )}
          {f.type === "number" && (
            <Input name={f.name} type="number" step="any" defaultValue={(row?.[f.name] as number) ?? 0} />
          )}
          {f.type === "date" && (
            <Input name={f.name} type="date" defaultValue={(row?.[f.name] as string) ?? ""} required={f.required} />
          )}
          {f.type === "select" && (
            <Select name={f.name} defaultValue={(row?.[f.name] as string) ?? f.options?.[0]}>
              {f.options?.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
          )}
          {f.type === "tags" && (
            <Input
              name={f.name}
              defaultValue={Array.isArray(row?.[f.name]) ? (row?.[f.name] as string[]).join(", ") : ""}
              placeholder="tag1, tag2"
            />
          )}
          {f.type === "image" && (
            <ImageField name={f.name} current={(row?.[f.name] as string) ?? ""} />
          )}
          {f.type === "ref" && (
            <Select name={f.name} defaultValue={(row?.[f.name] as string) ?? ""}>
              <option value="">— none —</option>
              {(refOptions?.[f.name] ?? []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          )}
          {f.type === "bool" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={f.name} defaultChecked={row ? Boolean(row[f.name]) : true} />
              {f.label}
            </label>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => { setEditing(null); setCreating(false); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );

  return (
    <div>
      {canWrite && canCreate && (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => { setCreating(true); setError(null); }}>
            <Plus size={15} /> Add
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full bg-surface text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>
                ))}
                {canWrite && <th className="w-20 px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top last:border-0">
                  {columns.map((c, i) => (
                    <td key={c.key} className="px-3 py-2">
                      {cellValue(row, c.key)}
                      {i === 0 && extra?.[row.id]}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                          onClick={() => { setEditing(row); setError(null); }}
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {canDelete && (
                          <button
                            className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
                            onClick={async () => {
                              if (await confirmDialog("Delete this row?", undefined, { danger: true, confirmText: "Delete" })) {
                                const result = await deleteEntity(entityKey, row.id);
                                if (!result.ok) setError(result.error ?? "Failed");
                                else router.refresh();
                              }
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={creating || editing != null}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={creating ? "Add" : "Edit"}
        wide
      >
        {creating ? form(null) : editing ? form(editing) : null}
      </Dialog>
    </div>
  );
}
