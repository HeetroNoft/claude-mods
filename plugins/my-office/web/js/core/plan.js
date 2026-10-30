// Plan maths shared by the boards and the session card.
'use strict';
function etaInfo(dk,now){
  const steps=Array.isArray(dk.steps)?dk.steps.filter(Boolean):[];
  const total=steps.length,done=steps.filter(s=>s.doneMs).length,cur=steps.find(s=>!s.doneMs);
  const e=dk.eta;
  const r={steps,total,done,cur};
  if(!e||!e.finishMs){r.mode=total?'steps':'none';return r;}
  if(e.allDone){r.mode='finished';const last=Math.max(0,...steps.map(s=>+s.doneMs||0));r.at=last||+dk.doneMs||e.finishMs;return r;}
  if(e.paused){r.mode='paused';r.fin=+e.finishMs;r.left=+e.finishMs-(+dk.pausedMs||now);return r;}
  const fin=+e.finishMs,past=now>fin?now-fin:0,lm=+e.lateMin||0;
  r.fin=fin; r.left=fin-now;
  if(lm>0||past>0){r.mode='late';r.late=Math.max(Math.ceil(lm),Math.ceil(past/60000),1);}else r.mode='ontime';
  return r;
}
