// The office cat: one in every room, dressed for it (TH.catLook, see CAT_LOOKS), with a life of its own.
// It rests (walks to a spot, sits or sleeps: in the sun by day, by a desk lamp at night), and every
// two or three minutes it gets up to something (CAT_JOBS): hops on a desk to wake a sleeper or bother
// a worker, lies on a keyboard, rubs a colleague's legs, begs at the coffee counter, knocks a thing
// over (a Claude on a break puts it back, see tidyTick). It also greets whoever comes in or leaves,
// leaps after paper planes, and plays with a ball dropped on the floor from the item bar. There is one
// cat in the whole office: now and then it leaves by the door for another floor, and it comes in by the
// door too. Off the floor on show it is `away`, parked outside the room, and only keeps time.
'use strict';
const CAT_SPOTS=[{x:190,y:156},{x:170,y:150},{x:248,y:150},{x:130,y:172},{x:60,y:150},{x:212,y:172},{x:236,y:132}];
const CAT_REST=[120000,180000]; // ms between two of its doings ("rarely")
const CAT_TRIP=[120000,240000]; // ms between two changes of floor
let fallen=null,catBall=null,bgHide=[],deskOff=false;

/* ---------- looks: one per room ---------- */
// fur/hi/eye colours, marks per pose (sit, walk, sleep: [dx,dy,w,h,colour]), tail colour, a bobtail,
// and acc(p, pose, tp) for what it wears. Cosy keeps the original black cat (no catLook).
const NECK={sit:[1,-5,3,1],walk:[3,-4,2,1],sleep:[1,-3,2,1]};
function collar(col,tag){return (p,pose)=>{const n=NECK[pose];if(!n)return;p(n[0],n[1],n[2],n[3],col);if(tag&&pose!=='sleep')p(n[0]+1,n[1]+1,1,1,tag);};}
const CAT_LOOKS={
  black:{fur:'#2B2A33',hi:'#3D3B48',eye:'#F2D04A'},
  calico:{fur:'#F4EEE4',hi:'#FFFFFF',eye:'#6BBF59',tail:'#2B2A33',
    marks:{sit:[[-3,-4,2,2,'#E0883A'],[0,-3,2,1,'#2B2A33'],[1,-8,2,1,'#E0883A'],[1,-9,1,1,'#E0883A'],[4,-9,1,1,'#2B2A33'],[4,-8,1,1,'#2B2A33']],
      walk:[[-4,-5,3,2,'#E0883A'],[0,-5,2,1,'#2B2A33'],[3,-7,1,1,'#E0883A'],[3,-8,1,1,'#E0883A'],[5,-8,1,1,'#2B2A33']],
      sleep:[[-4,-3,3,2,'#E0883A'],[0,-4,2,1,'#2B2A33'],[1,-5,1,1,'#E0883A'],[1,-6,1,1,'#E0883A'],[3,-6,1,1,'#2B2A33']]}},
  claude:{fur:'#E6D3B5',hi:'#F4EADB',eye:'#5A7A4A',acc:collar('#D97757','#FFFDF8')},
  mike:{fur:'#F6F0E4',hi:'#FFFFFF',eye:'#C9A227',bob:true,wave:true,
    marks:{sit:[[0,-4,3,2,'#D9823A'],[-3,-2,2,1,'#2E2A26'],[1,-9,1,1,'#2E2A26'],[1,-8,1,1,'#2E2A26'],[4,-9,1,1,'#D9823A'],[4,-8,1,1,'#D9823A']],
      walk:[[-1,-5,3,2,'#D9823A'],[-4,-5,2,1,'#2E2A26'],[3,-8,1,1,'#2E2A26'],[5,-8,1,1,'#D9823A'],[5,-7,1,1,'#D9823A']],
      sleep:[[-1,-3,3,2,'#D9823A'],[-4,-3,2,1,'#2E2A26'],[1,-6,1,1,'#2E2A26'],[3,-6,1,1,'#D9823A']]},
    acc:collar('#B03A2E','#E0B04A')},
  astro:{fur:'#9AA3B2',hi:'#B8C0CC',eye:'#FFD84A',float:true,
    marks:{sit:[[-3,-4,6,4,'#FF8A3D'],[-2,-5,4,1,'#FFB07A'],[-4,-2,1,2,'#FF8A3D']],walk:[[-4,-5,8,3,'#FF8A3D'],[-4,-5,8,1,'#FFB07A']],sleep:[[-4,-3,6,3,'#FF8A3D'],[-3,-4,4,1,'#FFB07A']]},
    acc(p,pose,tp){const H={sit:[0,-10,6,5],walk:[2,-9,5,5]}[pose];
      if(H){p(H[0],H[1],H[2],H[3],'rgba(200,232,255,.35)');p(H[0],H[1],H[2],1,'rgba(220,240,255,.6)');p(H[0]+H[2]-2,H[1]+1,1,1,'#FFFFFF');}
      else if(pose==='sleep'){p(5,-3,3,3,'rgba(200,232,255,.4)');p(6,-3,1,1,'#FFFFFF');}}}, // asleep, the helmet lies beside it
  siamese:{fur:'#EFE3CC',hi:'#FAF3E6',eye:'#5AA0E6',tail:'#5A4030',legs:'#5A4030',
    marks:{sit:[[1,-9,1,1,'#5A4030'],[4,-9,1,1,'#5A4030'],[3,-7,1,1,'#5A4030'],[2,-6,3,1,'#5A4030'],[-4,-2,1,2,'#5A4030']],
      walk:[[3,-8,1,1,'#5A4030'],[5,-8,1,1,'#5A4030'],[5,-6,1,2,'#5A4030']],sleep:[[1,-6,1,1,'#5A4030'],[3,-6,1,1,'#5A4030'],[3,-5,1,1,'#5A4030']]},
    acc(p,pose){if(pose==='sit'){p(3,-5,1,2,'#2B5A9E');p(3,-5,1,1,'#3E70B8');}else if(pose==='walk')p(4,-4,1,1,'#2B5A9E');else if(pose==='sleep')p(2,-3,1,1,'#2B5A9E');}},
  white:{fur:'#F7F7F2',hi:'#FFFFFF',eye:'#7FB069',
    acc(p,pose){const n=NECK[pose];if(!n)return;p(n[0],n[1],n[2],1,'#2F5D4E');p(n[0]+1,n[1],1,1,'#1E3A33');}},
  holo:{fur:'#2DE2E6',hi:'#9FF6F8',eye:'#FFFFFF',holo:true},
};
const lookOf=()=>CAT_LOOKS[TH.catLook]||CAT_LOOKS.black;

/* ---------- moving about ---------- */
function newCat(tp){return {x:150,y:156,z:0,face:1,state:'sleep',until:tp+9000,hop:0,hopH:4,hopDur:420,pet:0,path:[],speed:16,air:null,job:null,
  nextJob:tp+40000+Math.random()*40000,doorCD:0,planeCD:0,seen:new Map(),floor:0,away:false,nextTrip:tp+CAT_TRIP[0]};}
const clampX=x=>Math.max(6,Math.min(314,x)),clampY=y=>Math.max(88,Math.min(179,y));
// On the floor it goes round the furniture like everyone: straight when the way is clear, else by the
// corridor; a theme's table is walked around as well.
function catRoute(a,t){return avoidFurniture(a,clearFloor(a,t)?[t]:[{x:a.x,y:WALK_Y},{x:t.x,y:WALK_Y},t]);}
function catGo(x,y,run){
  const t={x:clampX(x),y:cat.z>0?y:clampY(y)};
  cat.path=cat.z>0?[t]:catRoute({x:cat.x,y:cat.y},t);cat.speed=run?34:16;
}
// a leap to (x, y) at height z, over dur ms, arcing h px above the straight line
// it crouches first (CAT_CROUCH ms) and lands in a short crouch too (CAT_LAND ms)
const CAT_CROUCH=110,CAT_LAND=170,CAT_ACCEL=110;
function catJump(x,y,z,dur,h){cat.path=[];cat.air={x0:cat.x,y0:cat.y,z0:cat.z,x1:x,y1:y,z1:z,t0:performance.now()+CAT_CROUCH,dur:dur||420,h:h==null?6:h};
  if(Math.abs(x-cat.x)>.5)cat.face=x>cat.x?1:-1;}
function stepCat(dt,tp){
  if(cat.air){const A=cat.air,u=Math.max(0,Math.min(1,(tp-A.t0)/A.dur));
    cat.x=A.x0+(A.x1-A.x0)*u;cat.y=A.y0+(A.y1-A.y0)*u;cat.z=A.z0+(A.z1-A.z0)*u+Math.sin(Math.PI*u)*A.h;
    if(u>=1){cat.air=null;cat.z=A.z1;cat.land=tp+CAT_LAND;}return;}
  if(!cat.path.length){cat.v=0;return;}
  if(tp<(cat.land||0))return;
  let left=0,from=cat;cat.path.forEach(q=>{left+=Math.hypot(q.x-from.x,q.y-from.y);from=q;});
  cat.v=Math.min(cat.speed,(cat.v||0)+CAT_ACCEL*dt,Math.max(6,Math.sqrt(2*CAT_ACCEL*left)));
  const p=cat.path[0],dx=p.x-cat.x,dy=p.y-cat.y,d=Math.hypot(dx,dy),s=cat.v*dt;
  cat.stride=(cat.stride||0)+s;
  if(Math.abs(dx)>.6)cat.face=dx>0?1:-1;
  if(d<=s){cat.x=p.x;cat.y=p.y;cat.path.shift();}else{cat.x+=dx/d*s;cat.y+=dy/d*s;}
}
const catMoving=()=>cat.path.length>0||!!cat.air;
function meowSound(){if(lookOf().float){blip(990,.08,'sine');setTimeout(()=>blip(740,.12,'sine'),90);return;}blip(880,.12,'sine');setTimeout(()=>blip(660,.16,'sine'),110);}

/* ---------- one cat, many floors ---------- */
const nextTrip=tp=>tp+CAT_TRIP[0]+Math.random()*(CAT_TRIP[1]-CAT_TRIP[0]);
function otherFloor(){const f=Math.floor(Math.random()*(floorCount-1));return f>=cat.floor?f+1:f;}
function catGone(){
  if(cat.job&&cat.job.onEnd)cat.job.onEnd(performance.now());
  cat.job=null;cat.air=null;cat.path=[];cat.z=0;cat.away=true;cat.x=-50;cat.y=150;catBall=null;
}
// In by the door, and off to a place to rest.
function catEnter(tp){
  const p=restSpot();Object.assign(cat,{floor:curFloor,away:false,x:DOOR.x,y:DOOR.y,z:0,face:1,nextTrip:nextTrip(tp)});
  startJob('arrive',[STEP.go(20,124),STEP.go(p.x,p.y),STEP.wait(400,'sit')]);
  renderFloors();
}
// The floor on show has changed: the cat is here (already in the room, or by the door) or it is not.
function catOnFloor(byDoor){
  if(!cat)return;cat.seenReady=false;
  if(cat.floor!==curFloor){if(!cat.away)catGone();}
  else if(cat.away){
    if(byDoor){catEnter(performance.now());return;}
    const p=restSpot();Object.assign(cat,{away:false,x:p.x,y:p.y,z:0,state:p.sleep?'sleep':'sit',until:performance.now()+5000});
  }
}
// Its turn to go: over to the door and out.
function catLeaves(tp){
  const f=otherFloor();cat.nextTrip=nextTrip(tp);
  startJob('trip',[STEP.go(20,124),STEP.go(DOOR.x,DOOR.y),STEP.act(()=>{cat.floor=f;catGone();renderFloors();})]);
}
function catElsewhere(tp){
  if(tp<cat.nextTrip||floorCount<2)return;
  const f=otherFloor();
  if(f===curFloor)catEnter(tp);else{cat.floor=f;cat.nextTrip=nextTrip(tp);renderFloors();}
}

/* ---------- a job: steps run one after another; a step returns true when done, 'abort' to give up ---------- */
const STEP={
  go:(x,y,run)=>(tp,first)=>{if(first)catGo(typeof x==='function'?x():x,typeof y==='function'?y():y,run);return !catMoving();},
  jump:(x,y,z,dur,h)=>(tp,first)=>{if(first)catJump(x,y,z,dur,h);return !cat.air;},
  wait:(ms,state)=>(tp,first)=>{if(first){cat.job.until=tp+ms;if(state)cat.state=state;}return tp>=cat.job.until;},
  act:fn=>tp=>{fn(tp);return true;},
  face:f=>()=>{cat.face=f;return true;},
};
function startJob(kind,steps,extra){cat.job=Object.assign({kind,steps,i:0,first:true},extra||{});cat.state='walk';}
function runJob(tp){
  const J=cat.job;
  for(let n=0;n<8&&cat.job===J;n++){
    if(J.check&&!J.check()){endJob(tp);return;}
    const f=J.steps[J.i];if(!f){endJob(tp);return;}
    const r=f(tp,J.first);J.first=false;
    if(r==='abort'){endJob(tp);return;}
    if(!r)return;
    J.i++;J.first=true;
  }
}
// the job is over (or given up): off any furniture, then back to resting
function endJob(tp){
  const J=cat.job;cat.job=null;
  if(J&&J.onEnd)J.onEnd(tp);
  if(cat.z>0){const d=J&&J.down||{x:cat.x,y:cat.y};cat.path=[];catJump(d.x,d.y,0,420,5);}
  cat.state='sit';cat.until=tp+3000+Math.random()*4000;
}
const seen=ch=>ch&&!ch.hidden&&!ch.removed&&!ch.held;
const working=ch=>seen(ch)&&ch.seated&&!ch.path.length&&['edit','bash','send','think','read','web'].includes(ch.act);
const typing=ch=>working(ch)&&['edit','bash','send'].includes(ch.act);
const sleeping=ch=>seen(ch)&&ch.seated&&!ch.path.length&&(ch.act==='asleep'||(ch.act==='idle'&&ch.idle&&ch.idle.act==='nap'&&ch.idle.phase==='do'));
const seatX=ch=>ch.seatX!=null?ch.seatX:ch.dx;
const anyChar=f=>{const a=[...chars.values()].filter(f);return a.length?a[(Math.random()*a.length)|0]:null;};

const CAT_JOBS={
  // up on a sleeper's desk: it wakes with a start, gives the cat a stroke, then nods off again
  sleeper(ch0){const ch=ch0||anyChar(sleeping);if(!ch)return false;const x=seatX(ch);
    startJob('sleeper',[STEP.go(x+9,121),STEP.jump(x+7,117,14,450),STEP.face(-1),STEP.wait(900,'sit'),
      STEP.act(tp=>{ch.wokenUntil=tp+4600;setMood(ch,'surprised',900);emote(ch,'excl');meowSound();}),STEP.wait(1300,'sit'),
      STEP.act(tp=>{ch.waveUntil=tp+1500;ch.face=1;setMood(ch,'love',1500);purr();emoteAt(cat.x+3,cat.y-cat.z-9,'heart');}),STEP.wait(1900,'sit'),
      STEP.act(()=>emote(ch,'dots')),STEP.wait(1500,'sit'),STEP.jump(x+10,121,0,420,5)],{down:{x:x+10,y:121},check:()=>seen(ch)});return true;},
  // up on a worker's desk, sitting right in front of the screen: the Claude stops, sighs, and once
  // the cat wanders off the end of the desk, gets back to work
  worker(ch0){const ch=ch0||anyChar(working);if(!ch)return false;const x=seatX(ch);
    startJob('worker',[STEP.go(x+12,121),STEP.jump(x+9,117,14,450),STEP.go(x,117),STEP.face(1),
      STEP.act(tp=>{ch.catBlockUntil=tp+1e6;ch.catBlockPose='sit';setMood(ch,'surprised',800);emote(ch,'quest');}),STEP.wait(1800,'sit'),
      STEP.act(()=>emote(ch,'sweat')),STEP.wait(1200,'sit'),STEP.go(x-9,117),
      STEP.act(tp=>{ch.catBlockUntil=0;emote(ch,'note');}),STEP.jump(x-12,121,0,420,5)],
      {down:{x:x-12,y:121},check:()=>seen(ch)&&ch.seated,onEnd(){ch.catBlockUntil=0;}});return true;},
  // a nap on a typing Claude's keyboard, until it is gently pushed off
  keyboard(ch0){const ch=ch0||anyChar(typing);if(!ch)return false;const x=seatX(ch);
    startJob('keyboard',[STEP.go(x+12,121),STEP.jump(x+8,117,14,450),STEP.go(x+1,117),
      STEP.act(tp=>{ch.catBlockUntil=tp+1e6;ch.catBlockPose='sit';emote(ch,'dots');}),STEP.wait(3200,'sleep'),
      STEP.act(tp=>{ch.catBlockPose='press';emote(ch,'sweat');}),STEP.wait(650,'sleep'),
      STEP.act(tp=>{ch.catBlockUntil=tp+250;cat.hop=tp+420;emoteAt(cat.x+3,cat.y-cat.z-9,'excl');}),STEP.jump(x+5,123,0,380,4),STEP.wait(900,'sit')],
      {down:{x:x+5,y:123},check:()=>seen(ch)&&ch.seated,onEnd(){if(ch.catBlockUntil>performance.now()+400)ch.catBlockUntil=0;}});return true;},
  // follows a Claude walking about, and rubs round its legs once it stops
  rub(ch0){const ch=ch0||anyChar(c=>seen(c)&&c.path.length&&!c.seated&&!(c.tgt&&(c.tgt.exit||c.tgt.seated||c.tgt.shelf)));if(!ch)return false;
    let rep=0;const t0=performance.now();
    startJob('rub',[(tp)=>{if(!seen(ch)||ch.seated||tp-t0>14000)return 'abort';
        const tx=ch.x-(ch.face||1)*10,ty=ch.y+1,d=Math.hypot(tx-cat.x,ty-cat.y);
        if(d>2&&tp>rep){catGo(tx,ty,d>20);rep=tp+300;}return !ch.path.length&&d<3&&!catMoving();},
      STEP.act(tp=>{cat.job.until=tp+3200;cat.state='rub';setMood(ch,'happy',3200);if(ch.act==='idle')ch.catPetUntil=tp+2600;}),
      (tp)=>{if(Math.floor(tp/450)!==Math.floor((tp-17)/450)){cat.face=-cat.face;if(Math.random()<.4)emoteAt(cat.x+3,cat.y-9,'heart');}if(Math.random()<.01)purr();return tp>=cat.job.until;}],
      {check:()=>seen(ch)&&!ch.seated});return true;},
  // begs by a Claude having a coffee, and gets a stroke
  coffee(ch0){const ch=ch0||anyChar(c=>seen(c)&&!c.path.length&&c.idle&&c.idle.act==='coffee'&&c.idle.phase==='do');if(!ch)return false;
    const s=ch.x>30?-12:12;
    startJob('coffee',[STEP.go(ch.x+s,ch.y+1,true),STEP.face(-Math.sign(s)),STEP.wait(500,'sit'),
      STEP.act(tp=>{meowSound();cat.hop=tp+420;emoteAt(cat.x+3,cat.y-9,'note');}),STEP.wait(1300,'sit'),
      STEP.act(tp=>{ch.catPetUntil=tp+1800;setMood(ch,'love',1800);purr();emoteAt(cat.x+3,cat.y-9,'heart');}),STEP.wait(2000,'sit')],
      {check:()=>seen(ch)&&ch.idle&&ch.idle.act==='coffee'});return true;},
  knock(){return startKnock();},
};

/* ---------- knocking a thing over, and a Claude on a break putting it back ---------- */
// What can go: a mug on the counter, the potted plant, the thing on a desk, a folder on the shelf.
// The counter and plant are painted in the room (bgHide clears them from it while they are down),
// the desk thing is skipped by drawDesk (deskOff) and the folder by the shelf (f.gone).
const DESK_THINGS={wood:{dx:-10,col:'#FFFFFF'},studio:{dx:-10},cottage:{dx:-10},glass:{dx:-11},
  zen:{dx:-10,dy:100,w:3,h:3,draw:g=>{R(g,0,0,3,3,'#E8E0D0');R(g,0,1,3,1,'#5E7A6A');}},
  cubicle:{dx:4,dy:100,w:5,h:3,draw:g=>{R(g,0,1,5,2,'#FFFFFF');R(g,1,0,4,1,'#F4F1EA');}}};
function spriteOf(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));return c;}
function grabBg(r){return spriteOf(r[2],r[3],g=>g.drawImage(bgDecor,r[0],r[1],r[2],r[3],0,0,r[2],r[3]));}
function knockables(){
  const out=[],X=COUNTER.x;
  if(partOf(TH,'counter')){const r=TH.counterThing?TH.counterThing(X):[X+33,154,4,4];
    out.push({kind:'counter',r,stand:{x:r[0]-5,y:178,z:20},up:{x:X-3,y:178},fx:X+45,fy:178,rot:1,
      pick:{x:X+54,y:178,dir:-1},home:{x:X-6,y:178,dir:1},down:{x:X+52,y:178}});}
  if(partOf(TH,'plant'))out.push({kind:'plant',r:[2,148,14,31],stand:{x:21,y:177,z:0},fx:15,fy:179,rot:1,pivot:true,
    pick:{x:52,y:178,dir:-1},home:{x:24,y:178,dir:-1}});
  const D=DESK_THINGS[TH.desk||'wood'],xs=deskXs(desks.length);
  if(D)desks.forEach((dk,i)=>{if(dk.activity==='gone')return;const x=xs[i],tx=x+D.dx,ty=D.dy||99;
    out.push({kind:'desk',id:String(dk.id),r:[tx,ty,D.w||4,D.h||4],sprite:spriteOf(D.w||4,D.h||4,g=>D.draw?D.draw(g):drawProp(g,'mug',0,0,{col:D.col||TH.mug})),
      stand:{x:tx-5,y:117,z:14},up:{x:tx-7,y:121},fx:tx+1,fy:122,rot:1,pick:{x:tx-9,y:124,dir:1},home:{x:tx-9,y:124,dir:1},down:{x:tx-9,y:122}});});
  // a folder whose spot on the floor below the shelf no desk hides
  const spans=xs.map(x=>[x-deskHalf(desks.length)-6,x+deskHalf(desks.length)+6]);
  shelf.forEach(f=>{const sx=SHELF[f.slot];if(f.gone||reserved.has(f.slot)||spans.some(([a,b])=>sx>a&&sx<b))return;
    out.push({kind:'shelf',slot:f.slot,f,sprite:spriteOf(12,9,g=>drawFolder(g,1,1,f.col,true)),r:[sx-6,10,12,9],
      stand:{x:sx-9,y:92,z:74},up:{x:sx-12,y:92},fx:sx-6,fy:93,rot:0,pick:{x:sx+9,y:89,dir:-1,shelf:true},home:{x:sx+9,y:89,dir:-1,shelf:true},down:{x:sx-14,y:92}});});
  return out;
}
function startKnock(){
  if(fallen)return false;const all=knockables();if(!all.length)return false;
  const k=all[(Math.random()*all.length)|0],st=k.stand;
  const steps=[];
  if(k.kind==='plant')steps.push(STEP.go(st.x,st.y));
  else if(k.kind==='shelf')steps.push(STEP.go(k.up.x,k.up.y),STEP.jump(st.x,st.y,st.z,750,14));
  else steps.push(STEP.go(k.up.x,k.up.y),STEP.jump(k.up.x+6,st.y,st.z,450),STEP.go(st.x,st.y));
  steps.push(STEP.face(k.kind==='plant'?-1:1),STEP.wait(700,'sit'),STEP.act(tp=>{cat.state='swipe';cat.swipe=tp;}),STEP.wait(500,'swipe'),
    STEP.act(tp=>dropThing(k,tp)));
  if(k.kind==='plant')steps.push(STEP.act(tp=>{cat.hop=tp+500;cat.hopH=9;emoteAt(cat.x+3,cat.y-12,'excl');}),STEP.wait(450,'sit'),STEP.go(64,168,true),STEP.wait(1200,'sit'));
  else steps.push(STEP.wait(1100,'sit'),STEP.jump(k.down.x,k.down.y,0,480,6),STEP.wait(600,'sit'));
  startJob('knock',steps,{down:k.down||{x:cat.x,y:cat.y}});
  return true;
}
function dropThing(k,tp){
  const f={...k,t0:tp,state:'falling',from:{x:k.r[0],y:k.r[1]},fixer:null};
  if(k.kind==='counter'||k.kind==='plant'){f.sprite=grabBg(k.r);bgHide=[k.r];buildBg();}
  if(k.kind==='shelf')k.f.gone=true;
  if(k.kind==='desk'){const o=chars.get(k.id);if(seen(o))emote(o,'excl');}
  fallen=f;blip(180,.12,'square');setTimeout(()=>blip(120,.1,'square'),120);
}
// the thing back where it was
function restoreFallen(){
  const f=fallen;if(!f)return;fallen=null;
  if(f.kind==='counter'||f.kind==='plant'){bgHide=[];buildBg();}
  if(f.kind==='shelf')f.f.gone=false;
}
// A Claude on a break (never one at work) sees it, goes over, picks it up and puts it back.
function findFixer(tp){
  if(!fallen||fallen.state!=='down'||fallen.fixer)return;
  const ch=anyChar(c=>seen(c)&&c.act==='idle'&&c.idle&&!c.idle.pair&&!c.errand&&!c.treat&&['pick','do'].includes(c.idle.phase)&&!['nap','highfive','tidy'].includes(c.idle.act));
  if(!ch)return;
  releaseIdle(ch);fallen.fixer=ch.id;emote(ch,'excl');
  ch.idle={act:'tidy',phase:'go',dur:1e9,last:'tidy',step:'pick'};setTarget(ch,{...fallen.pick,st:'i-tidy'});
}
function tidyTick(ch,I,tp){
  const f=fallen;if(!f||f.fixer!==ch.id){I.until=0;return;}
  if(I.step==='pick'&&tp>I.stepUntil){I.step='carry';f.state='carried';setTarget(ch,{...f.home,st:'i-tidy2'});}
  else if(I.step==='carry'&&!ch.path.length&&ch.arrived){I.step='put';I.stepUntil=tp+700;}
  else if(I.step==='put'&&tp>I.stepUntil){restoreFallen();setMood(ch,'happy',1000);emote(ch,'star');I.until=0;}
}
// the fixer was called back to work (or picked up): the thing drops where it is, for the next one
function checkFixer(){
  const f=fallen;if(!f||!f.fixer)return;const ch=chars.get(f.fixer);
  if(seen(ch)&&ch.idle&&ch.idle.act==='tidy')return;
  f.fixer=null;if(f.state!=='carried')return;
  f.state='down';const x=ch?ch.x:f.fx,y=ch?ch.y:f.fy;f.fx=x+4;f.fy=y;f.rot=1;f.pivot=false;
  f.pick={x:x+12,y,dir:-1,shelf:y<92};
}

/* ---------- reacting: the door, paper planes, a ball ---------- */
function watchDoor(tp){
  // the Claudes already there when the page opens are not newcomers
  if(!cat.seenReady){chars.forEach(ch=>cat.seen.set(ch.id,!ch.hidden));cat.seenReady=true;return;}
  chars.forEach(ch=>{const was=cat.seen.get(ch.id),now=!ch.hidden;cat.seen.set(ch.id,now);
    if(cat.job||catMoving()||cat.z>0||tp<cat.doorCD)return;
    const arriving=now&&!was&&Math.hypot(ch.x-DOOR.x,ch.y-DOOR.y)<30,leaving=now&&ch.tgt&&ch.tgt.exit&&ch.path.length&&Math.hypot(ch.x-DOOR.x,ch.y-DOOR.y)>30;
    if(!arriving&&!leaving)return;cat.doorCD=tp+45000;
    startJob('door',[STEP.go(36,104,true),STEP.face(-1),STEP.wait(300,'sit'),
      STEP.act(tp=>{meowSound();cat.hop=tp+420;emoteAt(cat.x+3,cat.y-9,'heart');if(seen(ch)){ch.waveUntil=tp+1300;ch.face=1;}}),STEP.wait(2200,'sit')]);
  });
}
function watchPlanes(tp){
  if(cat.job||catMoving()||cat.z>0||tp<cat.planeCD)return;
  const p=decor.find(p=>p.life>1.2&&Math.abs(p.x-cat.x)<70);if(!p)return;cat.planeCD=tp+25000;
  const lx=clampX(p.x+p.vx*.7),ly=121;
  startJob('plane',[STEP.go(lx-8,ly,true),STEP.act(tp=>{cat.state='crouch';}),STEP.wait(120,'crouch'),STEP.jump(lx,ly,0,520,26),
    STEP.act(tp=>{const q=decor.find(q=>q===p&&q.life>0&&Math.abs(q.x-cat.x)<14);
      if(q&&Math.random()<.55){q.life=0;emoteAt(cat.x+3,cat.y-12,'star');for(let i=0;i<8;i++)confetti.push({x:cat.x,y:cat.y-14,vx:(Math.random()-.5)*30,vy:-10-Math.random()*15,c:'#FFFFFF',life:.7,w:1});}
      else emoteAt(cat.x+3,cat.y-12,'dots');}),STEP.wait(1500,'sit')]);
}
// a ball dropped on the floor from the item bar: the cat chases it and bats it about
function dropBallForCat(x,y){const tp=performance.now();catBall={x:clampX(x),y:clampY(y),z:0,vx:0,vy:0,vz:0,until:tp+14000};
  if(cat&&cat.away)catEnter(tp); // it hears the ball, wherever it is
  if(cat&&cat.job&&cat.z===0&&cat.job.kind!=='ball'){const J=cat.job;cat.job=null;if(J.onEnd)J.onEnd(tp);}
  blip(760,.06,'triangle');}
function stepBall(dt,tp){
  const b=catBall;if(!b)return;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.25,dt);b.vy*=Math.pow(.25,dt);
  if(b.z>0||b.vz>0){b.vz-=120*dt;b.z+=b.vz*dt;if(b.z<=0){b.z=0;b.vz=Math.abs(b.vz)>12?-b.vz*.45:0;}}
  if(b.x<6||b.x>314){b.vx=-b.vx;b.x=clampX(b.x);}if(b.y<88||b.y>179){b.vy=-b.vy;b.y=clampY(b.y);}
  if(tp>b.until){catBall=null;if(cat.job&&cat.job.kind==='ball')cat.job=null;return;}
  if(cat.job||cat.z>0||cat.away)return;
  startJob('ball',[(tp)=>{const B=catBall;if(!B)return 'abort';const d=Math.hypot(B.x-cat.x,B.y-cat.y);
    if(d>5){if(tp>(cat.job.rep||0)){catGo(B.x-Math.sign(B.x-cat.x||1)*4,B.y,true);cat.job.rep=tp+250;}return false;}
    cat.path=[];cat.face=B.x>cat.x?1:-1;cat.hop=tp+380;cat.hopH=5;
    B.vx=cat.face*(30+Math.random()*40);B.vy=(Math.random()-.5)*40;B.vz=25;if(Math.random()<.3)emoteAt(cat.x+3,cat.y-10,'note');blip(500+Math.random()*200,.04,'triangle');
    cat.job.rep=tp+500;return false;}]);
}

/* ---------- the frame ---------- */
function updateCat(dt,tp){
  if(!cat){cat=newCat(tp);renderFloors();}
  if(!cat.away){stepCat(dt,tp);stepBall(dt,tp);}
  cat.pet=Math.max(0,cat.pet-dt*30);
  if(cat.pet>40){cat.pet=0;emoteAt(cat.x+3,cat.y-cat.z-9,'heart');purr();if(!cat.job&&cat.path.length){cat.path=[];cat.state='sit';cat.until=tp+5000;}}
  if(fallen&&fallen.state==='falling'&&tp-fallen.t0>450)fallen.state='down';
  if(fallen&&fallen.kind==='shelf'&&shelf.get(fallen.slot)!==fallen.f){const ch=fallen.fixer&&chars.get(fallen.fixer);if(ch&&ch.idle&&ch.idle.act==='tidy')ch.idle.until=0;fallen=null;} // its file was filed again meanwhile
  checkFixer();findFixer(tp);
  if(cat.away){catElsewhere(tp);return;}
  watchDoor(tp);watchPlanes(tp);
  if(cat.job){runJob(tp);return;}
  if(catMoving()){cat.state='walk';return;}
  if(cat.state==='walk'){cat.state=cat.restState||'sit';cat.until=tp+7000+Math.random()*12000;}
  if(cat.state==='sit')catFidget(tp);
  if(floorCount>1&&tp>cat.nextTrip&&!catPetted()&&!catBall){catLeaves(tp);return;}
  // its next doing, now and then; if nothing fits right now, it looks again a little later
  if(tp>cat.nextJob&&!catPetted()){
    const keys=Object.keys(CAT_JOBS).sort(()=>Math.random()-.5);
    const ok=keys.some(k=>CAT_JOBS[k]());
    cat.nextJob=tp+(ok?CAT_REST[0]+Math.random()*(CAT_REST[1]-CAT_REST[0]):20000);
    if(ok)return;
  }
  if(tp>cat.until&&!catPetted()){
    if(cat.state==='sleep'){cat.state='stretch';cat.until=tp+1300;return;} // a good stretch before it gets up
    const p=restSpot();catGo(p.x,p.y);cat.restState=p.sleep||Math.random()<.45?'sleep':'sit';cat.state='walk';
  }
}
// Sitting about: it turns to a moving cursor, and now and then washes, yawns, looks round or flicks an ear.
const FIDGETS={groom:2000,look:1400,ear:300,yawn:900};
function catFidget(tp){
  if(ptr.in&&tp-(ptr.movedAt||0)<800){const d=ptr.x-cat.x;if(Math.abs(d)>3&&Math.abs(d)<60&&Math.abs(ptr.y-cat.y)<40){cat.face=d>0?1:-1;cat.watchUntil=tp+900;}}
  if(tp<(cat.nextFid||0)||tp<(cat.watchUntil||0))return;
  const k=Object.keys(FIDGETS)[(Math.random()*4)|0];cat.fid={k,until:tp+FIDGETS[k]};cat.nextFid=tp+4000+Math.random()*7000;
}
// a Claude petting it holds it in place
const catPetted=()=>[...chars.values()].some(c=>c.idle&&c.idle.act==='catpet'&&c.idle.phase!=='pick');
const catPurring=()=>cat.pet>4||[...chars.values()].some(c=>c.idle&&c.idle.act==='catpet'&&c.idle.phase==='do');
// where it goes to rest: a patch of sun under the window by day, by a lit desk lamp at night, or anywhere
function restSpot(){
  const n=nightness(Date.now());
  if(Math.random()<.35){
    if(n<.4&&TH.beam>0&&TH.window!=='painting')return {x:262+Math.random()*16,y:146+Math.random()*8,sleep:true};
    if(n>.6){const xs=deskXs(desks.length),lit=desks.map((dk,i)=>dk.activity!=='gone'&&!lampOff.has(String(dk.id))?xs[i]:null).filter(x=>x!=null);
      if(lit.length)return {x:lit[(Math.random()*lit.length)|0]+13,y:122,sleep:true};}
  }
  const p={...CAT_SPOTS[(Math.random()*CAT_SPOTS.length)|0]};outOfFurniture(p);return p;
}
// a new room: everything back in place, the cat back on the floor
function resetCatWorld(){
  if(fallen){if(fallen.kind==='shelf')fallen.f.gone=false;const ch=fallen.fixer&&chars.get(fallen.fixer);if(ch&&ch.idle&&ch.idle.act==='tidy')ch.idle={phase:'pick',t:0};}
  fallen=null;bgHide=[];catBall=null;
  rooms.forEach(r=>{if(r.fallen&&r.fallen.f)r.fallen.f.gone=false;r.fallen=null;});
  if(!cat||cat.away)return;if(cat.job&&cat.job.onEnd)cat.job.onEnd(performance.now());
  cat.job=null;cat.air=null;cat.path=[];cat.z=0;const p={x:clampX(cat.x),y:Math.max(121,clampY(cat.y))};outOfFurniture(p);cat.x=p.x;cat.y=p.y;cat.state='sit';
}
// Its name, from the settings: letters and digits the room's pixel font can draw, without accents.
const CAT_NAME_MAX=10;
let catName='',catTagUntil=0;
try{catName=localStorage.getItem('office.catName')||'';}catch(e){}
function setCatName(s){catName=String(s||'').normalize('NFD').replace(/[^A-Za-z0-9 -]/g,'').trim().slice(0,CAT_NAME_MAX);try{localStorage.setItem('office.catName',catName);}catch(e){}}
// A small tag over the cat: while the pointer is on it, for a moment after a click, always with labels.
function drawCatTag(g,tp){
  if(!cat||!catName||cat.away)return;
  const top=cat.y-cat.z,near=ptr.in&&Math.abs(ptr.x-cat.x)<=6&&ptr.y>=top-10&&ptr.y<=top+1;
  if(!near&&!LABELS&&tp>catTagUntil)return;
  const t=catName.toUpperCase(),w=pixWidth(t)+4,x=Math.max(2,Math.min(W-w-2,Math.round(cat.x-w/2))),y=Math.round(top-18);
  R(g,x-1,y+8,w,1,'rgba(0,0,0,.25)');R(g,x+1,y,w-2,8,NAVY);R(g,x,y+1,w,6,NAVY);pixText(g,t,x+2,y+1,'#FFFFFF');
}
function catMeow(tp){catTagUntil=tp+2200;cat.hop=tp+420;cat.hopH=4;if(cat.state==='sleep'&&!cat.job){cat.state='sit';cat.until=tp+6000;}emoteAt(cat.x+3,cat.y-cat.z-9,Math.random()<.5?'heart':'note');meowSound();}

/* ---------- drawing ---------- */
function drawCat(g,tp){
  const L=lookOf(),f=cat.face,dur=L.float?900:420,H=L.float?Math.max(cat.hopH,8):cat.hopH,A=cat.air;
  const hop=tp<cat.hop?Math.round(Math.sin((cat.hop-tp)/dur*Math.PI)*H):0;
  const st=A?(tp<A.t0?'crouch':'jump'):tp<(cat.land||0)?'crouch':cat.path.length?'walk':cat.state;
  const C=L.fur,Hi=L.hi,EY=L.eye,TL=L.tail||C,LG=L.legs||C,PAW=L.legs||Hi,tail=Math.round(Math.sin(tp/350));
  const under=shade(C,-.16),lid=L===CAT_LOOKS.black?Hi:shade(C,-.38),NOSE=L.holo?Hi:'#E08F8F';
  const blink=((tp/1000)%5)<=.15,purring=catPurring(),breath=((tp/1000)%3)>=1.5,buzz=purring&&Math.floor(tp/80)%2;
  const fid=st==='sit'&&cat.fid&&tp<cat.fid.until?cat.fid.k:null,running=st==='walk'&&cat.speed>20&&(cat.v||0)>20;
  const sr=cat.stride||0,gallop=running?Math.floor(sr/4)%2:0;
  let bx=Math.round(cat.x),by=Math.round(cat.y-cat.z)-hop-(running&&gallop?1:0);
  if(st==='rub')bx+=Math.round(Math.sin(tp/225)); // it leans into the legs it rubs
  const p=(dx,dy,w,h,col)=>R(g,f>0?bx+dx:bx-dx-w+1,by+dy,w,h,col);
  if(A?!A.z0&&!A.z1:cat.z<1){const w=Math.max(4,10-Math.round(cat.z*.4));g.fillStyle='rgba(0,0,0,.22)';g.fillRect(bx-1-Math.ceil(w/2),Math.round(cat.y),w,1);}
  if(L.holo)g.globalAlpha=.62;
  // the eyes last, over the face marks; every pose below sets what its face is once the marks are on
  let pose='sit',face=null;
  if(st==='sleep'){pose='sleep';
    p(-4,-3,8,3,C);p(-3,-4,6,1,C);if(breath)p(-2,-5,3,1,C);p(1,-5,3,2,C);p(1,-6,1,1,C);p(3,-6,1,1,C);p(2,-4,2,1,Hi);p(-4,-1,8,1,under);
    if(L.bob)p(-5,-2,2,1,TL);else{p(-5,-1,4,1,TL);if((tp/1000)%7<.35)p(-5,-2,1,1,TL);} // the tail tip stirs in its sleep
    face=()=>p(2,-5,1,1,lid);
  }else if(st==='stretch'){pose='stretch'; // rear up, chest down, front paws reaching
    p(-4,-6,4,3,C);p(0,-5,4,3,C);p(-3,-6,3,1,Hi);p(3,-5,3,3,C);p(3,-6,1,1,C);p(5,-6,1,1,C);
    p(-3,-3,1,3,LG);p(-1,-3,1,3,LG);p(3,-2,2,1,LG);p(3,-1,4,1,LG);p(6,-1,1,1,PAW);
    if(L.bob)p(-5,-7,2,2,TL);else p(-5,-9,1,4,TL);
    face=()=>{p(4,-4,1,1,lid);p(5,-3,1,1,NOSE);};
  }else if(st==='walk'||st==='rub'||st==='jump'){pose='walk';
    const air=st==='jump',u=air?(tp-A.t0)/A.dur:0;
    p(-4,-5,8,air?2:3,C);p(-3,-5,5,1,Hi);if(!air)p(-4,-3,8,1,under);p(3,-7,3,3,C);p(3,-8,1,1,C);p(5,-8,1,1,C);
    if(air&&u<.5){p(4,-3,3,1,LG);p(-6,-3,3,1,LG);}        // going up: stretched out long
    else if(air){p(3,-3,1,2,LG);p(5,-3,1,2,LG);p(-4,-3,2,1,LG);} // coming down: front paws reaching for the ground
    else if(running){if(gallop){p(-5,-2,2,1,LG);p(4,-2,2,1,LG);}else{p(-1,-2,1,2,LG);p(1,-2,1,2,LG);p(-2,-2,1,1,LG);p(2,-2,1,1,LG);}}
    else{const k=Math.floor(sr/2.4)%4,a=k===0?1:2,b=k===2?1:2;p(-3,-2,1,a,LG);p(-1,-2,1,b,LG);p(1,-2,1,a,LG);p(3,-2,1,b,LG);}
    const ts=Math.round(Math.sin(sr/5));
    if(L.bob)p(-5,-6,2,2,TL);else if(st==='rub')p(-5,-10,1,5,TL);else if(air&&u>=.5)p(-6,-7,1,2,TL);else if(air||running)p(-6,-6,2,1,TL);
    else{p(-5,-6,1,2,TL);p(-5+ts,-7,1,1,TL);}
    face=()=>{p(4,-6,1,1,st==='rub'?lid:EY);p(5,-5,1,1,NOSE);};
  }else if(st==='crouch'){pose='sleep';
    p(-4,-3,8,3,C);p(-3,-4,5,1,Hi);p(-4,-1,8,1,under);p(2,-5,3,3,C);p(2,-6,1,1,C);p(4,-6,1,1,C);if(L.bob)p(-5,-3,2,2,TL);else p(-5,-3+tail,1,1,TL);
    face=()=>{p(3,-4,1,1,EY);p(4,-3,1,1,NOSE);};
  }else{
    const ear=fid==='ear'&&Math.floor(tp/90)%2,happy=purring||fid==='groom'||fid==='yawn';
    p(-3,-4,6,4,C);p(-2+(buzz?1:0),-5,4,1,Hi);if(breath)p(-1,-4,3,1,Hi);p(-3,-1,6,1,under);p(1,-1,2,1,PAW);
    p(1,-8,4,3,C);p(1,-9,1,1,C);if(!ear)p(4,-9,1,1,C);
    p(-4,-2,1,2,LG);
    if(L.bob)p(-5,-3,2,2,TL);
    else if(purring){p(-5,-7,1,5,TL);if(buzz)p(-6,-7,1,1,TL);} // a happy cat's tail stands up and quivers
    else{p(-5,-3,1,2,TL);p(-5+tail,-4,1,1,TL);}
    // a paw up: swiping at something (wound up, then a strike), washing, or the beckoning-cat wave
    if(st==='swipe'){if((tp-(cat.swipe||0))<200)p(5,-8,1,2,PAW);else{p(5,-5,3,1,PAW);p(8,-5,1,1,LG);}}
    else if(fid==='groom')p(4,-6+Math.floor(tp/170)%2,2,2,PAW);
    else if(L.wave&&((tp/1000)%11)<1.8){p(5,-10+Math.floor(tp/220)%2,1,3,C);}
    const away=fid==='look'?Math.floor(tp/500)%2:0,toward=tp<(cat.watchUntil||0)||(fid==='look'&&!away);
    face=()=>{
      if(happy){p(2,-7,1,1,lid);p(4,-7,1,1,lid);}
      else if(!blink){p(away?3:toward?3:2,-7,1,1,EY);p(away?2:4,-7,1,1,EY);}
      if(fid==='yawn'){p(2,-6,3,1,'#7A2E3A');p(3,-6,1,1,NOSE);}else p(3,-6,1,1,NOSE);
    };
  }
  const marks=(L.marks&&L.marks[pose==='stretch'?'walk':pose]||[]).filter(m=>pose!=='stretch'||m[1]>=-6); // stretching, its head is low: only the body marks
  marks.forEach(m=>p(m[0],m[1],m[2],m[3],m[4]));
  if(face)face();
  if(L.acc)L.acc(p,pose,tp);
  if(L.holo){
    g.globalAlpha=1;g.globalCompositeOperation='destination-out';g.fillStyle='rgba(0,0,0,.45)';
    for(let y=by-12;y<by+1;y+=2)g.fillRect(bx-8,y,17,1); // scanlines
    g.globalCompositeOperation='source-over';
    // now and then it glitches: a magenta ghost beside it
    if(hash('g'+Math.floor(tp/130))%23===0){g.globalAlpha=.45;p(-3,-8,8,6,'#FF3DCB');g.globalAlpha=1;}
  }
}
// the cat, then a thing it knocked over (falling, on the floor, or carried by a Claude), and the ball
function catDrawables(items,tp){
  if(cat&&!cat.away){const L=lookOf(),box=[Math.round(cat.x)-10,Math.round(cat.y-cat.z)-20,21,24],d=cat.z>0?cat.y+.5:cat.y;
    items.push({d,f:()=>L.holo?drawHolo(wx,box,tp):outlinedLive(wx,'cat',box,g=>drawCat(g,tp))});}
  const F=fallen;
  if(F&&F.state!=='carried'){const u=F.state==='falling'?Math.min(1,(tp-F.t0)/450):1;
    items.push({d:F.fy+.4,f:()=>drawFallen(wx,F,u)});}
  if(catBall){const b=catBall,blinkOut=b.until-tp<1500&&Math.floor(tp/120)%2;
    items.push({d:b.y,f:()=>{if(blinkOut)return;g0shadow(wx,b.x,b.y);drawProp(wx,'ball',Math.round(b.x)-2,Math.round(b.y-b.z)-4,{col:'#FF6B6B'});}});}
}
// the hologram has no rim, and its scanlines are cut on a canvas of its own, never in the room
const holoC=document.createElement('canvas');holoC.width=W;holoC.height=H;const holoX=holoC.getContext('2d');
function drawHolo(g,box,tp){const [x,y,w,h]=box;holoX.clearRect(x,y,w,h);drawCat(holoX,tp);g.drawImage(holoC,x,y,w,h,x,y,w,h);}
function g0shadow(g,x,y){g.fillStyle='rgba(0,0,0,.2)';g.fillRect(Math.round(x)-2,Math.round(y),4,1);}
// the sprite on its way down (an arc, turning), then lying on its side on the floor
function drawFallen(g,F,u){
  const s=F.sprite,w=s.width,h=s.height,ang=F.rot*u*Math.PI/2;
  let cx,cy;
  if(F.pivot){cx=F.from.x+w;cy=F.from.y+h;} // the plant tips over its pot's corner
  else{const x0=F.from.x+w/2,y0=F.from.y+h/2,x1=F.fx+(F.rot?h:w)/2,y1=F.fy-(F.rot?w:h)/2;cx=x0+(x1-x0)*u;cy=y0+(y1-y0)*u-Math.sin(Math.PI*u)*6;}
  g.save();g.translate(Math.round(cx),Math.round(cy));g.rotate(ang);
  if(F.pivot)g.drawImage(s,-w,-h);else g.drawImage(s,-Math.round(w/2),-Math.round(h/2));
  g.restore();
}
// what a Claude putting it back carries, held up in front
function drawCarried(g,ch){
  const F=fallen;if(!F||F.state!=='carried'||F.fixer!==ch.id)return;
  const s=F.sprite,k=s.height>14?.5:1,w=Math.round(s.width*k),h=Math.round(s.height*k),dir=dirOf(ch);
  g.drawImage(s,Math.round(ch.x+dir*5-w/2),Math.round(ch.y-6-h),w,h);
}
