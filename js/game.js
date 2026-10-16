const CX = 1000, CY = 1000, R = 880, WORLD = 2000;
const QS = new URLSearchParams(location.search);
const FAST = QS.has('fast'), GOD = QS.has('god');
const dist = (a,b,c,d)=>Math.hypot(a-c,b-d);

class Game extends Phaser.Scene {
  constructor(){ super('Game'); }
  init(d){ this.charId = d.charId||'A1'; this.ch = CHARS.find(c=>c.id===this.charId);
    this.run = {charId:this.charId, weapons:[], balloons:(+new URLSearchParams(location.search).get('gold')||0), wave:1, kills:0, gt:0, unlocks:[], bossesBeaten:0, mods:{}, adds:{}}; }
  create(){
    window.CDS = this; Sfx.init(); enterFx(this); this.pool = new Pool(this); this.hitStop=0; this.fpsLog=[];
    this.enemies=[]; this.bullets=[]; this.eshots=[]; this.pickups=[]; this.warnings=[]; this.hazards=[]; this.weapons=[];
    this.over=false; this.paused=false; this.pauseLayer=null; this.time.paused=false; this.state='wave';
    this.drawArena();
    this.pkey='p_'+this.charId; this.player = this.add.sprite(CX,CY,this.pkey).setDepth(10); setAnim(this,this.player,this.pkey,'idle');
    this.pl = {x:CX,y:CY,vx:0,vy:0,hp:100,max:100,ifr:0,stun:0,face:1};
    this.cameras.main.setBounds(0,0,WORLD,WORLD).startFollow(this.player,false,.09,.09);   // smoothed follow
    if(QS.has('fps')) this.fpsT = txt(this,W-90,80,'',16,'#7f7').setScrollFactor(0).setDepth(3000);
    this.fx = this.add.graphics().setDepth(20);
    this.buildHUD(); this.setupInput();
    this.startWave();
  }
  // ---------------------------------------------------------------- arena
  drawArena(){
    // floor: tiling texture 'arena_tile' clipped to the ring; audience + wall: 'arena_ring' (transparent centre)
    this.cameras.main.setBackgroundColor('#12060a');
    // bake tiled floor clipped to a circle once (a masked tileSprite is too slow on low-end/software GL)
    if(!this.textures.exists('arena_floor_baked')){ const t=this.textures.get('arena_tile').getSourceImage(), D=R*2+4, c=document.createElement('canvas'); c.width=c.height=D;
      const x=c.getContext('2d'); x.beginPath(); x.arc(D/2,D/2,D/2,0,Math.PI*2); x.clip(); x.fillStyle=x.createPattern(t,'repeat'); x.fillRect(0,0,D,D);
      this.textures.addCanvas('arena_floor_baked',c); }
    this.add.image(CX,CY,'arena_floor_baked').setDepth(0);
    const lines=this.add.graphics().setDepth(0.5); lines.lineStyle(3,0x000000,.18).strokeCircle(CX,CY,R*.66).strokeCircle(CX,CY,R*.33).lineBetween(CX-R,CY,CX+R,CY).lineBetween(CX,CY-R,CX,CY+R);
    this.add.image(CX,CY,'arena_ring').setDisplaySize(WORLD,WORLD).setDepth(1);
    this.ropes = this.add.graphics().setDepth(30); // used by Juggler
    this.redFlash = this.add.rectangle(0,0,W,H,0xff0000,0).setOrigin(0).setScrollFactor(0).setDepth(900);
  }
  // ---------------------------------------------------------------- HUD (GDD 1.3.1.1 layout)
  buildHUD(){ const D=1000, sf=o=>o.setScrollFactor(0).setDepth(D);
    this.hpBg = sf(this.add.image(20,26,'ui_healthbar_frame').setOrigin(0,.5));
    this.hpBar = sf(this.add.image(24,26,'ui_healthbar_fill').setOrigin(0,.5));
    this.hpT = sf(txt(this,120,26,'',15).setOrigin(.5));
    this.rbC = sf(counter(this,16,70,'balloon','0','#ff8090')); this.rbT = this.rbC.label;
    this.waveT = sf(txt(this,W/2,24,'',26,GOLD)); this.timerT = sf(txt(this,W/2,58,'',30,'#fff'));
    this.pauseBtn = sf(iconButton(this,W-40,38,'II',()=>this.togglePause(),56));
    this.bossArrow = sf(this.add.graphics()).setDepth(1001); this.bossBars = []; this.banner = sf(txt(this,W/2,H/2-120,'',54,BLOOD,{strokeThickness:8})).setAlpha(0); this.sayT = sf(txt(this,W/2,H/2-55,'',28,'#fff',{wordWrap:{width:1000},backgroundColor:'#000000aa',padding:{x:14,y:8}})).setAlpha(0).setDepth(1000); this.fragThisWave=false; this.revealQ=[];
    this.joyBase = sf(this.add.circle(0,0,60,0xffffff,.15).setStrokeStyle(3,0xffffff,.5)).setVisible(false);
    this.joyKnob = sf(this.add.circle(0,0,26,0xf3c75a,.6)).setVisible(false);
  }
  setBossBars(list){ this.bossBars.forEach(b=>b.forEach(o=>o.destroy())); this.bossBars=[];
    list.forEach((e,i)=>{ const w = list.length>1?440:800, x = list.length>1? W/2+(i?240:-240) : W/2, y = H-40;
      const bg=this.add.rectangle(x,y,w,20,0x000000,.7).setStrokeStyle(2,0xffffff).setScrollFactor(0).setDepth(1000);
      const bar=this.add.rectangle(x-w/2+2,y,w-4,16,0xffffff).setOrigin(0,.5).setScrollFactor(0).setDepth(1000);
      const t=txt(this,x,y-24,e.name,18).setScrollFactor(0).setDepth(1000); this.bossBars.push([bg,bar,t]); e.bar=bar; e.barW=w-4; }); }
  updateHUD(){ const p=this.pl, w = Math.min(600, p.max*2);   // bar length grows with Max HP (GDD); fill is cropped to HP%
    this.hpBg.setDisplaySize(w+8,28); this.hpBar.setDisplaySize(w,20); const fw=this.hpBar.frame.realWidth; this.hpBar.setCrop(0,0,fw*Phaser.Math.Clamp(p.hp/p.max,0,1),this.hpBar.frame.realHeight);
    this.hpT.setPosition(24+w/2,26).setText(`${Math.ceil(p.hp)} / ${Math.round(p.max)}`); this.rbT.setText(this.run.balloons);
    this.waveT.setText(`WAVE ${this.run.wave}/20`); this.timerT.setText(this.state==='boss'?'BOSS':this.state==='wave'?Math.ceil(Math.max(0,this.timeLeft)):'');
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
    const crit = Math.random()<s.cc; let d = s.dmg*mul*(crit?s.cd:1)*(e.vulnMul||1); e.hp -= d; if(!e.boss||this.time.now-(e.lastFlash||0)>250){ e.flash=.07; e.lastFlash=this.time.now; }   // BUG-006: bosses pulse a red tint, max 4x/s e.squash=.12;
    if(e.base && e.hasHit===undefined) e.hasHit=hasAnim(this,e.base,'hit');
    if(e.base && e.hasHit && !(e.spr._busy && e.spr._st!=='hit')) setAnim(this,e.spr,e.base,'hit');   // never interrupts a windup/death this.burst(e.x,e.y,crit?0xffe000:0xffffff,crit?5:2,160);
    if(crit||e.boss) this.stopFor(crit?.03:.015);
    if(Math.random()<s.ls){ this.pl.hp=Math.min(this.pl.max,this.pl.hp+2); }
    if(!e.boss){ e.kx += Math.cos(ang)*s.kb*60; e.ky += Math.sin(ang)*s.kb*60; }
    this.floatText(e.x+Phaser.Math.Between(-8,8),e.y-e.r,Math.round(d)+'',crit?0xffe000:0xffffff,crit?20:15);
    if(e.hp<=0) this.killEnemy(e); else Sfx.hit(s.melee); }
  stopFor(t){ this.hitStop=Math.max(this.hitStop,t); }       // short hit-pause
  floatText(x,y,s,col,size=16){ const t=this.pool.text(x,y,s,{fontFamily:'Georgia',fontSize:size+'px',color:'#'+col.toString(16).padStart(6,'0'),stroke:'#000',strokeThickness:3}).setDepth(50).setScale(.6);
    this.tweens.add({targets:t,scale:1,duration:90,ease:'Back.out'}); this.tweens.add({targets:t,y:y-30,alpha:0,duration:600,onComplete:()=>this.pool.release(t)}); }
  // pooled particles; uses puff_sheet / spark_sheet animations when the art provides them
  burst(x,y,col,n,spd=120,size=1,life=500){ const big=size>1, sheet=big?'puff_sheet':'spark_sheet', useSheet=this.anims.exists(sheet);
    for(let i=0;i<n;i++){ if(this.pool.count>900 && !big) break;
      const p=this.pool.img(useSheet?sheet:(big?'puff':'spark'),x,y,15); if(useSheet) p.play(sheet);
      p.setTint(col).setScale(big?Phaser.Math.FloatBetween(.6,1.4):1);
      const a=Math.random()*Math.PI*2, v=Phaser.Math.Between(spd*.3,spd);
      this.tweens.add({targets:p,x:x+Math.cos(a)*v*life/1000,y:y+Math.sin(a)*v*life/1000,alpha:0,scale:p.scale*(big?1.8:.5),duration:life,onComplete:()=>this.pool.release(p)}); } }
  // ---------------------------------------------------------------- enemies
  enemySprite(id,x,y){ const base='e_'+id, s=this.add.sprite(x,y,base).setDepth(9); setAnim(this,s,base,'walk'); return s; }
  spawnEnemy(id,x,y){ const d=ENEMIES[id], wv=this.run.wave-1;
    const e={id,def:d,spr:this.enemySprite(id,x,y),x,y,r:d.big?22:15,hp:d.hp+d.hpW*wv,dmg:d.dmg+d.dmgW*wv,spd:d.spd*U_SPEED,ai:d.ai,t:Math.random()*2,kx:0,ky:0,flash:0,phase:0};
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
    if(e.base && hasAnim(this,e.base,'death')){ e.spr._busy=false; setAnim(this,e.spr,e.base,'death'); e.spr.clearTint(); const sp=e.spr; sp.once('animationcomplete',()=>{ this.burst(sp.x,sp.y,0xffffff,e.boss?30:8,e.boss?200:70,2,e.boss?900:500); this.tweens.add({targets:sp,alpha:0,delay:450,duration:300,onComplete:()=>sp.destroy()}); }); }   // hold the last death frame briefly
    else this.tweens.add({targets:e.spr,alpha:0,scaleX:e.spr.scaleX*1.5,scaleY:e.spr.scaleY*.3,duration:250,onComplete:()=>e.spr.destroy()}); }
  dropPickup(kind,x,y){ const s=this.add.image(x,y,kind).setDepth(8); if(kind==='balloon') this.tweens.add({targets:s,y:y-6,yoyo:true,repeat:-1,duration:600+Math.random()*300,ease:'Sine.inOut'});
    this.pickups.push({kind,spr:s,x,y}); }
  collect(p){ p.spr.destroy(); p.dead=true;
    if(p.kind==='balloon'){ this.run.balloons++; Sfx.pop(); this.burst(p.x,p.y,0xff1020,12,170); this.tweens.add({targets:this.rbC,scale:{from:1.15,to:1},duration:150});
      const t=this.add.text(p.x,p.y-10,'1',{fontFamily:'Impact,Georgia',fontSize:'26px',color:'#0b1f6a',stroke:'#fff',strokeThickness:3}).setOrigin(.5).setDepth(50);
      this.tweens.add({targets:t,y:p.y-34,duration:1000,onComplete:()=>t.destroy()}); }
    else { Sfx.crunch(p.kind); this.burst(p.x,p.y,p.kind==='candy'?0xff70d0:0xfff2a0,12,160); this.burst(this.pl.x,this.pl.y,0x60ff60,8,90); const h = p.kind==='candy'?.3:1; this.pl.hp=Math.min(this.pl.max,this.pl.hp+this.pl.max*h); this.floatText(this.pl.x,this.pl.y-30,p.kind==='candy'?'+30%':'FULL HP',0x60ff60,18); } }
  enemyShot(x,y,ang,spd,dmg,tint,opts={}){ const s=this.pool.img(opts.tex||'eshot',x,y,13).setTint(tint); if(opts.scale) s.setScale(opts.scale);
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
          if(e.t>2.2 && d<520){ e.t=0; const col={pie:0xffffff,water:0x40a0ff,ball:0xff3030}[e.def.shot]; this.enemyShot(e.x,e.y,a,e.def.shot==='water'?330:250,e.dmg,col); } }
        else if(e.ai==='burst'){ const cyc=e.t%2; const m = cyc>1.5?4.2:.5; vx=Math.cos(a)*e.spd*m; vy=Math.sin(a)*e.spd*m; if(cyc>1.3&&cyc<1.5) e.spr.x+=Phaser.Math.Between(-2,2); }
        else if(e.ai==='erratic'){ if(!e.dir||e.t%0.7<dt) e.dir = a + Phaser.Math.FloatBetween(-1.6,1.6); vx=Math.cos(e.dir)*e.spd; vy=Math.sin(e.dir)*e.spd;
          e.phase+=dt; if(e.phase>2.8 && d<550){ e.phase=0; this.lob(e.x,e.y,p.x+Phaser.Math.Between(-90,90),p.y+Phaser.Math.Between(-90,90),e.dmg); } }
        e.x += (vx+e.kx)*dt; e.y += (vy+e.ky)*dt; e.kx*=.82; e.ky*=.82;
        this.clampArena(e, e.r);
        if(d<e.r+16) this.hurtPlayer(e.dmg);
        const rot = e.ai==='chase'&&e.id>'E10'||e.id==='E11'||e.id==='E12' ? 0 : Math.sin(this.time.now/150+e.x)*.15; // side-to-side
        if(Math.abs(vx)>4) e.spr.setFlipX(vx<0);                              // face movement direction
        const ph=this.time.now/130+e.x*.01, sq=(e.squash>0?(e.squash-=dt,.18):0), st=Math.sin(ph*2)*.06;   // walk squash & stretch + hit squash
        if(e.spawnT>0){ e.spawnT-=dt; e.spr.setScale(1-e.spawnT*3.6); } else e.spr.setScale(1+st+sq,1-st-sq);
        e.spr.setPosition(e.x, e.y + (e.id.length===3? -Math.abs(Math.sin(this.time.now/160+e.x))*6 : 0)).setRotation(rot); }
      if(e.flash>0){ e.flash-=dt; if(e.hasHit){} else if(e.boss) e.spr.setTint(0xff9a9a); else e.spr.setTintFill(0xffffff); } else if(!e.inv) e.spr.clearTint(); }   // hit sheets bake their own white/red flash
    // cheap separation
    const L=this.enemies; for(let i=0;i<L.length;i++){ const a=L[i]; if(a.dead||a.boss) continue; for(let j=i+1;j<L.length;j++){ const b=L[j]; if(b.dead||b.boss) continue;
      const dx=b.x-a.x, dy=b.y-a.y, m=dx*dx+dy*dy, rr=(a.r+b.r)*.9; if(m<rr*rr&&m>0.01){ const k=(rr-Math.sqrt(m))/2/Math.sqrt(m); a.x-=dx*k; a.y-=dy*k; b.x+=dx*k; b.y+=dy*k; } } }
    this.enemies = this.enemies.filter(e=>!e.dead||e.spr.active&&false); }
  lob(x,y,tx,ty,dmg,radius=60,delay=900,col=0xff6000){ const w=this.add.circle(tx,ty,radius,col,.18).setStrokeStyle(2,col,.8).setDepth(3);
    const b=this.add.image(x,y,'firedrop').setDepth(14); this.tweens.add({targets:b,x:tx,y:ty,duration:delay,onComplete:()=>{ b.destroy(); w.destroy();
      this.burst(tx,ty,col,16,radius*3); Sfx.noise(.15,.25,200); if(dist(tx,ty,this.pl.x,this.pl.y)<radius+12) this.hurtPlayer(dmg); }}); }
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
    for(const e of this.enemies){ if(!e.dead){ e.dead=true; this.burst(e.x,e.y,0xffffff,5,60,2); e.spr.destroy(); } } this.enemies=[];
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
  spawnBoss(id){ const B=BOSSES[id], mk=(tex,x,y,hp,name,r)=>{ const e={id,boss:true,name,base:tex,spr:this.bossSprite(tex,x,y),x,y,r,hp,max:hp,dmg:B.dmg,spd:B.spd*U_SPEED,t:0,st:'',kx:0,ky:0,flash:0};
      this.enemies.push(e); return e; };
    let list=[];
    if(id==='E5'){ const e=mk('truck',CX,CY-R+120,B.hp*bossMult('E5'),B.name,40); e.st='chase'; e.rot=Math.PI/2; list=[e]; }
    if(id==='E10'){ const e=mk('juggler',CX-R*.6,CY-300,B.hp*bossMult('E10'),B.name,24); e.st='rope'; e.rope=0; e.dir=1; e.inv=true; list=[e]; }
    if(id==='E15'){ const e=mk('petmaster',CX,CY-300,B.hp*bossMult('E15'),B.name,26); e.st='charge'; e.inv=false; e.ringG=this.add.graphics().setDepth(16); list=[e]; }
    if(id==='E20'){ const h=B.hp*bossMult('E20')*.6; const a=mk('cousin1',CX-250,CY-300,h,'Cousin 1: The Trickster',22), b=mk('cousin2',CX+250,CY-300,h,'Cousin 2: The Hunter',22);
      a.st='c1'; b.st='c2'; a.other=b; b.other=a; a.rage=0; b.rage=0; b.whip=0; list=[a,b]; }
    this.bossId=id; this.setBossBars(list); }
  bossSprite(tex,x,y){ const s=this.add.sprite(x,y,tex).setDepth(9); setAnim(this,s,tex,'walk'); return s; }
  // telegraph: <key>_windup (once) then a short red flash, played just before each boss attack
  windup(e){ if(!e.base||e.dead) return; Sfx.windup(); if(!hasAnim(this,e.base,'windup')||e.spr._busy) return; setAnim(this,e.spr,e.base,'windup');
    e.spr.once('animationcomplete',()=>{ if(e.dead) return; e.spr._busy=false; e.spr._st=null; setAnim(this,e.spr,e.base,'walk'); }); }   // windup ends on its peak pose, then back to the loop
  bossAttack(e,name='attack'){ if(hasAnim(this,e.base,name)) setAnim(this,e.spr,e.base,name); else if(name!=='attack'&&hasAnim(this,e.base,'attack')) setAnim(this,e.spr,e.base,'attack'); }
  updateBoss(e,dt){ if(e.spr&&!e.spr._busy) setAnim(this,e.spr,e.base,'walk'); const p=this.pl; e.t+=dt; const a=Math.atan2(p.y-e.y,p.x-e.x), d=dist(e.x,e.y,p.x,p.y);
    if(e.id==='E5'){ // Clown Truck
      if(e.st==='chase'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,2.5*dt); e.x+=Math.cos(e.rot)*e.spd*dt; e.y+=Math.sin(e.rot)*e.spd*dt;
        if(e.t>1.05&&!e.wu){ e.wu=1; this.windup(e); }
        if(e.t>1.4){ e.t=0; e.wu=0; this.bossAttack(e); for(let i=-1;i<=1;i++) this.enemyShot(e.x,e.y,a+i*.25,280,e.dmg*.7,0xff4040); }
        if(e.hp<e.max*.5){ e.st='aim'; e.t=0; this.windup(e); } }
      else if(e.st==='aim'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,3*dt); e.spr.x+=Phaser.Math.Between(-3,3); if(Math.random()<.4) this.burst(e.x-Math.cos(e.rot)*50,e.y-Math.sin(e.rot)*50,0x777777,1,60,2,600);
        if(e.t>1.1){ e.st='ram'; e.t=0; e.passed=false; } }
      else if(e.st==='ram'){ const v=e.spd*4.2; e.x+=Math.cos(e.rot)*v*dt; e.y+=Math.sin(e.rot)*v*dt;
        if(this.clampArena(e,e.r)||e.t>1.6){ e.st='turn'; e.t=0; e.vulnMul=1.5; } }
      else if(e.st==='turn'){ e.rot = Phaser.Math.Angle.RotateTo(e.rot,a,.9*dt); e.x+=Math.cos(e.rot)*e.spd*.3*dt; e.y+=Math.sin(e.rot)*e.spd*.3*dt;
        if(e.t>1.8){ e.st='aim'; e.t=0; e.vulnMul=1; this.windup(e); } }
      this.clampArena(e,e.r); e.spr.setPosition(e.x,e.y).setRotation(e.rot); if(d<e.r+18) this.hurtPlayer(e.st==='ram'?e.dmg*2:e.dmg); }
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
        if(d<e.r+16) this.hurtPlayer(e.dmg*.5); }
      e.spr.setPosition(e.x,e.y); }
    if(e.id==='E15'){ // The Pet Master
      const g=e.ringG; g.clear();
      if(e.st==='charge'){ e.inv=false; const k=Math.min(1,e.t/7); g.lineStyle(4+k*6,0xff6a00,.5+k*.5).strokeCircle(e.x,e.y-48,14+k*10);
        if(Math.random()<.3+k) this.burst(e.x+Phaser.Math.Between(-20,20),e.y-48,0xffa000,1,80);
        if(e.t>6.6&&!e.wu){ e.wu=1; this.windup(e); }
        if(e.t>7){ e.wu=0; this.bossAttack(e,'attack_summon'); const n=3+Math.floor(Math.random()*3); for(let i=0;i<n;i++){ const id=Phaser.Utils.Array.GetRandom(['E11','E12','E13','E14']); const s=this.spawnEnemy(id,e.x+Phaser.Math.Between(-60,60),e.y+Phaser.Math.Between(-60,60)); this.burst(s.x,s.y,0xff6000,8,100); }
          e.st='tp'; e.t=0; } }
      else if(e.st==='tp'){ e.inv=true; if(e.t>.8){ this.burst(e.x,e.y,0xff4000,20,180); const aa=Math.random()*Math.PI*2, rr=Math.random()*R*.7; e.x=CX+Math.cos(aa)*rr; e.y=CY+Math.sin(aa)*rr; this.burst(e.x,e.y,0xff4000,20,180); e.st='charge'; e.t=0; } }
      e.spr.setPosition(e.x,e.y).setAlpha(e.inv?.6:1); }
    if(e.id==='E20'){ // The Unknown Cousins
      const rage = e.rage>0; if(rage){ e.rage-=dt; e.spr.setTint(0xff5050); } else if(!e.flash) e.spr.clearTint();
      e.ringT=(e.ringT||0)+dt;
      if(e.st==='c1'){ e.blink=(e.blink||0)+dt; e.shot=(e.shot||0)+dt;
        if(e.blink>2.2){ e.blink=0; this.burst(e.x,e.y,0xffffff,12,150); const aa=Math.random()*Math.PI*2, rr=Phaser.Math.Between(200,420); e.x=p.x+Math.cos(aa)*rr; e.y=p.y+Math.sin(aa)*rr; this.clampArena(e,e.r); this.burst(e.x,e.y,0x80ffff,12,150); }
        if(e.shot>(rage?.25:.8)){ e.shot=0; this.bossAttack(e); this.enemyShot(e.x,e.y,a,320,e.dmg*.6,0x80ffff); }
        if(e.ringT>5.6&&!e.wu){ e.wu=1; this.windup(e); } if(e.ringT>6){ e.ringT=0; e.wu=0; this.enemyShot(e.x,e.y,a,200,0,0xffffff,{tex:'ring',r:16,life:6,ring:'stun',spin:1}); } }
      else { const sp = e.spd*(rage?2:1); e.whip=(e.whip||0)-dt*(rage?2:1);
        if(e.whipT>0){ e.whipT-=dt; this.fx.lineStyle(3,0xff3030,.6).lineBetween(e.x,e.y,e.x+Math.cos(e.wa)*260,e.y+Math.sin(e.wa)*260);
          if(e.whipT<=0){ this.fx.lineStyle(8,0x5a3a0a,1).lineBetween(e.x,e.y,e.x+Math.cos(e.wa)*260,e.y+Math.sin(e.wa)*260); Sfx.noise(.1,.4,1200);
            const pa=Math.atan2(p.y-e.y,p.x-e.x); if(d<280 && Math.abs(Phaser.Math.Angle.Wrap(pa-e.wa))<.35){ this.hurtPlayer(e.dmg); this.tweens.add({targets:p,x:e.x+Math.cos(pa)*60,y:e.y+Math.sin(pa)*60,duration:250}); } } }
        else { if(d>80){ e.x+=Math.cos(a)*sp*dt; e.y+=Math.sin(a)*sp*dt; } if(d<260&&e.whip<=0){ e.whip=2.2; e.whipT=.5; e.wa=a; this.windup(e); } }
        if(e.ringT>6.6&&!e.wu){ e.wu=1; this.windup(e); } if(e.ringT>7){ e.ringT=0; e.wu=0; this.enemyShot(e.x,e.y,a,200,0,0xff40ff,{tex:'ring',r:16,life:6,ring:'tele',spin:1}); }
        if(d<e.r+16) this.hurtPlayer(e.dmg*.5); }
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
    for(const x of this.enemies) if(!x.dead&&!x.boss){ x.dead=true; this.burst(x.x,x.y,0xffffff,5,60,2); x.spr.destroy(); }
    this.time.delayedCall(900,()=>{ this.setBossBars([]); this.endWave(); }); }
  // ---------------------------------------------------------------- main loop
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
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(Math.abs(p.vx)>8) p.face=Math.sign(p.vx);
      this.clampArena(p,18); p.ifr-=dt; const sp=Math.hypot(p.vx,p.vy), moving=sp>20;
      setAnim(this,this.player,this.pkey,moving?'walk':'idle');
      const walkAnim=hasAnim(this,this.pkey,moving?'walk':'idle'); const bob = (moving&&!walkAnim) ? Math.abs(Math.sin(time/90))*4 : 0;
      const br = walkAnim?0:Math.sin(time/(moving?90:400))*(moving?.05:.025);
      this.player.setPosition(p.x,p.y-bob).setFlipX(p.face<0).setScale(1-br,1+br).setRotation(moving&&!walkAnim?p.vx/p.ms*.08:0);
      if(p.stun>0) this.player.setTint(0x8888ff); }
    if(this.state==='wave'){ this.timeLeft-=dt; this.updateSpawning(dt); if(this.timeLeft<=0) this.endWave(); }
    this.updateWarnings(dt);
    if(!this.over){ this.updateWeapons(dt); this.updateEnemies(dt); }
    for(const b of this.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; b.spr.setPosition(b.x,b.y);
      for(const e of this.enemies){ if(e.dead||e.hidden) continue; if(dist(b.x,b.y,e.x,e.y)<e.r+5){ this.hit(e,b.s,Math.atan2(b.vy,b.vx),b.dmgMul); b.life=0; break; } }
      if(b.life<=0||dist(b.x,b.y,CX,CY)>R){ this.pool.release(b.spr); b.dead=true; } } this.bullets=this.bullets.filter(b=>!b.dead);
    for(const s of this.eshots){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; s.spr.setPosition(s.x,s.y); if(s.spin) s.spr.rotation+=dt*6;
      if(s.ring && dist(s.x,s.y,CX,CY)>R-20){ const nx=(s.x-CX)/R, ny=(s.y-CY)/R, dot=s.vx*nx+s.vy*ny; s.vx-=2*dot*nx; s.vy-=2*dot*ny; } // rings roll & bounce
      if(!this.over && dist(s.x,s.y,p.x,p.y)<s.r+14){ if(s.ring==='stun'){ p.stun=1.3; } else if(s.ring==='tele'){ this.burst(p.x,p.y,0xff40ff,14,150); const aa=Math.random()*Math.PI*2, rr=Math.random()*R*.8; p.x=CX+Math.cos(aa)*rr; p.y=CY+Math.sin(aa)*rr; }
        else this.hurtPlayer(s.dmg); s.life=0; }
      if(s.life<=0||(!s.ring&&dist(s.x,s.y,CX,CY)>R)){ if(s.pooled) this.pool.release(s.spr); else s.spr.destroy(); s.dead=true; } } this.eshots=this.eshots.filter(s=>!s.dead);
    if(!this.over) for(const k of this.pickups){ if(k.dead) continue; const d=dist(k.x,k.y,p.x,p.y);
      if(d<110){ const a=Math.atan2(p.y-k.y,p.x-k.x); k.x+=Math.cos(a)*420*dt; k.y+=Math.sin(a)*420*dt; k.spr.setPosition(k.x,k.y); } if(d<24) this.collect(k); }
    this.pickups=this.pickups.filter(k=>!k.dead);
    this.updateHUD(); }
  // debug / test hooks
  debugJump(w){ this.enemies.forEach(e=>{ if(e.ringG) e.ringG.destroy(); e.spr.destroy(); }); this.enemies=[]; this.setBossBars([]); this.ropes.clear(); this.run.wave=w-1; this.nextWave(); }
}
