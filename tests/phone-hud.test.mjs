import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');

// A phone held upright shows the fight in the middle of the screen: the hero's head sits about 44% of the way down,
// so on a 664px viewport (Safari with its bars showing) anything below ~250px is drawn over the fighters.
// The foe's bar therefore takes the chapter goal's place under the player's own bars for as long as a fight lasts.
test('on an upright phone the foe’s bar stays in the top column, clear of the fight', () => {
  const css = read('style3d.css'), game = read('game3d.js');
  const phone = css.match(/@media\(max-width:700px\) and \(min-height:541px\)\{([\s\S]*?)\n\}/)[1];
  const top = Number(phone.match(/\n\.boss-status\{top:(\d+)px/)[1]);
  assert.ok(top <= 200, `the foe's bar starts at ${top}px, which is over the fighters on a short phone`);
  assert.doesNotMatch(phone, /\.enemy-warning\{top:\d+px\}/, 'the warning is not pinned to a spot chosen for one screen height');
  assert.match(game, /\$\('hud'\)\.classList\.toggle\('fighting',!\$\('boss-status'\)\.hidden\)/, 'the HUD knows when the foe’s bar is showing');
  assert.match(css, /\.fighting #objective strong,\.fighting #objective-goal\{display:none\}/, 'the chapter goal gives up its place during a fight');
});

// A line spoken mid-fight is a subtitle: it belongs under the fighters' feet, just above the buttons, not across the hero.
// The combo prompt normally sits there, so it steps up out of the way for the few seconds the line is showing.
test('on an upright phone a spoken line sits just above the buttons, under the fight', () => {
  const css = read('style3d.css');
  const phone = css.match(/@media\(max-width:700px\) and \(min-height:541px\)\{([\s\S]*?)\n\}/)[1];
  const utilities = Number(phone.match(/\.combat-utilities\{[^}]*bottom:calc\((\d+)px/)[1]) + 48;
  const bark = Number(phone.match(/\n\.story-bark\{bottom:calc\((\d+)px \+ env\(safe-area-inset-bottom\)\)\}/)[1]);
  assert.ok(bark >= utilities && bark <= utilities + 16, `the line rests ${bark}px up; the buttons end ${utilities}px up`);
  assert.match(phone, /#hud:has\(~#story-bark:not\(\[hidden\]\)\) \.combo-hint\{bottom:calc\(\d+px/, 'the combo prompt moves above the line');
});

// With 喚名 and 寒聲 the support row holds four buttons. On an upright phone the row sits wholly above the stick,
// so its width never matters to the stick, and the spoken line moves up to sit above the row.
test('on an upright phone the support row clears the stick, however many buttons it holds', () => {
  const css = read('style3d.css');
  const phone = css.match(/@media\(max-width:700px\) and \(min-height:541px\)\{([\s\S]*?)\n\}/)[1];
  const stickTop = Number(phone.match(/#joystick\{bottom:calc\((\d+)px/)[1]) + 104;
  const row = Number(phone.match(/\.combat-utilities\{[^}]*bottom:calc\((\d+)px/)[1]);
  assert.ok(row >= stickTop + 4, `the support row starts ${row}px up; the stick ends ${stickTop}px up`);
});
