import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function validateAndCompressImage(file: File): Promise<CompressionResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported image format. Please select a JPEG, PNG, or WebP photo.");
  }

  const originalSize = file.size;

  // Options for browser-image-compression
  const options = {
    maxSizeMB: 1.9, // Target under 2MB limit
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: file.type as any,
  };

  let compressedBlob: Blob = file;

  try {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      compressedBlob = await imageCompression(file, options);
    }
  } catch (err) {
    console.warn("browser-image-compression failed, using native canvas fallback:", err);
    compressedBlob = await canvasCompressFallback(file, 2048, 0.85);
  }

  const compressedFile = new File([compressedBlob], file.name, {
    type: file.type,
    lastModified: Date.now(),
  });

  const previewUrl = URL.createObjectURL(compressedFile);

  const dimensions = await getImageDimensions(previewUrl);

  return {
    file: compressedFile,
    previewUrl,
    originalSize,
    compressedSize: compressedFile.size,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 1080, height: 1080 });
    };
    img.src = url;
  });
}

async function canvasCompressFallback(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        file.type,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for canvas compression"));
    };
    img.src = url;
  });
}
