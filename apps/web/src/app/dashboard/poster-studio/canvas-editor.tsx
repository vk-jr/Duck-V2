"use client";

import { useEffect, useRef } from "react";
import type { PosterLayout } from "@/types";

// Fabric.js requires window — dynamically imported with ssr: false in client.tsx

interface PosterCanvasProps {
  layout: PosterLayout;
  backgroundUrl: string;
  posterId: string;
}

// Load a Google Font via CSS injection + FontFaceSet API.
// Runs before canvas render so Fabric can use the font immediately.
async function loadGoogleFont(family: string, weight: string): Promise<void> {
  const weightMap: Record<string, string> = {
    normal: "400",
    semibold: "600",
    bold: "700",
  };
  const cssWeight = weightMap[weight] ?? "700";
  const linkId = `gf-${family.replace(/\s+/g, "-")}-${cssWeight}`;

  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${cssWeight}&display=swap`;
    document.head.appendChild(link);
  }

  try {
    await document.fonts.load(`${cssWeight} 16px "${family}"`);
  } catch {
    // Non-fatal — Fabric falls back to system fonts
  }
}

export function PosterCanvas({ layout, backgroundUrl, posterId }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);

  const { width, height } = layout.dimensions;

  useEffect(() => {
    let disposed = false;

    async function init() {
      const { Canvas, FabricImage, Rect, Textbox, Shadow, Gradient } =
        await import("fabric");

      if (disposed || !canvasRef.current) return;

      const canvas = new Canvas(canvasRef.current, { width, height, selection: true });
      fabricRef.current = canvas;

      // Pre-load all Google Fonts referenced in text layers (in parallel)
      await Promise.all(
        layout.text_layers.map((layer) =>
          loadGoogleFont(layer.font_family || "Inter", layer.font_weight)
        )
      );
      if (disposed) return;

      // Background image — stretched to fill canvas exactly
      try {
        const bgImg = await FabricImage.fromURL(backgroundUrl, {
          crossOrigin: "anonymous",
        });
        if (!disposed) {
          bgImg.set({
            left: 0,
            top: 0,
            originX: "left",
            originY: "top",
            scaleX: width / (bgImg.width ?? width),
            scaleY: height / (bgImg.height ?? height),
            selectable: false,
            evented: false,
          });
          canvas.backgroundImage = bgImg;
          canvas.renderAll();
        }
      } catch {
        // Non-fatal — canvas still renders with overlay and text
      }

      if (disposed) return;

      // Overlay — cinematic gradient (transparent top → dark bottom) or flat
      const overlayStyle = layout.overlay_style ?? "flat";
      const overlayFill =
        overlayStyle === "gradient_bottom"
          ? new Gradient({
              type: "linear",
              gradientUnits: "pixels",
              coords: { x1: 0, y1: 0, x2: 0, y2: height },
              colorStops: [
                { offset: 0, color: "rgba(0,0,0,0)" },
                { offset: 0.45, color: `rgba(0,0,0,${layout.overlay_opacity * 0.3})` },
                { offset: 1, color: `rgba(0,0,0,${layout.overlay_opacity})` },
              ],
            })
          : `rgba(0,0,0,${layout.overlay_opacity})`;

      const overlay = new Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: overlayFill,
        selectable: false,
        evented: false,
      });
      canvas.add(overlay);

      // Text layers
      for (const layer of layout.text_layers) {
        const maxWidth = Math.max(50, (layer.max_width_percent / 100) * width);
        const left = Math.min(
          Math.max((layer.position_x / 100) * width, maxWidth / 2),
          width - maxWidth / 2
        );
        const top = Math.min(
          Math.max((layer.position_y / 100) * height, 10),
          height - 10
        );

        const shadow =
          (layer.text_shadow ?? false)
            ? new Shadow({
                color: "rgba(0,0,0,0.65)",
                blur: 14,
                offsetX: 2,
                offsetY: 3,
              })
            : undefined;

        const textbox = new Textbox(layer.content, {
          left,
          top,
          originX: "center",
          originY: "center",
          width: maxWidth,
          fontSize: layer.font_size,
          fontWeight: layer.font_weight,
          fontFamily: layer.font_family || "Inter",
          fill: layer.color,
          textAlign: layer.alignment as "left" | "center" | "right",
          charSpacing: layer.letter_spacing ?? 0,
          lineHeight: layer.line_height ?? 1.2,
          shadow,
          editable: true,
        });
        canvas.add(textbox);
      }

      canvas.renderAll();
    }

    init();

    return () => {
      disposed = true;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [layout, backgroundUrl, width, height]);

  function exportPng() {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    downloadFile(dataUrl, `poster-${posterId}.png`);
  }

  function exportJpg() {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({
      format: "jpeg",
      quality: 0.92,
      multiplier: 2,
    });
    downloadFile(dataUrl, `poster-${posterId}.jpg`);
  }

  async function exportPdf() {
    if (!fabricRef.current) return;
    const { jsPDF } = await import("jspdf");
    const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`poster-${posterId}.pdf`);
  }

  function downloadFile(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  // Scale canvas to fit within a 580×650 display budget
  const scale = Math.min(1, 580 / width, 650 / height);
  const displayWidth = Math.round(width * scale);
  const displayHeight = Math.round(height * scale);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Clip container: position:relative + overflow:hidden ensures Fabric's
          absolutely-positioned upper-canvas is clipped correctly. */}
      <div className="flex flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div
          style={{
            position: "relative",
            width: displayWidth,
            height: displayHeight,
            overflow: "hidden",
            borderRadius: "0.5rem",
            flexShrink: 0,
          }}
        >
          {/* Full-size canvas scaled down; position:absolute keeps its 1080px
              DOM footprint inside the clip container. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Export controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={exportPng}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Export PNG
        </button>
        <button
          onClick={exportJpg}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Export JPG
        </button>
        <button
          onClick={exportPdf}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
