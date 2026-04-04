"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronUp, ChevronDown, Eye, EyeOff,
  Type, ImageIcon, Layers, Lock, Plus, Trash2, Save, Check,
} from "lucide-react";
import type { PosterLayout } from "@/types";

interface PosterCanvasProps {
  layout: PosterLayout;
  layerUrls: string[];
  backgroundUrl: string | null;
  heroImageUrl?: string | null;
  posterId: string;
  brandFonts?: string[];
  onSavePreview?: (dataUrl: string) => Promise<void>;
}

interface LayerItem {
  id: string;
  label: string;
  type: "text" | "image" | "overlay";
  visible: boolean;
  locked: boolean;
  fabricObj: any;
}

interface TextProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  textAlign: string;
  opacity: number;
  charSpacing: number;
}

interface ImageProps {
  label: string;
  opacity: number;
  scale: number;
}

const GOOGLE_FONTS = [
  "Oswald", "Bebas Neue", "Montserrat",
  "Playfair Display", "Cormorant Garamond",
  "Poppins", "Raleway", "DM Sans",
  "Lato", "Source Sans 3",
];

async function loadGoogleFont(family: string, weight: string): Promise<void> {
  const weightMap: Record<string, string> = { normal: "400", semibold: "600", bold: "700" };
  const cssWeight = weightMap[weight] ?? "700";
  const linkId = `gf-${family.replace(/\s+/g, "-")}-${cssWeight}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${cssWeight}&display=swap`;
    document.head.appendChild(link);
  }
  try { await document.fonts.load(`${cssWeight} 16px "${family}"`); } catch { /* non-fatal */ }
}

// Small labelled section for the properties panel
function PropSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

// Slider with inline value badge
function PropSlider({
  value, min, max, onChange, unit = "%",
}: { value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--accent)]"
      />
      <span className="w-10 text-right text-[10px] tabular-nums text-[var(--text-muted)]">
        {value}{unit}
      </span>
    </div>
  );
}

export function PosterCanvas({ layout, layerUrls, backgroundUrl, heroImageUrl, posterId, brandFonts, onSavePreview }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);

  const { width, height } = layout.dimensions;

  // Default zoom: fit inside an ~560×660 display budget (the center panel estimate)
  const defaultZoom = Math.max(25, Math.min(
    Math.round(Math.min(560 / width, 660 / height) * 100), 100
  ));

  const [zoom, setZoom] = useState(defaultZoom);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [layerList, setLayerList] = useState<LayerItem[]>([]);
  const [textProps, setTextProps] = useState<TextProps | null>(null);
  const [imageProps, setImageProps] = useState<ImageProps | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  // ── Shared helpers ─────────────────────────────────────────

  const refreshLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs: any[] = canvas.getObjects();
    setLayerList(
      [...objs].reverse().map((obj: any, idx: number) => ({
        id: obj.data?.id ?? `obj-${idx}`,
        label: obj.data?.label ?? "Object",
        type: (obj.data?.type ?? "image") as LayerItem["type"],
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        fabricObj: obj,
      }))
    );
  }, []);

  const syncSelection = useCallback((obj: any) => {
    setSelectedObj(obj ?? null);
    if (!obj) {
      setTextProps(null);
      setImageProps(null);
      return;
    }
    if (obj.data?.type === "text") {
      setTextProps({
        text: obj.text ?? "",
        fontFamily: obj.fontFamily ?? "Inter",
        fontSize: Number(obj.fontSize ?? 48),
        fontWeight: String(obj.fontWeight ?? "normal"),
        fill: String(obj.fill ?? "#ffffff"),
        textAlign: String(obj.textAlign ?? "left"),
        opacity: Math.round((obj.opacity ?? 1) * 100),
        charSpacing: Number(obj.charSpacing ?? 0),
      });
      setImageProps(null);
    } else if (obj.data?.type === "image") {
      setTextProps(null);
      setImageProps({
        label: obj.data?.label ?? "Image Layer",
        opacity: Math.round((obj.opacity ?? 1) * 100),
        scale: Math.round((obj.scaleX ?? 1) * 100),
      });
    } else {
      setTextProps(null);
      setImageProps(null);
    }
  }, []);

  // ── Canvas init ────────────────────────────────────────────

  useEffect(() => {
    let disposed = false;

    async function init() {
      const { Canvas, FabricImage, Rect, Textbox, Shadow, Gradient } = await import("fabric");
      if (disposed || !canvasRef.current) return;

      const canvas = new Canvas(canvasRef.current, { width, height, selection: true });
      fabricRef.current = canvas;

      // Background
      if (backgroundUrl) {
        try {
          const bgImg = await FabricImage.fromURL(backgroundUrl, { crossOrigin: "anonymous" });
          if (!disposed) {
            bgImg.set({
              left: 0, top: 0, originX: "left", originY: "top",
              scaleX: width / (bgImg.width ?? width),
              scaleY: height / (bgImg.height ?? height),
              selectable: false, evented: false,
            });
            canvas.backgroundImage = bgImg;
            canvas.renderAll();
          }
        } catch { /* non-fatal */ }
      } else if (layout.background?.color) {
        canvas.backgroundColor = layout.background.color;
        canvas.renderAll();
      }
      if (disposed) return;

      // Overlay (dark gradient for text legibility on ai_image backgrounds)
      const overlayOpacity = layout.background?.overlay_opacity ?? 0;
      if (overlayOpacity > 0) {
        const overlay = new Rect({
          left: 0, top: 0, width, height,
          fill: new Gradient({
            type: "linear", gradientUnits: "pixels",
            coords: { x1: 0, y1: 0, x2: 0, y2: height },
            colorStops: [
              { offset: 0, color: "rgba(0,0,0,0)" },
              { offset: 0.4, color: `rgba(0,0,0,${overlayOpacity * 0.3})` },
              { offset: 1, color: `rgba(0,0,0,${overlayOpacity})` },
            ],
          }),
          selectable: false, evented: false,
          data: { type: "overlay", label: "Overlay", id: "overlay" },
        });
        canvas.add(overlay);
      }
      if (disposed) return;

      // Image layers — layer 0 first (background), highest index last (foreground/top)
      const layerDefaults = layout.layer_stack?.layer_defaults ?? [];
      const sortedDefaults = [...layerDefaults].sort((a, b) => a.layer_index - b.layer_index);

      for (const defaults of sortedDefaults) {
        const url = layerUrls[defaults.layer_index];
        if (!url) continue;
        try {
          const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
          if (disposed) return;
          const naturalScale = height / (img.height ?? height);
          img.set({
            left: (defaults.position_x / 100) * width,
            top: (defaults.position_y / 100) * height,
            originX: "center", originY: "center",
            scaleX: naturalScale * defaults.scale,
            scaleY: naturalScale * defaults.scale,
            opacity: defaults.opacity,
            selectable: true, hasControls: true,
            data: {
              type: "image",
              id: `layer-${defaults.layer_index}`,
              label: `Layer ${defaults.layer_index} — ${defaults.label}`,
            },
          });
          canvas.add(img);
          canvas.renderAll();
        } catch { /* non-fatal — skip broken layer */ }
      }
      if (disposed) return;

      // Text layers — pre-load all fonts first
      await Promise.all(
        layout.text_layers.map((l) => loadGoogleFont(l.font_family ?? "Inter", l.font_weight))
      );
      if (disposed) return;

      for (const layer of layout.text_layers) {
        const maxWidth = Math.max(50, (layer.max_width_percent / 100) * width);
        const left = Math.min(Math.max((layer.position_x / 100) * width, maxWidth / 2), width - maxWidth / 2);
        const top = Math.min(Math.max((layer.position_y / 100) * height, 10), height - 10);

        const textbox = new Textbox(layer.content, {
          left, top, originX: "center", originY: "center",
          width: maxWidth,
          fontSize: layer.font_size,
          fontWeight: layer.font_weight,
          fontFamily: layer.font_family ?? "Inter",
          fill: layer.color,
          textAlign: layer.alignment as "left" | "center" | "right",
          charSpacing: layer.letter_spacing ?? 0,
          lineHeight: layer.line_height ?? 1.2,
          shadow: layer.text_shadow
            ? new Shadow({ color: "rgba(0,0,0,0.65)", blur: 14, offsetX: 2, offsetY: 3 })
            : undefined,
          editable: true, selectable: true, hasControls: true,
          data: {
            type: "text",
            id: layer.id,
            label: layer.id.charAt(0).toUpperCase() + layer.id.slice(1),
          },
        });
        canvas.add(textbox);
      }

      canvas.renderAll();

      // Wire up Fabric events
      const onSelect = () => syncSelection(canvas.getActiveObject());
      const onDeselect = () => syncSelection(null);
      const onModified = () => refreshLayers();

      canvas.on("selection:created", onSelect);
      canvas.on("selection:updated", onSelect);
      canvas.on("selection:cleared", onDeselect);
      canvas.on("object:modified", onModified);
      canvas.on("object:added", onModified);
      canvas.on("object:removed", onModified);

      refreshLayers();
    }

    init();
    return () => {
      disposed = true;
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, [layout, layerUrls, backgroundUrl, width, height, refreshLayers, syncSelection]);

  // ── Layer panel actions ────────────────────────────────────

  function selectLayer(obj: any) {
    const canvas = fabricRef.current;
    if (!canvas || !obj.selectable) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
    syncSelection(obj);
  }

  function bringForward(obj: any) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.bringObjectForward(obj);
    canvas.renderAll();
    refreshLayers();
  }

  function sendBackward(obj: any) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
    refreshLayers();
  }

  function toggleVisibility(obj: any) {
    obj.set("visible", !obj.visible);
    fabricRef.current?.renderAll();
    refreshLayers();
  }

  function addTextBlock() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    import("fabric").then(({ Textbox }) => {
      const id = `text-${Date.now()}`;
      const box = new Textbox("New text", {
        left: width / 2, top: height / 2,
        originX: "center", originY: "center",
        fontSize: 64, fontWeight: "bold", fill: "#ffffff",
        width: width * 0.5, editable: true,
        data: { type: "text", id, label: "New Text" },
      });
      canvas.add(box);
      canvas.setActiveObject(box);
      canvas.renderAll();
      refreshLayers();
      syncSelection(box);
    });
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || !obj.selectable) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshLayers();
    syncSelection(null);
  }

  function deleteLayer(obj: any) {
    const canvas = fabricRef.current;
    if (!canvas || !obj.selectable) return;
    canvas.remove(obj);
    if (canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
      syncSelection(null);
    }
    canvas.renderAll();
    refreshLayers();
  }

  async function savePoster() {
    if (!fabricRef.current || !onSavePreview) return;
    setSaving("saving");
    try {
      const dataUrl = fabricRef.current.toDataURL({
        format: "jpeg",
        quality: 0.85,
        multiplier: 0.5, // half resolution is enough for preview
      });
      await onSavePreview(dataUrl);
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 2500);
    } catch {
      setSaving("idle");
    }
  }

  // ── Property updates ───────────────────────────────────────

  function updateTextProp(key: keyof TextProps, value: string | number) {
    const obj = selectedObj;
    const canvas = fabricRef.current;
    if (!obj || !canvas) return;
    obj.set(key, key === "opacity" ? Number(value) / 100 : value);
    canvas.renderAll();
    setTextProps((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  async function updateFontFamily(value: string) {
    const obj = selectedObj;
    const canvas = fabricRef.current;
    if (!obj || !canvas) return;
    await loadGoogleFont(value, textProps?.fontWeight ?? "normal");
    obj.set("fontFamily", value);
    canvas.renderAll();
    setTextProps((prev) => (prev ? { ...prev, fontFamily: value } : null));
  }

  function updateImageProp(key: "opacity" | "scale", value: number) {
    const obj = selectedObj;
    const canvas = fabricRef.current;
    if (!obj || !canvas) return;
    if (key === "opacity") obj.set("opacity", value / 100);
    else obj.set({ scaleX: value / 100, scaleY: value / 100 });
    canvas.renderAll();
    setImageProps((prev) => (prev ? { ...prev, [key]: value } : null));
  }

  // ── Export ─────────────────────────────────────────────────

  function exportPng() {
    const url = fabricRef.current?.toDataURL({ format: "png", multiplier: 2 });
    if (url) dl(url, `poster-${posterId}.png`);
  }
  function exportJpg() {
    const url = fabricRef.current?.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 2 });
    if (url) dl(url, `poster-${posterId}.jpg`);
  }
  async function exportPdf() {
    if (!fabricRef.current) return;
    const { jsPDF } = await import("jspdf");
    const url = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "px", format: [width, height],
    });
    pdf.addImage(url, "PNG", 0, 0, width, height);
    pdf.save(`poster-${posterId}.pdf`);
  }
  function dl(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl; a.download = filename; a.click();
  }

  const displayWidth = Math.round(width * zoom / 100);
  const displayHeight = Math.round(height * zoom / 100);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-2">
        {/* Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Zoom</span>
          <input
            type="range" min={25} max={150} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-28 accent-[var(--accent)]"
          />
          <span className="w-9 text-right text-xs tabular-nums text-[var(--text-primary)]">
            {zoom}%
          </span>
        </div>

        <div className="flex-1" />

        {/* Delete selected */}
        {selectedObj?.selectable && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}

        {/* Save preview */}
        {onSavePreview && (
          <button
            onClick={savePoster}
            disabled={saving === "saving"}
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              saving === "saved"
                ? "bg-green-500/20 text-green-400"
                : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-1)]",
            ].join(" ")}
          >
            {saving === "saved" ? (
              <><Check className="h-3.5 w-3.5" /> Saved</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Save</>
            )}
          </button>
        )}

        {/* Exports */}
        {(["PNG", "JPG", "PDF"] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={fmt === "PNG" ? exportPng : fmt === "JPG" ? exportJpg : exportPdf}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
          >
            {fmt}
          </button>
        ))}
      </div>

      {/* ── Main row ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left — Layers ──────────────────────────────────── */}
        <div className="flex w-48 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)]">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Layers
            </p>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {layerList.map((item) => {
              const isSelected = selectedObj === item.fabricObj;
              return (
                <li
                  key={item.id}
                  onClick={() => selectLayer(item.fabricObj)}
                  className={[
                    "group flex items-center gap-1.5 border-l-2 px-2 py-1.5 transition-colors",
                    item.locked ? "cursor-default" : "cursor-pointer",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-transparent hover:bg-[var(--surface-2)]",
                  ].join(" ")}
                >
                  {/* Type icon */}
                  <span className="flex-shrink-0 text-[var(--text-muted)]">
                    {item.type === "text" ? (
                      <Type className="h-3 w-3" />
                    ) : item.type === "overlay" ? (
                      <Layers className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className={[
                      "flex-1 min-w-0 truncate text-xs",
                      item.visible ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>

                  {/* Controls — revealed on hover or when selected */}
                  {!item.locked ? (
                    <div className={[
                      "flex flex-shrink-0 items-center gap-0.5",
                      isSelected ? "" : "hidden group-hover:flex",
                    ].join(" ")}>
                      <button
                        onClick={(e) => { e.stopPropagation(); bringForward(item.fabricObj); }}
                        title="Bring forward"
                        className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); sendBackward(item.fabricObj); }}
                        title="Send backward"
                        className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(item.fabricObj); }}
                        title={item.visible ? "Hide" : "Show"}
                        className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                      >
                        {item.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLayer(item.fabricObj); }}
                        title="Delete layer"
                        className="rounded p-0.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Lock className="h-3 w-3 flex-shrink-0 text-[var(--text-muted)] opacity-30" />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--border)] p-2">
            <button
              onClick={addTextBlock}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              <Plus className="h-3 w-3" />
              Add text
            </button>
          </div>
        </div>

        {/* Center — Canvas ─────────────────────────────────── */}
        <div className="flex flex-1 min-w-0 items-center justify-center overflow-auto bg-[var(--surface-2)] p-8">
          <div
            style={{
              position: "relative",
              width: displayWidth,
              height: displayHeight,
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0, left: 0,
                width, height,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Right — Properties ──────────────────────────────── */}
        <div className="flex w-64 flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-1)] overflow-y-auto">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Properties
            </p>
          </div>

          {/* Nothing selected — show hero image if available */}
          {!selectedObj && (
            <div className="flex flex-col gap-3 p-3">
              {heroImageUrl ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Generated image
                  </p>
                  <img
                    src={heroImageUrl}
                    alt="Generated hero"
                    loading="lazy"
                    decoding="async"
                    className="w-full rounded-lg object-cover"
                    style={{ aspectRatio: `${width}/${height}` }}
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Select a layer to edit its properties
                  </p>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center py-10 text-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    Click a layer on the canvas or in the layers list to edit it
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Text properties ─────────────────────────────── */}
          {textProps && (
            <div className="flex flex-col gap-4 p-3">

              <PropSection label="Text content">
                <textarea
                  value={textProps.text}
                  rows={2}
                  onChange={(e) => updateTextProp("text", e.target.value)}
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </PropSection>

              <PropSection label="Font">
                <select
                  value={textProps.fontFamily}
                  onChange={(e) => updateFontFamily(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  {brandFonts && brandFonts.length > 0 && (
                    <optgroup label="Brand Fonts">
                      {brandFonts.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={brandFonts?.length ? "Other Fonts" : "Fonts"}>
                    {GOOGLE_FONTS.filter((f) => !brandFonts?.includes(f)).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </optgroup>
                </select>
              </PropSection>

              {/* Size + Weight on same row */}
              <div className="flex gap-2">
                <PropSection label="Size">
                  <input
                    type="number" min={8} max={400} value={textProps.fontSize}
                    onChange={(e) => updateTextProp("fontSize", Number(e.target.value))}
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </PropSection>
                <PropSection label="Weight">
                  <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                    {["normal", "semibold", "bold"].map((w) => (
                      <button
                        key={w}
                        onClick={() => updateTextProp("fontWeight", w)}
                        className={[
                          "flex-1 py-1.5 text-[10px] transition-colors",
                          textProps.fontWeight === w
                            ? "bg-[var(--accent)] font-bold text-black"
                            : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                        ].join(" ")}
                      >
                        {w === "normal" ? "N" : w === "semibold" ? "S" : "B"}
                      </button>
                    ))}
                  </div>
                </PropSection>
              </div>

              <PropSection label="Colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(textProps.fill) ? textProps.fill : "#ffffff"}
                    onChange={(e) => updateTextProp("fill", e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0.5"
                  />
                  <input
                    type="text" value={textProps.fill}
                    onChange={(e) => updateTextProp("fill", e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </PropSection>

              <PropSection label="Alignment">
                <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => updateTextProp("textAlign", a)}
                      className={[
                        "flex-1 py-1.5 text-xs capitalize transition-colors",
                        textProps.textAlign === a
                          ? "bg-[var(--accent)] font-bold text-black"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      ].join(" ")}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </PropSection>

              <PropSection label="Opacity">
                <PropSlider value={textProps.opacity} min={0} max={100}
                  onChange={(v) => updateTextProp("opacity", v)} />
              </PropSection>

              <PropSection label="Letter spacing">
                <PropSlider value={textProps.charSpacing} min={-50} max={500} unit=""
                  onChange={(v) => updateTextProp("charSpacing", v)} />
              </PropSection>

            </div>
          )}

          {/* ── Image layer properties ───────────────────────── */}
          {imageProps && (
            <div className="flex flex-col gap-4 p-3">
              <p className="text-xs font-medium text-[var(--text-primary)]">{imageProps.label}</p>

              <PropSection label="Opacity">
                <PropSlider value={imageProps.opacity} min={0} max={100}
                  onChange={(v) => updateImageProp("opacity", v)} />
              </PropSection>

              <PropSection label="Scale">
                <PropSlider value={imageProps.scale} min={20} max={200}
                  onChange={(v) => updateImageProp("scale", v)} />
              </PropSection>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
