# 寒聲嶺 Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 寒聲嶺 a playable second realm, from the mute village to the crone's cave. It needs its own road, snow scenery, three new foes with their own ways of fighting, the ice-armour and ice-bell boss fight that 喚名 breaks, a full story with English text, and the 寒聲 reward.

**Architecture:**
- **Road data.** `dist/snow-road.js` holds the snow road as pure data, built with the existing `makeRoute`. `dist/realms.js` adds it as the second realm. Combat, the minimap and the story already read `game.realm`, so most of the work is data plus a few realm-aware fields.
- **Scenery.** The mountain scenery module is tied to the mountain, so the snow gets its own class, `SnowScenery`, with the same `update(game,t,dt,active)` / `reset()` shape. `CampaignField` picks the scenery for the realm being played, and the temple courtyard is hidden while the snow is on screen.
- **Boss rules.** The boss fight lives in `CampaignCombat` as general rules: a role with `armour` cannot be cut while the stage's bells stand, and 喚名 breaks a bell in reach.

**Tech Stack:** Plain ES modules in `dist/`, three.js 0.187 (vendored), node:test.

**Spec:** `docs/superpowers/specs/2026-11-21-snow-realm-design.md` (section 寒聲嶺, 成長與本事, 驗收). Earlier plans on this branch: `2026-11-21-realm-foundation.md` (realms, progress, powers) and `2026-11-21-snow-models.md` (the four bodies, `REALM_SKINS`, `SkinShelf`, `RIGS.crone.moves`).

## Global Constraints

- Branch `snow-realm` only. Never merge to `main`: it auto-deploys the live site. Merging waits until the user agrees.
- `npm test` and `npm run check` pass after every task. Add every new module to `package.json`'s `check`.
- Every Chinese string that can appear on the page has an English entry in `dist/lang-en.js`. In English mode the snow realm must report no `misses`.
- No emoji in the UI; icons are inline SVG.
- The story stays original zhiguai in plain spoken Chinese. Do not quote old texts or claim them as a source (`docs/story-direction.md`).
- Anti-goal: the armour must make the crone **completely** immune to blades until every bell is broken. That means 0 damage and 0 stance, not reduced damage.
- Anti-goal: the bells must never become a stuck puzzle. The guidance is the intro lines, visible bells, the boss-hint text, feedback on the first blocked cut, and a waypoint to the nearest bell.
- Anti-goal: the hero must not become overpowered. 寒聲 keeps the numbers it has in `attack-moves.js`.
- Anti-goal: a first-time player downloads nothing more than today. The snow scenery is procedural, and the bodies already load only when the snow realm is open.
- The phone layout at 390×664 and 390×844 portrait has no overlap and no horizontal overflow.
- Voice stays off (`VOICE_ON=false`); new lines are subtitles only.
- This plan spends no Higgsfield credits.

## Review Focus

1. **The player skips every dialogue and still finds the bells.** The guidance on screen has to stand alone: the boss hint, the waypoint and the first-cut bark. Task 3 tests the waypoint and Task 6 tests the hint text.
2. **A run retried at the crone's checkpoint.** Every bell is whole again and the armour is full; a broken bell must not carry over. This is tested in Task 3.
3. **Mountain → snow → mountain in one visit.** The mountain gets back its rain, temple and air, and the snow leaves nothing behind. Task 5 tests the scenery switch order; the rest is a browser check.
4. **Bright snow on a phone.** Danger rings, frost patches, the HUD and health bars all read clearly. Task 5 tests the realm palette; the rest is a 390×664 screenshot check.
5. **A snow body that has not loaded.** The fight still works and reads correctly: the crone in a swordsman's body still has her aura, the bells still break, and the hint still shows. Task 3 tests that the rules do not depend on the body; the rest is a browser check with `assets/snow/` blocked.

---

### Task 1: The snow road, its realm and its roles

**Files:**
- Create: `dist/snow-road.js`
- Modify: `dist/journey3d.js` (`makeRoute` keeps extra fields), `dist/realms.js`, `dist/campaign3d.js` (`ROLES`), `dist/lang-en.js`, `package.json`
- Test: `tests/snow-road.test.mjs`, `tests/i18n.test.mjs`

**Interfaces:**
- Produces, from `dist/snow-road.js`: `SNOW = { JOURNEY, STATIONS, ZONES, STAGES, PICKUPS, BELLS, bounds, centre, contains, zoneAt }`.
- Produces: `realmById('snow')` and `REALMS[1]`, with these fields:
  - `id: 'snow'`, `name: '寒聲嶺'`, `blurb: '有人把山谷裡的聲音凍了起來'`
  - `boss: 'crone'`, `reward: 'coldVoice'`
  - `opening: 'snowOpening'`, `ending: ['croneEnd','snowEpilogue','snowCoda']`, `trueName: 'snowTrueName'`, `trueNameAfter: 'snowEpilogue'`
  - `findName: '冰聲'`
  - `victory: { title: '聲音回到山谷', text: '冰鈴盡碎。被凍住的聲音，回到了每一個人的喉嚨裡。' }`, `wonHint: '聲窟已靜'`
  - The mountain gets `opening: 'opening'`, `findName: '名拓'`, `victory: { title: '名字還給人間', text: '借名契已毀。受拘的魂魄各得歸處，無名狀上重新浮出字跡。' }` and `wonHint: '山門已破'`. These are the strings `game3d.js` uses today.
- Produces: `ROLES.fox`, `ROLES.traveller`, `ROLES.howler`, `ROLES.crone`. The fight fields `pattern`, `frost`, `armour` and `shade` are added in Tasks 2 and 3.

The snow road (north is -z; the cave sits at the origin, so `makeRoute`'s round courtyard is the cave):

- **Journey:**
  - `south: 190`, `north: -10`, `start: { x: 0, z: 184 }`
  - `courtyard: 13.5`, `courtyardFrom: 11.5`
- **Zones.** `mood` is `{ fog, density, snow, light }`.

  | id | name | from → to | fog | density | snow | light |
  |---|---|---|---|---|---|---|
  | hush | 啞村 | 190 → 150 | `#9aa6ae` | .018 | .5 | 1.05 |
  | slope | 風雪坡道 | 150 → 105 | `#8d9aa5` | .03 | 1 | .9 |
  | lake | 冰湖 | 105 → 55 | `#a7b6bf` | .016 | .3 | 1.1 |
  | cavemouth | 聲窟前 | 55 → 14 | `#6f7e89` | .026 | .7 | .8 |
  | cave | 聲窟 | 14 → -10 | `#3a4a58` | .03 | 0 | .55 |

- **Stages.** Gates are doorways at most 11 m wide. Each `goal` and `onward` is a short phrase in the style of the mountain's.

  | id | name | zone | gate | gateName | harm | groups |
  |---|---|---|---|---|---|---|
  | hush | 啞村狐影 | 啞村 | 152 | `啞 村 口` | .6 | fox×3 at (0,166); fox×2 with `when:{z:160}` |
  | slope | 坡上凍客 | 風雪坡道 | 107 | `風 口 關` | .7 | traveller×2 at (1,138); fox, fox, traveller with `when:{wave:true}` |
  | lake | 冰湖吼風 | 冰湖 | 57 | `冰 湖 渡` | .8 | traveller×2, fox×2 at (0,90); howler, fox×2 with `when:{z:76}` at (0,68) |
  | cavemouth | 聲窟門前 | 聲窟前 | 14.5 | `聲 窟 門` | .85 | traveller×3, fox×2 at (0,38); fox×3 with `when:{wave:true}` |
  | crone | 凍聲婆 | 聲窟 | -10 | (none) | 1 | crone at (0,-2); `final: true`; `bells` = all of `BELLS` |

- **Pickups.**
  - Six `kind:'rubbing'` voices, `v1`–`v6`, spread over the first four zones, each off the line of travel.
  - Two shrines, `ss1` near z 128 and `ss2` near z 70.
- **Bells.** `{ id, x, z, name, text }`; `text` is one line about whose voice the bell holds.
  - `b1` (-9.5, 3) 老周
  - `b2` (9.5, 3) 石生
  - `b3` (-6, -8.5) 秋娘
  - `b4` (6, -8.5) 阿聆

Roles. Names and titles are fixed here; the other numbers start here and can be tuned during the browser play in Task 6.

| role | kind | skin | name | title | hp | posture | other fields |
|---|---|---|---|---|---|---|---|
| fox | wolf | fox | 冰狐 | 從雪裡竄出來的狐魅 | 46 | 30 | `scale:.8, speed:1.3, tint:'#d9e4ea'` |
| traveller | ronin | traveller | 凍旅人 | 死在山口又站起來的旅人 | 96 | 56 | `named:true, speed:.75, tint:'#9fb2c2'` |
| howler | oni | howler | 吼風山魈 | 替凍聲婆看守山口的山魈 | 260 | 120 | `scale:.85, harm:1.1, poise:true, elite:true, tint:'#c9d6de', bright:1.4` |
| crone | ronin | crone | 凍聲婆 | 把山谷的聲音凍成冰甲的買主 | 520 | 160 | `harm:1.05, poise:true, boss:true, aura:'#bfe3ff', tint:'#bfe3ff'` |

- [ ] **Step 1: Write the failing tests** in `tests/snow-road.test.mjs`. Generalise the mountain's road tests (`tests/journey3d.test.mjs:11-28`) into a helper `roadIsSound(realm)` and run it on both realms:
  - The road is continuous and at least 6 m wide at every 0.25 m. No edge jumps more than 1.9 m between samples.
  - Zones tile the road with no gaps.
  - Every group, gate and pickup is on the road. Groups stand in front of their own gate, and every unit is a known `ROLES` key.
  - Gates run north in order, and the last stage is `final`.
  - Pickup ids are unique.

  Snow-specific assertions:
  - `realmById('snow').rubbingTotal === 6`
  - `SNOW.STAGES.map(s => s.id)` deep-equals `['hush','slope','lake','cavemouth','crone']`
  - `SNOW.JOURNEY.south - SNOW.JOURNEY.north` is between 170 and 230, which is about half the mountain.
  - Every bell satisfies `contains(b.x, b.z, 1)` and lies 8–12 m from the origin.
  - `SNOW.STAGES.at(-1).bells.length === 4`
  - Stage ids are unique across both realms, because `STAGE_INTRO` is keyed by stage id.
  - `new Progress(store).unlocked()` with the mountain cleared lists `['mountain','snow']`. A fresh store lists only `['mountain']`.
  - `new CampaignCombat(null, { realm: 'snow' })` starts at `SNOW.JOURNEY.start` and spawns three foxes in the first stage.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/snow-road.test.mjs`
  - Expected: FAIL with "Cannot find module '../dist/snow-road.js'"
- [ ] **Step 3: Implement**
  - Add `dist/snow-road.js`, the snow entry in `REALMS`, and the four `ROLES`.
  - Move the mountain's result title, result text and won-hint strings into its realm entry; Task 6 makes `game3d.js` read them from there.
  - Add `dist/snow-road.js` to `check`.
- [ ] **Step 4: Cover the new text in English**
  - Extend `tests/i18n.test.mjs` ("the road is covered") to walk `snow-road.js` and the realm fields `blurb`, `findName`, `victory` and `wonHint`.
  - Run it and watch it fail on the missing strings.
  - Add the entries to `lang-en.js`.
- [ ] **Step 5: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 6: Commit** `Lay out the snow road, its chapters, finds and bells, and its four roles`

### Task 2: How the snow foes fight

**Files:**
- Modify: `dist/enemy-patterns.js`, `dist/campaign3d.js`, `dist/combat3d.js`, `dist/enemy-threats.js`, `dist/lang-en.js`
- Test: `tests/snow-foes.test.mjs`

**Interfaces:**
- Consumes: `ROLES.fox`, `ROLES.traveller` and `ROLES.howler` from Task 1.
- Produces: `roleSequence('fox'|'traveller'|'howler', cycle, enraged, dist, rangedReady)`.
- Produces: `ArenaCombat.prototype.footing()`, which returns 1. The hero's walk, guard and sprint speeds in `combat3d.js` are multiplied by it.
- Produces: `CampaignCombat.frosts`, an array of `{ x, z, radius, time }`. `CampaignCombat.footing()` returns `ROLES.traveller.frost.slow` while the hero stands in a patch, and 1 otherwise.
- Produces the events `'frost-patch'` `{x,z,radius}` and `'gust'` `{x,z}`. `'gust'` is emitted when a pushing projectile hits.
- Produces `projectile.push` (m/s of knockback on the hero, applied even through a block) and `projectile.tint` (a colour; `enemy-threats.js` uses it to tint the howl mesh).

Moves. These names and numbers are fixed here and every name needs English:

- **fox:**
  - `iceSnap` `{kind:'bite', variant:'bite', name:'冰牙', windup:.38, duration:.34, recovery:1.3, range:2.2, damage:15}`
  - `drift` `{kind:'pounce', variant:'rush', name:'雪影撲', windup:.62, duration:.5, recovery:1.2, range:2.2, damage:18, speed:12, activeWindow:true, lane:8}`
  - Sequence: `dist > 3.6 ? ['drift'] : cycle % 2 ? ['iceSnap','drift'] : ['iceSnap']`, with windups ×.9 when enraged.
- **traveller:**
  - `chop` `{kind:'slash', variant:'slash-right', name:'凍臂劈', windup:.95, duration:.5, recovery:1.5, range:2.7, damage:26}`
  - `reel` `{kind:'slash', variant:'slash-left', name:'踉蹌橫掃', windup:.7, duration:.5, recovery:1.6, range:2.8, damage:22}`
  - Sequence: `[['chop'], ['reel','chop']][cycle % 2]`
  - Role field: `frost: { radius: 2.6, time: 9, slow: .55 }`
- **howler:**
  - `gust` `{kind:'projectile', variant:'fissure', name:'吼風', windup:1.1, duration:.6, recovery:1.5, range:0, damage:18, projectile:{style:'howl', tint:'#dfefff', speed:9, radius:1.4, range:14, spread:[0], push:7}, lane:14}`
  - Sequence: `dist > 5 && rangedReady ? ['gust'] : guardianSequence(cycle, enraged, dist)`. Close up it uses the guardian blows, which are already sized by `harm`/`reach`.

- [ ] **Step 1: Write the failing tests** in `tests/snow-foes.test.mjs`, using the `facing()` helper style from `tests/powers.test.mjs`:
  - `'an ice fox bites and darts like a starved shadow'`: `roleSequence('fox', 0, false, 5)[0].name === '雪影撲'` and `roleSequence('fox', 1, false, 2).map(m => m.name)` deep-equals `['冰牙','雪影撲']`.
  - `'a frozen traveller leaves a ring of ice where it falls, and the ice slows the hero'`:
    - Kill a traveller (`e.hp = 1`, then one `hitEnemy(5)`).
    - Expect one `frost-patch` event and `g.frosts.length === 1`.
    - With the hero standing in the patch, holding `{z:-1}` for 1 s moves them less than 3.25 × .55 + 0.1 m.
    - After 9.1 s, `g.frosts.length === 0`.
  - `'ice slows the hero only inside its ring'`: standing 3 m from the patch centre, `g.footing() === 1`.
  - `'the howler's roar pushes the hero back even through a guard'`:
    - Put the hero 6 m from a howler and force its sequence to `gust`.
    - Have the hero guard throughout.
    - After 1.8 s, the hero is at least 2 m further from the howler than at the start, and a `gust` event was emitted.
  - `'a duel's footing is always sure'`: `new ArenaCombat(0).footing() === 1`.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/snow-foes.test.mjs`
  - Expected: FAIL (no `fox` pattern, `footing` is not a function).
- [ ] **Step 3: Implement**
  - Add the three patterns in `roleSequence` and the role fields.
  - In `combat3d.js`, add `footing()` and multiply the hero's speed line by it (`const speed=(guard?1.45:sprint?5.8:3.25)*this.footing()`).
  - Make `enemyDefeated` push a frost patch for a role with `frost`.
  - In `update`, count frosts down whenever not in hit-stop.
  - Clear frosts in `spawnStage`.
  - When a projectile hit lands on the hero, add `push` to the hero's knockback along the shot's heading. Look up where projectile hits call `hitPlayer` in `combat3d.js`.
  - Tint the howl mesh from `shot.tint`, falling back to its present colour.
- [ ] **Step 4: Cover the move names in English**
  - Run `tests/i18n.test.mjs`. "The fight is covered" already walks `campaign3d`, so it fails on the new names.
  - Add the English entries.
- [ ] **Step 5: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 6: Commit** `Give the ice fox, the frozen traveller and the howler their own ways of fighting`

### Task 3: The crone's ice armour and the bells

**Files:**
- Modify: `dist/campaign3d.js`, `dist/enemy-patterns.js`, `dist/lang-en.js`
- Test: `tests/crone.test.mjs`

**Interfaces:**
- Consumes: `SNOW.STAGES.at(-1).bells` (Task 1), `ROLES.crone` (Task 1), `PLAYER_MOVES.callName` (range 6.5) and `CampaignCombat.invoke(move)` (`combat3d.js`).
- Produces: `CampaignCombat.bells`, an array of `{ id, x, z, name, text, broken }`. It is reset from `stage.bells` in every `spawnStage`, so a checkpoint retry gets every bell whole.
- Produces: `ROLES.crone.armour = true`. On deploy, an armoured role gets `e.armour = e.armourMax = <number of unbroken bells>`.
- Produces: `BELL_REACH = 4.5` (exported). A bell answers a 喚名 cast within this distance of the hero, whatever the hero is facing.
- Produces these events:
  - `'armour-turn'` `{x, z, enemyId, first}`. `first` is true once per stage.
  - `'bell-break'` `{id, x, z, name, text, broken, total}`
  - `'armour-fall'` `{x, z, enemyId}`
- Produces: `waypoint()` returns `{x, z, kind:'bell', id}`, the nearest unbroken bell, while the targeted foe is armoured.
- Produces: `roleSequence('crone', …)` with these moves:
  - `bellCast` `{kind:'projectile', variant:'bell-cast', name:'鈴聲', windup:1, duration:.55, recovery:1.3, range:0, damage:20, projectile:{style:'howl', tint:'#bfe3ff', speed:8, radius:.9, range:16, spread:[0]}, lane:16}`. When enraged, `spread` is `[-.3, 0, .3]`.
  - `frostSlam` `{kind:'slam', variant:'frost-slam', name:'凍地', windup:1.05, recovery:1.5, range:4.2, damage:30}`
  - `wail` `{kind:'slam', variant:'wail', name:'寒嘯', windup:1.35, recovery:1.8, range:5.6, damage:26}`
  - Sequence: `dist > 6 && rangedReady ? ['bellCast'] : [['frostSlam'], ['wail'], ['frostSlam','bellCast']][cycle % 3]`
  - When enraged: windups ×.88, the three-way bell cast, and `[['frostSlam','wail'], ['bellCast','frostSlam'], ['wail','frostSlam','bellCast']][cycle % 3]`.
  - While armoured, she keeps 7 m away the way the scribe does (`standOff`); once unarmoured, she closes in.

Rules:
- **While armoured,** `hitEnemy` on the crone does 0 damage and adds 0 stance, whatever hit it: a slash, a heavy blow, a finisher, the ultimate, an execution or a parry. It still gives the qi a parry gives, because that is what feeds 喚名. It emits `'armour-turn'`, and it does not count as a combo hit.
- **寒聲** does not shake an armoured crone (`answer` returns false).
- **Breaking a bell.** When 喚名 lands, every unbroken bell within `BELL_REACH` of the hero breaks. The crone loses one armour per bell and `'bell-break'` is emitted.
- **When the armour reaches 0:**
  - Emit `'armour-fall'`.
  - The crone becomes `enraged`, her stance resets to 0, and she staggers for 2 s (`stun = 2`, `state = 'stagger'`, not `exposed`).
  - Her ordinary boss rules take over.

- [ ] **Step 1: Write the failing tests** in `tests/crone.test.mjs`. The helper `atCrone()` starts `new CampaignCombat(null, { realm: 'snow', powers: ['callName'] })`, sets `stage = 4`, and calls `spawnStage()`.
  - `'blades do nothing to the crone while one bell still holds'`:
    - For each of `light`, `heavy`, `special` (with qi 100) and a direct `hitEnemy(999, 999, 'execution-hit')`, her `hp === maxHp` and `posture === 0` afterwards.
    - At least one `armour-turn` was emitted, and only the first has `first === true`.
  - `'寒聲 cannot shake her armour'`: with `powers: ['coldVoice']` and qi 100, after `action('coldVoice')` and 1 s, her `posture === 0`.
  - `'calling a name beside a bell breaks it and cracks the armour'`:
    - Put the hero 3 m from `b1` and call `action('callName')`.
    - Within 1 s, expect `bells.find(b => b.id === 'b1').broken`, `crone.armour === 3`, and one `bell-break` with `name === '老周'`.
  - `'a bell out of reach does not answer'`: 6 m from every bell, after 喚名 every bell is whole.
  - `'the last bell drops the armour, angers her, and blades bite again'`:
    - Break all four bells by moving the hero beside each one and waiting out the 4 s cooldown.
    - Expect an `armour-fall` event, `crone.enraged === true`, and `crone.state === 'stagger'`.
    - After that, one `hitEnemy(40, 10)` lowers her hp by 40.
  - `'the way on points to the nearest whole bell while she is armoured'`: with the hero near `b2`, `waypoint()` deep-equals `{x:9.5, z:3, kind:'bell', id:'b2'}`.
  - `'a retry at the crone's checkpoint finds every bell whole'`: break `b1`, then `retryCheckpoint()`. The new game's bells are all whole and its crone's armour is 4.
  - `'the armour is a rule of the role, not the body'`: with `ROLES.crone.skin` temporarily removed, the first test's blade check still holds.
  - `'she casts from afar and slams up close, and her temper shortens every tell'`: `roleSequence('crone', 0, false, 8)[0].name === '鈴聲'`, and `roleSequence('crone', 0, true, 2).length === 2`.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/crone.test.mjs`
  - Expected: FAIL (hp drops under the first cut).
- [ ] **Step 3: Implement** the rules above in `CampaignCombat`: `spawnStage`, `deploy`, `hitEnemy`, `answer`, an `invoke` override that calls `super.invoke` and then breaks bells, `waypoint`, and the standOff distance. Add the `crone` case in `roleSequence`.
- [ ] **Step 4: Cover the move names and bell lines in English**
  - Extend "the road is covered" to walk `BELLS`, and watch it fail.
  - Add the English entries.
- [ ] **Step 5: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 6: Commit** `Armour the crone in frozen voices that only a called name can break`

### Task 4: The snow story, its finds and the journal by realm

**Files:**
- Modify: `dist/story3d.js`, `dist/story-view.js`, `dist/lang-en.js`
- Test: `tests/story3d.test.mjs`, `tests/i18n.test.mjs`

**Interfaces:**
- Consumes: the realm fields `opening`, `ending`, `trueName`, `trueNameAfter`, `findName` and `rubbingTotal` (Task 1), and the events `armour-turn`, `bell-break` and `armour-fall` (Task 3).
- Produces:
  - `StoryDirector.start({campaign:true, realm})` queues `[realm.opening, STAGE_INTRO[first stage]]`.
  - `finish(won, game)` uses `game.rubbings() >= this.realm.rubbingTotal`.
  - `rubbing(id, count)` labels the line `` `${realm.findName} · ${count} / ${realm.rubbingTotal}` ``.
  - `bellLine(event)` returns `{id:'bell-'+event.id, speaker:'冰鈴 · '+event.broken+' / '+event.total, text:'「'+event.name+'」'+event.text}`.
- Produces: `NAMES` gains `v1`–`v6`. `REALM_SCENES = { mountain:[…the present SCENE_ORDER minus the duel ends], snow:[…] }`. `journalHTML(story)` renders one section per realm, plus the duel ends under the mountain.
- Produces: `SCENE_ORDER` stays exported and is every realm's list joined, followed by the duel ends.

Scenes. Each has 3–4 lines in the mountain's plain spoken voice and the `{title, chapter, purpose, lines}` shape. The beats below are fixed; the wording is the writer's.

| id | chapter | beat |
|---|---|---|
| snowOpening | 序 · 一張畫出來的狀紙 | The petition is a drawing: a valley, people with open mouths and no sound, a bell. 鍾馗 learns it was drawn by a mute girl. One line ties it to the mountain: some of the names the false god took were sold on. |
| hush | 序 · 啞村 | 阿聆, the mute girl, answers by writing in the snow. The whole village moves its lips without sound. Ice foxes break out of the drifts. |
| hushClear | 序 · 雪上的字 | 阿聆 writes that her mother 秋娘 went up the slope to buy her voice back and never came down. |
| slope | 壹 · 風雪坡道 | Travellers frozen mid-step on the pass wake and block the way. One still mutters a name it no longer owns. |
| slopeClear | 壹 · 凍客的名牌 | A wooden name tag on a fallen traveller reads 石生. 鍾馗 keeps it. |
| lake | 貳 · 冰湖 | Voices trapped under the lake ice. The crone's howler guards the crossing. |
| lakeClear | 貳 · 湖面裂開 | Under the cracked ice, 鍾馗 hears the village headman 老周 calling the hour, a voice that has been frozen for years. |
| cavemouth | 參 · 聲窟前 | Bells ring from inside the cave with no wind. 鍾馗 understands that each bell is a person. |
| cavemouthClear | 參 · 門後的鈴 | The way into the cave opens. 鍾馗 reasons aloud that a voice answers to its owner's name. **This is the guidance beat: call the name beside the bell.** |
| crone | 終 · 凍聲婆 | The crone explains she bought what the false god sold, and that she keeps the voices "safe" in ice. 鍾馗 says he will call each one home. One line names the armour: the ice on her is made of their voices. |
| croneEnd | 終 · 冰鈴盡碎 | The last bell breaks. The crone, unarmoured and beaten, lets slip that she was not the only buyer, without saying who. |
| snowEpilogue | 尾聲 · 啞村 | The village speaks again. 阿聆's first word. |
| snowTrueName | 尾聲 · 六聲俱全 | Only shown when all six 冰聲 were gathered: the six voices sing the valley's old name. |
| snowCoda | 尾聲 · 狀紙背面 | A new line appears on the back of the drawing, a vague hint at the next buyer. **It does not say what 寒聲 will be needed for.** |

- `STAGE_INTRO`: `hush → hush`, `slope → slope`, `lake → lake`, `cavemouth → cavemouth`, `crone → crone`.
- `STAGE_CLEAR`: each of the first four stage ids maps to `<id>Clear`.
- The six 冰聲, `v1`–`v6`, are each `{name, text}`: a person's last spoken words, frozen in an icicle. 老周, 石生, 秋娘 and 阿聆 are bells, not 冰聲, so the six are other villagers and travellers.
- Barks: add the cases below to `bark()`. The existing 12 s throttle and once-per-encounter rule still apply.

  | event | speaker | line |
  |---|---|---|
  | `armour-turn` with `first` | 鍾馗 | 刀砍不進去……這層冰裡，全是人的聲音。 |
  | `projectile-release` by howler | 吼風山魈 | 吼——！ |
  | `troop-defeated` traveller | 凍旅人 | 終於……可以躺下了。 |
  | `armour-fall` | 凍聲婆 | 我的冰……我的聲音！ |

- [ ] **Step 1: Write the failing tests** in `tests/story3d.test.mjs`:
  - `'the snow road opens with the drawn petition and its first chapter'`: `start({campaign:true, realm:'snow'})` opens `snowOpening`, then `hush`.
  - `'the whole snow road reveals its pages in order and ends at the coda'`: drive the real `CampaignCombat(null, {realm:'snow'})` events through `event()` and `finish(true, game)`. The ids seen deep-equal the snow list in `REALM_SCENES` minus `snowTrueName`.
  - `'all six frozen voices add the valley's old name'`: with `game.rubbings = () => 6`, `snowTrueName` follows `snowEpilogue`.
  - `'a find is counted against its own realm'`: in the snow, `rubbing('v1', 1).speaker === '冰聲 · 1 / 6'`; on the mountain, `rubbing('r1', 1).speaker === '名拓 · 1 / 12'`.
  - `'the first blocked cut is explained once'`: `bark({type:'armour-turn', first:true, enemyId}, game)` returns the line above. A second call within the same encounter returns null.
  - `'a broken bell reads out whose voice it held'`: `bellLine({id:'b4', name:'阿聆', text:'…', broken:4, total:4}).speaker === '冰鈴 · 4 / 4'`.
  - `'the journal keeps each realm apart and hides the snow until it is reached'`: `journalHTML` for a journal with only mountain pages contains no `寒聲嶺`. Adding `hush` shows a `寒聲嶺` section with 6 unknown 冰聲 lines.
  - Update the existing journal test, which counts 12 names, so it counts per realm.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/story3d.test.mjs`
  - Expected: FAIL on the new tests.
- [ ] **Step 3: Write the scenes, names and barks, and make the director and journal realm-aware.** The journal's intro line per realm is `借名山 · 鍾馗入山尋魂的原創長篇。` (unchanged) and `寒聲嶺 · 鍾馗循著一張畫出來的狀紙，上山討回被凍住的聲音。`
- [ ] **Step 4: Cover every new line in English**
  - Run "the story is covered". It walks `story3d`'s exports, so it fails on the new lines.
  - Add the English; it must be natural English, not a word-for-word gloss.
- [ ] **Step 5: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 6: Commit** `Write the snow realm's story, its frozen voices, and a journal kept by realm`

### Task 5: The snow scenery

**Files:**
- Create: `dist/snow-scenery3d.js`, `dist/snow-layout.js` (pure placement maths, testable without a DOM)
- Modify: `dist/campaign-world3d.js`, `dist/environment3d.js` (build the temple into a group), `dist/world3d.js` (`world.temple`), `package.json`
- Test: `tests/snow-scenery.test.mjs`

**Interfaces:**
- Consumes: `SNOW` (Task 1), `game.bells` (Task 3), `game.frosts` (Task 2) and `world.shelf.get('traveller')` (plan 2).
- Produces: `buildTemple(world, mountainGeometry, root = world.scene)`. `world3d.js` passes a new `this.temple = new THREE.Group()`. The temple-side rain created there is added to that group as well.
- Produces: `class SnowScenery { constructor(world); update(game, t, dt, active); reset() }`. It has the same contract as `JourneyScenery`: `enter()` keeps the base air, and `leave()` puts it back.
- Produces: `sceneryFor(realmId) → 'mountain' | 'snow'` from `campaign-world3d.js`.
  - `CampaignField` keeps `this.sceneries = { mountain: JourneyScenery, snow: SnowScenery }`.
  - Every frame it first updates the inactive one with `active = false`, so that one leaves and restores the air, and then updates the active one.
  - `this.scenery` still names the mountain one for existing callers.
- Produces from `snow-layout.js`:
  - `snowProps(route, seed) → { pines, statues, huts, banks }`, each a list of `{x, z, s, yaw}` that stays clear of the walkable road by at least 0.6 m.
  - `lakeArea(route) → {z0, z1}`
  - `PALETTE = { warning: '#b3261e', warningOpacity: [.3, .75], frost: '#cfe8ff' }`
- Produces: a role field `shade` (0–1). `dress()` multiplies a body's own colours by it, even when the body is the role's own. Set `shade: .82` on the fox.

What the snow scenery draws:
- **Ground and edges.**
  - The ground is one heightfield mesh along the route: pale blue-white snow with an ink-wash texture painted on a canvas, and banks that rise beyond the road's edges.
  - The cave is a ring of dark rock walls with an ice ceiling hint.
- **Snowfall.**
  - Camera-following points: 900 on phones, 2200 elsewhere, drifting rather than streaking. Their density is driven by the zone's `snow` mood.
  - The atmosphere's rain and splashes, `world.rain` and the embers are hidden while the snow scenery is on.
- **Props.** These are instanced and placed by `snowProps`:
  - Dark ink-green snow pines.
  - Frozen travellers standing by the road. They are clones of the loaded traveller body in a pale ice tint, or a simple hooded column when that body has not loaded.
  - Village huts in 啞村.
  - A flat, glossy ice sheet across `lakeArea`.
- **Gates.** A red seal across the doorway while the chapter stands, and a gold ring once it falls, the same as the mountain's. Plaques show `gateName`.
- **Finds and shrines.**
  - A 冰聲 is a cluster of pale icicles that glows until taken and darkens once taken.
  - Shrines use the mountain's look.
- **Bells.**
  - A bronze bell cased in ice hangs from a rope at each of `game.bells`.
  - A whole bell sways and glows pale blue.
  - When the bell breaks, its ice shatters with a ring burst (`combatVFX.ring`) and the bronze bell stays, dark and still.
- **Frost patches.** Discs in `PALETTE.frost`, drawn from `game.frosts`, that fade over their last second.
- **Air.** Fog colour, density and light drift toward the zone's mood, the way `JourneyScenery.update` does it.
- **Danger rings.** While the snow is on, `CampaignField` draws warning rings in `PALETTE.warning` with opacity from `.3` to `.75`. They are restored on leave.

- [ ] **Step 1: Write the failing tests** in `tests/snow-scenery.test.mjs`:
  - `'snow props never stand on the road'`: for 3 seeds, every item from `snowProps(SNOW, seed)` has `!SNOW.contains(x, z, -0.6)`, and there are at least 120 pines, 8 statues and 4 huts.
  - `'the lake lies in the lake zone'`: `lakeArea(SNOW)` falls within the `lake` zone's `from`/`to`.
  - `'each realm is drawn by its own scenery'`: `sceneryFor('mountain') === 'mountain'`, `sceneryFor('snow') === 'snow'`, and `sceneryFor('nowhere') === 'mountain'`.
  - `'the scenery being left lets go of the air before the next one takes it'`. Build a `CampaignField`-style update order with two stub sceneries that record calls. With a snow game, the mountain stub receives `active === false` before the snow stub receives `active === true`. Export the ordering helper `updateSceneries(sceneries, id, game, t, dt, active)` to test it.
  - `'a role's shade darkens even its own body'`: `dress()` on a stub model `{meshes:[{material:{color: white}}], own:true, height:1, root:{scale:{setScalar(){}}}}` with `{shade:.82}` leaves the colour at .82 white.
  - `'the temple is a group of its own'`: a source check that `world3d.js` passes `this.temple` to `buildTemple`.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/snow-scenery.test.mjs`
  - Expected: FAIL with "Cannot find module '../dist/snow-layout.js'"
- [ ] **Step 3: Implement** `snow-layout.js`, then `SnowScenery`, the temple group, the scenery switch, the palette and `shade`. Add both new modules to `check`.
- [ ] **Step 4: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 5: Look at it in the browser** with `?debug`: begin the snow realm and walk each zone.
  - Save screenshots to `docs/screenshots/snow/`: `<zone>-desktop.png` at 1280×800 for each zone, and `hush-phone.png` and `cave-phone.png` at 390×664.
  - Check that nothing of the temple shows.
  - Check that the fox, the danger rings and the frost discs read clearly on snow.
  - Then begin the mountain again in the same visit and check that its rain and temple are back.
- [ ] **Step 6: Commit** `Paint the snow road: snowfall, pines, frozen travellers, the ice lake and the bell cave`

### Task 6: Guidance on screen, the realm's results, and a full play-through

**Files:**
- Modify: `dist/game3d.js`, `dist/battle-map.js`, `dist/hero-arts3d.js` (if the bell-break ring is drawn there), `dist/lang-en.js`, `docs/story-direction.md` (a 寒聲嶺 section)
- Test: `tests/snow-hud.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: `bossHint(game) → string`, exported from a new small module `dist/boss-hint.js`. It is the present `boss-hint` expression in `game3d.js`, moved out so it can be tested, with these cases in front:
  - `game.status === 'won'` → `game.realm.wonHint`
  - The target is armoured and the hero is within `BELL_REACH` of an unbroken bell → `'鈴中有人 · 按 G 或「喚名」叫出名字'`
  - The target is armoured otherwise → `'冰甲護身 · 刀砍不入 · 走近冰鈴喚名'`
- Produces: the HUD count reads `` `擊破 ${kills} · 剩餘 ${remaining} · ${realm.findName} ${rubbings}/${realm.rubbingTotal}` ``. On the crone's stage it is followed by `` ` · 冰鈴 ${broken}/${total}` ``.
- Produces: `bell-break` shows `story.bellLine(e)` as a bark, `armour-fall` calls `announce('冰 甲 脫 落', 1.5)`, and the first `armour-turn` shows its bark.
- Produces: the results screen and the pause text use `realm.victory` and `rubbingTotal` instead of the mountain's fixed strings and the hardcoded 12. The journal's modal title becomes `志怪錄`.
- Produces: `drawBattleMap` draws unbroken bells as pale-blue rings and broken ones as grey dots. The `bell` waypoint is drawn as the gate ring is.

- [ ] **Step 1: Write the failing tests** in `tests/snow-hud.test.mjs`:
  - `'an armoured crone tells the hero to find a bell'`: at the crone's stage, `bossHint(g) === '冰甲護身 · 刀砍不入 · 走近冰鈴喚名'`.
  - `'beside a bell the hint says to call the name'`: with the hero 3 m from `b1`, the hint is `'鈴中有人 · 按 G 或「喚名」叫出名字'`.
  - `'once the armour is off, the ordinary hints return'`: after all bells break, the hint is neither of the two above.
  - `'a won realm says so in its own words'`: with `status = 'won'`, the hint is `'聲窟已靜'` in the snow and `'山門已破'` on the mountain.
  - `'the map shows the bells'`: `drawBattleMap` on a stub canvas whose context records `arc` calls draws at least 4 more arcs at the crone's stage than on the first snow stage.
  - `'the hint lines and the bell count have English'`: `toEnglish` of both hints, of `'冰鈴 2/4'`, of `'冰 甲 脫 落'` and of `'志怪錄'` contains no CJK.
- [ ] **Step 2: Run it to make sure it fails**
  - Run: `node --test tests/snow-hud.test.mjs`
  - Expected: FAIL with "Cannot find module '../dist/boss-hint.js'"
- [ ] **Step 3: Implement** the hint module, the HUD lines, the barks and announce, the results screen, the pause text, the journal title and the map bells. Add `boss-hint.js` to `check`.
- [ ] **Step 4: Run everything**
  - Run: `npm test && npm run check`
  - Expected: all pass.
- [ ] **Step 5: Play it through in the browser** (ego-browser, `?debug`), starting from a save with the mountain cleared:
  - The start screen shows both realm cards.
  - Play 寒聲嶺 from 啞村 to the crone with the keyboard, using `__inkblade` only to read state, never to move or heal the hero.
  - At the crone: the first cut is blocked and the bark shows; the hint leads to a bell; 喚名 breaks all four; the armour falls; she is beaten.
  - The ending pages play, and the results show `得到本事：寒聲`.
  - Reload: 寒聲 is kept, and its button shows on a phone.
  - Replay the mountain's first chapter: rain, temple and air are back, and 寒聲 works there.
  - Collect `error` and `unhandledrejection` throughout; expect none.
  - Record the play time.
  - Repeat the crone fight with `assets/snow/*` blocked (CDP `Network.setBlockedURLs`). The fight works with the fallback bodies.
- [ ] **Step 6: Check the phone and English**
  - At 390×664 and 390×844 portrait, take screenshots of the snow HUD, the crone with the bell hint, the journal and the results. Expect no overlap and no horizontal overflow (`document.documentElement.scrollWidth <= 390`).
  - In English mode, walk the snow realm's stages and the ending. `misses()` returns `[]`.
  - Save the screenshots to `docs/screenshots/snow/`.
- [ ] **Step 7: Write the 寒聲嶺 section** in `docs/story-direction.md`: the plot, the bells, what is original, and the verification results with numbers from Steps 5–6.
- [ ] **Step 8: Commit** `Guide the hero to the bells, tell each realm's win in its own words, and record the snow play-through`
