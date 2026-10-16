"use client";

import { useState } from "react";
import { AppMode } from "@/lib/shot/types";
import ShotPlanner from "./ShotPlanner";
import VideoPlanner from "./VideoPlanner";

export default function AppRoot() {
  const [mode, setMode] = useState<AppMode>("image");

  return (
    <div className="app-root">
      <header className="mode-bar">
        <span className="mode-bar-title">Shot Planner</span>
        <div className="mode-switch" role="tablist" aria-label="Mode">
          <button
            role="tab"
            aria-selected={mode === "image"}
            className={`mode-btn${mode === "image" ? " active" : ""}`}
            onClick={() => setMode("image")}
          >
            Image
          </button>
          <button
            role="tab"
            aria-selected={mode === "video"}
            className={`mode-btn${mode === "video" ? " active" : ""}`}
            onClick={() => setMode("video")}
          >
            Video
          </button>
        </div>
      </header>
      <div className="mode-body">{mode === "image" ? <ShotPlanner /> : <VideoPlanner />}</div>
    </div>
  );
}
