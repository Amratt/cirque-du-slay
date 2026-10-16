// Data transcribed from the GDD tables (Cirque du Slay, IMPACT Entertainments)
const U_SPEED = 55;   // px per "unit/sec" for movement speeds
const U_RANGE = 28;   // px per range unit
// LORE: Augustin's diary pages unlock only after their boss (story order). Other fragments drop at FRAG_DROP_CHANCE per kill (max 1 per wave).
const FAST_WAVE_T = 10;   // ?fast=1 wave length (BUG-008); ?gold=N sets starting balloons
// Animation frame skips for known art defects. Each skip only applies while the frame still matches 'when'
// (a frame-content check), so it silently does nothing once Drax ships a cleaned sheet. when: 'white' | 'always'
// Keys may use '*' wildcards.
const ANIM_FRAME_SKIPS = {};   // empty: Drax's cleaned sheets (Oct 16) need no skips. Add e.g. cousin1_death:[{frame:0, when:'white'}] if a defect returns   // currently skips: cousin1/cousin2/E2/A2 death f0 and 28 hit f0
const LORE_GATES = { frag_03:'E5', frag_04:'E15', frag_14:'E20' };
const FRAG_DROP_CHANCE = 0.012;
const BOSS_HP_MULT = 12;
const BOSS_HP_MULT_BY = { E5:7 };   // v1.1 (BUG-007): the truck kites melee starters; 200*7 = 1400 HP
const bossMult = id => BOSS_HP_MULT_BY[id] ?? BOSS_HP_MULT; // GDD boss HP (200-300) is far too low vs 7 weapons; scaled for v1

// Waves: duration (s) and enemy pools
const WAVES = {
  1:{t:30,pool:['E1']},2:{t:35,pool:['E1','E2']},3:{t:40,pool:['E1','E2','E3']},4:{t:45,pool:['E1','E2','E3','E4']},
  5:{boss:'E5'},
  6:{t:50,pool:['E6']},7:{t:55,pool:['E6','E7']},8:{t:60,pool:['E6','E7','E8']},9:{t:65,pool:['E6','E7','E8','E9']},
  10:{boss:'E10'},
  11:{t:70,pool:['E11']},12:{t:75,pool:['E11','E12']},13:{t:80,pool:['E11','E12','E13']},14:{t:85,pool:['E11','E12','E13','E14']},
  15:{boss:'E15'},
  16:{t:90,pool:['E1','E6','E11']},17:{t:90,pool:['E2','E7','E12']},18:{t:90,pool:['E3','E8','E13']},19:{t:90,pool:['E4','E9','E14']},
  20:{boss:'E20'}
};

// Enemy stats: rb, hp, hpW, dmg, dmgW, speed, behaviour, colour, name
const ENEMIES = {
  E1:{name:'Male Clown V.1',rb:[1,1],hp:20,hpW:5,dmg:5,dmgW:.5,spd:2,ai:'chase',col:0xf2f2f2,acc:0xe02020},
  E2:{name:'Male Clown V.2',rb:[1,1],hp:25,hpW:7,dmg:7,dmgW:.7,spd:2.5,ai:'chase',col:0xd8d0ff,acc:0x2050e0},
  E3:{name:'Female Clown V.1',rb:[1,1],hp:40,hpW:7,dmg:10,dmgW:1,spd:1.8,ai:'ranged',shot:'pie',col:0xffd0e8,acc:0xff40a0},
  E4:{name:'Female Clown V.2',rb:[1,1],hp:30,hpW:8,dmg:8,dmgW:.8,spd:2.2,ai:'ranged',shot:'pie',col:0xfff0b0,acc:0x40c040},
  E6:{name:'Muscle Man V.1',rb:[1,1],hp:40,hpW:9,dmg:12,dmgW:1.2,spd:1.6,ai:'burst',col:0xc08060,acc:0x202020},
  E7:{name:'Muscle Man V.2',rb:[1,1],hp:18,hpW:4,dmg:4,dmgW:.4,spd:3,ai:'burst',col:0xa06848,acc:0xd02020},
  E8:{name:'FlameThrower V.1',rb:[1,1],hp:35,hpW:7,dmg:9,dmgW:.9,spd:2.4,ai:'erratic',shot:'bomb',col:0x303030,acc:0xff8000},
  E9:{name:'FlameThrower V.2',rb:[1,1],hp:22,hpW:6,dmg:6,dmgW:.6,spd:2.8,ai:'erratic',shot:'bomb',col:0x502020,acc:0xffd000},
  E11:{name:'Seal',rb:[1,1],hp:15,hpW:3,dmg:3,dmgW:.3,spd:3.5,ai:'ranged',shot:'water',col:0x607888,acc:0xe03030},
  E12:{name:'Monkey',rb:[1,2],hp:45,hpW:8,dmg:12,dmgW:1.5,spd:1.7,ai:'ranged',shot:'ball',col:0x7a5030,acc:0xe03030},
  E13:{name:'Lion',rb:[1,2],hp:25,hpW:5,dmg:7,dmgW:.7,spd:2.9,ai:'chase',col:0xd8a030,acc:0x804010},
  E14:{name:'Elephant',rb:[1,2],hp:40,hpW:7,dmg:10,dmgW:1,spd:2.3,ai:'chase',big:1,col:0x9090a0,acc:0xe03030},
};
const BOSSES = {
  E5:{name:'The Clown Truck',gt:2,hp:200,dmg:15,spd:3},
  E10:{name:'The Juggler',gt:3,hp:200,dmg:20,spd:2.5},
  E15:{name:'The Pet Master',gt:4,hp:300,dmg:15,spd:0},
  E20:{name:'The Unknown Cousins',gt:6,hp:380,dmg:25,spd:3.2},
};

// Weapon stats per rarity index: 0 Common, 1 Rare, 2 Epic, 3 Special (base)
const RARITY = ['Common','Rare','Epic','Special'];
const RARITY_COL = [0xd0d0d0,0x4aa3ff,0xc060ff,0xf3c75a];
const WEAPONS = {
  Handgun:{melee:0,dmg:[10,13,15,10],as:[.8,.7,.6,.5],cd:[1.5,1.75,2,1.5],cc:[.10,.12,.15,.10],ls:[.05,.06,.07,.05],rng:[15,17,20,15],kb:[1.5,2,2.5,1.5],ms:[2,2.2,2.5,2],desc:'Medium fire rate, medium damage'},
  Rifle:{melee:0,dmg:[8,10,12,8],as:[.6,.5,.4,.6],cd:[1.25,1.5,1.75,1.25],cc:[.08,.10,.12,.08],ls:[.03,.04,.05,.03],rng:[20,25,30,22],kb:[1,1.5,2,1.5],ms:[1.8,2,2.3,1.8],desc:'High fire rate, low damage'},
  Shotgun:{melee:0,pellets:4,dmg:[22,27,32,22],as:[1.2,1,.9,1.2],cd:[1.25,1.5,1.75,1.25],cc:[.05,.07,.10,.05],ls:[.03,.04,.05,.03],rng:[10,12,15,12],kb:[2,2.5,3,2],ms:[1.5,1.8,2,1.5],desc:'Low fire rate, high damage'},
  Dagger:{melee:1,dmg:[12,16,20,12],as:[.6,.5,.4,.6],cd:[2,2.25,2.5,2],cc:[.15,.18,.20,.15],ls:[.08,.09,.10,.08],rng:[5,7,9,5],kb:[1,1.5,2,1],ms:[2.2,2.5,2.8,2.2],desc:'Swings fast, low damage'},
  Bat:{melee:1,dmg:[20,25,30,20],as:[.85,.75,.65,.85],cd:[1.5,1.75,2,1.5],cc:[.08,.10,.12,.08],ls:[.05,.06,.07,.05],rng:[8,10,12,8],kb:[2.5,3,3.5,2.5],ms:[1.8,2,2.3,2],desc:'Swings slow, high damage'},
  Sword:{melee:1,dmg:[22,28,34,22],as:[.9,.8,.7,.9],cd:[1.5,1.75,2,1.5],cc:[.10,.12,.15,.10],ls:[.05,.06,.07,.05],rng:[8,10,12,8],kb:[2,2.5,3,2],ms:[1.5,1.8,2,1.5],desc:'Medium speed, medium damage'},
};
// Special-weapon max values after 5 upgrades (from GDD upgrade rows); intermediate levels interpolated
const SPECIAL_MAX = {
  Handgun:{dmg:20,as:.5,cd:2.5,cc:.20,ls:.10,rng:25,kb:3,hp:350,ms:3},
  Rifle:{dmg:18,as:.3,cd:2,cc:.15,ls:.08,rng:35,kb:2.5,hp:350,ms:2.5},
  Shotgun:{dmg:50,as:.7,cd:2,cc:.12,ls:.08,rng:20,kb:4,hp:350,ms:2.1},
  Dagger:{dmg:25,as:.3,cd:2.85,cc:.25,ls:.125,rng:12,kb:3,hp:350,ms:3.1},
  Bat:{dmg:35,as:.7,cd:2.5,cc:.14,ls:.10,rng:15,kb:4,hp:350,ms:2.7},
  Sword:{dmg:40,as:.6,cd:2.5,cc:.20,ls:.10,rng:15,kb:3.5,hp:350,ms:2.8},
};
const STAT_KEYS = ['dmg','cd','cc','ms','hp','ls','rng','as','kb'];
const STAT_NAMES = {dmg:'Damage',cd:'Crit Damage',cc:'Crit Chance',ms:'Move Speed',hp:'Max Health',ls:'Lifesteal',rng:'Range',as:'Attack Speed',kb:'Knockback'};
const SHOP_ODDS = [[5,[80,15,5]],[10,[70,20,10]],[15,[50,35,15]],[20,[40,40,20]]];
const SHOP_COST = [15,30,50]; // red balloons, + wave scaling (GDD silent)

// Characters (coat colour, trim colour)
const CHARS = [
  {id:'A1',name:'Mr. Bee',w:'Bat',sw:'Honey Blade',unlock:'free',c:[0xf5c518,0x111111]},
  {id:'A2',name:'The LaughMaster',w:'Handgun',sw:'Nobody Nose',unlock:'E5',proj:0xff2020,c:[0xd02020,0xffffff]},
  {id:'A3',name:'The Flame Master',w:'Dagger',sw:'Pocket Lava',unlock:'E10',c:[0xff6a00,0x3a0a00]},
  {id:'A4',name:'The BeastMaster',w:'Bat',sw:"The King's Hand",unlock:'E15',c:[0x6b4a2a,0xe0b060]},
  {id:'A5',name:'The Nature Master',w:'Shotgun',sw:"Elephant's Wrath",unlock:'gt',gt:60,usd:'2.99',proj:0x40a0ff,c:[0x2f8f3f,0xa0e070]},
  {id:'A6',name:'The Ringmaster',w:'Sword',sw:"The Ringmaster's Sword",unlock:'E20',c:[0x9a0e1e,0xf3c75a]},
  {id:'A7',name:'The Rabbit King',w:'Rifle',sw:'Rabbit Rifle',unlock:'gt',gt:15,proj:0xff8a20,c:[0xeeeeee,0xff80b0]},
  {id:'A8',name:'The Pop Chef',w:'Rifle',sw:'Popcorn Shooter',unlock:'gt',gt:60,usd:'2.99',proj:0xfff2a0,c:[0xffffff,0xd02020]},
  {id:'A9',name:'Mr.Banana',w:'Sword',sw:'Banana Sword',unlock:'gt',gt:60,usd:'2.99',c:[0xffe135,0x6b4a10]},
  {id:'A10',name:'The Gardner',w:'Shotgun',sw:'Flower Shotgun',unlock:'gt',gt:25,usd:'0.99',proj:0xff70d0,c:[0x5a8a2a,0xff70d0]},
  {id:'A11',name:'Cregg',w:'Handgun',sw:'Egg Launcher',unlock:'gt',gt:60,usd:'2.99',proj:0xfffbe8,ptex:'egg_shot',c:[0xf0e8d0,0xe0a020]},
  {id:'A12',name:'Mr.Spicy',w:'Dagger',sw:'Hot Wing',unlock:'gt',gt:60,usd:'2.99',c:[0xc01010,0xffa000]},
];

// ---- Save system (localStorage) ----
const SAVE_KEY = 'cirque_du_slay_v1';
const Save = {
  d:null,
  defaults(){ return {v:2, gt:0, unlocked:['A1'], upgrades:{}, beaten:[], selected:'A1', settings:{music:.5,sfx:.7,control:'joystick'}, bestWave:0, codex:{seen:[],frags:[],introDone:false,encore:0}}; },
  load(){ let d=null; try{ d = JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){}
    const D=this.defaults(); if(!d||typeof d!=='object'||Array.isArray(d)) d={};
    const num=(v,f)=>(typeof v==='number'&&isFinite(v))?v:f, arr=(v,ok)=>Array.isArray(v)?[...new Set(v.filter(ok))]:[], obj=v=>(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
    const ids=CHARS.map(c=>c.id), str=x=>typeof x==='string';
    const o={v:2, gt:Math.max(0,num(d.gt,0)), unlocked:arr(d.unlocked,x=>ids.includes(x)), upgrades:{}, beaten:arr(d.beaten,str), bestWave:Math.max(0,num(d.bestWave,0))};
    if(!o.unlocked.includes('A1')) o.unlocked.unshift('A1');
    for(const [id,u] of Object.entries(obj(d.upgrades))) if(ids.includes(id)){ o.upgrades[id]={}; for(const k of ['dmg','cd','cc','ms','hp','ls','rng','as','kb']) o.upgrades[id][k]=Math.min(5,Math.max(0,num(obj(u)[k],0))|0); }
    o.selected = o.unlocked.includes(d.selected)?d.selected:'A1';
    const s=obj(d.settings); o.settings={music:Math.min(1,Math.max(0,num(s.music,D.settings.music))), sfx:Math.min(1,Math.max(0,num(s.sfx,D.settings.sfx))), control:str(s.control)?s.control:'joystick'};
    for(const k of Object.keys(s)) if(!(k in o.settings)) o.settings[k]=s[k];
    const c=obj(d.codex); o.codex={seen:arr(c.seen,str), frags:arr(c.frags,str), introDone:!!c.introDone, encore:Math.max(0,num(c.encore,0))};
    this.d=o; return this.d; },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); }catch(e){} },
  ups(id){ return this.d.upgrades[id] || (this.d.upgrades[id] = {dmg:0,cd:0,cc:0,ms:0,hp:0,ls:0,rng:0,as:0,kb:0}); }
};
Save.load();

function weaponStats(type, rar, charId){
  const W = WEAPONS[type], s = {type, rar, melee:W.melee, pellets:W.pellets||1};
  for(const k of ['dmg','as','cd','cc','ls','rng','kb','ms']) s[k] = W[k][rar];
  s.hp = rar===3 ? 100 : 0;
  if(rar===3 && charId){ const u = Save.ups(charId), M = SPECIAL_MAX[type];
    for(const k of STAT_KEYS){ const base = k==='hp'?100:s[k]; s[k] = base + (M[k]-base)*(u[k]/5); } }
  return s;
}
function rollRarity(wave){ const o = SHOP_ODDS.find(x=>wave<=x[0])[1]; let r = Math.random()*100;
  if(r < o[0]) return 0; if(r < o[0]+o[1]) return 1; return 2; }

// ---- v1.1 tunables (playtest knobs; balance pass by Mantis) ----
const TUNE = {
  spawnCap: 55,            // max enemies alive (+warnings) in normal waves (was 70)
  spawnIntervalBase: 1.6, spawnIntervalStep: .05, spawnIntervalMin: .6,
  newRaceSpawnMul: .7,     // waves 6 and 11 (first wave of a new enemy race) spawn 30% fewer
  hpPerWave: 5,            // max HP gained per wave cleared
  shopWaveCost: 3,         // weapon price + wave * this
  rerollBase: 3, rerollStep: 2,
  dupOfferChance: .35,     // chance one shop offer duplicates an owned Common/Rare weapon (makes infusing reachable)
  gtPerWavesOnDeath: 4,    // on death: +1 Golden Ticket per N waves completed (meta progression)
};
// Stat items sold in the shop for Red Balloons; applied to every weapon for the rest of the run
const SHOP_ITEMS = [
  {id:'dmg', label:'+10% Damage',       cost:18, mod:{dmg:1.10}},
  {id:'as',  label:'+8% Attack Speed',  cost:20, mod:{as:.92}},
  {id:'hp',  label:'+20 Max HP',        cost:15, add:{hp:20}},
  {id:'ms',  label:'+8% Move Speed',    cost:15, mod:{ms:1.08}},
  {id:'cc',  label:'+4% Crit Chance',   cost:16, add:{cc:.04}},
  {id:'ls',  label:'+3% Lifesteal',     cost:16, add:{ls:.03}},
  {id:'rng', label:'+10% Range',        cost:14, mod:{rng:1.10}},
];
const SHOP_ITEM_COST_STEP = 1.2;  // item price grows by wave*this
