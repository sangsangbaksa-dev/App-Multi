/* Shadepad core: pure logic. No DOM, no network, no storage.
   findAll() finds likely sensitive values with patterns and checks (no AI).
   redact() replaces them with numbered tags such as [EMAIL_1] and returns the originals in a map.
   restore() puts the originals back into text (an AI reply) that carries those tags. */
(function (root) {
  'use strict';

  function digitsOf(s) { return s.replace(/\D/g, ''); }

  function luhn(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var d = num.charCodeAt(i) - 48;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function entropy(v) {
    var counts = {}, i;
    for (i = 0; i < v.length; i++) counts[v[i]] = (counts[v[i]] || 0) + 1;
    var h = 0;
    Object.keys(counts).forEach(function (c) {
      var p = counts[c] / v.length;
      h -= p * Math.log2(p);
    });
    return h;
  }

  /* IBAN: ISO 13616 mod-97 check. */
  function ibanOk(v) {
    var c = v.replace(/ /g, '');
    if (c.length < 15 || c.length > 34) return false;
    var moved = c.slice(4) + c.slice(0, 4), rem = 0;
    for (var i = 0; i < moved.length; i++) {
      var code = moved.charCodeAt(i);
      var piece = code >= 65 && code <= 90 ? String(code - 55) : moved[i];
      for (var j = 0; j < piece.length; j++) rem = (rem * 10 + (piece.charCodeAt(j) - 48)) % 97;
    }
    return rem === 1;
  }

  /* US Social Security number: area not 000, 666 or 9xx; group not 00; serial not 0000. */
  function ssnOk(v) {
    var p = v.split('-');
    return p[0] !== '000' && p[0] !== '666' && p[0].charAt(0) !== '9' && p[1] !== '00' && p[2] !== '0000';
  }

  /* Order matters: an earlier rule claims its text first, so a card number is not also a phone number. */
  var RULES = [
    { kind: 'PRIVATE_KEY', re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g },
    /* Credentials in a URL: scheme://user:password@host. Only the password is hidden. */
    { kind: 'SECRET', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:\/@"']+:([^\s\/@"']{4,})@/gi, group: 1 },
    { kind: 'API_KEY', re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g },
    { kind: 'API_KEY', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
    { kind: 'API_KEY', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
    { kind: 'API_KEY', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    { kind: 'API_KEY', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
    { kind: 'API_KEY', re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
    { kind: 'API_KEY', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
    { kind: 'API_KEY', re: /\bwhsec_[A-Za-z0-9]{24,}\b/g },
    { kind: 'API_KEY', re: /\bGOCSPX-[A-Za-z0-9_-]{24,}/g },
    { kind: 'API_KEY', re: /\bSK[0-9a-fA-F]{32}\b/g },
    { kind: 'API_KEY', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
    { kind: 'API_KEY', re: /\bhf_[A-Za-z0-9]{34}\b/g },
    { kind: 'API_KEY', re: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g },
    { kind: 'API_KEY', re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g },
    { kind: 'TOKEN', re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
    /* Key then : or =, with optional quotes around the key (JSON) and the value (quoted values may hold spaces). */
    {
      kind: 'SECRET',
      re: /\b[\w.-]*?(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret)\b["']?\s*[:=]\s*(?:"([^"\r\n]{4,})"|'([^'\r\n]{4,})'|([^\s"',;&]{4,}))/gi,
      group: [1, 2, 3]
    },
    /* Bearer and Basic credentials in an Authorization header or a curl line. */
    { kind: 'TOKEN', re: /\b(?:Bearer|Basic)\s+([A-Za-z0-9._~+\/=-]{16,})/g, group: 1 },
    { kind: 'ID_NUMBER', re: /(?<!\d)\d{6}-[1-4]\d{6}(?!\d)/g },
    { kind: 'BANK_ACCOUNT', re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g, check: ibanOk },
    { kind: 'SSN', re: /(?<![\d-])\d{3}-\d{2}-\d{4}(?![\d-])/g, check: ssnOk },
    {
      kind: 'CARD', re: /(?<![\w-])(?:\d[ -]?){12,18}\d(?![\w-])/g,
      check: function (v) { var d = digitsOf(v); return d.length >= 13 && d.length <= 19 && luhn(d); }
    },
    { kind: 'EMAIL', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
    {
      kind: 'PHONE', re: /(?<![\w+])(?:\+\d{1,3}[ .-]?)?\(?\d{2,4}\)?[ .-]\d{3,4}[ .-]\d{4}(?!\w)/g,
      check: function (v) { var d = digitsOf(v); return d.length >= 9 && d.length <= 15 && (v.charAt(0) === '+' || d.length <= 11); }
    },
    { kind: 'IP', re: /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?!\d|\.\d)/g },
    /* Bare hex strings (hashes, tokens, IDs) of 32+ chars that mix letters and digits. */
    {
      kind: 'TOKEN', re: /\b[0-9a-fA-F]{32,}\b/g,
      check: function (v) { return /[a-fA-F]/.test(v) && /[0-9]/.test(v); }
    },
    /* Random-looking mixed-case tokens of 32+ chars. Identifiers and words sit well below this entropy. */
    {
      kind: 'TOKEN', re: /\b[A-Za-z0-9_-]{32,}\b/g,
      check: function (v) { return /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v) && entropy(v) >= 4; }
    }
  ];

  /* The first capture group that matched; a rule may list several alternatives. */
  function groupValue(m, group) {
    var list = [].concat(group);
    for (var i = 0; i < list.length; i++) if (m[list[i]]) return m[list[i]];
    return '';
  }

  /* Returns [{ kind, value, start, end }] sorted by position. Overlaps keep the earlier rule. */
  function findAll(text, keep) {
    var src = String(text == null ? '' : text);
    var taken = [], out = [];
    RULES.forEach(function (rule) {
      var re = new RegExp(rule.re.source, rule.re.flags);
      var m;
      while ((m = re.exec(src)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        var value = rule.group ? groupValue(m, rule.group) : m[0];
        if (!value) continue;
        var start = rule.group ? m.index + m[0].lastIndexOf(value) : m.index;
        var end = start + value.length;
        if (rule.check && !rule.check(value)) continue;
        var clash = taken.some(function (s) { return start < s[1] && s[0] < end; });
        if (clash) continue;
        taken.push([start, end]);
        if (keep && keep.indexOf(value) >= 0) continue; // the user chose to leave this one visible
        out.push({ kind: rule.kind, value: value, start: start, end: end });
      }
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  /* The same value always gets the same tag. Returns { text, map: { tag: original }, counts: { kind: distinct values }, occurrences }. */
  function redact(input, opts) {
    var src = String(input == null ? '' : input);
    var found = findAll(src, opts && opts.keep);
    var perKind = {}, tagOf = {}, map = {}, parts = [], last = 0;
    found.forEach(function (f) {
      var key = f.kind + '\n' + f.value;
      var tag = tagOf[key];
      if (!tag) {
        perKind[f.kind] = (perKind[f.kind] || 0) + 1;
        tag = '[' + f.kind + '_' + perKind[f.kind] + ']';
        tagOf[key] = tag;
        map[tag] = f.value;
      }
      parts.push(src.slice(last, f.start), tag);
      last = f.end;
    });
    parts.push(src.slice(last));
    return { text: parts.join(''), map: map, counts: perKind, occurrences: found.length };
  }

  /* Replaces every known tag with its original value in one pass. An AI reply often changes a tag a little:
     it may escape the brackets (\[EMAIL_1\]), drop them (EMAIL_1) or add spaces ([ EMAIL_1 ]). Those count too.
     Unknown tags are left as they are. Returns { text, replaced }. */
  function restore(input, map) {
    var s = String(input == null ? '' : input), replaced = 0, lookup = {}, unknown = [];
    Object.keys(map || {}).forEach(function (tag) {
      var m = /^\[([A-Z_]+)_(\d+)\]$/.exec(tag);
      if (m) lookup[m[1] + '_' + m[2]] = map[tag];
    });
    var re = /\\?\[\s*([A-Z][A-Z_]*?)_(\d+)\s*\\?\]|(?<![A-Za-z0-9_])([A-Z][A-Z_]*?)_(\d+)(?![A-Za-z0-9_])/g;
    s = s.replace(re, function (all, k1, n1, k2, n2) {
      var key = (k1 || k2) + '_' + (k1 ? n1 : n2);
      if (!Object.prototype.hasOwnProperty.call(lookup, key)) {
        var tag = '[' + key + ']';
        if (k1 && unknown.indexOf(tag) < 0) unknown.push(tag);
        return all;
      }
      replaced++;
      return lookup[key];
    });
    return { text: s, replaced: replaced, unknown: unknown };
  }

  /* A short, partly masked view of a value, for the list on screen. */
  function preview(value) {
    var v = String(value == null ? '' : value);
    if (v.indexOf('\n') >= 0) return '(multi-line)';
    if (v.length <= 6) return '•••';
    return v.slice(0, 3) + '•••' + v.slice(-2);
  }

  var SP = { findAll: findAll, redact: redact, restore: restore, preview: preview, luhn: luhn };
  if (typeof module !== 'undefined' && module.exports) module.exports = SP;
  else root.SP = SP;
})(typeof window !== 'undefined' ? window : globalThis);
