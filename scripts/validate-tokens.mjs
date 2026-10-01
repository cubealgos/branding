// SPDX-License-Identifier: Apache-2.0

// Loads every tokens/*.json source file and checks it is valid DTCG as this
// repo uses it: every leaf has $value and a (possibly inherited) $type,
// references use {group.token} and all resolve, no reference cycles, the
// primitives hold exact hex codes, and semantic theme roles reference
// primitives instead of repeating hex values.
// Run: `npm run check:tokens`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const sourceFiles = ['color', 'typography', 'spacing', 'radius', 'motion'];

const ref = /^\{([^{}]+)\}$/;
const hex = /^#[0-9A-Fa-f]{6}$/;

export const primitives = {
  paper: '#EDEEF1',
  ink: '#16181D',
  muted: '#5A5F6B',
  grid: '#CDD0D6',
  amber: '#D9831A',
  'signal-text': '#9A5A0B',
  'fish-band': '#E7CEB0',
  'on-amber-white': '#FBFBFC',
  'card-dark': '#23262D',
  'muted-dark': '#9AA0AC',
  'rule-dark': '#2E323B',
  'accent-text-dark': '#E8A452',
};

export const roles = ['bg', 'card', 'fg', 'muted', 'rule', 'accent-fill', 'accent-text', 'on-accent'];

/** Flattens a token tree into `{ path, token }` leaves, inheriting `$type`. */
export function collect(node, path = [], type = undefined, out = []) {
  const t = node.$type ?? type;
  if ('$value' in node) {
    out.push({ path: path.join('.'), token: node, type: t });
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v === null || typeof v !== 'object') {
      out.push({ path: [...path, k].join('.'), token: v, type: t, invalid: true });
      continue;
    }
    collect(v, [...path, k], t, out);
  }
  return out;
}

/** Validates the given `{ file: tree }` map; returns a list of error strings. */
export function validate(trees) {
  const errors = [];
  const leaves = new Map();
  for (const [file, tree] of Object.entries(trees)) {
    for (const leaf of collect(tree)) {
      leaf.file = file;
      if (leaves.has(leaf.path)) errors.push(`${file}: duplicate token ${leaf.path}`);
      leaves.set(leaf.path, leaf);
    }
  }
  for (const [path, leaf] of leaves) {
    const where = `${leaf.file}: ${path}`;
    if (leaf.invalid) { errors.push(`${where}: not a token or group`); continue; }
    if (leaf.type === undefined) errors.push(`${where}: no $type`);
    const v = leaf.token.$value;
    const refs = (typeof v === 'string' && v.includes('{')) ? [v] : [];
    for (const r of refs) {
      const m = ref.exec(r);
      if (!m) { errors.push(`${where}: malformed reference ${r}`); continue; }
      if (!leaves.has(m[1])) errors.push(`${where}: unresolved reference ${r}`);
    }
  }
  // Cycles.
  for (const start of leaves.keys()) {
    const seen = new Set();
    let cur = start;
    while (cur !== undefined) {
      if (seen.has(cur)) { errors.push(`reference cycle through ${cur}`); break; }
      seen.add(cur);
      const v = leaves.get(cur)?.token.$value;
      const m = typeof v === 'string' ? ref.exec(v) : null;
      cur = m ? m[1] : undefined;
    }
  }
  // Primitives: exact hex codes.
  for (const [name, expected] of Object.entries(primitives)) {
    const leaf = leaves.get(`color.primitive.${name}`);
    if (!leaf) errors.push(`missing primitive color.primitive.${name}`);
    else if (leaf.token.$value !== expected) {
      errors.push(`color.primitive.${name} is ${leaf.token.$value}, expected ${expected}`);
    }
  }
  // Semantic roles: every role in both themes, referencing primitives only.
  for (const theme of ['light', 'dark']) {
    for (const role of roles) {
      const leaf = leaves.get(`color.theme.${theme}.${role}`);
      if (!leaf) { errors.push(`missing role color.theme.${theme}.${role}`); continue; }
      const m = ref.exec(String(leaf.token.$value));
      if (!m) errors.push(`color.theme.${theme}.${role} must be a reference, not ${leaf.token.$value}`);
      else if (!m[1].startsWith('color.primitive.')) {
        errors.push(`color.theme.${theme}.${role} must reference a primitive`);
      }
    }
  }
  for (const [path, leaf] of leaves) {
    if (leaf.type === 'color' && !path.startsWith('color.primitive.') && hex.test(String(leaf.token.$value))) {
      errors.push(`${path}: hex value outside primitives`);
    }
  }
  // Descriptions required by the amber and on-amber rules.
  const need = (path, re, what) => {
    const d = leaves.get(path)?.token.$description ?? '';
    if (!re.test(d)) errors.push(`${path}: $description must state the ${what}`);
  };
  need('color.primitive.amber', /AMBER RULE/, 'amber rule');
  need('color.theme.light.accent-fill', /AMBER RULE/, 'amber rule');
  need('color.theme.dark.accent-fill', /AMBER RULE/, 'amber rule');
  need('color.theme.light.on-accent', /ON-AMBER RULE/, 'on-amber rule');
  need('color.theme.dark.on-accent', /ON-AMBER RULE/, 'on-amber rule');
  need('color.accent-on-amber', /ON-AMBER RULE/, 'on-amber rule');
  // Motion: frames on every duration, four cubicBezier easings, radius justification.
  for (const [path, leaf] of leaves) {
    if (leaf.type === 'duration') {
      const f = leaf.token.$extensions?.['com.cubealgos.frames'];
      if (!f || !Number.isInteger(f.fps24) || !Number.isInteger(f.fps60)) {
        errors.push(`${path}: missing com.cubealgos.frames fps24/fps60`);
      }
    }
    if (leaf.type === 'cubicBezier') {
      const b = leaf.token.$value;
      if (!Array.isArray(b) || b.length !== 4 || b.some((n) => typeof n !== 'number')) {
        errors.push(`${path}: cubicBezier needs four numbers`);
      }
    }
    if (path.startsWith('radius.') && leaf.token.$value !== '0px' && !(leaf.token.$description ?? '').includes('Justified')) {
      errors.push(`${path}: a non-zero radius must be justified in $description`);
    }
  }
  const easings = [...leaves.keys()].filter((p) => p.startsWith('motion.easing.'));
  if (easings.length !== 4) errors.push(`expected 4 easings, found ${easings.length}`);
  const durations = [...leaves.keys()].filter((p) => p.startsWith('motion.duration.'));
  if (durations.length !== 8) errors.push(`expected 8 durations, found ${durations.length}`);
  return { errors, leaves };
}

export function loadSources(dir = 'tokens') {
  return Object.fromEntries(
    sourceFiles.map((f) => [`${f}.json`, JSON.parse(readFileSync(`${dir}/${f}.json`, 'utf8'))]),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, leaves } = validate(loadSources());
  if (errors.length > 0) {
    console.error(`validate-tokens: ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`validate-tokens: ${leaves.size} tokens in ${sourceFiles.length} files, zero unresolved references.`);
}
