"use client";

import { ShotAnalysis } from "@/lib/shot/types";
import { describeShot } from "@/lib/shot/shotMath";
import { panelClass, panelTitleClass } from "@/lib/shot/ui";

export default function ShotInfoPanel({ analysis }: { analysis: ShotAnalysis }) {
  const description = describeShot(analysis);

  return (
    <section className={panelClass}>
      <h2 className={panelTitleClass}>Shot description</h2>
      <pre className="mb-3 whitespace-pre-wrap rounded-md border border-border bg-input p-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">
        {description}
      </pre>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Metric label="Screen pos (x,y)" value={`${analysis.screenX.toFixed(2)}, ${analysis.screenY.toFixed(2)}`} />
        <Metric label="Vertical tilt" value={`${analysis.verticalTilt.toFixed(1)}°`} />
        <Metric label="Angular size" value={`${analysis.subjectAngularSizeDeg.toFixed(1)}°`} />
        <Metric label="Frame fraction" value={`${(analysis.frameFraction * 100).toFixed(0)}%`} />
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-1.5">
      <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-[13px] text-foreground">{value}</dd>
    </div>
  );
}
