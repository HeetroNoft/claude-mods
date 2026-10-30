// Playing with the Claudes: pick one up and put it down somewhere, startle one with a fast cursor,
// and hand out treats from the item bar (drag an item onto a Claude; I hides or shows the bar).
'use strict';

/* ---------- treats: each item is a little story, told in phases over u = 0..1 ---------- */
// state(ch, u) says, for this frame: the pose, the arm frame (1 = raised), what is in hand (a props.js
// sprite), and the extras drawTreat adds. events(ch, u, t) fires the one-off moments (a bite, the lid).
const SIPS=[[.12,.3],[.42,.58],[.7,.86]],BITES=[.18,.4,.62,.84];
const TREATS={
  // three sips, the coffee going down each time, steam while the mug rests; empty mug, happy sigh
  coffee:{ms:4200,snd:520,mood:'happy',
    state(ch,u){const up=SIPS.some(([a,b])=>u>a&&u<b),done=SIPS.filter(([,b])=>u>=b).length;
      return {pose:'sip',frame:up?1:0,held:{kind:'mug',fill:1-done/3},steam:!up&&done<3,mood:up?'sleep':'happy'};},
    end(ch){emote(ch,'heart');}},
  // four bites at the mouth with crumbs, chewing in between, until nothing is left
  cookie:{ms:3800,snd:640,mood:'happy',
    state(ch,u){const k=BITES.filter(b=>u>=b).length,up=BITES.some(b=>u>b-.08&&u<b+.03);
      return {pose:'eat',frame:up?1:(Math.floor(u*20)%2),held:k<4?{kind:'cookie',bites:k}:null};},
    events(ch,u,t){const k=BITES.filter(b=>u>=b).length;if(k>(t.k|0)){t.k=k;const y=(ch.bodyTop||ch.y-15)+5;
      for(let i=0;i<4;i++)confetti.push({x:ch.x-9+Math.random()*3,y,vx:(Math.random()-.5)*16,vy:-6-Math.random()*8,c:i%2?'#D49A5A':'#5A3418',life:.7,w:1});blip(300+k*40,.03,'triangle');}},
    end(ch){emote(ch,'note');}},
  // a few dribbles on the floor, then juggling, then a catch over the head
  ball:{ms:4600,snd:760,mood:'happy',
    state(ch,u){if(u<.36)return {pose:'pet',dribble:true};if(u<.88)return {pose:'juggle',juggle:true};return {pose:'catch',caught:true};},
    end(ch){emote(ch,'star');}},
  // held in front, lifted for a long sniff (eyes closed, hearts), then tucked on the head for a while
  flower:{ms:3800,snd:880,mood:'love',
    state(ch,u){const sniff=u>.28&&u<.72;return {pose:'hold',held:{kind:'flower'},lift:sniff?4:0,mood:sniff?'sleep':'love',hearts:sniff};},
    end(ch,tp){ch.flowerUntil=tp+90000;}},
  // a curious shake, the lid pops off with confetti, and a star rises from the open box
  gift:{ms:3800,snd:990,mood:'happy',
    state(ch,u){if(u<.36)return {pose:'hold',held:{kind:'gift',dx:Math.round(Math.sin(u*90))},mood:'surprised'};
      return {pose:u<.7?'cheer':'hold',held:u<.7?null:{kind:'gift',open:true},star:u<.7};},
    events(ch,u,t){if(u>=.36&&!t.opened){t.opened=true;const x=ch.x,y=(ch.bodyTop||ch.y-15)+4;
      for(let i=0;i<34;i++)confetti.push({x,y,vx:(Math.random()-.5)*60,vy:-25-Math.random()*40,c:CONF[i%CONF.length],life:1.6+Math.random(),w:Math.random()<.4?2:1});
      leaves.push({x:x-2,y:y-2,vx:-18,vy:-30,life:1.2,p:0,w:3,c:'#E58A6A'});chime(.7);}},
    end(ch){emote(ch,'star');}},
};
function giveItem(ch,kind){
  const tp=performance.now(),T=TREATS[kind];
  ch.treat={kind,t0:tp,until:tp+T.ms};
  setMood(ch,T.mood,T.ms);ch.sqv+=16;blip(T.snd,.06,'triangle');
}
// This frame's treat state (null when none), firing its events and its ending once.
function treatNow(ch,tp){
  const t=ch.treat;if(!t)return null;const T=TREATS[t.kind];
  if(tp>=t.until){ch.treat=null;if(T.end)T.end(ch,tp);return null;}
  if(t.frameAt===tp)return t.st;
  const u=(tp-t.t0)/T.ms;if(T.events)T.events(ch,u,t);
  t.frameAt=tp;t.st=T.state(ch,u);return t.st;
}
// What the treat adds around the Claude: steam, a bouncing ball, hearts, a rising star.
function drawTreat(g,ch,tp,st){
  const x=Math.round(ch.x),top=Math.round(ch.bodyTop!=null?ch.bodyTop:ch.y-15),dir=dirOf(ch);
  if(st.steam&&Math.floor(tp/240)%2)R(g,x-11,top+1-Math.floor((tp/140)%4),1,1,'rgba(255,255,255,.75)');
  if(st.dribble){const b=Math.abs(Math.sin((tp-ch.treat.t0)/170));drawProp(g,'ball',x+dir*10-2,Math.round(ch.y-4-b*8),{});}
  if(st.juggle)drawJuggle(g,ch,tp,ch.treat.t0,'#FF6B6B');
  if(st.caught)drawProp(g,'ball',x-2,top-6,{});
  if(st.hearts&&Math.floor(tp/600)!==Math.floor((tp-17)/600))emote(ch,'heart');
  if(st.star){drawStar(g,x,Math.round(top-4-((tp/40)%10)),Math.floor(tp/150)%2?'#FFD84A':'#FFFFFF');}
}

/* ---------- picking a Claude up ---------- */
let grab=null,suppressClickUntil=0;
stage.addEventListener('pointerdown',e=>{
  if(overUi(e)||e.button>0)return;
  const p=toWorld(e),c=charAt(p.x,p.y);if(!c)return;
  grab={ch:c,sx:p.x,sy:p.y,on:false,shake:0,lx:p.x,id:e.pointerId};
});
stage.addEventListener('pointermove',e=>{
  if(!grab)return;
  const p=toWorld(e),tp=performance.now();
  if(!grab.on&&Math.hypot(p.x-grab.sx,p.y-grab.sy)>3){grab.on=true;pickUp(grab.ch,p,tp);try{stage.setPointerCapture(grab.id);}catch(err){}}
  if(grab.on){grab.ch.held={x:Math.max(6,Math.min(314,p.x)),y:Math.max(60,Math.min(160,p.y))};grab.shake+=Math.abs(p.x-grab.lx);grab.ch.face=p.x>grab.lx?1:p.x<grab.lx?-1:grab.ch.face;}
  grab.lx=p.x;
});
const endGrab=e=>{if(!grab)return;if(grab.on){putDown(grab.ch,grab.shake,performance.now());suppressClickUntil=performance.now()+60;}grab=null;};
stage.addEventListener('pointerup',endGrab);
stage.addEventListener('pointercancel',endGrab);

function pickUp(ch,p,tp){
  releaseIdle(ch);
  ch.path=[];ch.seated=false;ch.tgt=null;ch.resumeAt=0;
  ch.held={x:p.x,y:p.y};
  setMood(ch,'surprised',500);emote(ch,'excl');blip(620,.05,'triangle');
}
// Where a Claude lands: on the floor, never inside the desk row (it lands just in front of it).
function landingSpot(x,y){
  x=Math.max(8,Math.min(312,x));y=Math.max(92,Math.min(178,y));
  if(y>90&&y<122)y=y<104?92:124;
  return {x,y};
}
function putDown(ch,shake,tp){
  const s=landingSpot(ch.x,ch.held.y+16);
  ch.held=null;ch.x=s.x;ch.y=s.y;ch.arrived=true;ch.sqv-=26;
  for(let i=0;i<5;i++)confetti.push({x:ch.x+(i-2)*3,y:ch.y-1,vx:(i-2)*10,vy:-10,c:'rgba(255,255,255,.5)',life:.4,w:1});
  const other=[...chars.values()].find(o=>o!==ch&&!o.hidden&&Math.abs(o.x-ch.x)<14&&Math.abs(o.y-ch.y)<10);
  if(shake>260){setMood(ch,'dizzy',2000);blip(300,.14,'triangle');}
  else if(other){setMood(ch,'love',1600);setMood(other,'love',1600);emote(ch,'heart');emote(other,'heart');other.sqv+=14;purr();}
  else{setMood(ch,'happy',900);blip(480,.05,'triangle');}
  ch.resumeAt=tp+(shake>260?2200:1100);
}

/* ---------- a fast cursor startles a Claude (each one at most every 5 s) ---------- */
let lastMove={x:0,y:0,t:0};
stage.addEventListener('pointermove',e=>{
  const p=toWorld(e),tp=performance.now(),dt=Math.max(1,tp-lastMove.t),v=Math.hypot(p.x-lastMove.x,p.y-lastMove.y)/dt*1000;
  lastMove={x:p.x,y:p.y,t:tp};ptr.movedAt=tp;
  if(grab&&grab.on||v<260)return;
  chars.forEach(c=>{if(c.hidden||c.held||tp<(c.nextStartle||0))return;const ht=c.headTop!=null?c.headTop:c.y-15;
    if(Math.hypot(p.x-c.x,p.y-(ht+7))<16){c.nextStartle=tp+5000;setMood(c,'surprised',700);c.sqv-=18;c.jumpUntil=Math.max(c.jumpUntil,tp+280);emote(c,'excl');}});
});

/* ---------- the item bar ---------- */
const ITEM_ART={
  coffee:{pal:{w:'#FFFFFF',b:'#6B3A22',s:'#C9D3E3'},rows:['..s.s...','.s.s....','wwwwww..','wbbbbww.','wbbbbw.w','wbbbbww.','.wwww...','........']},
  cookie:{pal:{c:'#D49A5A',k:'#5A3418'},rows:['..cccc..','.cckccc.','cccccckc','ckcccccc','cccckccc','cckccccc','.ccccck.','..cccc..']},
  ball:{pal:{r:'#FF6B6B',h:'#FFB0A8',w:'#FFFFFF'},rows:['..rrrr..','.rrhrrr.','rrhhrrrr','rrrrrrrr','wwwwwwww','rrrrrrrr','.rrrrrr.','..rrrr..']},
  flower:{pal:{p:'#FF8FB8',y:'#FFD84A',g:'#3E9A4A',l:'#6CC070'},rows:['..ppp...','.ppypp..','..ppp...','...g....','.l.g....','..lg.l..','...gl...','...g....']},
  gift:{pal:{o:'#D97557',w:'#FFFFFF'},rows:['.w...w..','..w.w...','ooowooo.','ooowooo.','wwwwwww.','ooowooo.','ooowooo.','ooowooo.']},
};
const ITEM_NAMES={coffee:'Coffee',cookie:'Cookie',ball:'Ball',flower:'Flower',gift:'Gift'};
function itemCanvas(kind){
  const A=ITEM_ART[kind],c=document.createElement('canvas');c.width=8;c.height=8;const g=c.getContext('2d');
  A.rows.forEach((r,j)=>{for(let i=0;i<8;i++){const col=A.pal[r[i]];if(col){g.fillStyle=col;g.fillRect(i,j,1,1);}}});
  return c;
}
const bar=document.getElementById('items'),ibtn=document.getElementById('itm'),ghost=document.getElementById('ghost');
Object.keys(ITEM_ART).forEach(k=>{
  const b=document.createElement('button');b.type='button';b.dataset.k=k;b.title=ITEM_NAMES[k]+' — drag it onto a Claude';b.setAttribute('aria-label',ITEM_NAMES[k]);
  b.appendChild(itemCanvas(k));bar.appendChild(b);
});
function showBar(on){bar.classList.toggle('hide',!on);ibtn.classList.toggle('on',on);try{localStorage.setItem('office.items',on?'1':'0');}catch(err){}}
let barOn=true;try{barOn=localStorage.getItem('office.items')!=='0';}catch(err){}
showBar(barOn);
ibtn.addEventListener('click',()=>{barOn=!barOn;showBar(barOn);});
window.addEventListener('keydown',e=>{if((e.key==='i'||e.key==='I')&&!e.ctrlKey&&!e.metaKey){barOn=!barOn;showBar(barOn);}});

// Dragging an item: a ghost follows the pointer; the Claude under it lights up; letting go gives it.
let carry=null;
function claudeNear(p){let best=null,bd=14;chars.forEach(c=>{if(c.hidden||c.held)return;const top=c.headTop!=null?c.headTop:c.y-17,d=Math.hypot(p.x-c.x,p.y-(top+c.y)/2);if(d<bd){bd=d;best=c;}});return best;}
function overStage(e){const r=stage.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
bar.addEventListener('pointerdown',e=>{
  const b=e.target.closest('button[data-k]');if(!b)return;e.preventDefault();
  carry={kind:b.dataset.k,btn:b,sx:e.clientX,sy:e.clientY,moved:false};
  ghost.innerHTML='';ghost.appendChild(itemCanvas(carry.kind));
  try{b.setPointerCapture(e.pointerId);}catch(err){}
});
bar.addEventListener('pointermove',e=>{
  if(!carry)return;
  if(!carry.moved&&Math.hypot(e.clientX-carry.sx,e.clientY-carry.sy)>4){carry.moved=true;ghost.classList.add('on');}
  if(!carry.moved)return;
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  const p=toWorld(e),c=overStage(e)?claudeNear(p):null;
  if(c!==hoverCh&&c)c.sqv+=8;hoverCh=c;ptr.x=p.x;ptr.y=p.y;ptr.in=overStage(e);
});
const dropItem=e=>{
  if(!carry)return;const k=carry.kind,moved=carry.moved;carry=null;ghost.classList.remove('on');
  if(!moved){
    // a plain click gives the item to the Claude whose card is open, or shows how to use it
    const c=cardId&&chars.get(cardId);if(c&&!c.hidden){giveItem(c,k);return;}
    const b=bar.querySelector(`button[data-k="${k}"]`);b.classList.remove('nudge');void b.offsetWidth;b.classList.add('nudge');return;
  }
  if(!overStage(e))return;
  const p=toWorld(e),c=claudeNear(p);
  if(c)giveItem(c,k);else if(k==='ball'&&p.y>86)dropBallForCat(p.x,p.y); // a ball on the floor is the cat's
  else{emoteAt(Math.round(p.x)-1,Math.round(p.y)-6,'quest');blip(260,.05,'triangle');}
};
bar.addEventListener('pointerup',dropItem);
bar.addEventListener('pointercancel',()=>{carry=null;ghost.classList.remove('on');});
