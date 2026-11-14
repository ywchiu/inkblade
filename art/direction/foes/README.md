# 新敵人：抄名鬼吏與鎮門石獸

日期：2026-11-14。兩個原本借用劍客、墨狼外形再染色的角色，換成自己的模型。全部在 Higgsfield 上生成。

| 角色 | 參考圖 | 圖轉 3D | 綁骨 | 遊戲內檔案 |
| --- | --- | --- | --- | --- |
| 抄名鬼吏 | `scribe-reference.png`（`gpt_image_2_6`，3:4，工作 `c21a34ac-00ae-459f-bcb4-b6efbe82e3a8`） | `tripo_h3_1_image_to_3d`，工作 `385fe65c-dfd5-4a43-853b-992ea1073cc1` | `3d_rigging`（不含動畫，身高 2 m），工作 `d266061f-41b5-4f9c-ba16-62abb957c0d1` | `dist/assets/scribe/rig/scribe.glb` |
| 鎮門石獸 | `beast-reference.png`（`gpt_image_2_6`，4:3，工作 `749f1767-b7a0-4ff0-b939-274cc9496cf0`） | `tripo_h3_1_image_to_3d`，工作 `adfe309e-8fee-4c1d-95d2-9c8a39c002e7` | 不送綁骨，遊戲內用四足骨架程式蒙皮 | `dist/assets/beast/stone-beast.glb` |

圖轉 3D 參數：`face_limit: 80000, texture: true, pbr: true, texture_quality: 'detailed', geometry_quality: 'standard', texture_alignment: 'original_image', quad: false`。

花費（Higgsfield 點數）：參考圖 0.25 × 2、圖轉 3D 12 × 2、綁骨 5，合計 29.5。

## 參考圖提示詞

兩張共用的開頭：

> Original Chinese dark-fantasy soulslike production character design, realistic tactile PBR materials, grounded anatomy and fine surface details, matching a mature Zhong Kui demon-queller and an ancient temple guardian. Soft neutral studio light revealing material detail, uniform medium gray background with only a faint contact shadow. Single full body character isolated, all extremities visible, 10 percent margin. No environment, no pedestal, no labels, no watermark, no UI, no other characters, no turnaround grid. Not cartoon, not low-poly, not plastic, no glowing body, no smoke or particles. Image-to-3D source reference.

抄名鬼吏（色調 muted oxblood, ink charcoal, oxidized bronze）：

> A gaunt tall HUMAN underworld clerk called the Name-Copying Scribe, a ghost official who copies stolen names for a false god. Ash-white paper-dry face with sunken cheeks, thin long black moustache, closed thin lips, dark hollow eyes. A tall stiff black gauze official hat with two short stiff side wings lying close to the hat. Faded ink-teal scholar-official robe with a worn oxblood collar and cuffs, close-fitting sleeves bound at the forearms with ink-stained cloth wraps, robe ending ABOVE the knees and split into separate front, back and side panels so BOTH separated legs are visible, dark trousers tucked into old cloth boots. A wide dark sash at the waist carrying a tight bundle of small wooden name tablets and two rolled paper scrolls strapped flat against the hips, an oxidized bronze seal box on the belt, strips of yellowed talisman paper pasted on the chest. Slim elongated proportions, narrow shoulders, long thin fingers stained black with ink. Absolutely no brush, knife, sword, staff or any object in the hands: a separate animated weapon will be attached later. Upright neutral symmetrical A-pose, both arms straight and raised 40 degrees out from the torso, elbows unbent, hands open with fingers separated, clear visible gap of background between arms and torso, legs straight shoulder width apart with a clear gap between them. Strict straight-on frontal view, minimal perspective, camera at chest height.

鎮門石獸（色調 muted ink charcoal, weathered gray stone, oxidized bronze and oxblood；開頭的 character 改為 creature，並加上 no plinth）：

> A large QUADRUPED living stone guardian beast called the Gate-Warding Stone Beast, a Chinese temple guardian lion statue that has come alive and walks. Its whole body is carved weathered gray granite: chiselled surfaces, hairline cracks, chipped edges, patches of dark moss and lichen in the recesses. Anatomically it stands like a powerful lean mastiff-lion on FOUR straight separated legs with an elongated horizontal spine and high heavy shoulders, long legs, a deep chest and a tucked waist. Broad lion head with a short blunt muzzle, closed jaws, flat carved brow, small deep-set eyes, and a mane of tight carved stone spiral curls covering only the head, neck and upper shoulders. A thick tail of carved curls held straight out behind at hip height, clearly separate from the hind legs. Around the neck a heavy oxidized bronze collar with one round bell and a short torn oxblood cloth strip; a few yellowed paper talisman seals pasted on the shoulders. Broad stone paws with blunt claws, each paw flat on the ground. No wings, no horns, no saddle, no rider, no extra limbs, not sitting. Neutral alert STANDING pose on all four legs, never seated, never crouching, leaping or attacking, all four feet on the ground and separated clearly in depth. Three-quarter SIDE view, nose points to the RIGHT of image, see the full horizontal torso and all four legs, low perspective, camera at mid-body height. Entire tail and ears visible.

## 進遊戲的步驟

1. 鬼吏的 Tripo 網格面朝 +X，送綁骨前轉正：`node scripts/prepare-rig-input.mjs raw.glb scribe-rig-input.glb --yaw=-90 --height=2.0`。
2. 綁骨結果的骨骼名稱與劍客完全相同（24 根），所以鬼吏直接播放劍客的動畫片段，沒有另外買動作。清單是 `dist/rig-clips.js` 的 `SCRIBE_RIG`；「點名」改用突刺片段。
3. 鬼吏手上的判官筆是程式建的模型（`dist/characters3d.js` 的 `createBrush`），握法與劍相同。
4. 石獸面朝 −Z，與墨狼相同。關節位置與蒙皮分界是在模型上量出來的，寫在 `dist/wolf-character3d.js` 的 `BEAST_SHAPE`（墨狼是 `WOLF_SHAPE`）。之後再加四足角色，只要再量一組。
5. 貼圖由 4096 像素的 PNG／JPEG 改為 2048 像素 WebP：`node scripts/compress-textures.mjs in.glb out.glb`（需要 `cwebp`）。鬼吏 13.5 MB → 4.1 MB，石獸 19.2 MB → 3.3 MB。
6. 角色與模型的對應在 `dist/campaign3d.js` 的 `ROLES[*].skin`。這些模型在基本角色之後才載入；載入前或載入失敗時，該角色沿用原本的外形與染色。

檢視頁：`/motion-lab.html?who=scribe&clip=idle&view=quarter&cols=4&rows=1`、`/motion-lab.html?who=beast&clip=chase&view=side&cols=3&rows=2`。
