"use client";

import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function PromptPreview({
  prompt,
  placeholder,
  label = "Prompt sent to API",
}: {
  prompt: string;
  placeholder: string;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
          title={prompt || placeholder}
          disabled={!prompt}
          className={cn(
            "nodrag mb-2 block w-full rounded-md bg-secondary/40 p-2 text-left transition-colors",
            prompt && "hover:bg-secondary/70"
          )}>
        
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            {prompt && (
              <span className="text-[9px] text-muted-foreground/70">click to expand</span>
            )}
          </div>
          <div className="line-clamp-2 text-[11px] leading-relaxed text-foreground/90">
            {prompt || <span className="text-muted-foreground">{placeholder}</span>}
          </div>
        
      </PopoverTrigger>
      {prompt && (
        <PopoverContent side="top" align="start" className="nodrag w-80 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label === "Prompt sent to API" ? "Full prompt" : label}
          </div>
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground">
            {prompt}
          </p>
        </PopoverContent>
      )}
    </Popover>
  );
}
