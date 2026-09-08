// Selector option lists for the Video node's Replicate (black-forest-labs/flux-3)
// call. Matches the model's actual published input schema.
export const VIDEO_DURATIONS = [
  "auto",
  "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15",
  "16", "17", "18", "19", "20",
] as const;
export const VIDEO_RESOLUTIONS = ["720p", "1080p"] as const;
export const VIDEO_ASPECT_RATIOS = ["auto", "21:9", "2:1", "16:9", "4:3", "1:1", "3:4", "9:16"] as const;

export const DEFAULT_VIDEO_DURATION = "auto";
export const DEFAULT_VIDEO_RESOLUTION = "720p";
export const DEFAULT_VIDEO_ASPECT_RATIO = "auto";
