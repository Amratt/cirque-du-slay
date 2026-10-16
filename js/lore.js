// ---------------------------------------------------------------- LORE (all text from assets/lore/lore.json)
let LORE = null;
const LORE_MIN_FONT = 22;                 // keeps every line readable on a phone (canvas scales ~0.55 at 720p FIT)
const Lore = {
  apply(j){ LORE = j||{}; const C=LORE.characters||{}, B=LORE.bestiary||{};
    CHARS.forEach(c=>{ if(C[c.id]&&C[c.id].name) c.name=C[c.id].name; });
    Object.keys(ENEMIES).forEach(id=>{ if(B[id]&&B[id].name) ENEMIES[id].name=B[id].name; });
    Object.keys(BOSSES).forEach(id=>{ if(B[id]&&B[id].name) BOSSES[id].name=B[id].name; }); },
  c(){ const d=Save.d; d.codex=d.codex||{}; const x=d.codex; x.seen=x.seen||[]; x.frags=x.frags||[]; if(x.introDone==null) x.introDone=false; if(!x.encore) x.encore=0; return x; },
  seeEnemy(id){ const x=this.c(); if(!x.seen.includes(id)){ x.seen.push(id); Save.save(); return true; } return false; },
  // fragments that may drop now: free ones + diary pages whose boss is beaten (story order)
  dropPool(){ const x=this.c(); return (LORE.fragments||[]).filter(f=>!x.frags.includes(f.id) && (!LORE_GATES[f.id] || Save.d.beaten.includes(LORE_GATES[f.id]))); },
  // gated pages with prior gates satisfied are awarded directly on boss death so the story always advances
  gatedFor(bossId){ return (LORE.fragments||[]).find(f=>LORE_GATES[f.id]===bossId && !this.c().frags.includes(f.id)); },
  give(f){ const x=this.c(); if(!f||x.frags.includes(f.id)) return null; x.frags.push(f.id); Save.save(); return f; },
  wave(n){ return (LORE.waves||[])[n-1]||''; },
  boss(id,k){ return ((LORE.bosses||{})[id]||{})[k]||''; },
  char(id){ return (LORE.characters||{})[id]||{}; },
};

// a modal reading card (used for bios, fragments, unlock reveal). Tap/Enter/Esc closes.
function loreCard(sc,title,body,opt={}){
  const L=sc.add.container(0,0).setDepth(opt.depth||200), w=opt.w||900, h=opt.h||520;
  const bg=sc.add.rectangle(W/2,H/2,W,H,0,.78).setInteractive(); L.add(bg);
  L.add(panel(sc,W/2,H/2,w,h));
  L.add(txt(sc,W/2,H/2-h/2+50,title,34,GOLD,{wordWrap:{width:w-80}}));
  const t=txt(sc,W/2,H/2-h/2+95,body,opt.size||LORE_MIN_FONT+2,'#fff',{wordWrap:{width:w-90},lineSpacing:6}).setOrigin(.5,0); L.add(t);
  if(opt.quote) L.add(txt(sc,W/2,t.y+t.height+22,`“${opt.quote}”`,LORE_MIN_FONT+2,'#ffd0a0',{fontStyle:'italic',wordWrap:{width:w-110}}).setOrigin(.5,0));
  const close=()=>{ if(!L.active) return; L.destroy(); sc.input.keyboard.off('keydown',key); opt.onClose&&opt.onClose(); };
  const key=e=>{ if(['Escape','Enter',' '].includes(e.key)) close(); };
  L.add(button(sc,W/2,H/2+h/2-45,200,52,opt.btn||'Close',close,{depth:(opt.depth||200)+1,size:22}));
  sc.input.keyboard.on('keydown',key); return L;
}

// unlock reveal: one card per newly freed character, using its unlockLine
function showReveals(sc,run){ const q=(run&&run.reveals)||[]; if(!q.length) return; const id=q.shift(), c=CHARS.find(c=>c.id===id), L=Lore.char(id);
  sc.revealOpen=true; Sfx.ticket(); const card=loreCard(sc,`New character unlocked: ${L.name||c.name}`,`${L.unlockLine||''}\n\n${L.title||''}`,{w:860,h:580,btn:'Welcome!',depth:3000,onClose:()=>{ sc.revealOpen=false; showReveals(sc,run); }});
  const pk=heroArt(sc,id), im=sc.add.sprite(W/2,H/2+75,pk); refit(im); if(pk==='p_'+id) setAnim(sc,im,pk,'idle'); fitTo(im,200,200);   // portrait_<id>, fitted (raw image width made it a speck)
  card.add(im); sc.tweens.add({targets:im,scaleX:im.scaleX*1.08,scaleY:im.scaleY*1.08,yoyo:true,repeat:-1,duration:500}); }

// ---------------------------------------------------------------- Story cards: intro / win / loss (skippable)
class Story extends Phaser.Scene {
  constructor(){ super('Story'); }
  init(d){ this.d=d||{}; this._fin=false; }
  create(){ enterFx(this); this.add.rectangle(W/2,H/2,W,H,0x060203); if(SPRITE_REAL.menu_bg_blank) coverImage(this,'menu_bg_blank',.35); else curtains(this,null,.35);
    const kind=this.d.kind||'intro'; this.cards = kind==='intro' ? (LORE.intro||[]) : ((LORE.endings||{})[kind]||[]); this.i=-1;
    this.line=txt(this,W/2,H/2-20,'',40,kind==='loss'?'#ffb0b0':'#fff',{wordWrap:{width:1000},lineSpacing:10});
    this.dots=txt(this,W/2,H-150,'',28,GOLD);
    txt(this,W/2,H-110,'Tap or press Enter to continue',LORE_MIN_FONT,'#bbb');
    button(this,W-110,50,170,52,'Skip ▸▸',()=>this.done(),{size:22});
    this.input.on('pointerup',p=>{ if(p.y>110) this.next(); }); this.input.keyboard.on('keydown-ENTER',()=>this.next()); this.input.keyboard.on('keydown-SPACE',()=>this.next()); this.input.keyboard.on('keydown-ESC',()=>this.done());
    if(kind==='win') Sfx.win(); this.next(); }
  next(){ if(this._fin) return; this.i++; if(this.i>=this.cards.length) return this.done();
    this.line.setText(this.cards[this.i]).setAlpha(0); this.tweens.add({targets:this.line,alpha:1,duration:450});
    this.dots.setText(this.cards.map((_,k)=>k===this.i?'●':'○').join(' ')); Sfx.click(); }
  done(){ if(this._fin) return; this._fin=true; const d=this.d;
    if(d.kind==='intro'){ Lore.c().introDone=true; Save.save(); goScene(this,'Game',{charId:d.charId}); }
    else goScene(this,'End',d.end); }
}

// ---------------------------------------------------------------- Codex: characters, bestiary, fragments
class Codex extends Phaser.Scene {
  constructor(){ super('Codex'); }
  init(d){ this.tab=(d&&d.tab)||'chars'; this.pg=0; }
  create(){ enterFx(this); this.input.keyboard.on('keydown-ESC',()=>goScene(this,'Menu')); this.build(); }
  build(){ clearUI(this); curtains(this,'ui_char_select_bg_blank');
    const x=Lore.c(), frs=LORE.fragments||[], best=Object.keys(LORE.bestiary||{});
    txt(this,W/2,50,'CODEX',48,GOLD);
    const tabs=[['chars',`Characters ${Save.d.unlocked.length}/${CHARS.length}`],['beasts',`Bestiary ${best.filter(id=>this.known(id)).length}/${best.length}`],['frags',`Fragments ${x.frags.length}/${frs.length}`]];
    tabs.forEach((t,i)=>{ const b=button(this,W/2+(i-1)*340,115,320,54,t[1],()=>{ this.tab=t[0]; this.pg=0; this.build(); },{size:22}); if(this.tab!==t[0]) b.setAlpha(.6); });
    let items=[];
    if(this.tab==='chars') items=CHARS.map(c=>{ const L=Lore.char(c.id), un=Save.d.unlocked.includes(c.id); return {key:heroArt(this,c.id),un,label:un?L.name:'???',sub:un?L.title:'Locked',open:()=>loreCard(this,`${L.name} — ${L.title}`,`${L.bio}\n\n${L.circusLink}`,{quote:L.quote,h:660,w:1160,size:26})}; });
    if(this.tab==='beasts') items=best.map(id=>{ const B=LORE.bestiary[id], un=this.known(id), boss=!!BOSSES[id]; return {key:this.etex(id),un,label:un?B.name:'???',sub:boss?'Boss':'',open:()=>loreCard(this,B.name,B.entry+(boss&&un?`\n\n“${Lore.boss(id,'intro')}”`:''),{})}; });
    if(this.tab==='frags') items=frs.map((f,i)=>{ const un=x.frags.includes(f.id), g=LORE_GATES[f.id]; return {key:'ticket',un,label:un?f.title:`Fragment ${i+1}`,sub:un?'':(g&&!Save.d.beaten.includes(g)?`Defeat ${BOSSES[g].name}`:'Drops in the ring'),open:()=>loreCard(this,f.title,f.text,{})}; });
    const per=8, pages=Math.ceil(items.length/per); this.pg=Math.min(this.pg,pages-1);
    items.slice(this.pg*per,this.pg*per+per).forEach((it,k)=>{ const cx=250+(k%4)*260, cy=270+Math.floor(k/4)*215;
      const p=panel(this,cx,cy,240,200); if(it.un){ p.setInteractive({useHandCursor:true}).on('pointerup',()=>{ Sfx.click(); it.open(); }); p.on('pointerover',()=>p.setTint(0xffe0a0)); p.on('pointerout',()=>p.clearTint()); }
      const im=this.add.image(cx,cy-35,this.textures.exists(it.key)?it.key:'ticket'); fitTo(im,110,110); if(!it.un) im.setTint(0x111111);
      txt(this,cx,cy+40,it.label,LORE_MIN_FONT,it.un?'#fff':'#888',{wordWrap:{width:225}}); if(it.sub) txt(this,cx,cy+76,it.sub,18,GOLD,{wordWrap:{width:225}}); });
    if(pages>1){ button(this,W/2-150,H-50,140,50,'◂ Prev',()=>{ this.pg=(this.pg+pages-1)%pages; this.build(); },{size:22}); txt(this,W/2,H-50,`${this.pg+1}/${pages}`,LORE_MIN_FONT); button(this,W/2+150,H-50,140,50,'Next ▸',()=>{ this.pg=(this.pg+1)%pages; this.build(); },{size:22}); }
    button(this,100,H-50,150,50,'Back',()=>goScene(this,'Menu'),{size:22});
    txt(this,W-30,H-50,'Tap an entry to read',18,'#bbb').setOrigin(1,.5); }
  known(id){ return BOSSES[id]?Save.d.beaten.includes(id):Lore.c().seen.includes(id); }
  etex(id){ const m={E5:'truck',E10:'juggler',E15:'petmaster',E20:'cousin1'}; return m[id]||('e_'+id); }
}
