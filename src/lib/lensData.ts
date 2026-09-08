export interface LensModel {
  id: string;
  name: string;
  maker: string;
  image: string;
  maxAperture: string; // native max aperture (T-stop), informational
  promptText: (focalLength: number) => string;
}

// Shared focal-length step list used across the lens picker, as requested:
// 18 / 24 / 35 / 50 / 65 / 85 / 135mm — the classic cine prime "full set" spacing.
export const FOCAL_LENGTHS: number[] = [18, 24, 35, 50, 65, 85, 135];

// Standard full-stop aperture range from f/1.8 to f/11
export const APERTURES: string[] = ["f/1.8", "f/2", "f/2.8", "f/4", "f/5.6", "f/8", "f/11"];

// Real cinema lens lines, matching the product photos in /public/lenses.
export const LENSES: LensModel[] = [
  {
    id: "cooke-5i",
    name: "Cooke 5/i",
    maker: "Cooke Optics",
    image: "/lenses/cooke-5i.png",
    maxAperture: "T1.4 / T2",
    promptText: (fl) =>
      `captured with a Cooke 5/i ${fl}mm prime lens, signature Cooke Look warm highlight falloff`,
  },
  {
    id: "sigma-classic",
    name: "Sigma Classic Prime",
    maker: "Sigma",
    image: "/lenses/sigma-classic.png",
    maxAperture: "T2 / T3.2",
    promptText: (fl) =>
      `captured with a Sigma Classic ${fl}mm prime lens, vintage-inspired lower-contrast rendering`,
  },
  {
    id: "leica-summilux-c",
    name: "Leica Summilux-C",
    maker: "Leica",
    image: "/lenses/leica-summilux-c.png",
    maxAperture: "T1.4",
    promptText: (fl) =>
      `captured with a Leica Summilux-C ${fl}mm lens, silky bokeh and neutral Leica color science`,
  },
  {
    id: "arri-zeiss-ultra-prime",
    name: "ARRI/Zeiss Ultra Prime",
    maker: "Carl Zeiss",
    image: "/lenses/arri-zeiss-ultra-prime.png",
    maxAperture: "T1.9",
    promptText: (fl) =>
      `captured with a Zeiss Ultra Prime ${fl}mm lens, sharp and clinical modern optical rendering`,
  },
  {
    id: "arri-zeiss-master-prime",
    name: "ARRI/Zeiss Master Prime",
    maker: "Carl Zeiss",
    image: "/lenses/arri-zeiss-master-prime.png",
    maxAperture: "T1.3",
    promptText: (fl) =>
      `captured with a Zeiss Master Prime ${fl}mm lens, extremely sharp with very low distortion and breathing`,
  },
  {
    id: "hawk-v-lite",
    name: "Vantage Hawk V-Lite",
    maker: "Vantage Film",
    image: "/lenses/hawk-v-lite.png",
    maxAperture: "T2.2",
    promptText: (fl) =>
      `captured with a Hawk V-Lite ${fl}mm anamorphic lens, oval bokeh and gentle horizontal flares`,
  },
  {
    id: "zeiss-master-anamorphic",
    name: "Zeiss Master Anamorphic",
    maker: "Carl Zeiss",
    image: "/lenses/zeiss-master-anamorphic.png",
    maxAperture: "T1.9",
    promptText: (fl) =>
      `captured with a Zeiss Master Anamorphic ${fl}mm 2x lens, classic scope aspect with blue horizontal flares`,
  },
  {
    id: "cooke-anamorphic-i",
    name: "Cooke Anamorphic/i",
    maker: "Cooke Optics",
    image: "/lenses/cooke-anamorphic-i.png",
    maxAperture: "T2.3",
    promptText: (fl) =>
      `captured with a Cooke Anamorphic/i ${fl}mm 2x lens, warm Cooke Look with soft anamorphic falloff`,
  },
  {
    id: "canon-k35",
    name: "Canon K35",
    maker: "Canon",
    image: "/lenses/canon-k35.png",
    maxAperture: "T1.6",
    promptText: (fl) =>
      `captured with a vintage Canon K35 ${fl}mm lens, dreamy low-contrast 1970s film look with soft flaring`,
  },
  {
    id: "fujinon-premista",
    name: "Fujinon Premista",
    maker: "Fujifilm",
    image: "/lenses/fujinon-premista.png",
    maxAperture: "T2.9",
    promptText: (fl) =>
      `captured with a Fujinon Premista zoom set to ${fl}mm, smooth filmic contrast with minimal breathing`,
  },
  {
    id: "rokinon-prime",
    name: "Rokinon Prime",
    maker: "Rokinon",
    image: "/lenses/rokinon-prime.png",
    maxAperture: "T2.0",
    promptText: (fl) =>
      `captured with a Rokinon prime cine lens set to ${fl}mm, smooth filmic contrast with minimal breathing`,
  },
  {
    id: "laowa-probe",
    name: "Laowa Macro Probe",
    maker: "Venus Optics",
    image: "/lenses/laowa-probe.png",
    maxAperture: "T14 (fixed)",
    promptText: (fl) =>
      `captured with a Laowa 24mm macro probe lens, extreme close-up periscope perspective with deep focus`,
  },
];
