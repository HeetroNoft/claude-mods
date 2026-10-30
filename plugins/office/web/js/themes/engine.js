// The theme registry and the room painter: wall, floor and decor parts a theme can replace.
'use strict';
// Each theme file calls defineTheme(key, baseKey, overrides); startThemes() (in main.js) then picks
// the saved one. A theme is a palette plus switches; see themes/README in CLAUDE.md for every key.
const THEMES={};
function defineTheme(key,base,def){THEMES[key]=Object.assign({},base?THEMES[base]:null,def);}
let THEME_KEYS=[],themeKey='pixel',TH=null;
function savedTheme(){const m=Q.match(/theme=(\w+)/);if(m&&THEMES[m[1]])return m[1];try{const s=localStorage.getItem('office.theme');if(s&&THEMES[s])return s;}catch(e){}return 'pixel';}
function startThemes(){THEME_KEYS=Object.keys(THEMES);themeKey=savedTheme();TH=THEMES[themeKey];}
// Room themes and the static background they paint.
// Each theme is a palette for the room plus a few switches: how dark it gets at night (dark),
// and extras like string lights, rain, neon strips or the office cat. Every room follows the
// local clock: day from 7:00 to 18:00, dusk until 21:00, night until 5:30, dawn until 7:00.
// and extras like string lights, rain, neon strips or the office cat.
function mix(a,b,t){const A=hexRgb(a),B=hexRgb(b);return '#'+A.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(B[i]-v)*t))).toString(16).padStart(2,'0')).join('');}
const SPARK=['1.1.1','.111.','11111','.111.','1.1.1'];
function pattern(g,rows,x,y,col){rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='1')R(g,x+i,y+j,1,1,col);});}
const STARS=[[279,33],[285,40],[289,32],[298,37],[311,33],[308,42],[281,45],[300,31],[313,47],[290,49]];
const CLOUDS=[{x:4,y:36,v:1.6},{x:30,y:43,v:1.1},{x:46,y:33,v:2}];
const BLD=[[276,44,6],[283,39,5],[289,48,6],[296,36,7],[304,45,5],[310,40,5]];
const HOUR_ASKED=(()=>{const m=Q.match(/hour=(\d+(?:\.\d+)?)/);return m?+m[1]:null;})();
let HOUR=HOUR_ASKED; // null follows the clock; ui/settings.js can hold it at day or night
// 0 is full day, 1 full night. ?hour=22 pins the hour, for tests.
function nightness(now){
  let h; if(HOUR!=null)h=HOUR; else{const d=new Date(now);h=d.getHours()+d.getMinutes()/60;}
  if(h>=7&&h<18)return 0; if(h>=21||h<5.5)return 1;
  return h>=18?(h-18)/3:1-(h-5.5)/1.5;
}
// A sky that goes from day through a warm dusk to night: [top, bottom] gradient colours.
function skyOf(n,day,night,dusk){dusk=dusk||['#E9885A','#F7D59C'];
  return n<.5?[mix(day[0],dusk[0],n*2),mix(day[1],dusk[1],n*2)]:[mix(dusk[0],night[0],(n-.5)*2),mix(dusk[1],night[1],(n-.5)*2)];}
// Stars and a moon that fade in with the night (the window view clips them to the glass).
function nightSky(g,tp,n,mx,my){if(n<=.05)return;g.globalAlpha=n;
  STARS.forEach((s,i)=>{if(Math.sin(tp/700+i*1.7)>-.4)R(g,s[0],s[1],1,1,'#FFFFFF');});
  R(g,mx,my,5,5,'#F4F1DE');R(g,mx-1,my+1,7,3,'#F4F1DE');R(g,mx+2,my-1,4,5,'rgba(11,22,56,.85)');g.globalAlpha=1;}
// Rolling hills along the bottom of a window view (x 276..313). hillTop(x) is where the ground is, so
// anything drawn on the hills (a house, a tree) stands on it instead of floating.
function hillTop(x,seed){const u=x+(seed||0);return 56+Math.round(1.6*Math.sin(u/6)+.9*Math.sin(u/2.6));}
function drawHills(g,n,day,night,seed){
  const c=mix(day,night,n),top=mix(shade(day,.18),shade(night,.12),n),far=mix(shade(day,.12),shade(night,-.1),n);
  for(let x=276;x<314;x++){const t=hillTop(x+11,seed)-3;R(g,x,t,1,66-t,far);}          // a paler ridge behind
  for(let x=276;x<314;x++){const t=hillTop(x,seed);R(g,x,t,1,66-t,c);R(g,x,t,1,1,top);}
}
// A sun that sets as the night comes.
function daySun(g,n,x,y,col){if(n>=.95)return;g.globalAlpha=1-n;R(g,x,y+Math.round(n*14),5,5,col);R(g,x-1,y+1+Math.round(n*14),7,3,col);g.globalAlpha=1;}
function drawClouds(g,tp,a,col){if(a<=0)return;g.globalAlpha=a;CLOUDS.forEach(c=>{const x=Math.round(276+((c.x+tp/1000*c.v)%56)-10);R(g,x+2,c.y,7,2,col);R(g,x,c.y+2,12,2,col);});g.globalAlpha=1;}
// The room is painted once per theme: a wall, a floor, then the decor on its own layer so it can get
// a rim. Each piece below is a default; a theme replaces one with T.wallPaint / T.floorPaint, or a
// decor part through T.parts ({door: fn} to redraw it, {rug: null} to leave it out), and adds its
// own with T.decor. The window is drawn live (see drawWindow).
const bg=document.createElement('canvas'); bg.width=W; bg.height=H;
const bgDecor=document.createElement('canvas'); bgDecor.width=W; bgDecor.height=H;
// The wall clock: centred on pixel (160, 13) so every hand starts from one pixel and runs straight.
// Rim at 9.5..10.5, the plan ring at 8.5..9.5, the face inside; rows 3..23, clear of the boards (y 25).
const CLOCK={x:160.5,y:13.5,r:10.5};
// The coffee counter's left edge: left enough that the buttons over the room's bottom right never cover it.
const COUNTER={x:240};
function paintWall(g,T){
  R(g,0,0,W,84,T.wall);
  for(let x=0;x<W;x+=10)R(g,x,2,1,67,T.stripe);
  R(g,0,0,W,2,T.wallTop);
  R(g,0,69,W,1,T.wainHi); R(g,0,70,W,14,T.wain); R(g,0,70,W,1,T.wainEdge);
  for(let x=3;x<W;x+=16){R(g,x,73,12,8,T.panel);R(g,x,73,12,1,T.panelEdge);}
  R(g,0,83,W,2,T.base);
}
function paintFloor(g,T){
  for(let y=85,row=0;y<H;y+=6,row++){
    R(g,0,y,W,6,row%2?T.floorA:T.floorB); R(g,0,y+5,W,1,T.seam);
    const off=(row*23)%40; for(let x=off;x<W;x+=40)R(g,x,y,1,5,T.seam);
    for(let i=0;i<14;i++){const gx=(hash('g'+row+'_'+i)%W);R(g,gx,y+1+(i%3),3,1,row%2?T.grainA:T.grainB);}
  }
}
const PARTS={
  rug(d,T){
    R(d,147,140,88,28,T.rugEdge); R(d,149,142,84,24,T.rugMid); R(d,151,144,80,20,T.rugIn);
    for(let i=0;i<7;i++){const cx=158+i*11;R(d,cx,152,3,1,T.rugDot);R(d,cx+1,151,1,3,T.rugDot);}
    R(d,153,146,76,1,T.rugLine); R(d,153,161,76,1,T.rugLine);
    for(let y=141;y<168;y+=2){R(d,145,y,2,1,T.rugDot);R(d,235,y,2,1,T.rugDot);}
  },
  sill(d,T){R(d,272,64,46,3,T.sill); R(d,272,64,46,1,T.sillHi);},
  door(d,T){
    R(d,3,38,25,46,T.doorFrame); R(d,5,40,21,44,T.door);
    R(d,8,43,15,14,T.doorPanel); R(d,9,44,13,12,T.doorPanelHi); R(d,8,61,15,19,T.doorPanel); R(d,9,62,13,17,T.doorPanelHi);
    R(d,22,63,2,2,T.knob); R(d,22,63,1,1,shade(T.knob,.5));
    R(d,5,45,1,3,shade(T.doorFrame,-.35)); R(d,5,74,1,3,shade(T.doorFrame,-.35)); R(d,6,79,19,3,shade(T.door,-.15));
  },
  sign(d,T){R(d,1,30,29,7,T.sign); R(d,1,36,29,1,T.signLine);},
  shelves(d,T){[[6,122],[198,314]].forEach(([a,b])=>{R(d,a,18,b-a,2,T.shelf);R(d,a,18,b-a,1,T.shelfHi);R(d,a,20,b-a,1,T.shelfLo);R(d,a+6,21,2,3,T.shelfLo);R(d,b-8,21,2,3,T.shelfLo);});},
  clock(d,T){
    const {x:cx,y:cy,r}=CLOCK;
    for(let y=2;y<=25;y++)for(let x=148;x<=173;x++){const k=Math.hypot(x+.5-cx,y+.5-cy);if(k<=r){d.fillStyle=k>r-1?T.clockRim:k>r-2?T.clockRing:T.clockFace;d.fillRect(x,y,1,1);}}
    // twelve hour marks; the quarters are longer and darker
    for(let h=0;h<12;h++){const a=h/12*Math.PI*2,q=h%3===0,c=q?T.ink:mix(T.ink,T.clockFace,.5);
      for(let i=q?6:7;i<=8;i+=.5)R(d,Math.floor(cx+Math.sin(a)*i),Math.floor(cy-Math.cos(a)*i),1,1,c);}
    R(d,159,12,3,3,mix(T.clockFace,T.ink,.12));
  },
  plant(d,T){
    R(d,4,170,10,8,T.pot); R(d,3,169,12,2,T.potHi); R(d,4,173,10,1,shade(T.pot,-.15));
    if(T.smallPlant==='cactus'){R(d,7,156,4,13,T.leafB);R(d,8,155,2,1,T.leafB);R(d,4,160,3,2,T.leafB);R(d,4,158,2,2,T.leafB);R(d,11,162,3,2,T.leafB);R(d,12,159,2,3,T.leafB);
      R(d,8,157,1,11,T.leafA);[[7,159],[10,163],[7,166]].forEach(([x,y])=>R(d,x,y,1,1,'#F4F1EA'));R(d,8,153,2,2,'#FF8FB8');}
    else if(T.smallPlant==='succulent'){[[4,165,7],[3,167,9],[6,163,5]].forEach(([x,y,w],i)=>R(d,x+1,y,w+1,2,i%2?T.leafA:T.leafB));R(d,8,162,2,1,T.leafC);[[5,166],[10,166],[8,164]].forEach(([x,y])=>R(d,x,y,1,1,shade(T.leafB,.35)));}
    else{R(d,5,162,3,7,T.leafA); R(d,9,160,3,9,T.leafB); R(d,7,164,2,5,T.leafC); R(d,10,157,2,2,'#FF8FB8'); R(d,10,157,1,1,'#FFD84A');}
  },
  counter(d,T){drawCounter(d,T);}, // furniture/coffee.js: one per room (TH.coffeeKind)
};
// The shadow each wall part casts, drawn on the wall before the decor goes on.
const PART_SHADOWS={
  door:g=>wallShadow(g,3,38,25,46), sign:g=>wallShadow(g,1,30,29,7),
  shelves:g=>{wallShadow(g,6,18,116,3);wallShadow(g,198,18,116,3);},
  clock:g=>{g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.arc(CLOCK.x-1,CLOCK.y+1,CLOCK.r,0,Math.PI*2);g.fill();},
};
// A light switch by the door and two sockets low on the wall, clear of the boards, the desks and the
// space station's vents; painted on the wall itself (no rim). A theme drops them with parts.fixtures: null.
function paintFixtures(g,T){
  const plate=mix(T.wall,'#FFFFFF',.55),edge=shade(T.wall,-.3);
  R(g,29,55,3,5,edge);R(g,29,55,3,4,plate);R(g,30,56,1,2,edge);
  [118,220].forEach(x=>{R(g,x,76,4,5,edge);R(g,x,76,4,4,plate);R(g,x+1,77,1,1,edge);R(g,x+2,77,1,1,edge);});
}
function partOf(T,name){return T.parts&&name in T.parts?T.parts[name]:PARTS[name];}
// What stands on the floor but is painted with the room: a copy of it, with its rim, goes back over
// whoever is behind it (standingItems). [x,y,w,h,d]: the part to copy and the depth of its back edge.
// The counter's goes just under the live coffee maker. Its floor shadow stays out of the copy.
const standing=document.createElement('canvas'),standingRaw=document.createElement('canvas');
standing.width=standingRaw.width=W;standing.height=standingRaw.height=H;
function paintStanding(T){
  const o=standingRaw.getContext('2d'),c=standing.getContext('2d');o.clearRect(0,0,W,H);c.clearRect(0,0,W,H);
  ['plant','counter'].forEach(k=>{const f=partOf(T,k);if(f)f(o,T);});
  if(T.decor)T.decor(o,T);
  bgHide.forEach(r=>o.clearRect(r[0],r[1],r[2],r[3]));
  const rim=traceOutline(x=>x.drawImage(standingRaw,0,0),T.ol);if(rim)c.drawImage(rim.c,rim.x,rim.y);
  c.drawImage(standingRaw,0,0);
}
function standingBoxes(T){return [...(partOf(T,'plant')?[[1,148,18,32,156]]:[]),...(partOf(T,'counter')?[[COUNTER.x-2,146,44,34,157.9]]:[]),...(T.standing||[])];}
function standingItems(items){standingBoxes(TH).forEach(([x,y,w,h,d])=>items.push({d,f:()=>wx.drawImage(standing,x,y,w,h,x,y,w,h)}));}
function buildBg(){
  const g=bg.getContext('2d'),T=TH; g.clearRect(0,0,W,H);
  (T.wallPaint||paintWall)(g,T);
  (T.floorPaint||paintFloor)(g,T);
  // where the floor meets the wall
  R(g,0,85,W,2,'rgba(0,0,0,.12)'); R(g,0,87,W,1,'rgba(0,0,0,.05)');
  Object.keys(PARTS).forEach(k=>{if(partOf(T,k)&&PART_SHADOWS[k])PART_SHADOWS[k](g);});
  if(!(T.parts&&T.parts.fixtures===null))paintFixtures(g,T);
  if(T.wallDecor)T.wallDecor(g,T);
  // furniture and decor go on their own layer, so they get a rim against the wall and floor
  const d=bgDecor.getContext('2d'); d.clearRect(0,0,W,H);
  Object.keys(PARTS).forEach(k=>{const f=partOf(T,k);if(f)f(d,T);});
  if(T.decor)T.decor(d,T);
  bgHide.forEach(r=>d.clearRect(r[0],r[1],r[2],r[3])); // what the cat knocked over is on the floor, not here
  const rim=traceOutline(x=>x.drawImage(bgDecor,0,0),T.ol); if(rim)g.drawImage(rim.c,rim.x,rim.y);
  g.drawImage(bgDecor,0,0);
  if(T.extras)T.extras(g);
  paintStanding(T);
}
function carpet(g,T,fine){
  R(g,0,85,W,H-85,T.floorA);
  for(let i=0;i<(fine?500:900);i++){const h=hash('c'+i);R(g,h%W,85+(h>>>9)%(H-85),1,1,(h>>>4)%2?T.floorB:T.grainA);}
  if(!fine)for(let x=0;x<W;x+=32)R(g,x,85,1,H-85,T.seam);
  if(!fine)for(let y=101;y<H;y+=32)R(g,0,y,W,1,T.seam);
}
