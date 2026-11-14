#!/usr/bin/env node
// Image-to-3D and auto-rig services return 4K PNG/JPEG textures: 10-20 MB a model.
// This re-encodes every embedded texture as WebP no larger than --size pixels and
// leaves geometry, skin and clips untouched. Needs `cwebp` (brew install webp).
//
//   node scripts/compress-textures.mjs in.glb out.glb [--size=2048] [--quality=82]
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseGlb, writeGlb } from './prepare-rig-input.mjs';

// `encode(bytes, mimeType, index)` returns WebP bytes. Buffer views are rebuilt in order with 4-byte alignment.
export async function compressTextures(buffer, encode) {
  const { json, bin } = parseGlb(buffer);
  const images = new Map((json.images || []).map((image, i) => [image.bufferView, i]).filter(([view]) => view !== undefined));
  const chunks = [];
  let length = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    let bytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    if (images.has(index)) { const image = json.images[images.get(index)]; bytes = await encode(bytes, image.mimeType, images.get(index)); image.mimeType = 'image/webp'; }
    const pad = (4 - length % 4) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); length += pad; }
    view.byteOffset = length; view.byteLength = bytes.length; chunks.push(bytes); length += bytes.length;
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  for (const texture of json.textures || []) if (texture.source !== undefined) { texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } }; delete texture.source; }
  for (const key of ['extensionsUsed', 'extensionsRequired']) json[key] = [...new Set([...(json[key] || []), 'EXT_texture_webp'])];
  json.buffers[0].byteLength = length;
  return writeGlb(json, out);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [input, output] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const option = (name, fallback) => +(process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
  if (!input || !output) { console.error('usage: compress-textures.mjs in.glb out.glb [--size=2048] [--quality=82]'); process.exit(1); }
  const size = option('size', 2048), quality = option('quality', 82), dir = await mkdtemp(join(tmpdir(), 'glb-tex-'));
  try {
    const source = await readFile(input);
    const result = await compressTextures(source, async (bytes, mime, i) => {
      const from = join(dir, `${i}.${mime === 'image/png' ? 'png' : 'jpg'}`), to = join(dir, `${i}.webp`);
      await writeFile(from, bytes);
      // A height of 0 keeps the aspect ratio. Textures here are square and at least `size` wide.
      execFileSync('cwebp', ['-quiet', '-q', String(quality), '-m', '6', '-resize', String(size), '0', from, '-o', to], { stdio: ['ignore', 'pipe', 'pipe'] });
      return new Uint8Array(await readFile(to));
    });
    await writeFile(output, result);
    console.log(JSON.stringify({ from: source.length, to: result.length }));
  } finally { await rm(dir, { recursive: true, force: true }); }
}
