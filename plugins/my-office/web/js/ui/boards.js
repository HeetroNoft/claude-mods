// Moving a desk: drag its board along the wall. Dropped on another desk's place it goes there, the
// desks between shift one along, and every Claude walks to its desk's new place.
'use strict';
let boardDrag=null;
function boardHit(x,y){
  if(!desks.length||y<BOARD_TOP||y>=BOARD_TOP+BOARD_H)return -1;
  const h=boardHalf(desks.length);return deskXs(desks.length).findIndex(dx=>x>=dx-h&&x<dx+h);
}
const boardAt=(x,y)=>everyDesk.length<2?-1:boardHit(x,y); // a lone desk has nowhere to go
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
  if(!D.on&&Math.abs(D.x-D.sx)>3){D.on=true;closePlan();blip(620,.04,'triangle');try{stage.setPointerCapture(D.pid);}catch(err){}renderFloors();}
  if(D.on)floorHover(e.clientX,e.clientY);
});
stage.addEventListener('pointerup',e=>{
  const D=boardDrag;boardDrag=null;if(!D||!D.on)return;
  suppressClickUntil=performance.now()+60;
  const f=floorChipAt(e.clientX,e.clientY); // dropped on the panel: to that floor
  blip((f!=null?moveToFloor(D.id,f):moveDesk(D.id,slotAt(D.x)))?480:300,.05,'triangle');
  renderFloors();
});
const dropDrag=()=>{if(boardDrag){boardDrag=null;renderFloors();}};
stage.addEventListener('pointercancel',dropDrag);
window.addEventListener('keydown',e=>{if(e.key==='Escape')dropDrag();});

/* ---------- a board clicked: its plan in detail ---------- */
const planEl=document.getElementById('plan');
let planId=null;
const mins=ms=>{const m=Math.round(Math.max(0,ms)/60000);return m<1?'<1 min':m+' min';};
// A step's time: the estimate, then what it really took (so far, for the step under way; a pause does not count).
function stepTimes(s,dk,now){
  const est=s.estMin?s.estMin+' min':'',at=s.startMs||(s.doneMs?dk.planMs:0);
  if(!at)return est;
  const real=mins((s.doneMs||dk.pausedMs||now)-at);
  return est?est+' → '+real:real;
}
function renderPlan(){
  if(!planId)return;
  const i=desks.findIndex(d=>String(d.id)===planId);if(i<0){closePlan();return;}
  const dk=desks[i],now=Date.now(),inf=etaInfo(dk,now);
  planEl.style.setProperty('--c',looksFor(planId).c);
  let h=`<button class="x" type="button" aria-label="Close">×</button><h3>${esc(str(dk.name||'Claude',24))}</h3>`;
  if(inf.total)h+='<ol>'+inf.steps.map(s=>{const cur=s===inf.cur;return `<li class="${s.doneMs?'done':cur?'cur':''}"><span>${s.doneMs?'✓':cur?'▸':'·'}</span><span>${esc(str(s.label,70))}</span><span>${esc(stepTimes(s,dk,now))}</span></li>`;}).join('')+'</ol>';
  const eta=etaLine(inf)||(inf.mode==='paused'?'Paused while it waits for you':'');if(eta)h+=`<div class="eta">${eta}</div>`;
  if(h!==planEl._h){planEl.innerHTML=h;planEl._h=h;}
  const w=planEl.offsetWidth,x=Math.max(6,Math.min(cssW-w-6,P(deskXs(desks.length)[i])-w/2));
  planEl.style.left=Math.round(x)+'px';planEl.style.top=Math.round(P(BOARD_TOP+BOARD_H)+6)+'px';
}
function openPlan(id){closeCard();planId=id;planEl.classList.remove('open');void planEl.offsetWidth;planEl._h='';planEl.classList.add('open');renderPlan();}
function closePlan(){planId=null;planEl.classList.remove('open');}
function togglePlan(i){const id=String(desks[i].id);if(planId===id)closePlan();else{openPlan(id);blip(620,.03,'triangle');}}
planEl.addEventListener('click',e=>{if(e.target.closest('.x'))closePlan();});
setInterval(renderPlan,1000);
