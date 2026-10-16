# Cirque du Slay: Changelog

## v1.1 (2026-10-16)

### Balance (Mantis), all tunables in `js/data.js`
- **Golden Tickets intentionally differ from the GDD.** Bosses pay **2 / 3 / 4 / 6** GT (Clown Truck / Juggler / Pet Master / Cousins), so a full win pays 15 GT. The GDD says 1 / 2 / 3 / 5. Dying awards +1 GT per 4 waves cleared (`TUNE.gtPerWavesOnDeath = 4`). Both are part of Mantis's v1.1 unlock-speed tuning, so they should not be reverted to the GDD values.
- Cheaper characters: 250 GT unlocks now cost 60, and A10 costs 25.
- Waves 12–19 eased, wave-6 spike smoothed, +5 max HP per wave, shop stat items, a reachable infuse, Sword/Rifle specials fixed.
- Wave-5 Clown Truck HP is 1400 (`BOSS_HP_MULT_BY.E5 = 7`), and there is an off-screen boss arrow.

### Lore
- Intro, wave announcer, boss intro/death lines, unlock reveals, win/loss endings with ENCORE, character bios, and a Codex (characters, bestiary, fragments). All text comes from `assets/lore/lore.json`.

### Fixes
- Pause now really pauses (timers and tweens). Settings opens on top of the pause menu.
- Upgrade rolls can no longer get stuck. A double-click can't charge twice for an unlock.
- Old or partial saves load with defaults instead of crashing.
- The unlock card opens inside the Shop and never leaves the game paused.
- The iOS Safari rotate overlay no longer gets stuck, and a "Tap to play anyway" button was added.
- Asset URLs carry the build version (cache busting). Favicon added.

### Art (Drax)
- Hit and death sheets for all 29 characters, cleaned windups, a rebuilt Elephant and Pet Master, and painted-fire deaths.
