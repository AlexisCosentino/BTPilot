import { useCallback } from "react";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function estimateDataUrlBytes(dataUrl: string): number | null {
  const parts = dataUrl.split(",", 2);
  if (parts.length !== 2) return null;
  const base64 = parts[1];
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return (base64.length * 3) / 4 - padding;
}

const MAX_IMAGE_WIDTH = 1280;
const JPEG_QUALITY = 0.7;
export const IMAGE_SIZE_LIMIT_BYTES = 1_000_000;

export function useImageProcessor() {
  const resizeAndCompressImage = useCallback(async (file: File) => {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(originalDataUrl);
    const scale = image.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / image.width : 1;
    const targetWidth = Math.round(image.width * scale);
    const targetHeight = Math.round(image.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Impossible de traiter l'image.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Impossible de compresser l'image."));
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    });

    const dataUrl = await blobToDataUrl(blob);
    const estimatedSize = estimateDataUrlBytes(dataUrl);

    if (estimatedSize === null) {
      throw new Error("Lecture de l'image compressǸe impossible.");
    }

    return { dataUrl, size: estimatedSize, blob };
  }, []);

  return { resizeAndCompressImage };
}
