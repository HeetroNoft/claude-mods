// Mascot life: springs, blinks, moods, where the eyes look.
'use strict';
// Mascot life: springs, moods, the idle brain, emotes and sound effects.
const BREATHE=new Set(['sit','stand','sip','look','talk','sleep','read']);
function animChar(ch,tp,dt,now){
  if(ch.fly)flyTick(ch,dt,tp); // actors/scenes.js
  if(!ch.removed&&ch.idle&&!ch.errand)thinkIdle(ch,tp,now);
  if(ch.hidden)return;
  // squash and stretch: a damped spring that pokes, jumps and landings kick
  ch.sqv+=(-ch.sq*260-ch.sqv*16)*dt; ch.sq+=ch.sqv*dt;
  const jumping=tp<ch.jumpUntil; if(jumping&&!ch.wasJump)ch.sqv+=18; if(!jumping&&ch.wasJump)ch.sqv-=26; ch.wasJump=jumping;
  if(tp>ch.nextBlink){ch.blinkAt=tp;ch.nextBlink=tp+2000+Math.random()*3800;ch.dbl=Math.random()<.22;}
  if(ch.pet>0){ch.pet=Math.max(0,ch.pet-dt*30);if(ch.pet>42){ch.pet=0;setMood(ch,'love',1500);emote(ch,'heart');ch.sqv-=14;purr();}}
  // a cursor resting by a Claude's head gets a small wave, at most every 9 s
  if(ptr.in&&!ch.held&&!ch.path.length&&tp-(ptr.movedAt||0)>1200&&tp>(ch.nextWave||0)){
    const ht=ch.headTop!=null?ch.headTop:ch.y-15;
    if(Math.hypot(ptr.x-ch.x,ptr.y-(ht+6))<22){ch.waveUntil=tp+1300;ch.nextWave=tp+9000;ch.face=Math.sign(ptr.x-ch.x)||1;}
  }
  // waiting for you: hop at the desk every second or so, and now and then a ? (or ! for a permission)
  if(ch.act==='ask'&&!ch.path.length&&!ch.held&&tp>(ch.nextCall||0)){ch.jumpUntil=tp+360;ch.nextCall=tp+1000+Math.random()*350;
    if(Math.random()<.35)emote(ch,(ch.desk&&ch.desk.waiting&&ch.desk.waiting.kind==='permission')?'excl':'quest');}
  // back to work (or play) a moment after being put down somewhere
  if(ch.resumeAt&&tp>ch.resumeAt){ch.resumeAt=0;if(ch.act!=='idle'&&ch.want){ch.tgt=null;setTarget(ch,ch.want);}else if(!ch.idle)ch.idle={phase:'pick',t:tp+300};}
}
// Follow-through, one set of springs per Claude. What it wears trails behind the head (x, y: px off
// its rest place; y<0 is off the head, and it can never sink in), a fright or a greeting kicks a hat
// up, and the arm with a treat (raise, 0..1) and a lifted prop (lift, px) ease to where they go.
const POP_POSES={cheer:45,wave:40,highfive:40,catch:55};
function trailOf(ch,x,y,pose,mood,raiseTo,liftTo,tp){
  const a=ch.trail||(ch.trail={x:0,y:0,vx:0,vy:0,hx:x,hy:y,t:tp,pose,mood,raise:raiseTo,rv:0,lift:liftTo,lv:0});
  const dt=Math.min(.033,(tp-a.t)/1000),dx=x-a.hx,dy=y-a.hy;a.t=tp;a.hx=x;a.hy=y;
  if(Math.abs(dx)+Math.abs(dy)>14){a.x=a.y=a.vx=a.vy=0;}else{a.x-=dx;a.y-=dy;} // a long jump is a teleport: no trail
  if(pose!==a.pose&&POP_POSES[pose])a.vy-=POP_POSES[pose];
  if(mood==='surprised'&&a.mood!=='surprised')a.vy-=80;
  a.pose=pose;a.mood=mood;
  a.vx+=(-a.x*150-a.vx*8)*dt;a.x=Math.max(-3,Math.min(3,a.x+a.vx*dt));
  a.vy+=(-a.y*150-a.vy*8)*dt;a.y=Math.max(-4,a.y+a.vy*dt);
  if(a.y>0){a.y=0;if(a.vy>0)a.vy*=-.3;}
  a.rv+=((raiseTo-a.raise)*130-a.rv*17)*dt;a.raise+=a.rv*dt;
  a.lv+=((liftTo-a.lift)*130-a.lv*14)*dt;a.lift+=a.lv*dt;
  return a;
}
function blinking(ch,tp){const t=tp-(ch.blinkAt||-1e9);return t<110||(ch.dbl&&t>230&&t<330);}
function setMood(ch,m,ms){ch.mood=m;ch.moodUntil=performance.now()+ms;}
function moodOf(ch,tp,pose){if(ch.act==='limit')return 'dead';if(tp<ch.moodUntil)return ch.mood;if(pose==='catch')return 'happy';return null;}
function gazeOf(ch,tp){
  if(hoverCh===ch&&ptr.in){const d=ptr.x-ch.x;return Math.abs(d)<3?0:Math.sign(d);}
  if(ch.lookDoor>tp&&!ch.path.length)return -1; // someone knocked: everyone looks round at the door
  // Claudes near the cursor follow it with their eyes
  if(ptr.in&&!ch.held&&!ch.path.length){const d=ptr.x-ch.x;if(ch.act==='idle'||(Math.abs(d)<70&&Math.abs(ptr.y-ch.y)<50))return Math.abs(d)<3?0:Math.sign(d);}
  // at work, a glance to one side every few seconds
  if(ch.seated&&!ch.path.length&&ch.act!=='idle'){const k=(tp/1000+ch.blinkT*2)%6.5;if(k>5.6)return k>6.05?1:-1;}
  if(ch.path.length)return ch.face||0;
  const I=ch.idle;
  if(I&&I.phase==='do'){if(I.pair)return Math.sign(I.pair.x-ch.x);if(I.act==='wander')return Math.round(Math.sin((tp-I.start)/800));if(I.act==='plant')return ch.face||1;}
  // standing about: a look round the room now and then, one way then the other
  if(!ch.seated){const k=(tp/1000+ch.blinkT*3)%7.5;if(k>6)return k<6.7?-1:1;}
  return 0;
}
function dirOf(ch){const tp=performance.now();if(ch.path.length&&!ch.held)return ch.face||1;if(tp<(ch.waveUntil||0)||tp<(ch.hfUntil||0)||ch.held)return ch.face||1;const I=ch.idle;if(I&&I.pair)return Math.sign(I.pair.x-ch.x)||1;return (ch.tgt&&ch.tgt.dir)||ch.face||1;}
function sqOf(ch,tp,pose,jy){
  if(pose==='slump')return -2;
  let s=Math.round(ch.sq);
  if(!ch.path.length&&!jy&&BREATHE.has(pose))s+=((tp/1000+ch.blinkT)%2.8)<1.4?0:1;
  if(pose==='stretch')s+=1+Math.round(Math.sin(tp/240));
  return s;
}
