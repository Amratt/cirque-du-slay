# Cirque du Slay sprites

All visuals load from this folder via `manifest.json` (`{"sprites":{key:entry}}`; the loader also accepts lists and an `animations` section).

## Rules
- **Replace a sprite:** drop a PNG with the same filename over it and reload. Nothing else to edit.
- **Size:** `size` is the gameplay box. The engine fits each image/frame into it, keeping the aspect ratio (the same effect as setDisplaySize), so any resolution works. `fit:false` entries are sized by the scene (UI, backgrounds, floor tile).
- **Missing file:** the built-in generated placeholder is used instead (originals are in `tools/placeholders/`).
- **Spritesheets:** one row of frames, with `frameWidth`/`frameHeight`/`frameCount`/`frameRate`/`loop`. Animation key = texture key.
- **Animation states** are found by name: `<base>_idle`, `_walk` (or `_move`, or legacy `_sheet`), `_hit`, `_death` (plays once, holds the last frame), `_windup` (boss telegraph, plays once, then a red flash), `_attack*`. If a state is missing, the still `<base>` sprite is shown.
- **9-slice UI:** `ui_panel` (24px margins) and `ui_button`/`_hover`/`_pressed` (16px margins, no text; the label is live text).
- **Tinted (keep white):** bullet, eshot, puff, spark and their sheets.
- **Import from art/:** `tools/import-art.sh [ART_DIR] [--dry-run] [--restore KEY|all]`.

## Keys

| Key | File | Box px (WxH) | Sheet | Orientation / notes |
|---|---|---|---|---|
| `arena_ring` | `arena_ring.png` | 2000x2000 |  | top-down 2000x2000; TRANSPARENT inside radius 880 around centre (1000,1000), OPAQUE outside (covers floor tile corners); wall 880-907px — Arena wall + audience overlay |
| `arena_tile` | `arena_tile.png` | 256x256 (fit:false) |  | seamless tileable, top-down — Arena floor tile (tileSprite clipped to the ring) |
| `balloon` | `balloon.png` | 22x34 |  | upright, string at bottom — Red balloon (currency pickup) |
| `box` | `box.png` | 36x30 |  | top-down — Juggler flamethrower box |
| `bullet` | `bullet.png` | 12x12 |  | round/symmetric; WHITE/light so engine tint colours it per weapon — Player projectile |
| `candy` | `candy.png` | 26x16 |  | any — Candy pickup (heals 30%) |
| `candy_cane` | `candy_cane.png` | 13x26 |  | see art/manifest.md — Candy cane (extra, unused) |
| `cousin1` | `cousin1.png` | 50x60 |  | front view, upright — Boss E20 Cousin 1 The Trickster |
| `cousin1_death` | `cousin1_death.png` | 50x60 | 128x256 ×6 @10fps once | see art manifest — from art:  |
| `cousin1_idle` | `cousin1_idle.png` | 50x60 | 128x256 ×6 @10fps loop | see art manifest — from art:  |
| `cousin1_windup` | `cousin1_windup.png` | 128x256 | 128x256 ×4 @12fps once | see art manifest — from art:  |
| `cousin2` | `cousin2.png` | 50x60 |  | front view, upright — Boss E20 Cousin 2 The Hunter |
| `cousin2_death` | `cousin2_death.png` | 50x60 | 128x256 ×6 @10fps once | see art manifest — from art:  |
| `cousin2_idle` | `cousin2_idle.png` | 50x60 | 128x256 ×6 @10fps loop | see art manifest — from art:  |
| `cousin2_windup` | `cousin2_windup.png` | 128x256 | 128x256 ×4 @12fps once | see art manifest — from art:  |
| `e_E1` | `e_E1.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E1 Male Clown V.1 |
| `e_E11` | `e_E11.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E11 Seal |
| `e_E11_death` | `e_E11_death.png` | 38x38 | 96x128 ×4 @10fps once | see art manifest — from art:  |
| `e_E11_walk` | `e_E11_walk.png` | 38x38 | 96x128 ×6 @10fps loop | see art manifest — from art:  |
| `e_E12` | `e_E12.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E12 Monkey |
| `e_E12_death` | `e_E12_death.png` | 38x38 | 96x128 ×4 @10fps once | see art manifest — from art:  |
| `e_E12_walk` | `e_E12_walk.png` | 38x38 | 96x128 ×6 @10fps loop | see art manifest — from art:  |
| `e_E13` | `e_E13.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E13 Lion |
| `e_E13_death` | `e_E13_death.png` | 38x38 | 96x128 ×4 @10fps once | see art manifest — from art:  |
| `e_E13_walk` | `e_E13_walk.png` | 38x38 | 96x128 ×6 @10fps loop | see art manifest — from art:  |
| `e_E14` | `e_E14.png` | 52x52 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E14 Elephant |
| `e_E14_death` | `e_E14_death.png` | 52x52 | 128x128 ×4 @10fps once | see art manifest — from art:  |
| `e_E14_walk` | `e_E14_walk.png` | 52x52 | 128x128 ×6 @10fps loop | see art manifest — from art:  |
| `e_E1_death` | `e_E1_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E1_walk` | `e_E1_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E2` | `e_E2.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E2 Male Clown V.2 |
| `e_E2_death` | `e_E2_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E2_walk` | `e_E2_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E3` | `e_E3.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E3 Female Clown V.1 |
| `e_E3_death` | `e_E3_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E3_walk` | `e_E3_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E4` | `e_E4.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E4 Female Clown V.2 |
| `e_E4_death` | `e_E4_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E4_walk` | `e_E4_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E6` | `e_E6.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E6 Muscle Man V.1 |
| `e_E6_death` | `e_E6_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E6_walk` | `e_E6_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E7` | `e_E7.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E7 Muscle Man V.2 |
| `e_E7_death` | `e_E7_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E7_walk` | `e_E7_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E8` | `e_E8.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E8 FlameThrower V.1 |
| `e_E8_death` | `e_E8_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E8_walk` | `e_E8_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `e_E9` | `e_E9.png` | 38x38 |  | front/top-down, centred; engine adds side-to-side wobble or bounce — Enemy E9 FlameThrower V.2 |
| `e_E9_death` | `e_E9_death.png` | 38x38 | 96x96 ×4 @10fps once | see art manifest — from art:  |
| `e_E9_sheet` | `e_E9_sheet.png` | 38x38 | 96x96 ×4 @6fps loop | horizontal strip of frames, each frame front view — FlameThrower V.2 animated (replaces e_E9 when present) |
| `e_E9_walk` | `e_E9_walk.png` | 38x38 | 96x96 ×6 @10fps loop | see art manifest — from art:  |
| `egg_shot` | `egg_shot.png` | 12x12 |  | round — Cregg (A11) special-weapon projectile (optional; tinted bullet if absent) |
| `eshot` | `eshot.png` | 14x14 |  | round/symmetric; WHITE/light so engine tint colours it per enemy — Enemy projectile (pies, water, balls) |
| `firedrop` | `firedrop.png` | 20x20 |  | round — Lobbed explosive / juggler flamethrower drop |
| `juggler` | `juggler.png` | 56x64 |  | front view, upright — Boss E10 The Juggler |
| `juggler_death` | `juggler_death.png` | 56x64 | 256x256 ×6 @10fps once | see art manifest — from art:  |
| `juggler_idle` | `juggler_idle.png` | 56x64 | 256x256 ×6 @10fps loop | see art manifest — from art:  |
| `juggler_windup` | `juggler_windup.png` | 256x256 | 256x256 ×4 @12fps once | see art manifest — from art:  |
| `menu_bg` | `menu_bg.png` | 1024x1024 |  | see art manifest — from art: Title/main menu background (full 1024x1024 mockup, includes mockup text/buttons) |
| `menu_bg_blank` | `menu_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for menu |
| `p_A1` | `p_A1.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A1 Mr. Bee |
| `p_A10` | `p_A10.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A10 The Gardner |
| `p_A10_idle` | `p_A10_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A10_walk` | `p_A10_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A11` | `p_A11.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A11 Cregg |
| `p_A11_idle` | `p_A11_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A11_walk` | `p_A11_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A12` | `p_A12.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A12 Mr.Spicy |
| `p_A12_idle` | `p_A12_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A12_walk` | `p_A12_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A1_death` | `p_A1_death.png` | 48x56 | 128x256 ×6 @10fps once | see art manifest — from art:  |
| `p_A1_hit` | `p_A1_hit.png` | 48x56 | 128x256 ×2 @12fps once | see art manifest — from art:  |
| `p_A1_idle` | `p_A1_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A1_walk` | `p_A1_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A2` | `p_A2.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A2 The LaughMaster |
| `p_A2_idle` | `p_A2_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A2_walk` | `p_A2_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A3` | `p_A3.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A3 The Flame Master |
| `p_A3_idle` | `p_A3_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A3_walk` | `p_A3_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A4` | `p_A4.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A4 The BeastMaster |
| `p_A4_idle` | `p_A4_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A4_walk` | `p_A4_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A5` | `p_A5.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A5 The Nature Master |
| `p_A5_idle` | `p_A5_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A5_walk` | `p_A5_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A6` | `p_A6.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A6 The Ringmaster |
| `p_A6_death` | `p_A6_death.png` | 48x56 | 128x256 ×6 @10fps once | see art manifest — from art:  |
| `p_A6_hit` | `p_A6_hit.png` | 48x56 | 128x256 ×2 @12fps once | see art manifest — from art:  |
| `p_A6_idle` | `p_A6_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A6_walk` | `p_A6_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A7` | `p_A7.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A7 The Rabbit King |
| `p_A7_idle` | `p_A7_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A7_walk` | `p_A7_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A8` | `p_A8.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A8 The Pop Chef |
| `p_A8_idle` | `p_A8_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A8_walk` | `p_A8_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_A9` | `p_A9.png` | 48x56 |  | front view, body facing RIGHT (sprite is flipped when moving left); transparent bg — Character A9 Mr.Banana |
| `p_A9_idle` | `p_A9_idle.png` | 48x56 | 128x256 ×4 @6fps loop | see art manifest — from art:  |
| `p_A9_walk` | `p_A9_walk.png` | 48x56 | 128x256 ×8 @12fps loop | see art manifest — from art:  |
| `p_ringmaster_alt` | `p_ringmaster_alt.png` | 48x56 |  | see art/manifest.md — Alt ringmaster skin (extra, unused) |
| `petmaster` | `petmaster.png` | 60x70 |  | front view, upright — Boss E15 The Pet Master |
| `petmaster_death` | `petmaster_death.png` | 60x70 | 256x256 ×6 @10fps once | see art manifest — from art:  |
| `petmaster_idle` | `petmaster_idle.png` | 60x70 | 256x256 ×6 @10fps loop | see art manifest — from art:  |
| `petmaster_windup` | `petmaster_windup.png` | 256x256 | 256x256 ×4 @12fps once | see art manifest — from art:  |
| `popcorn` | `popcorn.png` | 22x26 |  | upright — Popcorn pickup (heals 100%) |
| `popcorn_kernel` | `popcorn_kernel.png` | 16x16 |  | see art/manifest.md — Popcorn kernel (extra, unused) |
| `puff` | `puff.png` | 16x16 |  | round soft WHITE (tinted by engine) — Particle: gas puff / smoke |
| `puff_sheet` | `puff_sheet.png` | 16x16 | 16x16 ×4 @12fps loop | 4-frame horizontal strip, white (tinted) — Smoke puff dissipate anim |
| `ring` | `ring.png` | 40x40 |  | round, viewed top-down (engine spins it) — Cousins' rolling flaming ring |
| `spark` | `spark.png` | 8x8 |  | WHITE square/dot (tinted by engine) — Particle: spark |
| `spark_sheet` | `spark_sheet.png` | 8x8 | 8x8 ×4 @16fps loop | 4-frame horizontal strip, white (tinted) — Hit spark fade anim |
| `ticket` | `ticket.png` | 128x128 |  | square icon, shown at ~64px — Golden Ticket UI icon |
| `truck` | `truck.png` | 110x64 |  | top-down, front of truck pointing RIGHT (engine rotates it) — Boss E5 Clown Truck |
| `truck_alt` | `truck_alt.png` | 110x110 |  | see art/manifest.md — Clown Truck alt (extra, unused) |
| `truck_death` | `truck_death.png` | 110x64 | 256x256 ×6 @10fps once | see art manifest — from art:  |
| `truck_move` | `truck_move.png` | 256x256 | 256x256 ×6 @10fps loop | see art manifest — from art:  |
| `truck_windup` | `truck_windup.png` | 256x256 | 256x256 ×4 @12fps once | see art manifest — from art:  |
| `ui_button` | `ui_button.png` | 192x60 (fit:false) |  | 9-slice button normal (no text); margins 16px each side — 9-slice button normal (no text) |
| `ui_button_hover` | `ui_button_hover.png` | 192x60 (fit:false) |  | 9-slice button hover; margins 16px each side — 9-slice button hover |
| `ui_button_pressed` | `ui_button_pressed.png` | 192x60 (fit:false) |  | 9-slice button pressed; margins 16px each side — 9-slice button pressed |
| `ui_char_select_bg` | `ui_char_select_bg.png` | 1024x1024 |  | see art manifest — from art: Character select background (full 1024x1024 mockup, includes mockup text/buttons) |
| `ui_char_select_bg_blank` | `ui_char_select_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for char_select |
| `ui_counter` | `ui_counter.png` | 160x48 (fit:false) |  | icon slot circle at (24,24) r18, text x 50-150 — Balloon / GT counter frame |
| `ui_healthbar_fill` | `ui_healthbar_fill.png` | 192x20 (fit:false) |  | stretched horizontally; cropped to HP % — Health bar fill |
| `ui_healthbar_frame` | `ui_healthbar_frame.png` | 200x28 (fit:false) |  | inner area x4..196, y4..24 — Health bar frame |
| `ui_icon_button` | `ui_icon_button.png` | 64x64 (fit:false) |  | round, blank centre — Pause / icon button |
| `ui_panel` | `ui_panel.png` | 96x96 (fit:false) |  | 9-slice panel; margins 24px each side — 9-slice panel |
| `ui_run_complete_bg` | `ui_run_complete_bg.png` | 1024x1024 |  | see art manifest — from art: Run completed screen background (full 1024x1024 mockup, includes mockup text/buttons) |
| `ui_run_complete_bg_blank` | `ui_run_complete_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for run_complete |
| `ui_settings_bg` | `ui_settings_bg.png` | 1024x1024 |  | see art manifest — from art: Settings screen background (full 1024x1024 mockup, includes mockup text/buttons) |
| `ui_settings_bg_blank` | `ui_settings_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for settings |
| `ui_shop_bg` | `ui_shop_bg.png` | 1024x1024 |  | see art manifest — from art: Shop screen mockup background (full 1024x1024 mockup, includes mockup text/buttons) |
| `ui_shop_bg_blank` | `ui_shop_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for shop |
| `ui_title` | `ui_title.png` | 560x300 (fit:false) |  | logo, transparent bg — Main menu title logo (optional; text title if absent) |
| `ui_upgrade_bg` | `ui_upgrade_bg.png` | 1024x1024 |  | see art manifest — from art: Weapon upgrade screen background (full 1024x1024 mockup, includes mockup text/buttons) |
| `ui_upgrade_bg_blank` | `ui_upgrade_bg_blank.png` | 1024x1024 (fit:false) |  | no baked text; cover-scaled behind live UI — Background for upgrade |
| `w_Bat` | `w_Bat.png` | 40x40 |  | blade/tip pointing UP, handle at bottom (engine rotates toward target) — Weapon Bat |
| `w_Dagger` | `w_Dagger.png` | 40x40 |  | blade/tip pointing UP, handle at bottom (engine rotates toward target) — Weapon Dagger |
| `w_Handgun` | `w_Handgun.png` | 40x40 |  | barrel pointing RIGHT, centred (engine rotates toward target, flips vertically when aiming left) — Weapon Handgun |
| `w_Rifle` | `w_Rifle.png` | 40x40 |  | barrel pointing RIGHT, centred (engine rotates toward target, flips vertically when aiming left) — Weapon Rifle |
| `w_Shotgun` | `w_Shotgun.png` | 40x40 |  | barrel pointing RIGHT, centred (engine rotates toward target, flips vertically when aiming left) — Weapon Shotgun |
| `w_Sword` | `w_Sword.png` | 40x40 |  | blade/tip pointing UP, handle at bottom (engine rotates toward target) — Weapon Sword |
| `warn` | `warn.png` | 32x32 |  | symmetric, red — Enemy spawn warning X |
