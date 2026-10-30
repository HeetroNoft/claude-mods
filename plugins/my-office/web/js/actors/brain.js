// The idle brain: what a Claude on a break gets up to, alone or in pairs, and scenes.
'use strict';
const ROAM=[{x:140,y:142},{x:200,y:138},{x:186,y:164},{x:248,y:140},{x:64,y:140},{x:212,y:176},{x:120,y:132}];
const SPOT={window:{x:283,y:133,st:'i-window'},plant:{x:287,y:131,dir:1,st:'i-plant'}};
const CHAT=[{x:176,y:150,dir:1},{x:204,y:150,dir:-1}],PLAY=[{x:158,y:158,dir:1},{x:222,y:158,dir:-1}];
// Every break activity: how often it is picked (w), how long it lasts in seconds (t), the emote it
// shows now and then, and for the ones done in twos, which pair of spots it uses. A weight of 0 means
// only a room that lists it in THEME_IDLES offers it.
const IDLES={
  coffee:{w:3,t:[8,14],emo:'heart'},window:{w:2,t:[6,10],emo:'dots'},plant:{w:1.6,t:[4,6],emo:'note'},
  stretch:{w:1.4,t:[3,4.5],emo:'sweat'},wander:{w:1.8,t:[3,6],emo:'note'},juggle:{w:1.1,t:[6,9],emo:'star'},
  read:{w:1.2,t:[7,11],emo:'bulb'},yoga:{w:1,t:[5,8],emo:'sweat'},dance:{w:1,t:[5,8],emo:'note'},
  game:{w:1.1,t:[6,10],emo:'zap'},doze:{w:0,t:[5,8]},files:{w:.9,t:[4,6],emo:'excl'},tinker:{w:.9,t:[4,6],emo:'zap'},
  tea:{w:0,t:[7,11],emo:'cup'},origami:{w:0,t:[5,7],emo:'spark'},donut:{w:0,t:[5,8],emo:'heart'},
  float:{w:0,t:[6,9],emo:'star'},catpet:{w:.8,t:[5,8]},tidy:{w:0,t:[60,60]},arcade:{w:0,t:[5,8],emo:'star'},
  chat:{w:3.4,t:[9,15],pair:'chat'},play:{w:2.4,t:[9,14],pair:'play'},rps:{w:2.2,t:[8,12],pair:'chat'},
  planes:{w:2,t:[8,12],pair:'play'},duet:{w:1.4,t:[7,10],pair:'chat',emo:'note'},
  highfive:{w:0,t:[1.7,1.7]},
};
// What each room adds to the pool, with its own weight.
const THEME_IDLES={japan:{tea:2.6,origami:1.8},paper:{donut:2.6,files:1.6},retro:{dance:1.8,files:1.6},space:{float:2.8},
  cosy:{catpet:2.4,read:1.6},neon:{dance:2.2,arcade:2},pixel:{tinker:1.4},claude:{read:1.6}};
// Solo activities that share a place: only one Claude at a time in each group. The tea or doughnut
// table sits between the chat spots, so it also waits while a pair is chatting there.
const PLACE={window:'win',plant:'win',tea:'table',donut:'table',files:'cab',tinker:'mach',arcade:'mach',catpet:'cat'};
function onActChange(ch,from,to){
  if(to==='ask'){blip(880,.08,'sine');setTimeout(()=>blip(1175,.1,'sine'),140);}
  if(to==='limit'){blip(220,.3,'triangle');setMood(ch,'surprised',600);}
  if(from!=='idle')return;
  const napping=ch.idle&&ch.idle.act==='nap';releaseIdle(ch);
  if(napping){setMood(ch,'surprised',900);ch.jumpUntil=performance.now()+500;emote(ch,'excl');}
}
function releaseIdle(ch){if(!ch)return;const I=ch.idle;ch.idle=null;if(I&&I.pair&&I.pair.idle&&I.pair.idle.pair===ch)I.pair.idle={phase:'pick',t:performance.now()+800,last:I.act};}
function thinkIdle(ch,tp,now){
  const I=ch.idle;
  if(I.phase==='pick'){if(tp>=(I.t||0)&&!ch.path.length)chooseIdle(ch,tp,now);return;}
  if(I.phase==='pre'){if(tp>=I.until){I.phase='go';setTarget(ch,{x:ch.dx,y:SEAT_Y,seated:true,st:'desk'});}return;}
  if(I.phase==='go'){if(!ch.path.length&&ch.arrived){I.phase='do';I.start=tp;I.until=tp+(I.dur||0);ch.nextEmote=tp+1500+Math.random()*3000;idleBegins(ch,I,tp);}return;}
  if(I.pair){
    const p=I.pair;
    if(!p.idle||p.idle.pair!==ch||p.hidden||p.removed){ch.idle={phase:'pick',t:tp+500,last:I.act};return;}
    const lead=I.role===0?I:p.idle;
    if(!lead.sync){if(p.idle.phase!=='do')return;lead.sync=tp;I.until=p.idle.until=tp+lead.dur;}
    if(I.act==='rps')rpsTick(ch,I,tp);
    if(I.act==='duet'&&tp>ch.nextEmote){ch.nextEmote=tp+2500+Math.random()*2500;emote(ch,'note');}
    if(I.role===0&&tp>I.until){ch.idle={phase:'pick',t:tp+800+Math.random()*1500,last:I.act};p.idle={phase:'pick',t:tp+1200+Math.random()*1500,last:I.act};}
    return;
  }
  // a nap ends on its own: the Claude wakes with a stretch and finds something else to do
  if(I.act==='nap'){if(tp>I.until){setMood(ch,'happy',900);emote(ch,'note');ch.sqv+=14;ch.idle={phase:'pick',t:tp+900+Math.random()*1200,last:'nap'};}return;}
  idleTick(ch,I,tp);
  const emo=(IDLES[I.act]||{}).emo;
  if(emo&&tp>ch.nextEmote){ch.nextEmote=tp+3500+Math.random()*5000;if(Math.random()<.45)emote(ch,emo);}
  if(tp>I.until){idleEnds(ch,I,tp);ch.idle={phase:'pick',t:tp+500+Math.random()*1500,last:I.act};}
}
// The moment an activity starts, while it runs, and as it ends.
function idleBegins(ch,I,tp){
  if(I.act==='plant')plantT=tp;
  if(I.act==='tidy')I.stepUntil=tp+900; // crouched over what the cat knocked down, then it goes back (world/cat.js)
  if(I.act==='window')openForAView(); // a Claude come to look out opens what is in the way
  if(I.act==='dance'||I.act==='game'||I.act==='float')setMood(ch,'happy',I.dur);
  if(I.act==='highfive'){const f=chars.get(I.with);I.sparkAt=tp+380;
    if(f&&!f.hidden){f.hfUntil=tp+1500;f.face=Math.sign(ch.x-f.x)||1;setMood(f,'happy',2000);}}
}
// Beside the cat, close enough to reach it: a Claude never strokes the air.
const catReach=p=>cat&&!cat.away&&Math.abs(Math.abs(p.x-cat.x)-10)<=4&&Math.abs(p.y-cat.y)<=4;
function idleTick(ch,I,tp){
  if(I.act==='arcade')funUntil=Math.max(funUntil,tp+300);
  if(I.act==='tidy')tidyTick(ch,I,tp);
  if(I.act==='catpet'&&!catReach(ch)){I.until=0;return;}
  if(I.act==='catpet'&&tp>(I.nextPurr||0)){I.nextPurr=tp+1800+Math.random()*1500;emoteAt(cat.x+3,cat.y-9,'heart');purr();cat.until=Math.max(cat.until,tp+4000);}
  if(I.act==='highfive'&&I.sparkAt&&tp>I.sparkAt){I.sparkAt=0;const f=chars.get(I.with);
    const x=f?(ch.x+f.x)/2:ch.x,y=(ch.headTop!=null?ch.headTop:ch.y-18)-4;
    emoteAt(x-2,y,'star');for(let i=0;i<12;i++)confetti.push({x,y,vx:(Math.random()-.5)*40,vy:-10-Math.random()*20,c:CONF[i%CONF.length],life:.8,w:1});blip(1046,.05,'triangle');}
}
function idleEnds(ch,I,tp){
  if(I.act==='doze'){setMood(ch,'surprised',900);ch.jumpUntil=tp+380;emote(ch,'excl');}
  if(I.act==='origami'){const y=(ch.headTop!=null?ch.headTop:ch.y-18)+6;leaves.push({x:ch.x,y,vx:-14,vy:-26,life:2.6,p:0,w:2,c:'#FFFFFF'});emote(ch,'star');}
  if(I.act==='tea'||I.act==='donut')setMood(ch,'happy',1200);
}
// What a Claude on a break does next, in order of preference: a coffee first (always the first thing
// on a break, then 45% of the time, 25% right after one), then a nap at its desk (25%, 35% after a
// long break, 10% right after one), and otherwise one of the other activities, by their weights.
const NAP_SECONDS=[15,30];
function chooseIdle(ch,tp,now){
  const last=ch.idle&&ch.idle.last,dk=ch.desk||{},longBreak=(now||Date.now())-(+dk.activityMs||now||Date.now())>NAP_MS;
  const drinking=[...chars.values()].filter(o=>o!==ch&&o.idle&&o.idle.act==='coffee'&&o.idle.phase!=='pick').length;
  const pCoffee=!last?1:drinking>=4?0:last==='coffee'?.25:.45,pNap=last==='nap'?.1:longBreak?.35:.25,r0=Math.random();
  if(r0<pCoffee){startIdle(ch,'coffee',null);return;}
  if(r0<pCoffee+pNap*(1-pCoffee)){startNap(ch,tp);return;}
  const others=[...chars.values()].filter(o=>o!==ch&&!o.hidden&&!o.removed);
  const busyPlace=pl=>others.some(o=>o.idle&&o.idle.phase!=='pick'&&PLACE[o.idle.act]===pl);
  const busyPair=grp=>others.some(o=>o.idle&&o.idle.pair&&IDLES[o.idle.act]&&IDLES[o.idle.act].pair===grp);
  const partner=others.find(o=>o.act==='idle'&&o.idle&&!o.errand&&!o.held&&!o.path.length&&!o.idle.pair&&o.idle.act!=='nap'&&o.idle.act!=='highfive'&&(o.idle.phase==='pick'||o.idle.phase==='do'));
  const extra=THEME_IDLES[themeKey]||{},ok=[];
  for(const a in IDLES){
    const D=IDLES[a],w=extra[a]!=null?extra[a]:D.w;
    if(!w||a===last||a==='coffee')continue; // coffee and naps are picked above
    if(D.pair){if(!partner||busyPair(D.pair)||(D.pair==='chat'&&busyPlace('table')))continue;}
    else if(PLACE[a]&&(busyPlace(PLACE[a])||(PLACE[a]==='table'&&busyPair('chat'))))continue;
    if(a==='catpet'&&(!cat||cat.away||cat.job||cat.z>0))continue;
    ok.push([a,w]);
  }
  let r=Math.random()*ok.reduce((s,o)=>s+o[1],0),pick=ok.length?ok[0][0]:'coffee';
  for(const [a,w] of ok){r-=w;if(r<=0){pick=a;break;}}
  startIdle(ch,pick,partner);
}
function startIdle(ch,act,partner){
  const D=IDLES[act],dur=(D.t[0]+Math.random()*(D.t[1]-D.t[0]))*1000;
  if(D.pair){
    const spots=D.pair==='chat'?CHAT:PLAY,swap=Math.abs(ch.x-spots[1].x)<Math.abs(ch.x-spots[0].x);
    releaseIdle(partner);
    ch.idle={act,phase:'go',dur,pair:partner,role:0,last:act};
    partner.idle={act,phase:'go',dur,pair:ch,role:1,last:act};
    setTarget(ch,{...spots[swap?1:0],st:'i-'+act+(swap?1:0)});
    setTarget(partner,{...spots[swap?0:1],st:'i-'+act+(swap?0:1)});
    return;
  }
  ch.idle={act,phase:'go',dur,last:act};
  let t;
  switch(act){
    case 'coffee':{const used=new Set([...chars.values()].filter(o=>o!==ch&&o.idle&&o.idle.act==='coffee').map(o=>o.idle.spot));let s=0;while(used.has(s)&&s<3)s++;ch.idle.spot=s;t={...posFor('coffee',s),st:'i-coffee'+s};break;}
    case 'window':case 'plant':t={...SPOT[act]};break;
    case 'tea':case 'donut':t={x:171,y:158,dir:1,st:'i-table'};break;
    case 'files':t={x:46,y:177,dir:-1,st:'i-files'};break;
    case 'tinker':t={x:131,y:178,dir:-1,st:'i-tinker'};break;
    case 'arcade':t={x:81,y:178,dir:1,st:'i-arcade'};break;
    case 'catpet':{const s=cat.x>160?-10:10;t={x:cat.x+s,y:Math.max(FLOOR_Y+2,cat.y+1),dir:-Math.sign(s),st:'i-cat'};break;}
    default:{const free=ROAM.filter(p=>![...chars.values()].some(o=>o!==ch&&o.tgt&&Math.hypot(o.tgt.x-p.x,o.tgt.y-p.y)<14)),pool=free.length?free:ROAM,p=pool[(Math.random()*pool.length)|0];t={x:p.x,y:p.y,st:'i-roam'};}
  }
  setTarget(ch,t);
  // the cat waits where it is; with its side taken (setTarget stepped aside), the Claude finds something else to do
  if(act==='catpet'){if(catReach(ch.tgt)){cat.path=[];cat.state='sit';cat.until=performance.now()+20000;}else ch.idle={phase:'pick',t:performance.now()+800,last:act};}
}
// A nap: a yawn, a walk back to the desk, then 15 to 30 s asleep in the chair.
function startNap(ch,tp){releaseIdle(ch);ch.idle={act:'nap',phase:'pre',until:tp+1600,dur:(NAP_SECONDS[0]+Math.random()*(NAP_SECONDS[1]-NAP_SECONDS[0]))*1000,last:'nap'};emote(ch,'dots');}
function idlePose(ch,tp){
  const I=ch.idle; if(!I)return 'stand';
  if(I.phase==='pre')return 'yawn';
  if(I.phase!=='do')return 'stand';
  switch(I.act){
    case 'coffee':case 'tea':return 'sip';
    case 'window':return 'look';
    case 'plant':return 'water';
    case 'stretch':return ((tp-I.start)%2600)<1700?'stretch':'stand';
    case 'juggle':return 'juggle';
    case 'read':case 'files':return 'read';
    case 'yoga':return ((tp-I.start)%5000)<3200?'yoga':'stretch';
    case 'dance':case 'duet':return 'dance';
    case 'game':return 'game';
    case 'doze':case 'nap':return 'sleep';
    case 'tinker':case 'arcade':return 'press';
    case 'donut':return 'eat';
    case 'origami':return 'fold';
    case 'float':return 'float';
    case 'catpet':return 'pet';
    case 'tidy':return I.step==='pick'?'pet':'hold';
    case 'highfive':return 'highfive';
    case 'chat':return speaking(ch,tp)?'talk':'stand';
    case 'play':case 'planes':return playPose(ch,tp);
    case 'rps':return rpsPose(ch,tp);
  }
  return 'stand';
}
function leadOf(ch){const I=ch.idle;if(!I||!I.pair)return null;if(I.role===0)return I;const o=I.pair.idle;return o&&o.pair===ch?o:null;}
function speaking(ch,tp){const L=leadOf(ch);if(!L||!L.sync)return false;const t=tp-L.sync,turn=Math.floor(t/1900);return turn%2===ch.idle.role&&t-turn*1900<1450;}
function playPose(ch,tp){const L=leadOf(ch);if(!L||!L.sync)return 'stand';const k=(tp-L.sync)/1700,leg=Math.floor(k),u=k-leg;
  if(ch.idle.role===leg%2)return u<.18?'throw':'stand';return u>.8?'catch':'stand';}
// Rock, paper, scissors: three pumps, then both hands show; the winner cheers, the loser sweats.
const RPS_ROUND=2600,RPS_SHOW=1200;
const RPS_ICONS=[['.111.','11111','11111','.111.'],['1111','1..1','1..1','1111'],['1...1','.1.1.','..1..','.1.1.','1...1']];
function rpsHand(ch,round){const L=leadOf(ch),leadCh=ch.idle.role===0?ch:ch.idle.pair;return hash(String(leadCh.id)+':'+round+':'+ch.idle.role+(L?L.dur:0))%3;}
function rpsState(ch,tp){const L=leadOf(ch);if(!L||!L.sync)return null;const t=tp-L.sync,round=Math.floor(t/RPS_ROUND),u=t-round*RPS_ROUND;
  const mine=rpsHand(ch,round),theirs=rpsHand(ch.idle.pair,round),res=(mine-theirs+3)%3;return {round,u,mine,win:res===1,lose:res===2};}
function rpsPose(ch,tp){const s=rpsState(ch,tp);if(!s)return 'stand';if(s.u<RPS_SHOW)return 'rps';return s.win&&s.u>RPS_SHOW+300?'cheer':'stand';}
function rpsTick(ch,I,tp){const s=rpsState(ch,tp);if(!s||s.u<RPS_SHOW||I.shown===s.round)return;I.shown=s.round;
  if(s.win)setMood(ch,'happy',1100);else if(s.lose)emote(ch,'sweat');}
// A Claude that finishes its plan gets a high five from the nearest colleague on a break; everyone else claps.
function sceneHighFive(id){
  const ch=chars.get(id);if(!ch||ch.hidden)return;const tp=performance.now();
  const others=[...chars.values()].filter(o=>o!==ch&&!o.hidden&&!o.removed&&!o.held);
  const free=others.filter(o=>o.act==='idle'&&!o.errand&&!(o.idle&&o.idle.pair)).sort((a,b)=>Math.hypot(a.x-ch.x,a.y-ch.y)-Math.hypot(b.x-ch.x,b.y-ch.y));
  const buddy=free[0];
  others.forEach(o=>{if(o!==buddy&&!o.path.length)o.clapUntil=tp+1600;});
  if(!buddy)return;
  releaseIdle(buddy);
  const side=buddy.x<ch.x?-1:1,t=ch.seated?{x:ch.x+side*9,y:124,dir:-side}:{x:ch.x+side*13,y:ch.y,dir:-side};
  t.x=Math.max(8,Math.min(312,t.x));
  buddy.idle={act:'highfive',phase:'go',dur:1700,last:'highfive',with:id};
  setTarget(buddy,{...t,st:'i-hf'});
}
// Colleagues who are standing about wave at a Claude walking in.
function greetNewcomer(nc){const tp=performance.now();chars.forEach(o=>{if(o!==nc&&!o.hidden&&!o.removed&&!o.path.length&&!o.held&&Math.random()<.8){o.waveUntil=tp+1300+Math.random()*700;o.face=-1;}});}
// a ball is the props.js ball, centred on x, y
function ball(g,x,y,c){drawProp(g,'ball',x-2,y-2,{col:c});}
function drawJuggle(g,ch,tp,t0,col){if(ch.headTop==null)return;for(let j=0;j<2;j++){const u=((tp-t0)/800+j*.5)%1,h=u<.5?u*2:(u-.5)*2;
  ball(g,ch.x+(u<.5?-5+u*20:5-(u-.5)*20),ch.headTop+3-Math.sin(Math.PI*h)*9,col||(j?TH.ball:shade(TH.ball,.35)));}}
function drawIdleProps(g,ch,tp){
  const I=ch.idle;if(I&&I.act==='tidy')drawCarried(g,ch);
  if(!I||I.phase!=='do'||ch.path.length)return;
  if(I.act==='juggle')drawJuggle(g,ch,tp,I.start);
  if((I.act==='play'||I.act==='planes')&&I.role===0&&I.sync&&I.pair){const o=I.pair,k=(tp-I.sync)/1700,leg=Math.floor(k),u=k-leg,A=leg%2?o:ch,B=leg%2?ch:o;
    const ax=A.x+Math.sign(B.x-A.x)*9,ay=A.y-12,bx=B.x+Math.sign(A.x-B.x)*9,by=B.y-12,x=ax+(bx-ax)*u,y=ay+(by-ay)*u-Math.sin(Math.PI*u)*18;
    if(I.act==='play')ball(g,x,y,TH.ball);else drawPlane(g,x,y,bx>ax?1:-1);}
  if((I.act==='tea'||I.act==='coffee')&&ch.headTop!=null&&Math.floor(tp/300)%2){R(g,Math.round(ch.x-11),Math.round(ch.headTop+3-(tp/150)%4),1,1,'rgba(255,255,255,.7)');}
  if(I.act==='game'&&ch.headTop!=null){g.fillStyle='rgba(127,232,255,.18)';g.fillRect(Math.round(ch.x-5),Math.round(ch.headTop+6),10,6);}
}
