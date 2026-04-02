"use client";

import { useEffect, useRef } from "react";
import type { PosterLayout } from "@/types";

// Fabric.js is imported at runtime only — this file must be dynamically imported
// with ssr: false in client.tsx because fabric requires window.

interface PosterCanvasProps {
  layout: PosterLayout;
  backgroundUrl: string;
  posterId: string;
}

export function PosterCanvas({ layout, backgroundUrl, posterId }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);

  const { width, height } = layout.dimensions;

  useEffect(() => {
    let disposed = false;

    async function init() {
      const { Canvas, FabricImage, Rect, Textbox } = await import("fabric");

      if (disposed || !canvasRef.current) return;

      const canvas = new Canvas(canvasRef.current, { width, height, selection: true });
      fabricRef.current = canvas;

      // Background image — scale to fill the full canvas exactly
      try {
        const bgImg = await FabricImage.fromURL(backgroundUrl, { crossOrigin: "anonymous" });
        if (!disposed) {
          bgImg.set({
            left: 0,
            top: 0,
            originX: "left",
            originY: "top",
            // Stretch to cover the full canvas regardless of source dimensions
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

      // Dark overlay for text legibility
      const overlay = new Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: `rgba(0,0,0,${layout.overlay_opacity})`,
        selectable: false,
        evented: false,
      });
      canvas.add(overlay);

      // Text layers — clamp positions to canvas bounds so nothing renders outside
      for (const layer of layout.text_layers) {
        const maxWidth = Math.max(50, (layer.max_width_percent / 100) * width);
        const left = Math.min(Math.max((layer.position_x / 100) * width, maxWidth / 2), width - maxWidth / 2);
        const top = Math.min(Math.max((layer.position_y / 100) * height, 10), height - 10);

        const textbox = new Textbox(layer.content, {
          left,
          top,
          originX: "center",
          originY: "center",
          width: maxWidth,
          fontSize: layer.font_size,
          fontWeight: layer.font_weight,
          fill: layer.color,
          textAlign: layer.alignment as "left" | "center" | "right",
          fontFamily: "Inter, Arial, sans-serif",
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
    const dataUrl = fabricRef.current.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 2 });
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
      {/* Canvas wrapper
          position: relative + overflow: hidden on the clip div ensures Fabric's
          upper-canvas layer (which is position:absolute inside .canvas-container)
          is clipped correctly even with CSS transform scaling. */}
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
          {/* Full-size canvas scaled down via transform; absolutely positioned
              so its 1080px DOM footprint doesn't push outside the clip container */}
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
