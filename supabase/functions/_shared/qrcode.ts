import QRCode from "npm:qrcode@1.5.4";

// Evolution API sometimes returns a ready-made "base64" PNG data URI, and
// sometimes only the raw "code" string (the QR payload itself) — e.g. when
// base64 rendering is disabled on that Evolution instance/version. Treating
// "code" as if it were base64 image bytes produces a broken image, so render
// it into a real QR PNG ourselves when that's all we got.
export async function buildQrDataUrl(
  base64?: string | null,
  code?: string | null,
): Promise<string | null> {
  if (base64) {
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  }
  if (code) {
    try {
      return await QRCode.toDataURL(code, { margin: 1, width: 320 });
    } catch (err) {
      console.error("Failed to render QR code from raw code string:", err);
      return null;
    }
  }
  return null;
}
