"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useFilterGrid, type FilterDefinition } from "@/components/ui/filter-grid";
import { SHOTS, type ShotDefinition, type ShotCategory } from "@/lib/shots";

const CELL = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;
const MOVE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const EASE = [0.23, 1, 0.32, 1] as const;
const LEAVE = { duration: 0.14, ease: [0.4, 0, 1, 1] } as const;
const INSTANT = { duration: 0 } as const;

const FILTERS: FilterDefinition<ShotDefinition>[] = [
  { id: "all", label: "All", match: () => true },
  { id: "aerial", label: "Aerial", match: (s) => s.category === "aerial" },
  { id: "ground", label: "Ground / POV", match: (s) => s.category === "ground" },
  { id: "action", label: "Action", match: (s) => s.category === "action" },
];

// ---------------------------------------------------------------------------
// Core grid: filter chips + a responsive, scrollable list of video cards.
// Reusable on its own (drop it in a popover, a page, a sidebar...) or hosted
// inside <ShotPickerDialog /> below.
// ---------------------------------------------------------------------------

export function ShotFilterGrid({
  value,
  onSelect,
}: {
  value?: string;
  onSelect?: (shot: ShotDefinition) => void;
}) {
  const reduced = useReducedMotion();
  const [internalActive, setInternalActive] = useState<string | null>(value ?? null);

  const { active, select, visible, counts, total } = useFilterGrid({
    items: SHOTS,
    filters: FILTERS,
    // filter tab state is separate from "which shot is selected"
  });

  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, FILTERS.findIndex((f) => f.id === active));

  const go = (i: number) => {
    const next = FILTERS[(i + FILTERS.length) % FILTERS.length];
    if (!next) return;
    chips.current[(i + FILTERS.length) % FILTERS.length]?.focus();
    select(next.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(FILTERS.length - 1);
    }
  };

  const swap = reduced ? INSTANT : CELL;
  const step = reduced ? INSTANT : { layout: MOVE, duration: 0.2, ease: EASE };
  const leave = reduced ? INSTANT : LEAVE;

  const pick = (shot: ShotDefinition) => {
    setInternalActive(shot.id);
    onSelect?.(shot);
  };

  const selectedId = value ?? internalActive;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Filter chips — wrap responsively, stay put above the scroll area */}
      <div
        role="radiogroup"
        aria-label="Shot category"
        className="flex flex-shrink-0 flex-wrap items-center gap-1.5 px-4 pt-4 sm:px-6"
      >
        {FILTERS.map((filter, i) => {
          const on = i === index;
          return (
            <button
              key={filter.id}
              ref={(node) => {
                chips.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => select(filter.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="group relative inline-grid h-8 select-none place-items-center rounded-[6px] px-3 outline-none focus-visible:shadow-[0_1px_3px_rgba(28,25,23,0.18)] dark:focus-visible:shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
              style={{ touchAction: "manipulation" }}
            >
              {on ? (
                <motion.span
                  aria-hidden
                  layoutId={reduced ? undefined : "shot-filter-thumb"}
                  transition={CELL}
                  className="absolute inset-0 rounded-[6px] bg-stone-800 dark:bg-stone-100"
                />
              ) : null}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 rounded-[6px] border group-focus-visible:border-[#4568FF] dark:group-focus-visible:border-[#93B0FF] ${
                  on ? "border-transparent" : "border-stone-200 dark:border-white/[0.16]"
                }`}
              />
              <span className="relative col-start-1 row-start-1 inline-grid">
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ opacity: on ? 0 : 1 }}
                  transition={swap}
                  className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-stone-700 dark:text-stone-200"
                >
                  {filter.label}
                  <span className="text-[10.5px] tabular-nums text-stone-500 dark:text-stone-400">
                    {counts[filter.id]}
                  </span>
                </motion.span>
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ opacity: on ? 1 : 0 }}
                  transition={swap}
                  className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-stone-50 dark:text-stone-900"
                >
                  {filter.label}
                  <span className="text-[10.5px] tabular-nums opacity-70">
                    {counts[filter.id]}
                  </span>
                </motion.span>
                <span className="sr-only">
                  {filter.label}, {counts[filter.id]} of {total}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable, breakpoint-aware video grid */}
      <div className="relative mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6">
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((shot) => (
              <motion.li
                key={shot.id}
                layout={reduced ? false : "position"}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, transition: leave }}
                transition={step}
                className="min-w-0"
              >
                <ShotCard
                  shot={shot}
                  selected={shot.id === selectedId}
                  onSelect={() => pick(shot)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <AnimatePresence initial={false}>
          {visible.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: leave }}
              transition={reduced ? INSTANT : { duration: 0.2, ease: EASE }}
              className="grid place-items-center py-16"
            >
              <span className="text-[12.5px] text-stone-500 dark:text-stone-400">
                Nothing matches this filter
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// A single "watchable" video card: 16:9, hover (or focus) to preview-play,
// pauses and resets when the pointer leaves so the grid stays light.
function ShotCard({
  shot,
  selected,
  onSelect,
}: {
  shot: ShotDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  };

  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[14px] border bg-white text-left shadow-[0_1px_2px_rgba(28,25,23,0.06),0_4px_10px_-8px_rgba(28,25,23,0.45)] outline-none transition-colors dark:bg-[#1D1D1A] dark:shadow-[0_1px_6px_rgba(0,0,0,0.45)] ${
        selected
          ? "border-stone-800 dark:border-stone-100"
          : "border-stone-200 hover:border-stone-300 dark:border-white/[0.16] dark:hover:border-white/[0.28]"
      } focus-visible:border-[#4568FF] dark:focus-visible:border-[#93B0FF]`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-stone-100 dark:bg-black/40">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        >
          <source src={shot.videoUrl} type="video/mp4" />
        </video>

        {selected && (
          <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.6 3.6 6.7-6.7a1 1 0 0 1 1.4 0Z" />
            </svg>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 p-2.5 sm:p-3">
        <p className="truncate text-[12.5px] font-medium text-stone-700 dark:text-stone-200">
          {shot.name}
        </p>
        <p className="line-clamp-2 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
          {shot.prompt}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dialog wrapper. Sizes itself per breakpoint and caps its own height so the
// filter row stays fixed while only the card grid scrolls.
// ---------------------------------------------------------------------------

export function ShotPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onSelect?: (shot: ShotDefinition) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:h-[80vh]">
        <DialogHeader className="flex-shrink-0 border-b border-stone-200 px-4 pb-3 pt-4 dark:border-white/[0.12] sm:px-6">
          <DialogTitle className="text-[15px]">Choose a camera move</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Hover any card to preview it. Pick a shot to use its prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <ShotFilterGrid
            value={value}
            onSelect={(shot) => {
              onSelect?.(shot);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
