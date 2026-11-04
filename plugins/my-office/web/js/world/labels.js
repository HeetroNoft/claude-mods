// Label mode (the tag button or ?labels): text drawn on the overlay canvas.
'use strict';
function bubbleBox(p){
  const fsH=Math.max(12,1.9*S*TS),fs=Math.max(13,2.35*S*TS),maxW=P(118);
  font(fs); const lines=wrap(p.words||'',maxW,3); const wW=Math.max(...lines.map(l=>ox.measureText(l).width));
  font(fsH); const head=fit(p.head||'',maxW); const hW=ox.measureText(head).width;
  const pad=fs*.6,w=Math.max(wW,hW)+pad*2,h=fsH+fs*1.2*lines.length+pad*1.6;
  let x=P(p.x)-w/2,y=P(p.y)-h-P(4); x=Math.max(4,Math.min(cssW-4-w,x)); y=Math.max(4,y);
  return {x,y,w,h,fs,fsH,pad,lines,head};
}
function drawBubble(p,a,age){
  const b=bubbleBox(p),{x,y,w,h,fs,fsH,pad}=b,tx=Math.max(x+12,Math.min(x+w-12,P(p.x)));
  ox.save(); ox.globalAlpha=a;
  // it opens from its tail, with a small overshoot
  const u=Math.min(1,age/180)-1,sc=1+u*u*(2.7*u+1.7);ox.translate(tx,y+h);ox.scale(sc,sc);ox.translate(-tx,-(y+h));
  ox.fillStyle='rgba(0,0,0,.25)'; rr(x+2,y+3,w,h,fs*.5); ox.fill();
  ox.fillStyle='#FFFFFF'; rr(x,y,w,h,fs*.5); ox.fill(); ox.lineWidth=2; ox.strokeStyle=p.col; ox.stroke();
  ox.beginPath(); ox.moveTo(tx-6,y+h-1); ox.lineTo(tx,y+h+8); ox.lineTo(tx+6,y+h-1); ox.closePath(); ox.fillStyle='#FFFFFF'; ox.fill(); ox.stroke(); ox.fillRect(tx-5,y+h-3,10,3);
  text(b.head,x+pad,y+pad*.8+fsH/2,fsH,shade(p.col,-.15),'left');
  b.lines.forEach((l,i)=>text(l,x+pad,y+pad*.8+fsH+fs*.15+fs/2+i*fs*1.2,fs,NAVY,'left'));
  ox.restore();
}
function drawFiles(files,now,tp){
  const fs=Math.max(11,1.85*S*TS);
  if(!files.length){text('No files touched yet',P(64),P(24.5),fs,'#8A7A62','center');return;}
  files.forEach(f=>{
    const cx=P(f.sx),cy=P(14.5);
    const str_=f.glow*(f.kind==='edit'?.85:.45)*(f.glow>.95?(.85+.15*Math.sin(tp/260)):1);
    if(str_>.02){const gr=ox.createRadialGradient(cx,cy,P(3),cx,cy,P(12));gr.addColorStop(0,rgba(f.col,0));gr.addColorStop(.35,rgba(f.col,str_));gr.addColorStop(1,rgba(f.col,0));ox.fillStyle=gr;ox.fillRect(cx-P(12),cy-P(12),P(24),P(24));}
    const nm=str(f.name,13);
    text(nm,cx,P(24.6),fs,f.glow>.3?NAVY:'#7C6F5C','center',P(27));
  });
}
function clockIcon(x,y,rad,col){ox.save();ox.strokeStyle=col;ox.lineWidth=Math.max(1.2,rad*.28);ox.beginPath();ox.arc(x,y,rad,0,Math.PI*2);ox.stroke();ox.beginPath();ox.moveTo(x,y);ox.lineTo(x,y-rad*.6);ox.moveTo(x,y);ox.lineTo(x+rad*.5,y);ox.stroke();ox.restore();}
// The board's text in label mode: same rows as the pixel board, sized to the board's width, in the
// board's own ink, every colour checked against the board face.
function drawBoardText(dk,x,now){
  const h=boardHalf(desks.length),bg=TH.boardBg,dim=dk.activity==='gone',col=readable(looksFor(String(dk.id)).c,bg,3.5);
  const ink=readable(TH.boardInk,bg,6),soft=readable(TH.boardDim,bg,3.5),bx=P(x-h+3),bw=P(2*h-6);
  const fs=Math.max(10,Math.min(2.2*S*TS,bw/9)),info=etaInfo(dk,now),wide=h>=24;
  ox.save(); if(dim)ox.globalAlpha=.55;
  text(str(dk.name||'Claude',14).toUpperCase(),bx,P(31.6),fs,col,'left',wide&&info.total?bw*.6:bw);
  if(wide&&info.total)text(info.done+'/'+info.total,bx+bw,P(31.6),fs*.9,soft,'right');
  const by=P(35.2),bh=Math.max(3,P(1.6));
  ox.fillStyle=TH.boardOff; rr(bx,by,bw,bh,bh/2); ox.fill();
  if(info.total){const w=Math.max(bh,bw*info.done/info.total);ox.fillStyle=info.mode==='late'?AMBER:info.mode==='finished'?GREEN:col;rr(bx,by,w,bh,bh/2);ox.fill();}
  // a session out of usage, or waiting for you, says so before anything else
  if(dk.limited||dk.waiting){
    const red=readable('#E5484D',bg,3.5),warn=readable(AMBER,bg,3.5),rs=dk.limited&&dk.limited.resetsAt?Date.parse(dk.limited.resetsAt):NaN;
    if(dk.limited){text('Out of usage',bx,P(41.2),fs*.95,red,'left',bw);text(isNaN(rs)?'Restart to continue':'Resumes at '+hhmm(rs),bx,P(47.6),fs,red,'left',bw);}
    else{const w=dk.waiting,m=Math.max(0,Math.floor((now-w.since)/60000));
      text(w.kind==='permission'?'Needs your approval':w.kind==='question'?'Has a question':'Your turn',bx,P(41.2),fs*.95,warn,'left',bw);
      text(str(w.text,80),bx,P(47.6),fs*.9,ink,'left',bw);text(m<1?'Just now':'Waiting '+about(m*60000),bx,P(53.4),fs*.9,soft,'left',bw);}
    ox.restore();return;
  }
  const cur=info.total?(info.cur?str(info.cur.label,60):'All steps done'):'No plan yet';
  text(cur,bx,P(41.2),fs*.95,info.cur?ink:soft,'left',bw);
  const ty=P(47.6),ix=bx+fs*.5,tx=bx+fs*1.35,tw=bw-fs*1.35;
  if(info.mode==='ontime'){clockIcon(ix,ty,fs*.42,readable(GREEN,bg,3));text('Done by '+hhmm(info.fin),tx,ty,fs,ink,'left',tw);text(about(info.left)+' left',tx,P(53.4),fs*.92,soft,'left',tw);}
  else if(info.mode==='late'){const a=readable(AMBER,bg,3.5);clockIcon(ix,ty,fs*.42,a);
    if(info.left>0){text('Now done by '+hhmm(info.fin),tx,ty,fs,a,'left',tw);text(about(info.late*60000)+' behind plan',tx,P(53.4),fs*.92,a,'left',tw);}
    else{text('Should be done',tx,ty,fs,a,'left',tw);text('Over by '+about(-info.left),tx,P(53.4),fs*.92,a,'left',tw);}}
  else if(info.mode==='stopped'){const c=readable(info.kind==='error'?'#E5484D':AMBER,bg,3.5);clockIcon(ix,ty,fs*.42,c);text((info.kind==='error'?'Ended ':'Interrupted · ')+info.done+' of '+info.total+' at '+hhmm(info.at),tx,ty,fs,c,'left',tw);}
  else if(info.mode==='finished'){const gr=readable(GREEN,bg,3.5);clockIcon(ix,ty,fs*.42,gr);text('Finished at '+hhmm(info.at),tx,ty,fs,gr,'left',tw);}
  else text(info.total?'No time estimate':'',bx,ty,fs*.92,soft,'left',bw);
  if(dim)text('Away',bx+bw,P(58.6),fs,soft,'right');
  ox.restore();
}
function drawClockText(now){
  let latest=null,anyLate=false,worst=null;
  desks.forEach(dk=>{
    const e=dk.eta; if(!e||!e.finishMs||e.allDone)return;
    const inf=etaInfo(dk,now);
    if(latest==null||inf.fin>latest)latest=inf.fin;
    if(inf.mode==='late'){anyLate=true;if(!worst||inf.late>worst.late)worst={late:inf.late,name:str(dk.name||'Claude',10)};}
  });
  const fs=Math.max(13,2.45*S*TS);
  if(latest==null){pill('Nothing in progress',P(160),P(24.6),fs,{bg:'rgba(0,19,47,.92)',border:'#5E7FA3'});return;}
  let t=latest>now?'Everyone done by '+hhmm(latest)+' ('+about(latest-now)+')':'Should all be done · over by '+about(now-latest);
  if(anyLate)t+=' · '+worst.name+' '+about(worst.late*60000)+' behind';
  pill(t,P(160),P(24.6),fs,{bg:anyLate?'#5A3A06':'rgba(0,19,47,.94)',fg:anyLate?AMBER:'#FFFFFF',border:anyLate?AMBER:GREEN,maxW:P(150)});
}
