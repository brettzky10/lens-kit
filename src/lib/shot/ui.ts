export const panelClass =
  "rounded-xl border border-border/60 bg-panel2/70 p-4 shadow-panel backdrop-blur-sm";

export const panelTitleClass =
  "mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500";

export const fieldLabelClass =
  "whitespace-nowrap text-[11px] uppercase tracking-wide text-neutral-500";

export const inputClass =
  "w-full min-w-0 rounded-md border border-border/70 bg-field px-2.5 py-1.5 text-[13px] text-neutral-100 outline-none transition focus:border-accent-dim focus:ring-1 focus:ring-accent-dim/60 " +
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const btnBase =
  "rounded-md border px-3 py-1.5 text-[12.5px] leading-none transition disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost = `${btnBase} border-border/70 bg-field text-neutral-200 hover:border-accent-dim hover:text-white`;

export const btnPrimary = `${btnBase} border-accent bg-accent text-black font-semibold hover:bg-accent-bright hover:border-accent-bright`;

export const btnDanger = `${btnBase} border-border/70 bg-field text-danger hover:border-danger/60`;

export const jsonBlockClass =
  "max-h-64 overflow-auto rounded-md border border-border-soft bg-field p-3 font-mono text-[11.5px] leading-relaxed text-neutral-300";

export const mutedNoteClass = "text-[12px] leading-relaxed text-neutral-500";

// Fully custom track + thumb — `appearance-none` drops native styling
// entirely, so both webkit and moz pseudo-elements need explicit looks or
// the browser falls back to an unstyled (often stark white) default thumb.
export const sliderClass =
  "block h-4 w-full cursor-pointer appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border-soft " +
  "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-panel2 [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border-soft " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-panel2";

export const checkboxClass =
  "h-3.5 w-3.5 shrink-0 cursor-pointer appearance-none rounded border border-border/80 bg-field " +
  "checked:border-accent checked:bg-accent transition-colors";
