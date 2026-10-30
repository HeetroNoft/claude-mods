// More break activities, read by the idle brain (actors/brain.js) through the same IDLES table: scenes
// between Claudes, things done with the room, what they leave behind, and a few pointer reactions.
// Besides the fields brain.js documents, an entry can have: can(ch) (is it possible now), weight() (in
// place of w), spots (a pair's two places), spot(ch) (a solo target), begin, tick, end, pose, props,
// floor (sits on the floor), air(ch,tp) (px off the ground), lean(ch,tp) (px to the side).
'use strict';
const DOODLES=['heart','star','sun','leaf','moon','bolt','diamond'];
const PHOTO_MS=300000,SEASON_THING_MS=240000;
const LEAF_COLS=['#D9662E','#E8A33A','#B8402E','#E8C24A','#C8592E'];
// What the breaks leave in the room, each on its floor: photos on the panelling, a snowman or flowers
// (floorThing: u is how far it was built), the coffee stain, and what lies on the ground (shaken).
const KEEP_DOING=['nap','highfive','tidy','mop','sweep','unpin'];
let photos=[],floorThing=null,stain=null,ripples=[],shaken=[],shakenAt=0,nextGust=0;
const inRoomX=x=>Math.max(8,Math.min(312,x));
const freeForOne=(ch,minY)=>[...chars.values()].find(o=>o!==ch&&!o.hidden&&!o.removed&&!o.held&&!o.fly&&!o.errand&&o.act==='idle'&&o.idle&&o.idle.phase==='do'&&!o.idle.pair&&!o.path.length&&o.y>=minY&&!KEEP_DOING.includes(o.idle.act));
const puff=(x,y,n,c,spread)=>{for(let i=0;i<n;i++)confetti.push({x,y,vx:(Math.random()-.5)*spread,vy:-6-Math.random()*spread*.5,c,life:.45+Math.random()*.3,w:1});};

/* ---------- small sprites ---------- */
// A round thing lit from high on the right: the shadow side falls down and to the left.
function ball3d(g,cx,cy,r,c){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(x*x+y*y>r*r+r*.6)continue;
    R(g,cx+x,cy+y,1,1,x-y<-r*.8?shade(c,-.14):x-y>r*.9?shade(c,.25):c);}
}
function snowmanSprite(g,s,scarf){
  const X=209;
  ball3d(g,X,166,5,'#EEF3F7');
  if(s>=2)ball3d(g,X,158,4,'#EEF3F7');
  if(s<3)return;
  ball3d(g,X,152,3,'#EEF3F7');R(g,X-1,151,1,1,'#1F1E1D');R(g,X+1,151,1,1,'#1F1E1D');R(g,X+1,152,3,1,'#E58A4A');
  [157,159,161].forEach(y=>R(g,X,y,1,1,'#3A3A3A'));
  if(s<4)return;
  R(g,X-3,155,7,1,scarf);R(g,X-3,156,2,3,shade(scarf,-.2));
  R(g,X-3,149,7,1,'#2A2622');R(g,X-2,146,5,3,'#2A2622');R(g,X-2,148,5,1,'#B03A2E');
  R(g,X-7,156,3,1,'#6B4A2E');R(g,X-9,155,2,1,'#6B4A2E');R(g,X+5,156,3,1,'#6B4A2E');R(g,X+8,155,2,1,'#6B4A2E');
}
const STAIN=['....bbbbbb......','..bbbcccbbbb..b.','.bbccaaccccbb...','bbcccccccccbbb..','.bbbbccccbbbb.b.','...bbbbbb.......'],STAIN_PAL={a:'#A8744A',b:'#4E2C14',c:'#6B4226'};
// The stain goes pixel by pixel as it is mopped, not by fading.
function drawStain(g,s){
  STAIN.forEach((r,j)=>{for(let i=0;i<r.length;i++){const k=r[i];if(k==='.'||(hash(i+'s'+j)%100)/100>s.left)continue;R(g,s.x-8+i,s.y-2+j,1,1,STAIN_PAL[k]);}});
}
function drawLadder(g,x,top,bottom){
  const h=bottom-top;R(g,x-5,top,1,h,'#A8763E');R(g,x+4,top,1,h,'#8A5F30');for(let y=top+3;y<bottom;y+=5)R(g,x-4,y,8,1,'#C99A5E');
  R(g,x-7,bottom,14,1,'rgba(0,0,0,.25)');
}
function drawPhoto(g,p,x,y){
  R(g,x-1,y+1,12,12,'rgba(0,0,0,.2)');R(g,x,y,12,12,'#FFFDF8');R(g,x+1,y+1,10,7,mix(TH.wall,'#BFD9E6',.6));
  const head=(hx,c)=>{R(g,x+hx,y+4,4,4,c);R(g,x+hx+1,y+5,1,1,EYE);R(g,x+hx+2,y+5,1,1,EYE);};
  head(2,p.a);head(6,p.b);
}

/* ---------- between two Claudes ---------- */
// A snowball fight in winter, paper balls otherwise. One throw in three is dodged: the ball bursts behind.
const dodged=(I,leg)=>hash(I.dur+':'+leg)%3===0;
function fightTick(ch,I,tp){
  const L=leadOf(ch);if(I.role!==0||!L||!L.sync)return;
  const leg=Math.floor((tp-L.sync)/1700);if(leg===I.leg)return;
  const prev=I.leg;I.leg=leg;if(prev==null)return;
  const hit=prev%2?ch:I.pair,by=hit===ch?I.pair:ch,y=hit.y-11,c=SEASON==='winter'?'#FFFFFF':'#EFE6CF';
  if(dodged(I,prev)){hit.jumpUntil=tp+380;emote(by,'sweat');puff(hit.x+Math.sign(hit.x-by.x)*16,y+6,8,c,30);return;}
  setMood(hit,'surprised',800);hit.sqv-=26;hit.knockAt=tp;hit.knockDir=Math.sign(hit.x-by.x)||1;setMood(by,'happy',900);if(Math.random()<.4)emote(by,'note');
  puff(hit.x,y,12,c,44);blip(300,.05,'triangle');
}
function fightLean(ch,tp){const k=1-(tp-(ch.knockAt||-1e9))/420;return k>0?Math.round(k*3)*(ch.knockDir||1):0;}
function fightProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length||I.role!==0||!I.sync)return;
  const o=I.pair,k=(tp-I.sync)/1700,leg=Math.floor(k),u=k-leg,A=leg%2?o:ch,B=leg%2?ch:o;
  if(u<.18)return; // still in the hand
  const v=(u-.18)/.82,s=Math.sign(B.x-A.x),ax=A.x+s*9,bx=dodged(I,leg)?B.x+s*16:B.x,y0=A.y-12,c=SEASON==='winter'?'#FFFFFF':'#EFE6CF';
  for(let i=2;i>=0;i--){const w=Math.max(0,v-i*.06),x=ax+(bx-ax)*w,y=y0-Math.sin(Math.PI*w)*13;g.globalAlpha=i?.3/i:1;R(g,x-1,y-1,3,3,c);if(!i)R(g,x-1,y+1,3,1,shade(c,-.18));}
  g.globalAlpha=1;
}
// One fetches a coffee from the counter and carries it to a colleague on a break, steam rising.
function shareTick(ch,I,tp){
  if(I.stage===0&&tp>I.t){
    const f=freeForOne(ch,124);if(!f){I.until=tp;return;}
    const side=f.x<ch.x?1:-1;I.friend=f;I.stage=1;I.until=tp+15000;
    f.waveUntil=tp+1200;f.face=Math.sign(ch.x-f.x)||1;
    setTarget(ch,{x:inRoomX(f.x+side*13),y:f.y,dir:-side,st:'i-share'});
  }else if(I.stage===1&&!ch.path.length&&ch.arrived){
    I.stage=2;I.until=tp+1100;const f=I.friend;
    if(f&&!f.hidden&&f.act==='idle'&&!f.treat){giveItem(f,'coffee');emote(f,'heart');ch.face=Math.sign(f.x-ch.x)||1;}
    ch.sqv+=16;emote(ch,'note');
  }
}
function shareProps(g,ch,tp,I){
  if(I.phase!=='do'||I.stage>=2||ch.held)return;
  const x=Math.round(ch.x+dirOf(ch)*8-1),y=Math.round(ch.y-10+(ch.path.length?Math.sin(tp/90):0));
  drawProp(g,'mug',x,y,{});
  if(Math.floor(tp/240)%2)R(g,x+1,y-2-Math.floor((tp/140)%3),1,1,'rgba(255,255,255,.75)');
}
// A selfie: one holds the phone up, the LED counts three, the flash goes, and the print flies to the wall.
function selfieTick(ch,I,tp){
  const L=leadOf(ch);if(I.role!==0||!L||!L.sync||I.shot||tp<L.sync+3000)return;
  I.shot=tp;blip(1500,.04,'square');
  photos=photos.filter(p=>p.floor===curFloor).slice(-2);
  const used=photos.map(p=>p.i),i=[0,1,2].find(n=>!used.includes(n));
  photos.push({floor:curFloor,i:i==null?0:i,a:ch.look.c,b:I.pair.look.c,until:Date.now()+PHOTO_MS,born:tp,fromX:ch.x,fromY:ch.y-20});
  setMood(ch,'happy',1800);setMood(I.pair,'happy',1800);
}
function selfiePose(ch,tp){const L=leadOf(ch);if(L&&L.shot&&tp>L.shot)return 'cheer';return ch.idle.role===0?'point':'wave';}
function selfieProps(g,ch,tp,I){
  if(I.role!==0||!I.sync||ch.path.length)return;
  const s=dirOf(ch),x=Math.round(ch.x+s*11),y=Math.round(ch.y-26);
  if(!I.shot||tp-I.shot<400){R(g,x-1,y,4,6,'#2B2F3A');R(g,x-1,y,4,1,'#4A5163');R(g,x,y+1,1,1,'#14131C');if(!I.shot&&Math.floor(tp/300)%2)R(g,x,y-1,1,1,'#FF5D5D');}
  const a=I.shot?1-(tp-I.shot)/240:0;
  if(a>0){g.fillStyle=`rgba(255,255,255,${.85*a})`;g.fillRect(Math.round(Math.min(ch.x,I.pair.x)-12),Math.round(ch.y-24),Math.round(Math.abs(ch.x-I.pair.x))+24,26);
    [[-5,0],[5,0],[0,-5],[0,5],[-3,-3],[3,3],[3,-3],[-3,3]].forEach(([dx,dy])=>R(g,x+dx,y+dy,1,1,'#FFFFFF'));}
}
// Two sit on the floor; one nods off first, then slumps against the other.
function napPose(ch,tp){return ch.idle.role===0||tp>(ch.idle.start||0)+2600?'sleep':'sit';}
function napLean(ch,tp){const I=ch.idle;if(!I||I.role!==1||tp<(I.start||0)+2600)return 0;return Math.sign(I.pair.x-ch.x)*2;}

/* ---------- with the room ---------- */
// Three seasons have a chore in stages: a snowman ball by ball, flowers growing, a fan. Autumn's is the sweep.
const SEASON_SPOT={winter:{x:197,y:172,dir:1},spring:{...SPOT.plant},summer:{x:186,y:164,dir:1}};
function seasonBegin(ch,I,tp){
  if(SEASON==='summer'){setMood(ch,'happy',I.dur);return;}
  floorThing={floor:curFloor,kind:SEASON,born:Date.now(),until:Date.now()+SEASON_THING_MS,u:0,left:1,scarf:ch.look.c};
}
function seasonTick(ch,I,tp){
  const t=floorThing;if(!t||SEASON==='summer')return;
  const u=Math.min(1,(tp-I.start)/I.dur),step=Math.floor(u*4);
  if(t.kind==='winter'&&step>Math.floor(t.u*4)){ch.sqv+=14;puff(209,168,5,'#FFFFFF',20);blip(500+step*80,.04,'triangle');}
  t.u=u;
}
function seasonEnd(ch){if(floorThing&&SEASON!=='summer'){floorThing.u=1;emote(ch,'star');}}
function seasonProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length)return;
  const d=dirOf(ch),x=Math.round(ch.x+d*8),y=Math.round(ch.y-11);
  if(SEASON==='summer'){
    // a paper fan, opening and shutting, and the air it moves
    const w=Math.round(Math.sin(tp/70)*2);R(g,x,y+3,1,4,'#8A5A3A');
    for(let i=-3;i<=3;i++)R(g,x+i,y+1-(3-Math.abs(i))+w,1,3,i%2?'#FFD84A':'#E58A4A');
    if(Math.floor(tp/160)%2)R(g,x-d*5,y+3+w,3,1,'rgba(255,255,255,.5)');
  }
}
// Whatever lies on the ground gets picked up, piece by piece: the next Claude free walks to each one,
// crouches, and takes it, sheets under the arm, leaves in a sack. Nothing is gathered: it goes.
const lying=()=>shaken.filter(f=>f.rest&&f.floor===curFloor);
function nearestLying(ch){return lying().sort((a,b)=>Math.hypot(a.x-ch.x,a.gy-ch.y)-Math.hypot(b.x-ch.x,b.gy-ch.y))[0]||null;}
const sweepSpot=f=>({x:inRoomX(f.x-7),y:Math.max(FLOOR_Y+2,Math.min(178,f.gy+1)),dir:1,st:'i-sweep'+Math.round(f.x)});
function sweepTick(ch,I,tp){
  if(ch.path.length||!ch.arrived)return;
  if(!I.pick){I.pick=tp+600;return;}
  if(tp<I.pick)return;
  I.pick=0;
  const near=lying().filter(f=>Math.hypot(f.x-ch.x,f.gy-ch.y)<14);
  near.forEach(f=>{if(f.kind==='paper')I.sheets=(I.sheets||0)+1;else I.bag=(I.bag||0)+1;});
  shaken=shaken.filter(f=>!near.includes(f));
  if(near.length){ch.sqv+=10;blip(620,.03,'triangle');}
  const next=nearestLying(ch);
  if(next)setTarget(ch,sweepSpot(next));else I.until=tp+300;
}
function sweepPose(ch,tp){return ch.idle&&ch.idle.pick?'pet':'stand';}
function sweepEnd(ch){emote(ch,'star');}
function sweepProps(g,ch,tp,I){
  if(I.phase!=='do')return;
  const d=dirOf(ch),x=Math.round(ch.x-d*9);
  if(I.bag){const h=3+Math.min(5,I.bag>>1);R(g,x-3,ch.y-h,7,h,'#B8A27A');R(g,x-3,ch.y-h,1,h,'#8E7C58');R(g,x-2,ch.y-h,5,1,'#CDBA92');R(g,x-1,ch.y-h-1,3,1,LEAF_COLS[I.bag%5]);}
  if(I.sheets){const h=Math.min(4,1+(I.sheets>>1));R(g,Math.round(ch.x+d*8)-2,ch.y-9-h,5,h,'#FFFDF8');R(g,Math.round(ch.x+d*8)-2,ch.y-9,5,1,'#D8D2C2');}
}
// Winding the clock: a ladder slides up the wall left of it, in front of the boards so the climb shows;
// the Claude goes up rung by rung and winds it with a key, the hands go round, it chimes, and down it comes.
const CLOCK_SPOT=141,CLOCK_TOP=60,CLOCK_RUNG=5,CLOCK_T={up:500,climb:2000,wind:CLOCK_WIND,stay:600,down:1500,away:400};
const clockWound=I=>I.start+CLOCK_T.up+CLOCK_T.climb; // when it starts winding
function clockAir(ch,tp){const I=ch.idle,T=CLOCK_T,k=Math.min((tp-I.start-T.up)/T.climb,(I.until-T.away-tp)/T.down);
  return Math.round(CLOCK_TOP*Math.max(0,Math.min(1,k))/CLOCK_RUNG)*CLOCK_RUNG;}
function clockPose(ch,tp){const I=ch.idle,w=tp-clockWound(I);if(w>=0&&w<CLOCK_T.wind)return 'wind';return clockAir(ch,tp)===CLOCK_TOP||!clockAir(ch,tp)?'stand':'climb';}
function clockTick(ch,I,tp){
  if(!I.set&&tp>clockWound(I)){I.set=true;clockWindAt=tp;emote(ch,'dots');}
  if(I.set&&!I.rang&&tp<clockWound(I)+CLOCK_T.wind&&tp>(I.tick||0)){I.tick=tp+320;blip(1900,.012,'square');} // the ratchet
  if(!I.rang&&tp>clockWound(I)+CLOCK_T.wind){I.rang=true;clockChimeAt=tp;setMood(ch,'happy',1500);emoteAt(CLOCK.x-3,CLOCK.y+8,'note');[0,260,520].forEach(d=>setTimeout(()=>blip(1320,.09,'sine'),d));}
}
function clockLadder(g,ch,tp,I){const T=CLOCK_T,k=Math.max(0,Math.min(1,Math.min((tp-I.start)/T.up,(I.until-tp)/T.away)));drawLadder(g,CLOCK_SPOT,Math.round(90-(90-27)*k),90);}
function clockKey(g,ch,tp,I){const w=tp-clockWound(I);if(w<0||w>=CLOCK_T.wind)return;R(g,149,13,3,1,'#FFD84A');R(g,150,Math.floor(tp/160)%2?12:14,1,1,'#FFD84A');}
// Drawing on its own board, back to the room; the drawing comes line by line, with chalk dust.
function doodleBegin(ch){ch.doodle=DOODLES[(Math.random()*DOODLES.length)|0];ch.doodleU=0;}
function doodleTick(ch,I,tp){ch.doodleU=Math.min(1,(tp-I.start)/(I.dur*.85));if(Math.random()<.1)confetti.push({x:ch.x+Math.random()*10-5,y:60,vx:0,vy:8,c:'rgba(255,255,255,.7)',life:.5,w:1});}
// Reading a folder from the shelf: now and then it slips, the sheets flutter down, and a colleague comes over.
function shelfTick(ch,I,tp){
  if(I.dropped||tp<I.start+I.dur/2)return;I.dropped=true;
  if(Math.random()>.35)return;
  for(let i=0;i<6;i++)leaves.push({x:ch.x+(i-3)*2,y:ch.y-12,vx:(Math.random()-.5)*20,vy:6,life:1.3,p:Math.random()*6,w:2,c:'#FFFDF8'});
  setMood(ch,'surprised',900);ch.sqv-=20;emote(ch,'excl');blip(260,.08,'triangle');
  const f=freeForOne(ch,0);if(!f)return;
  releaseIdle(f);f.idle={act:'highfive',phase:'go',dur:1700,last:'highfive',with:ch.id};
  setTarget(f,{x:inRoomX(ch.x+(f.x<ch.x?-13:13)),y:89,shelf:true,st:'i-hf'});
}
// A photo stays up for a few minutes, then a Claude unpins it and files it away in the cabinet.
const duePhoto=()=>photos.find(p=>p.floor===curFloor&&p.until<Date.now())||null;
const photoX=p=>136+p.i*18+6;
function unpinTick(ch,I,tp){
  if(ch.path.length||!ch.arrived)return;
  if(!I.stage){
    if(!I.t){I.t=tp+900;ch.face=1;return;}
    if(tp<I.t)return;
    const p=duePhoto();if(p){photos=photos.filter(x=>x!==p);blip(760,.03,'triangle');}
    I.stage=1;setTarget(ch,{x:46,y:177,dir:-1,st:'i-file'});
  }else if(I.stage===1){I.stage=2;cabPulse=tp+1300;I.until=tp+1300;emote(ch,'star');}
}
function unpinProps(g,ch,tp,I){if(I.phase==='do'&&I.stage===1){const x=Math.round(ch.x+dirOf(ch)*8)-2;R(g,x,ch.y-13,5,5,'#FFFDF8');R(g,x+1,ch.y-12,3,2,'#9FB0C8');}}
// A coffee spilt in front of the counter: a splash, then the stain; the next Claude free mops it up.
function maybeSpill(ch){
  if(stain||Math.random()>.15)return;
  stain={floor:curFloor,x:COUNTER.x-14,y:176,left:1,wet:0};emote(ch,'excl');setMood(ch,'surprised',800);blip(240,.08,'triangle');
  for(let i=0;i<10;i++)confetti.push({x:stain.x,y:stain.y,vx:(Math.random()-.5)*44,vy:-20-Math.random()*20,c:'#6B4226',life:.5,w:1});
}
function mopTick(ch,I,tp){if(stain)stain.left=Math.max(0,1-(tp-I.start)/I.dur);if(Math.random()<.1)confetti.push({x:stain?stain.x:ch.x,y:174,vx:(Math.random()-.5)*10,vy:-10,c:'rgba(200,230,255,.8)',life:.4,w:1});}
function mopEnd(ch,I,tp){if(stain)stain={...stain,left:0,wet:Date.now()+3500};emote(ch,'star');}
function mopProps(g,ch,tp,I){
  if(I.phase!=='do'||ch.path.length||!stain)return;
  // the mop sweeps over the stain; the bucket waits on the other side, its water darkening
  const mx=Math.round(stain.x+Math.sin(tp/130)*6),hx=Math.round(ch.x-8),hy=ch.y-9,n=10;
  for(let i=0;i<=n;i++)R(g,hx+(mx-hx)*i/n,hy+(ch.y-1-hy)*i/n,1,1,'#8A5A3A');
  R(g,mx-3,ch.y-1,7,1,'#E8E2D0');for(let i=-3;i<=3;i+=2)R(g,mx+i,ch.y,1,1+(Math.floor(tp/100+i)&1),'#CFC8B4');
  const bx=stain.x-20,by=ch.y;R(g,bx,by-6,8,6,'#7C8796');R(g,bx,by-6,8,1,'#AEB8C4');R(g,bx+1,by-5,6,1,mix('#8CCBF5','#6B4226',1-stain.left));R(g,bx,by-6,1,6,'#5E6876');
  R(g,bx+1,by-8,1,2,'#5E6876');R(g,bx+6,by-8,1,2,'#5E6876');R(g,bx+1,by-9,6,1,'#5E6876');
}
Object.assign(IDLES,{
  snowball:{w:1.7,t:[9,13],pair:'play',pose:ch=>playPose(ch,performance.now()),tick:fightTick,props:fightProps,lean:fightLean},
  selfie:{w:1.3,t:[6,7],pair:'chat',spots:[{x:184,y:150,dir:1},{x:198,y:150,dir:-1}],pose:selfiePose,tick:selfieTick,props:selfieProps},
  napside:{w:1,t:[14,22],pair:'nap',spots:[{x:186,y:171,dir:1},{x:200,y:171,dir:-1}],pose:napPose,floor:true,lean:napLean},
  share:{w:1.5,t:[20,20],can:ch=>!!freeForOne(ch,124),spot:()=>({x:COUNTER.x-6,y:178,st:'i-share'}),begin(ch,I,tp){I.stage=0;I.t=tp+1400;brewUntil=tp+1200;},pose:()=>'hold',tick:shareTick,props:shareProps},
  season:{w:1.3,t:[6,9],can:()=>!TH.noWeather&&SEASON!=='autumn'&&!(floorThing&&floorThing.kind===SEASON),spot:()=>({...SEASON_SPOT[SEASON],st:'i-season'}),begin:seasonBegin,tick:seasonTick,pose:()=>SEASON==='spring'?'water':SEASON==='summer'?'hold':'pet',end:seasonEnd,props:seasonProps},
  unpin:{w:0,t:[30,30],can:()=>!!duePhoto(),spot:()=>({x:photoX(duePhoto()),y:89,shelf:true,st:'i-unpin'}),pose:ch=>ch.idle.stage===2?'read':'stretch',tick:unpinTick,props:unpinProps},
  sweep:{w:0,weight:()=>lying().length?6:0,t:[40,40],can:ch=>!!nearestLying(ch),spot:ch=>sweepSpot(nearestLying(ch)),pose:sweepPose,tick:sweepTick,end:sweepEnd,props:sweepProps},
  clock:{w:.7,t:[8,8],spot:()=>({x:CLOCK_SPOT,y:89,dir:1,shelf:true,st:'i-clock'}),pose:clockPose,tick:clockTick,behind:clockLadder,props:clockKey,air:clockAir,aloft:true},
  doodle:{w:1.2,t:[4,6],spot:ch=>({x:ch.dx,y:89,shelf:true,st:'i-doodle'}),begin:doodleBegin,tick:doodleTick,pose:()=>'look'},
  shelfread:{w:1,t:[7,10],emo:'bulb',spot:()=>({x:70+Math.random()*40,y:89,shelf:true,st:'i-shelf'}),pose:()=>'read',tick:shelfTick},
  mop:{w:0,weight:()=>stain&&stain.left>0&&stain.floor===curFloor?7:0,t:[5,7],can:()=>!!(stain&&stain.left>0),spot:()=>({x:stain.x+10,y:stain.y+1,dir:-1,st:'i-mop'}),pose:()=>'pet',tick:mopTick,end:mopEnd,props:mopProps},
});
PLACE.mop='mop';PLACE.sweep='sweep';
IDLES.coffee.end=maybeSpill;
// Cleaning comes first: a Claude choosing what to do takes a chore nobody has yet, and the nearest one on
// a break drops what it is doing for it. Only a nap, a high five and what the cat knocked over can wait.
const CHORES=['mop','sweep','unpin'];
const choreTaken=(a,ch)=>[...chars.values()].some(o=>o!==ch&&o.idle&&o.idle.act===a);
function choreNow(ch){return CHORES.find(a=>IDLES[a].can(ch)&&!choreTaken(a,ch))||null;}
function callCleaner(tp){
  if(tp<callCleaner.at)return;callCleaner.at=tp+1000;
  CHORES.forEach(a=>{
    const list=[...chars.values()].filter(o=>!o.hidden&&!o.removed&&!o.held&&!o.fly&&!o.errand&&!o.treat&&o.act==='idle'&&o.idle&&!KEEP_DOING.includes(o.idle.act));
    if(!list.length||!IDLES[a].can(list[0])||choreTaken(a,null))return;
    const t=a==='mop'?{x:stain.x,y:stain.y}:a==='unpin'?{x:photoX(duePhoto()),y:89}:(f=>({x:f.x,y:f.gy}))(nearestLying(list[0]));
    const c=list.sort((p,q)=>Math.hypot(p.x-t.x,p.y-t.y)-Math.hypot(q.x-t.x,q.y-t.y))[0];
    releaseIdle(c);startIdle(c,a,null);
  });
}
callCleaner.at=0;
// How high a break activity lifts a Claude, and how far it leans; loop.js asks every frame.
const doingNow=ch=>{const I=ch.idle;return I&&I.phase==='do'&&!ch.path.length?IDLES[I.act]:null;};
function sceneAir(ch,tp){const D=doingNow(ch);return D&&D.air?D.air(ch,tp):0;}
function sceneLean(ch,tp){const D=doingNow(ch);return D&&D.lean?D.lean(ch,tp):0;}
const sceneFloor=ch=>{const D=doingNow(ch);return !!(D&&D.floor);};

// The stain and the ripples lie flat under everyone; what stands on the floor is sorted with the Claudes.
function roomItems(items,g){
  const now=Date.now(),tp=performance.now();
  shakenItems(items,tp);
  callCleaner(tp);
  photos=photos.filter(p=>p.until+PHOTO_MS>now); // nobody came to file it: it goes by itself in the end
  if(floorThing&&floorThing.until<now)floorThing=null;
  if(stain&&stain.left<=0&&now>(stain.wet||0))stain=null;
  if(stain&&stain.floor===curFloor){
    drawStain(g,stain);
    if(stain.wet>now){g.globalAlpha=Math.min(1,(stain.wet-now)/1500)*.3;R(g,stain.x-7,stain.y-1,15,3,'#D8EEFA');g.globalAlpha=1;}
  }
  ripples=ripples.filter(r=>tp-r.t0<500);
  ripples.forEach(r=>{const u=(tp-r.t0)/500,rx=4+u*26,ry=rx*.42;g.globalAlpha=(1-u)*.55;for(let a=0;a<28;a++){const k=a/28*Math.PI*2;R(g,r.x+Math.cos(k)*rx,r.y+Math.sin(k)*ry,1,1,'#FFFFFF');}g.globalAlpha=1;});
  photos.forEach(p=>{if(p.floor!==curFloor)return;const x=136+p.i*18,y=73,u=Math.min(1,(tp-(p.born||0))/900),e=1-Math.pow(1-u,3),px=p.fromX==null?x:p.fromX+(x-p.fromX)*e,py=p.fromY==null?y:p.fromY+(y-p.fromY)*e-Math.sin(u*Math.PI)*14;
    if(u<1){drawPhoto(g,p,Math.round(px),Math.round(py));return;}
    outlined(g,'photo'+p.i+p.a+p.b,c=>drawPhoto(c,p,x,y),c=>{R(c,x,y,12,12,'#FFFFFF');});R(g,x+5,y-1,2,2,'#D9534F');R(g,x+5,y-1,1,1,'#FF9A94');});
  const t=floorThing;if(!t||t.floor!==curFloor)return;
  if(t.kind==='winter'){
    const s=Math.max(1,Math.ceil(t.u*4)),melt=Math.max(0,1-(t.until-now)/30000);
    items.push({d:172,f:()=>{
      floorShadow(wx,201,172,16);
      if(melt<=0){outlined(wx,'snowman'+s+t.scarf,c=>snowmanSprite(c,s,t.scarf),c=>snowmanSprite(c,s,t.scarf));return;}
      // it melts in its last half minute: it sinks into a growing puddle
      wx.save();wx.beginPath();wx.rect(195,140,30,32);wx.clip();wx.translate(0,Math.round(melt*26));snowmanSprite(wx,s,t.scarf);wx.restore();
      R(wx,209-Math.round(6+melt*7),171,Math.round(13+melt*14),2,'#CFE6F4');}});
  }else if(t.kind==='spring'){
    items.push({d:136,f:()=>{R(wx,293,135,22,2,'#6B4A2E');R(wx,293,135,22,1,'#8A6240');
      [[295,0],[299,1],[303,2],[307,3],[311,4]].forEach(([x,i])=>{const g2=Math.max(0,Math.min(1,t.u*1.4-i*.09)),h=Math.round(1+g2*4),sw=Math.round(Math.sin(tp/700+i));
        R(wx,x,135-h,1,h,'#3E9A4A');if(g2>.5)R(wx,x+1,134-Math.round(h/2),1,1,'#6CC070');
        if(g2>.75){const c=['#FF8FB8','#FFD84A','#E58AE0','#FF8A5C','#8CCBF5'][i];R(wx,x-1+sw,134-h,3,1,c);R(wx,x+sw,133-h,1,3,c);R(wx,x+sw,134-h,1,1,'#FFF3B0');}});}});
  }
}

/* ---------- the pointer ---------- */
// A Claude let go in full flight tumbles, leaves a trail, bounces twice in dust and gets up dizzy; the others stare.
function flingClaude(ch,vx,vy,tp){
  ch.fly={vx:Math.max(-220,Math.min(220,vx)),h:8,hv:Math.min(120,50+Math.abs(vy)*.3),b:0,rot:0,trail:[]};
  ch.resumeAt=0;setMood(ch,'surprised',2500);emote(ch,'excl');blip(700,.06,'triangle');
}
function flyTick(ch,dt,tp){
  const f=ch.fly;
  ch.x+=f.vx*dt;if(ch.x<8||ch.x>312){ch.x=inRoomX(ch.x);f.vx*=-.6;puff(ch.x,ch.y-8,5,'rgba(255,255,255,.6)',24);}
  f.rot+=f.vx*dt*.09;f.h+=f.hv*dt;f.hv-=320*dt;
  f.trail.push({x:ch.x,y:ch.y-f.h-8});if(f.trail.length>5)f.trail.shift();
  if(f.h>0)return;
  f.h=0;f.b++;f.hv=70/f.b;f.vx*=.55;ch.sqv-=26;puff(ch.x,ch.y,9-f.b*2,'rgba(255,255,255,.6)',36);blip(320+f.b*60,.04,'triangle');
  if(f.b<3)return;
  ch.fly=null;const s=landingSpot(ch.x,ch.y);ch.x=s.x;ch.y=s.y;ch.arrived=true;ch.resumeAt=tp+2600;ch.getUpUntil=tp+800;
  setMood(ch,'dizzy',2200);
  chars.forEach(o=>{if(o!==ch&&!o.hidden&&!o.held&&Math.random()<.7){o.face=Math.sign(ch.x-o.x)||1;emote(o,'excl');}});
}
// Tumbling goes by quarter turns, so the pixels stay square.
function drawFlying(g,ch,o,x,y){
  const f=ch.fly;
  f.trail.forEach((p,i)=>{g.globalAlpha=.08+i*.05;R(g,p.x-4,p.y-4,8,8,ch.look.c);});g.globalAlpha=1;
  const sh=Math.max(2,6-Math.floor(f.h/5));R(g,ch.x-sh,ch.y,sh*2,1,'rgba(0,0,0,.2)');
  const cy=y-8,q=Math.round(f.rot/(Math.PI/2))*(Math.PI/2);
  g.save();g.translate(x,cy);g.rotate(q);g.translate(-x,-cy);const top=drawPerson(g,x,y,{...o,air:0,spin:true});g.restore();
  return cy-9;
}
// A double click: it waves at you, and the ones on a break wave at it.
stage.addEventListener('dblclick',e=>{
  if(overUi(e))return;
  const p=toWorld(e),c=charAt(p.x,p.y);if(!c)return;
  const tp=performance.now();c.waveUntil=tp+1800;c.sqv+=16;emote(c,'heart');blip(990,.05);
  chars.forEach(o=>{if(o!==c&&!o.hidden&&!o.held&&o.act==='idle'&&!o.path.length){o.waveUntil=tp+1500;o.face=Math.sign(c.x-o.x)||1;}});
});
// What a tremble shakes loose: sheets off the desks, leaves off the big plant; in autumn the wind brings
// tree leaves in. Each one flutters down and lies on the floor (gy) until a Claude picks it up (sweepTick);
// the time limit only clears what nobody could reach. Another tremble sends what lies there hopping.
const SHAKEN_MS=600000,SHAKEN_MAX=48,PAPER_ODDS=.3;
function shakeLoose(x,y,gy,c,kind,drift){if(shaken.length<SHAKEN_MAX)shaken.push({floor:curFloor,x,gy,h:Math.max(0,gy-y),c,kind,seed:Math.random()*6,drift:drift==null?(Math.random()-.5)*14:drift,rest:0});}
function shakeRoom(){
  shaken.forEach(f=>{if(f.rest&&f.floor===curFloor){f.rest=0;f.h=4+Math.random()*8;f.drift=(Math.random()-.5)*26;}});
  // a sheet only now and then: one tremble in three or so per desk, and never from a desk whose sheet is still on the floor
  deskXs(desks.length).forEach(dx=>{if(Math.random()<PAPER_ODDS&&!shaken.some(f=>f.kind==='paper'&&f.floor===curFloor&&Math.abs(f.x-dx)<30))shakeLoose(dx-14+Math.random()*10,96,126+Math.random()*6,'#FFFDF8','paper');});
  for(let i=0;i<4;i++)shakeLoose(296+Math.random()*16,100+Math.random()*14,136+Math.random()*4,i%2?TH.leafB:TH.leafA,'leaf');
}
// A gust through the open window now and then, every 3 to 5 minutes: a few leaves cross the room.
function leafGust(){
  for(let i=0;i<3;i++){const gy=140+Math.random()*34,x=135+Math.random()*Math.max(10,COUNTER.x-150),h=gy-62;shakeLoose(282,62,gy,LEAF_COLS[i%LEAF_COLS.length],'tree',(x-282)/(h/30));}
}
function shakenItems(items,tp){
  const dt=Math.min(.05,Math.max(0,(tp-shakenAt)/1000)),now=Date.now();shakenAt=tp;
  if(!nextGust)nextGust=now+60000;
  if(now>nextGust){nextGust=now+180000+Math.random()*120000;if(!TH.noWeather&&seasonNow()==='autumn'&&windowIsOpen())leafGust();}
  shaken=shaken.filter(f=>!f.rest||now<f.rest+SHAKEN_MS);
  shaken.forEach(f=>{
    if(f.floor!==curFloor)return;
    if(!f.rest){f.h-=dt*30;f.x+=(f.drift+Math.sin(tp/170+f.seed)*22)*dt;if(f.h<=0){f.h=0;f.rest=now;}}
    const w=f.kind==='paper'?4:2,flip=!f.rest&&Math.sin(tp/110+f.seed)>0;
    items.push({d:f.gy,f:()=>{const y=Math.round(f.gy-f.h);
      R(wx,f.x,y,flip?w-1:w,f.kind==='paper'&&!f.rest?2:1,f.c);if(f.kind==='paper'&&f.rest)R(wx,f.x,y+1,w,1,'#D8D2C2');else if(f.kind!=='paper')R(wx,f.x+1,y+(flip?-1:1),1,1,shade(f.c,-.2));}});
  });
}
// A tap on the floor: a ring runs across the boards, the room trembles, and the ones on a break jump.
function floorTap(p,tp){
  if(p.y<FLOOR_Y)return;
  ripples.push({x:p.x,y:p.y,t0:tp});puff(p.x,p.y,8,'rgba(255,255,255,.6)',30);shakeRoom();
  blip(180,.08,'triangle');
  if(!calmMotion()&&world.animate)world.animate([{transform:'translateY(0)'},{transform:'translateY(2px)'},{transform:'translateY(-1px)'},{transform:'translateY(0)'}],{duration:180});
  chars.forEach(c=>{if(c.hidden||c.held||c.fly||c.act!=='idle'||c.path.length)return;
    const delay=Math.hypot(c.x-p.x,c.y-p.y)*1.5; // the ones nearer jump first
    c.jumpUntil=Math.max(c.jumpUntil,tp+delay+300);c.face=Math.sign(p.x-c.x)||1;setMood(c,'surprised',700+delay);});
}

/* ---------- leaving and coming back to the desk ---------- */
// Off to a break: it reaches for the lamp and switches it off. Back at work: the lamp comes on, the doodle goes.
function sceneAct(ch,from,to){
  const tp=performance.now();
  if(to==='idle'&&ch.seated&&!lampOff.has(ch.id)){ch.lampAt=tp+320;ch.lampReach=tp+600;if(ch.idle)ch.idle.t=Math.max(ch.idle.t||0,tp+800);}
  if(from==='idle'&&to!=='idle'){ch.doodle=null;ch.lampAt=0;if(ch.autoLamp){lampOff.delete(ch.id);ch.autoLamp=false;}}
}
function sceneFrame(ch,dt,tp){
  if(ch.fly)flyTick(ch,dt,tp);
  if(ch.lampAt&&tp>ch.lampAt){ch.lampAt=0;lampOff.add(ch.id);ch.autoLamp=true;blip(420,.03);}
}
