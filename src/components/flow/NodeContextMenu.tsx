"use client";

import * as React from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { NODE_TYPE_META, type FlowNodeType } from "@/lib/types";
import {
  FileText, Camera, Aperture, ImageIcon, Film, User, Box, Mountain,
  ImagePlus, Clapperboard, ArrowUpCircle, Palette,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<FlowNodeType, LucideIcon> = {
  prompt: FileText,
  camera: Camera,
  lens: Aperture,
  image: ImageIcon,
  video: Film,
  character: User,
  object: Box,
  location: Mountain,
  reference: ImagePlus,
  shot: Clapperboard,
  lut: Palette,
  upscale: ArrowUpCircle,
};

interface NodeContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: FlowNodeType) => void;
  onClose: () => void;
}

export default function NodeContextMenu({ x, y, onSelect, onClose }: NodeContextMenuProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Capture phase matters here: React Flow's pane has its own mousedown
    // handling for panning/selection that can stopPropagation() during the
    // bubble phase, which would otherwise stop this listener from ever
    // seeing clicks that land on the canvas.
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: x, top: y, zIndex: 50 }}
      className="w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
    >
      <Command>
        <CommandInput placeholder="Add a node..." autoFocus />
        <CommandList>
          <CommandEmpty>No node type found.</CommandEmpty>
          <CommandGroup heading="Nodes">
            {(Object.keys(NODE_TYPE_META) as FlowNodeType[]).map((type) => {
              const Icon = ICONS[type];
              const meta = NODE_TYPE_META[type];
              return (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => {
                    onSelect(type);
                    onClose();
                  }}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm">{meta.label}</span>
                    <span className="text-[11px] text-muted-foreground">{meta.description}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
