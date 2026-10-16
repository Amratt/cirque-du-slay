const config = { type:Phaser.AUTO, parent:'game', width:W, height:H, backgroundColor:'#0b0507',
  scale:{mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH},
  input:{activePointers:3}, render:{preserveDrawingBuffer: new URLSearchParams(location.search).has('capture')},   // ?capture: canvas readable at any time (video capture)
  scene:[Boot,Menu,CharSelect,Upgrade,Settings,Game,Shop,End,Showcase,Story,Codex] };
window.addEventListener('load',()=>{ window.GAME = new Phaser.Game(config);
  try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape-primary').catch(()=>{}); }catch(e){} });
