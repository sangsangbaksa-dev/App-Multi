// Small spreadsheet engine: cell references, + - * / ^, SUM/AVERAGE/MIN/MAX/COUNT/ROUND/ABS/IF.
// Formulas are parsed by hand; nothing here ever calls eval.

export const colName = (i) => {
  let s = "";
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
export const colIndex = (name) => [...name].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
export const refOf = (c, r) => colName(c) + (r + 1);
const parseRef = (ref) => {
  const m = /^([A-Z]{1,2})(\d{1,4})$/.exec(ref);
  return m ? { c: colIndex(m[1]), r: Number(m[2]) - 1 } : null;
};

const TOKEN = /\s*(?:(\d+\.?\d*|\.\d+)|([A-Z]{1,2}\d{1,4}:[A-Z]{1,2}\d{1,4})|([A-Z]{1,2}\d{1,4})|([A-Z]+)(?=\()|(<=|>=|<>|[-+*/^(),<>=]))/y;

function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(src);
    if (!m) throw new SheetError("#ERR!");
    if (m[1] !== undefined) out.push({ t: "num", v: parseFloat(m[1]) });
    else if (m[2]) out.push({ t: "range", v: m[2] });
    else if (m[3]) out.push({ t: "ref", v: m[3] });
    else if (m[4]) out.push({ t: "fn", v: m[4] });
    else out.push({ t: "op", v: m[5] });
  }
  return out;
}

class SheetError extends Error {}

// Evaluates one sheet. `cells` maps "A1" -> raw text. Returns a function get(ref) -> value.
export function evaluate(cells) {
  const cache = new Map();
  const busy = new Set();

  function get(ref) {
    if (cache.has(ref)) return cache.get(ref);
    const raw = cells[ref];
    let v;
    if (raw === undefined || raw === "") v = "";
    else if (typeof raw === "string" && raw[0] === "=") {
      if (busy.has(ref)) return "#CYCLE!";
      busy.add(ref);
      try { v = run(raw.slice(1)); } catch (e) { v = e instanceof SheetError ? e.message : "#ERR!"; }
      busy.delete(ref);
    } else {
      const n = Number(String(raw).replace(/,/g, ""));
      v = String(raw).trim() !== "" && Number.isFinite(n) ? n : String(raw);
    }
    cache.set(ref, v);
    return v;
  }

  const num = (v) => {
    if (typeof v === "string" && v.startsWith("#")) throw new SheetError(v);
    if (v === "" || v == null) return 0;
    if (typeof v === "boolean") return v ? 1 : 0;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) throw new SheetError("#VALUE!");
    return n;
  };
  const rangeCells = (spec) => {
    const [a, b] = spec.split(":").map(parseRef);
    const out = [];
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
      for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) out.push(get(refOf(c, r)));
    return out;
  };

  function run(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const eat = (v) => { if (peek()?.t === "op" && peek().v === v) { p++; return true; } return false; };

    function compare() {
      let l = add();
      while (peek()?.t === "op" && ["<", ">", "<=", ">=", "=", "<>"].includes(peek().v)) {
        const op = toks[p++].v, r = add();
        const a = num(l), b = num(r);
        l = op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : op === ">=" ? a >= b : op === "=" ? a === b : a !== b;
      }
      return l;
    }
    function add() {
      let l = mul();
      while (peek()?.t === "op" && (peek().v === "+" || peek().v === "-")) {
        const op = toks[p++].v, r = mul();
        l = op === "+" ? num(l) + num(r) : num(l) - num(r);
      }
      return l;
    }
    function mul() {
      let l = pow();
      while (peek()?.t === "op" && (peek().v === "*" || peek().v === "/")) {
        const op = toks[p++].v, r = pow();
        if (op === "/") { if (num(r) === 0) throw new SheetError("#DIV/0!"); l = num(l) / num(r); }
        else l = num(l) * num(r);
      }
      return l;
    }
    function pow() {
      const base = unary();
      return eat("^") ? Math.pow(num(base), num(pow())) : base;
    }
    function unary() {
      if (eat("-")) return -num(unary());
      if (eat("+")) return num(unary());
      return atom();
    }
    function atom() {
      const t = toks[p++];
      if (!t) throw new SheetError("#ERR!");
      if (t.t === "num") return t.v;
      if (t.t === "ref") return get(t.v);
      if (t.t === "range") throw new SheetError("#VALUE!");
      if (t.t === "op" && t.v === "(") {
        const v = compare();
        if (!eat(")")) throw new SheetError("#ERR!");
        return v;
      }
      if (t.t === "fn") {
        if (!eat("(")) throw new SheetError("#ERR!");
        const args = [];
        if (!eat(")")) {
          do {
            if (peek()?.t === "range") args.push({ range: rangeCells(toks[p++].v) });
            else args.push(compare());
          } while (eat(","));
          if (!eat(")")) throw new SheetError("#ERR!");
        }
        return call(t.v, args);
      }
      throw new SheetError("#ERR!");
    }

    const out = compare();
    if (p < toks.length) throw new SheetError("#ERR!");
    return typeof out === "boolean" ? (out ? 1 : 0) : out;
  }

  // Ranges only count numbers, like a normal spreadsheet; a stray text cell is ignored.
  function flat(args) {
    const nums = [];
    for (const a of args) {
      if (a && a.range) {
        for (const v of a.range) {
          if (typeof v === "string" && v.startsWith("#")) throw new SheetError(v);
          if (typeof v === "number") nums.push(v);
        }
      } else nums.push(num(a));
    }
    return nums;
  }
  function call(name, args) {
    const n = flat(args);
    switch (name) {
      case "SUM": return n.reduce((a, b) => a + b, 0);
      case "AVERAGE": if (!n.length) throw new SheetError("#DIV/0!"); return n.reduce((a, b) => a + b, 0) / n.length;
      case "MIN": return n.length ? Math.min(...n) : 0;
      case "MAX": return n.length ? Math.max(...n) : 0;
      case "COUNT": return n.length;
      case "ABS": return Math.abs(num(args[0]));
      case "ROUND": { const k = Math.pow(10, args[1] === undefined ? 0 : num(args[1])); return Math.round((num(args[0]) + Number.EPSILON) * k) / k; }
      case "IF": return num(args[0]) ? (args[1] ?? 0) : (args[2] ?? 0);
      default: throw new SheetError("#NAME?");
    }
  }
  return get;
}

export function display(v) {
  if (typeof v === "number") return String(Math.round((v + Number.EPSILON) * 1e6) / 1e6);
  return String(v ?? "");
}

// ---- CSV ----
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
export function toCSV(rows) {
  return rows.map((r) => r.map((v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n");
}

// Grid <-> cells map
export function rowsToCells(rows) {
  const cells = {};
  rows.forEach((r, ri) => r.forEach((v, ci) => { if (v !== "") cells[refOf(ci, ri)] = v; }));
  return cells;
}
export function sheetSize(cells, minRows = 20, minCols = 8) {
  let rows = minRows, cols = minCols;
  for (const k of Object.keys(cells)) {
    const p = parseRef(k);
    if (p) { rows = Math.max(rows, p.r + 1); cols = Math.max(cols, p.c + 1); }
  }
  return { rows, cols };
}
// Computed values as a CSV-ready matrix (what you'd see on screen).
export function computedRows(cells, rows, cols) {
  const get = evaluate(cells);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => display(get(refOf(c, r)))));
}
// Drops empty rows at the bottom and empty columns at the right.
export function trimRows(rows) {
  let last = rows.length;
  while (last > 0 && rows[last - 1].every((v) => v === "")) last--;
  const kept = rows.slice(0, last);
  const width = kept.reduce((w, r) => { let n = r.length; while (n > 0 && r[n - 1] === "") n--; return Math.max(w, n); }, 0);
  return kept.map((r) => r.slice(0, width));
}

// Rows shaped like  description | quantity | price  become invoice lines.
export function invoiceLines(cells, rows) {
  const get = evaluate(cells);
  const out = [];
  for (let r = 0; r < rows; r++) {
    const desc = get(refOf(0, r)), qty = get(refOf(1, r)), price = get(refOf(2, r));
    if (typeof qty === "number" && typeof price === "number" && desc !== "") out.push({ desc: String(desc), qty, price });
  }
  return out;
}
