// The window, drawn live: sky, view, weather, and the kind a theme picks with TH.window:
//   'curtains' (default)  a sash window with curtains: a click on the glass slides the sash up or down,
//                         a click on a curtain draws both curtains closed or open
//   'blinds'              venetian blinds: a click lowers or raises them, and their cord swings
//   'round'               a Japanese round window: a click slides a paper shoji panel across it
//   'porthole'            a space porthole: a click closes or opens the blast shutter
//   'painting'            a framed picture instead of a window: a click fades to the next painting
// Every change is animated (winAmt, curAmt and paintFade ease towards their state). How much light
// gets in (windowLight) dims the sunbeam by day and the window's glow at night.
'use strict';
const WIN={x:295,y:46,r:17}; // the round kinds, centred on the square window's glass
let curtainsShut=false,winAmt=0,curAmt=0,winT=0,cordT=-1e9,paintIdx=0,paintPrev=0,paintT=-1e9;

function windowTick(tp){
  const dt=Math.min(.05,Math.max(0,(tp-winT)/1000)),k=Math.min(1,dt*5);winT=tp;
  winAmt+=((winOpen?1:0)-winAmt)*k; curAmt+=((curtainsShut?1:0)-curAmt)*k;
}
// 0 (no light gets in) .. 1 (all of it)
function windowLight(){
  const st=TH.window||'curtains';
  if(st==='painting')return 0;
  if(st==='curtains')return 1-.85*curAmt;
  if(st==='blinds')return 1-.6*(1-winAmt); // blinds down by default; up when "open"
  if(st==='round')return 1-.45*winAmt;     // the paper shoji still lets light through
  return 1-.95*winAmt;                       // porthole shutter
}
function windowClick(tp){
  const st=TH.window||'curtains';
  if(st==='painting'){paintPrev=paintIdx;paintIdx=(paintIdx+1)%PAINTINGS.length;paintT=tp;blip(520,.06,'triangle');return;}
  winOpen=!winOpen;cordT=tp;blip(winOpen?660:440,.06,'triangle');
}
function curtainClick(tp){
  if((TH.window||'curtains')!=='curtains'){windowClick(tp);return;}
  curtainsShut=!curtainsShut;blip(curtainsShut?300:380,.08,'sine');
}
// A Claude who comes to look out opens what is in the way.
function openForAView(){if(curtainsShut)curtainsShut=false;else if(TH.window==='blinds'&&!winOpen)winOpen=true;else if((TH.window==='round'||TH.window==='porthole')&&winOpen)winOpen=false;}

// What the season tints the day sky with, and how much.
const SEASON_SKY={summer:['#7CC4F0',.2],autumn:['#E8C9A0',.2],winter:['#C8D2DC',.45]};
function windowView(g,tp,n,clip){
  const T=TH,gr=g.createLinearGradient(0,30,0,64);let [a,b]=T.sky(n);
  SEASON=seasonNow();
  const tint=!T.noWeather&&SEASON_SKY[SEASON];if(tint){a=mix(a,tint[0],tint[1]*(1-n));b=mix(b,tint[0],tint[1]*(1-n));}
  gr.addColorStop(0,a);gr.addColorStop(1,b);
  g.save();g.beginPath();clip(g);g.clip();g.fillStyle=gr;g.fillRect(274,28,42,38);T.view(g,tp,n);
  if(!T.noWeather){windowWeather(g,tp,n);windowGlass(g,tp,n);}
  g.restore();
}
// Behind the glass: snow, falling leaves, petals; in summer birds by day and fireflies by night.
function windowWeather(g,tp,n){
  const t=tp/1000;
  if(SEASON==='winter')for(let i=0;i<16;i++)R(g,276+((i*7.3+Math.sin(t*.9+i)*2.5+38)%38),28+((i*13.7+t*7)%38),1,1,'#FFFFFF');
  else if(SEASON==='summer'){
    if(n<.5){const x=270+((t*6)%60);[[0,34],[7,37]].forEach(([d,y])=>{R(g,x+d,y,1,1,'#3A4250');R(g,x+d+1,y+1,1,1,'#3A4250');R(g,x+d+2,y,1,1,'#3A4250');});}
    else for(let i=0;i<6;i++)if(Math.sin(t*1.6+i*2.1)>.2)R(g,278+i*6+Math.sin(t*.5+i)*2,52+(i*5)%10,1,1,'#E8F06A');
  }else{
    const cols=SEASON==='autumn'?['#D9662E','#E8A33A','#B8402E','#E8C24A']:['#F7B6C8','#FFD9E4','#F7B6C8','#FFFFFF'],speed=SEASON==='autumn'?5:4;
    for(let i=0;i<5;i++){const x=276+((i*11-t*speed*.8+380)%38),y=28+((i*19+t*speed)%38),c=cols[i%4];R(g,x,y,2,1,c);R(g,x+(Math.sin(t*2+i)>0?1:0),y+1,1,1,c);}
  }
}
// On the glass itself: frost, a leaf stuck by the rain, spring drops, a summer glare.
const FROST=[];for(let x=276;x<314;x++)FROST.push(hash('frost'+x)%3);
function windowGlass(g,tp,n){
  const t=tp/1000,round=TH.window==='round'||TH.window==='porthole';
  if(SEASON==='winter')FROST.forEach((f,i)=>{const x=276+i,e=Math.abs(x-295)/19,dx=x+.5-WIN.x,bot=round?Math.round(WIN.y+Math.sqrt(Math.max(0,WIN.r*WIN.r-dx*dx))):64,h=f+(round?3:Math.round(e*e*7)+1);
    R(g,x,bot-h,1,h,'rgba(232,242,252,.8)');if(!round){const top=Math.round(e*e*e*5);if(top)R(g,x,30,1,top,'rgba(232,242,252,.8)');}});
  else if(SEASON==='autumn'){R(g,305,50,3,2,'#C8592E');R(g,306,49,1,4,'#C8592E');R(g,306,51,1,1,'#7A3A22');}
  else if(SEASON==='spring'){[[284,0],[305,14]].forEach(([x,k])=>R(g,x,30+((t*8+k)%34),1,2,'rgba(225,242,255,.75)'));R(g,303,38,2,1,'#F7B6C8');}
  else if(n<.6){g.fillStyle=`rgba(255,255,255,${.2*(1-n)})`;for(let i=0;i<14;i++)g.fillRect(286+i,60-i*2,4,2);}
}
function roundPath(r){return g=>g.arc(WIN.x,WIN.y,r,0,Math.PI*2);}
function ring(g,r0,r1,col){for(let y=WIN.y-r1-1;y<=WIN.y+r1+1;y++)for(let x=WIN.x-r1-1;x<=WIN.x+r1+1;x++){const k=Math.hypot(x+.5-WIN.x,y+.5-WIN.y);if(k>r0&&k<=r1)R(g,x,y,1,1,col);}}
// A glint that sweeps across the glass for a moment after the window changes.
function glint(g,tp,x0,y0,w,h){const u=(tp-cordT)/500;if(u<0||u>1)return;g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();
  g.fillStyle='rgba(255,255,255,.35)';const x=x0-10+u*(w+20);for(let i=0;i<h;i++)g.fillRect(Math.round(x+i*.5),y0+i,2,1);g.restore();}

function drawWindow(g,tp,n){
  windowTick(tp);
  const st=TH.window||'curtains';
  if(st==='painting'){drawPainting(g,tp,n);return;}
  if(st==='round'){drawRound(g,tp,n);return;}
  if(st==='porthole'){drawPorthole(g,tp,n);return;}
  const T=TH;
  g.fillStyle='rgba(0,0,0,.14)';g.fillRect(273,29,42,38);
  R(g,274,28,42,38,T.trim); R(g,274,28,42,1,shade(T.trim,.25)); R(g,274,65,42,1,shade(T.trim,-.25));
  windowView(g,tp,n,x=>x.rect(276,30,38,34));
  if(st==='blinds')drawBlinds(g,tp);
  else{
    // the lower sash slides up as the window opens; its rail and handle move with it
    const sy=Math.round(46-winAmt*10);
    R(g,294,30,2,34,T.trim); R(g,276,sy,38,2,T.trim); R(g,276,sy+1,38,1,shade(T.trim,-.2)); R(g,293,sy+2,4,1,shade(T.trim,-.4));
    if(winAmt<.5){g.fillStyle='rgba(255,255,255,.2)';for(let i=0;i<5;i++){g.fillRect(279+i,41-i,1,1);g.fillRect(298+i,61-i,1,1);}}
  }
  glint(g,tp,276,30,38,34);
  if(T.sillPot!==false)drawSillPlant(g,278,64);
  if(st==='curtains')drawCurtains(g,tp);
  beamAndBreeze(g,tp,n,winAmt>.5&&curAmt<.5);
}
// Curtains on a rod with round finials, under a scalloped valance. Open, they are tied back; drawn,
// they meet in the middle. They flutter while the window is open.
function drawCurtains(g,tp){
  const T=TH,c=T.curtain,dk=shade(c,-.22),hi=shade(c,.2),fl=winAmt>.5&&curAmt<.5?Math.round(Math.sin(tp/260)*1.2):0;
  const wl=Math.round(6+curAmt*20),wr=Math.round(4+curAmt*22); // left from 268, right to 319 (it runs off the room); drawn, they meet at 294
  const drape=(x,w,side)=>{R(g,x,26,w,43,c);for(let i=1;i<w;i+=2)R(g,x+i,27,1,41,i%4===1?dk:hi);R(g,x,68,w,1,dk);
    // tie-back when open: the curtain narrows to a band at y 50
    if(curAmt<.3){const t=1-curAmt/.3;R(g,side<0?x:x+w-3,49,3,2,shade(T.knob||'#E0B04A',0));g.globalAlpha=.35*t;R(g,x,51,w,17,shade(c,-.35));g.globalAlpha=1;}};
  drape(268+(fl<0?fl:0),wl+Math.abs(fl),-1);
  drape(320-wr-(fl>0?fl:0),wr+Math.abs(fl),1);
  // rod with finials, then the valance with scallops
  R(g,265,24,55,1,shade(c,-.45)); R(g,264,23,2,3,T.knob||'#E0B04A');
  R(g,266,25,54,3,dk); for(let x=266;x<320;x+=6)R(g,x+1,28,4,1,dk); R(g,266,25,54,1,hi);
}
// Venetian blinds under a head rail: lowered by default, raised when "open"; the slats tilt as they
// move, and the cord's tassel swings for a moment after a pull.
function drawBlinds(g,tp){
  const T=TH,b=T.blinds,low=Math.round(62-winAmt*28),tilt=Math.abs(Math.sin(winAmt*Math.PI))>.3;
  R(g,294,30,2,34,T.trim);
  for(let y=31;y<low;y+=3){R(g,276,y,38,1,b);R(g,276,y+1,38,1,shade(b,-.15));if(!tilt)R(g,276,y+2,38,1,shade(b,-.3));}
  R(g,276,low,38,2,shade(b,-.25)); R(g,276,low,38,1,shade(b,.1));
  R(g,273,27,44,3,shade(b,-.1)); R(g,273,27,44,1,shade(b,.2)); R(g,273,29,44,1,shade(b,-.35));
  const sw=Math.round(Math.sin((tp-cordT)/120)*Math.max(0,2-(tp-cordT)/600));
  R(g,311,30,1,low-26,shade(b,-.4)); R(g,310+sw,low+4,3,3,shade(b,-.45)); R(g,311+sw,low+3,1,1,shade(b,-.45));
}
// A plant pot on the sill, in the room's own kind of plant.
function drawSillPlant(g,x,y){
  const T=TH;R(g,x,y-5,5,5,T.pot);R(g,x,y-5,5,1,T.potHi||shade(T.pot,.2));
  if(T.smallPlant==='cactus'){R(g,x+2,y-10,2,5,T.leafB);R(g,x+1,y-8,1,2,T.leafA);}
  else if(T.smallPlant==='succulent'){R(g,x,y-7,5,2,T.leafB);R(g,x+1,y-8,3,1,T.leafA);}
  else{R(g,x+1,y-9,3,4,T.leafC);R(g,x,y-8,1,2,T.leafC);R(g,x+4,y-7,1,2,T.leafC);}
}
// The Japanese round window: a wooden ring, a thin lattice, and a paper shoji panel that slides across.
function drawRound(g,tp,n){
  const T=TH;
  g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.arc(WIN.x-1,WIN.y+1,WIN.r+2,0,Math.PI*2);g.fill();
  windowView(g,tp,n,roundPath(WIN.r));
  R(g,294,WIN.y-WIN.r,2,2*WIN.r,T.trim);R(g,WIN.x-WIN.r,45,2*WIN.r,2,T.trim);
  if(winAmt>.02){
    // the shoji: translucent paper on a grid of slats, glowing warm at night
    const px=Math.round(WIN.x+WIN.r-winAmt*2*WIN.r);g.save();g.beginPath();roundPath(WIN.r)(g);g.clip();
    g.fillStyle=n>.5?'rgba(255,214,150,.86)':'rgba(246,236,212,.9)';g.fillRect(px,WIN.y-WIN.r,2*WIN.r+2,2*WIN.r);
    for(let x=px;x<WIN.x+WIN.r+2;x+=6)R(g,x,WIN.y-WIN.r,1,2*WIN.r,T.trim);for(let y=WIN.y-WIN.r+5;y<WIN.y+WIN.r;y+=7)R(g,px,y,2*WIN.r+2,1,T.trim);
    R(g,px,WIN.y-WIN.r,2,2*WIN.r,shade(T.trim,-.25));g.restore();
  }
  ring(g,WIN.r,WIN.r+2,T.trim); ring(g,WIN.r+1,WIN.r+2,shade(T.trim,-.25)); ring(g,WIN.r-1,WIN.r,shade(T.trim,.25));
  glint(g,tp,WIN.x-WIN.r,WIN.y-WIN.r,2*WIN.r,2*WIN.r);
  windowDrift(winAmt<.5,n,288,14,40);
  beamAndBreeze(g,tp,n,false);
}
// The porthole: a riveted metal ring, a blast shutter whose two halves close towards the middle,
// and a status light (green open, red shut).
function drawPorthole(g,tp,n){
  const T=TH;
  g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.arc(WIN.x-1,WIN.y+1,WIN.r+3,0,Math.PI*2);g.fill();
  windowView(g,tp,n,roundPath(WIN.r));
  if(winAmt>.02){const hh=Math.round(winAmt*WIN.r);g.save();g.beginPath();roundPath(WIN.r)(g);g.clip();
    R(g,WIN.x-WIN.r,WIN.y-WIN.r,2*WIN.r,hh,shade(T.trim,-.15));R(g,WIN.x-WIN.r,WIN.y+WIN.r-hh,2*WIN.r,hh,shade(T.trim,-.25));
    R(g,WIN.x-WIN.r,WIN.y-WIN.r+hh-1,2*WIN.r,1,shade(T.trim,-.5));R(g,WIN.x-WIN.r,WIN.y+WIN.r-hh,2*WIN.r,1,shade(T.trim,.2));
    for(let x=WIN.x-WIN.r+3;x<WIN.x+WIN.r;x+=6){R(g,x,WIN.y-WIN.r+hh-4,3,1,'#E0B04A');R(g,x,WIN.y+WIN.r-hh+3,3,1,'#E0B04A');}g.restore();}
  ring(g,WIN.r,WIN.r+3,T.trim); ring(g,WIN.r+2,WIN.r+3,shade(T.trim,-.3)); ring(g,WIN.r-1,WIN.r,'rgba(160,220,255,.35)');
  for(let i=0;i<8;i++){const a=i*Math.PI/4;R(g,Math.round(WIN.x+Math.cos(a)*(WIN.r+1.5)-.5),Math.round(WIN.y+Math.sin(a)*(WIN.r+1.5)-.5),1,1,shade(T.trim,.35));}
  const on=winAmt<.5;R(g,WIN.x+WIN.r+3,WIN.y-WIN.r-1,3,3,on?'#5BD08A':'#FF5D5D');R(g,WIN.x+WIN.r+3,WIN.y-WIN.r-1,3,1,on?'#B8F5D0':'#FFB0A8');
  glint(g,tp,WIN.x-WIN.r,WIN.y-WIN.r,2*WIN.r,2*WIN.r);
  beamAndBreeze(g,tp,n,false);
}
// What comes in by an open window, by season: petals, pollen by day and fireflies by night, dead leaves,
// snowflakes. Every room with a real outside gets the same; the porthole and the painting have none.
// The motes in the sunbeam take the season's light (world/loop.js).
const DUST_TINT={spring:'255,236,240',summer:'255,240,190',autumn:'255,214,160',winter:'224,238,255'};
const SEASON_DRIFT={
  spring:{p:.03,life:3.6,vy:3,w:2,cols:()=>['#F7B6C8','#FFD9E4','#FFFFFF']},
  summer:{p:.02,life:2.6,vy:-1,w:1,cols:n=>n>.5?['#E8F06A','#D8E85A']:['#FFE9A8','#FFF6D0']},
  autumn:{p:.03,life:3.4,vy:4,w:2,cols:()=>LEAF_COLS},
  winter:{p:.07,life:2.6,vy:9,w:1,cols:()=>['#FFFFFF','#DCEBF7']},
};
function windowDrift(open,n,x0,span,y0){
  if(!open||TH.noWeather)return;
  const D=SEASON_DRIFT[SEASON];if(Math.random()>=D.p)return;
  const cols=D.cols(n);
  leaves.push({x:x0+Math.random()*span,y:y0+Math.random()*12,vx:-10-Math.random()*14,vy:D.vy,life:D.life,p:Math.random()*6,w:D.w===2&&Math.random()<.5?1:D.w,c:cols[(Math.random()*cols.length)|0]});
}
function beamAndBreeze(g,tp,n,breeze){
  const T=TH,day=(1-n)*(T.beam||0)*windowLight();
  if(day>.01){g.fillStyle=`rgba(255,246,220,${.10*day})`;g.beginPath();g.moveTo(276,85);g.lineTo(314,85);g.lineTo(302,138);g.lineTo(246,138);g.closePath();g.fill();}
  windowDrift(breeze,n,296,14,50);
  if(winAmt>.5&&T.rain&&SEASON!=='winter'&&(T.window||'curtains')==='curtains'&&Math.random()<.3)leaves.push({x:277+Math.random()*36,y:63,vx:0,vy:-8,life:.25,p:0,w:1,c:'rgba(170,195,240,.8)'});
}
// Three calm paintings in a heavy frame with gilded corners and a small picture lamp above (on in the
// evening); a click fades to the next one.
const PAINTINGS=[
  (g,x0,y0,w,h)=>{R(g,x0,y0,w,h,'#C9DCE0');R(g,x0,y0+14,w,5,'#9DB7A8');R(g,x0,y0+19,w,12,'#6F9A7E');
    for(let i=0;i<w;i++){const hh=Math.round(4+3*Math.sin(i/6)+2*Math.sin(i/2.3));R(g,x0+i,y0+19-hh,1,hh,'#7FA48C');}
    R(g,x0+28,y0+5,5,5,'#F2EBD3');R(g,x0+4,y0+24,10,1,'#5A8169');R(g,x0+18,y0+27,14,1,'#5A8169');},
  (g,x0,y0,w,h,tp)=>{R(g,x0,y0,w,h,'#2F4A5A');R(g,x0,y0+22,w,9,'#1F3440');
    R(g,x0+16,y0+2,8,22,'#D7EEF2');for(let y=0;y<22;y+=3)R(g,x0+17+(Math.floor(tp/200+y)%6),y0+2+y,1,2,'#FFFFFF');
    R(g,x0+12,y0+22,16,3,'#BFE3EA');R(g,x0,y0+2,14,18,'#3E6152');R(g,x0+26,y0+4,14,18,'#3E6152');},
  (g,x0,y0,w,h)=>{R(g,x0,y0,w,h,'#F2D9B8');R(g,x0,y0+18,w,13,'#C9A27A');R(g,x0,y0+24,w,7,'#A88358');
    R(g,x0+6,y0+6,7,7,'#F7F0E0');for(let i=0;i<5;i++)R(g,x0+22+i*3,y0+10-i,2,8+i,'#6F5A44');R(g,x0+20,y0+17,18,1,'#6F5A44');},
];
function drawPainting(g,tp,n){
  const T=TH,x0=275,y0=31,w=40,h=31,f=Math.min(1,(tp-paintT)/700);
  g.fillStyle='rgba(0,0,0,.16)';g.fillRect(271,29,46,37);
  R(g,272,28,46,37,T.trim); R(g,272,28,46,1,shade(T.trim,.3)); R(g,274,30,42,33,shade(T.trim,-.3));
  [[272,28],[315,28],[272,62],[315,62]].forEach(([x,y])=>R(g,x,y,3,3,'#D9B45A'));
  g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();
  PAINTINGS[paintIdx](g,x0,y0,w,h,tp);
  if(f<1){g.globalAlpha=1-f;PAINTINGS[paintPrev](g,x0,y0,w,h,tp);g.globalAlpha=1;}
  g.restore();
  // the picture lamp: a brass arm over the frame; its light falls on the canvas in the evening
  R(g,287,25,16,2,'#B8963E'); R(g,294,23,2,2,'#B8963E'); R(g,287,27,16,1,'#8A6A2A');
  if(n>.3){const a=Math.min(1,(n-.3)*2),gr=g.createLinearGradient(0,31,0,46);gr.addColorStop(0,`rgba(255,230,170,${.2*a})`);gr.addColorStop(1,'rgba(255,230,170,0)');g.fillStyle=gr;g.fillRect(x0,y0,w,15);}
}
