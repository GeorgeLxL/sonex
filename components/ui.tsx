"use client";

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ChangeEvent, useEffect, useState } from "react";
import { X, ChevronDown, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-accent text-accent-ink shadow-sm shadow-accent/25 hover:shadow-md hover:shadow-accent/35 hover:brightness-110",
    secondary: "border border-line bg-surface hover:border-accent/40 hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
    danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:brightness-110",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded px-3.5 py-2 text-sm font-medium transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Form fields ---------------- */

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("mb-1 block text-xs font-medium text-muted", className)}>{children}</label>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // className sizes the wrapper so existing w-40 / max-w-sm usages keep working.
  return (
    <span className={cn("relative block w-full", className)}>
      <select
        className="w-full cursor-pointer appearance-none rounded border border-line bg-surface py-2 pl-3 pr-8 text-sm outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

/** Pretty file picker (replaces the native "Choose File / No file chosen"). */
export function FileInput({
  name,
  accept,
  label = "Choose file",
  disabled,
  onChange,
}: {
  name?: string;
  accept?: string;
  label?: string;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded border border-dashed border-line bg-surface px-3 py-2 transition-colors hover:border-accent",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
        <Upload size={13} /> {label}
      </span>
      <span className="truncate text-xs text-muted">{fileName ?? "No file selected"}</span>
      <input
        type="file"
        name={name}
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          setFileName(e.target.files?.[0]?.name ?? null);
          onChange?.(e);
        }}
      />
    </label>
  );
}

/* ---------------- Card / Badge ---------------- */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded border border-line bg-surface p-4 shadow-sm shadow-black/[.03] transition-shadow", className)}>
      {children}
    </div>
  );
}

type BadgeTone = "default" | "accent" | "success" | "warning" | "danger";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    default: "bg-surface-2 text-muted",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Dialog ---------------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      // !m-0 defeats parent space-y-* margins that would shift the overlay.
      className="animate-overlay fixed inset-0 z-50 !m-0 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[8vh] backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "animate-dialog w-full rounded border border-line bg-surface p-5 shadow-2xl shadow-black/20",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}
