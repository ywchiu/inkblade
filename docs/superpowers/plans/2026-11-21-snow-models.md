# 寒聲嶺模型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give 凍聲婆, 冰狐, 凍旅人 and 吼風山魈 their own generated, game-ready bodies, loaded only when the hero reaches the realm that uses them.

**Architecture:** Reuse the Higgsfield pipeline that made 抄名鬼吏 and 鎮門石獸 (`art/direction/foes/README.md`). The steps are reference image → Tripo image-to-3D → turn to face +Z → compress textures → rig the humanoids. Each humanoid rig uses Meshy's 24-bone skeleton, the same one the swordsman and the 山魈 use, so it can play their existing clips. Only 凍聲婆 gets clips bought for her alone. 冰狐 is skinned in code with the wolf's 20-bone four-legged skeleton and a measured `FOX_SHAPE`. A small `SkinShelf` loads each body once and only when asked for. The world asks for a realm's bodies when a run in that realm begins. The mountain asks for exactly the two bodies it loads today.

**Tech Stack:**
- Higgsfield MCP: `gpt_image_2_6`, `tripo_h3_1_image_to_3d`, `3d_rigging`, `animation_actions`.
- Node scripts in `scripts/`: `prepare-rig-input.mjs`, `compress-textures.mjs`, `extract-clip.mjs`.
- three.js, node:test, ego-browser.

**Spec:** `docs/superpowers/specs/2026-11-21-snow-realm-design.md`, section 「模型」.

## Global Constraints

- **Approval before spending credits.**
  - Every step that spends Higgsfield credits stops first and shows the user its estimate. It runs only after the user says yes.
  - Prices quoted on 2026-11-21: reference image 0.75, image-to-3D 12, rig without animation 5, rig with one animation 8.
  - Balance on 2026-11-21: 1742 credits.
- **Reference images first.** The user sees each reference image before it is turned into 3D. A rejected image is regenerated, which needs a new estimate.
- **Style:**
  - Ink-wash 志怪 (Chinese ghost-story) look. The bodies must sit naturally beside 鍾馗, 墨狼 and 無相劍客.
  - On snow they must read as separate from the ground, never white on white. The palette is ink charcoal, oxblood, oxidized bronze and frost blue. Pale fur or ice is allowed only when broken by dark ink areas.
- **Model shape:**
  - Each model faces +Z with its feet at y=0.
  - Humanoids stand in a symmetric A-pose with empty hands.
  - Face limit is 80,000.
- **Size:** each model's `.glb` is at most 4.5 MB after `compress-textures.mjs` (for comparison, the clerk is 4.1 MB and the beast 3.3 MB). Each bought clip after `extract-clip.mjs` is at most 200 KB.
- **First-visit download:** a first-time player downloads no file this plan adds. The mountain asks for `['beast', 'scribe']`, exactly as today.
- **Failure fallback:** a body that is missing or fails to load leaves its role in the base body and the role's colours. The game never waits on it.
- **Branch:** work only on `snow-realm`. Do not merge to `main`.
- **UI:** no emoji.

## Review Focus

1. **A snow body fails to load (404, a bad GLB, the network drops mid-run).** `SkinShelf.get` returns null and the run plays on. Covered by Task 5's test 'a body that fails to load is null and asked for once'.
2. **A first-time player on the mountain.** No request goes to `assets/snow/`. Task 6 checks this in the browser through `performance.getEntriesByType('resource')`.
3. **Going mountain → snow → mountain → snow.** Each body is fetched once in the session. Covered by Task 5's test 'asking again does not load again'.
4. **A rig built on a sideways mesh.** This is the failure the 2026-11-13 hero hit. `prepare-rig-input.mjs` must print no `warning`. The front view in `motion-lab` must show the face.
5. **Bought clips that slide or drift.** Root motion is stripped (`inPlace`). The boss's clips are checked frame by frame in `motion-lab`, with `&bones=1`.

---

### Task 1: Reference images

**Cost:** 4 × 0.75 = 3 credits. A retry costs 0.75 each. Stop before submitting, show the estimate, and wait for the user.

**Files:**
- Create: `art/direction/snow/README.md`, which holds the prompts, job ids and costs.
- Create: `art/direction/snow/{crone,fox,traveller,howler}-reference.png`.

**Interfaces:**
- Produces: four approved reference images and their Higgsfield job ids. Task 2 passes those job ids as `medias`.

- [ ] **Step 1: Write the four prompts into `art/direction/snow/README.md`.**
  - Start every prompt with the shared opening from `art/direction/foes/README.md`.
  - Humanoids are shot at 3:4, in an A-pose, straight from the front, with empty hands and robes ending above the knee.
  - 冰狐 is shot at 4:3, a three-quarter side view with the nose pointing right and all four feet down.
  - What each prompt asks for:
    - **凍聲婆 (`crone`)**, the realm's boss. A tall, stooped old woman spirit in a layered oxblood-and-charcoal robe crusted with frost. Small ice bells hang from her sleeves and her hair-knot. Her face is a pale, cracked, porcelain-like mask with dark eye hollows. She is about 2.3 m tall.
    - **冰狐 (`fox`)**. A lean fox spirit with frost-grey fur. Its legs, ears and tail-tip are ink-black, it has an oxblood talisman cord at the neck, and it has three tails swept low.
    - **凍旅人 (`traveller`)**. A frozen traveller with a conical straw hat rimmed with icicles. He wears a charcoal travelling coat with ice crusted on the shoulders and a bronze bell at the belt. His face is hidden under a frost-blue cloth.
    - **吼風山魈 (`howler`)**. A smaller cousin of the 山魈 (about 2.4 m), hunched, with long arms. Its shaggy charcoal mane is rimed white at the tips, it wears a bronze nose ring, and it has a wide mouth for the howl.
- [ ] **Step 2: Show the user the 3-credit estimate and wait for a yes.**
- [ ] **Step 3: Generate the four images with `generate_image_batch`, model `gpt_image_2_6`.** Save each image locally, then show all four to the user.
  - Expected: the user approves each image, or names one to redo.
- [ ] **Step 4: Redo any rejected image after a new estimate, then record the jobs and the final costs in the README.**
- [ ] **Step 5: Commit.**
  ```bash
  git add art/direction/snow && git commit -m "Reference images for the four snow-realm bodies"
  ```

### Task 2: Image to 3D, turned and compressed

**Cost:** 4 × 12 = 48 credits. Stop before submitting and wait for the user.

**Files:**
- Create: `dist/assets/snow/fox.glb`.
- Create rig inputs, not shipped: `art/direction/snow/{crone,traveller,howler}-rig-input.glb`.
- Modify: `art/direction/snow/README.md`, with the 3D jobs, facing, sizes and SHA-256 hashes.

**Interfaces:**
- Consumes: Task 1's job ids.
- Produces:
  - Three humanoid rig inputs. Each faces +Z, has its feet at y=0, and is scaled to its game height: crone 2.3, traveller 1.95, howler 2.4.
  - `dist/assets/snow/fox.glb`: compressed, with texture only and no rig. Its source facing is recorded for Task 4.

- [ ] **Step 1: Show the user the 48-credit estimate and wait for a yes.**
- [ ] **Step 2: Submit four `tripo_h3_1_image_to_3d` jobs.** Use the parameters in `art/direction/foes/README.md`: `face_limit: 80000, texture: true, pbr: true, texture_quality: 'detailed', geometry_quality: 'standard', texture_alignment: 'original_image', quad: false`. Download the GLBs.
- [ ] **Step 3: Turn and ground each humanoid.**
  ```bash
  node scripts/prepare-rig-input.mjs raw.glb <name>-rig-input.glb --yaw=<deg> --height=<h>
  ```
  - Expected: no `warning` line.
  - Then check the front view: `/motion-lab.html?rig=<file>&view=front&cols=1&rows=1` must show the face.
- [ ] **Step 4: Compress the textures.**
  ```bash
  node scripts/compress-textures.mjs in.glb out.glb
  ```
  - Expected: each file is at most 4.5 MB.
  - Write `fox.glb` straight to `dist/assets/snow/`.
- [ ] **Step 5: Commit the fox and the README.** Keep the rig inputs out of git if they are over 10 MB, and note their local paths in the README.

### Task 3: Rig the three humanoids, and buy 凍聲婆's own moves

**Cost:**

| Item | Credits |
| --- | --- |
| Rig crone, traveller, howler (no animation), 3 × 5 | 15 |
| Three clips bought for 凍聲婆 alone, 3 × 8 | 24 |
| **Total** | **39** |

Stop before each group of jobs and wait for the user.

**Files:**
- Create: `dist/assets/snow/{crone,traveller,howler}/rig/<name>.glb`.
- Create: `dist/assets/snow/crone/rig/{cast,sweep,wail}.glb`.
- Modify: `dist/rig-clips.js`, adding `CRONE_RIG`, `TRAVELLER_RIG` and `HOWLER_RIG` to `RIGS`.
- Modify: `art/direction/snow/README.md`.
- Test: `tests/snow-models.test.mjs`.

**Interfaces:**
- Produces `RIGS.crone`, `RIGS.traveller` and `RIGS.howler`. Their shape matches `RONIN_RIG` and `ONI_RIG`.
  - **`TRAVELLER_RIG`**: `{ ...RONIN_RIG, rig, height: 1.95 }`. It carries no weapon (`weaponBone: null`).
  - **`HOWLER_RIG`**: `{ ...ONI_RIG, rig, height: 2.4 }`. It plays the 山魈's clips.
  - **`CRONE_RIG`**:
    - `rig` and `height: 2.3`.
    - Idle, walk, hurt and death come from the swordsman's clips.
    - `cast`, `sweep` and `wail` are her own clips, each with a `range` and a `hit`.
    - `moves` maps her attack kinds onto those three clips: `'bell-cast': 'cast'`, `'frost-sweep': 'sweep'` and `'wail': 'wail'`. Plan 3 names the attacks that use them.

- [ ] **Step 1: Write the failing test `the snow bodies wear the shared skeleton, and only the crone brings clips of her own`.**
  ```js
  for (const id of ['crone', 'traveller', 'howler']) assert.ok(RIGS[id]?.rig.startsWith('./assets/snow/'), id);
  assert.equal(RIGS.traveller.clips, RONIN_RIG.clips);
  assert.equal(RIGS.howler.clips, ONI_RIG.clips);
  for (const c of ['cast', 'sweep', 'wail']) { assert.ok(RIGS.crone.clips[c].src.startsWith('./assets/snow/crone/')); assert.ok(RIGS.crone.clips[c].hit > RIGS.crone.clips[c].range[0]); }
  for (const c of ['idle', 'hurt', 'death']) assert.equal(RIGS.crone.clips[c], RONIN_RIG.clips[c]);
  // every file a manifest names exists and is inside its budget
  ```
  - Run `node --test tests/snow-models.test.mjs`. Expected: FAIL, because `RIGS.crone` is undefined.
- [ ] **Step 2: Show the user the 15-credit rigging estimate and wait.**
  - Upload the three rig inputs (`media_upload` → PUT → `media_confirm`).
  - Run `3d_rigging` with `height_meters` set to each body's height, no animation.
  - Download each result.
  - Expected: each result has the same 24 bone names as `ronin/rig/ronin.glb`. Compare them with a short `parseGlb` script.
- [ ] **Step 3: Pick 凍聲婆's three moves with the user.**
  - Search with `animation_actions`. Candidates are `Charged_Spell_Cast` (125) for cast, a sweep from `AttackingwithWeapon`, and a scream or roar for wail.
  - Show the preview GIFs to the user and let them choose.
  - Show the 24-credit estimate and wait for a yes.
- [ ] **Step 4: Rig and extract the clips.**
  - Rig the crone's input once per chosen clip.
  - Extract each clip: `node scripts/extract-clip.mjs dl.glb dist/assets/snow/crone/rig/<clip>.glb`.
  - Expected: each clip is at most 200 KB.
- [ ] **Step 5: Add the three manifests to `rig-clips.js`.**
  - Put each body's mesh under `dist/assets/snow/<id>/rig/<id>.glb`. Compress its textures first.
  - Set the crone's `range`/`hit` by stepping through each clip in `/motion-lab.html?who=crone&clip=<clip>&bones=1`.
  - Run the test. Expected: PASS.
  - Run the whole suite: `npm test`. Expected: everything passes.
- [ ] **Step 6: Commit.**
  ```bash
  git commit -m "Rig the crone, the frozen traveller and the howler on the shared skeleton, and give the crone moves of her own"
  ```

### Task 4: 冰狐 on the four-legged skeleton

**Cost:** none.

**Files:**
- Modify: `dist/wolf-character3d.js`, adding `export const FOX_SHAPE`.
- Modify: `dist/characters3d.js`, adding the skin `fox`.
- Test: `tests/snow-models.test.mjs`.

**Interfaces:**
- Produces `FOX_SHAPE` with the same keys as `BEAST_SHAPE`:
  - `asset: './assets/snow/fox.glb'`
  - `height: 1.05`
  - `yaw`, taken from Task 2's recorded facing.
  - Joint positions and `lie`, measured on the mesh.
- Produces the skin `fox`, built with `createWolfCharacter(gltf, FOX_SHAPE)`.

- [ ] **Step 1: Write the failing test `the fox skins to full weight on twenty bones, and its tails stay tail`.**
  - Add `[FOX_SHAPE, [<w>, <l>]]` to the block-body check used for the wolf and the beast.
  - Check that a point high and behind the rump is weighted only to `Tail*` bones.
  - Expected: FAIL, because `FOX_SHAPE` is undefined.
- [ ] **Step 2: Measure the fox mesh and write `FOX_SHAPE`.**
  - Measure the bounding box, shoulder, hip, neck and tail root, as was done for the beast (`art/direction/foes/README.md` step 4).
  - Add `fox` to `skins` in `characters3d.js`.
- [ ] **Step 3: Run the test, then the whole suite.** Check the motion in `/motion-lab.html?who=fox&clip=chase&view=side&cols=3&rows=2`.
  - Expected: PASS, and the paws do not sink into the ground.
- [ ] **Step 4: Commit.**
  ```bash
  git commit -m "Skin the ice fox on the four-legged skeleton"
  ```

### Task 5: Load a realm's bodies when the hero gets there

**Cost:** none.

**Files:**
- Modify: `dist/characters3d.js`, adding `REALM_SKINS`, `class SkinShelf` and the skins `crone`, `traveller` and `howler`.
- Modify: `dist/world3d.js`. Replace the load-everything loop with `this.shelf = new SkinShelf(loadSkin)` and add `world.prepareRealm(realmId)`.
- Modify: `dist/game3d.js`. `begin()` calls `world.prepareRealm(game.realm.id)` for a campaign run.
- Modify: `dist/campaign-world3d.js`. Read bodies from `world.shelf.get(name)` instead of `world.skins[name]`.
- Test: `tests/snow-models.test.mjs`.

**Interfaces:**
- `REALM_SKINS = { mountain: ['beast', 'scribe'], snow: ['fox', 'traveller', 'howler', 'crone'] }`.
- `class SkinShelf`:
  - `constructor(load: (name) => Promise<model|null>)`
  - `want(names: string[]) -> Promise<void>` starts loading each name not already asked for, and never throws.
  - `get(name) -> model|null` returns the body, or null when it has not arrived or failed.
- `world.prepareRealm(id)` calls `this.shelf.want(REALM_SKINS[id] || [])`.

- [ ] **Step 1: Write the failing tests.**
  ```js
  test('the mountain asks for exactly the bodies it loads today', () => assert.deepEqual(REALM_SKINS.mountain, ['beast', 'scribe']));
  test('every realm body is a skin the loader knows', () => { for (const n of Object.values(REALM_SKINS).flat()) assert.ok(SKINS.includes(n), n); });
  test('asking again does not load again', async () => { let n = 0; const s = new SkinShelf(async () => (n++, {})); await s.want(['fox']); await s.want(['fox', 'fox']); assert.equal(n, 1); assert.ok(s.get('fox')); });
  test('a body that fails to load is null and asked for once', async () => { let n = 0; const s = new SkinShelf(async () => { n++; return null; }); await s.want(['crone']); await s.want(['crone']); assert.equal(s.get('crone'), null); assert.equal(n, 1); });
  test('nothing is fetched until a realm asks', () => { /* source check: world3d.js no longer loops over SKINS */ assert.doesNotMatch(read('world3d.js'), /for\(const name of SKINS\)/); });
  ```
  - Expected: FAIL, because `REALM_SKINS` is undefined.
- [ ] **Step 2: Implement `SkinShelf` and `REALM_SKINS`.**
  - Add the three humanoid skins: `loadRiggedCharacter(RIGS.<id>, {loader, kind})`. The crone and the traveller use `kind: 'ronin'`; the howler uses `kind: 'oni'`.
  - Wire up `prepareRealm`.
  - Point `campaign-world3d.js` at `shelf.get`.
  - In `loadAssets()`, call `prepareRealm('mountain')`, so the mountain keeps today's timing.
- [ ] **Step 3: Run the tests, then the whole suite.** Expected: all pass.
- [ ] **Step 4: Commit.**
  ```bash
  git commit -m "Load each realm's bodies when a run there begins, once per visit"
  ```

### Task 6: Look at them, on snow, in the browser

**Cost:** none.

**Files:**
- Create: `art/direction/snow/{crone,fox,traveller,howler}-browser.png` (screenshots).
- Modify: `art/direction/snow/README.md`, with the final sizes and a "how to view" section.

- [ ] **Step 1: Open each body in `motion-lab` (`who=<id>`, quarter view) and take a screenshot of each.**
  - Then run the same view with `&ground=snow`. If the lab has no snow-ground switch, add one as a URL parameter: it sets the ground to `#e8edf0`.
  - Expected: every body stands out clearly from the snow ground. Show all eight screenshots to the user.
- [ ] **Step 2: Play the mountain as a first-time player and check the network.**
  - Clear the storage keys first.
  - In the page, run `performance.getEntriesByType('resource').filter(e => e.name.includes('/assets/snow/'))`. Expected: `[]`.
- [ ] **Step 3: Load the snow bodies through the shelf.**
  - In `?debug`, run `world.prepareRealm('snow')`, wait, then read `world.shelf.get(id)` for each of the four ids. Expected: four bodies, and each file fetched once.
  - Repeat with the `assets/snow/` requests blocked through CDP `Network.setBlockedURLs`. Expected: `get` returns null, with no uncaught error.
- [ ] **Step 4: Commit the README and screenshots, then push the branch.**
  ```bash
  git push
  ```
  Do not merge.
