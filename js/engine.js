// Shared engine helpers: manifest-driven sprite fitting, animation states, pooling, UI widgets, scene transitions.
const W = 1280, H = 720;
const GOLD = '#f3c75a', BLOOD = '#b3001b';
window.SPRITE_MANIFEST = {}; window.SPRITE_REAL = {};

// ---- Fit every Image/Sprite to its manifest gameplay box (setDisplaySize-equivalent), so any art resolution is a pure file swap.
const ANIM_SUFFIX = /_(idle|walk|move|sheet|hit|death|windup|alt|attack[a-z0-9_]*)$/;
function fitBox(key){ const base = key && key.replace(ANIM_SUFFIX,''), b = base!==key && SPRITE_MANIFEST[base];   // animation sheets always use their base sprite's box
  if(b && b.size && b.fit!==false) return b; return SPRITE_MANIFEST[key]; }
function fitFactor(obj){ const m = fitBox(obj.texture && obj.texture.key); if(!m||m.fit===false||!m.size||!obj.frame) return 1;
  return Math.min(m.size[0]/obj.frame.realWidth, m.size[1]/obj.frame.realHeight); }
// optional manifest 'outline' (colour) on a base sprite: soft rim glow for low-contrast art (WebGL preFX; no-op on Canvas)
function applyOutline(obj){ if(!obj.preFX) return; const m=fitBox(obj.texture&&obj.texture.key); const col=m&&m.outline; if(obj._outlined===col) return; if(obj._glow){ obj.preFX&&obj.preFX.remove(obj._glow); obj._glow=null; }
  obj._outlined=col; if(col && obj.preFX) obj._glow=obj.preFX.addGlow(Phaser.Display.Color.HexStringToColor(col).color,2,0,false,.1,10); }
function refit(obj){ applyOutline(obj); const old = obj._fit||1, nf = fitFactor(obj); if(Math.abs(nf-old)<1e-6) return obj;
  obj._fit = nf; obj.scaleX = obj.scaleX/old*nf; obj.scaleY = obj.scaleY/old*nf; return obj; }
for(const C of [Phaser.GameObjects.Image, Phaser.GameObjects.Sprite]){ const P = C.prototype, oScale = P.setScale, oFrame = P.setFrame;
  P.setScale = function(x,y){ if(y===undefined) y=x; const b=this._fit||1; return oScale.call(this,x*b,y*b); };   // scales are relative to the fitted size
  P.setFrame = function(f,a,b){ const r = oFrame.call(this,f,a,b); if(this.frame) refit(this); return r; }; }

// ---- Animation states: <base>_idle/_walk/_hit/_death/_attack (from the art manifest). Missing sheet => still sprite.
const ONE_SHOT = /_(hit|death|windup|attack[a-z0-9_]*)$/;
function animFor(sc, base, state){ const k = base+'_'+state; if(sc.anims.exists(k)) return k;
  if(state==='walk' && sc.anims.exists(base+'_sheet')) return base+'_sheet';
  if(state==='walk' && sc.anims.exists(base+'_move')) return base+'_move';
  if(state==='walk' && sc.anims.exists(base+'_idle')) return base+'_idle';
  if(state==='idle' && sc.anims.exists(base+'_walk')) return null; return null; }
function setAnim(sc, spr, base, state){ if(!spr.play) return; if(spr._busy && !ONE_SHOT.test(state)) return; if(spr._st===state && spr.anims.isPlaying) return;
  const k = animFor(sc,base,state); if(!k && /^(hit|death|attack|windup)/.test(state)) return; spr._st = state;
  if(k){ spr.play(k,true); refit(spr); if(ONE_SHOT.test(k)){ spr._busy=true; spr.once('animationcomplete',()=>{ spr._busy=false; spr._st=null; }); } }
  else if(!spr._busy && spr.texture.key!==base){ spr.anims.stop(); spr.setTexture(base); } }
function hasAnim(sc, base, state){ return sc.anims.exists(base+'_'+state); }

// ---- Object pool (particles, bullets, floating text) to keep GC/alloc out of the frame loop
class Pool { constructor(sc){ this.sc=sc; this.free={}; this.count=0; }
  img(key,x,y,depth=15){ const a=this.free[key]||(this.free[key]=[]); let o=a.pop();
    if(o){ o.setActive(true).setVisible(true).setPosition(x,y).setAlpha(1).setRotation(0).setScale(1).clearTint(); this.sc.tweens.killTweensOf(o); }
    else { o=this.sc.add.sprite(x,y,key); o._poolKey=key; this.count++; } if(o.anims&&o.anims.isPlaying) o.anims.stop(); return o.setDepth(depth); }
  text(x,y,s,style){ const a=this.free.__t||(this.free.__t=[]); let t=a.pop();
    if(t){ t.setActive(true).setVisible(true).setPosition(x,y).setAlpha(1).setText(s).setStyle(style); this.sc.tweens.killTweensOf(t); }
    else { t=this.sc.add.text(x,y,s,style).setOrigin(.5); t._poolKey='__t'; } return t; }
  release(o){ if(!o||!o.active) return; o.setActive(false).setVisible(false); (this.free[o._poolKey]||(this.free[o._poolKey]=[])).push(o); } }

// ---- Text + UI widgets (9-slice art from manifest, placeholder textures generated in Boot)
function txt(sc,x,y,s,size=24,col='#fff',o={}){ return sc.add.text(x,y,s,Object.assign({fontFamily:'Georgia,serif',fontSize:size+'px',color:col,stroke:'#000',strokeThickness:Math.max(2,size/8),align:'center'},o)).setOrigin(.5); }
function slice(key){ return (SPRITE_MANIFEST[key]&&SPRITE_MANIFEST[key].slice)||16; }
function panel(sc,x,y,w,h){ const s=slice('ui_panel'); return sc.add.nineslice(x,y,'ui_panel',0,w,h,s,s,s,s); }
function button(sc,x,y,w,h,label,cb,opt={}){
  const enabled = opt.enabled!==false, s = slice('ui_button'), c = sc.add.container(x,y);
  const bg = sc.add.nineslice(0,0,'ui_button',0,w,h,s,s,s,s); if(!enabled) bg.setTint(0x666666); else if(opt.col) bg.setTint(opt.col);
  const t = txt(sc,0,-2,label,opt.size||26,enabled?'#fff':'#aaa'); c.add([bg,t]); c.setSize(w,h); c.label=t; c.bg=bg;
  const skin=k=>{ bg.setTexture(k); bg.setSlices(w,h,s,s,s,s); };
  if(enabled){ c.setInteractive({useHandCursor:true});
    c.on('pointerover',()=>{ Sfx.hover&&Sfx.hover(); skin('ui_button_hover'); sc.tweens.add({targets:c,scale:1.04,duration:90}); });
    c.on('pointerout',()=>{ skin('ui_button'); sc.tweens.add({targets:c,scale:1,duration:90}); t.y=-2; });
    c.on('pointerdown',()=>{ skin('ui_button_pressed'); t.y=1; c.setScale(.97); });
    c.on('pointerup',()=>{ skin('ui_button_hover'); t.y=-2; c.setScale(1.04); Sfx.init(); Sfx.click(); cb(); }); }
  if(opt.depth) c.setDepth(opt.depth); return c; }
function iconButton(sc,x,y,glyph,cb,size=56){ const c=sc.add.container(x,y), im=sc.add.image(0,0,'ui_icon_button').setDisplaySize(size,size), t=txt(sc,0,0,glyph,size*.4);
  c.add([im,t]); c.setSize(size,size).setInteractive({useHandCursor:true});
  c.on('pointerover',()=>c.setScale(1.08)); c.on('pointerout',()=>c.setScale(1)); c.on('pointerdown',(p,lx,ly,e)=>{ c.setScale(.92); e&&e.stopPropagation&&e.stopPropagation(); cb(); }); c.on('pointerup',()=>c.setScale(1.08)); return c; }
function counter(sc,x,y,icon,value,col='#fff'){ const c=sc.add.container(x,y), f=sc.add.image(0,0,'ui_counter').setOrigin(0,.5).setDisplaySize(160,48);
  const ic=sc.add.image(24,0,icon); ic.setScale(Math.min(34/ic.width,34/ic.height)/(ic._fit||1));
  const t=txt(sc,100,0,String(value),22,col); c.add([f,ic,t]); c.label=t; return c; }
function coverImage(sc,key,alpha){ if(!sc.textures.exists(key)) return null; const t=sc.textures.get(key).getSourceImage(), k=Math.max(W/t.width,H/t.height);
  return sc.add.image(W/2,H/2,key).setScale(k).setAlpha(alpha); }
function curtains(sc,bgKey,alpha=.55){ const g = sc.add.graphics(); g.fillStyle(0x140608,1).fillRect(0,0,W,H);
  if(bgKey && SPRITE_REAL[bgKey]){ coverImage(sc,bgKey,alpha); return g; }
  for(let i=0;i<10;i++){ g.fillStyle(i%2?0x6b0a14:0x8a0f1c,1); g.fillRect(i*30,0,30,H); g.fillRect(W-(i+1)*30,0,30,H); }
  for(let i=0;i<22;i++){ g.fillStyle(i%2?0x7a0c18:0xa01020,1); g.fillTriangle(i*60,0,i*60+60,0,i*60+30,50); }
  g.fillStyle(0xf3c75a,1).fillRect(0,0,W,6); return g; }

// ---- Scene transitions: fade out -> start; every scene fades/slides in via enterFx()
function goScene(sc,key,data){ if(sc._leaving) return; sc._leaving=true; sc.input.enabled=false;
  sc.cameras.main.fadeOut(220,10,4,6); sc.cameras.main.once('camerafadeoutcomplete',()=>sc.scene.start(key,data)); }
function enterFx(sc,slide){ sc._leaving=false; const cam=sc.cameras.main; cam.fadeIn(260,10,4,6);
  if(slide){ cam.scrollY=-40; sc.tweens.add({targets:cam,scrollY:0,duration:300,ease:'Cubic.out'}); } }
