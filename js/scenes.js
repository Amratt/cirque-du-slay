// ------------------------------------------------------------------ BOOT: generate placeholder sprites
class Boot extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){ this.load.json('manifest',V('assets/sprites/manifest.json')); this.load.json('audioManifest',V('assets/audio/manifest.json')); this.load.json('lore',V('assets/lore/lore.json')); }
  create(){
    // Phase 2: load every sprite listed in the manifest; missing files fall back to generated placeholders
    const raw = this.cache.json.get('manifest')||{}, man = {};
    // tolerant: sprites/animations may each be a {key:entry} map or a [{key,...}] list
    for(const sec of ['sprites','animations','anims','sheets']){ const x=raw[sec]; if(!x) continue;
      for(const [k,v] of Array.isArray(x)? x.map(e=>[e.key,e]) : Object.entries(x)){ if(!k||!v||!v.file) continue;
        const e=Object.assign({},v); e.frameWidth=e.frameWidth||null; if(!e.frameCount&&e.frames>1) e.frameCount=e.frames; if(!e.frameRate&&e.fps) e.frameRate=e.fps; man[k]=Object.assign(man[k]||{},e); } }
    window.SPRITE_MANIFEST = man;
    // audio: tolerant list / {sounds:[...]} / {key:entry}; each sound loads [ogg, mp3]; missing => synth fallback
    let al = this.cache.json.get('audioManifest')||[]; if(!Array.isArray(al)) al = al.sounds||al.audio||Object.entries(al).map(([k,v])=>Object.assign({key:k},v));
    al = al.filter(e=>e&&e.key&&e.file); Sfx.setup(this.game, al);
    for(const e of al){ const f=typeof e.file==='string'?[e.file]:[e.file.ogg,e.file.mp3].filter(Boolean); this.load.audio(e.key, f.map(x=>V('assets/audio/'+x))); } this.missing=[];
    for(const [k,v] of Object.entries(man)){ const url=V('assets/sprites/'+v.file);
      if(v.frameWidth) this.load.spritesheet(k,url,{frameWidth:v.frameWidth,frameHeight:v.frameHeight||v.frameWidth}); else this.load.image(k,url); }
    this.load.on('loaderror',f=>this.missing.push(f.key));
    this.load.once('complete',()=>{ if(this.missing.length) console.info('[assets] fallback (placeholder/synth) for:',this.missing.join(', '));
      for(const k of Object.keys(man)) if(this.textures.exists(k)) SPRITE_REAL[k]=1;
      this.makePlaceholders();
      // every spritesheet in the manifest becomes an animation with the same key (frames/fps from manifest); _hit/_death/_attack play once
      for(const [k,v] of Object.entries(man)) if(v.frameWidth&&this.textures.exists(k)&&!this.anims.exists(k)){
        let n = v.frameCount || (this.textures.get(k).frameTotal-1);
        this.anims.create({key:k,frames:framesFor(this,k,n),frameRate:v.frameRate||8,repeat:(v.loop===true)?-1:(v.loop===false)?0:(ONE_SHOT.test(k)?0:-1)}); }
      Lore.apply(this.cache.json.get('lore')); this.scene.start(QS.has('showcase')?'Showcase':'Menu'); });
    this.load.start();
  }
  makePlaceholders(){
    const g = this.make.graphics({add:false});
    const tex=(key,w,h,fn)=>{ if(this.textures.exists(key)) return; g.clear(); fn(g); g.generateTexture(key,w,h); };
    for(const ch of CHARS){ const [a,b]=ch.c;
      tex('p_'+ch.id,48,56,g=>{ g.fillStyle(0x000000,.35).fillEllipse(24,52,34,8);
        g.fillStyle(a,1).fillCircle(24,34,16); g.fillStyle(b,1).fillRect(14,30,20,4); g.fillRect(22,22,4,24);
        g.fillStyle(0xffe0c0,1).fillCircle(24,20,9); g.fillStyle(0x111111,1).fillRect(12,10,24,4); g.fillStyle(a,1).fillRect(16,0,16,11);
        g.fillStyle(b,1).fillRect(16,7,16,3); g.fillStyle(0x000000,1).fillCircle(21,20,1.6).fillCircle(27,20,1.6); }); }
    for(const [id,e] of Object.entries(ENEMIES)){ const r = e.big?22:15, S=r*2+8;
      tex('e_'+id,S,S,g=>{ const c=S/2; g.fillStyle(0x000000,.3).fillEllipse(c,S-4,r*1.6,6);
        if(id<'E5'&&id.length===2){ g.fillStyle(e.col,1).fillCircle(c,c,r); g.fillStyle(e.acc,1).fillCircle(c,c+2,4);
          g.fillStyle(e.acc,1).fillCircle(c-r+3,c-r+5,6).fillCircle(c+r-3,c-r+5,6); g.fillStyle(0,1).fillCircle(c-5,c-5,2).fillCircle(c+5,c-5,2);
          if(e.ai==='ranged'){ g.fillStyle(e.acc,1).fillTriangle(c-6,c-r-2,c+6,c-r-2,c,c-r-10); } g.lineStyle(2,0x800000).beginPath().arc(c,c+3,7,0.3,Math.PI-0.3).strokePath(); }
        else if(e.ai==='burst'){ g.fillStyle(e.col,1).fillRoundedRect(c-r,c-r+3,r*2,r*2-3,6); g.fillStyle(e.acc,1).fillRect(c-r,c+2,r*2,5);
          g.fillStyle(0,1).fillRect(c-r-4,c-2,4,10).fillRect(c+r,c-2,4,10).fillCircle(c-4,c-4,2).fillCircle(c+4,c-4,2); }
        else if(e.ai==='erratic'){ g.fillStyle(e.col,1).fillCircle(c,c,r); g.fillStyle(e.acc,1).fillTriangle(c-6,c-r,c+6,c-r,c,c-r-6+2).fillCircle(c,c-r+2,5); g.fillStyle(0xffffff,1).fillCircle(c-4,c-3,2).fillCircle(c+4,c-3,2); }
        else { g.fillStyle(0xffffff,1).fillCircle(c,c+r*.45,r*.55); g.fillStyle(e.acc,1).fillRect(c-r*.55,c+r*.35,r*1.1,3);
          g.fillStyle(e.col,1).fillCircle(c,c-r*.25,r*.75); if(id==='E13'){ g.fillStyle(e.acc,1).fillCircle(c,c-r*.25,r*.9); g.fillStyle(e.col,1).fillCircle(c,c-r*.25,r*.6); }
          if(id==='E14'){ g.fillStyle(e.col,1).fillRect(c-3,c-r*.1,6,r*.8); g.fillCircle(c-r*.7,c-r*.4,r*.4).fillCircle(c+r*.7,c-r*.4,r*.4); }
          g.fillStyle(0,1).fillCircle(c-4,c-r*.35,2).fillCircle(c+4,c-r*.35,2); } }); }
    tex('truck',110,64,g=>{ g.fillStyle(0xd02020,1).fillRoundedRect(4,10,72,44,8); g.fillStyle(0xf3c75a,1).fillRect(4,28,72,6);
      g.fillStyle(0x2050e0,1).fillRoundedRect(70,16,34,38,8); g.fillStyle(0xbfe8ff,1).fillRect(84,20,16,14); g.fillStyle(0xffffff,1).fillCircle(40,22,8); g.fillStyle(0xe02020,1).fillCircle(40,24,3);
      g.fillStyle(0x111111,1).fillCircle(22,56,8).fillCircle(86,56,8).fillCircle(22,8,8).fillCircle(86,8,8); g.fillStyle(0xaaaaaa,1).fillCircle(22,56,3).fillCircle(86,56,3).fillCircle(22,8,3).fillCircle(86,8,3); });
    tex('juggler',56,64,g=>{ g.fillStyle(0x2a2a8a,1).fillRect(16,28,24,30); g.fillStyle(0xf3c75a,1).fillRect(16,40,24,4); g.fillStyle(0xffe0c0,1).fillCircle(28,20,10);
      g.fillStyle(0xd02020,1).fillTriangle(18,12,38,12,28,0); g.fillStyle(0xff8000,1).fillCircle(8,8,5).fillCircle(48,8,5).fillCircle(28,-0+4,0); });
    tex('petmaster',60,70,g=>{ g.fillStyle(0x3a1010,1).fillTriangle(10,66,50,66,30,22); g.fillStyle(0xffe0c0,1).fillCircle(30,22,10); g.fillStyle(0x111111,1).fillRect(18,8,24,6).fillRect(22,0,16,10);
      g.lineStyle(5,0xff6a00,1).strokeCircle(30,40,0); });
    tex('cousin1',50,60,g=>{ g.fillStyle(0x4a0a5a,1).fillCircle(25,38,16); g.fillStyle(0xd0d0ff,1).fillCircle(25,18,10); g.fillStyle(0x111111,1).fillRect(12,6,26,5); g.fillStyle(0x00ffff,1).fillCircle(21,18,2).fillCircle(29,18,2); });
    tex('cousin2',50,60,g=>{ g.fillStyle(0x5a3a0a,1).fillCircle(25,38,16); g.fillStyle(0xe0c0a0,1).fillCircle(25,18,10); g.fillStyle(0x111111,1).fillRect(12,6,26,5); g.fillStyle(0xff2020,1).fillCircle(21,18,2).fillCircle(29,18,2); });
    tex('balloon',22,34,g=>{ g.fillStyle(0xe01020,1).fillEllipse(11,12,20,24); g.fillStyle(0xff8080,1).fillEllipse(7,8,5,7); g.lineStyle(1,0xffffff,.8).lineBetween(11,24,11,34); });
    tex('candy',26,16,g=>{ g.fillStyle(0xff60c0,1).fillCircle(13,8,6).fillTriangle(0,2,0,14,8,8).fillTriangle(26,2,26,14,18,8); g.fillStyle(0xffffff,1).fillRect(11,3,3,10); });
    tex('popcorn',22,26,g=>{ g.fillStyle(0xfff2a0,1).fillCircle(6,7,5).fillCircle(11,4,5).fillCircle(16,7,5); g.fillStyle(0xffffff,1).fillRect(3,9,16,16); g.fillStyle(0xe02020,1).fillRect(5,9,3,16).fillRect(11,9,3,16).fillRect(17,9,2,16); });
    tex('bullet',10,10,g=>{ g.fillStyle(0xffffff,1).fillCircle(5,5,4); });
    tex('eshot',14,14,g=>{ g.fillStyle(0xffffff,1).fillCircle(7,7,6); g.fillStyle(0x000000,.25).fillCircle(9,9,3); });
    tex('warn',30,30,g=>{ g.lineStyle(6,0xff0000,1).lineBetween(4,4,26,26).lineBetween(26,4,4,26); });
    tex('puff',16,16,g=>{ g.fillStyle(0xffffff,1).fillCircle(8,8,8); });
    tex('spark',6,6,g=>{ g.fillStyle(0xffffff,1).fillRect(0,0,6,6); });
    tex('ring',40,40,g=>{ g.lineStyle(6,0xff6a00,1).strokeCircle(20,20,15); g.lineStyle(2,0xffe000,1).strokeCircle(20,20,15); });
    tex('box',36,30,g=>{ g.fillStyle(0x8a5a2a,1).fillRect(0,0,36,30); g.lineStyle(3,0xff8000,1).strokeRect(2,2,32,26).lineBetween(2,2,34,28); });
    tex('firedrop',20,20,g=>{ g.fillStyle(0xff4000,1).fillCircle(10,10,9); g.fillStyle(0xffd000,1).fillCircle(10,10,4); });
    tex('arena_tile',256,256,g=>{ g.fillStyle(0xcfae78,1).fillRect(0,0,256,256); for(let i=0;i<260;i++){ g.fillStyle(Math.random()<.5?0xbf9c66:0xdcbf8c,.6).fillCircle(Math.random()*256,Math.random()*256,Phaser.Math.Between(2,6)); } });
    if(!this.textures.exists('arena_ring')){ const CX=1000,CY=1000,R=880; g.clear(); g.lineStyle(240,0x12060a,1).strokeCircle(CX,CY,R+150).lineStyle(400,0x12060a,1).strokeCircle(CX,CY,R+460); const cols=[0xe0b090,0xc08060,0x8a5a3a,0xf0d0b0,0x604030];
      for(let ring=0;ring<4;ring++){ const rr=R+40+ring*32, n=Math.floor(rr*2*Math.PI/26); for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+ring*.3;
        g.fillStyle(0x2a0a14,1).fillCircle(CX+Math.cos(a)*rr,CY+Math.sin(a)*rr+6,11); g.fillStyle(Phaser.Utils.Array.GetRandom(cols),1).fillCircle(CX+Math.cos(a)*rr,CY+Math.sin(a)*rr,8); } }
      for(let i=0;i<72;i++){ const a0=i/72*Math.PI*2,a1=(i+1)/72*Math.PI*2; g.lineStyle(26,i%2?0xffffff:0xb3001b,1).beginPath().arc(CX,CY,R+13,a0,a1).strokePath(); }
      g.lineStyle(4,0xf3c75a,1).strokeCircle(CX,CY,R+27).strokeCircle(CX,CY,R); g.generateTexture('arena_ring',2000,2000); }
    // NOTE arena_ring placeholder: outer dark fill is drawn first below via a separate texture pass
    tex('ui_panel',96,96,g=>{ g.fillStyle(0x3a2010,1).fillRoundedRect(0,0,96,96,14); g.fillStyle(0x6a0c16,1).fillRoundedRect(10,10,76,76,8); g.lineStyle(3,0xf3c75a,1).strokeRoundedRect(4,4,88,88,12); });
    const btn=(k,c)=>tex(k,192,60,g=>{ g.fillStyle(0x2a0a0a,1).fillRoundedRect(0,2,192,58,14); g.fillStyle(c,1).fillRoundedRect(0,0,192,56,14); g.lineStyle(3,0xf3c75a,1).strokeRoundedRect(2,2,188,52,12); });
    btn('ui_button',0x9a0e1e); btn('ui_button_hover',0xc8202e); btn('ui_button_pressed',0x6a0812);
    tex('ui_icon_button',64,64,g=>{ g.fillStyle(0x9a0e1e,1).fillCircle(32,32,30); g.lineStyle(4,0xf3c75a,1).strokeCircle(32,32,28); });
    tex('ui_counter',160,48,g=>{ g.fillStyle(0x000000,.65).fillRoundedRect(0,4,160,40,20); g.lineStyle(2,0xf3c75a,1).strokeRoundedRect(1,5,158,38,19); g.fillStyle(0x3a0a10,1).fillCircle(24,24,20); });
    tex('ui_healthbar_frame',200,28,g=>{ g.fillStyle(0x000000,.75).fillRect(0,0,200,28); g.lineStyle(2,0xffffff,1).strokeRect(1,1,198,26); });
    tex('ui_healthbar_fill',192,20,g=>{ g.fillStyle(0xd0102a,1).fillRect(0,0,192,20); g.fillStyle(0xff5060,1).fillRect(0,0,192,6); });
    // weapon icons
    const wcol={Handgun:0x888888,Rifle:0x6a4a2a,Shotgun:0x444444,Dagger:0xc0c0d0,Bat:0x9a6a3a,Sword:0xd0d0e0};
    for(const k of Object.keys(WEAPONS)) tex('w_'+k,40,40,g=>{ g.fillStyle(wcol[k],1);
      if(k==='Handgun'){ g.fillRect(6,12,26,8).fillRect(8,18,8,14); } if(k==='Rifle'){ g.fillRect(2,16,36,5).fillRect(4,19,10,8); }
      if(k==='Shotgun'){ g.fillRect(2,14,34,8).fillRect(4,20,10,10); }
      if(k==='Dagger'){ g.fillTriangle(20,2,15,28,25,28); g.fillStyle(0x553311,1).fillRect(12,28,16,4).fillRect(18,30,4,9); }
      if(k==='Bat'){ g.fillTriangle(16,38,24,38,20,2).fillCircle(20,8,6); }
      if(k==='Sword'){ g.fillRect(18,2,5,28); g.fillStyle(0xf3c75a,1).fillRect(10,28,21,4).fillRect(18,31,5,8); } });
    g.destroy();
  }
}

// ------------------------------------------------------------------ MENU
class Menu extends Phaser.Scene {
  constructor(){ super('Menu'); }
  create(){
    enterFx(this); this.add.rectangle(W/2,H/2,W,H,0x0b0507); if(SPRITE_REAL.menu_bg_blank) coverImage(this,'menu_bg_blank',.9); else curtains(this);
    const t1 = txt(this,W/2,150,'CIRQUE',96,BLOOD,{strokeThickness:10}), t2 = txt(this,W/2,240,'du SLAY',88,BLOOD,{strokeThickness:10});
    if((window.SPRITE_REAL||{}).ui_title){ t1.setVisible(false); t2.setVisible(false); const lg=this.add.image(W/2,190,'ui_title'); lg.setScale(Math.min(560/lg.width,300/lg.height));
      this.tweens.add({targets:lg,scale:lg.scale*1.05,angle:{from:-1.5,to:1.5},yoyo:true,repeat:-1,duration:1000,ease:'Sine.inOut'}); }
    [t1,t2].forEach((t,i)=>{ t.setShadow(4,4,'#000',6,true,true);
      this.tweens.add({targets:t,scale:{from:1,to:1.06},angle:{from:-1.5,to:1.5},yoyo:true,repeat:-1,duration:900+i*200,ease:'Sine.inOut'}); });
    // blood drips
    this.time.addEvent({delay:260,loop:true,callback:()=>{ const d=this.add.rectangle(W/2+Phaser.Math.Between(-260,260),Phaser.Math.Between(190,270),4,8,0x9a0010);
      this.tweens.add({targets:d,y:'+=140',scaleY:4,alpha:0,duration:1600,onComplete:()=>d.destroy()}); }});
    const ch = CHARS.find(c=>c.id===Save.d.selected);
    const play=()=>Lore.c().introDone?goScene(this,'Game',{charId:ch.id}):goScene(this,'Story',{kind:'intro',charId:ch.id});
    button(this,W/2,365,320,60,'New Game',play);
    button(this,W/2,435,320,60,'Characters',()=>goScene(this,'CharSelect'));
    button(this,W/2,505,320,60,'Codex',()=>goScene(this,'Codex'));
    button(this,W/2,575,320,60,'Settings',()=>goScene(this,'Settings',{back:'Menu'}));
    txt(this,W/2,640,`Playing as ${ch.name}  ·  ${ch.sw} (${ch.w})`,22,GOLD);
    counter(this,24,44,'ticket',`${Save.d.gt} GT`,GOLD);
    txt(this,W-20,H-20,'v1.1 browser slice',14,'#888').setOrigin(1,1);
    Sfx.music('music_menu_loop');
    this.input.once('pointerdown',()=>{ Sfx.init(); Sfx.startMusic(); });
    this.input.keyboard.once('keydown',()=>{ Sfx.init(); Sfx.startMusic(); });
    this.input.keyboard.on('keydown-ENTER',play);
  }
}

// ------------------------------------------------------------------ CHARACTER SELECT + unlock window
class CharSelect extends Phaser.Scene {
  constructor(){ super('CharSelect'); }
  create(){ enterFx(this); this.sel = Save.d.selected; this.build(); }
  build(){
    this.children.removeAll(true); curtains(this,'ui_char_select_bg_blank');
    txt(this,W/2,60,'Choose Your Character',44,GOLD);
    counter(this,W-190,40,'ticket',`${Save.d.gt} GT`,GOLD);
    const ch = CHARS.find(c=>c.id===this.sel), unlocked = Save.d.unlocked.includes(ch.id);
    const used = Object.values(Save.ups(ch.id)).reduce((a,b)=>a+b,0);
    // top-left: weapon, top-right: upgrades used + name (per GDD layout)
    this.add.image(90,130,'w_'+ch.w).setScale(1.6); txt(this,90,180,ch.sw,18,'#fff',{backgroundColor:'#3a0a10',padding:{x:8,y:4}});
    txt(this,W-140,110,`GT upgrades: ${used}/45`,20,GOLD); txt(this,W-140,150,ch.name,22,'#fff',{backgroundColor:'#3a0a10',padding:{x:8,y:4}});
    CHARS.forEach((c,i)=>{ const x = 290 + (i%6)*140, y = 250 + Math.floor(i/6)*190, un = Save.d.unlocked.includes(c.id);
      const r = panel(this,x,y,124,170).setInteractive({useHandCursor:true}); if(c.id!==this.sel) r.setTint(0x777777);
      r.on('pointerover',()=>{ if(c.id!==this.sel) r.clearTint(); }); r.on('pointerout',()=>{ if(c.id!==this.sel) r.setTint(0x777777); });
      r.on('pointerup',()=>{ Sfx.click(); this.sel=c.id; if(un){ Save.d.selected=c.id; Save.save(); } this.build(); });
      const im = this.add.image(x,y-18,'p_'+c.id).setScale(1.45); if(c.id===this.sel) this.tweens.add({targets:im,y:y-24,yoyo:true,repeat:-1,duration:500,ease:'Sine.inOut'}); if(!un) im.setTint(0x222222);
      txt(this,x,y+45,c.name,14,'#fff',{wordWrap:{width:115}});
      if(!un){ txt(this,x,y-25,'🔒',30); txt(this,x,y+68,c.unlock==='gt'?`${c.gt} GT${c.usd?' / $'+c.usd:''}`:`Beat ${c.unlock}`,13,GOLD); } });
    button(this,W/2-170,H-60,300,56,'Upgrade Weapon',()=>goScene(this,'Upgrade',{charId:ch.id}),{enabled:unlocked,size:22});
    button(this,W/2+170,H-60,300,56,'Get Character',()=>this.unlockWindow(ch),{enabled:!unlocked,size:22});
    { const L=Lore.char(ch.id); if(L.bio){ txt(this,W/2,H-150,`${L.title||''}`,LORE_MIN_FONT,'#ffd0a0');
      button(this,W/2,H-112,220,44,'Read more',()=>loreCard(this,`${L.name} — ${L.title}`,unlocked?`${L.bio}\n\n${L.circusLink}`:`${L.unlockLine}\n\n(Unlock ${L.name} to read the full story.)`,{quote:unlocked?L.quote:null,h:660,w:1160,size:26}),{size:20}); } }
    button(this,90,H-60,140,50,'Back',()=>goScene(this,'Menu'),{size:22});
  }
  unlockWindow(ch){
    const layer = this.add.container(0,0).setDepth(50);
    layer.add(this.add.rectangle(W/2,H/2,W,H,0,.7).setInteractive());
    layer.add(panel(this,W/2,H/2,600,360));
    layer.add(txt(this,W/2,H/2-120,'How do you want to get this character?',24,GOLD));
    const msg = txt(this,W/2,H/2+120,'',20,'#fff'); layer.add(msg);
    if(ch.unlock!=='gt'){ msg.setText(`${ch.name} unlocks for free by beating boss ${ch.unlock}.`); }
    else {
      layer.add(button(this,W/2-130,H/2-20,220,60,`Use ${ch.gt} GT`,()=>{
        if(Save.d.unlocked.includes(ch.id)) return; if(Save.d.gt>=ch.gt){ Save.d.gt-=ch.gt; Save.d.unlocked.push(ch.id); Save.d.selected=ch.id; Save.save(); msg.setText(`Congratulations! ${ch.name} has been unlocked.`); this.time.delayedCall(1200,()=>this.build()); }
        else msg.setText("You don't have enough Golden Tickets."); },{depth:51}));
      layer.add(button(this,W/2+130,H/2-20,220,60,ch.usd?`$${ch.usd}`:'N/A',()=>msg.setText('The transaction was canceled. Try again.\n(Payments not available in browser build)'),{enabled:!!ch.usd,depth:51}));
    }
    layer.add(button(this,W/2,H/2+60,160,46,'Close',()=>layer.destroy(),{depth:51,size:20}));
  }
}

// ------------------------------------------------------------------ WEAPON UPGRADE (GT)
class Upgrade extends Phaser.Scene {
  constructor(){ super('Upgrade'); }
  init(d){ this.charId=d.charId; }
  create(){ this.rolling=false; this.pending=null; this.events.once('shutdown',()=>{ if(this.rollEv){ this.rollEv.remove(false); this.rollEv=null; } if(this.pending){ Save.ups(this.charId)[this.pending]++; this.pending=null; Save.save(); } this.rolling=false; });   /* BUG-003 */ enterFx(this,true); curtains(this,'ui_upgrade_bg_blank'); const ch = CHARS.find(c=>c.id===this.charId);
    txt(this,W/2,50,'Weapon Upgrade',46,GOLD); txt(this,W/2,95,`${ch.sw} (${ch.w})  —  1 GT per upgrade, random stat`,20);
    this.gtC = counter(this,W-190,44,'ticket','',GOLD); this.rows={};
    // wheel: 9 stat segments around the weapon
    const cx=W/2, cy=385, R1=235; const wg=this.add.graphics(); wg.fillStyle(0x1a0a06,.85).fillCircle(cx,cy,R1+40); wg.lineStyle(6,0xf3c75a,1).strokeCircle(cx,cy,R1+40).strokeCircle(cx,cy,70);
    for(let i=0;i<9;i++){ const a=-Math.PI/2+i/9*Math.PI*2-Math.PI/9; wg.lineStyle(2,0x8a6a2a,1).lineBetween(cx+Math.cos(a)*70,cy+Math.sin(a)*70,cx+Math.cos(a)*(R1+40),cy+Math.sin(a)*(R1+40)); }
    this.add.image(cx,cy,'w_'+ch.w).setScale(2.2);
    STAT_KEYS.forEach((k,i)=>{ const a=-Math.PI/2+i/9*Math.PI*2, x=cx+Math.cos(a)*(R1-55), y=cy+Math.sin(a)*(R1-55);
      const lab=this.add.circle(x,y,62,0xb3001b,0); txt(this,x,y-22,STAT_NAMES[k],15,'#fff');
      const bars=[...Array(5)].map((_,j)=>this.add.rectangle(x-28+j*14,y+2,10,14,0x333333).setStrokeStyle(1,0x8a6a2a));
      this.rows[k]={lab,bars,val:txt(this,x,y+24,'',14,GOLD)}; });
    this.refresh();
    this.btn = button(this,W/2,H-45,320,56,'Upgrade (1 GT)',()=>this.roll());
    button(this,90,H-45,140,50,'Back',()=>goScene(this,'CharSelect'),{size:22});
  }
  refresh(){ const u = Save.ups(this.charId), ch = CHARS.find(c=>c.id===this.charId), s = weaponStats(ch.w,3,ch.id); this.gtC.label.setText(`${Save.d.gt} GT`);
    for(const k of STAT_KEYS){ this.rows[k].bars.forEach((b,j)=>b.setFillStyle(j<u[k]?0xf3c75a:0x333333));
      const v = s[k]; this.rows[k].val.setText(['cc','ls'].includes(k)?(v*100).toFixed(1)+'%':k==='cd'?(v*100).toFixed(0)+'%':k==='as'?v.toFixed(2)+'s':(+v.toFixed(2))+''); } }
  roll(){ if(this.rolling) return; const u = Save.ups(this.charId); const open = STAT_KEYS.filter(k=>u[k]<5);
    if(!open.length) return; if(Save.d.gt<1){ const t=txt(this,W/2,H-120,"You don't have enough Golden Tickets.",22,'#ff6060'); this.time.delayedCall(1500,()=>t.destroy()); return; }
    Save.d.gt--; const pick = Phaser.Utils.Array.GetRandom(open); this.rolling=true; this.pending=pick; Save.save(); let n=0;
    // flashing reveal that stops abruptly on the chosen stat
    const tok=this.rollTok=(this.rollTok||0)+1; const ev = this.rollEv = this.time.addEvent({delay:70,repeat:22,callback:()=>{ if(tok!==this.rollTok||!this.pending) return; n++; for(const k of STAT_KEYS) this.rows[k].lab.setFillStyle(0,0);
      const k = n>=22?pick:Phaser.Utils.Array.GetRandom(STAT_KEYS); this.rows[k].lab.setFillStyle(0xb3001b,.75); Sfx.tone(500+n*30,.04,'square',.1);
      if(n>=22){ u[pick]++; this.pending=null; Save.save(); this.rolling=false; Sfx.ticket(); this.refresh(); } }});
  }
}

// ------------------------------------------------------------------ SETTINGS
class Settings extends Phaser.Scene {
  constructor(){ super('Settings'); }
  init(d){ this.back = d.back||'Menu'; }
  create(){ enterFx(this,true); curtains(this,'ui_settings_bg_blank',.6); panel(this,W/2,380,700,520).setAlpha(.9); const s = Save.d.settings; txt(this,W/2,80,'Settings',54,GOLD);
    const slider=(y,label,key)=>{ txt(this,W/2-260,y,label,26).setOrigin(0,.5); const bx=W/2, bw=300;
      this.add.rectangle(bx+bw/2,y,bw,10,0x444444); const k = this.add.circle(bx+s[key]*bw,y,16,0xf3c75a).setInteractive({draggable:true,useHandCursor:true});
      k.on('drag',(p,x)=>{ x=Phaser.Math.Clamp(x,bx,bx+bw); k.x=x; s[key]=(x-bx)/bw; Sfx.apply(); Save.save(); }); };
    slider(220,'Music','music'); slider(300,'Sound FX','sfx');
    txt(this,W/2,400,'Mobile controls',26);
    const draw=()=>{ jb.label.setColor(s.control==='joystick'?GOLD:'#fff'); mb.label.setColor(s.control==='motion'?GOLD:'#fff'); };
    const jb = button(this,W/2-140,470,240,56,'Joystick',()=>{ s.control='joystick'; Save.save(); draw(); },{size:22});
    const mb = button(this,W/2+140,470,240,56,'Motion (tilt)',()=>{ s.control='motion'; Save.save(); draw();
      if(window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(()=>{}); },{size:22});
    draw();
    button(this,W/2,620,220,56,'Back',()=>{ if(this.back==='Game'){ this.scene.stop(); this.scene.resume('Game'); } else goScene(this,this.back); });
  }
}

// ------------------------------------------------------------------ SHOP (between waves)
class Shop extends Phaser.Scene {
  constructor(){ super('Shop'); }
  init(d){ this.run = d.run; this.rerolls = 0; this.offers = null; this.gone=false; }
  create(){ enterFx(this,true); Sfx.music('music_shop_loop'); this.rollOffers(); this.build(); this.input.keyboard.on('keydown-SPACE',()=>{ if(!this.revealOpen) this.go(); }); showReveals(this,this.run); }
  go(){ if(this.gone) return; this.gone=true; this.scene.stop(); this.scene.get('Game').nextWave(); }
  rollOffers(){ const types = Object.keys(WEAPONS); this.offers = [0,1].map(()=>{ const r = rollRarity(this.run.wave+1);
    return {type:Phaser.Utils.Array.GetRandom(types), rar:r, cost:SHOP_COST[r]+Math.floor(this.run.wave*TUNE.shopWaveCost), sold:false}; });
    const own=this.run.weapons.filter(w=>w.rar<2); if(own.length && Math.random()<TUNE.dupOfferChance){ const w=Phaser.Utils.Array.GetRandom(own); Object.assign(this.offers[1],{type:w.type,rar:w.rar,cost:SHOP_COST[w.rar]+Math.floor(this.run.wave*TUNE.shopWaveCost)}); }
    this.items = Phaser.Utils.Array.Shuffle(SHOP_ITEMS.slice()).slice(0,3).map(it=>Object.assign({},it,{cost:Math.round(it.cost+this.run.wave*SHOP_ITEM_COST_STEP),sold:false})); }
  build(){ this.children.removeAll(true); curtains(this,'ui_shop_bg_blank'); const run=this.run;
    txt(this,W/2,60,'Weapon Shop',48,GOLD); txt(this,W/2,108,`Wave ${run.wave} cleared!  Next: Wave ${run.wave+1}${WAVES[run.wave+1].boss?'  ⚠ BOSS':''}`,22);
    counter(this,24,44,'balloon',run.balloons,'#ff8090');
    this.offers.forEach((o,i)=>{ const x = W/2 + (i?220:-220), y = 300, s = weaponStats(o.type,o.rar);
      panel(this,x,y,390,310); this.add.rectangle(x,y-125,330,34,RARITY_COL[o.rar],.25);
      txt(this,x,y-125,`${RARITY[o.rar]} ${o.type}`,26,'#'+RARITY_COL[o.rar].toString(16));
      this.add.image(x-120,y-50,'w_'+o.type).setScale(1.8);
      txt(this,x+40,y-50,`DMG ${s.dmg}  ·  ${s.as}s\nCrit ${Math.round(s.cc*100)}% x${s.cd}\nRange ${s.rng} · KB ${s.kb}\nLifesteal ${Math.round(s.ls*100)}%`,17,'#ddd',{align:'left'});
      txt(this,x,y+40,WEAPONS[o.type].desc,16,'#aaa');
      const full = run.weapons.length>=6;
      button(this,x,y+100,240,54,o.sold?'Bought':full?'Slots full':`Buy  🎈${o.cost}`,()=>{ run.balloons-=o.cost; run.weapons.push({type:o.type,rar:o.rar}); o.sold=true; Sfx.buy(); this.build(); },
        {enabled:!o.sold&&!full&&run.balloons>=o.cost,size:22}); });
    // stat items (late-game balloon sink)
    txt(this,1150,180,'Stat Items',20,GOLD);
    this.items.forEach((it,i)=>button(this,1150,230+i*70,210,58,it.sold?'Bought':`${it.label}\n🎈${it.cost}`,()=>{ run.balloons-=it.cost; it.sold=true;
        for(const [k,v] of Object.entries(it.mod||{})) run.mods[k]=(run.mods[k]||1)*v; for(const [k,v] of Object.entries(it.add||{})) run.adds[k]=(run.adds[k]||0)+v; Sfx.buy(); this.build(); },
      {enabled:!it.sold&&run.balloons>=it.cost,size:15}));
    const rc = TUNE.rerollBase+this.rerolls*TUNE.rerollStep;
    button(this,W/2-150,500,260,50,`Reroll  🎈${rc}`,()=>{ run.balloons-=rc; this.rerolls++; this.rollOffers(); this.build(); },{enabled:run.balloons>=rc,size:20});
    button(this,W/2+150,500,260,50,'Watch Ad (n/a)',()=>{},{enabled:false,size:20});
    // inventory + infuse
    txt(this,W/2,565,`Your weapons (${run.weapons.length}/6 + special)`,20,GOLD);
    const ch = CHARS.find(c=>c.id===run.charId);
    const items=[{type:ch.w,rar:3}].concat(run.weapons);
    items.forEach((w,i)=>{ const x=W/2-(items.length-1)*42+i*84; panel(this,x,615,74,64).setTint(RARITY_COL[w.rar]); this.add.image(x,612,'w_'+w.type); });
    const dup = this.findDup();
    if(dup) button(this,W/2-150,680,280,46,`Infuse 2× ${RARITY[dup.rar]} ${dup.type}`,()=>{ let n=0; run.weapons=run.weapons.filter(w=>!(w.type===dup.type&&w.rar===dup.rar&&n++<2)); run.weapons.push({type:dup.type,rar:dup.rar+1}); Sfx.buy(); this.build(); },{size:18,col:0x5a2a8a});
    button(this,dup?W/2+170:W/2,680,280,46,'Next Wave ▶',()=>this.go(),{size:22,col:0x1e7a2e});
  }
  findDup(){ const m={}; for(const w of this.run.weapons){ if(w.rar>=2) continue; const k=w.type+w.rar; if(m[k]) return w; m[k]=1; } return null; }
}

// ------------------------------------------------------------------ RUN END
class End extends Phaser.Scene {
  constructor(){ super('End'); }
  init(d){ this.d=d; }
  create(){ const d=this.d; enterFx(this); curtains(this,'ui_run_complete_bg_blank'); this.time.delayedCall(400,()=>showReveals(this,{reveals:d.reveals})); Sfx.stopMusic(); d.win?Sfx.win():Sfx.lose();
    txt(this,W/2,110,d.win?'RUN COMPLETED!':'THE SHOW IS OVER',62,d.win?GOLD:BLOOD,{strokeThickness:8});
    txt(this,W/2,175,d.win?'The crowd roars. You survived all 20 waves.':`You fell on wave ${d.wave}.`,24);
    const stats=[['Waves',d.waves],['Golden Tickets',d.gt],['Kills',d.kills]];
    stats.forEach((s,i)=>{ const x=W/2+(i-1)*260; this.add.circle(x,340,95,0x2a0a10,.85).setStrokeStyle(6,0xf3c75a); txt(this,x,325,`${s[1]}`,54,'#fff'); txt(this,x,380,s[0],20,GOLD); });
    if(d.unlocks&&d.unlocks.length) txt(this,W/2,480,'Unlocked: '+d.unlocks.join(', '),24,'#7dff7d');
    txt(this,W/2,520,`Total Golden Tickets: ${Save.d.gt}`,22,GOLD);
    if(d.newBest){ const nb=txt(this,W/2+330,110,'NEW BEST!',30,'#7dff7d').setAngle(-12); this.tweens.add({targets:nb,scale:1.15,yoyo:true,repeat:-1,duration:400}); }
    const locked=CHARS.filter(c=>!Save.d.unlocked.includes(c.id)); const gtc=locked.filter(c=>c.unlock==='gt').sort((a,b)=>a.gt-b.gt)[0], bc=locked.find(c=>c.unlock!=='gt'&&c.unlock!=='free');
    const nx = gtc ? (Save.d.gt>=gtc.gt ? `Next unlock: ${gtc.name} — you can afford it now! (${gtc.gt} GT)` : `Next unlock: ${gtc.name} — ${gtc.gt-Save.d.gt} more GT`) : bc ? `Next unlock: beat ${bc.unlock} for ${bc.name}` : 'All characters unlocked!';
    txt(this,W/2,555,nx,LORE_MIN_FONT,'#ffd0a0');
    if(d.win){ const enc=Lore.c().encore; txt(this,W/2,590,enc?`Encore ${enc} complete. The show must go on.`:'The show must go on.',LORE_MIN_FONT,'#ffd0a0');
      button(this,W/2-300,650,250,58,'Main Menu',()=>goScene(this,'Menu'),{size:24}); button(this,W/2,650,250,58,'Codex',()=>goScene(this,'Codex',{tab:'frags'}),{size:24});
      button(this,W/2+300,650,250,58,'ENCORE ▸',()=>{ Lore.c().encore++; Save.save(); goScene(this,'Game',{charId:d.charId}); },{size:24}); }
    else { button(this,W/2-160,640,280,60,'Main Menu',()=>goScene(this,'Menu'));
      button(this,W/2+160,640,280,60,'Play Again',()=>goScene(this,'Game',{charId:d.charId})); }
  }
}

// ------------------------------------------------------------------ SHOWCASE (?showcase=1): every character in motion, labelled
class Showcase extends Phaser.Scene {
  constructor(){ super('Showcase'); }
  create(){ enterFx(this); this.add.rectangle(W/2,H/2,W,H,0x0b0507); if(SPRITE_REAL.menu_bg_blank) coverImage(this,'menu_bg_blank',.25);
    const L=[];
    CHARS.forEach(c=>L.push({base:'p_'+c.id,label:`${c.id}  ${c.name}`,group:'Heroes',seq:[['idle',1.3],['walk',1.3],['hit',.6]]}));
    Object.entries(ENEMIES).forEach(([id,e])=>L.push({base:'e_'+id,label:`${id}  ${e.name}`,group:'Enemies',seq:[['walk',1.2],['hit',.6],['death',1.4]]}));
    [['truck','E5  The Clown Truck'],['juggler','E10  The Juggler'],['petmaster','E15  The Pet Master'],['cousin1','E20-A  Cousin 1: The Trickster'],['cousin2','E20-B  Cousin 2: The Hunter']]
      .forEach(([b,n])=>L.push({base:b,label:n,group:'Bosses',seq:[[b==='truck'?'move':'idle',1.5],['windup',1.1],['hit',.6],['death',1.8]]}));
    this.list=L; this.i=-1; window.SHOWCASE={done:false,total:L.length,idx:0};
    this.title=txt(this,W/2,60,'',30,GOLD); this.name=txt(this,W/2,H-110,'',40,'#fff'); this.state=txt(this,W/2,H-60,'',24,'#ffb0b0'); this.prog=txt(this,W-20,H-20,'',16,'#999').setOrigin(1,1);
    this.add.ellipse(W/2,H/2+200,260,40,0x000000,.5); this.next(); }
  next(){ this.i++; if(this.spr) this.spr.destroy(); if(this.i>=this.list.length){ this.title.setText('Cirque du Slay — cast complete'); this.name.setText(''); this.state.setText(''); SHOWCASE.done=true; return; }
    const it=this.list[this.i]; SHOWCASE.idx=this.i; this.title.setText(it.group); this.name.setText(it.label); this.prog.setText(`${this.i+1} / ${this.list.length}`);
    const m=SPRITE_MANIFEST[it.base], box=(m&&m.size)?m.size:[64,64]; this.spr=this.add.sprite(W/2,H/2+20,it.base).setOrigin(.5,.5);
    const fh=k=>{ const a=k&&this.anims.get(k); return a?a.frames[0].frame.realHeight:256; };   // never upscale art beyond its native frame size (no resample blur)
    const target=Math.min(380, Math.max(it.group==='Enemies'?Math.min(260,2*fh(animFor(this,it.base,'walk'))):0, 1.0*Math.max(...it.seq.map(([st])=>fh(animFor(this,it.base,st)||(st==='move'?animFor(this,it.base,'walk'):null))))));
    this.spr.setScale(target/Math.max(box[0],box[1]));
    let t=0; it.seq.forEach(([st,d])=>{ this.time.delayedCall(t*1000,()=>{ if(!this.spr) return; this.spr._busy=false; this.spr._st=null; const k=animFor(this,it.base,st)||(st==='move'?animFor(this,it.base,'walk'):null);
        this.state.setText(k?`${st}  (${k}, ${this.anims.get(k).frames.length}f @ ${this.anims.get(k).frameRate}fps)`:`${st}  (no sheet — still sprite)`);
        this.spr.clearTint(); this.spr.off('animationcomplete');
        if(k){ this.spr.play(k,true); refit(this.spr);
          if(st==='hit'){ this.spr.play({key:k,repeat:2,repeatDelay:110});  }
          if(st==='windup'){ const back=animFor(this,it.base,it.base==='truck'?'move':'idle'); this.spr.play({key:k,repeat:1}); this.spr.once('animationcomplete',()=>{ if(!this.spr) return; if(back){ this.spr.play(back); refit(this.spr); } }); }   // telegraph twice (ends on the sheet's baked red flash), then back to the loop
 }   // death plays once and holds its last frame
        else { this.spr.anims.stop(); this.spr.setTexture(it.base); } }); t+=d; });
    this.time.delayedCall(t*1000+300,()=>this.next()); }
}
