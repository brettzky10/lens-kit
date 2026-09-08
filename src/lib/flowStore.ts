"use client";

import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { v4 as uuid } from "uuid";
import type { AnyNodeData, FlowNodeType } from "./types";
import { PROMPT_HANDLE_ID } from "./handleIds";
import {
  DEFAULT_VIDEO_DURATION,
  DEFAULT_VIDEO_RESOLUTION,
  DEFAULT_VIDEO_ASPECT_RATIO,
} from "./videoOptions";
import { DEFAULT_IMAGE_PROVIDER, DEFAULT_VIDEO_PROVIDER } from "./providerOptions";

type FlowNode = Node<AnyNodeData>;

interface FlowState {
  flowName: string;
  nodes: FlowNode[];
  edges: Edge[];
  activeSetupNodeId: string | null;
  openSetupPanel: (id: string) => void;
  closeSetupPanel: () => void;
  setFlowName: (name: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: FlowNodeType, position: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<AnyNodeData>) => void;
  removeEdge: (id: string) => void;
  removeNode: (id: string) => void;
  exportFlow: () => string;
  importFlow: (json: string) => void;
  resetFlow: () => void;
}

function defaultDataFor(type: FlowNodeType): AnyNodeData {
  switch (type) {
    case "prompt":
      return { kind: "prompt", text: "" };
    case "camera":
      return { kind: "camera", cameraId: "arri-alexa-mini-lf" };
    case "lens":
      return { kind: "lens", lensId: "cooke-5i", focalLength: 35, aperture: "f/2.8" };
    case "image":
      return { kind: "image", prompt: "", status: "idle", progress: 0, provider: DEFAULT_IMAGE_PROVIDER };
    case "video":
      return {
        kind: "video",
        prompt: "",
        status: "idle",
        progress: 0,
        duration: DEFAULT_VIDEO_DURATION,
        resolution: DEFAULT_VIDEO_RESOLUTION,
        aspectRatio: DEFAULT_VIDEO_ASPECT_RATIO,
        provider: DEFAULT_VIDEO_PROVIDER,
      };
    case "character":
    case "object":
    case "location":
      return {
        kind: type,
        status: "idle",
        progress: 0,
        sheetImage: undefined,
        outputPrompt: "",
        provider: DEFAULT_IMAGE_PROVIDER,
      };
    case "reference":
      return { kind: "reference" };
  }
}

const initialNodes: FlowNode[] = [
  {
    id: "prompt-1",
    type: "prompt",
    position: { x: 60, y: 200 },
    data: {
      kind: "prompt",
      text: "A retro turquoise speedboat cutting across the Mediterranean coastline at golden hour, cinematic and moody.",
    },
  },
  {
    id: "camera-1",
    type: "camera",
    position: { x: 460, y: 80 },
    data: { kind: "camera", cameraId: "sony-venice" },
  },
  {
    id: "lens-1",
    type: "lens",
    position: { x: 460, y: 320 },
    data: { kind: "lens", lensId: "cooke-5i", focalLength: 35, aperture: "f/2.8" },
  },
  {
    id: "image-1",
    type: "image",
    position: { x: 860, y: 200 },
    data: { kind: "image", prompt: "", status: "idle", progress: 0, provider: DEFAULT_IMAGE_PROVIDER },
  },
];

const initialEdges: Edge[] = [
  { id: "e-prompt-camera", source: "prompt-1", target: "camera-1" },
  { id: "e-prompt-lens", source: "prompt-1", target: "lens-1" },
  { id: "e-camera-image", source: "camera-1", target: "image-1", targetHandle: PROMPT_HANDLE_ID },
  { id: "e-lens-image", source: "lens-1", target: "image-1", targetHandle: PROMPT_HANDLE_ID },
];

export const useFlowStore = create<FlowState>((set, get) => ({
  flowName: "Untitled Flow",
  nodes: initialNodes,
  edges: initialEdges,
  activeSetupNodeId: null,

  openSetupPanel: (id) => set({ activeSetupNodeId: id }),
  closeSetupPanel: () => set({ activeSetupNodeId: null }),

  setFlowName: (name) => set({ flowName: name }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as FlowNode[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({
      edges: addEdge(
        { ...connection, id: uuid(), type: "removable" },
        get().edges
      ),
    }),

  addNode: (type, position) => {
    const id = `${type}-${uuid().slice(0, 8)}`;
    const newNode: FlowNode = {
      id,
      type,
      position,
      data: defaultDataFor(type),
    };
    set({ nodes: [...get().nodes, newNode] });
    return id;
  },

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as AnyNodeData } : n
      ),
    }),

  removeEdge: (id) =>
    set({ edges: get().edges.filter((e) => e.id !== id) }),

  removeNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    }),

  exportFlow: () => {
    const { flowName, nodes, edges } = get();
    return JSON.stringify({ flowName, nodes, edges }, null, 2);
  },

  importFlow: (json) => {
    try {
      const parsed = JSON.parse(json);
      set({
        flowName: parsed.flowName ?? "Imported Flow",
        nodes: parsed.nodes ?? [],
        edges: parsed.edges ?? [],
      });
    } catch (e) {
      console.error("Failed to import flow JSON", e);
    }
  },

  resetFlow: () => set({ flowName: "Untitled Flow", nodes: [], edges: [] }),
}));
