# 關卡地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓遊戲能有多關：每關一份路線資料、進度存檔、打倒魔王得到本事（喚名、寒聲）、開始畫面選關；第一關的結局交代名字被賣出去並給出喚名。

**Architecture:** 把 `journey3d.js` 裡寫死的那條路，抽成「用一份路線資料造出 `bounds/centre/contains`」的函式，借名山變成 `realms.js` 裡第一筆關卡資料。`CampaignCombat` 改讀 `this.realm`，不再直接匯入全域常數。進度存在 `progress.js`（瀏覽器本機），決定哪幾關解鎖、擁有哪些本事、血量上限加多少。本事是新的墨術招式，走現有 `startArt` 的路，但效果是定身與破勢，不是傷害。

**Tech Stack:** 純 ES modules、three.js 0.187（已內附）、node:test。沒有建置步驟。

**Spec:** `docs/superpowers/specs/2026-11-21-snow-realm-design.md`

這是三份計畫中的第一份：

| 順序 | 計畫 | 內容 |
|---|---|---|
| 1 | 地基（本計畫） | 一關一份資料、存檔、本事、選關 |
| 2 | 模型 | 凍聲婆與三種新怪的參考圖、3D、綁骨、按關載入。每一步花點數前都先問使用者 |
| 3 | 寒聲嶺內容 | 路線、雪地場景、新怪行為、冰鈴魔王戰、劇情、英文 |

本計畫做完時遊戲行為與現在相同，只多了喚名、新結局段落與進度存檔。只有一關時，選關畫面就是現在那張「開始征途」卡。

## Global Constraints

- **分支**
  - 全部工作在分支 `snow-realm` 上進行。`main` 一更新就會自動部署到 Cloudflare Pages。
  - 三份計畫都完成、使用者同意前，不要合併回 `main`。
- **測試**
  - `npm test` 與 `npm run check` 必須全過。
  - 新的 `dist/*.js` 模組要加進 `package.json` 的 `check` 指令。
- **翻譯**
  - 每一句會出現在頁面上的新中文都要在 `dist/lang-en.js` 加英文。
  - `tests/i18n.test.mjs` 會掃描匯出資料裡的中文。
- **介面**
  - 不可用 emoji。iOS 會把 ↗ 等符號畫成彩色 emoji，圖示用內嵌 SVG。
  - 手機直向 390×664、390×844、360×580 下新按鈕不可與搖桿、三鍵、其他輔助鈕重疊，也不可有水平溢出。
- **故事**
  - 口吻是白話口語，原創志怪。
  - 不引用古籍原文，也不冒稱古籍出處。
- **存檔**
  - 無法存取 localStorage 時照樣能玩，只是不保存。這和 `StoryDirector` 現在的做法一致。
- **第一關不變**
  - 敵人、數值、路線、場景都維持原樣。
  - 唯一的例外是結局多一段，以及在 `ROLES` 標上哪些敵人「有名字」。

## Review Focus

1. **localStorage 不可用、或 `inkblade.progress.v1` 是壞掉的 JSON**：要當成全新進度開始，不能拋錯。測試放在 Task 2。
2. **改版前就通關的老玩家**：志怪錄 `inkblade.journal.v1` 有 `ending`，第一次載入就要算通過第一關、擁有喚名；`inkblade.names.v1` 已收齊 12 個名字，就要算收齊第一關。測試放在 Task 2。
3. **還沒擁有本事、或墨氣不夠就按下本事鍵**：不改變任何狀態，畫面提示原因。測試放在 Task 3，提示在 Task 5。
4. **從檢查點重試**：要保留關卡、本事與血量加成，不能退回成第一關、沒有本事。測試放在 Task 1 與 Task 3。
5. **手機上多兩顆本事鈕**：390×664 與 360×580 的直向畫面上，各按鈕的矩形兩兩不重疊。驗證放在 Task 5。

---

### Task 1: 一關一份路線資料

**Files:**
- Create: `dist/realms.js`
- Modify: `dist/journey3d.js`
  - 新增 `makeRoute`。
  - `bounds/centre/contains/zoneAt` 改由 `makeRoute` 產生，原有匯出名稱保留。
- Modify: `dist/campaign3d.js`
  - `CampaignCombat` 改讀 `this.realm`。
  - `ROLES` 新增 `named` 欄位。
- Modify: `dist/battle-map.js`：改讀 `game.realm`。
- Modify: `dist/story3d.js`：`StoryDirector.start/event` 用 `realm.STAGES` 取章節 id。
- Modify: `dist/game3d.js`
  - 兩處寫死的 `/ 12` 改成 `game.realm.rubbingTotal`。
- Modify: `package.json`：`check` 加入 `dist/realms.js`。
- Test: `tests/realms.test.mjs`

**Interfaces:**
- Produces:
  - `makeRoute({journey, stations, zones})`
    - 回傳 `{JOURNEY, STATIONS, ZONES, bounds(z), centre(z), contains(x,z,margin=0), zoneAt(z)}`。
    - `journey` 的形狀同現在的 `JOURNEY`：`{south, north, start:{x,z}, courtyard?, courtyardFrom?}`。
    - 沒有 `courtyard` 時，北端就停在最後一站的寬度。
  - `REALMS`：凍結陣列，現在只有一筆借名山。每筆的欄位：
    - `id: 'mountain'`、`name: '借名山'`、`blurb: '山神借走了村民的名字'`
    - 展開 `makeRoute` 的結果，再加上 `STAGES`、`PICKUPS`
    - `rubbingTotal: 12`
    - `boss: 'nameless'`
    - `reward: 'callName'`
    - `ending: ['ending','epilogue','soldNames','coda']`
    - `trueName: 'trueName'`
  - `realmById(id) -> realm`：找不到時拋 `Error('unknown realm '+id)`。
  - `new CampaignCombat(checkpoint=null, {realm='mountain', powers=[], vigor=0}={})`
    - 新增 `this.realm`（物件）、`this.powers`（Set）、`this.vigor`（數字）。
    - `this.player.maxHp = 140 + vigor`，`hp` 同時補滿到這個值。
  - `checkpoint` 多存 `realm`、`powers`、`vigor`。`retryCheckpoint()` 把三者原樣帶回。
  - `ROLES[x].named: true`：`wolf`、`mare`、`shade`、`thrall` 四者，代表被拘的魂。

- [ ] **Step 1: 寫失敗的測試** `tests/realms.test.mjs`

```js
import { REALMS, realmById } from '../dist/realms.js';
import * as journey from '../dist/journey3d.js';
import { makeRoute } from '../dist/journey3d.js';
import { CampaignCombat, ROLES } from '../dist/campaign3d.js';

test('the mountain is the first realm and keeps its road exactly', () => {
  const m = realmById('mountain');
  assert.equal(REALMS[0], m);
  assert.equal(m.STAGES, journey.STAGES);
  assert.equal(m.rubbingTotal, 12);
  for (const z of [339, 300, 241, 150, 61, 12, 0, -9]) assert.deepEqual(m.bounds(z), journey.bounds(z));
  assert.throws(() => realmById('nowhere'), /unknown realm nowhere/);
});
test('a route without a courtyard ends at its last station', () => {
  const r = makeRoute({ journey: { south: 50, north: 0, start: { x: 0, z: 48 } }, stations: [[50, -5, 5], [10, -3, 3]], zones: [] });
  assert.deepEqual(r.bounds(0), { min: -3, max: 3 });
  assert.ok(r.contains(0, 30) && !r.contains(6, 30));
});
test('a campaign carries its realm, powers and vigor through a retry', () => {
  const g = new CampaignCombat(null, { powers: ['callName'], vigor: 20 });
  assert.equal(g.realm.id, 'mountain');
  assert.equal(g.player.maxHp, 160);
  assert.equal(g.player.hp, 160);
  const again = g.retryCheckpoint();
  assert.equal(again.realm.id, 'mountain');
  assert.ok(again.powers.has('callName'));
  assert.equal(again.player.maxHp, 160);
});
test('bound souls are named; masters and elites are not', () => {
  for (const id of ['wolf', 'mare', 'shade', 'thrall']) assert.equal(ROLES[id].named, true, id);
  for (const id of ['alpha', 'hanzhou', 'oni', 'nameless', 'lion', 'acolyte', 'scribe']) assert.ok(!ROLES[id].named, id);
});
```

- [ ] **Step 2: 跑測試確認失敗**

  執行 `node --test tests/realms.test.mjs`，預期失敗：找不到 `dist/realms.js`。

- [ ] **Step 3: 實作**
  1. `makeRoute` 用 `journey3d.js` 現有的 `bounds` 演算法，參數化。
  2. 匯入名稱不變，`journey3d.js` 原有匯出維持相同值，所以其他匯入者不必改。
  3. `realms.js` 從 `journey3d.js` 匯入借名山的資料，組成 `REALMS[0]`。
  4. `CampaignCombat` 裡用到 `STAGES/PICKUPS/JOURNEY/bounds/centre` 的地方全改成 `this.realm.*`。
  5. `battle-map.js` 的 `drawBattleMap(canvas, game)` 改讀 `game.realm`。
  6. `StoryDirector.start({..., realm})` 改讀 `realm.STAGES`，預設是借名山；`event` 改用 `game.realm.STAGES`。

- [ ] **Step 4: 跑全部測試**

  執行 `npm test && npm run check`，預期全過，包括原有的 `journey3d`、`campaign-dash`、`finishers-checkpoints`、`story3d`。

- [ ] **Step 5: Commit**：`Read the road from a realm so the campaign can have more than one`

---

### Task 2: 進度存檔

**Files:**
- Create: `dist/progress.js`
- Modify: `package.json`：`check` 加入 `dist/progress.js`
- Test: `tests/progress.test.mjs`

**Interfaces:**
- Consumes: `REALMS`、`realmById`，來自 Task 1。
- Produces:
  - 常數 `PROGRESS_KEY = 'inkblade.progress.v1'`、`VIGOR_STEP = 20`。
  - `class Progress`
    - `constructor(storage = null)`
    - `cleared: Set<realmId>`
    - `powers: Set<powerId>`
    - `complete: Set<realmId>`：收齊該關收集品的關卡。
  - `unlocked() -> realm[]`：第一關永遠在內；第 i 關在第 i-1 關通過後解鎖，依 `REALMS` 順序。
  - `vigor() -> number`：等於 `complete.size * VIGOR_STEP`。
  - `clear(realmId) -> powerId | null`
    - 記錄通過，給予 `realm.reward`。
    - 回傳「這次新得到」的本事；已經有了就回傳 `null`。
    - 寫回存檔。
  - `completeSet(realmId) -> boolean`：記錄收齊；第一次收齊時回傳 `true`，並寫回存檔。
  - 存檔 JSON 形如 `{v:1, cleared:[], powers:[], complete:[]}`；不認得的 id 讀取時丟掉。
  - 老玩家遷移：只在 `PROGRESS_KEY` 不存在時做一次。
    - `inkblade.journal.v1` 陣列含 `'ending'` → `clear('mountain')`。
    - `inkblade.names.v1` 陣列長度 ≥ 12 → `completeSet('mountain')`。

- [ ] **Step 1: 寫失敗的測試** `tests/progress.test.mjs`

  用一個 `Map` 包裝的假 storage，提供 `getItem` 與 `setItem`。

```js
test('a new player has only the mountain and no powers', () => {
  const p = new Progress(fakeStorage());
  assert.deepEqual(p.unlocked().map(r => r.id), ['mountain']);
  assert.equal(p.powers.size, 0);
  assert.equal(p.vigor(), 0);
});
test('clearing the mountain grants 喚名 once and is saved', () => {
  const s = fakeStorage(), p = new Progress(s);
  assert.equal(p.clear('mountain'), 'callName');
  assert.equal(p.clear('mountain'), null);
  const again = new Progress(s);
  assert.ok(again.cleared.has('mountain') && again.powers.has('callName'));
});
test('a player who finished before this update counts as having cleared the mountain', () => {
  const s = fakeStorage({ 'inkblade.journal.v1': JSON.stringify(['opening', 'ending']), 'inkblade.names.v1': JSON.stringify(['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12']) });
  const p = new Progress(s);
  assert.ok(p.cleared.has('mountain') && p.powers.has('callName') && p.complete.has('mountain'));
  assert.equal(p.vigor(), 20);
});
test('broken or missing storage starts a fresh run without throwing', () => {
  assert.doesNotThrow(() => new Progress(null));
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const p = new Progress(broken);
  assert.equal(p.clear('mountain'), 'callName', 'still works for this visit');
  const junk = new Progress(fakeStorage({ 'inkblade.progress.v1': '{not json' }));
  assert.equal(junk.cleared.size, 0);
  const strange = new Progress(fakeStorage({ 'inkblade.progress.v1': JSON.stringify({ v: 1, cleared: ['mountain', 'atlantis'], powers: ['callName', 'laser'] }) }));
  assert.deepEqual([...strange.cleared], ['mountain']);
  assert.deepEqual([...strange.powers], ['callName']);
});
```

- [ ] **Step 2: 跑測試確認失敗**

  執行 `node --test tests/progress.test.mjs`，預期失敗：找不到 `dist/progress.js`。

- [ ] **Step 3: 實作 `dist/progress.js`**

  合法的本事 id 是 `callName` 與 `coldVoice`，寫成檔內常數 `POWERS`。

- [ ] **Step 4: 跑測試**

  執行 `node --test tests/progress.test.mjs && npm run check`，預期全過。

- [ ] **Step 5: Commit**：`Save which realms are cleared and which powers the hero has earned`

---

### Task 3: 本事「喚名」與「寒聲」

**Files:**
- Modify: `dist/attack-moves.js`：`PLAYER_MOVES` 新增 `callName`、`coldVoice`。
- Modify: `dist/combat3d.js`
  - `ArenaCombat` 新增 `powers = new Set()`。
  - `action('callName' | 'coldVoice')` 走 `startPower`。
  - `land` 遇到 `move.effect` 時改呼叫 `invoke(move)`。
- Modify: `dist/campaign3d.js`：`invoke(move)` 處理群體。
- Modify: `dist/rig-clips.js`：`HERO_RIG.sequences` 加 `callName`、`coldVoice`，用已有的 `shout` 片段。
- Modify: `dist/audio3d.js`：`cueFor` 給兩個新事件配既有音效，`bell` 給喚名、`stone` 給寒聲。
- Test: `tests/powers.test.mjs`

**Interfaces:**
- Consumes: `CampaignCombat(checkpoint, {powers})` 與 `ROLES[x].named`，來自 Task 1。
- Produces:
  - `PLAYER_MOVES.callName`：仿 `seal` 的寫法。
    - `name: '喚名'`、`art: true`、`qiCost: 30`、`gain: 0`、`damage: 0`、`posture: 0`。
    - `range: 6.5`、`arc: 2.1`。
    - `effect: 'call'`、`stun: 1.6`。
    - 時長約 .8 秒，生效點在約 .45 秒。
  - `PLAYER_MOVES.coldVoice`
    - `name: '寒聲'`、`art: true`、`qiCost: 40`、`damage: 0`、`posture: 30`。
    - `range: 4.8`、`arc: Math.PI * 2`。
    - `effect: 'roar'`、`stun: 1.2`。
    - 時長約 .9 秒。
  - `ArenaCombat.startPower(id) -> boolean`。以下任一不成立就回傳 `false`、不改任何狀態，並 `emit('power-unavailable', {power:id, reason})`：
    - `this.powers.has(id)`，否則 `reason` 是 `'locked'`。
    - `p.qi >= cost`，否則 `reason` 是 `'qi'`。
    - `p.state` 是 `idle` 或 `guard`，且 `p.stun <= 0`，否則 `reason` 是 `'busy'`。
    - 條件都成立時，用 `startArt(id)` 起招。
  - `invoke(move)` 在生效點呼叫，對範圍與角度內每個活著的敵人：
    - **`effect:'call'`**：`ROLES[role].named` 且非 `boss`、非 `elite` 的敵人，`stun = max(stun, move.stun)`、`state = 'stagger'`、`comboLeft = 0`。其他敵人不受影響。
    - **`effect:'roar'`**：
      - 非 `boss` 且非 `elite` 的敵人照上一條定身，用 `move.stun`。
      - `boss` 或 `elite` 的敵人改加 `posture += move.posture`，達到上限就照現有規則破勢。
    - 完成後發 `emit('call-name' | 'cold-voice', {x, z, yaw, radius: move.range, hits: [enemyId...]})`。
    - **擴充點**：`invoke` 是給第三份計畫加冰鈴用的。冰鈴的邏輯放在 `CampaignCombat.invoke` 裡，先處理冰鈴，再交給 `super.invoke`。
  - 單挑模式 `ArenaCombat` 的 `invoke`：只對 `this.enemy` 套用同樣規則；單挑沒有 `ROLES`，所以喚名在單挑中無效。

- [ ] **Step 1: 寫失敗的測試** `tests/powers.test.mjs`

```js
test('a power the hero has not earned does nothing', () => {
  const g = new CampaignCombat();
  g.player.qi = 100;
  assert.equal(g.action('callName'), false);
  assert.equal(g.player.qi, 100);
  assert.equal(g.player.state, 'idle');
  assert.equal(g.drainEvents().at(-1).reason, 'locked');
});
test('喚名 costs 30 ink and holds a bound soul in front of the hero', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] }), p = g.player, wolf = g.enemies.find(e => e.role === 'wolf');
  wolf.x = p.x; wolf.z = p.z - 3; wolf.alert = true; p.yaw = Math.PI; p.qi = 50;
  assert.equal(g.action('callName'), true);
  assert.equal(p.qi, 20);
  for (let i = 0; i < 60; i++) g.update(1 / 60, {});
  assert.ok(wolf.stun > 0 && wolf.state === 'stagger');
  assert.ok(g.drainEvents().some(e => e.type === 'call-name' && e.hits.includes(wolf.id)));
});
test('喚名 cannot be used without enough ink', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] });
  g.player.qi = 29;
  assert.equal(g.action('callName'), false);
  assert.equal(g.drainEvents().at(-1).reason, 'qi');
});
test('寒聲 holds troops all round and wears down a master’s stance instead', () => {
  // A campaign put at the final chapter: the boss stands alone. Move it next to the hero.
  const g = new CampaignCombat({ ...new CampaignCombat().checkpoint, stage: 9 }, { powers: ['coldVoice'] }), p = g.player, boss = g.enemies[0];
  boss.x = p.x + 2; boss.z = p.z; boss.alert = true; p.qi = 100;
  const before = boss.posture;
  assert.equal(g.action('coldVoice'), true);
  for (let i = 0; i < 70; i++) g.update(1 / 60, {});
  assert.ok(boss.posture >= before + 30 || boss.exposed);
  assert.ok(!(boss.state === 'stagger' && !boss.exposed));
});
test('a retried checkpoint still knows its powers', () => {
  const g = new CampaignCombat(null, { powers: ['callName'] });
  g.player.qi = 100;
  assert.equal(g.retryCheckpoint().action('callName'), true);
});
```

  寒聲那一項的檢查點寫法：實作者依 `saveCheckpoint` 的實際結構調整，必要時直接呼叫 `spawnStage` 跳到 `nameless` 章；要驗證的事不變。

- [ ] **Step 2: 跑測試確認失敗**

  執行 `node --test tests/powers.test.mjs`，預期失敗：`action('callName')` 不認得。

- [ ] **Step 3: 實作**
  1. 照上面的 Interfaces 實作。
  2. 若 `seal` 的地面光環（`HeroArts`）能直接拿來畫喚名與寒聲，就沿用，字分別寫「名」與「聲」；畫面效果由實作者決定。
  3. `rig-clips` 的 `sequences.callName/coldVoice` 用 `shout` 片段，`range` 取舉劍那段 `[1.02, 1.55]`。

- [ ] **Step 4: 跑全部測試**

  執行 `npm test && npm run check`，預期全過。`hero-moves.test.mjs` 若列舉所有招式，要讓新招式通過它的檢查，不能刪檢查。

- [ ] **Step 5: Commit**：`Give the hero 喚名 and 寒聲, earned powers that hold foes instead of cutting them`

---

### Task 4: 第一關的新結局與獎勵

**Files:**
- Modify: `dist/story3d.js`
  - `SCENES` 新增 `soldNames`。
  - `SCENE_ORDER` 把它排在 `epilogue` 之後。
  - `finish()` 改用 `realm.ending`。
- Modify: `dist/game3d.js`：勝利時呼叫 `progress.clear(realm.id)`；結算畫面顯示新本事。
- Modify: `dist/lang-en.js`：新增場景與結算文字的英文。
- Test: 在 `tests/story3d.test.mjs` 加測試。

**Interfaces:**
- Consumes: `realm.ending`、`realm.trueName`（Task 1）、`Progress.clear`（Task 2）。
- Produces:
  - `StoryDirector.finish(won, game)`：佇列為 `game.realm.ending`。
  - 若 `game.rubbings() >= game.realm.rubbingTotal`，就把 `realm.trueName` 插在最後一頁之前。
  - 借名山的結果是 `['ending','epilogue','soldNames','trueName'?,'coda']`。

`soldNames` 的文字（定稿，實作照抄；`chapter`、`purpose` 照其他場景的格式）：

```
title: '賣出去的名字'
chapter: '終 · 契上餘字'
purpose: '有些名字，已經不在山上了'
lines:
 鍾馗：契紙燒到最後，背面浮出一排字。不是名字，是價錢。
 老婦：價錢？誰會買人的名字？
 鍾馗：買主不只一個。最近的一筆，往北，寫著「寒聲嶺」。
 鍾馗：剛才那些魂喊出自己名字的時候，這把刀跟著響了。以後叫一聲名字，被拘的魂就會停下來聽。
```

`lines` 的資料格式照 `SCENES` 現有的寫法（`speaker`、`text`）。英文由實作者翻，語氣平實。

- [ ] **Step 1: 寫失敗的測試**（加在 `tests/story3d.test.mjs`）

```js
test('the mountain’s ending tells where the names went, before the coda', () => {
  const s = new StoryDirector(null), g = new CampaignCombat();
  s.start({ campaign: true });
  s.skip();
  g.rubbings = () => 0;
  s.finish(true, g);
  const order = [s.current, ...s.queue];
  assert.deepEqual(order, ['ending', 'epilogue', 'soldNames', 'coda']);
  assert.ok(SCENE_ORDER.indexOf('soldNames') > SCENE_ORDER.indexOf('epilogue'));
});
```

- [ ] **Step 2: 跑測試確認失敗**：`soldNames` 不存在。

- [ ] **Step 3: 實作**
  1. 加入場景，讓 `finish()` 讀 `realm.ending`。
  2. `game3d.js` 收到 `victory` 時，若 `campaign`，呼叫 `const earned = progress.clear(game.realm.id)`。
  3. 若 `game.rubbings() >= game.realm.rubbingTotal`，呼叫 `progress.completeSet(game.realm.id)`。
  4. `showResults()` 在 `earned` 時多一行：`得到本事：喚名 · 按 G 或「喚名」鈕`。
  5. 收齊收集品時多一行：`血量上限 +20`。

- [ ] **Step 4: 跑全部測試**

  執行 `npm test && npm run check`，預期全過。`i18n.test.mjs` 會抓到漏翻的字。

- [ ] **Step 5: Commit**：`End the mountain with the names that were sold, and hand over 喚名`

---

### Task 5: 選關、本事按鈕與操作說明

**Files:**
- Modify: `dist/index.html`
  - `.mode-choices` 改由程式產生。
  - `.combat-utilities` 新增兩顆按鈕：`data-action="callName"`、`data-action="coldVoice"`，預設 `hidden`。
- Modify: `dist/game3d.js`
  - `begin(index, trial, retry, realmId)`。
  - 選關卡片的產生。
  - 鍵盤：G 是喚名、V 是寒聲。
  - `power-unavailable` 事件的提示文字：
    - `'locked'`：`尚未習得`
    - `'qi'`：`墨氣不足`
    - `'busy'`：不提示
  - 操作說明 `showHelp()` 加兩行。
  - HUD 更新本事鈕的就緒狀態。
- Modify: `dist/style3d.css`：本事鈕的樣式與手機排版。
- Modify: `dist/lang-en.js`：新增按鈕、提示、說明文字的英文。
- Test: `tests/phone-hud.test.mjs`（加測試）、`tests/realm-select.test.mjs`

**Interfaces:**
- Consumes: `Progress`（Task 2）、`startPower` 與事件（Task 3）、`REALMS/realmById`（Task 1）。
- Produces:
  - `realmCards(progress) -> [{id, name, blurb, first:boolean}]`：純函式，放在 `dist/progress.js`，方便測試。不放在 `realms.js`，因為 `progress.js` 已經匯入 `realms.js`，反過來會循環匯入。
    - 只有一關解鎖時，回傳單一一張 `first: true`。
    - 介面上 `first` 的卡維持現在「開始征途」卡的文字與樣子。
  - 遊戲開始時：`progress = new Progress(storage)`。
  - `begin(..., realmId)` 把 `{realm: realmId, powers: [...progress.powers], vigor: progress.vigor()}` 傳給 `CampaignCombat`。
  - 本事鈕只在 `progress.powers` 含該本事時顯示。

- [ ] **Step 1: 寫失敗的測試** `tests/realm-select.test.mjs`

```js
test('a first-time player sees the one journey card, unchanged', () => {
  const cards = realmCards(new Progress(null));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, 'mountain');
  assert.equal(cards[0].first, true);
});
test('the start screen keeps the existing campaign button for the first realm', () => {
  const html = read('index.html');
  assert.match(html, /id="campaign"/);
});
test('power buttons start hidden and are wired by their action', () => {
  const html = read('index.html');
  for (const id of ['callName', 'coldVoice']) assert.match(html, new RegExp(`data-action="${id}"[^>]*hidden|hidden[^>]*data-action="${id}"`));
});
```

  在 `tests/phone-hud.test.mjs` 再加一項：手機直向的 media query 裡，`.combat-utilities` 有容納四顆按鈕的規則，不是只有兩顆。用 CSS 文字比對，具體寫法依實作而定。

- [ ] **Step 2: 跑測試確認失敗**

- [ ] **Step 3: 實作**
  1. 有兩關以上解鎖時，`.mode-choices` 依 `realmCards` 產生多張卡，每張點下去就 `begin(0, true, false, id)`。
  2. 手機排版：本事鈕擁有後才出現，在 390×664 與 360×580 都不能壓到搖桿或三鍵。版面由實作者決定，可以兩列，也可以縮窄。

- [ ] **Step 4: 跑全部測試**：執行 `npm test && npm run check`，預期全過。

- [ ] **Step 5: 瀏覽器驗證**
  1. 啟動 `PORT=4173 node server.mjs`，開 `http://127.0.0.1:4173/?debug`。
  2. 在 DevTools console 寫入 `localStorage['inkblade.progress.v1'] = JSON.stringify({v:1, cleared:['mountain'], powers:['callName','coldVoice'], complete:[]})`，重新整理，進征途。
  3. 模擬手機 390×664、360×580（用 `Emulation.setDeviceMetricsOverride` 加觸控）。
  4. 用 `getBoundingClientRect` 量以下元素：`#joystick`、`.touch-actions`、`.combat-utilities` 內每顆按鈕。
  5. 確認兩兩不重疊，且 `document.documentElement.scrollWidth === innerWidth`。
  6. 截圖並目視檢查。
  7. 按 G 對墨狼使用喚名，確認牠停下來，墨氣少 30。
  8. 清掉 progress 再重新整理：首頁只有一張「開始征途」卡，看不到本事鈕。

- [ ] **Step 6: Commit**：`Choose a realm from the start screen and call on earned powers from the keys or the buttons`

---

### Task 6: 整體回歸

- [ ] **Step 1: 第一關從頭打到尾**

  在瀏覽器開 `?debug`，用 `__inkblade.game` 逐章清場：`enemies.forEach(e => e.hp = 0)` 後走過關口，一路到 `nameless`。確認：
  - 結局依序播出 `ending → epilogue → soldNames → coda`。
  - 結算畫面出現「得到本事：喚名」。
  - 回到首頁仍只有一張卡。目前只有一關，所以沒有第二張卡可選，這符合預期。
  - 重新整理後 `localStorage['inkblade.progress.v1']` 含 `mountain` 與 `callName`。

- [ ] **Step 2: 英文模式**

  切到英文跑一次 Step 1 的結局與結算，確認 `__inkblade.misses` 是空的。

- [ ] **Step 3: 測試與推送**

  執行 `npm test && npm run check`，預期全過。然後 `git push -u origin snow-realm`。不要合併到 `main`。
