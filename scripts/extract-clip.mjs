#!/usr/bin/env node
// A rigging service returns the whole textured character again for every
// animation. The game needs the mesh once and each further clip as bones and
// keyframes only, so this drops the mesh, skin, materials and textures and
// repacks just the animation data (16 MB -> tens of kB).
//
//   node scripts/extract-clip.mjs rigged-with-clip.glb clip.glb
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseGlb, writeGlb } from './prepare-rig-input.mjs';

export function extractClip(buffer) {
  const { json, bin } = parseGlb(buffer);
  if (!json.animations?.length) throw new Error('No animation in this file.');
  const used = [...new Set(json.animations.flatMap(a => a.samplers.flatMap(s => [s.input, s.output])))];
  const chunks = [], bufferViews = [], accessors = [], remap = new Map();
  let length = 0;
  for (const index of used) {
    const accessor = json.accessors[index];
    if (accessor.sparse) throw new Error('Sparse animation accessors are not supported.');
    const view = json.bufferViews[accessor.bufferView];
    if (view.byteStride) throw new Error('Interleaved animation data is not supported.');
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type], size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0), bytes = bin.subarray(start, start + accessor.count * components * size);
    const padded = new Uint8Array(Math.ceil(bytes.length / 4) * 4); padded.set(bytes);
    remap.set(index, accessors.length);
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
    accessors.push({ ...accessor, bufferView: bufferViews.length - 1, byteOffset: 0 });
    chunks.push(padded); length += padded.length;
  }
  const out = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  const nodes = json.nodes.map(({ mesh, skin, ...node }) => node);
  const animations = json.animations.map(a => ({ ...a, samplers: a.samplers.map(s => ({ ...s, input: remap.get(s.input), output: remap.get(s.output) })) }));
  const slim = { asset: json.asset, scene: json.scene ?? 0, scenes: json.scenes, nodes, animations, accessors, bufferViews, buffers: [{ byteLength: length }] };
  return { glb: writeGlb(slim, out), report: { clips: animations.map(a => a.name), channels: animations[0].channels.length, bytes: length } };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) { console.error('usage: extract-clip.mjs in.glb out.glb'); process.exit(1); }
  const { glb, report } = extractClip(await readFile(input));
  await writeFile(output, glb);
  console.log(JSON.stringify(report));
}
