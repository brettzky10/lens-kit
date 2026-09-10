// The Video/Image/Sheet (Character/Object/Location) nodes expose two
// distinct target handles on their left edge so that "what feeds the
// prompt" and "what feeds the reference images" can be wired independently,
// with connection-level validation restricting which node kinds are
// allowed into each one.
export const PROMPT_HANDLE_ID = "prompt-in";
export const IMAGE_REFS_HANDLE_ID = "image-refs-in";

// The Video node additionally exposes a third target handle for a "start
// video" reference (e.g. flux-3's start_video field) — a single video clip
// to continue from, as opposed to the image-refs-in connector's list of
// still-image references.
export const VIDEO_REF_HANDLE_ID = "video-ref-in";

// Sheet nodes (Character/Object/Location) have two distinct *source*
// handles on their right edge — one that outputs the generated sheet
// images (to feed a downstream image-refs-in connector) and one that
// outputs the ~200-word consistency prompt (to feed a downstream
// prompt-in connector).
export const SHEET_IMAGE_OUT_ID = "sheet-image-out";
export const SHEET_PROMPT_OUT_ID = "sheet-prompt-out";

// The Shot node has two source handles — one outputting the selected shot's
// prompt description (to feed a downstream prompt-in connector) and one
// outputting the shot's video clip itself (to feed a downstream
// video-ref-in connector, i.e. a "start video" reference).
export const SHOT_PROMPT_OUT_ID = "shot-prompt-out";
export const SHOT_VIDEO_OUT_ID = "shot-video-out";

// The Video node exposes its generated video as a source handle too, so it
// can feed a downstream video-ref-in connector (e.g. the Upscale node's
// input, or another Video node's start_video).
export const VIDEO_OUT_ID = "video-out";

// Shared Tailwind classes so every connector uses the same color language
// app-wide: blue = still-image data, violet = video-clip data, near-black =
// prompt-type data.
export const PROMPT_HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-zinc-300 !bg-zinc-900";
export const IMAGE_HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-background !bg-sky-400";
export const VIDEO_REF_HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-background !bg-violet-400";
