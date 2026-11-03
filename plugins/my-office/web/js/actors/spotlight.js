// A Claude whose card is open: it stops where it stands and idles in place, then takes up its work again.
'use strict';
// While its card is open (ui/ui.js) a Claude drops everything where it is, seated or standing: no walking,
// no break activity, no typing. It plays a short in-place animation, rests a moment, then plays another.
// When the card closes, a Claude that was busy (at work, on its way somewhere, in a break activity) gives a
// start and takes it up again; a break activity it was walking to starts where it stands.
const SPOT_STAND=['stretch','yoga','juggle','dance','read','phone','game','sleep'];
const SPOT_SEATED=['stretch','juggle','read','game','phone','sleep'];
function holdStill(ch){
  if(!ch||ch.spot)return;
  const tp=performance.now();
  ch.spot={since:tp,pose:null,last:null,start:tp,until:tp+700};ch.v=0;
}
function letGo(ch){
  if(!ch||!ch.spot)return;
  const tp=performance.now(),held=tp-ch.spot.since,I=ch.idle;ch.spot=null;
  const busy=ch.act!=='idle'||ch.path.length>0||!!(I&&I.phase!=='pick');
  if(I){
    // walking to a break activity: it starts here instead (a nap still goes back to the chair)
    if(I.phase==='go'&&I.act!=='nap'&&ch.path.length){ch.path=[];ch.tgt=null;ch.arrived=true;I.phase='do';I.start=tp;I.until=tp+(I.dur||0);ch.nextEmote=tp+1500;idleBegins(ch,I,tp);}
    else ['t','start','until','sync'].forEach(k=>{if(I[k])I[k]+=held;}); // the break goes on for what it had left
  }
  if(busy){setMood(ch,'surprised',650);ch.sqv-=22;emote(ch,'excl');}
}
// The pose while the card is open: an animation of 2.5 to 5 s, then 1.5 to 4 s at rest, never the same twice.
function spotPose(ch,tp){
  const S=ch.spot,rest=ch.seated?'sit':'stand';
  if(tp>S.until){
    if(S.pose){S.last=S.pose;S.pose=null;S.until=tp+1500+Math.random()*2500;}
    else{
      const pool=(ch.seated?SPOT_SEATED:SPOT_STAND.concat(themeKey==='space'?['float']:[])).filter(p=>p!==S.last);
      S.pose=pool[(Math.random()*pool.length)|0];S.start=tp;S.until=tp+2500+Math.random()*2500;
      if(S.pose==='dance'||S.pose==='game'||S.pose==='float')setMood(ch,'happy',S.until-tp);
    }
  }
  if(!S.pose)return rest;
  if(S.pose==='stretch')return ((tp-S.start)%2600)<1700?'stretch':rest;
  if(S.pose==='yoga')return ((tp-S.start)%5000)<3200?'yoga':'stretch';
  return S.pose;
}
