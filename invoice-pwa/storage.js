// Schema bookkeeping for localStorage. Takes any object with getItem/setItem so tests can pass a plain Map wrapper.
// Rule: data written by an older version is copied to a ".bak-vN" key before anything new touches it, and
// data written by a newer version is never overwritten.
import { SCHEMA as VIDEO_SCHEMA } from "./video.js";

export const APP_SCHEMA = 2; // 1 = invoices, sheets, docs only. 2 = adds the video module under its own key.

export function ensureSchema(ls) {
  let meta = null;
  try { meta = JSON.parse(ls.getItem("qb.meta")); } catch {}
  const have = Number(meta?.schema) || 1;
  if (have > APP_SCHEMA) return { schema: have, locked: true };
  if (have < APP_SCHEMA) {
    // One copy of everything the old version wrote, so a bad migration can always be undone by hand.
    for (const k of ["qb.invoices", "qb.sheets", "qb.docs", "qb.templates"]) {
      const raw = ls.getItem(k);
      if (raw != null && ls.getItem(`${k}.bak-v${have}`) == null) ls.setItem(`${k}.bak-v${have}`, raw);
    }
    ls.setItem("qb.meta", JSON.stringify({ schema: APP_SCHEMA }));
  }
  return { schema: APP_SCHEMA, locked: false };
}

// The video key holds { v, projects }. A missing key is empty; a newer v is returned read-only.
export function readVideo(ls) {
  let raw = null;
  try { raw = JSON.parse(ls.getItem("qb.video")); } catch { return { projects: [], locked: false, broken: ls.getItem("qb.video") != null }; }
  if (raw == null) return { projects: [], locked: false };
  if (Array.isArray(raw)) return { projects: raw, locked: false };
  if (Number(raw.v) > VIDEO_SCHEMA) return { projects: Array.isArray(raw.projects) ? raw.projects : [], locked: true };
  return { projects: Array.isArray(raw.projects) ? raw.projects : [], locked: false };
}

// Writes the new value and keeps the previous one under qb.video.bak, so one bad edit is recoverable.
export function writeVideo(ls, projects) {
  const prev = ls.getItem("qb.video");
  if (prev != null) ls.setItem("qb.video.bak", prev);
  ls.setItem("qb.video", JSON.stringify({ v: VIDEO_SCHEMA, projects }));
}
