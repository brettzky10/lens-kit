"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  User, Box, Trash2, Plus, Check, Eye, EyeOff,
  Box as CubeIcon, Circle, Cylinder, Square, Triangle, Donut,
} from "lucide-react";
import { usePrevisStore, type ProxyKind } from "@/lib/usePrevisStore";

const ADD_OPTIONS: { kind: ProxyKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: "character", label: "Character", icon: User },
  { kind: "set", label: "Set Piece", icon: Box },
  { kind: "cube", label: "Cube", icon: CubeIcon },
  { kind: "sphere", label: "Sphere", icon: Circle },
  { kind: "cylinder", label: "Cylinder", icon: Cylinder },
  { kind: "plane", label: "Plane", icon: Square },
  { kind: "cone", label: "Cone", icon: Triangle },
  { kind: "torus", label: "Torus", icon: Donut },
];

/**
 * Scene Outliner — left sidebar listing all scene proxies.
 * Click to select, double-click to rename, eye to hide/show, trash to delete.
 */
export function PrevisOutliner() {
  const proxies = usePrevisStore((s) => s.proxies);
  const selectedProxyId = usePrevisStore((s) => s.selectedProxyId);
  const selectProxy = usePrevisStore((s) => s.selectProxy);
  const addProxy = usePrevisStore((s) => s.addProxy);
  const removeProxy = usePrevisStore((s) => s.removeProxy);
  const renameProxy = usePrevisStore((s) => s.renameProxy);
  const toggleProxyVisibility = usePrevisStore((s) => s.toggleProxyVisibility);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      renameProxy(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel/50">
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-studio-border shrink-0">
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] text-studio-muted/60 uppercase tracking-wider font-semibold cursor-help"
            title="Double-click an item to rename · Drag in 3D to move"
          >
            Scene
          </span>
          <AddObjectMenu onAdd={addProxy} />
        </div>
      </div>

      {/* Proxy list */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {proxies.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 px-2">
            <Box className="w-5 h-5 text-studio-muted/20" />
            <p className="text-[10px] text-studio-muted/40 text-center">No objects in scene</p>
            <p className="text-[9px] text-studio-muted/30 text-center">Click <span className="text-golf">Add</span> to insert</p>
          </div>
        )}
        {proxies.map((p) => {
          const isSelected = selectedProxyId === p.id;
          const isEditing = editingId === p.id;
          const isHidden = p.visible === false;
          const Icon = ADD_OPTIONS.find((o) => o.kind === p.kind)?.icon ?? Box;
          return (
            <div
              key={p.id}
              onClick={() => selectProxy(p.id)}
              onDoubleClick={() => startEdit(p.id, p.label)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-golf/15 border-l-2 border-golf"
                  : "hover:bg-studio-panelHover border-l-2 border-transparent"
              } ${isHidden ? "opacity-40" : ""}`}
            >
              {/* Color swatch */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <Icon className="w-3 h-3 text-studio-muted shrink-0" />

              {/* Label (or rename input) */}
              {isEditing ? (
                <div className="flex items-center gap-0.5 flex-1 min-w-0">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={commitEdit}
                    className="flex-1 min-w-0 px-1 py-0.5 bg-studio-bg border border-golf/40 rounded text-[10px] text-studio-text focus:outline-none"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); commitEdit(); }}
                    className="p-0.5 rounded hover:bg-studio-panelHover text-studio-success"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <span
                  className={`flex-1 min-w-0 truncate text-[11px] ${
                    isSelected ? "text-studio-text font-medium" : "text-studio-muted"
                  }`}
                  title={p.label}
                >
                  {p.label}
                </span>
              )}

              {/* Visibility toggle — always visible so hidden state is obvious at a glance */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProxyVisibility(p.id);
                  }}
                  className={`p-0.5 rounded transition-colors shrink-0 ${
                    isHidden
                      ? "text-studio-muted/50 hover:text-studio-text"
                      : "text-studio-muted/70 hover:text-golf"
                  }`}
                  title={isHidden ? "Show object" : "Hide object"}
                >
                  {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                </button>
              )}

              {/* Delete (visible on hover) */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProxy(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-studio-danger/20 text-studio-muted hover:text-studio-danger transition-all shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Add object" trigger + dropdown.
 *
 * The dropdown is rendered through a portal into document.body with a
 * `fixed` position computed from the trigger button's own bounding box,
 * instead of `absolute` inside the outliner panel. An absolutely-positioned
 * dropdown is at the mercy of every ancestor between it and the page root —
 * an `overflow-hidden` panel, a parent stacking context from a transform or
 * a lower z-index elsewhere in a bigger app can all make it render clipped
 * or underneath other content. Portaling it to the body and positioning it
 * with viewport coordinates sidesteps all of that (the same approach
 * shadcn/Radix popovers use under the hood).
 */
function AddObjectMenu({ onAdd }: { onAdd: (kind: ProxyKind) => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 4, left: rect.right - 128 });
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);

  // Close on scroll/resize (of anything) so the menu never drifts away from
  // the button it's anchored to.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const handleAdd = (kind: ProxyKind) => {
    onAdd(kind);
    setOpen(false);
  };

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-golf/15 hover:bg-golf/25 text-golf transition-colors"
        title="Add object"
      >
        <Plus className="w-2.5 h-2.5" />
        <span className="hidden md:inline">Add</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Click-away overlay */}
            <div className="fixed inset-0 z-[999]" onClick={close} />
            <div
              className="fixed z-[1000] w-32 bg-studio-panel border border-studio-border rounded-md shadow-xl shadow-black/40 py-1"
              style={{ top: coords.top, left: coords.left }}
            >
              {ADD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.kind}
                    onClick={() => handleAdd(opt.kind)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-[10px] text-studio-muted hover:text-studio-text hover:bg-studio-panelHover transition-colors"
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
