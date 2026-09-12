// Reads an image File and returns a resized/compressed data URL, so notes
// with photos stay small enough to persist locally.
export function fileToDataUrl(
  file: File,
  { maxDim = 1600, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === "image/png";
        resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function filesToDataUrls(list: FileList | File[] | null): Promise<string[]> {
  const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
  const out: string[] = [];
  for (const f of files) {
    try { out.push(await fileToDataUrl(f)); } catch { /* skip unreadable file */ }
  }
  return out;
}
