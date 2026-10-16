export interface ShotDefinition {
  id: string;
  name: string;
  // Path under /public/shots/ — you'll need to add these video files
  // yourself; see public/shots/README.txt.
  videoUrl: string;
  category?:string;
  prompt: string;
}

export const SHOTS: ShotDefinition[] = [
  {
    id: "drone-push-in",
    name: "Drone Push In",
    category: "aerial",
    videoUrl: "/shots/26-drone-push-in-hq.mp4",
    prompt:
      "Camera: drone push in. Movement: fly smoothly forward through open space toward the subject or destination. Speed: controlled aerial glide. Framing: keep the route and destination readable as the camera approaches. End: arrive at a closer aerial composition.",
  },
  {
    id: "helicopter-shot",
    name: "Helicopter Shot",
    category: "aerial",
    videoUrl: "/shots/27-helicopter-shot-hq.mp4",
    prompt:
      "Camera: helicopter-style aerial shot. Movement: move from high altitude along a broad gradual flight path. Speed: steady controlled aerial motion. Framing: keep the landscape or distant moving subject readable at wide scale. End: finish on a stable high-altitude composition.",
  },
  {
    id: "first-person-view",
    name: "First-person View",
    category: "action",
    videoUrl: "/shots/s1-first-person-view-hq.mp4",
    prompt:
      "Camera: first-person view. Movement: move forward at human eye height from the character's perspective. Speed: natural walking or reaching pace. Framing: use visible hands, arms or body edges as the viewer's physical reference. End: arrive at the next point of action from the same point of view.",
  },
  {
    id: "drone-pull-back",
    name: "Drone-pull-back",
    category: "aerial",
    videoUrl: "/shots/26b-drone-pull-back-hq.mp4",
    prompt:
      "Camera: drone pull back. Movement: fly smoothly backward away from the subject or destination. Speed: controlled aerial retreat. Framing: keep the subject readable as more landscape appears. End: finish on a wider aerial composition.",
  },
  {
    id: "Chase-shot",
    name: "Chase-shot",
    category: "aerial",
    videoUrl: "/shots/22-chase-shot-hq.mp4",
    prompt:
      "Camera: chase shot. Movement: follow a moving subject quickly along the action route. Speed: fast, reactive and physically close. Framing: keep the subject visible while allowing energetic reframing. End: stay connected to the subject in motion.",
  },
  {
    id: "Vehicle-tracking",
    name: "Vehicle-tracking",
    category: "ground",
    videoUrl: "/shots/21-vehicle-tracking-hq.mp4",
    prompt:
      "Camera: vehicle tracking shot. Movement: move with the vehicle along its route. Speed: match the vehicle's pace. Framing: keep the vehicle stable in frame while the road or environment moves past. End: maintain a clear moving vehicle composition.",
  },
  {
    id: "Vehicle-chase",
    name: "Vehicle-chase",
    category: "aerial",
    videoUrl: "/shots/car-chase.mp4",
    prompt:
      "Camera: vehicle tracking shot. Movement: move with the vehicle along its route and have the camera chase down and catch up to the fast vehicle. Speed: match the vehicle's pace. Framing: keep the vehicle stable in frame and chaser down the car with an aerial shot. End: maintain a clear moving vehicle composition.",
  },
];
