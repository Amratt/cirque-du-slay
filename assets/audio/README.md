# Cirque du Slay — Audio Pack

55 sounds (6 music, 49 SFX), each as both `.ogg` (Vorbis) and `.mp3`. That's 110 files, about 5.1 MB in total.
Every sound was made from scratch with code by `../tools/gen_audio.py` (numpy synthesis, encoded with ffmpeg). No samples or outside recordings were used.
**License: CC0-1.0 for every file.** Run `python3 tools/gen_audio.py` to rebuild the pack (it overwrites `audio/`).

## Credits / licenses
| Files | Source | License |
|---|---|---|
| music/* (menu, combat, boss, shop loops; win/lose stingers) | Made with code: tools/gen_audio.py | CC0-1.0 |
| sfx/* (weapons, hits, clown deaths, pickups, shop, horn, boss, golden ticket, UI) | Made with code: tools/gen_audio.py | CC0-1.0 |

`manifest.json` lists every sound with `key, type, file{ogg,mp3}, loop, volume, duration, source, license`.

## Phaser 3 integration
```js
// preload
const man = this.cache.json.get('audioManifest'); // load 'audio/manifest.json' first via this.load.json
man.forEach(e => this.load.audio(e.key, ['audio/'+e.file.ogg, 'audio/'+e.file.mp3]));
```
**Music vs. SFX volume.** Keep two multipliers: `musicVol` and `sfxVol`, taken from Save.d.settings. For each sound, play it at `entry.volume * busVol`. Manifest volumes already put music quieter (0.42–0.5) than SFX (0.3–0.75).
```js
this.sound.play(key, { volume: e.volume * sfxVol });
```
**Picking a variant.** Keys that end in `_01`, `_02`, … are variants of one sound. Group them by prefix and choose one at random, e.g. `Phaser.Utils.Array.GetRandom(groups['sfx_enemy_death_clown'])`. A small random `detune` (±100) makes repeats sound less samey.

**Crossfading menu → combat → boss.** Use one looping music track at a time:
```js
function playMusic(scene, key){ const next = scene.sound.add(key,{loop:true,volume:0});
  next.play(); scene.tweens.add({targets:next, volume:vol(key)*musicVol, duration:1200});
  if (cur) { const old=cur; scene.tweens.add({targets:old, volume:0, duration:1200, onComplete:()=>old.destroy()}); }
  cur = next; }
```
Order: menu → combat (wave start) → shop (between waves) → boss (when the boss spawns) → stop the music and play the win/lose stinger.

**Unlocking audio on mobile.** Phaser unlocks WebAudio on the first touch by itself. Start the menu music inside `this.sound.once('unlocked', ...)`, or wait if `this.sound.locked` is true.

**Loops.** The music loops were built to wrap around with no gap: notes and reverb tails at the end carry over into the start. Use the OGG files for the cleanest loop. MP3 encoding adds a few ms of padding at the start, so browsers that only play MP3 (old Safari) may make a tiny tick at the loop point.

## Old `Sfx.*` (js/audio.js) → new keys
| old | new |
|---|---|
| click() | sfx_ui_click (sfx_ui_hover on hover) |
| shoot() | sfx_weapon_{handgun,rifle,shotgun}_fire_0N, sfx_weapon_dagger_throw_0N (match the weapon) |
| swing() | sfx_weapon_{bat,sword}_swing_0N |
| pop() | sfx_balloon_pop_0N |
| kill() | sfx_enemy_death_clown_0N (+ sfx_hit_flesh/blunt_0N on non-lethal hits) |
| crunch() | sfx_pickup_popcorn_0N / sfx_pickup_candy_0N (sfx_pickup_coin_0N for coins) |
| hurt() | sfx_player_hit_0N (sfx_player_death on death) |
| boss() | sfx_boss_windup_warning, then the music_boss_loop crossfade; sfx_boss_death |
| win() / lose() | music_win_stinger / music_lose_stinger |
| startMusic()/stopMusic() | music_menu_loop / music_combat_loop / music_shop_loop / music_boss_loop |
| (new) | sfx_wave_start_horn, sfx_shop_buy, sfx_shop_deny, sfx_golden_ticket |

## v2 candidates (pending Amr's pick) — `tools/gen_audio_v2.py`
This script writes only the files listed below and edits only their manifest entries. It never touches `music_menu_loop`.
Entries marked `"candidate": true` in manifest.json are waiting for a decision. `music_combat_loop` (v1) is still the default combat track.

| key | bpm | length | feel | preview |
|---|---|---|---|---|
| combat_v2a | 160 | 72.0s | stomping march in E minor, detuned calliope lead | music/previews/combat_v2a_preview.mp3 |
| combat_v2b | 150 | 64.0s | galloping circus-horse shuffle in E minor, organ + calliope | music/previews/combat_v2b_preview.mp3 |
| combat_v2c | 170 | 79.1s | frantic polka in A minor, reedy organ lead, most manic | music/previews/combat_v2c_preview.mp3 |
| music_boss_loop (v2, live) | 176 | 43.6s | double kick, toms, tritone drone, clashing organ stabs, laughs | — |
| music_boss_loop_v1 | 120 | 32.0s | backup of the original boss loop | — |

To adopt a candidate, point the combat crossfade at the chosen key (e.g. `combat_v2a`) and drop `candidate` from its manifest entry.
