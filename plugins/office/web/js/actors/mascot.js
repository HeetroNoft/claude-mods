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
  if(sm)return T-2;
  if(lk.style===4&&!back)drawGlasses(g,ex1,ex2,ey);
  return drawAccessory(g,o,{L,T,bw,ol,side,back})-2;
}
// Accessory sprites: rows of palette letters, '.' for nothing.
const ACC_BOW=['bb...bb','bhb.bhb','bbbkbbb','bdb.bdb','dd...dd'];
const ACC_POM=['.ww.','wxww','.ss.'],ACC_BULB=['.aa.','ahaa','aaay','.yy.'];
const ACC_STEM=['.s.','.s.','ccc'],ACC_STEM_LOW=['..s','.s.','ccc'];
const ACC_LEAVES=['.....ll.','.ll.lLLl','lLLlsll.','.llls...'],ACC_LEAVES_LOW=['..lsl..','.lLsLl.','lL.s.Ll','l..s..l'];
const ACC_CHEF=['..WWW..WWW..','.WWWWWWWWWW.','WWWWWWWWWWWs','WWWWsWWWWsWs','.WWWsWWWsWs.','.WWWsWWWsWs.','.gggggggggg.'];
const ACC_CUPS=['.pp','pPc','pPc','.pp'];
const ACC_PAL={
  1:{h:'#8C96AC',b:'#4A5266',p:'#FF7A59',P:'#FFB199',c:'#2B2F3A'},
  2:{a:'#FFD84A',h:'#FFF8D0',y:'#E8A92E',s:'#C2C7D4',c:'#6B7488'},
  3:{r:'#C8485A',R:'#A83444',h:'#E5707E',c:'#EFE7D6',C:'#CFC6B2',D:'#B5AC98',w:'#FFFFFF',x:'#FFFFFF',s:'#D5CFC0'},
  5:{b:'#E0266E',h:'#FF7FAE',d:'#A81650',k:'#7E0F3B'},
  6:{s:'#4E9A3A',l:'#8BD46A',L:'#BDF0A0'},
  7:{c:'#2E3347',h:'#565F80',d:'#20243A',o:ORANGE,O:'#F0A080',g:'#FFD84A',b:'#3A4058',B:'#6A7490'},
  8:{b:'#3558C8',h:'#5C80E8',d:'#263F96',w:'#FFFFFF',k:'#1E2230',t:'#7FA0F0'},
  9:{W:'#FFFFFF',s:'#C9CFDA',g:'#AEB6C4'}
};
const ribs=n=>{let s='';for(let i=0;i<n;i++)s+=i%3===2?'R':'r';return s;};
const centred=(s,n)=>{const p=(n-s.length)>>1;return '.'.repeat(p)+s+'.'.repeat(n-s.length-p);};
// A sprite with a dark rim round it, except where it sits on the body (a hat's edge stays clean).
function drawAcc(g,rows,pal,x,y,b,flip){
  const w=rows[0].length,px=[];
  rows.forEach((r,j)=>{for(let i=0;i<w;i++)if(r[i]!=='.')px.push([x+(flip?w-1-i:i),y+j,pal[r[i]]]);});
  const on=new Set(px.map(p=>p[0]+','+p[1]));
  px.forEach(([i,j])=>[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,c])=>{const u=i+a,v=j+c;if(!on.has(u+','+v)&&!(u>=b.L&&u<b.L+b.bw&&v>=b.T))R(g,u,v,1,1,b.ol);}));
  px.forEach(([i,j,c])=>R(g,i,j,1,1,c));
}
// Round frames around the eyes, over the face: every mood still reads through the lenses.
function drawGlasses(g,ex1,ex2,ey){
  const F='#F2C14E',U='#B8862E';
  [ex1,ex2].forEach(ex=>{R(g,ex-1,ey-1,3,3,'rgba(190,230,255,.3)');R(g,ex-1,ey-2,3,1,F);R(g,ex-1,ey+2,3,1,U);R(g,ex-2,ey-1,1,3,F);R(g,ex+2,ey-1,1,3,U);R(g,ex+1,ey-1,1,1,'rgba(255,255,255,.75)');});
  if(ex2-ex1>5)R(g,ex1+3,ey-1,ex2-ex1-5,1,F);
}
// What the look wears on its head, returns how high it reaches. o.wob sways what hangs loose, a hat
// jumps off the head on a fright or a cheer, what is soft droops in sleep; a brim or a bow follows
// the way the Claude faces.
function drawAccessory(g,o,b){
  const {L,T,bw,side,back}=b,st=o.look.style,pal=ACC_PAL[st],w=o.wob|0,flip=side<0;
  const out=o.mood==='dead'||o.mood==='sleep'||o.pose==='sleep',mid=L+(bw>>1);
  const pop=(st===3||st>=7)?(o.mood==='surprised'?2:o.pose==='cheer'&&o.frame?1:0):0,y=T-pop;
  switch(st){
    case 1:{const n=bw-4;
      drawAcc(g,['...'+'h'.repeat(n)+'...','..h'+'b'.repeat(n)+'b..','.b'+'.'.repeat(n+2)+'b.'],pal,L-1,T-3,b);
      [L-3,L+bw].forEach((x,i)=>drawAcc(g,ACC_CUPS,pal,x,T,b,i>0));return T-3;}
    case 2:{if(out){drawAcc(g,ACC_STEM_LOW,pal,mid-1,T-3,b);drawAcc(g,ACC_BULB,pal,mid,T-7,b);return T-7;}
      drawAcc(g,ACC_STEM,pal,mid-1,T-3,b);drawAcc(g,ACC_BULB,o.glow?{a:'#FFF3A0',h:'#FFFFFF',y:'#FFD84A'}:pal,mid-1+w,T-7,b);return T-7;}
    case 3:{const rows=[centred('h'+ribs(bw-7),bw),centred('hh'+ribs(bw-6),bw),centred('h'+ribs(bw-3),bw),'cC'.repeat(bw).slice(0,bw),'CD'.repeat(bw).slice(0,bw)];
      drawAcc(g,ACC_POM,pal,out?mid+3:mid-2+w,out?y-7:y-8,b);
      drawAcc(g,rows,pal,L,y-4,b);return y-8;}
    case 5:drawAcc(g,ACC_BOW,pal,flip?L:L+bw-7,T-3,b,flip);return T-3;
    case 6:{if(out){drawAcc(g,ACC_LEAVES_LOW,pal,mid-3,T-4,b);return T-4;}
      drawAcc(g,['s','s','s'],pal,mid,T-3,b);drawAcc(g,ACC_LEAVES,pal,mid-4+w,T-7,b);
      if(o.mood==='happy'||o.mood==='love'){R(g,mid+1+w,T-8,2,1,'#FF8FB8');return T-8;}
      return T-7;}
    case 7:{const c=bw-6,W=bw+2,r='h'+'c'.repeat(c-2)+'d',l=(c-2)>>1;
      drawAcc(g,[centred('B'.repeat(c+2),W),centred(r,W),centred(r,W),centred(r,W),centred('O'+'o'.repeat(c-1),W),centred('O'+'o'.repeat(l-1)+'gg'+'o'.repeat(c-2-l),W),'BBB'+'b'.repeat(W-5)+'dd'],pal,L-1,y-7,b);return y-7;}
    case 8:{const n=bw-2;
      if(back){drawAcc(g,[centred('hbbbbb',n),centred('h'+'b'.repeat(n-5),n),centred('h'+'b'.repeat(n-3),n),'b'.repeat(n>>1)+'k'+'b'.repeat(n-(n>>1)-1)],pal,L+1,y-4,b);return y-4;}
      const rows=[centred('h'+'b'.repeat(n-7),n)+'....',centred('h'+'b'.repeat(n-6)+'wwb',n)+'....','h'+'b'.repeat(n-4)+'wwb'+'....','b'.repeat(n-2)+'tttttd','.'.repeat(n-1)+'ddddd'];
      drawAcc(g,rows,pal,flip?L-3:L+1,y-4,b,flip);return y-4;}
    case 9:drawAcc(g,ACC_CHEF,pal,mid-6,y-7,b);return y-7;
  }
  return T;
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
