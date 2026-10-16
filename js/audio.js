// Tiny WebAudio synth: SFX + a sinister carnival loop (no audio files needed)
const Sfx = {
  ctx:null, master:null, musicGain:null, sfxGain:null, musicTimer:null, step:0,
  init(){ if(this.ctx) return; const AC = window.AudioContext||window.webkitAudioContext; if(!AC) return;
    this.ctx = new AC(); this.sfxGain = this.ctx.createGain(); this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.ctx.destination); this.musicGain.connect(this.ctx.destination); this.apply(); },
  apply(){ if(!this.ctx) return; const s = Save.d.settings; this.sfxGain.gain.value = s.sfx*0.5; this.musicGain.gain.value = s.music*0.25; },
  tone(f, dur, type='square', vol=.3, slide=0, dest){ if(!this.ctx) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide), t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g); g.connect(dest||this.sfxGain); o.start(t); o.stop(t+dur+.02); },
  noise(dur, vol=.3, hp=800){ if(!this.ctx) return; const t=this.ctx.currentTime, n=this.ctx.sampleRate*dur;
    const b=this.ctx.createBuffer(1,n,this.ctx.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    const s=this.ctx.createBufferSource(); s.buffer=b; const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); },
  click(){ this.tone(900,.06,'square',.15); },
  pop(){ this.noise(.08,.4,2000); this.tone(1400,.08,'sine',.2,.4); },
  kill(){ this.noise(.12,.35,300); this.tone(180,.12,'sawtooth',.2,.3); },
  crunch(){ for(let i=0;i<3;i++) setTimeout(()=>this.noise(.04,.25,3000), i*60); },
  hurt(){ this.tone(120,.15,'sawtooth',.3,.5); },
  shoot(){ this.tone(600,.05,'square',.05,.5); },
  swing(){ this.noise(.06,.08,1500); },
  boss(){ this.tone(70,1.2,'sawtooth',.4,1.5); this.tone(105,1.2,'sawtooth',.3,1.5); },
  win(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.25,'triangle',.3),i*140)); },
  lose(){ [392,330,262,196].forEach((f,i)=>setTimeout(()=>this.tone(f,.35,'sawtooth',.25),i*200)); },
  startMusic(){ if(!this.ctx||this.musicTimer) return;
    // Waltz in E minor: oom-pah-pah with a creepy calliope melody
    const bass=[82.4,82.4,110,110,98,98,123.5,123.5], mel=[659,622,659,494,587,523,440,0,523,494,523,392,494,440,370,0];
    this.musicTimer = setInterval(()=>{ const s=this.step++, beat=s%3, bar=Math.floor(s/3);
      if(beat===0) this.tone(bass[bar%8],.35,'triangle',.5,0,this.musicGain);
      else this.tone(bass[bar%8]*3,.12,'square',.12,0,this.musicGain);
      const m = mel[(Math.floor(s/1.5))%16]; if(s%3!==2 && m) this.tone(m,.22,'sine',.18,0,this.musicGain);
    }, 210); },
  stopMusic(){ clearInterval(this.musicTimer); this.musicTimer=null; }
};

// ---- Manifest-driven audio (assets/audio/manifest.json). Generated synth sounds above remain the fallback.
Object.assign(Sfx, {
  game:null, man:{}, groups:{}, cur:null, curKey:null, last:{}, synthMusic:false,
  setup(game, list){ this.game=game; for(const e of list){ this.man[e.key]=e; const g=e.key.replace(/_\d+$/,''); (this.groups[g]=this.groups[g]||[]).push(e.key); } },
  loaded(k){ return this.game && this.game.cache.audio.exists(k); },
  // play a random loaded variant of a sound group; returns false if none loaded (caller falls back to synth)
  sfx(group, opts={}){ if(!this.game) return false; const keys=(this.groups[group]||[]).filter(k=>this.loaded(k)); if(!keys.length) return false;
    const now=performance.now(), gap=opts.gap||0; if(gap && now-(this.last[group]||0)<gap) return true; this.last[group]=now;
    if(this.game.sound.locked) return true; const k=keys[Math.floor(Math.random()*keys.length)];
    try{ this.game.sound.play(k,{volume:(this.man[k].volume||.5)*Save.d.settings.sfx, detune:opts.detune===false?0:(Math.random()*200-100)}); }catch(e){} return true; },
  music(key){ if(!this.game) return; if(this.curKey===key) return; this.curKey=key;
    if(!this.loaded(key)){ if(!this.musicTimer){ this.synthMusic=true; this._startSynth(); } return; }
    if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; }
    const go=()=>{ const target=(this.man[key].volume||.45)*Save.d.settings.music, next=this.game.sound.add(key,{loop:true,volume:0}); next.play();
      this._fade(next,0,target,1200); if(this.cur){ const old=this.cur; this._fade(old,old.volume,0,1200,()=>old.destroy()); } this.cur=next; };
    if(this.game.sound.locked) this.game.sound.once('unlocked',()=>{ if(this.curKey===key) go(); }); else go(); },
  stopMusic(){ this.curKey=null; if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; } if(this.cur){ const old=this.cur; this.cur=null; this._fade(old,old.volume,0,600,()=>old.destroy()); } },
  stinger(key, synth){ if(this.loaded(key) && this.game && !this.game.sound.locked){ this.game.sound.play(key,{volume:(this.man[key].volume||.6)*Save.d.settings.music}); } else synth(); },
  _fade(snd,a,b,ms,done){ const t0=performance.now(); const id=setInterval(()=>{ const k=Math.min(1,(performance.now()-t0)/ms); try{ snd.setVolume(a+(b-a)*k); }catch(e){} if(k>=1){ clearInterval(id); done&&done(); } },40); },
  apply(){ if(this.ctx){ const s=Save.d.settings; this.sfxGain.gain.value=s.sfx*0.5; this.musicGain.gain.value=s.music*0.25; }
    if(this.cur&&this.curKey) try{ this.cur.setVolume((this.man[this.curKey].volume||.45)*Save.d.settings.music); }catch(e){} },
});
// keep the synth loop available as fallback
Sfx._startSynth = Sfx.startMusic;
Sfx.startMusic = function(){ this.music('music_menu_loop'); };
// remap legacy calls to manifest keys (synth fallback when missing)
(()=>{ const S={click:Sfx.click,pop:Sfx.pop,kill:Sfx.kill,crunch:Sfx.crunch,hurt:Sfx.hurt,shoot:Sfx.shoot,swing:Sfx.swing,boss:Sfx.boss,win:Sfx.win,lose:Sfx.lose};
  Sfx.click=function(){ this.sfx('sfx_ui_click',{detune:false})||S.click.call(this); };
  Sfx.hover=function(){ this.sfx('sfx_ui_hover',{detune:false,gap:60}); };
  Sfx.pop=function(){ this.sfx('sfx_balloon_pop',{gap:30})||S.pop.call(this); };
  Sfx.kill=function(){ this.sfx('sfx_enemy_death_clown',{gap:40})||S.kill.call(this); };
  Sfx.hit=function(melee){ this.sfx(melee?'sfx_hit_blunt':'sfx_hit_flesh',{gap:70}); };
  Sfx.crunch=function(kind){ this.sfx(kind==='popcorn'?'sfx_pickup_popcorn':'sfx_pickup_candy')||S.crunch.call(this); };
  Sfx.coin=function(){ this.sfx('sfx_pickup_coin'); };
  Sfx.hurt=function(){ this.sfx('sfx_player_hit',{gap:100})||S.hurt.call(this); };
  Sfx.playerDeath=function(){ this.sfx('sfx_player_death',{detune:false})||S.lose.call(this); };
  const fire={Handgun:'sfx_weapon_handgun_fire',Rifle:'sfx_weapon_rifle_fire',Shotgun:'sfx_weapon_shotgun_fire'}, sw={Dagger:'sfx_weapon_dagger_throw',Bat:'sfx_weapon_bat_swing',Sword:'sfx_weapon_sword_swing'};
  Sfx.shoot=function(t){ this.sfx(fire[t]||'sfx_weapon_handgun_fire',{gap:55})||S.shoot.call(this); };
  Sfx.swing=function(t){ this.sfx(sw[t]||'sfx_weapon_sword_swing',{gap:55})||S.swing.call(this); };
  Sfx.boss=function(){ this.sfx('sfx_boss_windup_warning',{detune:false})||S.boss.call(this); };
  Sfx.windup=function(){ this.sfx('sfx_boss_windup_warning',{detune:false,gap:600}); };
  Sfx.bossDeath=function(){ this.sfx('sfx_boss_death',{detune:false})||S.kill.call(this); };
  Sfx.horn=function(){ this.sfx('sfx_wave_start_horn',{detune:false}); };
  Sfx.buy=function(){ this.sfx('sfx_shop_buy',{detune:false})||S.pop.call(this); };
  Sfx.deny=function(){ this.sfx('sfx_shop_deny',{detune:false}); };
  Sfx.ticket=function(){ this.sfx('sfx_golden_ticket',{detune:false})||S.win.call(this); };
  Sfx.win=function(){ this.stopMusic(); this.stinger('music_win_stinger',()=>S.win.call(this)); };
  Sfx.lose=function(){ this.stopMusic(); this.stinger('music_lose_stinger',()=>S.lose.call(this)); };
})();
