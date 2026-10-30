// What the page knows: desks and characters, the desk layout, walking paths, reading data.js.
'use strict';
/* ---------- state ---------- */
let desks=[],gotData=false,firstLoad=true,misses=0,lastCall=0;
const chars=new Map(),interns=new Map(),animated=new Set(),pendingSent=new Map(),lastDone=new Map();
const lookMem=new Map(),lookObj=new Map(); let lookAt=0,lookHere=new Set();
let flying=[];
let planes=[],decor=[],confetti=[],glyphs=[],steam=[],banners=[],dust=[];
let lastLaunch=0;
for(let i=0;i<10;i++)dust.push({x:250+Math.random()*60,y:90+Math.random()*45,v:2+Math.random()*3,p:Math.random()*6});
const motes=[];for(let i=0;i<18;i++)motes.push({x:Math.random()*W,y:88+Math.random()*90,v:1.5+Math.random()*3,p:Math.random()*6,c:i%3?'45,226,230':'255,61,203'});
// things you can click, and what the room remembers about them
const lampOff=new Set();
let winOpen=false,brewUntil=0,plantT=-1e9,funUntil=0,clockSpin=-1e9,doorKnock=-1e9;
let emotes=[],leaves=[],cat=null;
const ptr={x:0,y:0,in:false};
let hoverCh=null,cardId=null;
// after a break this long, a nap gets likelier (35% instead of 25%); ?nap=<seconds> to try it
const NAP_MS=(()=>{const m=Q.match(/nap=(\d+)/);return m?+m[1]*1000:180000;})();
function newChar(id,lk){return {id,x:DOOR.x,y:DOOR.y,path:[],hidden:true,seated:false,look:lk,blinkT:Math.random()*4,jumpUntil:0,sendT:Math.random()*2,
  sq:0,sqv:0,face:1,nextBlink:0,mood:null,moodUntil:0,pet:0,pokes:[],nextEmote:0,pace:36+Math.random()*10};}

// Every session's avatar: a colour and an accessory drawn apart, at random, and remembered by desk id
// (lookMem: indexes into LOOKS for the colour, the accessory's style, and when it arrived). Whoever
// arrives while nobody has the plain Claude gets it. settleLooks keeps the rules in arrival order: two
// sessions never share an avatar, and no floor has one colour twice; the later arrival gives way.
// An accessory chosen on the card is pinned (pin): from then on only the colour gives way. A colour
// chosen there (pinC) goes first in that order, so a drawn colour gives way to it; between two chosen
// ones the later arrival draws another and loses the pin.
const looksFor=id=>{if(!lookObj.has(id))lookObj.set(id,{c:LOOKS[0].c,style:0});return lookObj.get(id);};
function loadLooks(){
  lookMem.clear();lookAt=0;
  try{Object.entries(JSON.parse(localStorage.getItem('office.looks')||'{}')).forEach(([id,m])=>{if(LOOKS[m.c]&&m.s>=0&&m.s<LOOKS.length){lookMem.set(id,{c:m.c,s:m.s,at:+m.at||0,pin:!!m.pin,pinC:!!m.pinC});lookAt=Math.max(lookAt,+m.at||0);}});}catch(e){}
}
loadLooks();
function pickLook(floorCols,held,usedC,usedS,keepS,keepC){
  let best=[],low=9;
  for(let c=0;c<LOOKS.length;c++){
    if(floorCols.has(c)||(keepC!=null&&c!==keepC))continue;
    for(let s=0;s<LOOKS.length;s++){
      if((keepS!=null&&s!==keepS)||held.has(c+':'+s)||(!c&&!s)||(c===3&&s===4))continue; // gold glasses on a gold body hardly show
      const score=(usedC.has(c)?1:0)+(usedS.has(s)?1:0);
      if(score<low){low=score;best=[];}
      if(score===low)best.push({c,s});
    }
  }
  return best[(Math.random()*best.length)|0]||null;
}
function saveLooks(){try{localStorage.setItem('office.looks',JSON.stringify(Object.fromEntries([...lookMem].sort((a,b)=>a[1].at-b[1].at).slice(-64))));}catch(e){}}
// Can this desk wear that accessory? Not if it makes a twin of someone here, or gold glasses on gold.
function accessoryTaken(id,s){
  const m=lookMem.get(id);if(!m)return true;
  return (m.c===3&&s===4)||everyDesk.some(d=>{const o=lookMem.get(String(d.id));return String(d.id)!==id&&o&&o.c===m.c&&o.s===s;});
}
function setAccessory(id,s){const m=lookMem.get(id);if(!m)return;m.s=s;m.pin=true;looksFor(id).style=s;saveLooks();}
// Can this desk wear that colour? Not if someone on its floor has it, or it makes a twin, or gold glasses.
function colourTaken(id,c){
  const m=lookMem.get(id);if(!m)return true;
  const f=floorOf.get(id);
  return (c===3&&m.s===4)||everyDesk.some(d=>{const o=lookMem.get(String(d.id));return String(d.id)!==id&&o&&o.c===c&&(o.s===m.s||floorOf.get(String(d.id))===f);});
}
function setColour(id,c){const m=lookMem.get(id);if(!m)return;m.c=c;m.pinC=true;looksFor(id).c=LOOKS[c].c;saveLooks();}
function settleLooks(all){
  const seen=d=>{const m=lookMem.get(String(d.id));return m?m.at:Infinity;};
  all.forEach(d=>{const m=lookMem.get(String(d.id));if(m&&!firstLoad&&!lookHere.has(String(d.id)))m.at=++lookAt;}); // back after a while: it arrives now
  const held=new Set(),usedC=new Set(),usedS=new Set(),floors=new Map();let changed=false;
  const drawn=d=>{const m=lookMem.get(String(d.id));return m&&m.pinC?0:1;};
  all.map((d,i)=>[d,i]).sort((a,b)=>drawn(a[0])-drawn(b[0])||seen(a[0])-seen(b[0])||a[1]-b[1]).forEach(([d])=>{
    const id=String(d.id),f=floorOf.get(id),cols=floors.get(f)||new Set();floors.set(f,cols);
    let m=lookMem.get(id);
    if(!m){m=held.has('0:0')||cols.has(0)?pickLook(cols,held,usedC,usedS):{c:0,s:0};m.at=++lookAt;lookMem.set(id,m);changed=true;}
    else if(held.has(m.c+':'+m.s)||cols.has(m.c)){
      const was=m.c,keepC=m.pinC&&!m.pin&&!cols.has(m.c); // a twin on another floor, chosen colour: the accessory gives way
      Object.assign(m,(keepC&&pickLook(cols,held,usedC,usedS,null,m.c))||((m.pin||!held.has(m.c+':'+m.s))&&pickLook(cols,held,usedC,usedS,m.s))||pickLook(cols,held,usedC,usedS));changed=true; // only its colour clashes, or its accessory is pinned: it keeps it
      if(m.c!==was)m.pinC=false;
    }
    held.add(m.c+':'+m.s);usedC.add(m.c);usedS.add(m.s);cols.add(m.c);
    Object.assign(looksFor(id),{c:LOOKS[m.c].c,style:m.s});
  });
  lookHere=new Set(all.map(d=>String(d.id)));
  if(changed)saveLooks();
}
// Desks and their boards share one lane on the wall, between the door sign (x 31) and the curtains (x 266).
// A row is centred under the clock (x 160) whenever it fits, and slides left only when it must.
// Half widths shrink with the count so neighbours never touch: 3 px of wall between boards, 2 px between desks.
const LANE_L=34,LANE_R=264,ROOM_MID=160,MAX_DESKS=+(Q.match(/desks=(\d)/)||[])[1]||4; // per floor: more and the boards lose their text (?desks=6 for test runs)
const deskSpan=n=>Math.min(58,(LANE_R-LANE_L)/Math.max(1,n));
function deskXs(n){const sp=deskSpan(n),gw=sp*n,left=Math.max(LANE_L,Math.min(LANE_R-gw,ROOM_MID-gw/2));
  const a=[];for(let i=0;i<n;i++)a.push(Math.round(left+(i+.5)*sp));return a;}
const boardHalf=n=>Math.min(27,Math.floor((deskSpan(n)-3)/2));
const deskHalf=n=>Math.max(17,Math.min(20,Math.floor((deskSpan(n)-2)/2)));
function deskX(id){const i=desks.findIndex(d=>String(d.id)===id);return i<0?null:deskXs(desks.length)[i];}

/* ---------- targets & paths ---------- */
function posFor(st,i,dx){
  switch(st){
    case 'desk':return {x:dx,y:SEAT_Y,seated:true};
    case 'cabinet':return {x:50+i*11,y:177};
    case 'machine':return [{x:82,y:178,dir:1},{x:129,y:178,dir:-1},{x:72,y:178,dir:1},{x:139,y:178,dir:-1}][i%4];
    case 'coffee':return [6,16,26,36].map(d=>({x:COUNTER.x-d,y:178}))[i%4]; // the queue for coffee, left of the counter
    case 'door':return i<2?{x:33+i*9,y:100}:{x:33+(i-2)*9,y:124};
    default:return {x:DOOR.x,y:DOOR.y,exit:true};
  }
}
// The open floor starts in front of the desk row. Open floor is crossed in a straight line, unless
// something stands in the way: then the walk goes by the corridor at WALK_Y. FLOOR_BLOCK holds the
// room's fixed furniture, with a margin: cabinet, machine, counter, plants.
const FLOOR_Y=122,FLOOR_BLOCK=[{x0:14,y0:136,x1:44,y1:181},{x0:84,y0:131,x1:128,y1:181},{x0:COUNTER.x-3,y0:150,x1:COUNTER.x+43,y1:181},{x0:1,y0:156,x1:17,y1:181},{x0:290,y0:90,x1:316,y1:134}];
const clearFloor=(a,b)=>!FLOOR_BLOCK.some(o=>crosses(a,b,o));
// The way past a desk: left of it, midway to its neighbour when the row is tight.
const aisle=x=>x-Math.min(22,deskSpan(desks.length)/2);
function buildPath(e,t){
  const pts=[];
  if(e.hidden){e.hidden=false;e.x=DOOR.x;e.y=DOOR.y;}
  let cx=e.x,cy=e.y;
  const SHELF_Y=89, lane=x=>{const xs=deskXs(desks.length);let best=x;let d=1e9;xs.forEach(dx=>{const l=aisle(dx);if(Math.abs(l-x)<d){d=Math.abs(l-x);best=l;}});return best;};
  // out of the chair, or sideways to a lane: nobody leaves the desk row through a desk
  const clearRow=()=>{
    if(e.seated){cx=aisle(e.seatX);pts.push({x:cx,y:SEAT_Y});e.seated=false;}
    else if(cy<FLOOR_Y&&deskXs(desks.length).some(dx=>Math.abs(cx-dx)<deskHalf(desks.length)+2)){cx=lane(cx);pts.push({x:cx,y:cy});}
  };
  const floorTo=q=>{
    if(cy<FLOOR_Y){pts.push({x:cx,y:WALK_Y});cy=WALK_Y;}
    if(!clearFloor({x:cx,y:cy},q)){if(Math.abs(cy-WALK_Y)>.5)pts.push({x:cx,y:WALK_Y});pts.push({x:q.x,y:WALK_Y});}
    pts.push({x:q.x,y:q.y});cx=q.x;cy=q.y;
  };
  if(t.shelf){
    if(e.seated){pts.push({x:aisle(e.seatX),y:SEAT_Y},{x:aisle(e.seatX),y:SHELF_Y});e.seated=false;}
    else if(cy>SHELF_Y+2){clearRow();const l=lane(cx);floorTo({x:l,y:WALK_Y});pts.push({x:l,y:SHELF_Y});}
    pts.push({x:t.x,y:SHELF_Y});return pts;
  }
  if(cy<SHELF_Y+2){
    if(t.seated){pts.push({x:aisle(t.x),y:SHELF_Y},{x:aisle(t.x),y:SEAT_Y},{x:t.x,y:SEAT_Y});return pts;}
    const l=lane(cx);pts.push({x:l,y:SHELF_Y},{x:l,y:WALK_Y});cx=l;cy=WALK_Y;
  }
  clearRow();
  if(t.seated){floorTo({x:aisle(t.x),y:WALK_Y});pts.push({x:aisle(t.x),y:SEAT_Y},{x:t.x,y:SEAT_Y});}
  else if(t.y<FLOOR_Y){floorTo({x:t.x,y:WALK_Y});pts.push({x:t.x,y:t.y});}
  else floorTo(t);
  return pts;
}
// Two Claudes never aim for the same spot: the later one stands a step to the side.
function freeSpot(e,t){
  const taken=(x,y)=>[...chars.values()].some(o=>{if(o===e||o.hidden||o.removed)return false;const p=o.tgt||o;return Math.abs(p.x-x)<8&&Math.abs(p.y-y)<5;});
  if(!taken(t.x,t.y))return;
  for(const s of [9,-9,18,-18]){const x=t.x+s,q={x,y:t.y};if(x>=8&&x<=312&&!taken(x,t.y)&&!FLOOR_BLOCK.concat((TH&&TH.obstacles)||[]).some(o=>crosses(q,q,o))){t.x=x;return;}}
}
// Furniture standing on the floor (a theme's table, TH.obstacles: feet boxes {x0,y0,x1,y1}) is walked
// around, never through; a rug is not an obstacle. Each leg of a path that would cross a box goes
// round its nearer side.
function crosses(a,b,o){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));for(let i=0;i<=n;i++){const k=n?i/n:0,x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k;if(x>o.x0&&x<o.x1&&y>o.y0&&y<o.y1)return true;}return false;}
function around(a,b,o,depth){
  if(depth>3||!crosses(a,b,o))return [b];
  let via;
  if(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)){const y=a.y<=o.y0?o.y0:a.y>=o.y1?o.y1:(Math.abs(a.y-o.y0)<Math.abs(a.y-o.y1)?o.y0:o.y1);via=[{x:a.x,y},{x:b.x,y}];}
  else{const x=a.x<=o.x0?o.x0:a.x>=o.x1?o.x1:(Math.abs(a.x-o.x0)<Math.abs(a.x-o.x1)?o.x0:o.x1);via=[{x,y:a.y},{x,y:b.y}];}
  const out=[];let p=a;[...via,b].forEach(q=>{out.push(...around(p,q,o,depth+1));p=q;});return out;
}
// a spot inside a box (petting the cat asleep under the table) moves out to the box's nearest edge
function outOfFurniture(t){((TH&&TH.obstacles)||[]).forEach(o=>{if(t.x>o.x0&&t.x<o.x1&&t.y>o.y0&&t.y<o.y1){
  const d=[[t.x-o.x0,'x',o.x0],[o.x1-t.x,'x',o.x1],[t.y-o.y0,'y',o.y0],[o.y1-t.y,'y',o.y1]].sort((a,b)=>a[0]-b[0])[0];t[d[1]]=d[2];}});}
function avoidFurniture(start,pts){
  const obs=(TH&&TH.obstacles)||[];if(!obs.length)return pts;
  let out=pts;
  obs.forEach(o=>{const r=[];let p=start;out.forEach(q=>{r.push(...around(p,q,o,0));p=q;});out=r;});
  return out;
}
function setTarget(e,t,instant){
  if(!t.exit&&!t.seated&&!t.shelf)outOfFurniture(t);
  t.key=(t.st||'')+':'+Math.round(t.x)+':'+Math.round(t.y);
  if(e.tgt&&e.tgt.key===t.key)return;
  if(!e.small&&!t.exit&&!t.seated&&!t.shelf&&!instant)freeSpot(e,t);
  e.tgt=t; e.arrived=false;
  if(instant){
    e.path=[];
    if(t.exit){e.hidden=true;e.arrived=true;return;}
    e.hidden=false;e.x=t.x;e.y=t.y;e.arrived=true;
    if(t.seated){e.seated=true;e.seatX=t.x;} else e.seated=false;
    return;
  }
  if(e.hidden&&t.exit){e.arrived=true;e.path=[];return;}
  const start={x:e.hidden?DOOR.x:e.x,y:e.hidden?DOOR.y:e.y};
  e.path=avoidFurniture(start,buildPath(e,t));
}

/* ---------- ingest ---------- */
window.__office=function(d){try{misses=0;lastCall=Date.now();followRoom(d.room);ingest(d,false);}catch(err){console.error('office ingest',err);}};

// The order the desks were dragged into (ui/boards.js), by desk id. An id lasts as long as its
// session, so a new session simply joins at the end of the row.
let deskOrder=[],lastData=null;
// Floors: the desks of the floor on show are `desks`, everyone's are `everyDesk`. A desk keeps its
// floor (floorOf, by desk id, like the order) until you move it or it goes home; a new session takes
// the lowest floor with room, an emptied floor closes, and two floors that fit on one merge, unless a
// desk you placed by hand (floorPinned) stands on the upper one. ui/floors.js has the panel.
let everyDesk=[],floorOf=new Map(),floorPinned=new Set(),curFloor=0,floorCount=1,floorJump=false,floorFade=0;
try{floorOf=new Map(Object.entries(JSON.parse(localStorage.getItem('office.deskFloor')||'{}')).map(([k,v])=>[k,+v]));}catch(e){}
try{floorPinned=new Set(JSON.parse(localStorage.getItem('office.deskPinned')||'[]').map(String));}catch(e){}
function saveFloors(){try{localStorage.setItem('office.deskFloor',JSON.stringify(Object.fromEntries([...floorOf].slice(-64))));localStorage.setItem('office.deskPinned',JSON.stringify([...floorPinned].slice(-64)));}catch(e){}}
function assignFloors(all){
  if(!all.length)return;
  const before=JSON.stringify([...floorOf]),count=[];
  all.forEach(d=>{const id=String(d.id),f=floorOf.get(id);if(f!=null&&(count[f]||0)<MAX_DESKS)count[f]=(count[f]||0)+1;else floorOf.delete(id);});
  all.forEach(d=>{const id=String(d.id);if(floorOf.has(id))return;let f=0;while((count[f]||0)>=MAX_DESKS)f++;floorOf.set(id,f);count[f]=(count[f]||0)+1;});
  let followed=false;const was=curFloor,merged=[];
  for(let f=count.length-1;f>0;f--){
    if(!count[f])continue;
    const dk=all.filter(d=>floorOf.get(String(d.id))===f);if(dk.some(d=>floorPinned.has(String(d.id))))continue;
    for(let g=0;g<f;g++)if(count[g]&&count[g]+count[f]<=MAX_DESKS){
      dk.forEach(d=>floorOf.set(String(d.id),g));count[g]+=count[f];count[f]=0;merged.push([f,g]);
      if(curFloor===f){curFloor=g;followed=true;} // you go down with them
      break;
    }
  }
  const used=[...count.keys()].filter(f=>count[f]);
  all.forEach(d=>{const id=String(d.id);floorOf.set(id,used.indexOf(floorOf.get(id)));});
  floorCount=used.length;
  const at=used.indexOf(curFloor);curFloor=at>=0?at:Math.min(curFloor,floorCount-1);
  if(merged.length||used.some((f,i)=>f!==i)||rooms.length>floorCount)reshapeRooms(was,merged,used); // world/rooms.js
  if(JSON.stringify([...floorOf])!==before)saveFloors();
  return followed;
}
try{const a=JSON.parse(localStorage.getItem('office.deskOrder')||'[]');if(Array.isArray(a))deskOrder=a.map(String);}catch(e){}
function orderDesks(list){const at=id=>{const i=deskOrder.indexOf(String(id));return i<0?1e9:i;};return list.map((d,i)=>[d,i]).sort((a,b)=>at(a[0].id)-at(b[0].id)||a[1]-b[1]).map(a=>a[0]);}

function ingest(d,synthetic){
  const now=Date.now();
  if(!synthetic)lastData=d;
  const real=(d&&Array.isArray(d.desks)?d.desks:[]).filter(x=>x&&x.id!=null);
  // A teammate a Claude has named (CEO, Writer) but who has no desk yet sleeps at an empty desk.
  const have=new Set(real.map(x=>String(x.name||'').toLowerCase()));
  const sleepers=[];
  real.forEach(x=>Object.values(x.peers||{}).forEach(n=>{const k=String(n).toLowerCase();if(n&&!have.has(k)){have.add(k);sleepers.push({id:'asleep:'+n,name:String(n),activity:'asleep',detail:'Not joined yet',steps:[],interns:[],files:[],sent:[],got:[],asleep:true});}}));
  const all=orderDesks(real.filter(x=>x.activity!=='gone'));
  if(assignFloors(all)&&!firstLoad){leaveFloor(-1,1);floorJump=true;}
  settleLooks(all);
  const list=all.filter(x=>floorOf.get(String(x.id))===curFloor);
  everyDesk=all;
  if(!synthetic)gotData=true;
  desks=list;
  const xs=deskXs(list.length);
  const instant=(firstLoad&&!synthetic)||floorJump;floorJump=false;
  const cnt={};
  const live=new Set();
  list.forEach((dk,i)=>{
    const id=String(dk.id); live.add(id);
    const lk=looksFor(id);
    let ch=chars.get(id);
    if(!ch){ch=newChar(id,lk);chars.set(id,ch);if(!instant)greetNewcomer(ch);}
    ch.desk=dk; ch.dx=xs[i]; ch.removed=false;
    let act=String(dk.activity||'think'); if(!STATION[act])act='think';
    // a session out of usage stays knocked out at its desk; one waiting for you calls from its desk
    if(dk.limited)act='limit';else if(dk.waiting&&act!=='gone')act='ask';
    if(ch.act&&ch.act!==act)onActChange(ch,ch.act,act);
    ch.act=act;reactToDesk(ch,dk);
    const st=STATION[act]; const n=cnt[st]=(cnt[st]||0); cnt[st]=n+1;
    const t=posFor(st,n,xs[i]); t.st=st;
    // a Claude on a break runs its own little life (the idle brain); everyone else goes where the work is
    if(act==='idle'){ch.want=null;if(!ch.idle)ch.idle={phase:'pick',t:performance.now()+(instant?2000+Math.random()*4000:300)};if(instant&&!ch.errand)setTarget(ch,t,true);}
    else{ch.want=t;if(!ch.errand)setTarget(ch,t,instant||!!dk.asleep);}
    // interns
    const ins=(Array.isArray(dk.interns)?dk.interns:[]).filter(x=>x&&x.key!=null).slice().sort((a,b)=>(a.startMs||0)-(b.startMs||0)).slice(0,3);
    const keep=new Set();
    ins.forEach((it,j)=>{
      const k=id+'|'+String(it.key); keep.add(k);
      let e=interns.get(k);
      const hsh=hash(k);
      if(!e){e={k,pid:id,x:DOOR.x,y:DOOR.y,path:[],hidden:true,small:true,look:{c:shade(lk.c,.12+(hsh%3)*.08),style:0},blinkT:Math.random()*4};interns.set(k,e);}
      e.label=str(it.label||'Intern',16); e.leaving=false;
      const t2={x:xs[i]-8+j*8,y:126,st:'intern'}; // in front of their own desk, never on a neighbour's
      setTarget(e,t2,instant);
    });
    interns.forEach((e,k)=>{if(e.pid===id&&!keep.has(k)&&!e.leaving){e.leaving=true;setTarget(e,{x:DOOR.x,y:DOOR.y,exit:true,st:'exit'},instant);}});
  });
  // desks that vanished
  chars.forEach((ch,id)=>{if(!live.has(id)){releaseIdle(ch);ch.removed=true;ch.act='gone';setTarget(ch,{x:DOOR.x,y:DOOR.y,exit:true,st:'exit'},instant);}});
  interns.forEach((e)=>{if(!live.has(e.pid)&&!e.leaving){e.leaving=true;setTarget(e,{x:DOOR.x,y:DOOR.y,exit:true,st:'exit'},instant);}});
  renderFloors(); // ui/floors.js
  if(synthetic)return;

  // messages
  if(firstLoad){
    all.forEach(dk=>{
      (dk.sent||[]).forEach(s=>{if(s&&now-(+s.ms||0)>20000)animated.add(norm(s.key));});
      (dk.got||[]).forEach(g=>{if(g&&now-(+g.ms||0)>20000)animated.add(norm(g.key));});
    });
  }
  all.forEach(R_=>{
    (R_.got||[]).forEach(g=>{
      if(!g)return; const k=norm(g.key); if(!k||animated.has(k))return;
      let S_=null,sm=null;
      for(const dk of all){if(dk===R_)continue;const f=(dk.sent||[]).find(s=>s&&keyMatch(norm(s.key),k));if(f){S_=dk;sm=f;break;}}
      animated.add(k);
      if(S_){animated.add(norm(sm.key));pendingSent.delete(norm(sm.key));
        launch(String(S_.id),String(R_.id),str(S_.name||'Claude',12)+' > '+str(R_.name||'Claude',12),str(g.words||sm.words,44),looksFor(String(S_.id)).c);}
      else{const nd=all.find(x=>x!==R_&&g.from&&String(x.name||'').toLowerCase()===String(g.from).toLowerCase());
        if(nd)launch(String(nd.id),String(R_.id),str(nd.name,12)+' > '+str(R_.name||'Claude',12),str(g.words,44),looksFor(String(nd.id)).c);
        else launch(null,String(R_.id),'Message in',str(g.from||'Someone',14)+': '+str(g.words,40),'#2A9D8F');}
    });
  });
  all.forEach(S_=>{(S_.sent||[]).forEach(s=>{if(!s)return;const k=norm(s.key);if(!k||animated.has(k)||pendingSent.has(k))return;pendingSent.set(k,{t:now,id:String(S_.id),words:s.words,to:s.to});});});

  // files: a newly written file is carried to the shelf by the Claude who wrote it (from another floor, it comes in by the door)
  all.forEach(dk=>{
    const id=String(dk.id),col=looksFor(id).c,ch=chars.get(id);
    const marks=(Array.isArray(dk.files)?dk.files:[]).filter(f=>f&&f.kind==='edit').sort((a,b)=>(+a.ms||0)-(+b.ms||0));
    marks.forEach(f=>{
      const k=id+'|'+f.name+'|'+f.ms; if(seenFiles.has(k))return; seenFiles.add(k);
      const fl=floorOf.get(id);
      if(fl===curFloor)shelfOnFile(ch,String(f.name),col,+f.ms||0,instant||now-(+f.ms||0)>90000); // furniture/shelf.js
      else{fileInRoom(fl,String(f.name),col,+f.ms||0);saveRooms();} // world/rooms.js
    });
  });

  // done detection
  all.forEach(dk=>{
    const id=String(dk.id),dm=+dk.doneMs||0,prev=lastDone.get(id);
    if(prev===undefined){lastDone.set(id,dm);return;}
    if(dm>prev){lastDone.set(id,dm);if(now-dm<=30000&&chars.has(id))celebrate(id,dk.doneLine);}
  });
  firstLoad=false;
}

function charPoint(id){
  const ch=chars.get(id);
  if(ch&&!ch.hidden)return {x:ch.x,y:ch.y-14};
  const dx=deskX(id); return dx==null?{x:DOOR.x,y:DOOR.y-14}:{x:dx,y:SEAT_Y-14};
}
function launch(fromId,toId,head,words,col){
  if(!chars.has(fromId)&&!chars.has(toId))return; // between two other floors: nothing to see here
  const t0=Math.max(performance.now(),lastLaunch+1600); lastLaunch=t0;
  planes.push({fromId,toId,head,words,col,t0,dur:1900,hold:2600});
}
function checkPending(){
  const now=Date.now();
  pendingSent.forEach((p,k)=>{
    if(now-p.t<6000)return;
    let matched=false;
    for(const dk of everyDesk){if((dk.got||[]).some(g=>g&&keyMatch(norm(g.key),k))){matched=true;break;}}
    pendingSent.delete(k);
    if(matched||animated.has(k))return;
    animated.add(k);
    const dk=everyDesk.find(d=>String(d.id)===p.id);
    const td=everyDesk.find(d=>p.to&&String(d.id)!==p.id&&String(d.name||'').toLowerCase()===String(p.to).toLowerCase());
    launch(p.id,td?String(td.id):null,str(dk?dk.name:'Claude',12)+' > '+str(td?td.name:(p.to||'outside'),14),str(p.words,44),looksFor(p.id).c);
  });
}

/* ---------- done ---------- */
function setLabels(on){LABELS=on;try{localStorage.setItem('office.labels',on?'1':'0');}catch(e){}}
window.addEventListener('keydown',e=>{if(e.key==='l'||e.key==='L')setLabels(!LABELS);});
// Sound: M mutes and unmutes; the settings panel has the switch and the volume.
// Every sound goes through one master gain; the volume and the mute are remembered (localStorage).
let actx=null,master=null,soundOn=false,volume=70;
try{const v=+localStorage.getItem('office.volume');if(localStorage.getItem('office.volume')!==null&&v>=0&&v<=100)volume=v;soundOn=localStorage.getItem('office.sound')==='on'&&volume>0;}catch(e){}
const gainOf=v=>1.8*(v/100)*(v/100); // heard loudness grows roughly with the square
function soundOut(){return master||actx.destination;}
// the audio context needs a click or key first; a sound left on last time starts at the first one
function wakeAudio(){
  try{if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.connect(actx.destination);}
    master.gain.value=gainOf(volume);actx.resume();}catch(e){}
}
function showSound(){
  if(master&&actx)master.gain.setTargetAtTime(soundOn?gainOf(volume):0,actx.currentTime,.02);
  try{localStorage.setItem('office.volume',String(volume));localStorage.setItem('office.sound',soundOn?'on':'off');}catch(e){}
}
function setSound(on){
  soundOn=on;if(on&&!volume)volume=50; // unmuting at 0 would stay silent
  if(on)wakeAudio();showSound();if(on)chime(.6);
}
function setVolume(v){volume=v;if(!volume)soundOn=false;else if(!soundOn){soundOn=true;wakeAudio();}else wakeAudio();showSound();}
window.addEventListener('keydown',e=>{if((e.key==='m'||e.key==='M')&&!e.ctrlKey&&!e.metaKey)setSound(!soundOn);});
['pointerdown','keydown'].forEach(ev=>window.addEventListener(ev,()=>{if(soundOn&&!actx)wakeAudio();},{once:true,capture:true}));
showSound();
function chime(vol){
  if(!soundOn||!actx)return; vol=vol||1;
  try{const t=actx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.12);g.gain.linearRampToValueAtTime(.16*vol,t+i*.12+.015);g.gain.exponentialRampToValueAtTime(.001,t+i*.12+.45);o.connect(g);g.connect(soundOut());o.start(t+i*.12);o.stop(t+i*.12+.5);});}catch(e){}
}
function celebrate(id,line){
  const ch=chars.get(id); const tp=performance.now();
  if(ch){ch.jumpUntil=tp+1500;ch.starT=tp;setMood(ch,'happy',2600);}
  banners=banners.filter(b=>b.id!==id);
  banners.push({id,line:str(line||'All steps done',46),t0:tp});
  const p=charPoint(id);
  for(let i=0;i<80;i++)confetti.push({x:p.x+(Math.random()-.5)*8,y:p.y-4,vx:(Math.random()-.5)*70,vy:-30-Math.random()*55,c:CONF[i%CONF.length],life:2.4+Math.random(),w:Math.random()<.4?2:1});
  chime(1);
  sceneHighFive(id);
}

/* ---------- polling (script injection works on file://) ---------- */
let tag=null;
function poll(){
  if(tag&&tag.parentNode)tag.parentNode.removeChild(tag);
  const s=document.createElement('script');
  s.src='data.js?t='+Date.now();
  s.onerror=()=>{misses++;if(misses>=3&&desks.length){ingest({desks:[]},true);}};
  document.head.appendChild(s); tag=s;
}
