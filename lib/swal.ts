"use client";

import Swal from "sweetalert2";

/**
 * SweetAlert2 themed with our CSS variable tokens — colors resolve at
 * display time, so dialogs follow the current dark/light theme.
 */
const base = Swal.mixin({
  background: "rgb(var(--surface))",
  color: "rgb(var(--ink))",
  confirmButtonColor: "rgb(var(--accent))",
  cancelButtonColor: "rgb(var(--surface-2))",
  customClass: {
    popup: "rounded border border-line text-sm",
    confirmButton: "rounded px-4 py-2 text-sm font-medium",
    cancelButton: "rounded px-4 py-2 text-sm font-medium !text-ink",
  },
});

/** Yes/No confirmation. Returns true when confirmed. */
export async function confirmDialog(
  title: string,
  text?: string,
  opts?: { danger?: boolean; confirmText?: string },
): Promise<boolean> {
  const result = await base.fire({
    title,
    text,
    icon: opts?.danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: opts?.confirmText ?? "Yes",
    cancelButtonText: "Cancel",
    ...(opts?.danger ? { confirmButtonColor: "rgb(var(--danger))" } : {}),
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Text input dialog. Returns the string (may be empty), or null on cancel. */
export async function promptText(
  title: string,
  placeholder?: string,
): Promise<string | null> {
  const result = await base.fire({
    title,
    input: "text",
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: "OK",
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });
  return result.isConfirmed ? ((result.value as string) ?? "") : null;
}

/** Informational dialog (alert replacement). */
export function alertInfo(title: string, text?: string) {
  void base.fire({ title, text, icon: "info" });
}
