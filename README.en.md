# Inkblade — a 3D ink fantasy combat game

[繁體中文](README.md)

Inkblade is a playable third-person 3D action prototype inspired by Zhong Kui and Chinese ghost stories. Sword in hand, the hero enters a rain-soaked temple to learn why villagers' names have been taken. Follow the campaign through a wolf pack, a swordsman encounter and a final mountain monster.

**[Play in your browser](https://inkblade-e2h.pages.dev/)**

## Gameplay

![Actual gameplay GIF of Zhong Kui fighting wolves in a rainy temple](docs/gameplay.gif)

| Story scene | Mobile controls |
| --- | --- |
| ![3D story scene with Zhong Kui and wolves](docs/gameplay-story.png) | ![Movement stick and three action buttons on mobile](docs/gameplay-mobile.png) |

The online game runs on Cloudflare Pages, serving the files in `dist/` and redeploying when GitHub `main` changes. Before publishing, we resized the four playable character textures to 2048 pixels, used WebP and simplified their meshes. Their combined model files fell from about 55 MB to 9.7 MB. The Name-Copying Scribe and the Gate Beast, added later, went through the same texture step with `scripts/compress-textures.mjs`: 31 MB down to 7.4 MB for the two, and 39 MB down to 12.6 MB for the three rigged models. Skeletal animation is the default; `?rig=0` switches back to the procedural rigs.

## What's new

**2026-11-14**

- **The game can be played in English.** A language button (EN / 中文) in the top-right corner switches the interface, prompts, move names, every line of dialogue and the journal, at any time; the choice is remembered in the browser. The first visit follows the browser's language, and `?lang=en` or `?lang=zh` in the address sets it directly. Gate plaques, steles and seals are part of the scenery and stay in Chinese. The English text lives in `dist/lang-en.js`; Chinese remains the single source.
- **Phones held upright: controls at the bottom edge, and a map that folds away.** The stick and the attack, dodge and guard buttons now sit at the bottom of the screen, with heal and ultimate above the attack cluster; the foe's health bar, which used to take that space, moved up under the objective. Tapping the map's title (or pressing M) folds it down to the place name and the count, and the choice is remembered.
- **Fix: fast attack taps zoomed the page on phones.** iPhone Safari read quick taps as a double-tap zoom, enlarging the page until only the three buttons were left, the stick was off screen, and there was no way back. The page no longer zooms on a double tap or a pinch.
- **The hero walks while guarding.** Holding guard and moving used to slide the hero across the ground with the sword raised and the feet still. Forward and backward now use motion-captured fighting-stance steps, sideways uses steps solved on the skeleton, and the upper body keeps the guard. The method is written up (in Chinese) in [`art/direction/rigged/README.md`](art/direction/rigged/README.md).
- **One way in from the title screen.** The single-duel card and the opponent picker are gone: the wolf, Shen Hanzhou and the mountain monster are all bosses along the campaign road, so a new player no longer walks into the hardest fight first.
- **Fix:** returning to the title from the campaign no longer logs an error on every frame.
- **Earlier the same day:** the campaign grew to ten chapters across eight regions with new foes (the Name-Copying Scribe, the Gate Beast and others) and new moves; the script was rewritten in plain speech; the hero, swordsman and mountain monster play skeletal animation by default; the ultimate gained a close-up; the title screen got painted key art.

## Story and modes

The stolen names have trapped the villagers' spirits in the mountains. Zhong Kui follows the trail through a bamboo forest, meets wolves bound by a curse, and faces the swordsman Shen Hanzhou, who has his own reason to guard the road. At the end waits a mountain monster claiming to protect the village. Dialogue, battle cries and an in-game journal carry the story.

- **Campaign:** A road of about 350 m up the mountain in ten chapters across eight regions: the nameless village, rain bamboo forest, forest of a thousand steles, the ravine bridge, the lantern road, the temple forecourt, the Hall of Borrowed Names, and a two-phase final fight in the temple courtyard. Foes hold their posts until you come near; there are ambushes, eleven enemy types, twelve collectible name rubbings and three roadside shrines. The route data lives in `dist/journey3d.js`.
- **Action combat:** Chain sword attacks, dash forward and strike, dodge sideways, guard, parry and counterattack. Each opponent has a distinct pace; wolves only fight up close.

## Play locally

```bash
git clone git@github.com:ywchiu/inkblade.git
cd inkblade
npm ci
npm start
```

Open <http://127.0.0.1:4173/> in a WebGL 2 browser. Playing does not require an AI account or API key.

## Basic controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Attack | Tap J / left click; hold for a heavy attack |
| Dodge and forward dash | Space with a movement direction |
| Guard and parry | Hold K / right click |
| Heal / special | R / F |

Tap attack to chain up to five sword strikes, or hold it for a heavy strike. Attack while dashing forward for a dash cut, or while sprinting (Shift plus a direction) for a leaping cut. While holding guard, tap attack to throw a crescent of ink (20 ink) or hold attack to slam a sealing ring around you (40 ink). A well-timed dodge or parry opens a counterattack. On a touch screen, move with the stick and push it past its ring to sprint; the three main action buttons are on the right.

## Making the game with AI

1. **Set the scope and visual direction.** Start with the hero, opponents, rainy temple, single duels and a short campaign (the duel entry was later folded into the campaign, where its three opponents are bosses along the road). Aim for grounded Chinese fantasy, with ink in the atmosphere and combat effects.
2. **Create character references.** GPT Image shaped the hero and environment; Nano Banana 2.1 supplied other character references. Keep costumes, silhouettes and colors consistent before building models.
3. **Build 3D characters.** Tripo H3.1 turned the references into models. Check proportions, materials and different views inside the game.
4. **Make it playable.** JavaScript and Three.js power the 3D world, character movement, combat rules, enemy behavior, levels, interface and touch controls. Game code drives the animations and combat.
5. **Add story and sound.** Write the Borrowed Names Mountain dialogue and voice the characters with the ElevenLabs voice model (only the first chapters were recorded, and speech is switched off in the game for now: `VOICE_ON` in `dist/story3d.js`). Music and effects use Higgsfield, Mirelo and Kenney assets.
6. **Playtest and improve.** Test visuals, controls and combat pace in the browser, then revise until the campaign can be played through.

AI helped create images, models and sound. Three.js and the game code turn those assets into an interactive story and combat experience. The GIF and screenshots above show the running game.

## Repository layout

`dist/` contains the playable web game and assets; `tests/` contains automated combat and story checks; `art/direction/` holds visual references. Run `npm start` to play, or check the code with:

```bash
npm run check
npm test
```
