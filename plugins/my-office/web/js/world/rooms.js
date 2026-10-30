// What belongs to one floor: its shelf of files, its window, what the cat knocked over there. The floor
// on show lives in the usual variables (shelf, winOpen, fallen...); the others wait here, in `rooms`,
// and loadRoom swaps them in. Only the shelves are remembered across a reload, as they always were.
'use strict';
let rooms=[];
const blankRoom=()=>({shelf:[],winOpen:false,curtainsShut:false,paintIdx:0,fallen:null});
function roomAt(f){return rooms[f]||(rooms[f]=blankRoom());}
function saveRooms(){
  roomAt(curFloor).shelf=[...shelf.values()];
  try{localStorage.setItem('office.rooms',JSON.stringify(rooms.map(r=>r.shelf.map(({slot,name,col,ms})=>({slot,name,col,ms})))));}catch(e){}
}
(function loadRooms(){
  const good=f=>f&&f.name&&SHELF[f.slot]!=null;
  const entry=f=>({slot:f.slot,name:String(f.name),col:f.col,ms:+f.ms||0,t:0,bump:0});
  try{
    const old=localStorage.getItem('office.shelf'); // the one shelf from before floors goes on the first floor
    const all=JSON.parse(localStorage.getItem('office.rooms')||(old?`[${old}]`:'[]'));
    rooms=all.map(list=>Object.assign(blankRoom(),{shelf:(Array.isArray(list)?list:[]).filter(good).map(entry)}));
  }catch(e){rooms=[];}
  roomAt(0).shelf.forEach(f=>{if(!shelf.has(f.slot)&&!shelfOf.has(f.name)){shelf.set(f.slot,f);shelfOf.set(f.name,f.slot);}});
})();
// Leaving a floor: folders in the air land at once, and nobody is left carrying its fallen thing.
function saveRoom(f){
  flying.forEach(fl=>{if(!fl.archive)shelfPut(fl.slot,fl.name,fl.col,fl.ms,0);});flying=[];reserved.clear();shelfTag=null;
  const r=roomAt(f);r.shelf=[...shelf.values()];
  Object.assign(r,{winOpen,curtainsShut,paintIdx});
  if(fallen){fallen.fixer=null;if(fallen.state!=='down')fallen.state='down';}
  r.fallen=fallen;
}
function loadRoom(f){
  const r=roomAt(f),hid=bgHide.length;
  shelf.clear();shelfOf.clear();reserved.clear();
  r.shelf.forEach(x=>{shelf.set(x.slot,x);shelfOf.set(x.name,x.slot);});
  winOpen=r.winOpen;curtainsShut=r.curtainsShut;paintIdx=paintPrev=r.paintIdx;paintT=-1e9;
  winAmt=winOpen?1:0;curAmt=curtainsShut?1:0;
  fallen=r.fallen;
  bgHide=fallen&&(fallen.kind==='counter'||fallen.kind==='plant')?[fallen.r]:[];
  if(hid||bgHide.length)buildBg();
  brewUntil=0;funUntil=0;plantT=-1e9;cabPulse=0;
}
// A file written on another floor goes straight onto that floor's shelf: a free place, else the one
// untouched the longest.
function fileInRoom(f,name,col,ms){
  const s=roomAt(f).shelf,at=s.find(x=>x.name===name);
  if(at){if(ms>at.ms){at.ms=ms;at.col=col;}return;}
  let slot=SHELF.findIndex((_,i)=>!s.some(x=>x.slot===i));
  if(slot<0){const old=s.reduce((a,b)=>a.ms<b.ms?a:b);slot=old.slot;s.splice(s.indexOf(old),1);}
  s.push({slot,name,col,ms,t:0,bump:0});
}
// Floors merged or closed: what stood on the upper shelf comes down with the desks, and the rooms
// and the cat follow the floors' new numbers. `was` is the floor that was on show.
function reshapeRooms(was,merged,used){
  saveRoom(was);
  merged.forEach(([f,g])=>roomAt(f).shelf.forEach(x=>fileInRoom(g,x.name,x.col,x.ms)));
  rooms=used.map(f=>roomAt(f));
  loadRoom(curFloor);
  saveRooms();
  if(cat){let c=cat.floor;merged.forEach(([f,g])=>{if(c===f)c=g;});cat.floor=Math.max(0,used.indexOf(c));catOnFloor(true);}
}
