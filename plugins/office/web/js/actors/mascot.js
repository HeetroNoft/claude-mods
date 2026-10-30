// The Claude mascot sprite: body, legs, arms for every pose, face, accessories.
'use strict';
// Pixel sprites: the mascot, icons, and the room furniture.
// A blocky Claude mascot: wide body, two slit eyes, stubby side arms, four little legs.
// o: look, pose, frame, blink, dir, small, sq (-2..2: + is taller and thinner, - is squashed),
//    gaze (-1..1: where the eyes look), mood (happy|love|surprised|dizzy|sleep), wob (accessory sway), glow
//    held ({kind,...}: a prop in hand, see actors/props.js), lift (raises it), carry (a file's colour, under the arm), breath (0/1)
const EYE='#141413';
function drawPerson(g,cx,fy,o){
  const sm=!!o.small,pose=o.pose,f=o.frame|0;
  let sq=sm?0:Math.max(-2,Math.min(2,o.sq|0));
  if(pose==='sleep'&&!sm)sq=Math.min(sq,-1);
  const bw=(sm?8:14)-sq,bh=(sm?6:11)+sq,lh=sm?2:4,aw=sm?1:2,ah=sm?1:2;
  const L=Math.round(cx-bw/2),T=Math.round(fy-bh-lh),ly=T+bh,ay=T+(sm?3:Math.round(bh*.45));
  const lk=o.look,c=lk.c,hi=shade(c,.2),shd=shade(c,-.22),dk=shade(c,-.45),rim=shade(c,-.1),ol=shade(c,-.62),shine=shade(c,.45);
  const back=pose==='look',ey=T+2;
  // the shadow stays on the ground (o.air px below the feet) and shrinks as the body rises
  const air=Math.max(0,o.air|0),sh=Math.min(Math.floor(air/3),(bw>>1)-2);
  R(g,L-1+sh,fy+air,bw+2-2*sh,1,air?'rgba(0,0,0,.18)':'rgba(0,0,0,.24)'); R(g,L+1+sh,fy+air+1,bw-2-2*sh,1,'rgba(0,0,0,.1)');

  // Arms are chains of small squares from the shoulder to the hand, with a dark rim. Arms at the
  // sides go behind the body's edge (they grow out of it); arms reaching in front cross the body.
  const backArms=[],frontArms=[];
  const SX=s=>s<0?L-aw:L+bw;
  const line=(x0,y0,x1,y1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)),p=[];for(let i=0;i<=n;i++)p.push([Math.round(x0+(x1-x0)*i/(n||1)),Math.round(y0+(y1-y0)*i/(n||1))]);return p;};
  const nub=(s,dy,ext)=>{const x=SX(s),y=ay+(dy|0);backArms.push(line(x,y,x+s*(ext|0),y));};
  const up=(s,dx,h)=>{h=h||(sm?3:5);const x=SX(s);backArms.push(line(x,ay,x+s*(dx|0),ay-h+1));};
  const reach=(s,x1,y1,front)=>(front?frontArms:backArms).push(line(SX(s),ay,x1,y1));
  // over the body an arm gets no rim, only relief (a lit top, a shaded underside), so it reads in
  // front of the body without a dark scribble across the belly
  const onBody=(x,y)=>x>=L&&x+aw<=L+bw&&y>=T&&y+ah<=ly;
  const drawArms=list=>{
    if(!sm)list.forEach(p=>p.forEach(([x,y])=>{for(let i=-1;i<=aw;i++)for(let j=-1;j<=ah;j++)if(!onBody(x+i,y+j)||!onBody(x,y))R(g,x+i,y+j,1,1,ol);}));
    list.forEach(p=>{p.forEach(([x,y])=>{if(!sm&&onBody(x,y)){R(g,x,y,aw,1,hi);R(g,x,y+1,aw,ah-1,shd);}else R(g,x,y,aw,ah,c);});
      if(!sm){const [x,y]=p[p.length-1];R(g,x,y,aw,ah,c);R(g,x,y,1,1,hi);}}); // the hand
  };
  const side=(o.dir||1)>0?1:-1,extras=[];
  let hand=null;
  // a prop held in front with both hands, by its sides (actors/props.js knows where to hold each)
  const holdFront=(gy,kind)=>{const [w]=PROP_SIZE[kind]||[3,3],bx=L+(bw>>1)-(w>>1);reach(-1,bx-1,gy,true);reach(1,bx+w-1,gy,true);hand={x:L+(bw>>1),y:gy,side:0};};
  // something drawn by the pose itself, held by two hands at its sides
  const twoHands=(x,w,y)=>{reach(-1,x-1,y,true);reach(1,x+w-1,y,true);};
  const thumbs=(x,w,y)=>{R(g,x,y,1,1,c);R(g,x+w-1,y,1,1,c);};
  const lift=o.lift|0;
  switch(pose){
    case 'walk':if(o.carry&&!sm){nub(-1,f?-1:1);}else{nub(-1,f?-1:1);nub(1,f?1:-1);}break;
    case 'type':nub(-1,f?2:1);nub(1,f?1:2);if(sm)extras.push(()=>R(g,L+1,T+bh-2,bw-2,1,'#C8CDD6'));break;
    case 'wave':nub(-1,0);up(1,f?2:0,6);break;
    case 'press':case 'point':nub(-side,0);if(pose==='press')nub(side,f?1:0,2);else up(side,1);break;
    case 'read':{const px=L+(sm?1:3),pw=bw-(sm?2:6),py=T+(sm?3:6);
      if(sm){nub(-1,1);nub(1,1);}else twoHands(px,pw,py+1);
      extras.push(()=>{R(g,px,py,pw,sm?2:4,'#FFFFFF');if(!sm){R(g,px+1,py+1,pw-2,1,'#9AA6B8');R(g,px+1,py+2,pw-3,1,'#9AA6B8');R(g,px,py+3,pw,1,'#D5DAE2');thumbs(px,pw,py+1);}});break;}
    // a drink: held low by its handle, then up to the mouth for a sip, the arm across the body
    case 'sip':if(!o.held)o.held={kind:'mug'};
      if(sm){nub(1,0);nub(-1,f?-2:0);hand={x:L-aw-1,y:ay+(f?-1:1),side:-1};break;}
      nub(1,0);if(f){hand={x:L+2,y:ey+3-lift,side:-1};reach(-1,hand.x,hand.y,true);}else{hand={x:L-3,y:ay+1-lift,side:-1};reach(-1,hand.x,hand.y);}break;
    // a bite: the same, up to the mouth
    case 'eat':if(sm){nub(1,0);nub(-1,f?-2:-1);break;}
      nub(1,0);if(f){hand={x:L+2,y:ey+4,side:-1};reach(-1,hand.x,hand.y,true);}else{hand={x:L-3,y:ay+1,side:-1};reach(-1,hand.x,hand.y);}break;
    case 'cheer':case 'stretch':case 'yawn':up(-1);up(1);break;
    case 'catch':up(-1,-1,8);up(1,-1,8);break;
    case 'throw':nub(-1,0);up(1);break;
    case 'juggle':up(-1,0,f?4:2);up(1,0,f?2:4);break;
    case 'talk':nub(-side,0);nub(side,f?-2:0,f?1:0);break;
    case 'water':{const cx_=side>0?L+bw+aw+1:L-aw-5;nub(-side,0);if(sm)nub(side,-1,1);else reach(side,side>0?cx_-1:cx_+3,ay-1);
      extras.push(()=>{R(g,cx_,ay-2,4,3,'#5BA8E0');R(g,cx_,ay-2,4,1,'#8CCBF5');R(g,cx_,ay,4,1,'#3E86C0');R(g,side>0?cx_+4:cx_-2,ay-3,2,1,'#5BA8E0');
        if(!sm)R(g,side>0?cx_:cx_+3,ay-1,1,1,c);
        if(f){R(g,side>0?cx_+6:cx_-3,ay-1,1,1,'#8CCBF5');R(g,side>0?cx_+6:cx_-3,ay+2,1,1,'#8CCBF5');}else R(g,side>0?cx_+6:cx_-3,ay+1,1,1,'#8CCBF5');});break;}
    case 'look':case 'sleep':nub(-1,1);nub(1,1);break;
    case 'dance':if(f){up(-1,0,4);nub(1,-1);}else{nub(-1,-1);up(1,0,4);}break;
    case 'clap':if(f){up(-1,0,3);up(1,0,3);}else{nub(-1,-2,1);nub(1,-2,1);}break;
    case 'game':{const gx=L+(bw>>1)-3,gy=ay+2;if(sm){nub(-1,2);nub(1,2);}else twoHands(gx,6,gy+1);
      extras.push(()=>{R(g,gx,gy,6,3,'#2B2F3A');R(g,gx+1,gy+1,4,1,f?'#7FE8FF':'#5BD08A');if(!sm){R(g,gx,gy+3,6,1,'#1A1D24');thumbs(gx,6,gy+1);}});break;}
    case 'hold':if(sm||!o.held){nub(-1,1,1);nub(1,1,1);hand={x:L+(bw>>1),y:ay+2,side:0};}else holdFront(ay+2-lift,o.held.kind);break;
    case 'fold':{const px=L+(bw>>1)-2;if(sm){nub(-1,1,f?1:0);nub(1,1,f?0:1);}else twoHands(px-(f?1:0),4+(f?1:0),ay);
      extras.push(()=>{R(g,px,ay,4,2,'#FFFFFF');R(g,px+1,ay-1,2,1,'#FFFFFF');R(g,px,ay+1,4,1,'#D5DAE2');});break;}
    case 'rps':nub(-side,0);nub(side,f?-2:0,1);break;
    case 'dangle':up(-1,0,4);up(1,0,4);break;
    case 'yoga':up(-1,1,6);up(1,1,6);break;
    case 'float':nub(-1,-1,1);nub(1,1,1);break;
    case 'hug':nub(-1,0,3);nub(1,0,3);break;
    case 'highfive':nub(-side,0);up(side,0,6);break;
    case 'slump':nub(-1,2);nub(1,2);break;
    case 'pet':nub(-side,0);nub(side,2,2);break;
    default:{const b=!sm&&(pose==='stand'||pose==='sit')&&o.breath?1:0;nub(-1,b);nub(1,b);} // arms rise and fall with the breath
  }

  // the dark rim around the body, then the legs, the arms behind, the body itself
  if(!sm){R(g,L+1,T-1,bw-2,1,ol);R(g,L,T,bw,1,ol);R(g,L-1,T+1,bw+2,bh,ol);}
  (sm?[1,bw-2]:[1,3,bw-4,bw-2]).forEach((lx,i)=>{const up_=(pose==='walk'&&(i%2)===f)?1:(pose==='dangle'&&(i%2)===f)?2:(pose==='yoga'&&i===2)?2:0,h=lh-up_;
    R(g,L+lx,ly,1,h,shd);if(!sm&&h>1)R(g,L+lx,ly+h-1,1,1,dk);}); // legs (pairs lift in turn while walking), a dark foot each
  drawArms(backArms);
  R(g,L,T+1,bw,bh-1,c); R(g,L+1,T,bw-2,1,hi);
  if(!sm){R(g,L+1,T+1,1,bh-3,hi);R(g,L+bw-1,T+1,1,bh-2,rim);R(g,L+2,T+1,2,1,shine);R(g,L+1,T+bh-2,bw-2,1,shade(c,-.08));} // lit from the top left
  R(g,L,T+bh-1,bw,1,shd);
  // face (none from the back)
  const gz=sm?0:Math.max(-1,Math.min(1,o.gaze|0));
  const ex1=L+(sm?2:3)+gz,ex2=L+bw-(sm?3:4)+gz;
  if(!back)drawFace(g,o,sm,ex1,ex2,ey,L+(bw>>1)+gz,dk);
  // what the pose holds, the arms reaching in front, then the prop in hand with fingers over it
  extras.forEach(fn=>fn());
  if(o.carry&&!sm){drawFolder(g,L+bw-4,ay-3,o.carry,true);R(g,L+bw-3,ay,4,4,ol);R(g,L+bw-2,ay+1,2,2,c);R(g,L+bw-2,ay+1,1,1,hi);} // a file under the arm
  drawArms(frontArms);
  if(hand&&o.held&&!sm)drawHeld(g,hand,o.held,c,ol);
  // variant accessories
  let top=T;
  if(!sm){
    const st=lk.style,w=o.wob|0;
    if(st===1){R(g,L+1,T-2,bw-2,1,'#2B2F3A');R(g,L,T-1,1,1,'#2B2F3A');R(g,L+bw-1,T-1,1,1,'#2B2F3A');R(g,L-1,T,1,4,'#2B2F3A');R(g,L+bw,T,1,4,'#2B2F3A');R(g,L-1,T+1,1,2,'#E8ECF2');R(g,L+bw,T+1,1,2,'#E8ECF2');top=T-2;}
    else if(st===2){const ax=L+(bw>>1);R(g,ax,T-3,1,3,dk);R(g,ax-1+w,T-5,3,2,o.glow?'#FFF3A0':'#FFD84A');top=T-5;}
    else if(st===3){R(g,L+1,T-2,bw-2,3,dk);R(g,L+1,T,bw-2,1,shade(dk,.25));R(g,L+(bw>>1)-1+w,T-4,2,2,'#FFFFFF');top=T-4;}
    else if(st===4&&!back&&o.mood!=='dead'){const F='#1E2230';[ex1,ex2].forEach(ex=>{R(g,ex-1,ey-1,3,1,F);R(g,ex-1,ey+2,3,1,F);R(g,ex-1,ey,1,2,F);R(g,ex+1,ey,1,2,F);});R(g,ex1+2,ey,ex2-ex1-3,1,F);}
    else if(st===5){const B='#C2185B';R(g,L+bw-6,T-2,2,3,B);R(g,L+bw-3,T-2,2,3,B);R(g,L+bw-4,T-1,1,1,shade(B,-.3));top=T-2;}
    else if(st===6){const sx=L+(bw>>1);R(g,sx,T-3,1,3,'#3E7A2E');R(g,sx-2+w,T-4,2,1,'#8BD46A');R(g,sx+1+w,T-5,2,1,'#8BD46A');top=T-5;}
    else if(st===7){const H='#1E2230';R(g,L+1,T-1,bw-2,1,H);R(g,L+3,T-6,bw-6,5,H);R(g,L+3,T-2,bw-6,1,ORANGE);top=T-6;}
    else if(st===8){const C='#2C3E8C';R(g,L+1,T-2,bw-3,2,C);R(g,L+bw-3,T-1,4,1,shade(C,-.25));R(g,L+(bw>>1)-1,T-3,2,1,C);top=T-3;}
    else if(st===9){R(g,L+3,T-5,bw-6,4,'#FFFFFF');R(g,L+2,T-4,bw-4,2,'#FFFFFF');R(g,L+3,T-1,bw-6,1,'#D5DAE2');top=T-5;}
  }
  return top-2;
}
function drawFace(g,o,sm,ex1,ex2,ey,mx,dk){
  const m=o.mood,pose=o.pose,both=fn=>{fn(ex1);fn(ex2);};
  if(sm){if(!o.blink&&pose!=='sleep')both(x=>R(g,x,ey,1,1,EYE));return;}
  if(m==='happy')both(x=>{R(g,x-1,ey+1,1,1,EYE);R(g,x,ey,1,1,EYE);R(g,x+1,ey+1,1,1,EYE);});
  else if(m==='love')both(x=>{R(g,x-1,ey,1,1,'#FF4D8D');R(g,x+1,ey,1,1,'#FF4D8D');R(g,x-1,ey+1,3,1,'#FF4D8D');R(g,x,ey+2,1,1,'#FF4D8D');});
  else if(m==='surprised'){both(x=>R(g,x,ey-1,1,3,EYE));R(g,mx-1,ey+4,2,2,dk);}
  else if(m==='dead'){both(x=>{R(g,x-1,ey-1,1,1,EYE);R(g,x+1,ey-1,1,1,EYE);R(g,x,ey,1,1,EYE);R(g,x-1,ey+1,1,1,EYE);R(g,x+1,ey+1,1,1,EYE);});R(g,mx-1,ey+4,3,1,dk);R(g,mx+1,ey+5,1,1,'#FF8FA0');return;}
  else if(m==='dizzy')both(x=>{R(g,x-1,ey-1,1,1,EYE);R(g,x+1,ey-1,1,1,EYE);R(g,x,ey,1,1,EYE);R(g,x-1,ey+1,1,1,EYE);R(g,x+1,ey+1,1,1,EYE);});
  else if(pose==='sleep'||pose==='yawn'||m==='sleep')both(x=>R(g,x-1,ey+1,2,1,EYE));
  else if(o.blink)both(x=>R(g,x,ey+1,1,1,EYE));
  else both(x=>R(g,x,ey,1,2,EYE));
  if(m==='happy'||m==='love'){R(g,ex1-2,ey+2,1,1,'rgba(255,120,150,.6)');R(g,ex2+2,ey+2,1,1,'rgba(255,120,150,.6)');}
  if(m==='surprised')return;
  if(pose==='yawn')R(g,mx-1,ey+2,3,3,dk);
  else if(pose==='cheer'||pose==='catch'||m==='happy')R(g,mx-1,ey+3,2,1,dk);
  else if(pose==='eat')R(g,mx-1,ey+3,2,(o.frame|0)?1:2,dk);
  else if(pose==='talk')R(g,mx-1,ey+3,2,(o.frame|0)?2:1,dk);
}
