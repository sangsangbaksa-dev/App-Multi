// Video projects: revision rounds, timecoded requests, deliveries, approval, and billing for extra rounds.
// Everything here is pure (no DOM, no storage) so it can be tested on its own.

export const FREE_VIDEO = 1;
export const SCHEMA = 1;
export const STATUSES = ["working", "review", "revising", "approved"];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// "1:24" -> 84, "01:02:03" -> 3723, "" -> null (no timecode), junk -> NaN
export function parseTimecode(str) {
  const s = String(str ?? "").trim();
  if (!s) return null;
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return NaN;
  const [h, mi, se] = [Number(m[1] || 0), Number(m[2]), Number(m[3])];
  if (se > 59 || (m[1] !== undefined && mi > 59)) return NaN;
  return h * 3600 + mi * 60 + se;
}

export function formatTimecode(sec) {
  if (sec == null || !Number.isFinite(sec)) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function newProject(id, today, defaults = {}) {
  return {
    id, title: "", client: "", status: "working", due: "", included: 2, fee: 0, base: 0,
    currency: defaults.currency || "USD", rounds: 0, billedRounds: 0,
    requests: [], deliveries: [], approval: null, created: today, ...defaults,
  };
}

// Requests belong to a round. Round 1 starts with the first change list the client sends.
export function addRound(p) {
  return { ...p, rounds: p.rounds + 1, status: "revising", approval: null };
}

export function addRequest(p, { tc, text, by }, id, today) {
  const sec = parseTimecode(tc);
  if (Number.isNaN(sec)) return { error: "tc" };
  const body = String(text ?? "").trim();
  if (!body) return { error: "text" };
  const base = p.rounds === 0 ? addRound(p) : p;
  const req = { id, round: base.rounds, tc: sec, text: body, by: String(by ?? "").trim(), date: today, done: false };
  return { project: { ...base, requests: [...base.requests, req] } };
}

export function editRequest(p, reqId, { tc, text, by }) {
  const sec = parseTimecode(tc);
  if (Number.isNaN(sec)) return { error: "tc" };
  const body = String(text ?? "").trim();
  if (!body) return { error: "text" };
  return { project: { ...p, requests: p.requests.map((r) => (r.id === reqId ? { ...r, tc: sec, text: body, by: String(by ?? "").trim() } : r)) } };
}

export function toggleRequest(p, reqId) {
  return { ...p, requests: p.requests.map((r) => (r.id === reqId ? { ...r, done: !r.done } : r)) };
}
export function removeRequest(p, reqId) {
  return { ...p, requests: p.requests.filter((r) => r.id !== reqId) };
}

// Requests of one round in timeline order; requests without a timecode go last, in the order they came in.
export function requestsOf(p, round) {
  return p.requests
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.round === round)
    .sort((a, b) => (a.r.tc ?? Infinity) - (b.r.tc ?? Infinity) || a.i - b.i)
    .map((x) => x.r);
}

export const openCount = (p) => p.requests.filter((r) => r.round === p.rounds && !r.done).length;

export function validUrl(u) {
  try { const x = new URL(String(u).trim()); return x.protocol === "https:" || x.protocol === "http:"; } catch { return false; }
}

export function addDelivery(p, { label, url }, id, today) {
  if (!validUrl(url)) return { error: "url" };
  const d = { id, label: String(label ?? "").trim() || `v${p.deliveries.length + 1}`, url: String(url).trim(), date: today, final: false };
  return { project: { ...p, deliveries: [...p.deliveries, d], status: p.status === "approved" ? "approved" : "review" } };
}
export function markFinal(p, delId) {
  return { ...p, deliveries: p.deliveries.map((d) => ({ ...d, final: d.id === delId ? !d.final : false })) };
}
export function removeDelivery(p, delId) {
  return { ...p, deliveries: p.deliveries.filter((d) => d.id !== delId) };
}

export function approve(p, by, today) {
  return { ...p, approval: { by: String(by ?? "").trim(), date: today }, status: "approved" };
}
export function clearApproval(p) {
  return { ...p, approval: null, status: p.status === "approved" ? "review" : p.status };
}

// ---- money ----
export const extraRounds = (p) => Math.max(0, p.rounds - Math.max(0, Number(p.included) || 0));
export const unbilledRounds = (p) => Math.max(0, extraRounds(p) - (p.billedRounds || 0));
export const extraCost = (p) => round2(unbilledRounds(p) * (Number(p.fee) || 0));

// Invoice lines for every extra round not billed yet. `label(n)` supplies the translated description.
// Nothing is marked as billed here: the invoice carries `upTo` and the app calls markBilled once it is saved,
// so an invoice that is abandoned in the editor does not eat the rounds.
export function billExtra(p, label) {
  const n = unbilledRounds(p);
  if (!n) return { items: [], upTo: p.billedRounds || 0 };
  const first = (p.billedRounds || 0) + Math.max(0, Number(p.included) || 0) + 1;
  const items = Array.from({ length: n }, (_, k) => ({ desc: label(first + k), qty: 1, price: Number(p.fee) || 0 }));
  return { items, upTo: extraRounds(p) };
}
export const markBilled = (p, upTo) => ({ ...p, billedRounds: Math.max(p.billedRounds || 0, Math.min(Number(upTo) || 0, extraRounds(p))) });
export const resetBilled = (p) => ({ ...p, billedRounds: 0 });

// The agreed project price as one invoice or quote line.
export const projectItems = (p) => [{ desc: p.title || "", qty: 1, price: Number(p.base) || 0 }];

// Same client and terms again, without the history.
export function duplicate(p, id, today) {
  return { ...p, id, status: "working", due: "", rounds: 0, billedRounds: 0, requests: [], deliveries: [], approval: null, created: today };
}

// ---- summaries and export ----
export function isLate(p, today) {
  return !!p.due && p.status !== "approved" && p.due < today;
}

// Past due first, then by delivery date (no date last), finished work at the bottom.
export function sortProjects(list, today) {
  const rank = (p) => (p.status === "approved" ? 2 : isLate(p, today) ? 0 : 1);
  return [...list].sort((a, b) => rank(a) - rank(b) || (a.due || "9999").localeCompare(b.due || "9999") || (b.created || "").localeCompare(a.created || ""));
}

export function summary(list, today) {
  const active = list.filter((p) => p.status !== "approved");
  return { active: active.length, late: active.filter((p) => isLate(p, today)).length, open: list.reduce((n, p) => n + openCount(p), 0) };
}

// Spreadsheet programs run cells that start with = + - @ as formulas, so text from clients gets a leading quote.
const safe = (v) => (/^[=+\-@]/.test(v) ? `'${v}` : v);

export function toRows(p, t) {
  const head = [t.round, t.tc, t.text, t.by, t.date, t.done];
  const rows = [];
  for (let r = 1; r <= p.rounds; r++) {
    for (const q of requestsOf(p, r)) rows.push([String(r), formatTimecode(q.tc), safe(q.text), safe(q.by), q.date, q.done ? "1" : "0"]);
  }
  return [head, ...rows];
}

// Plain text for pasting into a chat or an email.
export function toText(p, t) {
  const out = [`${p.title}${p.client ? ` · ${p.client}` : ""}`];
  for (let r = 1; r <= p.rounds; r++) {
    out.push("", t.roundTitle(r));
    for (const q of requestsOf(p, r)) out.push(`${q.done ? "[x]" : "[ ]"} ${q.tc == null ? "--" : formatTimecode(q.tc)}  ${q.text}${q.by ? ` (${q.by})` : ""}`);
  }
  return out.join("\n");
}

// ---- restore checks ----
export function validProject(p) {
  return !!p && typeof p === "object" && typeof p.id === "string" && typeof p.title === "string" &&
    STATUSES.includes(p.status) && Number.isInteger(p.rounds) && p.rounds >= 0 && Number.isInteger(p.billedRounds) && p.billedRounds >= 0 &&
    /^[A-Z]{3}$/.test(p.currency || "") && (p.due === "" || isDate(p.due)) &&
    Array.isArray(p.requests) && p.requests.every((r) => r && typeof r.id === "string" && Number.isInteger(r.round) && typeof r.text === "string" && (r.tc === null || Number.isFinite(r.tc))) &&
    Array.isArray(p.deliveries) && p.deliveries.every((d) => d && typeof d.id === "string" && validUrl(d.url));
}
