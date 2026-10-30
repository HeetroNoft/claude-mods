// More break activities, read by the idle brain (actors/brain.js) through the same IDLES table: scenes
// between Claudes, things done with the room, what they leave behind, and a few pointer reactions.
// Besides the fields brain.js documents, an entry can have: can(ch) (is it possible now), weight() (in
// place of w), spots (a pair's two places), spot(ch) (a solo target), begin, tick, end, pose, props.
'use strict';
const DOODLES=['heart','star','sun','leaf','moon','bolt','diamond'];
const PHOTO_MS=300000,SEASON_THING_MS=240000;
// What the breaks leave in the room, each on its floor: photos on the panelling, a snowman or a pile of
// leaves on the floor, flowers by the plant, and the coffee stain.
let photos=[],floorThing=null,stain=null;
const inRoomX=x=>Math.max(8,Math.min(312,x));
const freeForOne=(ch,minY)=>[...chars.values()].find(o=>o!==ch&&!o.hidden&&!o.removed&&!o.held&&!o.fly&&!o.errand&&o.act==='idle'&&o.idle&&o.idle.phase==='do'&&!o.idle.pair&&!o.path.length&&o.y>=minY&&!['nap','highfive','mop'].includes(o.idle.act));

/* ---------- between two Claudes ---------- */
// A snowball fight in winter, paper balls otherwise: thrown like a catch, but the other one takes it.
function fightTick(ch,I,tp){
  const L=leadOf(ch);if(I.role!==0||!L||!L.sync)return;
  const leg=Math.floor((tp-L.sync)/1700);if(leg===I.leg)return;
  const prev=I.leg;I.leg=leg;if(prev==null)return;
  const hit=prev%2?ch:I.pair,by=hit===ch?I.pair:ch,y=hit.y-12;
  setMood(hit,'surprised',800);hit.sqv-=22;setMood(by,'happy',900);if(Math.random()<.4)emote(by,'note');
  for(let i=0;i<7;i++)confetti.push({x:hit.x,y,vx:(Math.random()-.5)*34,vy:-8-Math.random()*16,c:'#FFFFFF',life:.5,w:1});
  blip(300,.05,'triangle');
}
function fightProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length||I.role!==0||!I.sync)return;
  const o=I.pair,k=(tp-I.sync)/1700,leg=Math.floor(k),u=k-leg,A=leg%2?o:ch,B=leg%2?ch:o;
  const ax=A.x+Math.sign(B.x-A.x)*9,bx=B.x,y0=A.y-12,x=ax+(bx-ax)*u,y=y0-Math.sin(Math.PI*u)*12;
  R(g,x-1,y,3,3,SEASON==='winter'?'#FFFFFF':'#EFE6CF');R(g,x,y-1,1,5,SEASON==='winter'?'#FFFFFF':'#EFE6CF');
}
// One fetches a coffee from the counter and carries it to a colleague on a break.
function shareTick(ch,I,tp){
  if(I.stage===0&&tp>I.t){
    const f=freeForOne(ch,124);if(!f){I.until=tp;return;}
    const side=f.x<ch.x?1:-1;I.friend=f;I.stage=1;I.until=tp+15000;
    setTarget(ch,{x:inRoomX(f.x+side*12),y:f.y,dir:-side,st:'i-share'});
  }else if(I.stage===1&&!ch.path.length&&ch.arrived){
    I.stage=2;I.until=tp+900;const f=I.friend;
    if(f&&!f.hidden&&f.act==='idle'&&!f.treat){giveItem(f,'coffee');emote(f,'heart');ch.face=Math.sign(f.x-ch.x)||1;}
    emote(ch,'note');
  }
}
function shareProps(g,ch,tp,I){if(I.phase==='do'&&I.stage<2&&!ch.held)drawProp(g,'mug',ch.x+dirOf(ch)*7-1,ch.y-11,{});}
// A selfie: both pose, the flash goes, and the photo stays on the panelling for a few minutes.
function selfieTick(ch,I,tp){
  const L=leadOf(ch);if(I.role!==0||!L||!L.sync||I.shot||tp<L.sync+3500)return;
  I.shot=tp;blip(1500,.04,'square');
  photos=photos.filter(p=>p.floor===curFloor).slice(-2);
  const used=photos.map(p=>p.i),i=[0,1,2].find(n=>!used.includes(n));
  photos.push({floor:curFloor,i:i==null?0:i,a:ch.look.c,b:I.pair.look.c,until:Date.now()+PHOTO_MS});
  setMood(ch,'happy',1800);setMood(I.pair,'happy',1800);
}
function selfieProps(g,ch,tp,I){if(I.role===0&&I.shot&&tp-I.shot<220){g.fillStyle='rgba(255,255,255,.75)';g.fillRect(Math.round(ch.x-9),Math.round(ch.y-22),32,24);}}

/* ---------- with the room ---------- */
// Each season has its own chore: a snowman, raking the leaves, watering the flowers, a fan in the heat.
const SEASON_SPOT={winter:{x:196,y:172,dir:1},autumn:{x:196,y:172,dir:1},spring:{...SPOT.plant},summer:{x:186,y:164,dir:1}};
function seasonEnd(ch,I,tp){
  if(SEASON==='summer')return;
  floorThing={floor:curFloor,kind:SEASON,until:Date.now()+SEASON_THING_MS};emote(ch,'star');
}
function seasonProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length||SEASON!=='summer')return;
  const x=Math.round(ch.x+dirOf(ch)*7),y=Math.round(ch.y-13),w=Math.floor(tp/90)%2;
  R(g,x,y+3,1,3,'#8A5A3A');R(g,x-2,y-w,5,3,'#FFD84A');R(g,x-1,y+1-w,3,1,'#E58A4A');
}
// Reading a folder from the shelf: now and then it slips, and a colleague comes over.
function shelfTick(ch,I,tp){
  if(I.dropped||tp<I.start+I.dur/2)return;I.dropped=true;
  if(Math.random()>.35)return;
  for(let i=0;i<8;i++)confetti.push({x:ch.x,y:ch.y-10,vx:(Math.random()-.5)*26,vy:-4-Math.random()*8,c:'#FFFFFF',life:1,w:1});
  setMood(ch,'surprised',900);emote(ch,'excl');blip(260,.08,'triangle');
  const f=freeForOne(ch,0);if(!f)return;
  releaseIdle(f);f.idle={act:'highfive',phase:'go',dur:1700,last:'highfive',with:ch.id};
  setTarget(f,{x:inRoomX(ch.x+(f.x<ch.x?-13:13)),y:89,shelf:true,st:'i-hf'});
}
// A coffee spilt in front of the counter; the next Claude free comes and mops it.
function maybeSpill(ch){
  if(stain||Math.random()>.15)return;
  stain={floor:curFloor,x:COUNTER.x-14,y:176,left:1};emote(ch,'excl');blip(240,.08,'triangle');
}
function mopTick(ch,I,tp){if(stain)stain.left=Math.max(0,1-(tp-I.start)/I.dur);}
function mopEnd(ch){stain=null;emote(ch,'star');}
function mopProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length)return;
  const x=Math.round(ch.x-9+Math.sin(tp/140)*2);R(g,x+3,ch.y-9,1,8,'#8A5A3A');R(g,x+1,ch.y-1,5,2,'#E8E2D0');
}
Object.assign(IDLES,{
  snowball:{w:1.7,t:[9,13],pair:'play',pose:ch=>playPose(ch,performance.now()),tick:fightTick,props:fightProps},
  selfie:{w:1.3,t:[6,7],pair:'chat',spots:[{x:184,y:150,dir:1},{x:196,y:150,dir:-1}],pose:(ch,tp)=>{const L=leadOf(ch);return L&&L.shot&&tp>L.shot?'cheer':'wave';},tick:selfieTick,props:selfieProps},
  napside:{w:1,t:[14,22],pair:'nap',spots:[{x:186,y:171,dir:1},{x:197,y:171,dir:-1}],pose:()=>'sleep'},
  share:{w:1.5,t:[20,20],can:ch=>!!freeForOne(ch,124),spot:()=>({x:COUNTER.x-6,y:178,st:'i-share'}),begin(ch,I,tp){I.stage=0;I.t=tp+1400;brewUntil=tp+1200;},pose:()=>'hold',tick:shareTick,props:shareProps},
  season:{w:1.3,t:[6,9],can:()=>!TH.noWeather,spot:()=>({...SEASON_SPOT[SEASON],st:'i-season'}),pose:()=>SEASON==='spring'?'water':SEASON==='summer'?'hold':'pet',end:seasonEnd,props:seasonProps},
  clock:{w:.7,t:[3,5],emo:'star',spot:()=>({x:160,y:89,shelf:true,st:'i-clock'}),begin(ch,I,tp){clockSpin=tp;ch.jumpUntil=tp+500;blip(1320,.03,'sine');},pose:()=>'stretch'},
  doodle:{w:1.2,t:[4,6],emo:'spark',spot:ch=>({x:ch.dx,y:89,shelf:true,st:'i-doodle'}),pose:()=>'press',end(ch){ch.doodle=DOODLES[(Math.random()*DOODLES.length)|0];}},
  shelfread:{w:1,t:[7,10],emo:'bulb',spot:()=>({x:70+Math.random()*40,y:89,shelf:true,st:'i-shelf'}),pose:()=>'read',tick:shelfTick},
  mop:{w:0,weight:()=>stain&&stain.floor===curFloor?7:0,t:[5,7],can:()=>!!stain,spot:()=>({x:stain.x+10,y:stain.y+1,dir:-1,st:'i-mop'}),pose:()=>'pet',tick:mopTick,end:mopEnd,props:mopProps},
});
PLACE.mop='mop';
IDLES.coffee.end=maybeSpill;

// The stain lies flat under everyone; what stands on the floor is sorted with the Claudes.
function roomItems(items,g){
  const now=Date.now();
  photos=photos.filter(p=>p.until>now);
  if(floorThing&&floorThing.until<now)floorThing=null;
  if(stain&&stain.floor===curFloor){g.globalAlpha=.75*stain.left;R(g,stain.x-5,stain.y,10,2,'#5A3418');R(g,stain.x-3,stain.y-1,7,1,'#5A3418');R(g,stain.x-3,stain.y+2,5,1,'#5A3418');g.globalAlpha=1;}
  photos.forEach(p=>{if(p.floor!==curFloor)return;const x=136+p.i*18,y=73;R(g,x,y,10,8,'#FFFDF8');R(g,x+1,y+1,8,5,'#9FB0C8');R(g,x+2,y+3,3,3,p.a);R(g,x+5,y+3,3,3,p.b);R(g,x+4,y-1,2,1,'#D9534F');});
  if(!floorThing||floorThing.floor!==curFloor)return;
  const k=floorThing.kind;
  if(k==='winter')items.push({d:172,f:()=>{R(wx,205,165,9,7,'#F4F8FB');R(wx,206,160,7,5,'#F4F8FB');R(wx,207,156,5,4,'#F4F8FB');R(wx,208,157,1,1,'#1F1E1D');R(wx,210,157,1,1,'#1F1E1D');R(wx,209,158,2,1,'#E58A4A');R(wx,204,171,11,1,'#C9D6E2');}});
  else if(k==='autumn')items.push({d:172,f:()=>{['#D9662E','#E8A33A','#B8402E'].forEach((c,i)=>R(wx,204+i,170-i*2,12-i*2,2,c));}});
  else if(k==='spring')items.push({d:134,f:()=>{[[297,134],[304,136],[311,134]].forEach(([x,y],i)=>{R(wx,x,y-3,1,3,'#3E9A4A');R(wx,x-1,y-4,3,1,i%2?'#FFD84A':'#FF8FB8');});}});
}

/* ---------- the pointer ---------- */
// A Claude let go in full flight sails, bounces twice and gets up dizzy; the others stare.
function flingClaude(ch,vx,vy,tp){
  ch.fly={vx:Math.max(-220,Math.min(220,vx)),h:8,hv:Math.min(120,50+Math.abs(vy)*.3),b:0};
  ch.resumeAt=0;emote(ch,'excl');blip(700,.06,'triangle');
}
function flyTick(ch,dt,tp){
  const f=ch.fly;
  ch.x+=f.vx*dt;if(ch.x<8||ch.x>312){ch.x=inRoomX(ch.x);f.vx*=-.6;}
  f.h+=f.hv*dt;f.hv-=320*dt;
  if(f.h>0)return;
  f.h=0;f.b++;f.hv=70/f.b;f.vx*=.55;ch.sqv-=22;blip(320+f.b*60,.04,'triangle');
  if(f.b<3)return;
  ch.fly=null;const s=landingSpot(ch.x,ch.y);ch.x=s.x;ch.y=s.y;ch.arrived=true;ch.resumeAt=tp+2200;
  setMood(ch,'dizzy',2000);
  chars.forEach(o=>{if(o!==ch&&!o.hidden&&!o.held&&Math.random()<.7){o.face=Math.sign(ch.x-o.x)||1;emote(o,'excl');}});
}
// A double click: it waves at you, and the ones on a break wave at it.
stage.addEventListener('dblclick',e=>{
  if(overUi(e))return;
  const p=toWorld(e),c=charAt(p.x,p.y);if(!c)return;
  const tp=performance.now();c.waveUntil=tp+1800;emote(c,'heart');blip(990,.05);
  chars.forEach(o=>{if(o!==c&&!o.hidden&&!o.held&&o.act==='idle'&&!o.path.length){o.waveUntil=tp+1500;o.face=Math.sign(c.x-o.x)||1;}});
});
// A tap on the floor: a puff of dust, and the ones on a break jump and turn round.
function floorTap(p,tp){
  if(p.y<FLOOR_Y)return;
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;confetti.push({x:p.x,y:p.y,vx:Math.cos(a)*22,vy:Math.sin(a)*10,c:'rgba(255,255,255,.6)',life:.4,w:1});}
  blip(180,.08,'triangle');
  chars.forEach(c=>{if(c.hidden||c.held||c.fly||c.act!=='idle'||c.path.length)return;c.face=Math.sign(p.x-c.x)||1;c.jumpUntil=Math.max(c.jumpUntil,tp+300);setMood(c,'surprised',700);});
}

/* ---------- leaving and coming back to the desk ---------- */
// Off to a break: the lamp goes off. Back at work: it comes on again, and the doodle comes off the board.
function sceneAct(ch,from,to){
  if(to==='idle'&&ch.seated&&!lampOff.has(ch.id)){lampOff.add(ch.id);ch.autoLamp=true;blip(420,.03);}
  if(from==='idle'&&to!=='idle'){ch.doodle=null;if(ch.autoLamp){lampOff.delete(ch.id);ch.autoLamp=false;}}
}
