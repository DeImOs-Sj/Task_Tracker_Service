import type { IAttachment } from "./models/Task";

export const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB per PDF attachment
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB per video
export const MAX_ATTACHMENTS_PER_TASK = 10;

function randId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function clampString(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.length > max ? s.slice(0, max) : s;
}

function isHttpUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isPdfDataUrl(d: string): boolean {
  return /^data:application\/pdf;base64,/.test(d);
}

function isImageDataUrl(d: string): boolean {
  return /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(d);
}

function isVideoDataUrl(d: string): boolean {
  return /^data:video\/(mp4|webm|ogg|quicktime);base64,/.test(d);
}

function approxBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : "";
  return Math.floor((b64.length * 3) / 4);
}

// Normalize + validate incoming attachments from an untrusted request body.
// Drops anything malformed rather than throwing so a single bad attachment
// doesn't poison the whole create/update call.
export function sanitizeAttachments(raw: unknown): IAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: IAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const type = a.type;
    if (type !== "link" && type !== "pdf" && type !== "note" && type !== "image" && type !== "video") continue;
    const base: IAttachment = {
      id: typeof a.id === "string" && a.id ? a.id : randId(),
      type,
      name: clampString(a.name, 200),
      createdAt: new Date(),
    };
    if (type === "link") {
      const url = typeof a.url === "string" ? a.url.trim() : "";
      if (!isHttpUrl(url)) continue;
      base.url = url;
      if (!base.name) base.name = url;
    } else if (type === "pdf") {
      const data = typeof a.data === "string" ? a.data : "";
      if (!isPdfDataUrl(data)) continue;
      // Rough base64 size check: ~3/4 of the string length after the header.
      const commaIdx = data.indexOf(",");
      const b64 = commaIdx >= 0 ? data.slice(commaIdx + 1) : "";
      const approxBytes = Math.floor((b64.length * 3) / 4);
      if (approxBytes > MAX_PDF_BYTES) continue;
      base.data = data;
      if (!base.name) base.name = "document.pdf";
    } else if (type === "note") {
      const content = clampString(a.content, 20000);
      if (!content.trim()) continue;
      base.content = content;
      if (!base.name) base.name = "Note";
    } else if (type === "image") {
      const data = typeof a.data === "string" ? a.data : "";
      if (!isImageDataUrl(data)) continue;
      if (approxBase64Bytes(data) > MAX_IMAGE_BYTES) continue;
      base.data = data;
      if (!base.name) base.name = "image";
    } else if (type === "video") {
      const data = typeof a.data === "string" ? a.data : "";
      if (!isVideoDataUrl(data)) continue;
      if (approxBase64Bytes(data) > MAX_VIDEO_BYTES) continue;
      base.data = data;
      if (!base.name) base.name = "video";
    }
    out.push(base);
    if (out.length >= MAX_ATTACHMENTS_PER_TASK) break;
  }
  return out;
}

export function serializeAttachment(a: IAttachment) {
  return {
    id: a.id,
    type: a.type,
    name: a.name,
    url: a.url,
    data: a.data,
    content: a.content,
  };
}
