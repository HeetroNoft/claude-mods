// undefined
'use strict';
// Desks and chairs, one style per theme (TH.desk). A desk spans x-w .. x+w-1 (w from deskHalf, 17..20,
// so neighbours never touch), its top is at y 103 and its lamp sits at x+10..x+15 (clickable).
// Anything in the middle stays at or below y 100, and anything tall sits left of x-6: the eyes of a
// seated Claude (x-4 and x+3, y 95..98) always show.
'use strict';

function deskLamp(g,x,lit){
  const T=TH;
  R(g,x+10,102,6,2,T.lampPole); R(g,x+12,96,1,6,T.lampPole); R(g,x+10,94,6,2,lit?T.lampShade:shade(T.lampShade,-.5));
  if(lit){R(g,x+11,96,4,1,'#FFF3D6');g.fillStyle=`rgba(${T.lampGlow},.22)`;g.beginPath();g.moveTo(x+10,96);g.lineTo(x+16,96);g.lineTo(x+19,103);g.lineTo(x+7,103);g.closePath();g.fill();}
}
// The back of a laptop, seen from the front of the room: low enough to leave the face clear.
function deskLaptop(g,x,o,body,hi,logo){
  const d=o.dim;
  R(g,x-5,100,10,3,d?'#4A5160':body); R(g,x-5,100,10,1,d?'#5A6170':hi); R(g,x-1,101,2,1,d?'#5A6170':logo);
  R(g,x-6,103,12,1,shade(d?'#4A5160':body,-.25));
  if(!d)R(g,x+2,100,2,2,'#FFE27A');
  if(o.typing&&!d){g.fillStyle='rgba(160,220,255,.3)';g.fillRect(x-6,99,12,1);}
}
function deskMug(g,x,col){if(!deskOff)drawProp(g,'mug',x,99,{col});}
// A boxy monitor seen from behind, standing left of the face (x-w+2 .. x-w+10).
function deskMonitorBack(g,x,w,body,top){
  const mx=x-w+2;
  R(g,mx,93,9,9,body); R(g,mx,93,9,1,shade(body,.25)); R(g,mx+1,95,7,1,shade(body,-.15)); R(g,mx+1,97,7,1,shade(body,-.15));
  R(g,mx+2,102,5,1,shade(body,-.3)); if(top)R(g,mx+2,92,5,1,top);
}

const DESKS={
  // Pixel: a walnut desk with two drawer pedestals.
  wood(g,x,o){
    const T=TH,w=o.w;
    floorShadow(g,x-w+1,116,2*w-2);
    R(g,x-w,103,2*w,3,T.deskTop); R(g,x-w,103,2*w,1,T.deskTopHi); R(g,x-w,105,2*w,1,shade(T.deskTop,-.22));
    R(g,x-w+1,106,2*w-2,10,T.deskFront); R(g,x-6,106,12,10,shade(T.deskFront,-.4));
    [x-w+2,x+w-12].forEach(px=>[107,111].forEach(py=>{R(g,px,py,10,4,T.deskLine);R(g,px+1,py,8,3,shade(T.deskFront,.12));R(g,px+4,py+1,2,1,T.knob);}));
    R(g,x-w+3,101,6,2,'#F4F1EA'); R(g,x-w+4,100,6,1,'#FFFFFF');
    deskMug(g,x-10,'#FFFFFF');
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
  // Claude: a white studio table on slim dark legs; feet and chair show underneath.
  studio(g,x,o){
    const T=TH,w=o.w;
    R(g,x-w+2,116,2*w-4,1,'rgba(0,0,0,.12)'); floorShadow(g,x-w+2,116,2); floorShadow(g,x+w-4,116,2);
    R(g,x-w,103,2*w,2,T.deskTop); R(g,x-w,103,2*w,1,T.deskTopHi); R(g,x-w,105,2*w,1,T.deskLine);
    R(g,x-w+2,106,2,10,T.deskFront); R(g,x+w-4,106,2,10,T.deskFront);
    R(g,x+4,106,10,3,T.deskTop); R(g,x+4,108,10,1,T.deskLine); R(g,x+8,107,2,1,T.knob);
    R(g,x-w+3,100,4,3,T.pot); R(g,x-w+4,97,1,3,T.leafB); R(g,x-w+5,96,1,4,T.leafA); R(g,x-w+6,98,1,2,T.leafB);
    deskMug(g,x-10,T.mug);
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
  // Cosy: a painted cottage desk with a dark wood top, three drawers and a stack of books.
  cottage(g,x,o){
    const T=TH,w=o.w,dw=Math.floor((2*w-6)/3);
    floorShadow(g,x-w+2,116,2*w-4);
    R(g,x-w,102,2*w,3,T.deskTop); R(g,x-w,102,2*w,1,T.deskTopHi); R(g,x-w,104,2*w,1,shade(T.deskTop,-.25));
    R(g,x-w+2,105,2*w-4,11,T.deskFront); R(g,x-w+2,105,2*w-4,1,shade(T.deskFront,-.3));
    for(let i=0;i<3;i++){const px=x-w+3+i*(dw+1);R(g,px,107,dw,5,T.deskLine);R(g,px+1,108,dw-2,3,shade(T.deskFront,.1));R(g,px+(dw>>1)-1,109,2,1,T.knob);}
    R(g,x-w+2,113,2*w-4,1,T.deskLine); R(g,x-w+2,115,3,1,T.deskTop); R(g,x+w-5,115,3,1,T.deskTop);
    [['#9E3D4C',97],['#E0B04A',98],['#4F7F86',96],['#C9B8A0',99]].forEach(([c,top],i)=>{R(g,x-w+1+i*2,top,2,102-top,c);R(g,x-w+1+i*2,top,2,1,shade(c,.3));});
    deskMug(g,x-10,T.mug);
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
  // Neon: a dark gaming desk with a glowing edge, an LED strip and a keyboard that lights up.
  glass(g,x,o){
    const T=TH,w=o.w,on=!o.dim;
    if(on){g.fillStyle='rgba(255,61,203,.2)';g.fillRect(x-w,115,2*w,3);}
    floorShadow(g,x-w+3,116,2*w-6);
    R(g,x-w,103,2*w,2,T.deskTop); R(g,x-w,103,2*w,1,on?'#2DE2E6':T.deskTopHi);
    R(g,x-w+3,105,2*w-6,10,T.deskFront);
    for(let i=0;i<5;i++)R(g,x-w+5+i*3,107,1,5,shade(T.deskFront,.25));
    R(g,x+2,107,w-5,5,shade(T.deskFront,-.3)); R(g,x+3,108,4,1,on?'#2DE2E6':T.deskLine);
    R(g,x-w+3,114,2*w-6,1,on?'#FF3DCB':T.deskLine);
    for(let i=0;i<10;i++){const c=on&&o.typing?`hsl(${(i*36+o.tp/6)%360},90%,62%)`:'#3A2D6E';R(g,x-5+i,104,1,1,c);}
    deskMug(g,x-11,T.mug);
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
  // Japan: a pale hinoki desk on dark lacquered legs with upturned ends, a bonsai and a tea cup.
  zen(g,x,o){
    const T=TH,w=o.w;
    floorShadow(g,x-w+2,116,2*w-4);
    R(g,x-w,103,2*w,2,T.deskTop); R(g,x-w,103,2*w,1,T.deskTopHi); R(g,x-w-1,102,2,1,T.deskTop); R(g,x+w-1,102,2,1,T.deskTop);
    R(g,x-w,105,2*w,1,T.deskLine);
    R(g,x-w+2,106,3,10,T.deskFront); R(g,x+w-5,106,3,10,T.deskFront); R(g,x-w+2,109,2*w-4,2,T.deskFront); R(g,x-w+2,109,2*w-4,1,'#B03A2E');
    R(g,x-w+3,101,7,2,T.pot); R(g,x-w+6,97,1,4,T.stem); R(g,x-w+3,96,4,2,T.leafA); R(g,x-w+6,95,4,2,T.leafB); R(g,x-w+4,95,2,1,T.leafC);
    if(!deskOff){R(g,x-10,100,3,3,'#E8E0D0'); R(g,x-10,101,3,1,'#5E7A6A');}
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
  // Office: a grey laminate cubicle desk with fabric side panels and a beige CRT.
  cubicle(g,x,o){
    const T=TH,w=o.w;
    floorShadow(g,x-w+1,116,2*w-2);
    R(g,x-w,88,2,28,T.partition); R(g,x+w-2,88,2,28,T.partition); R(g,x-w,88,2,1,T.partitionHi); R(g,x+w-2,88,2,1,T.partitionHi);
    R(g,x-w+2,103,2*w-4,3,T.deskTop); R(g,x-w+2,103,2*w-4,1,T.deskTopHi); R(g,x-w+2,105,2*w-4,1,T.deskLine);
    R(g,x-w+2,106,2*w-4,10,T.deskFront); R(g,x+w-12,107,9,8,T.deskLine); R(g,x+w-11,108,7,2,shade(T.deskFront,.1)); R(g,x+w-11,111,7,3,shade(T.deskFront,.1)); R(g,x+w-8,109,2,1,T.knob);
    deskMonitorBack(g,x,w,'#D8CFB8','#C2B89E');
    R(g,x-5,102,10,1,'#D8CFB8'); R(g,x-5,101,10,1,'#EDE6D3');
    if(!deskOff){R(g,x+4,101,5,2,'#FFFFFF'); R(g,x+5,100,4,1,'#F4F1EA');}
    deskLamp(g,x,o.lit);
  },
  // Retro corporate: a stark white desk in a low green partition, with a cream terminal.
  pod(g,x,o){
    const T=TH,w=o.w;
    floorShadow(g,x-w+1,116,2*w-2);
    R(g,x-w,96,2,1,T.partitionHi); R(g,x+w-2,96,2,1,T.partitionHi); R(g,x-w,97,2,19,T.partition); R(g,x+w-2,97,2,19,T.partition);
    R(g,x-w+2,103,2*w-4,2,T.deskTop); R(g,x-w+2,103,2*w-4,1,T.deskTopHi);
    R(g,x-w+2,105,2*w-4,11,T.partition); R(g,x-w+2,105,2*w-4,1,shade(T.partition,-.25)); R(g,x-w+2,110,2*w-4,1,shade(T.partition,.12));
    deskMonitorBack(g,x,w,'#E9E2CC','#D2C9AE');
    R(g,x-5,102,10,1,'#E9E2CC');
    deskLamp(g,x,o.lit);
  },
  // Space: a metal console with blinking lights and a hologram floating on the left.
  console(g,x,o){
    const T=TH,w=o.w,on=!o.dim,t=(o.tp||0)/1000;
    floorShadow(g,x-w+1,116,2*w-2);
    R(g,x-w,103,2*w,3,T.deskTop); R(g,x-w,103,2*w,1,T.deskTopHi); R(g,x-w,105,2*w,1,T.deskLine);
    R(g,x-w+1,106,2*w-2,10,T.deskFront); R(g,x-w+1,106,2*w-2,1,shade(T.deskFront,.2)); R(g,x-w+1,115,2*w-2,1,T.deskLine);
    for(let i=0;i<6;i++){const lit=on&&(Math.floor(t*3+i*1.7)%3)!==0;R(g,x-w+4+i*3,109,2,2,lit?['#5BD08A','#FFB547','#4FC3FF'][i%3]:'#2A3446');}
    R(g,x+3,108,w-6,5,'#0B1626'); if(on)R(g,x+3+Math.floor(t*6)%(w-6),110,1,1,'#5BD08A');
    if(on){g.fillStyle='rgba(90,220,255,.4)';g.fillRect(x-w+2,91,9,9);g.fillStyle='rgba(200,250,255,.35)';for(let y=92;y<99;y+=2)g.fillRect(x-w+3,y,7,1);
      g.fillStyle='rgba(127,232,255,.55)';g.fillRect(x-w+2,91,9,1);g.fillRect(x-w+2,99,9,1);g.fillRect(x-w+4,94+Math.floor(t*2)%4,5,1);}
    R(g,x-w+5,101,3,2,T.deskLine);
    deskLaptop(g,x,o,T.laptop,T.laptopHi,T.logo);
    deskLamp(g,x,o.lit);
  },
};

// Chair backs stop at y 94, just under a seated Claude's head (y 93), so a chair never reads as hair.
const CHAIRS={
  wood(g,x,c){
    R(g,x-5,94,10,1,c); R(g,x-6,95,12,6,c); R(g,x-5,95,10,1,TH.chairHi);
    R(g,x-7,101,14,2,shade(c,-.15)); R(g,x-1,103,2,7,TH.chairLeg); R(g,x-6,110,12,1,TH.chairLeg); R(g,x-6,111,2,1,TH.chairLeg); R(g,x+4,111,2,1,TH.chairLeg);
  },
  studio(g,x,c){
    R(g,x-5,94,10,1,c); R(g,x-6,95,12,6,c); R(g,x-5,95,10,1,TH.chairHi); R(g,x-7,101,14,2,shade(c,-.15));
    R(g,x-6,103,1,9,TH.chairLeg); R(g,x+5,103,1,9,TH.chairLeg);
  },
  cottage(g,x,c){
    const wd=TH.deskTop;
    R(g,x-6,94,2,18,wd); R(g,x+4,94,2,18,wd); R(g,x-6,94,12,1,TH.deskTopHi);
    [96,98].forEach(y=>R(g,x-4,y,8,1,wd));
    R(g,x-7,100,14,3,c); R(g,x-7,100,14,1,TH.chairHi);
  },
  glass(g,x,c){
    R(g,x-6,94,12,7,c); R(g,x-8,95,2,3,c); R(g,x+6,95,2,3,c); R(g,x-4,94,1,7,TH.chairHi); R(g,x+3,94,1,7,TH.chairHi);
    R(g,x-7,101,14,2,shade(c,-.2)); R(g,x-1,103,2,7,TH.chairLeg); R(g,x-6,110,12,1,TH.chairLeg);
  },
  // a floor chair with a lacquered back and a red cushion
  zen(g,x,c){
    R(g,x-6,94,12,7,TH.chairLeg); R(g,x-5,95,10,5,shade(TH.chairLeg,.2));
    R(g,x-8,101,16,3,c); R(g,x-8,101,16,1,TH.chairHi);
  },
};
const CHAIR_OF={cubicle:'wood',pod:'wood',console:'glass'};

function drawDesk(g,x,dk,dim,typing,tp,lampOn){
  const w=deskHalf(desks.length),style=TH.desk||'wood';
  deskOff=!!(fallen&&fallen.kind==='desk'&&fallen.id===String(dk.id)); // knocked off by the cat (world/cat.js)
  DESKS[style](g,x,{dim,typing,tp,w,lit:!dim&&lampOn});deskOff=false;
  if(dim){g.fillStyle='rgba(0,19,47,.38)';g.fillRect(x-w-1,86,2*w+2,32);}
}
function drawChair(g,x,dim){const s=TH.desk||'wood';(CHAIRS[s]||CHAIRS[CHAIR_OF[s]]||CHAIRS.wood)(g,x,dim?shade(TH.chair,-.4):TH.chair);}
