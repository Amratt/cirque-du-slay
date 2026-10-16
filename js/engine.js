// Shared engine helpers: manifest-driven sprite fitting, animation states, pooling, UI widgets, scene transitions.
const W = 1280, H = 720;
// cache-busting: every asset URL carries the build version (index.html sets window.BUILD); ?nocache forces a fresh fetch every load
function V(url){ const nc=/[?&]nocache\b/.test(location.search); return url+(url.includes('?')?'&':'?')+'v='+(nc?Date.now():(window.BUILD||'dev')); }
const GOLD = '#f3c75a', BLOOD = '#b3001b';
window.SPRITE_MANIFEST = {}; window.SPRITE_REAL = {};

// ---- Fit every Image/Sprite to its manifest gameplay box (setDisplaySize-equivalent), so any art resolution is a pure file swap.
const ANIM_SUFFIX = /_(idle|walk|move|sheet|hit|death|windup|alt|attack[a-z0-9_]*)$/;
function fitBox(key){ const base = key && key.replace(ANIM_SUFFIX,''), b = base!==key && SPRITE_MANIFEST[base];   // animation sheets always use their base sprite's box
  if(b && b.size && b.fit!==false) return b; return SPRITE_MANIFEST[key]; }
function fitFactor(obj){ const m = fitBox(obj.texture && obj.texture.key); if(!m||m.fit===false||!m.size||!obj.frame) return 1;
  return Math.min(m.size[0]/obj.frame.realWidth, m.size[1]/obj.frame.realHeight)*(obj._xs||1); }
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
function bakedWhite(sc,key,idx){ try{ const fr=sc.textures.getFrame(key,idx), c=document.createElement('canvas'), w=c.width=Math.min(64,fr.cutWidth), h=c.height=Math.min(64,fr.cutHeight), x=c.getContext('2d');
  x.drawImage(fr.source.image,fr.cutX,fr.cutY,fr.cutWidth,fr.cutHeight,0,0,w,h); const d=x.getImageData(0,0,w,h).data; let n=0,wh=0;
  for(let i=0;i<d.length;i+=4){ if(d[i+3]<40) continue; n++; const mx=Math.max(d[i],d[i+1],d[i+2]), mn=Math.min(d[i],d[i+1],d[i+2]); if(mn>110 && mx-mn<40) wh++; } return n>50 && wh/n>.85; /* light, desaturated silhouette */ }catch(e){ return false; } }
const ANIM_SKIPPED = {};
function skipRules(key){ const T=(typeof ANIM_FRAME_SKIPS!=='undefined')?ANIM_FRAME_SKIPS:{}; let r=[];
  for(const [p,v] of Object.entries(T)){ const re=new RegExp('^'+p.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$'); if(re.test(key)) r=r.concat(v); } return r; }
function framesFor(sc,key,n){ const skip=new Set(); for(const s of skipRules(key)){
    if(s.frame>=n) continue; if(s.when==='always' || (s.when==='white'&&bakedWhite(sc,key,s.frame))) skip.add(s.frame); }
  if(skip.size) ANIM_SKIPPED[key]=[...skip];
  if(skip.size>=n) skip.clear();   // never produce an empty animation
  const out=[]; for(let i=0;i<n;i++) if(!skip.has(i)) out.push({key,frame:i}); return out; }
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
// BUG-030: DisplayList.removeAll(true) means skipCallback in Phaser 3.8x, NOT destroy, so old interactive buttons survived as invisible ghosts.
// clearUI destroys every child (and its tweens/input) before a rebuild.
// scale any Image/Sprite to fit a w x h box on screen (works with fitted sprites: setScale is relative to the fitted size)
function fitTo(im,w,h){ im.setScale(1); const k=Math.min(w/im.displayWidth,h/im.displayHeight); im.setScale(k); return im; }
// Drax's hero portraits (manifest 'portraits'), falling back to the in-game sprite
function heroArt(sc,id,kind='portrait'){ const k=kind+'_'+id; return sc.textures.exists(k)&&!(window.ASSET_MISSING||[]).includes(k) ? k : 'p_'+id; }
function clearUI(sc){ const list=sc.children.list.slice(); for(const o of list){ sc.tweens.killTweensOf(o); if(o.list) o.list.forEach(c=>sc.tweens.killTweensOf(c)); o.destroy(); }
  // Phaser 3.80 quirk: objects created and destroyed within one frame linger in the input plugin's queues; purge dead entries
  const ip=sc.input; for(const q of ['_list','_pendingInsertion','_pendingRemoval','_over','_draggable']){ const v=ip[q]; if(Array.isArray(v)){ const keep=v.filter(o=>o&&o.scene); v.length=0; v.push(...keep); } } }
// spend: affordability guard used by every buy/unlock/upgrade callback; never lets a balance go below 0
function spend(obj,key,cost){ if(!(cost>=0) || (obj[key]||0)<cost){ Sfx.deny&&Sfx.deny(); return false; } obj[key]-=cost; return true; }
function goScene(sc,key,data){ if(sc._leaving) return; sc._leaving=true; sc.input.enabled=false;
  sc.cameras.main.fadeOut(220,10,4,6); sc.cameras.main.once('camerafadeoutcomplete',()=>sc.scene.start(key,data)); }
function enterFx(sc,slide){ sc._leaving=false; const cam=sc.cameras.main; cam.fadeIn(260,10,4,6);
  if(slide){ cam.scrollY=-40; sc.tweens.add({targets:cam,scrollY:0,duration:300,ease:'Cubic.out'}); } }
function mulberry(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
