"use client";

import * as React from "react";
import {
  ReactFlow,
  ConnectionMode,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFlowStore } from "@/lib/flowStore";
import { isValidFlowConnection } from "@/lib/flowConnections";
import type { FlowNodeType } from "@/lib/types";

import PromptNode from "./nodes/PromptNode";
import CameraNode from "./nodes/CameraNode";
import LensNode from "./nodes/LensNode";
import ImageNode from "./nodes/ImageNode";
import VideoNode from "./nodes/VideoNode";
import SheetNode from "./nodes/SheetNode";
import ReferenceNode from "./nodes/ReferenceNode";
import ShotNode from "./nodes/ShotNode";
import UpscaleNode from "./nodes/UpscaleNode";
import LutNode from "./nodes/LutNode";
import RemovableEdge from "./edges/RemovableEdge";
import NodeContextMenu from "./NodeContextMenu";
import BottomSetupPanel from "./BottomSetupPanel";
import FlowToolbar from "./FlowToolbar";

const nodeTypes = {
  prompt: PromptNode,
  camera: CameraNode,
  lens: LensNode,
  image: ImageNode,
  video: VideoNode,
  character: SheetNode,
  object: SheetNode,
  location: SheetNode,
  costume: SheetNode,
  reference: ReferenceNode,
  shot: ShotNode,
  upscale: UpscaleNode,
  lut: LutNode,

};

const edgeTypes = {
  removable: RemovableEdge,
};

export default function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);

  const [rfInstance, setRfInstance] = React.useState<ReactFlowInstance | null>(null);
  const [menu, setMenu] = React.useState<{ x: number; y: number } | null>(null);

  const onPaneContextMenu = React.useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const anyEvent = event as MouseEvent;
    setMenu({ x: anyEvent.clientX, y: anyEvent.clientY });
  }, []);

  function handleSelectNodeType(type: FlowNodeType) {
    if (!rfInstance || !menu) return;
    const position = rfInstance.screenToFlowPosition({ x: menu.x, y: menu.y });
    addNode(type, position);
  }

  return (
    <div className="relative h-screen w-full bg-background">
      <FlowToolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Strict} // output -> input only
        isValidConnection={(c) => {
          const { nodes: n, edges: e } = useFlowStore.getState();
          return isValidFlowConnection(c, n as any, e);
        }}
        onInit={setRfInstance}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "removable" }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-40" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>

      {menu && (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          onSelect={handleSelectNodeType}
          onClose={() => setMenu(null)}
        />
      )}

      <BottomSetupPanel />
    </div>
  );
}
