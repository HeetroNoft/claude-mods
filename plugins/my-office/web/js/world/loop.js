// The frame loop: moves everyone, picks each pose, draws the room in depth order.
'use strict';
// The per-frame loop, plus the file shelf, desk boards and live room details.
const WALK_ACCEL=170; // px/s²: how fast a walker gets going, and brakes before it arrives
// On the open floor a walker steps sideways round anyone in its way, to the side it is already on;
// two meeting head on both keep right. The next waypoint then pulls it back on course.
function dodge(e,left,dt){
  if(e.y<FLOOR_Y+2||left<12)return;
  const p=e.path[0],dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);if(d<1)return;
  const ux=dx/d,uy=dy/d;
  chars.forEach(o=>{
    if(o===e||o.hidden||o.held||o.seated)return;
    const rx=o.x-e.x,ry=o.y-e.y,ahead=rx*ux+ry*uy,side=ry*ux-rx*uy;
    if(ahead<0||ahead>18||Math.abs(side)>10)return;
    const s=(Math.abs(side)<1?1:-Math.sign(side))*22*dt,q={x:e.x-uy*s,y:e.y+ux*s};
    if(q.y>=FLOOR_Y+2&&q.y<=179&&q.x>=6&&q.x<=314&&!FLOOR_BLOCK.concat((TH&&TH.obstacles)||[]).some(b=>crosses(q,q,b))){e.x=q.x;e.y=q.y;}
  });
}
function stepEntity(e,dt){
  // a Claude held by the pointer hangs under it, a little behind, like on a string
  if(e.held){const k=Math.min(1,dt*16);e.x+=(e.held.x-e.x)*k;e.y+=(e.held.y+16-e.y)*k;return false;}
  if(e.hidden||!e.path.length){e.v=0;return false;}
  let left=0,from=e;e.path.forEach(p=>{left+=Math.hypot(p.x-from.x,p.y-from.y);from=p;});
  if(!e.small)dodge(e,left,dt);
  e.v=Math.min(e.small?34:e.pace||40,(e.v||0)+WALK_ACCEL*dt,Math.max(10,Math.sqrt(2*WALK_ACCEL*left)));
  let budget=e.v*dt;
  e.stride=(e.stride||0)+budget;
  while(budget>0&&e.path.length){
    const p=e.path[0],dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);
    if(Math.abs(dx)>1.5)e.face=dx>0?1:-1;
    if(d<=budget){e.x=p.x;e.y=p.y;budget-=d;e.path.shift();}
    else{e.x+=dx/d*budget;e.y+=dy/d*budget;budget=0;}
  }
  if(!e.path.length){
    e.arrived=true; e.v=0; e.sqv=(e.sqv||0)-8; // a small settle on arriving
    if(e.tgt&&e.tgt.dir)e.face=e.tgt.dir;
    if(e.tgt&&e.tgt.seated){e.seated=true;e.seatX=e.tgt.x;}
    if(e.tgt&&e.tgt.exit){e.hidden=true;}
  }
  return true;
}
// The pose this frame, by priority: held, walking, a gift in hand, a scene (high five, clapping,
// waving), then what the work or the break calls for.
function poseFor(ch,tp){
  if(ch.held||ch.fly)return 'dangle';
  if(ch.path.length)return 'walk';
  if(tp<(ch.getUpUntil||0))return 'slump';
  if(tp<(ch.lampReach||0))return 'press';
  // the cat: a stroke for it, a stop while it sits on the desk, a nap broken for a moment
  if(tp<(ch.catPetUntil||0))return 'pet';
  if(ch.seated&&tp<(ch.catBlockUntil||0))return ch.catBlockPose||'sit';
  if(tp<(ch.wokenUntil||0)&&(ch.act==='asleep'||(ch.idle&&ch.idle.act==='nap')))return tp<(ch.waveUntil||0)?'wave':'sit';
  if(ch.errand&&ch.errand.phase==='place')return 'cheer';
  const st=treatNow(ch,tp);if(st)return st.pose;
  if(tp<ch.jumpUntil)return 'cheer';
  if(tp<(ch.hfUntil||0))return 'highfive';
  if(tp<(ch.clapUntil||0))return 'clap';
  if(tp<(ch.waveUntil||0))return 'wave';
  if(ch.act==='asleep')return 'sleep';
  if(ch.act==='idle')return idlePose(ch,tp);
  // at the desk: now and then a stretch (every 80-120 s), and short pauses between bursts of typing
  if(ch.seated){
    if(!ch.nextDeskStretch)ch.nextDeskStretch=tp+60000+Math.random()*50000;
    if(tp>ch.nextDeskStretch){ch.deskStretchUntil=tp+1400;ch.nextDeskStretch=tp+80000+Math.random()*40000;}
    if(tp<(ch.deskStretchUntil||0))return 'stretch';
  }
  const pause=((tp/1000+ch.sendT*3)%6)>5.1;
  switch(ch.act){
    case 'edit':return pause?'sit':'type';
    case 'send':return ((tp/1000+ch.sendT)%2.4)<.45?'throw':'type';
    case 'read':return 'read';
    case 'bash':return pause?'sit':'type';
    case 'web':return 'point';
    case 'agent':return 'wave';
    case 'ask':return ((tp/1000+ch.blinkT)%2.2)<1.5?'wave':'cheer';
    case 'limit':return 'slump';
    case 'wait':return 'phone';
    case 'idle':return 'sip';
    default:return 'sit';
  }
}
// Depth of what reaches the front of the room: every spot beside it, up to y 179, stays behind it.
const FRONT={cabinet:179.2,machine:179.3,coffee:179.5};
let cabOpen=0,doorAmt=0,lastT=performance.now(),spawnT=0,steamT=0;
function frame(tp){
  const dt=Math.min(.05,Math.max(0,(tp-lastT)/1000)); lastT=tp;
  const now=Date.now();
  checkPending();
  chars.forEach(ch=>shelfErrands(ch,tp)); // furniture/shelf.js: files carried up, none lost on the way
  chars.forEach((ch,id)=>{stepEntity(ch,dt);if(ch.removed&&ch.hidden){if(cardId===id)closeCard();if(hoverCh===ch)hoverCh=null;chars.delete(id);}});
  chars.forEach(ch=>animChar(ch,tp,dt,now));
  interns.forEach((e,k)=>{stepEntity(e,dt);if(e.leaving&&e.hidden)interns.delete(k);});
  updateCat(dt,tp);

  // spawn effects
  spawnT+=dt; steamT+=dt;
  if(spawnT>.16){spawnT=0;
    chars.forEach(ch=>{if(!ch.hidden&&!ch.path.length&&!ch.held)spawnWork(ch,poseFor(ch,tp));}); // actors/reactions.js
  }
  chars.forEach(ch=>{
    if(ch.hidden||ch.path.length||ch.act!=='send'||!ch.seated)return;
    const ph=(tp/1000+ch.sendT)%2.4; if(ph<dt*1.5)decor.push({x:ch.x+5,y:94,vx:28,vy:-14,life:1.6});
  });
  const coffeeBusy=tp<brewUntil||[...chars.values()].some(c=>!c.hidden&&!c.path.length&&c.idle&&c.idle.act==='coffee'&&c.idle.phase==='do');
  if(steamT>(coffeeBusy?.18:.6)){steamT=0;steam.push({x:COUNTER.x+16+Math.random()*3,y:153,life:1.6,p:Math.random()*6});}
  const n=nightness(now);

  /* ---- world draw ---- */
  wx.setTransform(1,0,0,1,0,0);
  wx.drawImage(bg,0,0);
  drawWindow(wx,tp,n);
  if(TH.lights)drawStringWire(wx);
  // clock hands
  clockPixels(wx,now,tp);
  // dust motes in window light, or neon sparks
  if(TH.dust==='sun'&&n<.7)dust.forEach(m=>{m.y-=m.v*dt*.3;m.x+=Math.sin(tp/1000+m.p)*dt*2;if(m.y<86){m.y=136;m.x=250+Math.random()*55;}const a=(.25+.2*Math.sin(tp/600+m.p))*(1-n);wx.fillStyle=`rgba(${DUST_TINT[SEASON]},${a})`;wx.fillRect(Math.round(m.x),Math.round(m.y),1,1);});
  // door open? (someone walking through, or a knock)
  let doorOpen=false; const near=e=>!e.hidden&&Math.hypot(e.x-DOOR.x,e.y-DOOR.y)<16;
  chars.forEach(c=>{if(near(c))doorOpen=true;});if(cat&&!cat.away&&near(cat))doorOpen=true; interns.forEach(e=>{if(near(e))doorOpen=true;});
  // the door opens the room's own way as someone comes near, and closes behind them (world/door.js)
  drawDoor(wx,tp,dt,doorOpen);
  // one light per desk on the door sign, in the room's style; it darkens with the night (world/door.js)
  if(!LABELS)drawSignLeds(wx);
  const xs=deskXs(desks.length);
  drawShelf(wx,tp); // furniture/shelf.js

  // depth-sorted drawables
  const items=[];
  const reading=[...chars.values()].some(c=>!c.hidden&&!c.path.length&&(c.act==='read'||(c.idle&&c.idle.act==='files'&&c.idle.phase==='do')));
  let mmode='idle'; chars.forEach(c=>{if(!c.hidden&&!c.path.length){if(c.act==='bash')mmode='bash';else if(c.act==='web'&&mmode!=='bash')mmode='web';}});
  cabOpen+=((reading||tp<cabPulse?1:0)-cabOpen)*Math.min(1,dt*7); // the drawer slides rather than jumps
  standingItems(items);
  items.push({d:FRONT.cabinet,f:()=>outlinedLive(wx,'cabinet',[18,130,32,51],g=>drawCabinet(g,cabOpen,tp))});
  items.push({d:FRONT.machine,f:()=>outlinedLive(wx,'machine',[86,132,42,49],g=>drawMachine(g,tp,mmode))});
  items.push({d:FRONT.coffee,f:()=>outlined(wx,'coffee',g=>drawCoffee(g,tp,coffeeBusy),g=>drawCoffee(g,0,false))});
  items.push({d:129,f:()=>outlinedLive(wx,'plant',[290,90,27,43],g=>drawPlant(g,tp))});
  catDrawables(items,tp); // the cat, what it knocked over, its ball (world/cat.js)
  roomItems(items,wx); // what the breaks left behind (actors/scenes.js)
  desks.forEach((dk,i)=>{
    const x=xs[i],dim=dk.activity==='gone'; const ch=chars.get(String(dk.id));
    const typing=ch&&!ch.hidden&&ch.seated&&!ch.path.length&&(ch.act==='edit'||ch.act==='send'||ch.act==='bash')&&!(tp<(ch.catBlockUntil||0));
    const off=fallen&&fallen.kind==='desk'&&fallen.id===String(dk.id)?'-':''; // its desk thing knocked off by the cat
    items.push({d:SEAT_Y-.5,f:()=>outlined(wx,'chair'+x+'/'+desks.length,g=>drawChair(g,x,dim),g=>drawChair(g,x,false))});
    items.push({d:116,f:()=>outlined(wx,'desk'+x+'/'+desks.length+off,g=>drawDesk(g,x,dk,dim,typing,tp,!lampOff.has(String(dk.id))&&!(dk.waiting&&!dk.limited&&Math.floor(tp/450)%2)),g=>drawDesk(g,x,dk,false,false,0,true))});
  });
  // things drawn after the lights are applied: badges, bubbles and reactions stay bright at night
  const post=[],over=[]; // over: what a Claude is saying or doing, above everyone's badges
  const lifted=[]; // a Claude held by the pointer, with its badge and bubbles: last, above the whole room
  const frameOf=(e,rate)=>Math.floor(tp/1000*rate+(e.blinkT||0))%2;
  const stepOf=e=>Math.floor((e.stride||0)/6.5)%2; // legs follow the ground covered, so feet never slide
  chars.forEach(ch=>{
    if(ch.hidden)return;
    const pose=poseFor(ch,tp);
    let jy=0; if(tp<ch.jumpUntil){jy=-Math.round(Math.abs(Math.sin((ch.jumpUntil-tp)/1000*Math.PI*2.6))*6);}
    const bob=pose==='walk'?(stepOf(ch)?-1:0):0;
    const rate={climb:4,wind:4,walk:6,type:7,press:3,wave:4,sip:.5,talk:5,water:4,juggle:3,catch:2,dance:2.5,eat:3,fold:2,rps:6,dangle:5,clap:5,pet:3,game:1.5}[pose]||2;
    // how high off the floor: held up by the pointer, or floating in the space station
    const air=ch.held?7:ch.fly?Math.round(ch.fly.h):sceneAir(ch,tp)||(ch.idle&&ch.idle.act==='float'&&ch.idle.phase==='do'?Math.round(4+2*Math.sin(tp/700)):0);
    const sway=(pose==='dance'?(frameOf(ch,rate)?1:-1):0)+sceneLean(ch,tp);
    // what is in hand: a treat's own state, else what the break activity calls for
    const st=treatNow(ch,tp),I=ch.idle,doing=I&&I.phase==='do'&&!ch.path.length?I.act:null;
    const scene=doing?IDLES[doing]:null;ch.aloft=!!(scene&&scene.aloft); // up a ladder: over the boards, as a held Claude is
    const held=st?st.held:doing==='donut'?{kind:'donut'}:doing==='tea'?{kind:'teacup'}:null;
    const o={look:ch.look,pose,frame:st&&st.frame!=null?st.frame:pose==='walk'?stepOf(ch):frameOf(ch,rate),blink:blinking(ch,tp),dir:dirOf(ch),sq:sqOf(ch,tp,pose,jy),gaze:gazeOf(ch,tp),
      mood:st&&st.mood?st.mood:moodOf(ch,tp,pose),glow:n>.5,air,held,floor:sceneFloor(ch),
      carry:ch.errand&&ch.errand.phase==='go'?ch.errand.col:null,breath:((tp/1000+ch.blinkT)%2.8)<1.4?0:1};
    // a treat says when the arm goes up; a snack on a break is a bite now and then, not a chew a beat
    // on the phone: the feed goes by, and a post gets a like now and then
    if(pose==='phone'){Object.assign(o,phoneFeed(tp/1000+ch.blinkT*3),{seated:ch.seated});if(tp>(ch.nextLike||0)){if(ch.nextLike)emote(ch,'heart');ch.nextLike=tp+4000+Math.random()*6000;}}
    const raiseTo=pose!=='sip'&&pose!=='eat'?0:st&&st.raise!=null?st.raise:(st||pose==='sip')?o.frame:((tp/1000+ch.blinkT)%1.6<.5?1:0);
    const tr=trailOf(ch,ch.x+sway,ch.y+jy+bob-air,pose,o.mood,raiseTo,st&&st.lift||0,tp);
    o.sway=Math.round(tr.x);o.pop=Math.round(-tr.y);o.raise=tr.raise;o.lift=Math.round(tr.lift);
    ch.screen=ch.fly?null:screenOf(ch,pose,o);
    const body=()=>{
      if(cardId===ch.id)drawRing(wx,ch.x,ch.y,ch.look.c,tp);
      ch.bodyTop=ch.y+jy+bob-air-15;
      if(scene&&scene.behind)scene.behind(wx,ch,tp,I);
      ch.headTop=ch.fly?drawFlying(wx,ch,o,ch.x+sway,ch.y+jy+bob-air):drawPerson(wx,ch.x+sway,ch.y+jy+bob-air,o);
      if(ch.screen)drawScreenLight(wx,ch.screen,ch.x+sway,ch.y+jy+bob-air,o,n);
      drawIdleProps(wx,ch,tp);
      if(st)drawTreat(wx,ch,tp,st);
      if(tp<(ch.flowerUntil||0)&&ch.bodyTop!=null)drawProp(wx,'blossom',Math.round(ch.x+3+o.sway),HATS.has(ch.look.style)?Math.round(ch.headTop+1-o.pop):Math.round(ch.bodyTop-2)); // tucked in the hat band, or on the head
    };
    const top=ch.held||ch.aloft;
    if(top)lifted.push(body);else items.push({d:ch.y,f:body});
    // the badge steps up out of the way of balls in the air, and comes down after
    ch.badgeUp=(ch.badgeUp||0)+(((st&&(st.juggle||st.caught||st.star))||doing==='juggle'?10:0)-(ch.badgeUp||0))*Math.min(1,dt*10);
    (top?lifted:over).push(()=>{
      const ht=ch.headTop; if(ht==null)return;
      if(pose==='sit'&&ch.act==='think')drawThought(wx,ch,tp);else ch.thoughtAt=0;
      if(pose==='phone'&&ch.seated)drawPhone(wx,Math.round(ch.x)-2,99,o,ch.look.c); // above the desk, under the eyes
      if(pose==='sleep')drawZz(wx,ch.x,ht,tp,ch.blinkT||0);
      if(o.mood==='dizzy')drawDizzy(wx,ch.x,ht,tp);
      drawChatBubble(wx,ch,tp);drawRps(wx,ch,tp);
    });
    (top?lifted:post).push(()=>{
      if(ch.headTop==null)return;const ht=ch.headTop-Math.round(ch.badgeUp);
      if(!LABELS&&!ch.aloft&&(PREFS.badges||ch.act==='limit'||ch.act==='ask')){const dk=ch.desk||{};const beat=deskBeat(dk,Date.now()),badge=ch.act==='limit'?['skull','#B03A2E']:ch.act==='ask'?['quest',Math.floor(tp/300)%2?AMBER:ch.look.c]:beat?[beat.icon,beat.tone==='bad'?'#B03A2E':beat.tone==='good'?'#2E8A57':beat.tone==='warn'?AMBER:ch.look.c]:[iconFor(dk),ch.look.c];
        drawBadge(wx,badge[0],ch.x,ht,badge[1],tp,ch.id);
        if(tp<ch.jumpUntil+2500&&ch.starT&&tp-ch.starT<4000)drawStar(wx,Math.round(ch.x),Math.round(ht-21+Math.sin(tp/150)),Math.floor(tp/200)%2?'#FFD84A':'#FFFFFF');}
    });
  });
  interns.forEach(e=>{
    if(e.hidden)return;
    const pose=e.path.length?'walk':'type',hop=tp<(e.hopUntil||0)?-Math.round(Math.sin((e.hopUntil-tp)/400*Math.PI)*3):0;
    items.push({d:e.y,f:()=>{e.headTop=drawPerson(wx,e.x,e.y+hop,{look:e.look,pose,small:true,frame:pose==='walk'?stepOf(e):Math.floor(tp/1000*6+e.blinkT)%2,blink:((tp/1000+e.blinkT)%4)<.12});}});
  });
  items.sort((a,b)=>a.d-b.d).forEach(it=>it.f());

  // steam
  steam=steam.filter(s=>{s.life-=dt;s.y-=6*dt;s.x+=Math.sin(tp/300+s.p)*dt*3;if(s.life<=0)return false;wx.fillStyle=`rgba(255,255,255,${Math.min(.6,s.life*.4)})`;wx.fillRect(Math.round(s.x),Math.round(s.y),1,1);return true;});
  // night falls: darkness everywhere except around the lamps, screens and the window
  const dark=(TH.dark||0)*n;
  if(dark>.01)applyLighting(collectLights(tp,n,doorOpen),dark);
  if(TH.dust==='neon'||TH.dust==='space')motes.forEach((m,i)=>{if(TH.moteCols)m.c=TH.moteCols[i%TH.moteCols.length];m.y-=m.v*dt*(TH.dust==='space'?.35:1);m.x+=Math.sin(tp/900+m.p)*dt*3;if(m.y<86){m.y=178;m.x=Math.random()*W;}wx.fillStyle=`rgba(${m.c},${.35+.3*Math.sin(tp/400+m.p)})`;wx.fillRect(Math.round(m.x),Math.round(m.y),1,1);});
  // boards and lights glow on their own
  if(TH.lights)drawBulbs(wx,tp);
  // changing floors with reduced motion: the room comes up out of a quick dark
  const fade=(floorFade-performance.now())/FLOOR_FADE; // on the wall clock: a late frame never leaves it dark
  if(fade>0){wx.fillStyle=`rgba(0,0,0,${Math.min(1,fade)})`;wx.fillRect(0,0,W,H);}
  // a usage window run dry dims the room; the gauge, on its own canvas, stays lit
  if(gaugeEmpty()){wx.fillStyle='rgba(18,4,6,.42)';wx.fillRect(0,0,W,H);}
  drawGauge(gcx,now,tp);
  if(TH.live)TH.live(wx,tp);
  const oneBoard=(dk,x)=>{const c=looksFor(String(dk.id)).c;outlined(wx,'board'+x+'/'+desks.length,g=>drawBoard(g,x,c,dk.activity==='gone',tp),g=>drawBoard(g,x,c,false,0));if(!LABELS)boardPixels(wx,x,dk,now,tp);};
  desks.forEach((dk,i)=>{if(!boardShift(dk))oneBoard(dk,xs[i]);});
  drawBoardDrag(wx,xs,oneBoard); // the board being dragged, over the others (ui/boards.js)
  if(TH.neon)drawNeon(wx,tp);
  post.forEach(f=>f());over.forEach(f=>f());drawCatTag(wx,tp);lifted.forEach(f=>f());
  drawEmotes(wx,tp);
  leaves=leaves.filter(l=>{l.life-=dt;l.vy+=8*dt;l.x+=(l.vx+Math.sin(tp/250+l.p)*6)*dt;l.y+=l.vy*dt;if(l.life<=0||l.y>178)return false;wx.globalAlpha=Math.min(1,l.life);R(wx,l.x,l.y,l.w,1,l.c);wx.globalAlpha=1;return true;});
  // decorative send planes
  decor=decor.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)return false;wx.globalAlpha=Math.min(1,p.life);drawPlane(wx,p.x,p.y,1);wx.globalAlpha=1;return true;});
  // confetti
  confetti=confetti.filter(c=>{c.life-=dt;c.vy+=95*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=.99;if(c.life<=0||c.y>180)return false;wx.fillStyle=c.c;wx.globalAlpha=Math.min(1,c.life);wx.fillRect(Math.round(c.x),Math.round(c.y),c.w,1);wx.globalAlpha=1;return true;});
  // message planes
  planes.forEach(p=>{
    const u=(tp-p.t0)/p.dur; if(u<0)return;
    const a=p.fromId?charPoint(p.fromId):{x:DOOR.x+6,y:DOOR.y-18}; const b=p.toId?charPoint(p.toId):{x:DOOR.x+6,y:DOOR.y-18};
    if(!p.a)p.a=a; if(!p.b)p.b=b;
    const k=Math.min(1,u),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    p.x=p.a.x+(p.b.x-p.a.x)*e; p.y=p.a.y+(p.b.y-p.a.y)*e-Math.sin(Math.PI*k)*26;
    if(u<1){for(let i=1;i<9;i++){const kk=Math.max(0,k-i*.025),ee=kk<.5?2*kk*kk:1-Math.pow(-2*kk+2,2)/2;wx.fillStyle=rgba(p.col,.75-i*.08);wx.fillRect(Math.round(p.a.x+(p.b.x-p.a.x)*ee),Math.round(p.a.y+(p.b.y-p.a.y)*ee-Math.sin(Math.PI*kk)*26),i<4?2:1,1);}
      drawPlaneBig(wx,p.x,p.y,p.b.x>=p.a.x?1:-1,p.col);}
    else if(!p.landed){p.landed=true;const rc=p.toId&&chars.get(p.toId);if(rc)rc.jumpUntil=Math.max(rc.jumpUntil,tp+600);
      for(let i=0;i<18;i++)confetti.push({x:p.x,y:p.y,vx:(Math.random()-.5)*40,vy:-15-Math.random()*25,c:i%3?p.col:'#FFFFFF',life:.9,w:1});}
  });
  planes=planes.filter(p=>tp-p.t0<p.dur+p.hold);

  const slideY=drawFloorSlide(wx); // the lift between floors (ui/floors.js)

  /* ---- overlay draw ---- */
  ox.setTransform(dpr,0,0,dpr,0,0); ox.clearRect(0,0,cssW,cssH);
  if(slideY)ox.translate(0,P(slideY));
  ox.imageSmoothingEnabled=true;
  // sign
  if(LABELS){
  text('THE OFFICE',P(16),P(33.5),Math.max(12,1.95*S*TS),'#FFFFFF','center');
  drawClockText(now);
  drawGaugeText(now);
  desks.forEach((dk,i)=>drawBoardText(dk,xs[i]+(boardShift(dk)||0),now));
  // the room's text lives on this upper canvas: a held Claude goes in front of it too
  chars.forEach(ch=>{if((ch.held||ch.aloft)&&!ch.hidden&&ch.headTop!=null)ox.clearRect(P(ch.x-10),P(ch.headTop-1),P(20),P(ch.y-ch.headTop-5));});
  }
  // glyphs
  glyphs=glyphs.filter(gl=>{gl.life-=dt;gl.vy+=(gl.ay||0)*dt;gl.y+=gl.vy*dt;gl.x+=gl.vx*dt;if(gl.life<=0)return false;
    if(!LABELS){drawWorkBit(ox,gl,tp);return true;}
    ox.globalAlpha=Math.min(1,gl.life*1.4);font(Math.max(12,2.1*S*TS));ox.textAlign='center';ox.textBaseline='middle';ox.lineWidth=3;ox.strokeStyle='rgba(0,19,47,.85)';ox.strokeText(gl.ch,P(gl.x),P(gl.y));ox.fillStyle=gl.c;ox.fillText(gl.ch,P(gl.x),P(gl.y));ox.globalAlpha=1;return true;});
  if(LABELS){
  // tags
  const tagItems=[];
  chars.forEach(ch=>{if(!ch.hidden&&ch.headTop!=null)tagItems.push(ch);});
  const busy=planes.filter(p=>p.x!=null&&tp>=p.t0).map(bubbleBox);
  const hit=(cx,cy,hw,hh)=>busy.some(b=>cx+hw>b.x-6&&cx-hw<b.x+b.w+6&&cy+hh>b.y-6&&cy-hh<b.y+b.h+14);
  tagItems.sort((a,b)=>a.y-b.y).forEach(ch=>{
    const dk=ch.desk||{}; const hx=P(ch.x),ht=ch.headTop;
    const maxW=P(desks.length>2?74:90);
    const fsN=Math.max(13,2.5*S*TS),fsD=Math.max(12,2.0*S*TS);
    if(hit(hx,P(ht-7.6),maxW/2,fsN))return;
    pill(str(dk.name||'Claude',16),hx,P(ht-7.6),fsN,{border:ch.look.c,maxW});
    const det=str(dk.detail,80); if(!det)return;
    font(fsD); const ls=wrap(det,maxW-fsD*1.1,2);
    ls.forEach((l,i)=>{const cy=P(ht-3.2)+i*fsD*1.35; if(!hit(hx,cy,maxW/2,fsD))pill(l,hx,cy,fsD,{bg:'rgba(255,255,255,.94)',fg:NAVY,maxW,shadow:i===ls.length-1});});
  });
  interns.forEach(e=>{if(e.hidden||e.headTop==null)return;pill(e.label,P(e.x),P(e.headTop-2.6),Math.max(11,1.75*S*TS),{bg:shade(e.look.c,-.35),fg:'#fff',maxW:P(30)});});
  }
  // banners
  if(!LABELS)banners=[];
  banners=banners.filter(b=>{
    const age=(tp-b.t0)/1000; if(age>5.2)return false;
    const ch=chars.get(b.id); const x=ch&&!ch.hidden?ch.x:(deskX(b.id)||160); const ht=ch&&ch.headTop!=null?ch.headTop:91;
    const a=age>4.6?(5.2-age)/.6:1; const sc=Math.min(1,.4+age*4);
    ox.save(); ox.globalAlpha=Math.max(0,a);
    ox.translate(P(x),P(ht-21)); ox.scale(sc,sc);
    pill('DONE!',0,0,Math.max(16,4*S*TS),{bg:ORANGE,fg:'#fff',border:'#FFFFFF'});
    ox.restore();
    pill(b.line,P(x),P(ht-14.6),Math.max(12,2.2*S*TS),{bg:'rgba(0,19,47,.95)',fg:'#FFFFFF',border:GREEN,alpha:Math.max(0,a),maxW:P(110)});
    return true;
  });
  // message bubbles
  if(LABELS)planes.forEach(p=>{if(p.x==null||tp<p.t0)return;const age=tp-p.t0;const a=age>p.dur+p.hold-500?(p.dur+p.hold-age)/500:1;drawBubble(p,Math.max(0,a),age);});
  // empty state
  if(LABELS&&!desks.length&&![...chars.values()].some(c=>!c.hidden)){
    pill('Empty office · start a Claude Code session to join',cssW/2,P(118),Math.max(15,3*S*TS),{bg:'rgba(0,19,47,.9)',border:ORANGE,maxW:cssW*.8});
  }
  if(cardId){const ch=chars.get(cardId);if(ch&&!ch.hidden)placeCard(ch);}
  requestAnimationFrame(frame);
}
