// The shelf of files the Claudes carry up: one folder per file, in its writer's colour.
//   - A file has one folder: edited again, the Claude walks up and taps it (it bounces and sparkles)
//     instead of adding a second one.
//   - A new file takes a free place; when the shelf is full, the file left untouched the longest is
//     archived: it flies down into the filing cabinet, whose drawer opens to take it.
//   - Its place is kept while a Claude carries it up (a faint line blinks there), and the old folder
//     stays until the new one arrives.
//   - Nothing is lost on the way: a Claude who leaves, is picked up or takes too long lets its files
//     fly up on their own.
//   - The shelf is remembered (localStorage), so a reload or a session going home keeps it as it was.
//   - A click on a folder shows the file's name above it.
'use strict';
const SHELF=[64,77,90,103,116,204,216,228,240,252,264,276,288,300];
const shelf=new Map();    // slot -> {slot,name,col,ms,t (when it landed),bump (when last touched)}
const shelfOf=new Map();  // file name -> slot
const reserved=new Map(); // slot -> file name, while that file is on its way up
const seenFiles=new Set();
const CABINET={x:29,y:142}; // where archived folders go (furniture/objects.js draws the cabinet)
let cabPulse=0,shelfTag=null;

function saveShelf(){saveRooms();} // every floor has its own shelf (world/rooms.js)

// The place for a file: its own, the one kept for it, a free one, else the one untouched the longest.
function slotFor(name){
  if(shelfOf.has(name))return shelfOf.get(name);
  for(const [s,n] of reserved)if(n===name)return s;
  for(let i=0;i<SHELF.length;i++)if(!shelf.has(i)&&!reserved.has(i))return i;
  const old=[...shelf.values()].filter(f=>!reserved.has(f.slot)).sort((a,b)=>a.ms-b.ms)[0];
  return old?old.slot:0;
}
// A file lands: a folder that was there for another file goes to the cabinet.
function shelfPut(slot,name,col,ms,tp){
  if(reserved.get(slot)===name)reserved.delete(slot);
  const cur=shelf.get(slot);
  if(cur&&cur.name!==name){shelfOf.delete(cur.name);if(tp)flying.push({a:{x:SHELF[slot],y:14},b:CABINET,col:cur.col,t0:tp,dur:750,archive:true});}
  const prev=shelfOf.get(name);if(prev!=null&&prev!==slot)shelf.delete(prev); // it had moved: one folder only
  const same=cur&&cur.name===name;
  shelf.set(slot,{slot,name,col,ms:Math.max(+ms||0,same?cur.ms:0),t:same?cur.t:tp,bump:tp});
  shelfOf.set(name,slot);saveShelf();
}
// A folder flies up from a Claude (or the door) to its place.
function flyUp(from,job,tp,delay){
  const slot=job.slot!=null?job.slot:slotFor(job.name);reserved.set(slot,job.name);
  flying.push({a:{x:from.x,y:from.y-24},b:{x:SHELF[slot],y:11},col:job.col,slot,name:job.name,ms:job.ms,t0:tp+(delay||0),dur:450});
}

// A file was edited (from data.js): quiet ones (on load, or old) go straight up.
function shelfOnFile(ch,name,col,ms,quiet){
  const s=shelfOf.get(name);if(s!=null&&shelf.get(s).ms>=ms)return;
  if(quiet){shelfPut(slotFor(name),name,col,ms,0);return;}
  const tp=performance.now();
  if(!ch||ch.removed||ch.hidden){flyUp({x:DOOR.x,y:DOOR.y},{name,col,ms},tp);return;}
  const jobs=ch.errands=ch.errands||[],same=jobs.find(j=>j.name===name)||(ch.errand&&ch.errand.name===name?ch.errand:null);
  if(same){same.ms=Math.max(same.ms,ms);return;}
  if(jobs.length<3)jobs.push({name,col,ms});else flyUp(ch,{name,col,ms},tp); // a busy Claude: it flies up by itself
}

// Each frame, for each Claude: start the next errand, hand the file up on arrival, never lose one.
function shelfErrands(ch,tp){
  const stuck=ch.removed||ch.held||ch.hidden;
  if(stuck){
    if(ch.errand&&ch.errand.phase==='go')flyUp(ch.hidden?{x:DOOR.x,y:DOOR.y}:ch,ch.errand,tp);
    if(ch.errand&&ch.errand.phase==='go')ch.errand=null;
    (ch.errands||[]).forEach((j,i)=>flyUp(ch.hidden?{x:DOOR.x,y:DOOR.y}:ch,j,tp,150*(i+1)));ch.errands=[];
    return;
  }
  if(!ch.errand&&(ch.errands||[]).length){
    const job=ch.errands.shift(),slot=slotFor(job.name);reserved.set(slot,job.name);
    if(ch.idle){releaseIdle(ch);ch.idle={phase:'pick',t:0};}
    ch.errand={...job,slot,phase:'go',start:tp};setTarget(ch,{x:SHELF[slot],y:89,st:'shelf',shelf:true});
  }
  const er=ch.errand;if(!er)return;
  if(er.phase==='go'&&tp-er.start>15000){flyUp(ch,er,tp);er.phase='place';er.t=tp;return;} // too long on the way
  if(er.phase==='go'&&!ch.path.length&&ch.arrived){er.phase='place';er.t=tp;flyUp(ch,er,tp);}
  else if(er.phase==='place'&&tp-er.t>700){ch.errand=null;if(ch.want){ch.tgt=null;setTarget(ch,ch.want);}else if(ch.idle)ch.idle={phase:'pick',t:0};}
}

// The shelf, the folders in the air, and the name of a clicked folder.
function drawShelf(g,tp){
  shelf.forEach(f=>{if(f.gone)return; // knocked down by the cat (world/cat.js)
    const x=SHELF[f.slot]-5,age=(tp-f.t)/1000,b=(tp-f.bump)/1000;
    const pop=f.t&&age<.35?-Math.round((.35-age)*8):f.bump&&b<.45?-Math.round(Math.sin(b/.45*Math.PI)*2):0;
    drawFolder(g,x,11+pop,f.col,true);
    if(f.bump&&b<2.5&&Math.floor(tp/180)%2){R(g,x+11,9,1,1,'#FFFFFF');R(g,x-2,12,1,1,'#FFFFFF');R(g,x+5,7,1,1,'#FFFFFF');}
  });
  // a place kept for a file on its way up
  reserved.forEach((n,slot)=>{const f=shelf.get(slot);if(f&&f.name===n)return;g.fillStyle=`rgba(255,255,255,${.3+.25*Math.sin(tp/180)})`;g.fillRect(SHELF[slot]-5,17,10,1);});
  flying=flying.filter(fl=>{
    const u=Math.max(0,Math.min(1,(tp-fl.t0)/fl.dur));if(tp<fl.t0)return true;
    const x=fl.a.x+(fl.b.x-fl.a.x)*u,y=fl.a.y+(fl.b.y-fl.a.y)*u-Math.sin(Math.PI*u)*(fl.archive?14:10);
    drawFolder(g,Math.round(x-5),Math.round(y),fl.col,!fl.archive);
    if(u<1)return true;
    if(fl.archive){cabPulse=tp+900;for(let i=0;i<6;i++)confetti.push({x:CABINET.x,y:CABINET.y,vx:(Math.random()-.5)*20,vy:-6-Math.random()*10,c:'#E8E2D0',life:.6,w:1});return false;}
    shelfPut(fl.slot,fl.name,fl.col,fl.ms,tp);
    for(let i=0;i<14;i++)confetti.push({x:SHELF[fl.slot],y:13,vx:(Math.random()-.5)*40,vy:-10-Math.random()*25,c:i%2?fl.col:'#FFFFFF',life:.9,w:1});
    return false;
  });
  if(shelfTag&&tp<shelfTag.until){const f=shelf.get(shelfTag.slot);if(f){
    const t=str(f.name,18),w=pixWidth(t),x=Math.max(2,Math.min(W-w-4,SHELF[f.slot]-(w>>1)));
    R(g,x-2,1,w+3,8,'rgba(0,19,47,.92)');R(g,SHELF[f.slot]-1,9,2,1,'rgba(0,19,47,.92)');pixText(g,t,x,2,'#FFFFFF');}}
}
// a click on the shelf: the folder under the pointer bounces and shows its file's name
function shelfAt(x,y){if(y<7||y>18)return -1;for(const f of shelf.values())if(Math.abs(x-SHELF[f.slot])<=5)return f.slot;return -1;}
function shelfClick(tp){const s=shelfAt(ptr.x,ptr.y);if(s<0)return;const f=shelf.get(s);f.bump=tp;shelfTag={slot:s,until:tp+2600};blip(700,.04,'triangle');}
