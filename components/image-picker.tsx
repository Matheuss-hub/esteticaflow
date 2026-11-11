"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AvatarImage } from "@/components/avatar-image";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const invalidFileMessage = "Escolha uma imagem JPG, PNG ou WebP de até 5 MB.";

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function ImagePicker({
  currentUrl,
  initials,
  label,
  chooseLabel = "Escolher foto",
  removeLabel = "Remover foto",
  disabled = false,
  onImageChange,
}: {
  currentUrl: string | null;
  initials: string;
  label: string;
  chooseLabel?: string;
  removeLabel?: string;
  disabled?: boolean;
  onImageChange: (image: Blob | null, changed: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function prepareImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(invalidFileMessage);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setRemoved(false);
      onImageChange(null, false);
      return;
    }

    setProcessing(true);
    try {
      const bitmap = await createImageBitmap(file);
      const edge = Math.min(bitmap.width, bitmap.height);
      if (!edge) throw new Error("Imagem inválida");
      const left = Math.floor((bitmap.width - edge) / 2);
      const top = Math.floor((bitmap.height - edge) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponível");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, left, top, edge, edge, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      let output = await canvasBlob(canvas, "image/webp", 0.85);
      if (!output || output.type !== "image/webp") {
        output = await canvasBlob(canvas, "image/jpeg", 0.85);
      }
      if (!output) throw new Error("Não foi possível converter a imagem");

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const nextPreview = URL.createObjectURL(output);
      previewRef.current = nextPreview;
      setPreviewUrl(nextPreview);
      setRemoved(false);
      onImageChange(output, true);
    } catch {
      setError(invalidFileMessage);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setRemoved(false);
      onImageChange(null, false);
    } finally {
      setProcessing(false);
    }
  }

  function removeImage() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
    setRemoved(true);
    setError("");
    onImageChange(null, true);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <AvatarImage
        src={previewUrl || (removed ? null : currentUrl)}
        initials={initials}
        label={label}
        size={88}
        className="text-xl"
      />
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void prepareImage(event)} className="sr-only" />
        <button
          type="button"
          disabled={processing || disabled}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-60"
        >
          {processing ? "Preparando imagem..." : chooseLabel}
        </button>
        <button
          type="button"
          onClick={removeImage}
          disabled={processing || disabled || (!previewUrl && !currentUrl)}
          className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-muted outline-none hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
        >
          {removeLabel}
        </button>
      </div>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
      {previewUrl && <p className="w-full text-xs text-muted">Prévia pronta. Ela será salva quando você confirmar o formulário.</p>}
    </div>
  );
}
