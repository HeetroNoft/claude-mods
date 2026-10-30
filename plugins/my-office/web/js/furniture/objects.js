// Room furniture drawn every frame: cabinet, coffee maker, plant, clock hands.
'use strict';
// The big plant by the window, one kind per room (TH.plantKind). It sways when clicked and in the
// breeze through an open window; everything stays inside x 291..315, y 91..131 (its outline box).
const PLANT_LV=[[303,96,0],[298,100,1],[307,100,1],[295,106,0],[310,106,0],[300,108,1],[305,110,2],[302,102,2]];
function plantPot(g,T){R(g,296,119,14,10,T.pot);R(g,295,118,16,2,T.potHi);R(g,297,118,12,1,'#4A3424');R(g,296,123,14,1,shade(T.pot,-.18));R(g,297,128,12,1,shade(T.pot,-.3));floorShadow(g,296,129,14);}
// sway at height y: the higher the leaf, the more it moves
const swayAt=(w,y)=>Math.round(w*Math.max(0,1-(y-94)/26));
const PLANTS={
  leafy(g,T,w){plantPot(g,T);PLANT_LV.forEach(([x,y,c])=>{const col=[T.leafA,T.leafB,T.leafC][c],s=swayAt(w,y);R(g,x+s,y,4,7,col);R(g,x+1+s,y-2,2,2,col);});R(g,302,104,2,15,T.stem);},
  // a snake plant: tall pointed blades with pale edges
  snake(g,T,w){plantPot(g,T);[[297,100,0],[300,95,1],[303,98,0],[306,94,1],[309,101,0]].forEach(([x,top,c])=>{for(let y=top;y<118;y++){const s=swayAt(w,y);R(g,x+s,y,2,1,c?T.leafB:T.leafA);}
    R(g,x+swayAt(w,top),top-1,1,1,c?T.leafB:T.leafA);for(let y=top+3;y<117;y+=4)R(g,x+swayAt(w,y),y,1,1,'#D6DE8A');});},
  // a fern: fronds arching out of the pot, small leaflets along each
  fern(g,T,w){plantPot(g,T);[[-1,-.9],[-1,-.45],[0,-1],[1,-.45],[1,-.9],[-1,.1],[1,.1]].forEach(([d,lift],i)=>{
    for(let t=0;t<16;t++){const x=303+d*t*.75+(d?0:(t%2?1:0)),y=117-t*(lift<0?-lift:.2)*1.2+(lift>0?t*t*.04:t*t*.035);const s=swayAt(w,y);
      R(g,Math.round(x)+s,Math.round(y),1,1,i%2?T.leafA:T.leafB);if(t>2&&t%2===0)R(g,Math.round(x)+s,Math.round(y)-1,1,1,T.leafC);}});},
  // a neon cactus: a column and two arms, rimmed with a pink glow that breathes
  neon(g,T,w,tp){plantPot(g,T);const gl=.55+.35*Math.sin(tp/600);g.fillStyle=`rgba(255,61,203,${.25*gl})`;g.fillRect(297,96,14,23);
    R(g,301,98,5,20,T.leafA);R(g,302,97,3,1,T.leafA);R(g,297,104,4,3,T.leafA);R(g,297,101,2,3,T.leafA);R(g,306,107,4,3,T.leafA);R(g,308,103,2,4,T.leafA);
    R(g,303,99,1,18,T.leafB);[[300,98],[306,101],[299,106],[307,110]].forEach(([x,y])=>R(g,x,y,1,1,`rgba(255,120,220,${gl})`));},
  // a bonsai on a shallow tray: a twisting trunk and three cloud-pruned pads
  bonsai(g,T,w){floorShadow(g,294,129,18);R(g,294,124,18,4,'#3E2E22');R(g,293,123,20,2,'#5A4330');R(g,295,125,16,1,'#6E8E4A');
    [[302,123],[302,122],[301,121],[300,120],[300,119],[301,118],[302,117],[303,116],[303,115],[302,114],[301,113]].forEach(([x,y])=>R(g,x+swayAt(w,y)*0,y,2,1,'#5A3A26'));
    [[294,108,9,4],[304,104,10,4],[297,99,9,4]].forEach(([x,y,ww,h],i)=>{const s=swayAt(w,y);R(g,x+s,y,ww,h,i===1?T.leafB:T.leafA);R(g,x+1+s,y-1,ww-2,1,T.leafC);});
    R(g,296,111,6,1,'#5A3A26');R(g,304,108,3,1,'#5A3A26');},
  // an office ficus: a thin trunk and a round canopy
  ficus(g,T,w){plantPot(g,T);R(g,302,104,2,14,'#6B4A30');R(g,301,110,1,3,'#6B4A30');
    [[296,96,8,6,0],[303,94,9,6,1],[298,101,13,6,2],[294,103,7,5,1],[306,100,8,5,0]].forEach(([x,y,ww,h,c])=>{const s=swayAt(w,y);R(g,x+s,y,ww,h,[T.leafA,T.leafB,T.leafC][c]);R(g,x+1+s,y,ww-2,1,shade([T.leafA,T.leafB,T.leafC][c],.25));});},
  // a clipped topiary: two neat balls on a straight stem
  topiary(g,T,w){plantPot(g,T);R(g,302,100,2,18,'#6B5A44');
    const ball=(cx,cy,r,c)=>{for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r)R(g,cx+x+swayAt(w,cy),cy+y,1,1,y<-r/2?shade(c,.2):c);};
    ball(303,103,4,T.leafA);ball(303,95,3,T.leafB);},
  // hydroponics: a glass tube with water, roots and leaves, under a small grow light
  hydro(g,T,w,tp){floorShadow(g,296,129,14);R(g,296,124,14,5,T.pot);R(g,296,124,14,1,T.potHi);
    g.fillStyle='rgba(160,220,255,.28)';g.fillRect(298,99,10,25);R(g,298,99,10,1,'rgba(200,240,255,.7)');R(g,298,108,10,16,'rgba(90,180,255,.35)');
    for(let i=0;i<4;i++)R(g,300+i*2,110+((i*3+Math.floor(tp/400))%6),1,4,'#D9C9A0');
    [[299,101,0],[303,100,1],[305,103,2],[300,104,1]].forEach(([x,y,c])=>{const s=swayAt(w,y);R(g,x+s,y,3,4,[T.leafA,T.leafB,T.leafC][c]);});
    R(g,295,93,16,2,'#7C8796');R(g,302,91,2,2,'#7C8796');g.fillStyle=`rgba(255,90,200,${.18+.06*Math.sin(tp/500)})`;g.fillRect(296,95,14,5);},
};
function drawPlant(g,tp){
  const T=TH,k=tp-plantT,breeze=winOpen&&!T.rain&&T.window!=='painting'?Math.sin(tp/420)*1.3:0;
  const w=(k<1400?Math.sin(k/70)*(1-k/1400)*2.2:Math.sin(tp/1700)*.6)+breeze; // a breeze through the open window
  (PLANTS[T.plantKind]||PLANTS.leafy)(g,T,w,tp);
}
// A hand from the clock's centre pixel, one pixel at a time, so it never breaks or doubles.
function clockHand(g,a,len,col){for(let i=0;i<=len;i+=.5)R(g,Math.floor(CLOCK.x+Math.sin(a)*i),Math.floor(CLOCK.y-Math.cos(a)*i),1,1,col);}
// The clock: local time (hour, minute, second hands), and around the face a ring showing the time
// left until the last plan in the room is due: it empties clockwise, amber and blinking when late,
// all green when every plan is finished. A click spins the seconds hand.
function clockPixels(g,now,tp){
  let fin=null,start=null,late=false,allDone=desks.length>0;
  desks.forEach(dk=>{const e=dk.eta;if(!e||!e.finishMs)return;if(!e.allDone){allDone=false;
    if(fin==null||e.finishMs>fin)fin=e.finishMs;const pm=+dk.planMs||now;if(start==null||pm<start)start=pm;if((+e.lateMin||0)>0||e.finishMs<now)late=true;}});
  if(!desks.some(d=>d.eta&&d.eta.finishMs))allDone=false;
  const {x:cx,y:cy}=CLOCK;
  if(fin!=null||allDone){
    const fr=allDone?1:Math.max(0,Math.min(1,(fin-now)/Math.max(60000,fin-start)));
    const col=allDone||!late?GREEN:(Math.floor(tp/300)%2?'#FF5D5D':AMBER);
    for(let y=3;y<=24;y++)for(let x=149;x<=172;x++){const dx=x+.5-cx,dy=y+.5-cy,k=Math.hypot(dx,dy);if(k<=8.5||k>9.5)continue;
      let a=Math.atan2(dx,-dy);if(a<0)a+=Math.PI*2;if(a<=fr*Math.PI*2+.01)R(g,x,y,1,1,col);}
  }
  const lt=new Date(now),sec=lt.getSeconds()+lt.getMilliseconds()/1000,min=lt.getMinutes()+sec/60,hr=(lt.getHours()%12)+min/60;
  const spin=tp-clockSpin<1400?Math.pow(1-(tp-clockSpin)/1400,2)*Math.PI*6:0;
  clockHand(g,hr/12*Math.PI*2,4.5,TH.ink);
  clockHand(g,min/60*Math.PI*2,6.5,TH.ink);
  clockHand(g,Math.floor(sec)/60*Math.PI*2+spin,7,TH.clockRim);
  R(g,160,13,1,1,TH.clockRim);
}
// The cabinet a Claude reads at, one piece of furniture per theme (TH.cabinetKind). Each kind draws
// its body and top, lists its drawers and draws one drawer face; the first drawer slides out while
// someone reads, papers sticking up. Everything that moves only changes colour, never shape, so the
// hover outline (outlinedLive) is traced once per state.
const CABINETS={
  // pixel: a tidy blue-grey filing cabinet, label holders and chrome pulls
  metal:{
    body(g,T){const c=T.cabinet;R(g,20,141,18,36,c);R(g,20,141,18,1,T.cabinetHi);R(g,20,142,1,33,shade(c,.12));R(g,37,142,1,35,shade(c,-.2));R(g,20,175,18,2,shade(c,-.35));
      R(g,22,138,8,3,'#F4F1EA');R(g,23,137,7,1,'#FFFFFF');R(g,22,140,8,1,'#D9D3C4');R(g,31,139,4,2,'#E5484D');R(g,31,139,4,1,'#F07A7E');},
    drawers:[[22,144,14,9],[22,155,14,9],[22,166,14,9]],
    drawer(g,T,x,y,w,h){const d=T.drawer;R(g,x,y,w,h,d);R(g,x,y,w,1,shade(d,.18));R(g,x,y+h-1,w,1,shade(d,-.28));
      R(g,x+4,y+2,6,3,'#C9D2DE');R(g,x+5,y+3,4,1,'#F4F1EA');R(g,x+4,y+6,6,1,'#E6ECF2');R(g,x+4,y+7,6,1,shade(d,-.4));}
  },
  // claude: a cream sideboard on legs, terracotta pulls, notebooks stacked on top
  credenza:{
    body(g,T,tp){R(g,21,173,2,4,'#6E604C');R(g,35,173,2,4,'#6E604C');R(g,20,146,18,27,'#E9E0CC');R(g,37,147,1,26,'#CFC3A8');R(g,20,172,18,1,'#C8BBA0');
      R(g,19,144,20,2,'#C8BBA0');R(g,19,144,20,1,'#F4EEE1');
      R(g,22,142,10,2,'#D97757');R(g,22,142,10,1,'#E8957A');R(g,23,140,9,2,'#3D3929');R(g,23,140,9,1,'#5A5547');R(g,22,138,9,2,'#8FA87E');R(g,22,138,9,1,'#A9BF99');R(g,34,141,2,3,'#D97757');R(g,34,140,2,1,'#F4EEE1');},
    drawers:[[21,148,16,7],[21,156,16,7],[21,164,16,7]],
    drawer(g,T,x,y,w,h){R(g,x,y,w,h,'#F1EADB');R(g,x,y+h-1,w,1,'#D6CAB0');R(g,x+5,y+3,6,1,'#D97757');R(g,x+5,y+4,6,1,'#B85F43');}
  },
  // cosy: a warm wooden dresser, brass knobs, a doily and a candle on top
  dresser:{
    body(g,T,tp){R(g,20,175,3,2,'#5E3B25');R(g,35,175,3,2,'#5E3B25');R(g,20,146,18,29,'#8A5A3B');R(g,37,146,1,29,'#6E4630');R(g,20,174,18,1,'#6E4630');
      R(g,20,143,18,1,'#B98458');R(g,19,144,20,2,'#A8714B');R(g,19,145,20,1,'#8A5A3B');
      R(g,22,143,14,1,'#F4EBDD');for(let x=22;x<36;x+=2)R(g,x,144,1,1,'#F4EBDD');
      const f=Math.floor(tp/170)%3;R(g,28,142,5,1,'#E0B04A');R(g,29,137,3,5,'#F4EBDD');R(g,31,137,1,5,'#D9CDB8');R(g,30,136,1,1,'#3A2A1E');R(g,30,134,1,2,f?'#FFD27A':'#FF9F43');},
    drawers:[[21,148,7,6],[30,148,7,6],[21,156,16,8],[21,166,16,7]],
    drawer(g,T,x,y,w,h){R(g,x,y,w,h,'#9A6644');R(g,x,y,w,1,'#B07A52');R(g,x,y+h-1,w,1,'#6E4630');const ky=y+(h>>1);
      (w>8?[x+3,x+w-4]:[x+(w>>1)]).forEach(kx=>{R(g,kx,ky,1,1,'#E0B04A');R(g,kx,ky+1,1,1,'#9A7428');});}
  },
  // neon: a dark locker traced in neon, each drawer with its own blinking light
  locker:{
    body(g,T,tp){R(g,20,141,18,36,'#1A1433');R(g,20,141,18,1,'#2DE2E6');R(g,20,141,1,34,'#2DE2E6');R(g,37,141,1,34,'#7B5CFF');R(g,20,175,18,2,'#120E26');R(g,21,177,16,1,'#FF3EA5');
      const p=Math.floor(tp/600)%2;R(g,25,137,5,4,'#7B5CFF');R(g,25,137,5,1,p?'#D7CCFF':'#B9A8FF');R(g,29,138,1,3,'#4A3A9A');R(g,24,140,7,1,'#2DE2E6');},
    drawers:[[22,144,14,9],[22,155,14,9],[22,166,14,8]],
    drawer(g,T,x,y,w,h,tp,i){R(g,x,y,w,h,'#241B4A');R(g,x,y,w,1,'#3A2D6E');R(g,x,y+h-1,w,1,'#120E26');R(g,x+4,y+4,7,1,'#2DE2E6');
      const on=Math.floor(tp/450+i*1.7)%3;R(g,x+2,y+2,1,1,on===0?'#FF3EA5':on===1?'#5BD08A':'#3A2D6E');R(g,x+w-3,y+2,1,1,'#3A2D6E');}
  },
  // japan: a stepped tansu chest in dark wood with black iron fittings, a vase on its step
  tansu:{
    body(g,T){R(g,20,141,12,15,'#3E2818');R(g,20,141,12,1,'#5E402B');R(g,31,142,1,13,'#2E1C12');R(g,20,155,18,20,'#3E2818');R(g,20,155,18,1,'#5E402B');R(g,37,156,1,19,'#3A2418');R(g,20,175,18,2,'#2E2219');
      [[20,141],[30,141],[20,155],[36,155],[20,173],[36,173]].forEach(([x,y])=>R(g,x,y,2,2,'#1E1A17'));
      R(g,33,150,3,5,'#B03A2E');R(g,33,150,3,1,'#C9584A');R(g,34,146,1,4,'#3E2E22');R(g,35,145,1,2,'#3E2E22');R(g,33,144,2,1,'#F7B6C8');R(g,35,144,1,1,'#FFD0DC');},
    drawers:[[21,143,10,5],[21,149,10,5],[21,157,15,5],[21,163,15,5],[21,169,15,4]],
    drawer(g,T,x,y,w,h){R(g,x,y,w,h,'#7A5238');R(g,x,y,w,1,'#946646');R(g,x,y+h-1,w,1,'#2E1C12');const cx=x+(w>>1);R(g,cx-1,y+1,3,1,'#1E1A17');R(g,cx-1,y+2,1,1,'#1E1A17');R(g,cx+1,y+2,1,1,'#1E1A17');R(g,cx-1,y+3,3,1,'#2E2A26');}
  },
  // paper: an office filing cabinet under a stack of mail trays, post-its stuck on
  office:{
    body(g,T){const c=T.cabinet;R(g,20,141,18,36,c);R(g,20,141,18,1,T.cabinetHi);R(g,37,142,1,35,shade(c,-.2));R(g,20,175,18,2,shade(c,-.35));
      R(g,21,140,13,1,'#5A606A');R(g,21,138,1,2,'#5A606A');R(g,33,138,1,2,'#5A606A');R(g,22,139,11,1,'#F4F1EA');
      R(g,21,136,13,1,'#5A606A');R(g,21,134,1,2,'#5A606A');R(g,33,134,1,2,'#5A606A');R(g,22,135,11,1,'#FFFFFF');R(g,24,134,6,1,'#9EC5FF');},
    drawers:[[22,143,14,7],[22,151,14,7],[22,159,14,7],[22,167,14,7]],
    drawer(g,T,x,y,w,h,tp,i){const d=T.drawer;R(g,x,y,w,h,d);R(g,x,y+h-1,w,1,shade(d,-.28));R(g,x+5,y+2,4,2,'#5A606A');R(g,x+5,y+2,4,1,shade(d,-.4));R(g,x+1,y+1,3,2,'#FFFFFF');
      if(i===0)R(g,x+w-4,y+1,3,3,'#FFE066');if(i===2)R(g,x+w-4,y+2,3,3,'#FF9EC4');}
  },
  // retro: a library card catalogue in oak, twelve little drawers with brass label frames, a banker's lamp
  catalog:{
    body(g,T){R(g,20,141,18,34,'#8A6340');R(g,20,141,18,1,'#A87B4F');R(g,37,142,1,33,'#6E4E30');R(g,20,175,18,2,'#4E3622');R(g,19,140,20,1,'#A87B4F');
      R(g,24,139,5,1,'#C9A94A');R(g,26,136,1,3,'#C9A94A');R(g,23,134,7,2,'#2E7D4F');R(g,23,134,7,1,'#4FA06E');R(g,30,136,1,1,'#C9A94A');},
    drawers:[0,1,2,3].flatMap(r=>[0,1,2].map(c=>[21+c*6,143+r*8,5,7])),
    drawer(g,T,x,y,w,h){R(g,x,y,w,h,'#B08458');R(g,x,y+h-1,w,1,'#6E4E30');R(g,x+1,y+1,3,2,'#C9A94A');R(g,x+2,y+2,1,1,'#F4EBDD');R(g,x+2,y+4,1,1,'#6E5420');}
  },
  // space: a sealed storage unit, a status screen, hatches and hazard stripes, a beacon on top
  cryo:{
    body(g,T,tp){R(g,20,141,18,36,'#2A3446');R(g,20,141,18,1,'#4A5872');R(g,37,142,1,35,'#1C2433');
      for(let y=173;y<176;y++)for(let x=20;x<38;x++)R(g,x,y,1,1,((x+y)>>1)%2?'#FFC23D':'#1C2433');R(g,20,176,18,1,'#141A26');
      R(g,22,143,14,6,'#0B1A2A');const s=Math.floor(tp/220);for(let i=0;i<4;i++){const w=2+((s+i*3)%9);R(g,23,144+i,w,1,i%2?'#4FC3FF':'#7FE0FF');R(g,23+w,144+i,12-w,1,'#0B1A2A');}
      R(g,33,138,1,3,'#7C8796');R(g,32,141,3,1,'#7C8796');R(g,33,137,1,1,Math.floor(tp/700)%2?'#FF5A5A':'#5A2A2A');},
    drawers:[[21,151,16,10],[21,162,16,10]],
    drawer(g,T,x,y,w,h,tp,i){R(g,x,y,w,h,'#3A4760');R(g,x,y,w,1,'#5A6A88');R(g,x,y+h-1,w,1,'#1C2433');for(let k=0;k<3;k++)R(g,x+3,y+3+k*2,7,1,'#26303F');
      R(g,x+w-4,y+2,2,1,Math.floor(tp/900+i)%2?'#5BD08A':'#2E6A48');R(g,x+w-4,y+5,2,3,'#7C8796');}
  },
};
function drawCabinet(g,open,tp){
  const T=TH,K=CABINETS[T.cabinetKind]||CABINETS.metal;
  K.body(g,T,tp); floorShadow(g,20,177,18);
  K.drawers.forEach(([x,y,w,h],i)=>{if(i||open<=.05)K.drawer(g,T,x,y,w,h,tp,i);});
  if(open>.05){const [x,y,w,h]=K.drawers[0],o=Math.round(Math.min(7,open*7));
    R(g,x,y,o,h,'#1A1410');K.drawer(g,T,x+o,y,w,h,tp,0);
    R(g,x+o+1,y-2,Math.min(3,w-2),3,'#FFFFFF');if(w>6)R(g,x+o+5,y-3,3,4,'#F4F1EA');}
}
