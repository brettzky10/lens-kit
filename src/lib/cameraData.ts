export interface CameraModel {
  id: string;
  name: string;
  maker: string;
  sensor: string;
  image: string;
  promptText: string;
}

// Four real digital cinema camera bodies, matching the product photos in /public/cameras.
export const CAMERAS: CameraModel[] = [
  {
    id: "red-weapon",
    name: "RED Weapon",
    maker: "RED",
    sensor: "Helium/Monstro 8K VV",
    image: "/cameras/red-weapon.png",
    promptText: "shot on a RED Weapon 8K digital cinema camera",
  },
  {
    id: "sony-venice",
    name: "Sony VENICE",
    maker: "Sony",
    sensor: "Full-frame 36 x 24mm",
    image: "/cameras/sony-venice.png",
    promptText: "shot on a Sony VENICE full-frame digital cinema camera",
  },
  {
    id: "arri-alexa-35",
    name: "ARRI Alexa 35",
    maker: "ARRI",
    sensor: "Super 35 ARRI ALEV 4",
    image: "/cameras/arri-alexa-35.png",
    promptText: "shot on an ARRI Alexa 35 Super 35 digital cinema camera",
  },
  {
    id: "arri-alexa-mini-lf",
    name: "ARRI Alexa Mini LF",
    maker: "ARRI",
    sensor: "Large Format (36.70 x 25.54mm)",
    image: "/cameras/arri-alexa-mini-lf.png",
    promptText: "shot on an ARRI Alexa Mini LF large-format digital cinema camera",
  },
  {
    id: "black-magic-pocket-6k",
    name: "Blackmagic Pocket 6k",
    maker: "Blackmagic",
    sensor: "Full frame (36 x 24mm)",
    image: "/cameras/Blackmagic-pocket-6k.png",
    promptText: "shot on an Blackmagic Pocket 6k full-frame digital cinema camera",
  },
];
