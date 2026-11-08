# Teaching case: making Inkblade with AI

[繁體中文](AI-GAME-WORKFLOW.zh-TW.md) · [Play and setup](../README.en.md)

This is a case study of one playable 3D browser prototype. AI accelerated reference art, character meshes and sound. The game rules, runtime rigging, animation, interactions, encounter design and integration are ordinary JavaScript work. Generated concept art alone was never treated as a finished game.

## Production sequence

1. **Define a small playable goal.** A rainy Chinese-fantasy arena, Zhong Kui as hero, three opponents, one story campaign and a single-opponent mode. Build the three-action control scheme first: attack, dodge/dash, guard.
2. **Create visual references.** OpenAI image generation produced the original hero and temple concepts. fal Nano Banana 2.1 supplied references for the monster, swordsman and wolf. Keep the design sheets consistent in silhouette, clothing, materials and palette. These are images, not playable models.
3. **Generate 3D assets.** Tripo H3.1 through fal converted four character references into textured GLB meshes. Check fronts, backs, orientation, texture resolution and mesh integrity in the preview pages. Meshy Rigging was tested; deformations made that output unsuitable for combat.
4. **Integrate and animate.** Three.js loads the meshes. Runtime code constructs skeletons/skin weights and drives walking, sword swings, wolf gait, dodges, hit reactions and death poses. The temple environment and combat effects are modeled/rendered in code. There is no Blender stage or motion capture.
5. **Make combat readable.** Keep combat simulation separate from rendering. Implement ranges, hit timing, stamina, posture, enemy windups, collisions and two distinct enemy styles. The wolf now has melee attacks only. Test full campaign progression, not just isolated attacks.
6. **Add story and voice.** The original “Borrowed Names Mountain” script links the wolf, guardian swordsman and false god. Higgsfield/ElevenLabs produced 37 Chinese dialogue clips with six consistent voices. Thirty-five character lines were regenerated with line-level emotion and delivery cues after flat delivery was noticed. Dialogue playback cancels the previous clip and the battle subtitle remains until a longer cry finishes.
7. **Test in the running game.** Run `npm run check` and `npm test`, then play in a real browser. Verify keyboard, mouse and touch layout, real damage, story transitions, audio playback and mobile viewport. Screenshots and the GIF in the README show the actual rendered prototype.

## Where the implementation lives

`dist/game3d.js` handles flow and input; `dist/combat3d.js` and `dist/campaign3d.js` handle combat; `dist/characters3d.js` and `dist/world3d.js` handle 3D characters and rendering; `dist/story3d.js` holds original dialogue; `dist/dialogue-audio.js` plays voices; `tests/` contains behavior tests. `art/direction/` contains selected design references. Raw provider receipts, account metadata and cloud output URLs stay local and are intentionally absent from this public repository.

The distributed game plays locally with no AI API key. Regenerating the media would need separate provider accounts and credits. This repository provides the playable output and enough technical context to teach the pipeline; it does not imply that a single prompt produced the entire game.
