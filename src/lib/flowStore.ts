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
import { DEFAULT_IMAGE_PROVIDER, DEFAULT_IMAGE_NODE_PROVIDER, DEFAULT_VIDEO_PROVIDER } from "./providerOptions";
import {
  DEFAULT_IMAGE_ASPECT_BY_PROVIDER,
  DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER,
  normalizeImageSettings,
} from "./imageOptions";
import { normalizeVideoSettings, VIDEO_SUPPORTS_AUDIO } from "./videoOptions";
import { capsFor, pruneEdgesForCaps } from "./modelCapabilities";
import { DEFAULT_CREATIVITY, DEFAULT_UPSCALE_FACTOR, DEFAULT_SAFETY_TOLERANCE } from "./upscaleOptions";

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
  setNodeProvider: (id: string, provider: string) => void;
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
      return {
        kind: "image",
        prompt: "",
        status: "idle",
        progress: 0,
        provider: DEFAULT_IMAGE_NODE_PROVIDER,
        aspectRatio: DEFAULT_IMAGE_ASPECT_BY_PROVIDER[DEFAULT_IMAGE_NODE_PROVIDER],
        resolution: DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER[DEFAULT_IMAGE_NODE_PROVIDER],
      };
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
        audio: VIDEO_SUPPORTS_AUDIO[DEFAULT_VIDEO_PROVIDER] ? true : undefined,
        draft: false,
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
        provider: DEFAULT_IMAGE_NODE_PROVIDER,
        aspectRatio: "16:9",
        resolution: DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER[DEFAULT_IMAGE_NODE_PROVIDER],
      };
    case "reference":
      return { kind: "reference" };
    case "shot":
      return { kind: "shot" };
    case "upscale":
      return {
        kind: "upscale",
        status: "idle",
        progress: 0,
        prompt: "",
        creativity: DEFAULT_CREATIVITY,
        upscaleFactor: DEFAULT_UPSCALE_FACTOR,
        safetyTolerance: DEFAULT_SAFETY_TOLERANCE,
        provider: DEFAULT_IMAGE_PROVIDER,
      };
      case "lut":
        return { kind: "lut", lutId: undefined, status: "idle", processedImage: undefined };
    
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
    data: {
      kind: "image",
      prompt: "",
      status: "idle",
      progress: 0,
      provider: DEFAULT_IMAGE_NODE_PROVIDER,
      aspectRatio: DEFAULT_IMAGE_ASPECT_BY_PROVIDER[DEFAULT_IMAGE_NODE_PROVIDER],
      resolution: DEFAULT_IMAGE_RESOLUTION_BY_PROVIDER[DEFAULT_IMAGE_NODE_PROVIDER],
    },
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

  // Switch an Image/Video node's model: keep settings the new model supports, reset the rest,
  // and remove connections the new model can't accept (e.g. a video reference on Veo).
  setNodeProvider: (id, provider) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    const data = node.data as any;
    if (!["image", "video", "character", "object", "location"].includes(data.kind)) return;
    const settings =
      data.kind === "video"
        ? normalizeVideoSettings(provider as any, data)
        : normalizeImageSettings(provider as any, data);
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, provider, ...settings } } as FlowNode) : n
      ),
      edges: pruneEdgesForCaps(id, capsFor(data.kind === "video" ? "video" : "image", provider), get().edges),
    });
  },

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
      // Backfill every imported node's data against this version's full
      // default shape for its type, with the imported values taking
      // priority. Without this, a flow exported from an earlier version of
      // the app (before some field existed on a node type) would produce
      // nodes missing newer required fields, which crashes that node's
      // component when it reads e.g. `data.prompt` directly.
      const nodes = (parsed.nodes ?? []).map((n: any) => ({
        ...n,
        data: { ...defaultDataFor(n.type), ...(n.data ?? {}) },
      }));
      set({
        flowName: parsed.flowName ?? "Imported Flow",
        nodes,
        edges: parsed.edges ?? [],
      });
    } catch (e) {
      console.error("Failed to import flow JSON", e);
    }
  },

  resetFlow: () => set({ flowName: "Untitled Flow", nodes: [], edges: [] }),
}));
