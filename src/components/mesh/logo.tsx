import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/brand/mesh-wordmark-light.png"
        alt="Mesh"
        className="h-7 w-auto light:hidden"
      />
      <img
        src="/brand/mesh-wordmark.png"
        alt=""
        aria-hidden
        className="hidden h-7 w-auto light:block"
      />
    </span>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex", className)}>
      <img src="/brand/mesh-mark-light.png" alt="" className="h-full w-auto light:hidden" />
      <img src="/brand/mesh-mark.png" alt="" className="hidden h-full w-auto light:block" />
    </span>
  );
}
