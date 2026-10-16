"use client";

import dynamic from "next/dynamic";

// Three.js / react-three-fiber touch the DOM (canvas, document) as soon as
// the module evaluates, so this must never run during SSR/prerendering.
const PrevisStage = dynamic(
  () => import("@/components/previs/PrevisStage").then((m) => m.PrevisStage),
  { ssr: false, loading: () => <StageLoading /> },
);

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <PrevisStage />
    </main>
  );
}

function StageLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-studio-bg text-studio-muted text-sm">
      Loading previs stage…
    </div>
  );
}
