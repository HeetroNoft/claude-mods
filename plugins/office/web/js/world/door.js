// The door: it opens the room's own way (TH.doorKind) as someone comes near, and answers a click.
// The leaf is the theme's own door part, painted once per theme on a spare canvas, so an opening
// door always looks like the closed one. The opening is x 5..25, y 40..83 (the frame stays put).
//   swing   a hinged door turning on its left edge (most rooms)
//   shoji   two paper panels sliding apart (japan)
//   airlock two halves parting fast, a warning light blinking while they move (space)
//   pocket  one leaf sliding into the wall, a light turning green (retro)
// A knock rattles the door, the Claudes nearby turn to look, then it opens a crack: nobody there.
const DOOR_BOX={x:5,y:40,w:21,h:44};
let doorLeaf=null,doorLeafKey='';
function leafCanvas(){
  if(doorLeafKey===themeKey&&doorLeaf)return doorLeaf;
  doorLeaf=document.createElement('canvas');doorLeaf.width=W;doorLeaf.height=H;
  const f=partOf(TH,'door');if(f)f(doorLeaf.getContext('2d'),TH);
  doorLeafKey=themeKey;return doorLeaf;
}
// a slice of the closed door, src x a..a+w, drawn at x, squeezed to dw
function leafPart(g,a,w,x,dw,dy){g.drawImage(leafCanvas(),a,DOOR_BOX.y,w,DOOR_BOX.h,x,DOOR_BOX.y+(dy||0),dw==null?w:dw,DOOR_BOX.h);}
function clipDoor(g,fn){g.save();g.beginPath();g.rect(DOOR_BOX.x,DOOR_BOX.y,DOOR_BOX.w,DOOR_BOX.h);g.clip();fn();g.restore();}

// the corridor behind the door, lit
function drawHall(g,amt){
  const {x,y,w,h}=DOOR_BOX,hall=TH.doorHall||'#141B2B',lc=TH.doorLight||'255,214,140';
  R(g,x,y,w,h,hall);R(g,x,y+h-7,w,7,shade(hall,.12));R(g,x,y+h-7,w,1,shade(hall,.25)); // the corridor floor
  R(g,x,y,3,h-7,shade(hall,-.25));R(g,x+w-3,y,3,h-7,shade(hall,-.18));                  // its side walls, for depth
  R(g,x+w/2-3|0,y+3,6,1,`rgba(${lc},.8)`);                                              // its ceiling light
  const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,`rgba(${lc},${.22*amt})`);gr.addColorStop(1,`rgba(${lc},${.08*amt})`);g.fillStyle=gr;g.fillRect(x,y,w,h);
}

const DOOR_KINDS={
  swing(g,amt,rattle){
    const {x,w}=DOOR_BOX,dw=Math.max(2,Math.round(w*(1-amt*.86)));
    clipDoor(g,()=>leafPart(g,x,w,x+rattle,dw)); // a knock shakes it inside the frame, never over it
    if(amt>.02){g.fillStyle=`rgba(0,0,0,${.3*amt})`;g.fillRect(x,DOOR_BOX.y,dw,DOOR_BOX.h);R(g,x+dw-1,DOOR_BOX.y,1,DOOR_BOX.h,'rgba(0,0,0,.35)');}
  },
  shoji(g,amt,rattle){
    const off=Math.round(amt*10)+(rattle>0?1:0); // a knock shakes the panels in their grooves
    clipDoor(g,()=>{leafPart(g,5,11,5-off);leafPart(g,15,11,15+off);});
    if(off){R(g,15-off,40,1,44,'rgba(0,0,0,.25)');R(g,15+off,40,1,44,'rgba(0,0,0,.25)');}
  },
  airlock(g,amt,rattle,tp){
    const off=Math.round(amt*11);
    clipDoor(g,()=>{leafPart(g,5,11,5-off);leafPart(g,15,11,15+off);});
    // the warning light over the frame blinks while the halves move, and on a knock
    const moving=amt>.03&&amt<.97,on=(moving||rattle)&&Math.floor(tp/140)%2;
    R(g,13,38,5,2,on?'#FFB020':'#5A4A2A');if(on){g.fillStyle='rgba(255,176,32,.25)';g.fillRect(11,37,9,4);}
  },
  pocket(g,amt,rattle){
    const off=Math.round(amt*19);
    clipDoor(g,()=>leafPart(g,5,21,5+off+rattle));
    if(off)R(g,5+off,40,1,44,'rgba(0,0,0,.3)');
    R(g,13,38,5,1,amt>.5?'#8EF0C8':'#1E4A42'); // the access light over the door
  },
};

// called every frame from the loop: someone near the door opens it; a knock rattles it, then a peek
function drawDoor(g,tp,dt,near){
  const since=tp-doorKnock,knocking=since<600,peek=since>=600&&since<1600;
  doorAmt+=((near?1:peek?.3:0)-doorAmt)*Math.min(1,dt*(near?8:5));
  const rattle=knocking&&!near?(Math.floor(since/75)%2?1:-1):0;
  if(doorAmt<.03&&!rattle&&TH.doorKind!=='airlock'&&TH.doorKind!=='pocket')return;
  if(doorAmt>=.03)drawHall(g,doorAmt);else if(rattle)R(g,DOOR_BOX.x,DOOR_BOX.y,DOOR_BOX.w,DOOR_BOX.h,TH.doorHall||'#141B2B');
  (DOOR_KINDS[TH.doorKind]||DOOR_KINDS.swing)(g,doorAmt,rattle,tp);
  if(TH.overDoor)clipDoor(g,()=>TH.overDoor(g,TH)); // what hangs in front of the door stays in front
}

// a click on the door: a knock, and the Claudes in the room look round at it
function knockDoor(tp){
  doorKnock=tp;knock();
  chars.forEach(ch=>{if(ch.hidden||ch.removed||ch.held)return;
    ch.lookDoor=tp+1700;
    if(!ch.seated&&ch.x<140&&Math.random()<.7)emote(ch,'quest');});
}

// The door sign: one light per desk, in the room's own style (TH.signLeds), centred in the span of the
// sign it may use (TH.signSpan, [first x, last x]). Drawn before the night falls so it darkens with the
// room; rooms with TH.signGlow keep a soft glow round each one (see collectLights).
//   bulb    round 8-bit bulbs with a shine (pixel)      dot    ringed dots on a cream band (claude)
//   lantern little paper lanterns on a string (japan)    led    LEDs in a metal housing (space)
//   tag     sticky notes, a little askew (paper)         term   square terminal lamps in a green frame (retro)
//   neon    short neon tubes with a halo (neon)          fairy  fairy-light bulbs on a wire (cosy)
const SIGN_LEDS={
  bulb:{w:3,f(g,x,c){R(g,x+1,31,1,1,c);R(g,x,32,3,2,c);R(g,x+1,34,1,1,shade(c,-.45));R(g,x,32,1,1,mix(c,'#FFFFFF',.6));}},
  dot:{w:4,back(g,a,w){R(g,a-1,31,w+2,4,'#FFFDF8');},
    f(g,x,c){const ink=TH.ink;R(g,x+1,31,2,1,ink);R(g,x,32,1,2,ink);R(g,x+3,32,1,2,ink);R(g,x+1,34,2,1,ink);R(g,x+1,32,2,2,c);}},
  lantern:{w:3,f(g,x,c){R(g,x+1,31,1,1,'#2E2A26');R(g,x,32,3,1,'#2E2A26');R(g,x,33,3,3,c);R(g,x,34,3,1,shade(c,-.2));R(g,x,36,3,1,'#2E2A26');}},
  led:{w:3,back(g,a,w){R(g,a-1,31,w+2,4,'#1B2433');R(g,a-1,31,w+2,1,'#7C8796');},
    f(g,x,c){R(g,x,32,3,2,c);R(g,x,32,1,1,mix(c,'#FFFFFF',.55));R(g,x,34,3,1,shade(c,-.5));}},
  tag:{w:4,f(g,x,c,i){const y=31+(i%2);R(g,x,y,4,4,c);R(g,x,y,4,1,shade(c,.25));R(g,x+3,y+3,1,1,shade(c,-.35));}},
  term:{w:3,back(g,a,w){R(g,a-1,31,w+2,5,'#8EF0C8');R(g,a,32,w,3,'#0F2A26');},f(g,x,c){R(g,x,32,3,3,c);R(g,x,32,3,1,mix(c,'#FFFFFF',.35));}},
  neon:{w:3,f(g,x,c){const [r,gg,b]=hexRgb(c);g.fillStyle=`rgba(${r},${gg},${b},.35)`;g.fillRect(x-1,32,5,3);R(g,x,33,3,1,mix(c,'#FFFFFF',.45));}},
  fairy:{w:2,back(g,a,w){for(let x=a-1;x<=a+w;x++)R(g,x,31+((x-a)%6===2?1:0),1,1,'#2A1E1A');},
    f(g,x,c){R(g,x,32,2,1,'#2A1E1A');R(g,x,33,2,2,c);R(g,x,33,1,1,mix(c,'#FFFFFF',.5));}},
};
// where each desk's light goes: [{x, c}], laid out for the room's style
function signSlots(){
  const n=desks.length;if(!n)return [];
  const S=SIGN_LEDS[TH.signLeds]||SIGN_LEDS.bulb,[a,b]=TH.signSpan||[2,28],span=b-a+1;
  let w=S.w,gap=n>5?1:2;
  if(n*w+(n-1)*gap>span)gap=1;
  while(w>1&&n*w+(n-1)*gap>span)w--;
  const tw=n*w+(n-1)*gap,x0=a+Math.floor((span-tw)/2);
  return desks.map((dk,i)=>({x:x0+i*(w+gap),w,c:looksFor(String(dk.id)).c,x0,tw}));
}
function drawSignLeds(g){
  const s=signSlots();if(!s.length)return;
  const S=SIGN_LEDS[TH.signLeds]||SIGN_LEDS.bulb;
  if(S.back)S.back(g,s[0].x0,s[0].tw);
  s.forEach((l,i)=>{if(l.w===S.w)S.f(g,l.x,l.c,i);else R(g,l.x,32,l.w,2,l.c);}); // squeezed by a crowd: plain lights
}
