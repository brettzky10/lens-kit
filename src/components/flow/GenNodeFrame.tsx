"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  modelLabel?: string;
  selected?: boolean;
  width?: string;
  handles: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared look for Image / Video / Prompt nodes: small label row above a rounded card, floating toolbar below. */
export default function GenNodeFrame({
  icon: Icon, title, modelLabel, selected, width = "w-[460px]", handles, toolbar, children,
}: Props) {
  return (
    <div className={cn("relative", width)}>
      <div className="absolute inset-x-1 -top-6 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{title}</span>
        {modelLabel && <span>{modelLabel}</span>}
      </div>
      {handles}
      <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-lg", selected ? "border-primary" : "border-border")}>
        {children}
      </div>
      {toolbar}
    </div>
  );
}
