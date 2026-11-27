import { roomQrDataUrl } from "@/lib/room-qr";

export type CardFormat = "story" | "polaroid";

export interface VibeCardOptions {
  imageUrl: string;
  authorName: string;
  roomTitle: string;
  roomCode: string;
  frameId?: string;
  format?: CardFormat;
  themeAccent?: string;
}

export async function generateVibeCardCanvas(options: VibeCardOptions): Promise<HTMLCanvasElement> {
  const {
    imageUrl,
    authorName,
    roomTitle,
    roomCode,
    frameId = "classic",
    format = "story",
    themeAccent = "#8B5CF6",
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas");

  const width = 1080;
  const height = format === "story" ? 1920 : 1350;
  canvas.width = width;
  canvas.height = height;

  // 1. Draw rich background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#09090B");
  bgGrad.addColorStop(0.5, "#18181B");
  bgGrad.addColorStop(1, "#09090B");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow
  const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.8);
  radialGlow.addColorStop(0, hexToRgba(themeAccent, 0.25));
  radialGlow.addColorStop(1, "transparent");
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Generate and load QR code for the room
  const qrDataUrl = await roomQrDataUrl(window.location.origin, roomCode, format === "story" ? 220 : 160);
  const qrImage = await loadImage(qrDataUrl);

  // 3. Load user photo safely
  const photo = await loadImage(imageUrl);

  if (format === "story") {
    // --- 1080 x 1920 Story Format ---
    // Header Branding
    ctx.font = "800 48px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = themeAccent;
    ctx.textAlign = "center";
    ctx.fillText("VIBEWALL", width / 2, 120);

    ctx.font = "600 28px 'Inter', sans-serif";
    ctx.fillStyle = "#A1A1AA";
    ctx.fillText(roomTitle.toUpperCase(), width / 2, 170);

    // Photo Box dimensions
    const photoX = 80;
    const photoY = 220;
    const photoW = width - 160;
    const photoH = 1200;

    // Draw frame styling
    drawFrame(ctx, frameId, photoX, photoY, photoW, photoH, themeAccent);

    // Clip & draw image
    ctx.save();
    roundRect(ctx, photoX + 16, photoY + 16, photoW - 32, photoH - 32, 24);
    ctx.clip();
    drawCoverImage(ctx, photo, photoX + 16, photoY + 16, photoW - 32, photoH - 32);
    ctx.restore();

    // Footer Panel
    const footerY = 1520;
    ctx.font = "700 42px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#FAFAFA";
    ctx.textAlign = "left";
    ctx.fillText(`@${authorName}`, 100, footerY);

    ctx.font = "500 28px 'Inter', sans-serif";
    ctx.fillStyle = "#A1A1AA";
    ctx.fillText(`Shared to #${roomCode}`, 100, footerY + 50);

    ctx.font = "600 24px 'Inter', sans-serif";
    ctx.fillStyle = themeAccent;
    ctx.fillText("Scan to join the live social wall →", 100, footerY + 100);

    // QR Code on right
    ctx.drawImage(qrImage, width - 320, footerY - 50, 220, 220);
  } else {
    // --- Polaroid Format (1080 x 1350) ---
    const polX = 80;
    const polY = 60;
    const polW = width - 160;
    const polH = 1220;

    // Polaroid card paper
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 15;
    roundRect(ctx, polX, polY, polW, polH, 20);
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Inner photo
    const innerPadding = 36;
    const innerX = polX + innerPadding;
    const innerY = polY + innerPadding;
    const innerW = polW - innerPadding * 2;
    const innerH = 920;

    ctx.save();
    roundRect(ctx, innerX, innerY, innerW, innerH, 8);
    ctx.clip();
    drawCoverImage(ctx, photo, innerX, innerY, innerW, innerH);
    ctx.restore();

    // Frame border over inner photo if not classic
    drawFrame(ctx, frameId, innerX, innerY, innerW, innerH, themeAccent);

    // Polaroid Footer Details
    ctx.font = "800 44px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.textAlign = "left";
    ctx.fillText(authorName, innerX + 10, innerY + innerH + 80);

    ctx.font = "600 26px 'Inter', sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText(`${roomTitle} • #${roomCode}`, innerX + 10, innerY + innerH + 130);

    // QR Code in bottom right of polaroid
    ctx.drawImage(qrImage, polX + polW - 200, innerY + innerH + 20, 160, 160);
  }

  return canvas;
}

export async function exportVibeCardPNG(options: VibeCardOptions, filename = "vibewall-card.png"): Promise<void> {
  const canvas = await generateVibeCardCanvas(options);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Canvas export failed"));
        return;
      }

      // Try Web Share API with files if mobile supports it
      const file = new File([blob], filename, { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: options.roomTitle,
            text: `VibeWall moment by ${options.authorName} in #${options.roomCode}`,
          });
          resolve();
          return;
        } catch {
          // Fall through to normal browser download on dismissal or error
        }
      }

      // Fallback: standard anchor download
      const link = document.createElement("a");
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      resolve();
    }, "image/png");
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create a fallback solid image if remote asset blocked by CORS
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 400;
      fallbackCanvas.height = 400;
      const fctx = fallbackCanvas.getContext("2d")!;
      fctx.fillStyle = "#8B5CF6";
      fctx.fillRect(0, 0, 400, 400);
      fctx.fillStyle = "#FFFFFF";
      fctx.font = "bold 32px sans-serif";
      fctx.textAlign = "center";
      fctx.fillText("VibeWall Photo", 200, 210);
      const fallbackImg = new Image();
      fallbackImg.src = fallbackCanvas.toDataURL();
      fallbackImg.onload = () => resolve(fallbackImg);
    };
    img.src = src;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;
  let sx = 0;
  let sy = 0;

  if (imgRatio > boxRatio) {
    sWidth = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string
) {
  ctx.save();
  if (frameId === "neon") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 24);
    ctx.stroke();
  } else if (frameId === "fest26") {
    ctx.strokeStyle = "#EC4899";
    ctx.lineWidth = 16;
    ctx.shadowColor = "#8B5CF6";
    ctx.shadowBlur = 24;
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 28);
    ctx.stroke();
  } else if (frameId === "sunset") {
    ctx.strokeStyle = "#F97316";
    ctx.lineWidth = 12;
    roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 20);
    ctx.stroke();
  } else if (frameId === "classic") {
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 4;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 20);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) || 139;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 92;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 246;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
