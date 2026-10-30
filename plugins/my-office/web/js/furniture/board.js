// undefined
'use strict';
// The wall board above each desk: icon and name, one pip per plan step, the current step in a
// scrolling pixel line, and a draining bar with the finish time. One frame style per theme (TH.board).
'use strict';

/* ---------- 3x5 pixel font (rows as bits: 4 left, 2 middle, 1 right) ---------- */
const PFONT={
  '0':[7,5,5,5,7],'1':[2,6,2,2,7],'2':[7,1,7,4,7],'3':[7,1,3,1,7],'4':[5,5,7,1,1],'5':[7,4,7,1,7],'6':[7,4,7,5,7],'7':[7,1,1,2,2],'8':[7,5,7,5,7],'9':[7,5,7,1,7],
  A:[2,5,7,5,5],B:[6,5,6,5,6],C:[3,4,4,4,3],D:[6,5,5,5,6],E:[7,4,6,4,7],F:[7,4,6,4,4],G:[3,4,5,5,3],H:[5,5,7,5,5],I:[7,2,2,2,7],J:[1,1,1,5,2],
  K:[5,5,6,5,5],L:[4,4,4,4,7],M:[5,7,7,5,5],N:[6,5,5,5,5],O:[2,5,5,5,2],P:[6,5,6,4,4],Q:[2,5,5,6,3],R:[6,5,6,5,5],S:[3,4,2,1,6],T:[7,2,2,2,2],
  U:[5,5,5,5,7],V:[5,5,5,5,2],W:[5,5,7,7,5],X:[5,5,2,5,5],Y:[5,5,2,2,2],Z:[7,1,2,4,7],
  ' ':[0,0,0,0,0],':':[0,2,0,2,0],'.':[0,0,0,0,2],',':[0,0,0,2,4],'-':[0,0,7,0,0],'+':[0,2,7,2,0],'/':[1,1,2,4,4],'!':[2,2,2,0,2],'?':[6,1,2,0,2],
  "'":[2,2,0,0,0],'(':[1,2,2,2,1],')':[4,2,2,2,4],'%':[5,1,2,4,5],'#':[5,7,5,7,5],'_':[0,0,0,0,7],'&':[2,5,2,5,3],'=':[0,7,0,7,0],
};
const pixPrep=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[·•]/g,'.');
const pixWidth=s=>Math.max(0,pixPrep(s).length*4-1);
function pixText(g,s,x,y,col){
  const t=pixPrep(s);g.fillStyle=col;
  for(let k=0;k<t.length;k++){const rows=PFONT[t[k]]||PFONT['?'];
    for(let j=0;j<5;j++){const b=rows[j];if(b&4)g.fillRect(x+k*4,y+j,1,1);if(b&2)g.fillRect(x+k*4+1,y+j,1,1);if(b&1)g.fillRect(x+k*4+2,y+j,1,1);}}
  return t.length*4-1;
}
// Text that fits shows still; longer text pauses, scrolls to its end, pauses, and starts again.
function pixMarquee(g,s,x,y,w,col,tp,seed){
  const tw=pixWidth(s);
  if(tw<=w){pixText(g,s,x,y,col);return;}
  const span=tw-w,cycle=1800+span*110+1400,t=(tp+(seed||0))%cycle;
  const off=t<1800?0:t<1800+span*110?Math.floor((t-1800)/110):span;
  g.save();g.beginPath();g.rect(x,y,w,5);g.clip();pixText(g,s,x-off,y,col);g.restore();
}

/* ---------- frames ---------- */
// A board spans x-h .. x+h-1 and y 27..63; its face is the inside, x-h+1 .. x+h-2 and y 28..62.
// Every frame casts the same soft shadow down and to the left on the wall.
const BOARD_TOP=27,BOARD_H=37;
function boardShadow(g,x,h){wallShadow(g,x-h,BOARD_TOP,2*h,BOARD_H);}
const BOARDS={
  navy(g,x,h,col){
    boardShadow(g,x,h);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h+1,28,2*h-2,35,TH.boardBg); R(g,x-h+1,28,2*h-2,1,col);
    R(g,x-h+3,27,2,1,TH.knob); R(g,x+h-5,27,2,1,TH.knob);
  },
  paper(g,x,h,col){
    boardShadow(g,x,h);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h+1,28,2*h-2,35,TH.boardBg); R(g,x-h+1,28,2*h-2,2,col);
    R(g,x-1,25,2,3,TH.ink);
  },
  chalk(g,x,h,col){
    boardShadow(g,x,h+1);
    R(g,x-h-1,26,2*h+2,39,TH.boardFrame); R(g,x-h-1,26,2*h+2,1,shade(TH.boardFrame,.25)); R(g,x-h+1,28,2*h-2,35,TH.boardBg);
    R(g,x-h+1,28,2*h-2,1,shade(TH.boardBg,-.25)); R(g,x-h+3,64,2*h-6,2,shade(TH.boardFrame,.15)); R(g,x+h-15,63,5,1,'#F3EEE2'); R(g,x-h+7,63,3,1,col);
  },
  led(g,x,h,col,tp){
    g.fillStyle=rgba(col,.18);g.fillRect(x-h-2,25,2*h+4,41);
    R(g,x-h,27,2*h,37,col); R(g,x-h+1,28,2*h-2,35,TH.boardBg);
    const k=Math.floor((tp||0)/120)%(2*h-4); R(g,x-h+1+k,27,3,1,'#FFFFFF');
  },
  // Japan: a light wooden plank board hung on a cord, with a red seal in the corner.
  plank(g,x,h,col){
    boardShadow(g,x,h);
    R(g,x-8,24,1,3,TH.ink); R(g,x+7,24,1,3,TH.ink);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h+1,28,2*h-2,35,TH.boardBg);
    for(let y=33;y<62;y+=7)R(g,x-h+1,y,2*h-2,1,shade(TH.boardBg,-.06));
    R(g,x-h+1,28,2*h-2,1,col); R(g,x-1,64,2,1,'#C0392B'); R(g,x-1,65,2,2,'#D9483A');
  },
  // Office: a whiteboard in an aluminium frame, with a marker on its ledge.
  white(g,x,h,col){
    boardShadow(g,x,h);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h+1,28,2*h-2,35,TH.boardBg); R(g,x-h+1,28,2*h-2,1,'#FFFFFF');
    R(g,x-h+2,64,2*h-4,1,TH.boardFrame); R(g,x-h+5,63,5,1,col);
  },
  // Retro corporate: a cream terminal with a dark green screen.
  term(g,x,h,col){
    boardShadow(g,x,h);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h,27,2*h,1,shade(TH.boardFrame,.15)); R(g,x-h+1,28,2*h-2,35,TH.boardBg);
    for(let y=29;y<62;y+=2)R(g,x-h+1,y,2*h-2,1,'rgba(0,0,0,.18)');
  },
  // Space: a hologram with scan lines and corner brackets.
  holo(g,x,h,col,tp){
    g.fillStyle=rgba(col,.12);g.fillRect(x-h-1,26,2*h+2,39);
    R(g,x-h,27,2*h,37,TH.boardFrame); R(g,x-h+1,28,2*h-2,35,TH.boardBg);
    const k=Math.floor((tp||0)/90)%35; R(g,x-h+1,28+k,2*h-2,1,'rgba(120,240,255,.18)');
    [[x-h,27,1],[x+h-4,27,-1]].forEach(([bx,by])=>{R(g,bx,by,4,1,col);R(g,bx,by+36,4,1,col);});
    R(g,x-h,27,1,4,col); R(g,x+h-1,27,1,4,col); R(g,x-h,60,1,4,col); R(g,x+h-1,60,1,4,col);
  },
};
function drawBoard(g,x,col,dim,tp){
  const h=boardHalf(desks.length);
  BOARDS[TH.board||'navy'](g,x,h,col,tp);
  if(dim){g.fillStyle='rgba(0,19,47,.45)';g.fillRect(x-h-1,26,2*h+2,40);}
}

/* ---------- contents ---------- */
// Rows: name at y 31, step pips at 39, the current step at 47, time at 55. Everything is laid out
// inside the face with a 2 px margin, and centred where it does not fill the row.
function boardPixels(g,x,dk,now,tp){
  // every text colour is checked against the board face, so it reads on any theme
  const bg=TH.boardBg,col=looksFor(String(dk.id)).c,inf=etaInfo(dk,now),ink=readable(TH.boardInk,bg,5),dimInk=readable(TH.boardDim,bg,3),soft=readable(TH.boardDim,bg,4),off=TH.boardOff;
  const h=boardHalf(desks.length),L=x-h+3,CW=2*h-6,seed=hash(String(dk.id))%5000;
  const centre=(w)=>L+Math.floor((CW-w)/2);
  // row 1: role icon and the desk's name
  const nameCol=readable(col,bg,3.5);
  const ic=drawIcon(g,iconFor(dk),L,31+Math.floor((5-ICONS[iconFor(dk)].length)/2),nameCol);
  pixMarquee(g,dk.name||'Claude',L+ic.w+3,31,CW-ic.w-3,nameCol,tp,seed);
  if(dk.activity==='gone'){pixText(g,'AWAY',centre(pixWidth('AWAY')),47,dimInk);return;}
  // row 2: one pip per step, together as wide as the face: green done, blinking desk colour now, dark to come
  const n=inf.total;
  if(n){
    const gap=n>8?1:2,pw=Math.max(1,Math.floor((CW-gap*(n-1))/n)),x0=centre(n*pw+gap*(n-1));
    inf.steps.forEach((st,i)=>{const px=x0+i*(pw+gap),cur=st===inf.cur;
      // a step ticked in the last 1.6 s flashes white before it settles green
      const fresh=st.doneMs&&now-st.doneMs<1600,c=fresh&&Math.floor(tp/120)%2?'#FFFFFF':st.doneMs?GREEN:cur?(Math.floor(tp/450)%2?col:shade(col,.45)):off;
      if(fresh)R(g,px+((pw-1)>>1),37-Math.floor((now-st.doneMs)/400),1,1,'#FFD84A');
      R(g,px,39,pw,4,c);R(g,px,42,pw,1,st.doneMs?'#3E9A64':cur?shade(col,-.3):shade(off,-.25));
      if(st.doneMs&&pw>=3)R(g,px+((pw-1)>>1),40,1,1,'#E9FFF1');});
  }else{const k=Math.floor(tp/400)%4,x0=centre(13);for(let i=0;i<3;i++)R(g,x0+i*5,40,3,2,i<k?col:off);}
  // row 3: what is being done now
  // what is happening now: the step in progress, and every few seconds what the session is really doing
  const w=dk.waiting,warn=readable(AMBER,bg,3.5),red=readable('#E5484D',bg,3.5),live=dk.detail&&!['idle','gone','asleep'].includes(dk.activity)&&Math.floor((tp+seed)/5000)%3===2;
  if(dk.limited)pixMarquee(g,'OUT OF USAGE',L,47,CW,red,tp,seed);
  else if(w)pixMarquee(g,Math.floor(tp/2600)%2?w.text:(w.kind==='permission'?'NEEDS YOUR OK':w.kind==='question'?'QUESTION FOR YOU':'YOUR TURN'),L,47,CW,Math.floor(tp/500)%2?warn:ink,tp,seed);
  else pixMarquee(g,live?dk.detail:n?(inf.cur?inf.cur.label:'ALL STEPS DONE'):'NO PLAN YET',L,47,CW,live?soft:n&&inf.cur?ink:dimInk,tp,seed);
  // row 4: a draining bar and the finish time; a narrow board shows the time alone, centred
  const T5=19,wide=CW>=T5+20,barW=CW-T5-4,tx=wide?L+CW-T5:centre(T5);
  if(dk.limited){
    // out of usage: a red bar and when it comes back
    const red=readable('#E5484D',bg,3.5),rs=dk.limited.resetsAt?Date.parse(dk.limited.resetsAt):NaN;
    if(wide){R(g,L,56,barW,3,Math.floor(tp/600)%2?'#E5484D':'#B03A2E');R(g,L,56,barW,1,'#FF8A8E');}
    pixText(g,isNaN(rs)?'LIMIT':hhmm(rs),tx,55,red);return;
  }
  if(dk.waiting){
    // waiting for you: how long it has been
    const m=Math.max(0,Math.floor((now-dk.waiting.since)/60000)),t=m<1?'NOW':m<100?m+'M':'99M',warn=readable(AMBER,bg,3.5);
    if(wide){R(g,L,56,barW,3,off);R(g,L,56,Math.max(1,Math.round(barW*Math.min(1,m/30))),3,AMBER);pixText(g,'?',L+barW+1,55,warn);}
    pixText(g,t,wide?tx:centre(pixWidth(t)),55,warn);return;
  }
  if(inf.mode==='paused'){
    // paused while the session waits: the time left, frozen, behind a pause sign
    const fr=Math.max(0,Math.min(1,inf.left/Math.max(60000,inf.fin-(+dk.planMs||now))));
    const pbW=barW-3; // a shorter bar, so the pause sign stands apart from it
    if(wide){R(g,L,56,pbW,3,off);R(g,L,56,Math.max(1,Math.round(pbW*fr)),3,soft);}
    R(g,tx-4,55,1,5,soft);R(g,tx-2,55,1,5,soft);pixText(g,hhmm(inf.fin),tx,55,soft);return;
  }
  if(inf.mode==='ontime'||inf.mode==='late'){
    const span=Math.max(60000,inf.fin-(+dk.planMs||now)),fr=Math.max(0,Math.min(1,inf.left/span));
    const over=inf.left<=0,c=over?(Math.floor(tp/300)%2?'#FF5D5D':AMBER):inf.mode==='late'?AMBER:GREEN;
    if(wide){R(g,L,56,barW,3,off);const w=Math.max(1,Math.round(barW*(over?1:fr)));R(g,L,56,w,3,c);R(g,L,56,w,1,shade(c,.4));}
    pixText(g,hhmm(inf.fin),tx,55,c===GREEN?ink:readable(c,bg,3.5));
  }else if(inf.mode==='finished'){
    if(wide){pixText(g,'DONE',L,55,readable(GREEN,bg,3.5));R(g,L+17,56,3,3,'#FFD84A');R(g,L+18,55,1,5,'#FFD84A');R(g,L+16,57,5,1,'#FFD84A');}
    pixText(g,hhmm(inf.at),tx,55,readable(GREEN,bg,3.5));
  }else{if(wide)R(g,L,56,barW,3,off);pixText(g,'--:--',tx,55,dimInk);}
}
