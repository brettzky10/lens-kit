"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const toolbarBtn =
  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40";
export const toolbarIconBtn = cn(toolbarBtn, "w-8 justify-center px-0");

interface MiniMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  ariaLabel: string;
  align?: "start" | "end";
  side?: "bottom" | "top";
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

/** Dependency-free dropdown. Closes on outside click, Escape, or after picking an item. */
export function MiniMenu({
  trigger, children, ariaLabel, align = "start", side = "bottom",
  triggerClassName = toolbarBtn, menuClassName, disabled,
}: MiniMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="nodrag nopan relative">
      <button
        type="button" aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open}
        disabled={disabled} onClick={() => setOpen((o) => !o)} className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu" onClick={() => setOpen(false)}
          className={cn(
            "nowheel absolute z-[1100] max-h-72 min-w-44 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            align === "end" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuRow({
  children, onSelect, disabled, active,
}: { children: React.ReactNode; onSelect: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button" role="menuitem" disabled={disabled} onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
        active && "bg-accent/60"
      )}
    >
      {children}
    </button>
  );
}
