// The Video/Image/Character nodes expose two distinct target handles on
// their left edge so that "what feeds the prompt" and "what feeds the
// reference images" can be wired independently, with connection-level
// validation restricting which node kinds are allowed into each one.
export const PROMPT_HANDLE_ID = "prompt-in";
export const IMAGE_REFS_HANDLE_ID = "image-refs-in";


// Sheet nodes (Character/Object/Location) have two distinct *source*
// handles on their right edge — one that outputs the generated sheet
// images (to feed a downstream image-refs-in connector) and one that
// outputs the ~200-word consistency prompt (to feed a downstream
// prompt-in connector).
export const SHEET_IMAGE_OUT_ID = "sheet-image-out";
export const SHEET_PROMPT_OUT_ID = "sheet-prompt-out";


// Shared Tailwind classes so every connector uses the same color language
// app-wide: blue = image-type data, near-black = prompt-type data.
export const PROMPT_HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-zinc-300 !bg-zinc-900";
export const IMAGE_HANDLE_CLASS =
  "!h-3 !w-3 !border-2 !border-background !bg-sky-400";



// The Character node has two distinct *source* handles on its right edge —
// one that outputs its generated character-sheet images (to feed a
// downstream image-refs-in connector) and one that outputs its ~200-word
// consistency prompt (to feed a downstream prompt-in connector).
export const CHARACTER_IMAGE_OUT_ID = "character-image-out";
export const CHARACTER_PROMPT_OUT_ID = "character-prompt-out";

export const REFERENCE_IMAGE_OUT_ID = "reference-image-out";