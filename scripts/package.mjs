// SPDX-License-Identifier: Apache-2.0

// Builds the release assets into release/ (gitignored): tokens.css, tokens.json, motion.json,
// logo-vX.Y.Z.zip, fish-vX.Y.Z.zip, sting-vX.Y.Z.zip, SHA256SUMS and release-notes.md.
// Reproducible: zip entries sorted bytewise, a fixed timestamp, no extra fields, stored (not
// deflated) for already-compressed formats, so the same tree gives the same SHA-256 sums.
// Run: `npm run package [-- --tag vX.Y.Z] [--out release]`. With --tag it refuses a tag that is
// not vX.Y.Z, does not equal package.json's version or has no CHANGELOG section.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const STORED_EXT = new Set(['.png', '.gif', '.mp4', '.webm', '.ico', '.zip']);
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = ((1980 - 1980) << 9) | (1 << 5) | 1; // 1980-01-01

/** Version and release-notes section of [changelog] for [version]; throws when missing or empty. */
export function changelogSection(changelog, version) {
  const lines = changelog.split('\n');
  const head = new RegExp(`^## \\[?${version.replaceAll('.', '\\.')}\\]?( - .*)?\\s*$`);
  const start = lines.findIndex((l) => head.test(l));
  if (start < 0) throw new Error(`CHANGELOG.md has no "## ${version}" section.`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end).join('\n').trim();
  if (!body) throw new Error(`CHANGELOG.md section ${version} is empty.`);
  return body;
}

/** Throws unless [tag] is vX.Y.Z and equals "v" + [version]. */
export function checkTag(tag, version) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Tag "${tag}" is not vX.Y.Z.`);
  if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match package.json version ${version}.`);
}

/** All files under [dir] as [zipPath, absolutePath], zipPath relative to [base] with forward slashes. */
function walk(dir, base) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push([relative(base, p).split(sep).join('/'), p]);
  }
  return out;
}

/** A zip archive (Buffer) of [entries] ([name, Buffer] pairs), sorted bytewise, timestamps fixed. */
export function zip(entries) {
  const sorted = [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, data] of sorted) {
    const nameBuf = Buffer.from(name, 'utf8');
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    const deflated = STORED_EXT.has(ext) ? null : deflateRawSync(data, { level: 9 });
    const useDeflate = deflated !== null && deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    parts.push(local, nameBuf, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(0x031e, 4); // made by: Unix, 3.0
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(DOS_TIME, 12);
    cen.writeUInt16LE(DOS_DATE, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attributes: regular file, 0644
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, end]);
}

/** Files of one asset zip: [dirs] under assets/ plus assets/LICENSE.md, below a top folder. */
function assetEntries(top, dirs) {
  const files = [['LICENSE.md', 'assets/LICENSE.md']];
  for (const d of dirs) files.push(...walk(join('assets', d), 'assets').map(([n, p]) => [n, p]));
  return files.map(([n, p]) => [`${top}/${n}`, readFileSync(p)]);
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const tag = arg('--tag') ?? `v${version}`;
  checkTag(tag, version);
  const notes = changelogSection(readFileSync('CHANGELOG.md', 'utf8'), version);
  const out = arg('--out') ?? 'release';
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  for (const [src, name] of [['dist/css/tokens.css', 'tokens.css'], ['dist/json/tokens.json', 'tokens.json'], ['dist/motion/motion.json', 'motion.json']]) {
    copyFileSync(src, join(out, name));
  }
  const zips = {
    [`logo-${tag}.zip`]: assetEntries(`logo-${tag}`, ['logo', 'favicon']),
    [`fish-${tag}.zip`]: assetEntries(`fish-${tag}`, ['fish']),
    [`sting-${tag}.zip`]: assetEntries(`sting-${tag}`, ['sting']),
  };
  for (const [name, entries] of Object.entries(zips)) writeFileSync(join(out, name), zip(entries));
  writeFileSync(join(out, 'release-notes.md'), `${notes}\n`);

  const assets = readdirSync(out).filter((n) => n !== 'release-notes.md').sort();
  const sums = assets.map((n) => `${createHash('sha256').update(readFileSync(join(out, n))).digest('hex')}  ${n}`);
  writeFileSync(join(out, 'SHA256SUMS'), `${sums.join('\n')}\n`);
  for (const n of [...assets, 'SHA256SUMS']) console.log(`${String(statSync(join(out, n)).size).padStart(9)}  ${n}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`package: ${e.message}`);
    process.exit(1);
  }
}
