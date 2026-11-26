import QRCode from "qrcode";

export function roomQrDataUrl(origin: string, code: string, width: number) {
  return QRCode.toDataURL(`${origin}/r/${encodeURIComponent(code)}`, {
    width,
    margin: 4,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
