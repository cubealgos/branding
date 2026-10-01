// SPDX-License-Identifier: Apache-2.0

// The dependency-licence policy, a mechanical copy of
// standards/legal/dependency-license-policy.md in the cubealgos heimathafen
// (the source of truth; update both together), and the lockfile check.

export const allowedLicences = new Set([
  'MIT', 'Apache-2.0', 'Apache-2.0 WITH LLVM-exception', 'BSD-2-Clause', 'BSD-3-Clause',
  'Unicode-3.0', 'Unlicense', 'CC0-1.0', 'Zlib', 'ISC', 'PSF-2.0', 'BlueOak-1.0.0', 'MIT-0', '0BSD',
]);

export const mplLicence = 'MPL-2.0';

/** SPDX ids read as another allowed id. */
const aliases = { 'Python-2.0': 'PSF-2.0' };

/** Denied outright: no exception reaches these. */
export const isDeniedFamily = (id) => /^(A?GPL|LGPL|SSPL|BUSL)/i.test(id);

/**
 * Classifies one SPDX id: 'allowed', 'denied', 'mpl' or 'unknown'.
 */
export function classify(rawId) {
  const id = aliases[rawId] ?? rawId;
  if (allowedLicences.has(id)) return 'allowed';
  if (isDeniedFamily(id)) return 'denied';
  if (id === mplLicence) return 'mpl';
  return 'unknown';
}

/** Extracts the licence expression of a lockfile entry, or null if absent. */
export function licenceOf(entry) {
  const l = entry.license;
  if (typeof l === 'string') return l;
  if (l && typeof l.type === 'string') return l.type;
  if (Array.isArray(entry.licenses)) return entry.licenses.map((x) => x.type ?? x).join(' OR ');
  return null;
}

/**
 * Evaluates an SPDX expression (OR / AND, parentheses, WITH): an OR is
 * satisfied by its best alternative, an AND needs all its parts. Returns
 * 'allowed', 'denied', 'mpl' or 'unknown'.
 */
export function classifyExpression(expr) {
  const rank = { allowed: 0, mpl: 1, unknown: 2, denied: 3 };
  const worst = (xs) => xs.reduce((a, b) => (rank[b] > rank[a] ? b : a));
  const best = (xs) => xs.reduce((a, b) => (rank[b] < rank[a] ? b : a));
  const tokens = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean);
  let i = 0;
  function parseOr() {
    const parts = [parseAnd()];
    while (tokens[i] === 'OR') { i++; parts.push(parseAnd()); }
    return best(parts);
  }
  function parseAnd() {
    const parts = [parseAtom()];
    while (tokens[i] === 'AND') { i++; parts.push(parseAtom()); }
    return worst(parts);
  }
  function parseAtom() {
    if (tokens[i] === '(') {
      i++;
      const r = parseOr();
      if (tokens[i] === ')') i++;
      return r;
    }
    let id = tokens[i++] ?? '';
    if (tokens[i] === 'WITH') { id += ` WITH ${tokens[i + 1]}`; i += 2; }
    return classify(id.replace(/\+$/, ''));
  }
  const r = parseOr();
  return i < tokens.length ? 'unknown' : r;
}

/** Package name of a lockfile path (`node_modules/a/node_modules/@s/b` is `@s/b`). */
export const nameOf = (path) => path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);

/** Parses docs/licence-exceptions.toml (`[[exceptions]]` tables of string keys). */
export function parseExceptions(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line === '[[exceptions]]') { cur = {}; out.push(cur); continue; }
    const m = /^([a-z_]+)\s*=\s*"(.*)"$/.exec(line);
    if (m && cur) cur[m[1]] = m[2];
    else throw new Error(`licence-exceptions.toml: cannot parse "${line}"`);
  }
  return out;
}

/**
 * Checks every package of a package-lock.json (production and dev) against
 * the policy. Returns `{ problems, used, count }`; `used` lists the
 * exceptions that matched a package.
 */
export function checkLockfile(lock, exceptions = []) {
  const problems = [];
  const used = [];
  let count = 0;
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (path === '' || entry.link) continue;
    count++;
    const name = nameOf(path);
    const expr = licenceOf(entry);
    const who = `${name}@${entry.version ?? '?'}`;
    if (expr === null) { problems.push(`${who}: no licence declared (unknown licences fail)`); continue; }
    const verdict = classifyExpression(expr);
    if (verdict === 'allowed') continue;
    if (verdict === 'mpl') {
      const ex = exceptions.find((e) => e.package === name && e.licence === expr);
      if (ex) { used.push(ex); continue; }
      problems.push(`${who}: ${expr} is denied by default; record a per-package exception in docs/licence-exceptions.toml`);
    } else if (verdict === 'denied') problems.push(`${who}: ${expr} is denied`);
    else problems.push(`${who}: "${expr}" is not on the allow list (unrecognised licences fail)`);
  }
  return { problems, used, count };
}
