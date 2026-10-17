"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/buttons";
import { createClient } from "@/lib/supabase/clients";
import { removeAvatar, saveAvatar } from "./actions";

const MAX_PICK_BYTES = 10 * 1024 * 1024; // refuse absurdly large picks
const OUTPUT_SIZE = 256;

// Center-crop to a square, shrink to 256x256, and re-encode as JPEG.
// Bonus: re-encoding strips EXIF metadata such as GPS location.
async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();

  // canvas.toBlob uses a callback and may give null. Wrap it in a Promise.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      0.85
    );
  });
}

interface AvatarUploaderProps {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export function AvatarUploader({ userId, name, avatarUrl }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > MAX_PICK_BYTES) {
      setError("That image is too large (max 10 MB).");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      let blob: Blob;
      try {
        blob = await squareJpeg(file);
      } catch {
        setError("That image couldn't be read. Try a JPG or PNG.");
        return;
      }

      const path = `${userId}/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) {
        setError("Upload failed. Try again.");
        return;
      }

      const result = await saveAvatar(path);
      if (result.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    const result = await removeAvatar();
    if (result.error) setError(result.error);
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar name={name} src={avatarUrl} size={112} />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPick}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Working..." : avatarUrl ? "Change photo" : "Add photo"}
        </Button>
        {avatarUrl && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}