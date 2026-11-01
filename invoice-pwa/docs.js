// Plain-text documents with a tiny markup: "# " headings, "- " bullets, blank line = new paragraph.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function fill(body, vars) {
  return String(body).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== "" ? vars[k] : m));
}

export function render(body) {
  const html = [];
  let list = false, para = [];
  const flushPara = () => { if (para.length) { html.push(`<p>${para.join("<br>")}</p>`); para = []; } };
  const closeList = () => { if (list) { html.push("</ul>"); list = false; } };
  for (const line of String(body).split(/\r?\n/)) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (h) { flushPara(); closeList(); html.push(`<h${h[1].length + 1}>${esc(h[2])}</h${h[1].length + 1}>`); }
    else if (li) { flushPara(); if (!list) { html.push("<ul>"); list = true; } html.push(`<li>${esc(li[1])}</li>`); }
    else if (line.trim() === "") { flushPara(); closeList(); }
    else { closeList(); para.push(esc(line)); }
  }
  flushPara(); closeList();
  return html.join("\n");
}

// Names of {{placeholders}} still unfilled, so the UI can warn before printing.
export function missing(body) {
  return [...new Set([...String(body).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
}
