const CX = 1000, CY = 1000, R = 880, WORLD = 2000;
const QS = new URLSearchParams(location.search);
const FAST = QS.has('fast'), GOD = QS.has('god');
const dist = (a,b,c,d)=>Math.hypot(a-c,b-d);

class Game extends Phaser.Scene {
  constructor(){ super('Game'); }
  init(d){ this.charId = d.charId||'A1'; this.ch = CHARS.find(c=>c.id===this.charId);
    this.run = {charId:this.charId, weapons:[], balloons:(+new URLSearchParams(location.search).get('gold')||0), wave:1, kills:0, gt:0, unlocks:[], bossesBeaten:0, mods:{}, adds:{}}; }
  create(){ this.bossDying=[];
    window.CDS = this; Sfx.init(); enterFx(this); this.pool = new Pool(this); this.hitStop=0; this.fpsLog=[];
    this.enemies=[]; this.bullets=[]; this.eshots=[]; this.pickups=[]; this.warnings=[]; this.hazards=[]; this.weapons=[];
    this.over=false; this.paused=false; this.pauseLayer=null; this.time.paused=false; this.state='wave';
    this.drawArena();
    this.pkey='p_'+this.charId; this.player = this.add.sprite(CX,CY,this.pkey).setDepth(10); this.player._xs=PLAYER_SCALE*(HERO_NORM[this.charId]||1); setAnim(this,this.player,this.pkey,'idle');
    this.pl = {x:CX,y:CY,vx:0,vy:0,hp:100,max:100,ifr:0,stun:0,face:1};
    this.cameras.main.setBounds(0,0,WORLD,WORLD).startFollow(this.player,false,.09,.09); this.baseZoom = (this.sys.game.device.input.touch && Math.min(innerWidth,innerHeight)<600) ? CAM_ZOOM_MOBILE : CAM_ZOOM; this.cameras.main.setZoom(this.baseZoom);   // smoothed follow
    // HUD camera: everything with scrollFactor 0 renders unzoomed on uiCam, the world on the main camera
    if(CAM_ZOOM!==1){ this.uiCam = this.cameras.add(0,0,W,H); this.routeCams(); this.events.on('preupdate',()=>this.routeCams()); this.events.on('prerender',()=>this.routeCams()); /* BUG-033: also route objects created mid-frame, before drawing */ this.scale.on('resize',()=>this.uiCam.setSize(W,H)); }
    if(QS.has('fps')) this.fpsT = txt(this,W-90,80,'',16,'#7f7').setScrollFactor(0).setDepth(3000);
    this.fx = this.add.graphics().setDepth(20);
    this.buildHUD(); this.setupInput();
    this.startWave();
  }
  inView(x,y){ if(this._vwT!==this.time.now){ this._vwT=this.time.now; const v=this.cameras.main.worldView, m=PERF.cullMargin; this._vw=[v.x-m,v.y-m,v.right+m,v.bottom+m]; } const q=this._vw; return x>q[0]&&x<q[2]&&y>q[1]&&y<q[3]; }
  routeCams(){ const mb=this.cameras.main.id, ub=this.uiCam.id; for(const o of this.children.list){ const ui=o.scrollFactorX===0; if(o._camUI===ui) continue; o._camUI=ui; o.cameraFilter = ui ? mb : ub; } }
  // ---------------------------------------------------------------- arena
  // Drax's decals (manifest 'decals' gives blend + alpha): painted ring circle, drifting spotlight pools, scattered popcorn/confetti/tickets, screen vignette
  // Drax's decals, baked ONCE into a 2048 render texture (was 170 separate sprites + a multiply vignette + additive spots: wave-19 fps 15 -> 8)
  dressRing(){ const D=window.DECALS||{}, ok=k=>this.textures.exists(k)&&!(window.ASSET_MISSING||[]).includes(k), rnd=mulberry(1234);
    if(!this.textures.exists('arena_decals_baked')){ const S=2048, k0=S/(R/.44), rt=this.make.renderTexture({width:S,height:S},false), tmp=this.make.image({key:'__WHITE'},false);
      const put=(key,wx,wy,size,rot,alpha)=>{ tmp.setTexture(key).setOrigin(.5); tmp.setScale(size*k0/Math.max(tmp.width,tmp.height)).setRotation(rot).setAlpha(alpha); rt.draw(tmp,S/2+(wx-CX)*k0,S/2+(wy-CY)*k0); };
      if(ok('ring_circle')) put('ring_circle',CX,CY,R*DRESS.ringSize,0,DRESS.ringAlpha);
      const scat=Object.keys(D).filter(k=>/^(popcorn|confetti|ticket)_/.test(k)&&ok(k)), [s0,s1]=DRESS.scatterSize;
      for(let i=0;i<DRESS.scatterCount&&scat.length;i++){ const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*(R-50); put(scat[Math.floor(rnd()*scat.length)],CX+Math.cos(a)*r,CY+Math.sin(a)*r,s0+rnd()*(s1-s0),rnd()*Math.PI*2,DRESS.scatterAlpha); }
      if(ok('spotlight_pool')) for(let i=0;i<DRESS.spotCount;i++){ const a=i*2.1, r=R*.3; tmp.setTexture('spotlight_pool').setOrigin(.5).setRotation(0).setScale(DRESS.spotSize*k0/Math.max(tmp.width,tmp.height)).setAlpha(DRESS.spotAlpha).setTint(DRESS.spotTint); rt.draw(tmp,S/2+Math.cos(a)*r*k0,S/2+Math.sin(a)*r*k0); }
      rt.saveTexture('arena_decals_baked'); tmp.destroy(); }
    this.add.image(CX,CY,'arena_decals_baked').setDisplaySize(R/.44,R/.44).setDepth(.2);
    /* spotlight pools + vignette moved out of the per-frame fill: spots are baked into the decal RT, vignette is 4 thin edge strips (perf: wave-19 full-screen layers cost ~35% fps) */
    if(!this.textures.exists('vig_edge')){ const c=document.createElement('canvas'); c.width=4; c.height=64; const x=c.getContext('2d'), g=x.createLinearGradient(0,0,0,64);
      g.addColorStop(0,'rgba(0,0,0,.85)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,4,64); this.textures.addCanvas('vig_edge',c); }
    const vd=DRESS.vignetteAlpha, ev=Math.round(H*.22), eh=Math.round(W*.16);
    [[W/2,0,W,ev,0],[W/2,H,W,ev,Math.PI],[0,H/2,H,eh,-Math.PI/2],[W,H/2,H,eh,Math.PI/2]].forEach(([x,y,len,dep,rot])=>this.add.image(x,y,'vig_edge').setOrigin(.5,0).setDisplaySize(len,dep).setRotation(rot).setScrollFactor(0).setDepth(990).setAlpha(vd));
  }
  // BUG-024 v2: one procedural circus-ring floor, no tiling: dark sawdust, faint raked rings, red/cream striped curb, vignette, noise
  bakeRing(){ const D=R*2+4, c=document.createElement('canvas'); c.width=c.height=D; const x=c.getContext('2d'), m=D/2, rnd=mulberry(11);
    x.beginPath(); x.arc(m,m,m,0,Math.PI*2); x.clip();
    let g=x.createRadialGradient(m,m,0,m,m,m); g.addColorStop(0,'#5a3a24'); g.addColorStop(.7,'#45291a'); g.addColorStop(1,'#2a160e'); x.fillStyle=g; x.fillRect(0,0,D,D);
    for(let i=0;i<40;i++){ const px=rnd()*D, py=rnd()*D, pr=80+rnd()*220, gg=x.createRadialGradient(px,py,0,px,py,pr), a=.04+rnd()*.05;
      gg.addColorStop(0,rnd()<.5?`rgba(0,0,0,${a})`:`rgba(255,210,150,${a})`); gg.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=gg; x.fillRect(px-pr,py-pr,pr*2,pr*2); }
    for(let r=40;r<m-90;r+=22+rnd()*18){ x.lineWidth=1+rnd()*3; x.strokeStyle=`rgba(${rnd()<.5?'0,0,0':'255,220,170'},${.03+rnd()*.04})`; x.beginPath(); x.arc(m+(rnd()-.5)*6,m+(rnd()-.5)*6,r,0,Math.PI*2); x.stroke(); }
    const id=x.getImageData(0,0,D,D), d=id.data; for(let k=0;k<d.length;k+=4){ const n=(rnd()-.5)*22; d[k]+=n; d[k+1]+=n*.9; d[k+2]+=n*.7; } x.putImageData(id,0,0);
    for(let i=0;i<9000;i++){ const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*(m-80); x.fillStyle=rnd()<.5?'rgba(220,170,110,.25)':'rgba(20,10,5,.3)'; x.fillRect(m+Math.cos(a)*r,m+Math.sin(a)*r,1+rnd()*2,1); }
    const n=48, r0=m-74, r1=m-30; for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, a1=(i+1)/n*Math.PI*2; x.beginPath(); x.arc(m,m,r1,a0,a1); x.arc(m,m,r0,a1,a0,true); x.closePath(); x.fillStyle=i%2?'#e8d8b4':'#9e1c22'; x.fill(); }
    x.lineWidth=5; x.strokeStyle='#d4a648'; x.beginPath(); x.arc(m,m,r0,0,Math.PI*2); x.stroke(); x.beginPath(); x.arc(m,m,r1,0,Math.PI*2); x.stroke();
    g=x.createRadialGradient(m,m,m*.35,m,m,m); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.8,'rgba(0,0,0,.35)'); g.addColorStop(1,'rgba(0,0,0,.65)'); x.fillStyle=g; x.fillRect(0,0,D,D);
    g=x.createRadialGradient(m,m,0,m,m,m*.5); g.addColorStop(0,'rgba(255,220,160,.10)'); g.addColorStop(1,'rgba(255,220,160,0)'); x.fillStyle=g; x.fillRect(0,0,D,D);
    this.textures.addCanvas('arena_floor_ring',c); }
  // (unused) BUG-024 v1 tile-blend bake, kept for reference. Drax's tile is edge-seamless but has a hard internal cross seam (offset-swap artefact); it is hidden by blending in a half-offset copy along the cross,
  // laid with a random sub-tile offset, then broken up with soft light pools, a radial spotlight, ring bands and a vignette.
  bakeFloor(){ const src=this.textures.get('arena_tile').getSourceImage(), T=256, D=R*2+4;
    const tc=document.createElement('canvas'); tc.width=tc.height=T; const tx=tc.getContext('2d'); tx.drawImage(src,0,0,T,T);
    const a=tx.getImageData(0,0,T,T), sc=document.createElement('canvas'); sc.width=sc.height=T; const sx=sc.getContext('2d');
    for(const [ox,oy] of [[-T/2,-T/2],[T/2,-T/2],[-T/2,T/2],[T/2,T/2]]) sx.drawImage(tc,ox,oy);
    const s=sx.getImageData(0,0,T,T), o=tx.createImageData(T,T);
    for(let y=0;y<T;y++) for(let x=0;x<T;x++){ const e=Math.min(Math.abs(x-T/2+.5),Math.abs(y-T/2+.5))/(T*.12), w=e>=1?1:e*e*(3-2*e), k=(y*T+x)*4;
      for(let c=0;c<4;c++) o.data[k+c]=a.data[k+c]*w+s.data[k+c]*(1-w); }
    // flatten low-frequency light so tile repeats don't form bright/dark blocks: tile - blur(tile, wrapped) + mean
    tx.putImageData(o,0,0); const bc=document.createElement('canvas'); bc.width=bc.height=T*3; const bx=bc.getContext('2d');
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) bx.drawImage(tc,i*T,j*T); const b2=document.createElement('canvas'); b2.width=b2.height=T; const b2x=b2.getContext('2d');
    b2x.filter='blur(36px)'; b2x.drawImage(bc,-T,-T); const bl=b2x.getImageData(0,0,T,T).data, mean=[0,0,0];
    for(let k=0;k<bl.length;k+=4) for(let c=0;c<3;c++) mean[c]+=bl[k+c]/(T*T);
    if(bl[3]>0) for(let k=0;k<bl.length;k+=4) for(let c=0;c<3;c++) o.data[k+c]=Math.max(0,Math.min(255,o.data[k+c]-bl[k+c]+mean[c]));
    tx.putImageData(o,0,0);
    const c=document.createElement('canvas'); c.width=c.height=D; const x=c.getContext('2d');
    x.beginPath(); x.arc(D/2,D/2,D/2,0,Math.PI*2); x.clip();
    const pat=x.createPattern(tc,'repeat'); x.save(); x.translate(37,91); x.scale(1.8,1.8); x.fillStyle=pat; x.fillRect(-60,-60,D,D); x.restore();
    // a second, rotated, faint layer hides the repeat grid
    x.save(); x.globalAlpha=.5; x.translate(D/2,D/2); x.rotate(.6); x.scale(1.37,1.37); x.fillStyle=pat; x.fillRect(-D,-D,D*2,D*2); x.restore();
    const rnd=mulberry(7); for(let i=0;i<26;i++){ const px=rnd()*D, py=rnd()*D, pr=120+rnd()*260, g=x.createRadialGradient(px,py,0,px,py,pr), dark=rnd()<.5;
      g.addColorStop(0,dark?'rgba(0,0,0,.16)':'rgba(255,230,190,.09)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(px-pr,py-pr,pr*2,pr*2); }
    let g=x.createRadialGradient(D/2,D/2,0,D/2,D/2,D*.42); g.addColorStop(0,'rgba(255,225,170,.16)'); g.addColorStop(1,'rgba(255,225,170,0)'); x.fillStyle=g; x.fillRect(0,0,D,D);
    x.lineWidth=26; x.strokeStyle='rgba(120,20,25,.22)'; x.beginPath(); x.arc(D/2,D/2,D*.47,0,Math.PI*2); x.stroke();
    x.lineWidth=6; x.strokeStyle='rgba(255,215,140,.18)'; x.beginPath(); x.arc(D/2,D/2,D*.445,0,Math.PI*2); x.stroke();
    g=x.createRadialGradient(D/2,D/2,D*.3,D/2,D/2,D/2); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.75,'rgba(0,0,0,.25)'); g.addColorStop(1,'rgba(0,0,0,.6)'); x.fillStyle=g; x.fillRect(0,0,D,D);
    this.textures.addCanvas('arena_floor_baked',c); }
  drawArena(){
    // floor: tiling texture 'arena_tile' clipped to the ring; audience + wall: 'arena_ring' (transparent centre)
    this.cameras.main.setBackgroundColor('#12060a');
    // bake tiled floor clipped to a circle once (a masked tileSprite is too slow on low-end/software GL)
    const ringArt = ARENA_V2 && !(window.ASSET_MISSING||[]).includes('arena_ring');   // Drax's art/arena_ring.png, once imported, is the whole arena as one image
    if(ringArt){ const D=R/.44, ok=k=>this.textures.exists(k)&&!(window.ASSET_MISSING||[]).includes(k), n=ARENA_GRID, grid=ok('arena_t00')&&ok(`arena_t${n-1}${n-1}`);
      if(grid){ const s=D/n; for(let r=0;r<n;r++) for(let c=0;c<n;c++) this.add.image(CX-D/2+c*s,CY-D/2+r*s,`arena_t${r}${c}`).setOrigin(0).setDisplaySize(s+1,s+1).setDepth(0).setTint(DRESS.floorTint); this.arenaTier='grid'+n; }   // +1 px overlap hides tile seams
      else { const k=ok('arena_ring_4k')?'arena_ring_4k':'arena_ring'; this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR); this.add.image(CX,CY,k).setDisplaySize(D,D).setDepth(0).setTint(DRESS.floorTint); this.arenaTier=k; } }   // floor darkened a touch so characters pop   // playable radius R = 44% of image width (ring border outside it)
    else if(ARENA_V2){ if(!this.textures.exists('arena_floor_ring')) this.bakeRing(); this.add.image(CX,CY,'arena_floor_ring').setDepth(0); }
    else { if(!this.textures.exists('arena_floor_baked')){ const t=this.textures.get('arena_tile').getSourceImage(), D=R*2+4, c=document.createElement('canvas'); c.width=c.height=D;
      const x=c.getContext('2d'); x.beginPath(); x.arc(D/2,D/2,D/2,0,Math.PI*2); x.clip(); x.fillStyle=x.createPattern(t,'repeat'); x.fillRect(0,0,D,D); this.textures.addCanvas('arena_floor_baked',c); }
      this.add.image(CX,CY,'arena_floor_baked').setDepth(0); }
    if(!ARENA_V2){ const lines=this.add.graphics().setDepth(0.5); lines.lineStyle(3,0x000000,.18).strokeCircle(CX,CY,R*.66).strokeCircle(CX,CY,R*.33).lineBetween(CX-R,CY,CX+R,CY).lineBetween(CX,CY-R,CX,CY+R); }
    if(!ringArt) this.add.image(CX,CY,'arena_ring').setDisplaySize(WORLD,WORLD).setDepth(1);
    if(ARENA_V2) this.dressRing();
    this.ropes = this.add.graphics().setDepth(30); // used by Juggler
    this.redFlash = this.add.rectangle(0,0,W,H,0xff0000,0).setOrigin(0).setScrollFactor(0).setDepth(900);
  }
  // ---------------------------------------------------------------- HUD (GDD 1.3.1.1 layout)
  buildHUD(){ const D=1000, sf=o=>o.setScrollFactor(0).setDepth(D);
    // hero portrait badge (Drax portrait_<id>, circle-masked), HP bar and balloons to its right
    const pk=heroArt(this,this.charId); sf(this.add.circle(46,48,36,0x1a0a0c).setStrokeStyle(4,0xd4a648)); const pim=sf(fitTo(this.add.image(46,48,pk),66,66));
    const pm=this.make.graphics({add:false}); pm.fillCircle(46,48,33); pim.setMask(pm.createGeometryMask());
    this.hpBg = sf(this.add.image(92,26,'ui_healthbar_frame').setOrigin(0,.5));
    this.hpBar = sf(this.add.image(96,26,'ui_healthbar_fill').setOrigin(0,.5));
    this.hpT = sf(txt(this,192,26,'',15).setOrigin(.5));
    this.rbC = sf(counter(this,88,70,'balloon','0','#ff8090')); this.rbT = this.rbC.label;
    this.waveT = sf(txt(this,W/2,24,'',26,GOLD)); this.timerT = sf(txt(this,W/2,66,'',28,'#fff',{stroke:'#000',strokeThickness:4}));
    this.pauseBtn = sf(iconButton(this,W-40,38,'II',()=>this.togglePause(),56));
    this.bossArrow = sf(this.add.graphics()).setDepth(1001); this.bossBars = []; this.banner = sf(txt(this,W/2,72,'',36,BLOOD,{strokeThickness:7})).setAlpha(0);   /* top HUD band, never over the player */ this.sayT = sf(txt(this,W/2,H-140,'',26,'#fff',{wordWrap:{width:1000},backgroundColor:'#000000aa',padding:{x:14,y:8}})).setAlpha(0).setDepth(1000); this.fragThisWave=false; this.revealQ=[];
    this.joyBase = sf(this.add.circle(0,0,60,0xffffff,.15).setStrokeStyle(3,0xffffff,.5)).setVisible(false);
    this.joyKnob = sf(this.add.circle(0,0,26,0xf3c75a,.6)).setVisible(false);
  }
  setBossBars(list){ this.bossBars.forEach(b=>b.forEach(o=>o.destroy())); this.bossBars=[];
    list.forEach((e,i)=>{ const w = list.length>1?440:800, x = list.length>1? W/2+(i?240:-240) : W/2, y = H-40;
      const bg=this.add.rectangle(x,y,w,20,0x000000,.7).setStrokeStyle(2,0xffffff).setScrollFactor(0).setDepth(1000);
      const bar=this.add.rectangle(x-w/2+2,y,w-4,16,BOSS_BAR_COL).setOrigin(0,.5).setScrollFactor(0).setDepth(1000);
      const t=txt(this,x,y-30,e.name,18,'#fff',{stroke:'#000',strokeThickness:4}).setScrollFactor(0).setDepth(1001); this.bossBars.push([bg,bar,t]); e.bar=bar; e.barW=w-4; }); }   // label sits above the bar, outlined
  updateHUD(){ const p=this.pl, w = Math.min(600, p.max*2);   // bar length grows with Max HP (GDD); fill is cropped to HP%
    this.hpBg.setDisplaySize(w+8,28); this.hpBar.setDisplaySize(w,20); const fw=this.hpBar.frame.realWidth; this.hpBar.setCrop(0,0,fw*Phaser.Math.Clamp(p.hp/p.max,0,1),this.hpBar.frame.realHeight);
    this.hpT.setPosition(96+w/2,26).setText(`${Math.ceil(p.hp)} / ${Math.round(p.max)}`); this.rbT.setText(this.run.balloons);
    this.waveT.setText(`WAVE ${this.run.wave}/20`); this.timerT.setVisible(this.banner.alpha<.05).setColor(this.state==='boss'?'#ff5a5a':'#fff').setText(this.state==='boss'?'BOSS FIGHT':this.state==='wave'?Math.ceil(Math.max(0,this.timeLeft)):'');
    for(const e of this.enemies) if(e.bar) e.bar.width = Math.max(0,e.barW*e.hp/e.max); }
  togglePause(){ if(this.over||this.state==='shop') return; this.paused=!this.paused;
    this.time.paused=this.paused; if(this.paused) this.tweens.pauseAll(); else this.tweens.resumeAll();   // BUG-002: freeze timers + tweens (lobs, boss intro, shop timer)
    if(this.paused){ this.pauseLayer = this.add.container(0,0).setScrollFactor(0).setDepth(2000);
      this.pauseLayer.add([this.add.rectangle(W/2,H/2,W,H,0,.7).setScrollFactor(0), txt(this,W/2,180,'PAUSED',60,GOLD).setScrollFactor(0),
        button(this,W/2,320,300,60,'Resume',()=>this.togglePause()), button(this,W/2,400,300,60,'Settings',()=>{ this.scene.launch('Settings',{back:'Game'}); this.scene.bringToTop('Settings'); this.scene.pause(); }),
        button(this,W/2,480,300,60,'Quit Run',()=>{ goScene(this,'Menu'); })]);
      this.pauseLayer.list.forEach(o=>o.setScrollFactor&&o.setScrollFactor(0)); }
    else if(this.pauseLayer){ this.pauseLayer.destroy(); this.pauseLayer=null; } }
  // ---------------------------------------------------------------- input
  setupInput(){ this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC,P');
    this.input.keyboard.on('keydown-ESC',()=>this.togglePause()); this.input.keyboard.on('keydown-P',()=>this.togglePause());
    this.joy = null; this.tilt = {x:0,y:0};
    this.input.on('pointerdown',p=>{ if(this.paused||Save.d.settings.control!=='joystick') return; this.joy={id:p.id,x:p.x,y:p.y,dx:0,dy:0};
      this.joyBase.setPosition(p.x,p.y).setVisible(true); this.joyKnob.setPosition(p.x,p.y).setVisible(true); });
    this.input.on('pointermove',p=>{ if(!this.joy||p.id!==this.joy.id) return; let dx=p.x-this.joy.x, dy=p.y-this.joy.y; const m=Math.hypot(dx,dy), mx=60;
      if(m>mx){ dx*=mx/m; dy*=mx/m; } this.joy.dx=dx/mx; this.joy.dy=dy/mx; this.joyKnob.setPosition(this.joy.x+dx,this.joy.y+dy); });
    const end=p=>{ if(this.joy&&p.id===this.joy.id){ this.joy=null; this.joyBase.setVisible(false); this.joyKnob.setVisible(false); } };
    this.input.on('pointerup',end); this.input.on('pointerupoutside',end);
    this.onTilt = e=>{ if(Save.d.settings.control!=='motion') return; // landscape: beta ~ left/right tilt, gamma ~ up/down
      const land = Math.abs(window.orientation||0)===90 || (screen.orientation&&screen.orientation.type.startsWith('landscape'));
      const lr = land ? (e.beta||0) : (e.gamma||0), ud = land ? -(e.gamma||0) : (e.beta||0)-30;
      this.tilt.x = Phaser.Math.Clamp(lr/20,-1,1); this.tilt.y = Phaser.Math.Clamp(ud/20,-1,1); };
    window.addEventListener('deviceorientation',this.onTilt);
    this.events.once('shutdown',()=>{ window.removeEventListener('deviceorientation',this.onTilt); this.bossBars=[]; });
  }
  moveVec(){ const k=this.keys; let x=(k.D.isDown||k.RIGHT.isDown)-(k.A.isDown||k.LEFT.isDown), y=(k.S.isDown||k.DOWN.isDown)-(k.W.isDown||k.UP.isDown);
    if(this.joy){ x+=this.joy.dx; y+=this.joy.dy; } if(Save.d.settings.control==='motion'){ if(Math.abs(this.tilt.x)>.15) x+=this.tilt.x; if(Math.abs(this.tilt.y)>.15) y+=this.tilt.y; }
    if(this.autoMove) { const a=this.time.now/900; x=Math.cos(a); y=Math.sin(a); }
    const m=Math.hypot(x,y); if(m>1){ x/=m; y/=m; } return {x,y}; }
  // ---------------------------------------------------------------- weapons
  buildWeapons(){ this.weapons.forEach(w=>w.spr.destroy()); this.weapons=[];
    const list=[{type:this.ch.w,rar:3,special:true}].concat(this.run.weapons);
    list.forEach((w,i)=>{ const s = weaponStats(w.type,w.rar,w.special?this.charId:null);
      for(const [k,v] of Object.entries(this.run.mods)) s[k]*=v; for(const [k,v] of Object.entries(this.run.adds)) if(k!=='hp') s[k]+=v;
      const spr = this.add.image(0,0,'w_'+w.type).setScale(w.special?.9:.7).setDepth(11); if(w.special) spr.setTint(0xffe080);
      this.weapons.push({s,spr,cd:Math.random()*.5,slot:i,n:list.length,special:!!w.special,lunge:0,proj:w.special?this.ch.proj:null,ptex:w.special?this.ch.ptex:null}); });
    const sp = this.weapons[0].s; const old=this.pl.max; this.pl.max = sp.hp + TUNE.hpPerWave*(this.run.wave-1) + (this.run.adds.hp||0); this.pl.ms = sp.ms*U_SPEED;   // balance: +5 max HP per wave cleared
    this.pl.hp = Math.min(this.pl.max, this.pl.hp + (this.pl.max-old)); }
  nearest(x,y,range){ let best=null,bd=range; for(const e of this.enemies){ if(e.dead||e.hidden) continue; const d=dist(x,y,e.x,e.y)-e.r; if(d<bd){bd=d;best=e;} } return best; }
  updateWeapons(dt){ const p=this.pl;
    for(const w of this.weapons){ const a = w.slot/w.n*Math.PI*2 + this.time.now/2000, rr = 38;
      let wx = p.x+Math.cos(a)*rr, wy = p.y+Math.sin(a)*rr; w.cd -= dt;
      const range = w.s.rng*U_RANGE + (w.s.melee?25:0); const t = this.nearest(wx,wy,range);
      if(t){ const ang = Math.atan2(t.y-wy,t.x-wx); w.spr.rotation = ang + (w.s.melee?Math.PI/2:0); w.spr.flipY = !w.s.melee && Math.abs(ang)>Math.PI/2;
        if(w.cd<=0){ w.cd = w.s.as; this.fire(w,wx,wy,t,ang); } }
      if(w.lunge>0){ w.lunge-=dt; const k=Math.sin((w.lunge/0.18)*Math.PI)*w.lungeD; wx+=Math.cos(w.lungeA)*k; wy+=Math.sin(w.lungeA)*k; }
      w.spr.setPosition(wx,wy); } }
  fire(w,x,y,t,ang){ const s=w.s;
    if(s.melee){ Sfx.swing(s.type); w.lunge=.18; w.lungeA=ang; w.lungeD=Math.min(dist(x,y,t.x,t.y), s.rng*U_RANGE);
      const range = s.rng*U_RANGE+30; const arc=this.add.graphics().setDepth(12); arc.lineStyle(6,w.special?0xffe080:0xffffff,.8).beginPath().arc(x,y,range*.8,ang-.7,ang+.7).strokePath();
      this.tweens.add({targets:arc,alpha:0,duration:180,onComplete:()=>arc.destroy()});
      for(const e of this.enemies){ if(e.dead||e.hidden) continue; const d=dist(x,y,e.x,e.y); if(d-e.r>range) continue;
        let da=Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y-y,e.x-x)-ang)); if(da<1.0||d<e.r+20) this.hit(e,s,ang); } }
    else { Sfx.shoot(s.type); const n=s.pellets; for(let i=0;i<n;i++){ const a = ang + (n>1?(i-(n-1)/2)*.15:0);
        const b=this.pool.img((w.special&&w.ptex&&this.textures.exists(w.ptex))?w.ptex:'bullet',x,y,12).setTint(w.proj||(n>1?0xffa040:0xffff80)).setRotation(a); if(n>1) b.setScale(.8);
        this.bullets.push({spr:b,x,y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:(s.rng*U_RANGE+40)/720,s,dmgMul:n>1?1/n*1.6:1}); } } }
  hit(e,s,ang,mul=1){ if(e.dead) return; if(e.inv){ this.floatText(e.x,e.y-e.r,'IMMUNE',0xaaaaaa,14); return; }
    const crit = Math.random()<s.cc; let d = s.dmg*mul*(crit?s.cd:1)*(e.vulnMul||1); e.hp -= d; if(!e.boss||this.time.now-(e.lastFlash||0)>250){ e.flashUntil=this.time.now+FEEL.hitFlash*1000; e.lastFlash=this.time.now; } e.squash=.12;   // BUG-006: bosses pulse a red tint, max 4x/s. BUG-031: squash was swallowed by this comment
    if(e.base && e.hasHit===undefined) e.hasHit=hasAnim(this,e.base,'hit');
    if(e.base && e.hasHit && !(e.spr._busy && e.spr._st!=='hit')) setAnim(this,e.spr,e.base,'hit');   // never interrupts a windup/death
    this.burst(e.x,e.y,crit?0xffe000:0xffffff,crit?5:2,160);   // (was swallowed by the comment above, like BUG-031)
    if(!e.boss){ e.stag=FEEL.stagger; e.kx+=Math.cos(ang)*FEEL.staggerPush; e.ky+=Math.sin(ang)*FEEL.staggerPush; }   // stagger: brief slow-down on top of knockback
    if(this.time.now-(this.lastHitShake||0)>90){ this.lastHitShake=this.time.now; this.cameras.main.shake(45,e.boss?FEEL.hitShake*2:FEEL.hitShake); }
    if(crit||e.boss) this.stopFor(e.boss?FEEL.bossHitStop:.03);
    if(Math.random()<s.ls){ this.pl.hp=Math.min(this.pl.max,this.pl.hp+2); }
    if(!e.boss){ e.kx += Math.cos(ang)*s.kb*60; e.ky += Math.sin(ang)*s.kb*60; }
    this.floatText(e.x+Phaser.Math.Between(-8,8),e.y-e.r,Math.round(d)+'',crit?0xffe000:0xffffff,crit?20:15);
    if(e.hp<=0) this.killEnemy(e); else Sfx.hit(s.melee); }
  stopFor(t){ this.hitStop=Math.max(this.hitStop,t); }       // short hit-pause
  floatText(x,y,s,col,size=16){ const t=this.pool.text(x,y,s,{fontFamily:'Georgia',fontSize:size+'px',color:'#'+col.toString(16).padStart(6,'0'),stroke:'#000',strokeThickness:3}).setDepth(50).setScale(.6);
    this.tweens.add({targets:t,scale:1,duration:90,ease:'Back.out'}); this.tweens.add({targets:t,y:y-30,alpha:0,duration:600,onComplete:()=>this.pool.release(t)}); }
  // pooled particles; uses puff_sheet / spark_sheet animations when the art provides them
  burst(x,y,col,n,spd=120,size=1,life=500){ const big=size>1, sheet=big?'puff_sheet':'spark_sheet', useSheet=this.anims.exists(sheet);
    for(let i=0;i<n;i++){ if(this.pool.active>PERF.maxParticles) break;   // particle cap
      const p=this.pool.img(useSheet?sheet:(big?'puff':'spark'),x,y,15); if(useSheet) p.play(sheet);
      p.setTint(col).setScale(big?Phaser.Math.FloatBetween(.6,1.4):1);
      const a=Math.random()*Math.PI*2, v=Phaser.Math.Between(spd*.3,spd);
      this.tweens.add({targets:p,x:x+Math.cos(a)*v*life/1000,y:y+Math.sin(a)*v*life/1000,alpha:0,scale:p.scale*(big?1.8:.5),duration:life,onComplete:()=>this.pool.release(p)}); } }
  // ---------------------------------------------------------------- enemies
  enemySprite(id,x,y){ const base='e_'+id, s=this.add.sprite(x,y,base).setDepth(9); s._xs=ENEMY_SCALE; setAnim(this,s,base,'walk'); return s; }
  spawnEnemy(id,x,y){ const d=ENEMIES[id], wv=this.run.wave-1;
    const e={id,def:d,spr:this.enemySprite(id,x,y),x,y,r:Math.round((d.big?22:15)*ENEMY_SCALE),hp:d.hp+d.hpW*wv,dmg:d.dmg+d.dmgW*wv,spd:d.spd*U_SPEED,ai:d.ai,t:Math.random()*2,kx:0,ky:0,flash:0,phase:0, hasWalk:hasAnim(this,'e_'+id,'walk')};
    e.max=e.hp; e.base='e_'+id; this.enemies.push(e);
    e.spr.setScale(.1).setAlpha(0); this.tweens.add({targets:e.spr,alpha:1,duration:200}); e.spawnT=.25;   // spawn pop-in
    this.burst(x,y,0xc8a070,6,90,2,350); return e; }
  killEnemy(e){ e.dead=true; this.run.kills++; Sfx.kill();
    if(!e.boss){ Lore.seeEnemy(e.id); if(!this.fragThisWave && Math.random()<FRAG_DROP_CHANCE){ const pool=Lore.dropPool().filter(f=>!LORE_GATES[f.id]); if(pool.length){ this.fragThisWave=true; this.fragFound(Lore.give(Phaser.Utils.Array.GetRandom(pool))); } } }
    const deathAnim = e.base && hasAnim(this,e.base,'death');
    if(!deathAnim) this.burst(e.x,e.y,0xffffff,e.boss?30:8,e.boss?200:70,2,e.boss?900:500); // white gas
    if(e.boss){ this.bossDied(e); }
    else { const n = Phaser.Math.Between(e.def.rb[0],e.def.rb[1]); for(let i=0;i<n;i++) this.dropPickup('balloon',e.x+Phaser.Math.Between(-14,14),e.y+Phaser.Math.Between(-14,14));
      const r=Math.random(); if(r<.10) this.dropPickup('popcorn',e.x,e.y); else if(r<.25) this.dropPickup('candy',e.x,e.y); }
    if(e.big||e.boss) this.cameras.main.shake(120,.006); this.stopFor(e.boss?.12:.02);
    this.dieOnScreen(e); }
  // death without rewards (wave clear / boss summons): death sheet, hold, fade - never an instant pop. Also used by killEnemy.
  dieOnScreen(e){ e.dead=true; const sp=e.spr; if(e.boss){ (this.bossDying=this.bossDying||[]).push({sp,x:sp?sp.x:e.x,y:sp?sp.y:e.y,w:sp?sp.displayWidth:260,h:sp?sp.displayHeight:260,until:this.time.now+FEEL.deathHoldBoss+FEEL.deathFadeBoss+400}); }   /* keep the boss camera framing through the whole death + fade */
    if(!sp||!sp.active) return;
    this.corpses=(this.corpses||[]).filter(c=>c.active); if(!e.boss) this.corpses.push(sp); /* bosses are exempt from the corpse cap: the wave-clear deaths were evicting the dying boss */ while(this.corpses.length>PERF.maxCorpses){ const o=this.corpses.shift(); this.tweens.killTweensOf(o); o.destroy(); }   /* corpse cap */ sp.clearTint(); e.flashUntil=0;
    if(e.boss){ this.cameras.main.shake(400,.012); this.cameras.main.flash(180,255,240,220); this.burst(sp.x,sp.y,0xffd040,30,260,3,1200); this.burst(sp.x,sp.y,0xff4060,30,220,3,1200); this.burst(sp.x,sp.y,0x40c0ff,20,200,3,1200); }   /* no scale pop: boss stays put */   /* pop + confetti */ this.tweens.killTweensOf(sp); sp.setDepth(8.5);
    const fade=()=>this.tweens.add({targets:sp,alpha:0,y:sp.y+(e.boss?0:4),delay:e.boss?FEEL.deathHoldBoss:FEEL.deathHold,duration:e.boss?FEEL.deathFadeBoss:FEEL.deathFade,onComplete:()=>sp.destroy()});
    const dir=(sp.flipX?1:-1); if(!e.boss) this.tweens.add({targets:sp,rotation:e.boss?0:dir*FEEL.deathTopple*.35,x:sp.x-dir*10,duration:260,ease:'Quad.out'});   // knocked back + topples
    if(e.base&&hasAnim(this,e.base,'death')){ sp._busy=false; sp._st=null; setAnim(this,sp,e.base,'death'); if(sp.anims.currentAnim) sp.anims.msPerFrame=1000/FEEL.deathFps; sp.once('animationcomplete',()=>{ this.burst(sp.x,sp.y,0xffffff,e.boss?30:8,e.boss?200:70,2,e.boss?900:500); fade(); }); }
    else this.tweens.add({targets:sp,alpha:0,scaleX:sp.scaleX*1.5,scaleY:sp.scaleY*.3,duration:FEEL.deathFade,onComplete:()=>sp.destroy()}); }
  dropPickup(kind,x,y){ const s=this.add.image(x,y,kind).setDepth(8); if(kind==='balloon') this.tweens.add({targets:s,y:y-6,yoyo:true,repeat:-1,duration:600+Math.random()*300,ease:'Sine.inOut'});
    this.pickups.push({kind,spr:s,x,y}); }
  collect(p){ p.spr.destroy(); p.dead=true;
    if(p.kind==='balloon'){ this.run.balloons++; Sfx.pop(); this.burst(p.x,p.y,0xff1020,12,170); this.tweens.add({targets:this.rbC,scale:{from:1.15,to:1},duration:150});
      const t=this.add.text(p.x,p.y-10,'1',{fontFamily:'Impact,Georgia',fontSize:'26px',color:'#0b1f6a',stroke:'#fff',strokeThickness:3}).setOrigin(.5).setDepth(50);
      this.tweens.add({targets:t,y:p.y-34,duration:1000,onComplete:()=>t.destroy()}); }
    else { Sfx.crunch(p.kind); this.burst(p.x,p.y,p.kind==='candy'?0xff70d0:0xfff2a0,12,160); this.burst(this.pl.x,this.pl.y,0x60ff60,8,90); const h = p.kind==='candy'?.3:1; this.pl.hp=Math.min(this.pl.max,this.pl.hp+this.pl.max*h); this.floatText(this.pl.x,this.pl.y-30,p.kind==='candy'?'+30%':'FULL HP',0x60ff60,18); } }
  enemyShot(x,y,ang,spd,dmg,tint,opts={}){ const from=opts.from; delete opts.from;
    let pt = opts.tex==='ring' ? 'proj_ring' : (opts.tex || PROJ_BY[from] || PROJ_BY._ranged); if(!this.textures.exists(pt)) pt='eshot';
    const md=PROJ_MODE[pt]||['tint'], s=this.pool.img(pt,x,y,13); refit(s);
    if(md[0]==='anim' && this.anims.exists(md[1])) s.play(md[1]); if(md[0]==='face') s.setRotation(ang); if(md[0]==='spin') opts.spin=opts.spin||2.2;
    if(pt==='eshot') s.setTint(tint); else if(opts.ring) s.setTint(tint);   // stun/tele rings keep their colour code
    if(opts.tex==='ring'){ delete opts.tex; s.setScale(1.5); } if(opts.scale) s.setScale(opts.scale);
    this.eshots.push(Object.assign({spr:s,x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg,life:4,r:7,pooled:true},opts)); }
  hurtPlayer(d,fromX,fromY){ if(this.pl.ifr>0||this.over||GOD) return; this.pl.hp-=d; this.pl.ifr=.45; Sfx.hurt(); this.cameras.main.shake(90,.004); this.stopFor(.06);
    if(!hasAnim(this,this.pkey,'hit')){ this.player.setTintFill(0xffffff); this.time.delayedCall(60,()=>this.player.setTint(0xff4040)); this.time.delayedCall(160,()=>this.player.clearTint()); }   // hit sheets carry their own flash
    setAnim(this,this.player,this.pkey,'hit'); if(this.pl.hp<=0) this.playerDie(); }
  updateEnemies(dt){ const p=this.pl;
    for(const e of this.enemies){ if(e.dead) continue; if(e.boss){ this.updateBoss(e,dt); }
      else { e.t+=dt; const a=Math.atan2(p.y-e.y,p.x-e.x), d=dist(e.x,e.y,p.x,p.y); let vx=0,vy=0;
        if(e.ai==='chase'){ vx=Math.cos(a)*e.spd; vy=Math.sin(a)*e.spd; }
        else if(e.ai==='ranged'){ const dir = d>300?1:d<200?-1:0; vx=Math.cos(a)*e.spd*dir; vy=Math.sin(a)*e.spd*dir;
          if(dir===0){ vx=Math.cos(a+Math.PI/2)*e.spd*.4; vy=Math.sin(a+Math.PI/2)*e.spd*.4; }
          if(e.t>2.2 && d<520){ e.t=0; const col={pie:0xffffff,water:0x40a0ff,ball:0xff3030}[e.def.shot]; this.enemyShot(e.x,e.y,a,e.def.shot==='water'?330:250,e.dmg,col,{from:e.id}); } }
        else if(e.ai==='burst'){ const cyc=e.t%2; const m = cyc>1.5?4.2:.5; vx=Math.cos(a)*e.spd*m; vy=Math.sin(a)*e.spd*m; if(cyc>1.3&&cyc<1.5) e.spr.x+=Phaser.Math.Between(-2,2); }
        else if(e.ai==='erratic'){ if(!e.dir||e.t%0.7<dt) e.dir = a + Phaser.Math.FloatBetween(-1.6,1.6); vx=Math.cos(e.dir)*e.spd; vy=Math.sin(e.dir)*e.spd;
          e.phase+=dt; if(e.phase>2.8 && d<550){ e.phase=0; this.lob(e.x,e.y,p.x+Phaser.Math.Between(-90,90),p.y+Phaser.Math.Between(-90,90),e.dmg); } }
        const sg=e.stag>0?(e.stag-=dt,FEEL.staggerSlow):1; e.x += (vx*sg+e.kx)*dt; e.y += (vy*sg+e.ky)*dt; e.kx*=.82; e.ky*=.82;
        this.clampArena(e, e.r);
        if(d<e.r+PLAYER_R) this.hurtPlayer(e.dmg);
        const rot = e.ai==='chase'&&e.id>'E10'||e.id==='E11'||e.id==='E12' ? 0 : Math.sin(this.time.now/150+e.x)*.15; // side-to-side
        if(!e.spr._busy) setAnim(this,e.spr,e.base,'walk');   // back to the walk loop after a one-shot hit (was frozen on the last hit frame)
        if(Math.abs(vx)>4){ const f=vx<0; if(f!==e.spr.flipX) e.squash=Math.max(e.squash||0,.1); e.spr.setFlipX(f); }   // face movement direction; squash on turn
        const ph=this.time.now/130+e.x*.01, sq=(e.squash>0?(e.squash-=dt,.18):0), st=Math.sin(ph*2)*.06;   // walk squash & stretch + hit squash
        if(e.spawnT>0){ e.spawnT-=dt; e.spr.setScale(1-e.spawnT*3.6); } else e.spr.setScale(1+st+sq,1-st-sq);
        const step=this.time.now/1000*Math.PI*(e.def.walkHz||FEEL.stepHz)+e.x*.01;   // procedural walk bob (2-4 px) + tilt, synced to the ~10 fps walk sheet
        e.spr.setPosition(e.x, e.y - Math.abs(Math.sin(step))*(e.hasWalk?FEEL.bobPx:FEEL.bobPxNoSheet)).setRotation(rot*.3 + Math.sin(step)*FEEL.tilt); e.spr.visible=this.inView(e.x,e.y); }   // cull off-screen enemies   // subtle: the walk sheets already bounce
      if(this.time.now<(e.flashUntil||0)){ if(e.boss) e.spr.setTint(0xffc0c0); else e.spr.setTintFill(0xffffff); } /* bosses: shape-keeping tint, never a fill */ else if(!e.inv) e.spr.clearTint(); }   // ~60 ms white flash, then cleared
    // cheap separation
    const L=this.enemies; for(let i=0;i<L.length;i++){ const a=L[i]; if(a.dead||a.boss) continue; for(let j=i+1;j<L.length;j++){ const b=L[j]; if(b.dead||b.boss) continue;
      const dx=b.x-a.x, dy=b.y-a.y, m=dx*dx+dy*dy, rr=(a.r+b.r)*.9; if(m<rr*rr&&m>0.01){ const k=(rr-Math.sqrt(m))/2/Math.sqrt(m); a.x-=dx*k; a.y-=dy*k; b.x+=dx*k; b.y+=dy*k; } } }
    this.enemies = this.enemies.filter(e=>!e.dead||e.spr.active&&false); }
  lob(x,y,tx,ty,dmg,radius=60,delay=900,col=0xff6000){ const w=this.add.circle(tx,ty,radius,col,.18).setStrokeStyle(2,col,.8).setDepth(3);
    const b=this.add.image(x,y,'firedrop').setDepth(14); this.tweens.add({targets:b,x:tx,y:ty,duration:delay,onComplete:()=>{ b.destroy(); w.destroy();
      this.burst(tx,ty,col,16,radius*3); Sfx.noise(.15,.25,200); if(dist(tx,ty,this.pl.x,this.pl.y)<radius+PLAYER_R-4) this.hurtPlayer(dmg); }}); }
  clampArena(o,r){ const dx=o.x-CX, dy=o.y-CY, d=Math.hypot(dx,dy), m=R-r; if(d>m){ o.x=CX+dx/d*m; o.y=CY+dy/d*m; return true; } return false; }
  // ---------------------------------------------------------------- waves
  startWave(){ const wv=this.run.wave, def=WAVES[wv]; this.buildWeapons(); this.pl.hp=this.pl.max; this.pl.x=CX; this.pl.y=CY;
    this.spawnT=0; this.state = def.boss?'bossintro':'wave'; this.timeLeft = FAST?FAST_WAVE_T:def.t;
    if(def.boss) Sfx.music('music_boss_loop'); else { Sfx.music(Sfx.loaded('combat_v2b')?'combat_v2b':'music_combat_loop'); Sfx.horn(); }
    this.showBanner(def.boss?`BOSS: ${BOSSES[def.boss].name}`:`WAVE ${wv}`, def.boss?BLOOD:GOLD); this.fragThisWave=false;
    this.say(def.boss?Lore.boss(def.boss,'intro'):Lore.wave(wv),def.boss?'#ffb0b0':'#fff',3600);
    if(def.boss){ Sfx.boss(); this.tweens.add({targets:this.redFlash,alpha:{from:0,to:.45},yoyo:true,repeat:5,duration:250,onComplete:()=>{ this.redFlash.alpha=0; }});
      this.time.delayedCall(3000,()=>{ if(!this.over){ this.spawnBoss(def.boss); this.state='boss'; } }); } }
  say(s,col='#fff',ms=3200){ if(!s) return; this.tweens.killTweensOf(this.sayT); this.sayT.setText(s).setColor(col).setAlpha(0); this.tweens.add({targets:this.sayT,alpha:1,duration:250}); this.tweens.add({targets:this.sayT,alpha:0,delay:ms,duration:500}); }
  fragFound(f){ if(!f) return; Sfx.ticket(); this.time.delayedCall(this.sayT.alpha>0?3400:0,()=>this.say(`📜 Fragment found: ${f.title}  (read it in the Codex)`,GOLD,3000)); }
  showBanner(s,col){ this.banner.setText(s).setColor(col).setAlpha(1).setScale(.6); this.tweens.add({targets:this.banner,scale:1,duration:300,ease:'Back.out'});
    this.tweens.add({targets:this.banner,alpha:0,delay:1600,duration:500}); }
  updateSpawning(dt){ const wv=this.run.wave, def=WAVES[wv]; this.spawnT-=dt;
    const alive=this.enemies.length+this.warnings.length;
    if(this.spawnT<=0 && alive<TUNE.spawnCap){ this.spawnT = Math.max(TUNE.spawnIntervalMin, TUNE.spawnIntervalBase - wv*TUNE.spawnIntervalStep) * (FAST?.5:1) / ((wv===6||wv===11)?TUNE.newRaceSpawnMul:1);
      const n = 1 + Math.floor(Math.random()*(2+wv/4)*((wv===6||wv===11)?TUNE.newRaceSpawnMul:1));
      for(let i=0;i<n;i++){ let x,y,tries=0; do{ const a=Math.random()*Math.PI*2, r=Math.sqrt(Math.random())*(R-40); x=CX+Math.cos(a)*r; y=CY+Math.sin(a)*r; } while(dist(x,y,this.pl.x,this.pl.y)<220 && tries++<10);
        const id = Phaser.Utils.Array.GetRandom(def.pool), m=this.add.image(x,y,'warn').setDepth(4);
        this.tweens.add({targets:m,alpha:.2,yoyo:true,repeat:-1,duration:200}); this.warnings.push({x,y,id,t:2,spr:m}); } }
  }
  updateWarnings(dt){ for(const w of this.warnings){ w.t-=dt; if(w.t<=0){ w.spr.destroy(); w.done=true; if(this.state==='wave') this.spawnEnemy(w.id,w.x,w.y); } } this.warnings=this.warnings.filter(w=>!w.done); }
  endWave(){ if(this.state==='shop'||this.over) return; this.state='cleared';
    for(const e of this.enemies) if(!e.dead) this.dieOnScreen(e); this.enemies=[];   // wave clear: remaining enemies die on screen, never pop out
    this.warnings.forEach(w=>w.spr.destroy()); this.warnings=[]; this.eshots.forEach(s=>s.pooled?this.pool.release(s.spr):s.spr.destroy()); this.eshots=[]; this.hazards.forEach(h=>h.spr&&h.spr.destroy()); this.hazards=[];
    for(const p of this.pickups) if(!p.dead&&p.kind==='balloon') this.collect(p); this.pickups.forEach(p=>!p.dead&&p.spr.destroy()); this.pickups=[];
    if(this.run.wave>=20){ this.finish(true); return; }
    this.showBanner(`WAVE ${this.run.wave} CLEARED`,'#7dff7d');
    this.time.delayedCall(1400,()=>{ if(this.over) return; this.state='shop'; this.scene.launch('Shop',{run:this.run}); this.scene.pause(); }); }
  nextWave(){ this.scene.resume(); this.run.wave++; this.startWave(); }
  playerDie(){ this.over=true; Sfx.stopMusic(); Sfx.playerDeath(); this.weapons.forEach(w=>w.spr.setVisible(false)); this.player.clearTint(); this.player._busy=false;
    if(hasAnim(this,this.pkey,'death')) setAnim(this,this.player,this.pkey,'death'); else this.player.setVisible(false);
    const b=this.add.image(this.pl.x,this.pl.y,'balloon').setScale(1.6).setDepth(60); // death: red balloon flies away then pops
    this.tweens.add({targets:b,y:this.pl.y-220,x:this.pl.x+30,duration:1300,ease:'Sine.in',onComplete:()=>{ Sfx.pop(); this.burst(b.x,b.y,0xff1020,24,220); b.destroy(); }});
    this.time.delayedCall(2200,()=>this.finish(false)); }
  finish(win){ this.over=true; const prevBest=Save.d.bestWave||0, reached=win?20:this.run.wave-1;
    if(!win && TUNE.gtPerWavesOnDeath){ const g=Math.floor(reached/TUNE.gtPerWavesOnDeath); this.run.gt+=g; Save.d.gt+=g; }
    this.run.newBest = reached>prevBest && prevBest>0 || (prevBest===0 && reached>0); Save.d.bestWave=Math.max(prevBest,reached); Save.save();
    const waves = win?20:this.run.wave-1; this.time.delayedCall(win?1200:0,()=>goScene(this,'Story',{kind:win?'win':'loss',end:{win,wave:this.run.wave,waves,gt:this.run.gt,kills:this.run.kills,unlocks:this.run.unlocks,reveals:this.run.reveals,charId:this.charId,newBest:this.run.newBest}})); }
  // ---------------------------------------------------------------- bosses
  spawnBoss(id){ const B=BOSSES[id], mk=(tex,x,y,hp,name,r)=>{ const e={id,boss:true,name,base:tex,spr:this.bossSprite(tex,x,y),x,y,r:Math.round(r*BOSS_SCALE),hp,max:hp,dmg:B.dmg,spd:B.spd*U_SPEED,t:0,st:'',kx:0,ky:0,flash:0};
      this.enemies.push(e); return e; };
    let list=[];
    if(id==='E5'){ const e=mk('truck',CX,CY-R+120,B.hp*bossMult('E5'),B.name,40); e.st='chase'; e.rot=Math.PI/2; list=[e]; }
    if(id==='E10'){ const e=mk('juggler',CX-R*.6,CY-300,B.hp*bossMult('E10'),B.name,24); e.st='rope'; e.rope=0; e.dir=1; e.inv=true; list=[e]; }
    if(id==='E15'){ const e=mk('petmaster',CX,CY-300,B.hp*bossMult('E15'),B.name,26); e.st='charge'; e.inv=false; e.ringG=this.add.graphics().setDepth(16); list=[e]; }
    if(id==='E20'){ const h=B.hp*bossMult('E20')*.6; const a=mk('cousin1',CX-250,CY-300,h,'Cousin 1: The Trickster',22), b=mk('cousin2',CX+250,CY-300,h,'Cousin 2: The Hunter',22);
      a.st='c1'; b.st='c2'; a.other=b; b.other=a; a.rage=0; b.rage=0; b.whip=0; list=[a,b]; }
    this.bossId=id; this.setBossBars(list); }
  bossSprite(tex,x,y){ const s=this.add.sprite(x,y,tex).setDepth(9); s._xs=BOSS_SCALE; setAnim(this,s,tex,'walk'); return s; }
  // telegraph: <key>_windup (once) then a short red flash, played just before each boss attack
  windup(e){ if(!e.base||e.dead) return; Sfx.windup(); if(!hasAnim(this,e.base,'windup')||e.spr._busy) return; setAnim(this,e.spr,e.base,'windup');
    e.spr.once('animationcomplete',()=>{ if(e.dead) return; e.spr._busy=false; e.spr._st=null; setAnim(this,e.spr,e.base,'walk'); }); }   // windup ends on its peak pose, then back to the loop
  bossAttack(e,name='attack'){ if(hasAnim(this,e.base,name)) setAnim(this,e.spr,e.base,name); else if(name!=='attack'&&hasAnim(this,e.base,'attack')) setAnim(this,e.spr,e.base,'attack'); }
  updateBoss(e,dt){ if(e.spr&&!e.spr._busy) setAnim(this,e.spr,e.base,'walk'); const p=this.pl; e.t+=dt; const a=Math.atan2(p.y-e.y,p.x-e.x), d=dist(e.x,e.y,p.x,p.y);
    if(e.id==='E5'){ // Clown Truck
      if(e.st==='chase'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,2.5*dt); e.x+=Math.cos(e.rot)*e.spd*dt; e.y+=Math.sin(e.rot)*e.spd*dt;
        if(e.t>1.05&&!e.wu){ e.wu=1; this.windup(e); }
        if(e.t>1.4){ e.t=0; e.wu=0; this.bossAttack(e); for(let i=-1;i<=1;i++) this.enemyShot(e.x,e.y,a+i*.25,280,e.dmg*.7,0xff4040,{from:e.id}); }
        if(e.hp<e.max*.5){ e.st='aim'; e.t=0; this.windup(e); } }
      else if(e.st==='aim'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,3*dt); e.spr.x+=Phaser.Math.Between(-3,3); if(Math.random()<.4) this.burst(e.x-Math.cos(e.rot)*50,e.y-Math.sin(e.rot)*50,0x777777,1,60,2,600);
        if(e.t>1.1){ e.st='ram'; e.t=0; e.passed=false; } }
      else if(e.st==='ram'){ const v=e.spd*4.2; e.x+=Math.cos(e.rot)*v*dt; e.y+=Math.sin(e.rot)*v*dt;
        if(this.clampArena(e,e.r)||e.t>1.6){ e.st='turn'; e.t=0; e.vulnMul=1.5; } }
      else if(e.st==='turn'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,.9*dt); e.x+=Math.cos(e.rot)*e.spd*.3*dt; e.y+=Math.sin(e.rot)*e.spd*.3*dt;
        if(e.t>1.8){ e.st='aim'; e.t=0; e.vulnMul=1; this.windup(e); } }
      this.clampArena(e,e.r); e.spr.setPosition(e.x,e.y).setRotation(e.rot); if(d<e.r+PLAYER_R+2) this.hurtPlayer(e.st==='ram'?e.dmg*2:e.dmg); }
    if(e.id==='E10'){ // The Juggler
      const ropeY=[CY-R*.55, CY-R*.15]; this.ropes.clear();
      if(e.st==='rope'){ ropeY.forEach((y,i)=>{ const hw=Math.sqrt(R*R-(y-CY)**2); this.ropes.lineStyle(i===e.rope?5:3,0xf3e0b0,.9).lineBetween(CX-hw,y,CX+hw,y); });
        const hw=Math.sqrt(R*R-(ropeY[e.rope]-CY)**2)-40; e.y=ropeY[e.rope]-20; e.x+=e.dir*e.spd*dt; if(Math.abs(e.x-CX)>hw){ e.dir*=-1; e.x=CX+Math.sign(e.x-CX)*hw; }
        e.drop=(e.drop||0)+dt; if(e.drop>.55&&!e.wu){ e.wu=1; this.windup(e); } if(e.drop>.9){ e.drop=0; e.wu=0; this.bossAttack(e); this.lob(e.x,e.y,p.x+Phaser.Math.Between(-30,30),p.y+Phaser.Math.Between(-30,30),e.dmg,55,900); }
        e.spr.setAlpha(.75).setTint(0x9999ff); e.inv=true;
        if(e.t>10){ e.st='toBox'; e.t=0; e.inv=false; e.spr.setAlpha(1).clearTint(); const ang=Math.random()*Math.PI*2;
          e.box={x:CX+Math.cos(ang)*R*.4,y:CY+Math.sin(ang)*R*.4}; e.boxS=this.add.image(e.box.x,e.box.y,'box').setDepth(7);
          e.side = Math.random()<.5?-1:1; e.x=CX+e.side*(R-40); e.y=CY+Phaser.Math.Between(-100,200); } }
      else if(e.st==='toBox'||e.st==='toEdge'){ const tx = e.st==='toBox'?e.box.x:CX-e.side*(R-40), ty = e.st==='toBox'?e.box.y:CY;
        const aa=Math.atan2(ty-e.y,tx-e.x); e.x+=Math.cos(aa)*e.spd*1.1*dt; e.y+=Math.sin(aa)*e.spd*1.1*dt; e.spr.setRotation(Math.sin(this.time.now/80)*.15);
        if(dist(e.x,e.y,tx,ty)<20){ if(e.st==='toBox'){ e.st='toEdge'; e.boxS.destroy(); } else { e.st='rope'; e.t=0; e.rope=1-e.rope; e.spr.setRotation(0); } }
        if(d<e.r+PLAYER_R) this.hurtPlayer(e.dmg*.5); }
      e.spr.setPosition(e.x,e.y); }
    if(e.id==='E15'){ // The Pet Master
      const g=e.ringG; g.clear();
      if(e.st==='charge'){ e.inv=false; const k=Math.min(1,e.t/7); g.lineStyle(4+k*6,0xff6a00,.5+k*.5).strokeCircle(e.x,e.y-48,14+k*10);
        if(Math.random()<.3+k) this.burst(e.x+Phaser.Math.Between(-20,20),e.y-48,0xffa000,1,80);
        if(e.t>6.6&&!e.wu){ e.wu=1; this.windup(e); }
        if(e.t>7){ e.wu=0; this.bossAttack(e,'attack_summon'); const n=3+Math.floor(Math.random()*3); for(let i=0;i<n;i++){ const id=Phaser.Utils.Array.GetRandom(['E11','E12','E13','E14']); const s=this.spawnEnemy(id,e.x+Phaser.Math.Between(-60,60),e.y+Phaser.Math.Between(-60,60)); this.burst(s.x,s.y,0xff6000,8,100); }
          e.st='tp'; e.t=0; } }
      else if(e.st==='tp'){ e.inv=true; if(e.t>.8){ this.burst(e.x,e.y,0xff4000,20,180); const aa=Math.random()*Math.PI*2, rr=Phaser.Math.Between(PETMASTER_TP[0],PETMASTER_TP[1]); e.x=this.pl.x+Math.cos(aa)*rr; e.y=this.pl.y+Math.sin(aa)*rr; this.clampArena(e,60); this.burst(e.x,e.y,0xff4000,20,180); e.st='charge'; e.t=0; } }
      e.spr.setPosition(e.x,e.y).setAlpha(e.inv?.6:1); }
    if(e.id==='E20'){ // The Unknown Cousins
      const rage = e.rage>0; if(rage){ e.rage-=dt; e.spr.setTint(0xff5050); } else if(!(this.time.now<(e.flashUntil||0))) e.spr.clearTint();
      e.ringT=(e.ringT||0)+dt;
      if(e.st==='c1'){ e.blink=(e.blink||0)+dt; e.shot=(e.shot||0)+dt;
        if(e.blink>1.85&&!e.bw){ e.bw=1; this.windup(e); } /* new cousin1 art = cousin2 rig: same windup telegraph before each blink */ if(e.blink>2.2){ e.blink=0; e.bw=0; this.burst(e.x,e.y,0xffffff,12,150); const aa=Math.random()*Math.PI*2, rr=Phaser.Math.Between(200,420); e.x=p.x+Math.cos(aa)*rr; e.y=p.y+Math.sin(aa)*rr; this.clampArena(e,e.r); this.burst(e.x,e.y,0x80ffff,12,150); }
        if(e.shot>(rage?.25:.8)){ e.shot=0; this.bossAttack(e); this.enemyShot(e.x,e.y,a,320,e.dmg*.6,0x80ffff,{from:e.id}); }
        if(e.ringT>5.6&&!e.wu){ e.wu=1; this.windup(e); } if(e.ringT>6){ e.ringT=0; e.wu=0; this.enemyShot(e.x,e.y,a,200,0,0xffffff,{tex:'ring',r:16,life:6,ring:'stun',spin:1}); } }
      else { const sp = e.spd*(rage?2:1); e.whip=(e.whip||0)-dt*(rage?2:1);
        if(e.whipT>0){ e.whipT-=dt; this.fx.lineStyle(3,0xff3030,.6).lineBetween(e.x,e.y,e.x+Math.cos(e.wa)*260,e.y+Math.sin(e.wa)*260);
          if(e.whipT<=0){ this.fx.lineStyle(8,0x5a3a0a,1).lineBetween(e.x,e.y,e.x+Math.cos(e.wa)*260,e.y+Math.sin(e.wa)*260); Sfx.noise(.1,.4,1200);
            const pa=Math.atan2(p.y-e.y,p.x-e.x); if(d<280 && Math.abs(Phaser.Math.Angle.Wrap(pa-e.wa))<.35){ this.hurtPlayer(e.dmg); this.tweens.add({targets:p,x:e.x+Math.cos(pa)*60,y:e.y+Math.sin(pa)*60,duration:250}); } } }
        else { if(d>80){ e.x+=Math.cos(a)*sp*dt; e.y+=Math.sin(a)*sp*dt; } if(d<260&&e.whip<=0){ e.whip=2.2; e.whipT=.5; e.wa=a; this.windup(e); } }
        if(e.ringT>6.6&&!e.wu){ e.wu=1; this.windup(e); } if(e.ringT>7){ e.ringT=0; e.wu=0; this.enemyShot(e.x,e.y,a,200,0,0xff40ff,{tex:'ring',r:16,life:6,ring:'tele',spin:1}); }
        if(d<e.r+PLAYER_R) this.hurtPlayer(e.dmg*.5); }
      this.clampArena(e,e.r); e.spr.setPosition(e.x,e.y); }
  }
  revealUnlock(c){ (this.run.reveals=this.run.reveals||[]).push(c.id); }   // shown as a card in the Shop (or End) so it never interrupts combat
  bossDied(e){ if(e.ringG) e.ringG.destroy(); if(e.boxS) e.boxS.destroy(); this.ropes.clear(); if(e.bar){ e.bar.width=0; }
    if(e.id==='E20' && e.other && !e.other.dead){ e.other.rage=60; this.showBanner(`${e.other.name.split(':')[0]} ENRAGED!`,BLOOD); return; }
    const B=BOSSES[e.id]; this.run.gt+=B.gt; Save.d.gt+=B.gt; this.run.bossesBeaten++;
    if(!Save.d.beaten.includes(e.id)){ Save.d.beaten.push(e.id); const c=CHARS.find(c=>c.unlock===e.id); if(c&&!Save.d.unlocked.includes(c.id)){ Save.d.unlocked.push(c.id); this.run.unlocks.push(c.name); this.revealUnlock(c); } }
    this.say(Lore.boss(e.id,'death'),'#ffd0a0',3400); this.fragFound(Lore.give(Lore.gatedFor(e.id)));
    Save.save(); this.showBanner(`+${B.gt} GOLDEN TICKET${B.gt>1?'S':''}`,GOLD); Sfx.bossDeath(); this.time.delayedCall(500,()=>Sfx.ticket());
    // pet master summons die with him
    for(const x of this.enemies) if(!x.dead&&!x.boss) this.dieOnScreen(x);
    this.time.delayedCall(FEEL.bossOutro,()=>{ this.setBossBars([]); this.endWave(); }); }   // wait for the boss death to play out before the shop
  // ---------------------------------------------------------------- main loop
  // boss fights: pull the camera toward the boss and zoom out (down to ZOOM_MIN_BOSS) so player and boss stay on screen together
  bossCam(dt){ const cam=this.cameras.main, base=this.baseZoom||CAM_ZOOM, bs=this.enemies.filter(e=>e.boss&&!e.dead&&e.spr);
    this.bossDying=(this.bossDying||[]).filter(d=>d.sp?(d.sp.active&&d.sp.alpha>.02):d.until>this.time.now);   /* lock lasts while the wreck is visible */
    /* boss framing (Star Lord: player must never leave the screen): bounding box of player + every live boss / dying wreck,
       zoom out as far as needed (floor CAM_MIN_ZOOM) so the whole box sits inside the HUD-safe band, centre on it; ease back in afterwards */
    const tg=bs.map(e=>({x:e.spr.x,y:e.spr.y,w:e.spr.displayWidth,h:e.spr.displayHeight})).concat(this.bossDying.map(d=>({x:d.x,y:d.y,w:d.w||260,h:d.h||260})));
    if(tg.length){ const pp=this.player, top=HUD_SAFE.top, bot=HUD_SAFE.bottom, M=40;
      tg.push({x:pp.x,y:pp.y,w:pp.displayWidth+20,h:pp.displayHeight+20});
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const t of tg){ x0=Math.min(x0,t.x-t.w/2); x1=Math.max(x1,t.x+t.w/2); y0=Math.min(y0,t.y-t.h/2); y1=Math.max(y1,t.y+t.h/2); }
      const z=Math.max(CAM_MIN_ZOOM, Math.min(base, (W-2*M)/(x1-x0), (H-top-bot-2*M)/(y1-y0)));
      const snap=!this._camLock; if(cam._follow||snap){ this._camLock=1; cam.stopFollow(); } cam.useBounds=false;   /* first boss frame snaps, so a boss entering from off-screen is framed at once */
      const kz=snap?1:1-Math.exp(-dt*(z<cam.zoom?14:4)); cam.setZoom(cam.zoom+(z-cam.zoom)*kz);   // zoom out fast (never lose anyone), ease in slowly
      const cz=cam.zoom, cx=(x0+x1)/2, cy=(y0+y1)/2-(top-bot)/2/cz, kc=snap?1:1-Math.exp(-dt*14);   // shift so the box centres in the HUD-safe band
      cam.centerOn(cam.midPoint.x+(cx-cam.midPoint.x)*kc, cam.midPoint.y+(cy-cam.midPoint.y)*kc); this.camMinSeen=Math.min(this.camMinSeen||9,cz); return; }
    if(this._camLock){ this._camLock=0; cam.followOffset.set(0,0); cam.startFollow(this.player,false,.09,.09); cam.useBounds=true; }
    const k=1-Math.exp(-dt*3); cam.setZoom(cam.zoom+(base-cam.zoom)*k); }
  drawBossArrows(){ const g=this.bossArrow; g.clear(); const v=this.cameras.main.worldView, m=34;
    for(const e of this.enemies){ if(!e.boss||e.dead||e.hidden) continue; if(Phaser.Geom.Rectangle.Contains(v,e.x,e.y)) continue;   // BUG-007: off-screen boss indicator
      const cx=W/2, cy=H/2, a=Math.atan2(e.y-(v.y+v.height/2), e.x-(v.x+v.width/2)), c=Math.cos(a), s=Math.sin(a), k=Math.min((W/2-m)/Math.abs(c||1e-6),(H/2-m)/Math.abs(s||1e-6));
      const x=cx+c*k, y=cy+s*k; g.fillStyle(0xb3001b,.9).lineStyle(3,0xf3c75a,1);
      const p=[[x+c*20,y+s*20],[x-c*12-s*14,y-s*12+c*14],[x-c*12+s*14,y-s*12-c*14]]; g.beginPath(); g.moveTo(...p[0]); g.lineTo(...p[1]); g.lineTo(...p[2]); g.closePath(); g.fillPath(); g.strokePath(); } }
  update(time,delta){ if(this.bossArrow) this.drawBossArrows(); if(this.fpsT){ this.fpsLog.push(this.game.loop.actualFps); this.fpsT.setText(Math.round(this.game.loop.actualFps)+' fps\n'+this.enemies.length+' foes'); }
    if(this.paused||this.state==='shop') return;
    if(this.hitStop>0){ this.hitStop-=delta/1000; return; }
    const dt=Math.min(delta/1000,.05); this.fx.clear(); const p=this.pl;
    if(!this.over){ let tx=0,ty=0; if(p.stun>0) p.stun-=dt; else { const v=this.moveVec(); tx=v.x*p.ms; ty=v.y*p.ms; }
      const k=1-Math.exp(-dt*((tx||ty)?14:10)); p.vx+=(tx-p.vx)*k; p.vy+=(ty-p.vy)*k;      // acceleration / easing
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(Math.abs(p.vx)>8){ const nf=Math.sign(p.vx); if(nf!==p.face) p.sq=FEEL.turnSquash; p.face=nf; }
      this.clampArena(p,18); p.ifr-=dt; const sp=Math.hypot(p.vx,p.vy), moving=sp>20;
      setAnim(this,this.player,this.pkey,moving?'walk':'idle'); this.player.anims.timeScale = moving ? Phaser.Math.Clamp(sp/150,.7,1.6) : 1;   /* stride cadence tracks ground speed, so feet don't skate */
      const walkAnim=hasAnim(this,this.pkey,moving?'walk':'idle'); const ph=time/1000*Math.PI*FEEL.stepHz, bob = moving ? Math.abs(Math.sin(ph))*(walkAnim?FEEL.bobPx:FEEL.bobPxNoSheet) : 0;   // step-synced bounce, subtle over the walk sheet
      if(p.sq>0) p.sq-=dt; const br = (p.sq>0?-.14*p.sq/.12:0) + (moving? Math.sin(ph*2)*.04 : Math.sin(time/400)*.02);
      this.player.setPosition(p.x,p.y-bob).setFlipX(p.face<0).setScale(1-br,1+br).setRotation(moving? p.vx/p.ms*.05 + Math.sin(ph)*FEEL.tilt : 0);
      if(p.stun>0) this.player.setTint(0x8888ff); }
    this.bossCam(dt);
    if(this.state==='wave'){ this.timeLeft-=dt; this.updateSpawning(dt); if(this.timeLeft<=0) this.endWave(); }
    this.updateWarnings(dt);
    if(!this.over){ this.updateWeapons(dt); this.updateEnemies(dt); }
    for(const b of this.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; b.spr.setPosition(b.x,b.y);
      for(const e of this.enemies){ if(e.dead||e.hidden) continue; if(dist(b.x,b.y,e.x,e.y)<e.r+5){ this.hit(e,b.s,Math.atan2(b.vy,b.vx),b.dmgMul); b.life=0; break; } }
      if(b.life<=0||dist(b.x,b.y,CX,CY)>R){ this.pool.release(b.spr); b.dead=true; } } this.bullets=this.bullets.filter(b=>!b.dead);
    for(const s of this.eshots){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; s.spr.setPosition(s.x,s.y); if(s.spin) s.spr.rotation+=dt*6*s.spin;
      if(s.ring && dist(s.x,s.y,CX,CY)>R-20){ const nx=(s.x-CX)/R, ny=(s.y-CY)/R, dot=s.vx*nx+s.vy*ny; s.vx-=2*dot*nx; s.vy-=2*dot*ny; } // rings roll & bounce
      if(!this.over && dist(s.x,s.y,p.x,p.y)<s.r+PLAYER_R-2){ if(s.ring==='stun'){ p.stun=1.3; } else if(s.ring==='tele'){ this.burst(p.x,p.y,0xff40ff,14,150); const aa=Math.random()*Math.PI*2, rr=Math.random()*R*.8; p.x=CX+Math.cos(aa)*rr; p.y=CY+Math.sin(aa)*rr; }
        else this.hurtPlayer(s.dmg); s.life=0; }
      if(s.life<=0||(!s.ring&&dist(s.x,s.y,CX,CY)>R)){ if(s.pooled) this.pool.release(s.spr); else s.spr.destroy(); s.dead=true; } } this.eshots=this.eshots.filter(s=>!s.dead);
    if(!this.over) for(const k of this.pickups){ if(k.dead) continue; const d=dist(k.x,k.y,p.x,p.y);
      if(d<110){ const a=Math.atan2(p.y-k.y,p.x-k.x); k.x+=Math.cos(a)*420*dt; k.y+=Math.sin(a)*420*dt; k.spr.setPosition(k.x,k.y); } if(d<24) this.collect(k); }
    this.pickups=this.pickups.filter(k=>!k.dead);
    this.updateHUD(); }
  // debug / test hooks
  debugJump(w){ this.enemies.forEach(e=>{ if(e.ringG) e.ringG.destroy(); e.spr.destroy(); }); this.enemies=[]; this.setBossBars([]); this.ropes.clear(); this.run.wave=w-1; this.nextWave(); }
}
