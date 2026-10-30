// The coffee corner: the counter (a decor part, painted once into the room) and the coffee maker on it
// (drawn every frame: it brews when clicked, and its light is on while someone has a coffee). Each
// room has its own (TH.coffeeKind), in the room's colours (TH.counter*, TH.coffee*, TH.mug).
// The counter spans x COUNTER.x..+39, y 158..177; the maker stands on it, y 133..157.
//   drip      a drip brewer with a glass carafe and a hot plate, on a wooden cabinet (pixel)
//   pourover  a ceramic cone over a glass server, a gooseneck kettle, on a sage cabinet (claude)
//   moka      a stovetop moka pot on a hot plate, a jar of beans, open shelves and a gingham curtain (cosy)
//   espresso  a two-group espresso machine with a pressure gauge and a neon underglow, on a bar (neon)
//   tea       an iron kettle on a clay brazier, on a tansu chest of drawers (japan)
//   office    a tall office brewer with a carafe on its warmer, paper cups, on a laminate cabinet (paper)
//   capsule   a small white capsule machine and a rack of capsules, on flush white doors (retro)
//   dispenser a drinks dispenser with a glowing tank, on a riveted metal module (space)

// how far a brew has got (0..1), or -1 when nothing is brewing
const brewU=tp=>tp<brewUntil?Math.min(1,Math.max(0,(2600-(brewUntil-tp))/2600)):-1;
// a cup under a spout, filling while it brews (u -1 when not brewing: a full cup)
function brewCup(g,x,y,u,col){col=col||'#FFFFFF';R(g,x,y,4,3,col);R(g,x+4,y+1,1,1,col);R(g,x+3,y,1,3,shade(col,-.12));
  const f=u<0?3:Math.floor(u*3.99);if(f)R(g,x,y+3-f,3,f,'#7A4A2A');}
// a falling drop while it brews
const cDrip=(g,x,y0,y1,tp,u,c)=>{if(u<0||u>.95)return;const k=(tp/90)%(y1-y0);R(g,x,y0+Math.floor(k),1,1,c||'#6B3A22');};
// steam rising from (x,y)
const cSteam=(g,x,y,tp,on)=>{if(!on)return;for(let i=0;i<2;i++){const k=((tp/160)+i*3)%6;if(Math.floor(tp/240+i)%2)R(g,x+(i?1:-1)*Math.round(Math.sin(tp/300+i)),y-Math.floor(k),1,1,'rgba(255,255,255,.7)');}};
// a light: lit while it brews (blinking) or while someone drinks
const brewLight=(tp,busy,on,off)=>tp<brewUntil?(Math.floor(tp/250)%2?'#FFD84A':on):busy?on:off;

const BREWERS={
  drip(g,tp,busy){const X=COUNTER.x,u=brewU(tp),C=TH.coffee,H=TH.coffeeHi;
    R(g,X+9,142,15,16,C);R(g,X+8,142,17,2,H);R(g,X+9,144,15,1,shade(C,-.3));          // body and lid
    R(g,X+20,145,3,8,'rgba(150,200,255,.3)');const lvl=u<0?6:Math.max(1,6-Math.floor(u*6));R(g,X+20,153-lvl,3,lvl,'rgba(110,180,255,.75)'); // the water tank
    R(g,X+11,146,8,2,shade(C,-.35));R(g,X+14,148,2,1,'#2A1A10');                         // the brew basket
    cDrip(g,X+15,149,152,tp,u);
    R(g,X+11,151,8,6,'rgba(220,240,255,.35)');R(g,X+11,151,8,1,'rgba(255,255,255,.6)');R(g,X+19,152,1,4,'#2B2F3A'); // the carafe
    const f=u<0?3:1+Math.floor(u*3.99);R(g,X+11,157-f,8,f,'#5A3418');R(g,X+12,157-f,1,1,'#8A5A3A');
    R(g,X+9,157,15,1,shade(C,-.4));R(g,X+21,155,2,1,brewLight(tp,busy,'#FF5D5D','#5A2020')); // hot plate and its light
    cSteam(g,X+15,150,tp,u>=0||busy);
  },
  pourover(g,tp,busy){const X=COUNTER.x,u=brewU(tp),K='#2B2A27',W='#FBF8F2';
    // the gooseneck kettle, tilting to pour while it brews
    const tilt=u>=0&&u<.85?1:0;R(g,X+2,151-tilt,7,6+tilt,K);R(g,X+3,150-tilt,5,1,K);R(g,X+4,149-tilt,2,1,'#5A5547');R(g,X+1,152,1,4,K);
    [[9,153],[10,152],[11,150],[12,149]].forEach(([dx,y])=>R(g,X+dx,y-tilt*2,1,1,K));
    if(tilt)R(g,X+13,148,1,1,'rgba(160,200,255,.8)');
    // the cone on the server
    R(g,X+12,146,9,1,W);R(g,X+13,147,7,1,W);R(g,X+14,148,5,1,W);R(g,X+15,149,3,1,ORANGE);R(g,X+12,145,9,1,'#E8DCC4');
    cDrip(g,X+16,150,153,tp,u);
    R(g,X+13,151,7,6,'rgba(220,240,255,.35)');R(g,X+13,151,7,1,'rgba(255,255,255,.6)');
    const f=u<0?3:1+Math.floor(u*3.99);R(g,X+13,157-f,7,f,'#5A3418');R(g,X+20,152,1,3,'rgba(220,240,255,.6)');
    cSteam(g,X+17,145,tp,u>=0||busy);
    R(g,X+23,155,1,1,brewLight(tp,busy,ORANGE,'#C9BFA9'));
  },
  moka(g,tp,busy){const X=COUNTER.x,u=brewU(tp),S='#B8BDC4',Sd='#7C838C',B='#1E1A22',hot=u>=0||busy;
    // a jar of beans, cork lid
    R(g,X+2,150,6,8,'rgba(220,240,255,.35)');R(g,X+2,152,6,6,'#5A3418');[[3,153],[5,155],[6,153],[3,156]].forEach(([dx,y])=>R(g,X+dx,y,1,1,'#8A5A3A'));R(g,X+3,149,4,1,'#C9A577');
    // the hot plate, its ring glowing while it brews
    R(g,X+10,155,13,3,'#2E2A30');R(g,X+12,155,9,1,hot?(Math.floor(tp/300)%2?'#FF5D5D':'#E04040'):'#4A3E44');
    // the pot: an eight-sided base, a waist, the top, a black knob and handle
    R(g,X+13,150,7,5,S);R(g,X+12,151,9,3,S);R(g,X+13,150,1,5,'#D6DBE2');R(g,X+19,151,1,3,Sd);
    R(g,X+14,149,5,1,Sd);
    R(g,X+13,145,7,4,S);R(g,X+12,146,1,2,S);R(g,X+13,145,1,4,'#D6DBE2');R(g,X+19,145,1,4,Sd);
    R(g,X+14,144,5,1,Sd);R(g,X+16,143,2,1,B);R(g,X+11,145,1,2,S);
    R(g,X+20,145,2,1,B);R(g,X+21,146,1,4,B);
    cSteam(g,X+11,144,tp,hot);
  },
  espresso(g,tp,busy){const X=COUNTER.x,u=brewU(tp),M=TH.coffee,Hc='#C9CFE0',P='#FF3DCB';
    R(g,X+7,143,20,15,M);R(g,X+7,142,20,1,Hc);R(g,X+8,141,3,1,'#FFFFFF');R(g,X+12,141,3,1,'#FFFFFF'); // body, cup tray on top
    // the pressure gauge: its needle climbs while it brews
    R(g,X+15,144,4,4,Hc);R(g,X+16,145,2,2,'#0B0818');const nd=u<0?0:Math.min(2,Math.floor(u*3));R(g,X+16+(nd>1?1:0),145+(nd?0:1),1,1,'#FF5D5D');
    // two group heads, a cup under each
    [11,20].forEach((x,i)=>{R(g,X+x-1,149,4,2,Hc);R(g,X+x,151,2,1,'#5A5470');cDrip(g,X+x+1,152,153,tp,i?u:-1,'#3A2010');brewCup(g,X+x-1,153,i?u:-1,'#F4F1EA');});
    R(g,X+7,157,20,1,'#5A5470');
    // the neon underglow, brighter while it works
    g.globalAlpha=u>=0||busy?.9:.45;R(g,X+7,158,20,1,P);g.globalAlpha=1;
    R(g,X+24,145,1,1,brewLight(tp,busy,P,'#3A2050'));
    cSteam(g,X+21,150,tp,u>=0);
  },
  tea(g,tp,busy){const X=COUNTER.x,u=brewU(tp),I='#2E2A26',Ih='#4A423A',hot=u>=0||busy;
    // the clay brazier, its mouth glowing
    R(g,X+10,152,13,6,'#8A5A3A');R(g,X+10,152,13,1,'#A87050');R(g,X+13,154,7,3,hot?(Math.floor(tp/400)%2?'#FF8A3D':'#E06A2A'):'#3A2A20');
    // the iron kettle: hobnailed, a lid with a knob, a spout, a thin handle over it
    R(g,X+11,146,11,6,I);R(g,X+12,145,9,1,I);R(g,X+12,151,9,1,shade(I,-.3));
    for(let y=147;y<151;y+=2)for(let x=X+12+(y%4?1:0);x<X+21;x+=2)R(g,x,y,1,1,Ih);
    R(g,X+14,144,5,1,Ih);R(g,X+16,143,1,1,'#C9A54A');R(g,X+22,147,2,1,I);R(g,X+23,146,1,1,I);
    R(g,X+11,142,1,3,'#5A5047');R(g,X+12,141,9,1,'#5A5047');R(g,X+21,142,1,3,'#5A5047');
    cSteam(g,X+24,145,tp,hot);
  },
  office(g,tp,busy){const X=COUNTER.x,u=brewU(tp),C=TH.coffee,St='#B8BDC4';
    // a stack of paper cups
    for(let i=0;i<4;i++)R(g,X+2,148+i*2,5,2,i%2?'#F4F1EA':'#E8E2D0');R(g,X+2,157,5,1,'#C9C3B4');
    R(g,X+9,138,15,20,C);R(g,X+9,138,15,1,shade(C,.3));R(g,X+10,139,13,5,St);R(g,X+10,139,13,1,'#D6DBE2'); // the brewer, a steel panel
    R(g,X+12,141,2,2,brewLight(tp,busy,'#5BD08A','#2E4A3A'));R(g,X+16,141,2,2,'#E5484D');R(g,X+20,141,2,1,'#2A2E35');
    R(g,X+11,145,11,3,'#14161A');R(g,X+15,148,3,1,'#14161A');cDrip(g,X+16,149,151,tp,u); // the funnel
    R(g,X+11,151,9,6,'rgba(220,240,255,.35)');R(g,X+11,151,9,1,'#FF8A3D');R(g,X+20,152,1,4,'#2A2E35'); // the carafe, an orange-rimmed one
    const f=u<0?2:1+Math.floor(u*3.99);R(g,X+11,157-f,9,f,'#5A3418');
    R(g,X+9,157,15,1,shade(C,-.4));
    cSteam(g,X+15,150,tp,u>=0||busy);
  },
  capsule(g,tp,busy){const X=COUNTER.x,u=brewU(tp),W='#F2F2EC',G='#3E7A63';
    // a rack of capsules
    R(g,X+2,150,7,8,'#D9D9D0');['#3E7A63','#C9B48A','#7C8796'].forEach((c,i)=>{for(let j=0;j<3;j++)R(g,X+3+i*2,151+j*2,1,1,c);});
    // the machine: a white box, a rounded lever on top, a green line, one light
    R(g,X+11,145,12,13,W);R(g,X+12,144,10,1,W);R(g,X+11,146,12,1,G);R(g,X+22,145,1,13,shade(W,-.12));R(g,X+11,157,12,1,shade(W,-.25));
    R(g,X+13,143,7,1,'#D9D9D0');R(g,X+15,149,3,2,shade(W,-.18));cDrip(g,X+16,151,153,tp,u);
    brewCup(g,X+14,153,u,G);
    R(g,X+20,148,1,1,brewLight(tp,busy,'#8EF0C8','#C9C9C0'));
    cSteam(g,X+16,152,tp,u>=0);
  },
  dispenser(g,tp,busy){const X=COUNTER.x,u=brewU(tp),M=TH.coffee,C='#4FC3FF';
    R(g,X+9,141,15,17,M);R(g,X+10,140,13,1,M);R(g,X+10,141,13,1,shade(M,.4));R(g,X+23,142,1,15,shade(M,-.3)); // the cylinder
    // the glowing tank, sloshing
    R(g,X+11,143,11,7,'#0E1420');const lv=u<0?5:Math.max(1,5-Math.floor(u*4));
    for(let x=0;x<11;x++){const h=lv+Math.round(Math.sin(tp/300+x*.8)*.6);R(g,X+11+x,150-h,1,h,'rgba(79,195,255,.7)');}
    R(g,X+11,143,11,1,'rgba(255,255,255,.25)');
    R(g,X+15,150,3,2,'#7C8796');cDrip(g,X+16,152,153,tp,u,C);
    brewCup(g,X+14,153,u,'#C7D0DB');
    for(let x=X+10;x<X+23;x+=2)R(g,x,157,1,1,'#7C8796');                           // the grid tray
    R(g,X+20,152,2,1,brewLight(tp,busy,C,'#1B2433'));
  },
};
function drawCoffee(g,tp,busy){(BREWERS[TH.coffeeKind]||BREWERS.drip)(g,tp,busy);}

// The counter under it, with what lives on top (mugs, a sugar jar). Each painter gets the counter's
// shape already painted: a top (y 158..160), a body (160..177), a toe kick and its shadow.
const COUNTERS={
  drip(d,T,X){ // two panelled wooden doors under a drawer, brass knobs
    R(d,X+3,161,34,3,T.counterFront);R(d,X+17,162,6,1,T.knob);
    [[3],[21]].forEach(([x])=>{R(d,X+x,165,16,10,T.counterFront);R(d,X+x+2,167,12,6,shade(T.counterFront,-.12));R(d,X+x+2,167,12,1,shade(T.counterFront,.15));});
    R(d,X+17,170,2,1,T.knob);R(d,X+21,170,2,1,T.knob);
    drawProp(d,'mug',X+27,154,{col:'#FFFFFF'});drawProp(d,'mug',X+32,154,{col:T.mug});R(d,X+36,154,3,4,'#F4F1EA');R(d,X+36,154,3,1,'#D9D3C4');
  },
  pourover(d,T,X){ // flat sage doors with long pale bar handles, a drawer
    R(d,X+3,161,34,3,T.counterFront);R(d,X+15,162,10,1,'#F4EFE6');
    R(d,X+3,165,16,10,T.counterFront);R(d,X+21,165,16,10,T.counterFront);R(d,X+16,166,1,7,'#F4EFE6');R(d,X+23,166,1,7,'#F4EFE6');
    drawProp(d,'mug',X+27,154,{col:'#FBF8F2'});drawProp(d,'mug',X+33,154,{col:T.mug});
  },
  moka(d,T,X){ // an open shelf of jars on the left, a gingham curtain on the right
    R(d,X+3,162,16,13,shade(T.counter,-.35));R(d,X+3,168,16,1,T.counterHi);
    [['#E0B04A',4],['#F3D9A6',9],['#9E3D4C',14]].forEach(([c,x])=>{R(d,X+x,163,4,5,'rgba(220,240,255,.4)');R(d,X+x,165,4,3,c);R(d,X+x,162,4,1,'#C9A577');});
    [['#7FA070',4],['#E58A6A',10]].forEach(([c,x])=>{R(d,X+x,170,5,5,c);R(d,X+x,170,5,1,shade(c,.3));});
    R(d,X+21,161,16,1,'#5A3E2B');for(let y=162;y<175;y++)for(let x=X+21;x<X+37;x++)R(d,x,y,1,1,(Math.floor((x-X)/2)+Math.floor(y/2))%2?'#F3D9A6':'#E58A9A');
    for(let x=X+22;x<X+37;x+=4)R(d,x,162,1,13,'rgba(0,0,0,.08)');
    drawProp(d,'mug',X+27,154,{col:'#F3D9A6'});drawProp(d,'mug',X+33,154,{col:T.mug});
  },
  espresso(d,T,X){ // a dark bar: neon strips on its edges, slatted front
    for(let x=X+3;x<X+37;x+=3)R(d,x,162,2,13,T.counterFront);
    R(d,X,160,40,1,'#FF3DCB');R(d,X+1,175,38,1,'#2DE2E6');
    drawProp(d,'mug',X+30,154,{col:'#2DE2E6'});drawProp(d,'mug',X+35,154,{col:T.mug});
  },
  tea(d,T,X){ // a tansu: a grid of drawers with black iron pulls and corner fittings
    for(let r=0;r<2;r++)for(let k=0;k<3;k++){const x=X+3+k*12,y=162+r*7;R(d,x,y,10,6,T.counterFront);R(d,x,y,10,1,shade(T.counterFront,.15));R(d,x+3,y+3,4,1,'#1E1A16');R(d,x+4,y+2,2,1,'#1E1A16');}
    [[X+1,160],[X+37,160],[X+1,175],[X+37,175]].forEach(([x,y])=>R(d,x,y,2,2,'#1E1A16'));
    drawProp(d,'teacup',X+28,155);drawProp(d,'teacup',X+33,155);
  },
  office(d,T,X){ // grey laminate doors with long handles, a coffee sign on the wall behind
    R(d,X+3,162,16,13,T.counterFront);R(d,X+21,162,16,13,T.counterFront);R(d,X+16,164,1,8,'#7C8796');R(d,X+23,164,1,8,'#7C8796');
    R(d,X+3,162,16,1,shade(T.counterFront,.12));R(d,X+21,162,16,1,shade(T.counterFront,.12));
    drawProp(d,'mug',X+27,154,{col:'#FFFFFF'});drawProp(d,'mug',X+33,154,{col:T.mug});
    R(d,X+26,140,12,9,'#FFFFFF');R(d,X+26,140,12,1,'#E5484D');R(d,X+28,143,8,1,'#7C8796');R(d,X+28,145,6,1,'#7C8796');R(d,X+31,138,2,2,'#B03A2E'); // "clean your mug" note
  },
  capsule(d,T,X){ // flush white doors: thin seams, a green line under the top, no handles
    R(d,X+1,161,38,1,'#3E7A63');R(d,X+20,162,1,14,shade(T.counter,-.12));R(d,X+3,174,34,1,shade(T.counter,-.08));
    drawProp(d,'mug',X+30,154,{col:T.mug});R(d,X+35,153,3,5,'#7C8796');R(d,X+35,151,3,2,'#5A8A70');R(d,X+36,150,1,1,'#8EF0C8'); // a mug and a tiny plant
  },
  dispenser(d,T,X){ // a riveted metal module: vented panels, a blue status strip, hazard stripes
    R(d,X+3,162,34,10,T.counterFront);for(let y=163;y<171;y+=2){R(d,X+5,y,12,1,shade(T.counterFront,-.25));R(d,X+23,y,12,1,shade(T.counterFront,-.25));}
    for(let x=X+5;x<X+35;x+=6)R(d,x,161,3,1,'#4FC3FF');
    [[X+2,161],[X+37,161],[X+2,173],[X+37,173]].forEach(([x,y])=>R(d,x,y,1,1,shade(T.counterHi,.3)));
    for(let x=X+1;x<X+39;x+=4){R(d,x,174,2,2,'#E0B04A');R(d,x+2,174,2,2,'#1B2433');}
    drawProp(d,'mug',X+29,154,{col:'#C7D0DB'});drawProp(d,'mug',X+34,154,{col:T.mug});
  },
};
function drawCounter(d,T){
  const X=COUNTER.x;
  floorShadow(d,X,178,40);
  R(d,X+1,160,38,18,T.counter);R(d,X,158,40,3,T.counterHi);R(d,X,158,40,1,shade(T.counterHi,.2));R(d,X+1,176,38,2,shade(T.counter,-.3));
  (COUNTERS[T.coffeeKind]||COUNTERS.drip)(d,T,X);
}
