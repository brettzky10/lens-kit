"use client";

import * as React from "react";
import { FileText, Camera, Aperture, ImageIcon, Film, User, ImageDown, Box, Mountain, ImagePlus } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { NODE_TYPE_META, type FlowNodeType } from "@/lib/types";

const ICONS: Record<FlowNodeType, React.ElementType> = {
  prompt: FileText,
  camera: Camera,
  lens: Aperture,
  image: ImageIcon,
  video: Film,
  character: User,
  object: Box,
  location: Mountain,
  reference: ImagePlus
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
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
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
