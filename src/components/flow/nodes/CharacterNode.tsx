"use client";

import * as React from "react";
import Image from "next/image";
import {
  Handle,
  Position,
  type NodeProps,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { User, Sparkles, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowStore } from "@/lib/flowStore";
import {
  composeUpstreamPrompt,
  collectUpstreamImageRefs,
} from "@/lib/promptGraph";
import {
  PROMPT_HANDLE_ID,
  IMAGE_REFS_HANDLE_ID,
  CHARACTER_IMAGE_OUT_ID,
  CHARACTER_PROMPT_OUT_ID,
} from "@/lib/handleIds";
import {
  isValidPromptSource,
  isValidImageRefSource,
} from "@/lib/connectionValidators";
import type { CharacterNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";
import PromptPreview from "./PromptPreview";

export default function CharacterNode({
  id,
  data,
  selected,
}: NodeProps) {
  const charData = data as CharacterNodeData;

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const [fallbackNotice, setFallbackNotice] =
    React.useState<string | null>(null);

  /*
   * Prompt input
   *
   * Prompt / Camera / Lens nodes connected to the prompt
   * input are composed into one character description.
   */
  const inputPrompt = React.useMemo(
    () =>
      composeUpstreamPrompt(
        id,
        nodes as any,
        edges,
        PROMPT_HANDLE_ID
      ),
    [id, nodes, edges]
  );

  /*
   * Image reference input
   *
   * Supports Image nodes, Character nodes and Reference Image
   * nodes connected to the image reference input.
   */
  const referenceImages = React.useMemo(
    () =>
      collectUpstreamImageRefs(
        id,
        nodes as any,
        edges,
        IMAGE_REFS_HANDLE_ID
      ),
    [id, nodes, edges]
  );

  const promptValidator = React.useCallback(
    (connection: Connection | Edge) =>
      isValidPromptSource(connection, nodes as any),
    [nodes]
  );

  const imageRefValidator = React.useCallback(
    (connection: Connection | Edge) =>
      isValidImageRefSource(connection, nodes as any),
    [nodes]
  );

  async function handleGenerate() {
    setFallbackNotice(null);

    updateNodeData(id, {
      status: "loading",
      progress: 0,
    });

    const interval = setInterval(() => {
      const currentNode = useFlowStore
        .getState()
        .nodes.find((n) => n.id === id);

      const currentProgress =
        (currentNode?.data as CharacterNodeData | undefined)
          ?.progress ?? 0;

      updateNodeData(id, {
        progress: Math.min(
          95,
          currentProgress + Math.random() * 10
        ),
      });
    }, 450);

    try {
      /*
       * IMPORTANT:
       *
       * This makes exactly ONE generation request.
       *
       * The API receives:
       * - the optional character prompt
       * - all connected reference images
       *
       * The API is responsible for generating one combined
       * character sheet containing:
       *
       * 1. Facial close-up
       * 2. Full-body frontal
       * 3. Full-body rear
       */
      const res = await fetch("/api/generate-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: inputPrompt.trim(),
          imageRefs: referenceImages,
        }),
      });

      const json = await res.json();

      clearInterval(interval);

      if (!res.ok) {
        throw new Error(
          json.error ?? "Failed to generate character sheet."
        );
      }

      if (json.fallback) {
        setFallbackNotice(
          json.fallbackReason ??
            "Using placeholder character sheet."
        );
      }

      /*
       * The new API should return ONE image:
       *
       * json.sheetImage
       *
       * Keep sheetImages for compatibility with your existing
       * CharacterNodeData type and downstream code.
       *
       * All three keys point to the same combined sheet.
       */
      const sheetImage =
        json.sheetImage ??
        json.imageUrl ??
        json.output ??
        null;

      updateNodeData(id, {
        status: "done",
        progress: 100,

        sheetImages:  sheetImage
        ? {
            sheet: sheetImage,
          }
        : {},

        characterPrompt:
          json.characterPrompt ??
          inputPrompt ??
          "",
      });
    } catch (err) {
      const json = await res.json();

    clearInterval(interval);

    if (!res.ok) {
      throw new Error(
        json.error ?? "Failed to generate character sheet."
      );
    }

    if (json.fallback) {
      setFallbackNotice(
        json.fallbackReason ??
          "Using placeholder character sheet."
      );
    }

    const sheetImage =
      json.sheetImage ??
      json.imageUrl ??
      null;

    if (!sheetImage) {
      throw new Error(
        "Character sheet API returned no image."
      );
    }

    updateNodeData(id, {
      status: "done",
      progress: 100,
      sheetImages: {
        sheet: sheetImage,
      },
      characterPrompt:
        json.characterPrompt ??
        inputPrompt ??
        "",
    });
    }
  }

  const sheetImage = charData.sheetImages?.sheet;

  return (
    <NodeShell
      id={id}
      icon={User}
      title="Character"
      selected={selected}
      width="w-[320px]"
      showTarget={false}
      showSource={false}
      extraHandles={
        <>
          {/* Prompt input */}
          <Handle
            type="target"
            position={Position.Left}
            id={PROMPT_HANDLE_ID}
            isValidConnection={promptValidator}
            style={{ top: "30%" }}
            className="
              !h-3
              !w-3
              !border-2
              !border-background
              !bg-primary
            "
          />

          {/* Reference image input */}
          <Handle
            type="target"
            position={Position.Left}
            id={IMAGE_REFS_HANDLE_ID}
            isValidConnection={imageRefValidator}
            style={{ top: "55%" }}
            className="
              !h-3
              !w-3
              !border-2
              !border-background
              !bg-sky-400
            "
          />

          {/* Character sheet image output */}
          <Handle
            type="source"
            position={Position.Right}
            id={CHARACTER_IMAGE_OUT_ID}
            style={{ top: "35%" }}
            className="
              !h-3
              !w-3
              !border-2
              !border-background
              !bg-sky-400
            "
          />

          {/* Character prompt output */}
          <Handle
            type="source"
            position={Position.Right}
            id={CHARACTER_PROMPT_OUT_ID}
            style={{ top: "65%" }}
            className="
              !h-3
              !w-3
              !border-2
              !border-background
              !bg-primary
            "
          />
        </>
      }
    >
      {/* Character description */}
      <PromptPreview
        prompt={inputPrompt}
        placeholder="Connect a Prompt node to describe this character..."
        label="Character description input"
      />

      {/* Reference images */}
      {referenceImages.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-1 text-[9px] text-muted-foreground">
            <ImageIcon className="h-3 w-3 text-sky-400" />
            <span>
              {referenceImages.length} reference
              {referenceImages.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex gap-1.5">
            {referenceImages.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="
                  relative
                  h-10
                  w-14
                  overflow-hidden
                  rounded
                  border
                  border-border
                  bg-secondary
                "
              >
                <Image
                  src={url}
                  alt={`Character reference ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated character sheet */}
      <div className="mb-2">
        <div className="mb-1 flex items-center gap-1 text-[9px] text-muted-foreground">
          <User className="h-3 w-3 text-primary" />
          <span>Character sheet</span>
        </div>

        <div
          className="
            relative
            h-[220px]
            w-full
            overflow-hidden
            rounded-md
            bg-secondary/60
          "
        >
          {charData.status === "loading" && (
            <>
              <Skeleton className="absolute inset-0 rounded-md" />

              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-md bg-background/80 px-3 py-2 text-center backdrop-blur-sm">
                  <div className="text-xs font-medium">
                    Generating character sheet
                  </div>

                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {Math.round(charData.progress)}%
                  </div>
                </div>
              </div>
            </>
          )}

          {sheetImage && charData.status === "done" && (
            <Image
              src={sheetImage}
              alt="Generated character sheet"
              fill
              unoptimized
              className="object-contain"
            />
          )}

          {!sheetImage &&
            charData.status !== "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <User className="mb-2 h-6 w-6 text-muted-foreground/50" />

                <span className="text-[10px] text-muted-foreground">
                  Facial + frontal + rear views
                </span>

                <span className="mt-1 text-[9px] text-muted-foreground/70">
                  One combined character sheet
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Character prompt output */}
      {charData.status === "done" &&
        charData.characterPrompt && (
          <PromptPreview
            prompt={charData.characterPrompt}
            placeholder=""
            label="Character prompt output"
          />
        )}

      {/* Fallback message */}
      {fallbackNotice && (
        <div
          className="
            mb-2
            rounded-md
            border
            border-amber-500/30
            bg-amber-500/10
            p-2
            text-[10px]
            leading-relaxed
            text-amber-400
          "
        >
          <span className="font-semibold">
            Placeholder sheet — Replicate wasn&apos;t used:
          </span>{" "}
          {fallbackNotice}
        </div>
      )}

      {/* Generate */}
      <Button
        size="sm"
        className="nodrag w-full"
        disabled={
          charData.status === "loading" ||
          (!inputPrompt.trim() &&
            referenceImages.length === 0)
        }
        onClick={handleGenerate}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />

        {charData.status === "loading"
          ? "Generating sheet..."
          : "Generate character sheet"}
      </Button>
    </NodeShell>
  );
}