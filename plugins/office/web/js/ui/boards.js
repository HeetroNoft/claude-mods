// Moving a desk: drag its board along the wall. Dropped on another desk's place it goes there, the
// desks between shift one along, and every Claude walks to its desk's new place.
'use strict';
let boardDrag=null;
function boardAt(x,y){
  if(desks.length<2||y<BOARD_TOP||y>=BOARD_TOP+BOARD_H)return -1;
  const h=boardHalf(desks.length);return deskXs(desks.length).findIndex(dx=>x>=dx-h&&x<dx+h);
}
function slotAt(x){const xs=deskXs(desks.length);let best=0;xs.forEach((dx,i)=>{if(Math.abs(dx-x)<Math.abs(xs[best]-x))best=i;});return best;}
// How far the dragged board has come; null for any other board.
function boardShift(dk){
  const D=boardDrag;if(!D||!D.on||String(dk.id)!==D.id)return null;
  const x=deskXs(desks.length)[desks.indexOf(dk)],h=boardHalf(desks.length);
  return Math.round(Math.max(h-x,Math.min(W-h-x,D.x-D.sx)))||.1; // never 0, so it still counts as dragged
}
// The board in hand, and a bar on the side of the place where it would land.
function drawBoardDrag(g,xs,one){
  const D=boardDrag;if(!D||!D.on)return;
  const i=desks.findIndex(d=>String(d.id)===D.id);if(i<0){boardDrag=null;return;}
  const to=slotAt(D.x),h=boardHalf(desks.length);
  if(to!==i)R(g,to<i?xs[to]-h-3:xs[to]+h+1,BOARD_TOP-1,2,BOARD_H+2,AMBER);
  g.save();g.translate(Math.round(boardShift(desks[i])),0);one(desks[i],xs[i]);g.restore();
}
function moveDesk(id,to){
  const ids=desks.map(d=>String(d.id)),from=ids.indexOf(id);if(from<0||from===to)return false;
  ids.splice(from,1);ids.splice(to,0,id);
  deskOrder=[...ids,...deskOrder.filter(x=>!ids.includes(x))].slice(0,32);
  try{localStorage.setItem('office.deskOrder',JSON.stringify(deskOrder));}catch(e){}
  if(fallen&&fallen.kind==='desk')restoreFallen(); // what the cat knocked off a desk: back with the desk
  ingest(lastData||{desks},true);
  // a Claude napping in its chair is on a break, so nothing sends it after its desk: it gets up
  chars.forEach(ch=>{if(ch.seated&&ch.act==='idle'&&ch.seatX!==ch.dx){releaseIdle(ch);ch.idle={phase:'pick',t:0};}});
  return true;
}
stage.addEventListener('pointerdown',e=>{
  if(overUi(e)||e.button>0)return;
  const p=toWorld(e);if(charAt(p.x,p.y))return;
  const i=boardAt(p.x,p.y);if(i>=0)boardDrag={id:String(desks[i].id),sx:p.x,x:p.x,on:false,pid:e.pointerId};
});
stage.addEventListener('pointermove',e=>{
  const D=boardDrag;if(!D)return;
  D.x=toWorld(e).x;
  if(!D.on&&Math.abs(D.x-D.sx)>3){D.on=true;blip(620,.04,'triangle');try{stage.setPointerCapture(D.pid);}catch(err){}}
});
stage.addEventListener('pointerup',()=>{
  const D=boardDrag;boardDrag=null;if(!D||!D.on)return;
  suppressClickUntil=performance.now()+60;
  blip(moveDesk(D.id,slotAt(D.x))?480:300,.05,'triangle');
});
stage.addEventListener('pointercancel',()=>{boardDrag=null;});
window.addEventListener('keydown',e=>{if(e.key==='Escape')boardDrag=null;});
