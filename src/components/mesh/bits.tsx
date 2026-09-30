import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg",
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const letter = name.trim().charAt(0).toUpperCase() || "M";
  if (src) {
    return <img src={src} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-medium text-fg",
        className,
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none transition placeholder:text-faint focus-visible:border-faint";
