# 寒聲嶺：凍聲婆、冰狐、凍旅人、吼風山魈

日期：2026-11-21。計畫：`docs/superpowers/plans/2026-11-21-snow-models.md`。全部在 Higgsfield 上生成，流程比照 `../foes/README.md`。

| 角色 | id | 參考圖 | 圖轉 3D | 綁骨 | 遊戲內檔案 |
| --- | --- | --- | --- | --- | --- |
| 凍聲婆 | `crone` | `crone-reference.png`（3:4，工作 `5ed05264-c094-4776-9afa-0e26db31d9aa`） | `tripo_h3_1_image_to_3d`，工作 `8604987e-ec0e-4996-927d-8998664b16d1` | | |
| 冰狐 | `fox` | `fox-reference.png`（4:3，工作 `e26a354d-9c18-4470-b0c1-364e7e927098`） | `tripo_h3_1_image_to_3d`，工作 `71bdc6f5-5fb9-408f-bf0a-164dd8df855a` | 不送綁骨，四足程式蒙皮 | |
| 凍旅人 | `traveller` | `traveller-reference.png`（3:4，工作 `133cf45a-e448-453e-850b-a15b7f08f3da`） | `tripo_h3_1_image_to_3d`，工作 `8a98fcf9-86a4-45c9-bc10-f845b202d0ac` | | |
| 吼風山魈 | `howler` | `howler-reference.png`（3:4，工作 `22773e09-0944-444f-8351-10202441bbb1`） | `tripo_h3_1_image_to_3d`，工作 `b6dd7e48-4752-4990-97ff-56b01e8b3a0b` | | |

## 配色原則

四者都站在雪地上，所以不能白成一片。主色是墨黑、暗紅、氧化銅，再點冰藍。冰和霜只出現在邊緣，例如衣緣、鬃毛尖、斗笠邊；身體的大面積色塊一定是深色。

## 參考圖提示詞

模型 `gpt_image_2_6`。人形用 3:4，冰狐用 4:3。

四張共用的開頭（取自 `../foes/README.md`）：

> Original Chinese dark-fantasy soulslike production character design, realistic tactile PBR materials, grounded anatomy and fine surface details, matching a mature Zhong Kui demon-queller and an ancient temple guardian. Soft neutral studio light revealing material detail, uniform medium gray background with only a faint contact shadow. Single full body character isolated, all extremities visible, 10 percent margin. No environment, no pedestal, no labels, no watermark, no UI, no other characters, no turnaround grid. Not cartoon, not low-poly, not plastic, no glowing body, no smoke or particles. Image-to-3D source reference.

三個人形共用的結尾：

> Absolutely nothing held in the hands: a separate weapon or prop will be attached later. Upright neutral symmetrical A-pose, both arms straight and raised 40 degrees out from the torso, elbows unbent, hands open with fingers separated, clear visible gap of background between arms and torso, legs straight shoulder width apart with a clear gap between them. Strict straight-on frontal view, minimal perspective, camera at chest height.

### 凍聲婆（色調 muted oxblood, ink charcoal, oxidized bronze, touches of frost blue）

> A tall gaunt HUMAN old woman spirit called the Frost-Voice Crone, mistress of a snow ridge where voices freeze. Slightly stooped shoulders but standing upright, very tall and thin, long bony limbs. Her face is a pale cracked porcelain-like old woman's face with fine craquelure lines, dark hollow eye sockets, thin closed lips, sharp cheekbones; long iron-grey hair pulled up into a high tight knot pierced by two bronze pins, with a cluster of small frosted bronze bells hanging from the knot. Layered heavy robes: an ink-charcoal outer robe over an oxblood inner robe, the hems, collar and shoulders crusted with a thin rime of frost-blue ice; close-fitting sleeves bound at the forearms with dark cloth, a short row of small frosted bronze bells sewn along each cuff; the robe ends ABOVE the knees and is split into separate front, back and side panels so BOTH separated legs are visible, dark wrapped leggings and black cloth shoes. A wide dark sash at the waist with a bronze plaque engraved with a bell. No cape, no long trailing sleeves, no veil.

### 凍旅人（色調 ink charcoal, faded indigo, oxidized bronze, frost blue）

> A HUMAN frozen traveller, a wanderer who died in the snow on a mountain pass and walks again. A wide conical woven straw hat, dark and weathered, its rim hung with short icicles; his face entirely hidden behind a wrapped frost-blue cloth mask with only a dark slit for the eyes. A charcoal padded travelling coat with faded indigo lining, thick ice crusted on both shoulders and down the upper arms, a short straw rain cape over the shoulders only, the coat ending ABOVE the knees and split at the sides so BOTH separated legs are visible, dark leggings wrapped with rope, straw sandals over cloth boots. A rope belt carrying one round oxidized bronze traveller's bell and a small wooden name tag. Average human build, slightly hunched with cold.

### 吼風山魈（色調 ink charcoal, rust oxblood, oxidized bronze, rime white only at the tips）

> A hunched powerful ape-like mountain demon called the Wind-Howling Shanxiao, a smaller cousin of a temple guardian ogre, about 2.4 metres tall. Barrel chest, very long heavy arms, short bowed legs, large flat feet. A thick shaggy ink-charcoal mane covering the head, shoulders and back, every lock tipped with white rime frost; dark rust-red leathery skin on the face, chest and hands. A wide mouth with heavy jaw and blunt tusks, closed, a large oxidized bronze ring through the nose, small fierce deep-set eyes under a heavy brow. A torn oxblood loincloth and a wide bronze-studded leather belt; frayed dark cloth wraps on the forearms and shins; a few yellowed paper talisman seals stuck to the shoulders. No weapon, no armour plates, no tail.

### 冰狐（色調 frost grey, ink black, oxblood; four-legged — uses its own ending）

開頭的 character 改為 creature，並加上 no plinth：

> A lean QUADRUPED fox spirit called the Ice Fox, a snow fox demon from a frozen mountain pass. Slender long-legged fox body with an elongated horizontal spine, narrow deep chest and tucked waist. Short dense frost-grey fur over the back and flanks, and INK-BLACK fur on all four legs from the elbow and knee down, on both ears, around the eyes like a mask and on the tips of its three tails; a narrow pale throat. Long narrow muzzle, closed jaws, sharp tall ears, narrow slanted amber eyes. Three bushy tails swept low and straight out behind at hip height, clearly separate from each other and from the hind legs. An oxblood talisman cord knotted around the neck with one small oxidized bronze bell. No wings, no horns, no saddle, no rider, no extra limbs, not sitting. Neutral alert STANDING pose on all four legs, never seated, never crouching, leaping or attacking, all four feet on the ground and separated clearly in depth. Three-quarter SIDE view, nose points to the RIGHT of image, see the full horizontal torso and all four legs, low perspective, camera at mid-body height. All three tails and both ears visible.

## 圖轉 3D

參數同 `../foes/README.md`：`face_limit: 80000, texture: true, pbr: true, texture_quality: 'detailed', geometry_quality: 'standard', texture_alignment: 'original_image', quad: false`。

| id | 原始朝向 | 處理 | 三角面 | 原始大小 | 壓縮後 | 原始檔 SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| crone | +X | `prepare-rig-input.mjs --yaw=-90 --height=2.3`（1.80 × 2.30 × 0.54 m） | 79,810 | 13.4 MB | 3.1 MB | `10b1ebde1bf6e76c76d32880c3afdd243d64b31ef50a9c563428915389868fae` |
| traveller | +X | `--yaw=-90 --height=1.95`（1.53 × 1.95 × 0.63 m） | 79,916 | 16.7 MB | 3.5 MB | `2e94c25d56475a78456c9c63e7f88152c5a125db5adb35efa8502e0dfb9ed6a1` |
| howler | +X | `--yaw=-90 --height=2.4`（1.88 × 2.40 × 0.90 m） | 78,378 | 15.8 MB | 3.5 MB | `b3558fe650ad6d242bf668fea8d9e95d269e51fdcdf804cb19937797a4dca93f` |
| fox | −Z（耳朵在 −Z 端），遊戲內轉 180 度，與墨狼、石獸相同 | 只壓縮，不轉不縮放；`dist/assets/snow/fox.glb` | | 14.3 MB | 3.0 MB | `0cbc67cff4d0c67b19f9c5206d320773a8b1c10b83ccbe1dcb9ba71752321c34` |

三個人形轉正後在 `motion-lab.html?rig=…&view=front` 正面看得到臉，`prepare-rig-input` 沒有 warning。原始檔與全尺寸貼圖的綁骨輸入放在 `local/`（不進 git，各 13–17 MB）；送綁骨用全尺寸貼圖那份，綁好後再壓縮。

## 花費

Higgsfield 點數：參考圖 0.75 × 4 = 3（第一次就全數採用，無重做）；圖轉 3D 12 × 4 = 48。
