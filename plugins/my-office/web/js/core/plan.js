// Plan maths shared by the boards and the session card.
'use strict';
const ERROR_WORDS={overloaded:'OVERLOADED',server_error:'SERVER ERROR',billing_error:'BILLING',authentication_failed:'LOGIN NEEDED',oauth_org_not_allowed:'ACCOUNT',account_on_hold:'ACCOUNT',verification_required:'ACCOUNT',model_not_found:'NO MODEL',invalid_request:'BAD REQUEST',max_output_tokens:'TOO LONG',cloud_credential_error:'CREDENTIALS'};
const STUCK_MS=5*60000,FLASH_MS=6000; // a turn that writes nothing for this long looks stuck; a flash shows this long
const TASK_LOOK={tests:['TESTS','flask'],build:['BUILD','hammer'],commit:['COMMIT','commit'],push:['PUSH','arrow'],compact:['COMPACTING','press']};
const FLASH_LOOK={fail:['cross','bad'],denied:['noway','bad'],pass:['check','good'],ship:['check','good'],move:['box','plain'],model:['bolt','plain']};
// What the board and the badge add to the plain activity: {text, icon, tone}, the most urgent first.
function deskBeat(dk,now){
  const f=dk.flash;if(f&&now-f.ms<FLASH_MS){const L=FLASH_LOOK[f.kind]||['bolt','plain'];return {text:f.text,icon:L[0],tone:L[1]};}
  if(dk.task&&TASK_LOOK[dk.task.kind]){const L=TASK_LOOK[dk.task.kind];return {text:L[0],icon:L[1],tone:'plain'};}
  if(dk.bg)return {text:dk.bg.kind==='wakeup'&&dk.bg.until>now?'BACK AT '+hhmm(dk.bg.until):'WAITING',icon:'alarm',tone:'plain'};
  const busy=!['idle','gone','asleep','ask','limit','agent','wait'].includes(dk.activity);
  if(busy&&dk.activityMs&&now-dk.activityMs>STUCK_MS)return {text:'STUCK?',icon:'quest',tone:'warn'};
  if(dk.planMode&&busy)return {text:'PLANNING',icon:'lamp',tone:'plain'};
  return null;
}
function etaInfo(dk,now){
  const steps=Array.isArray(dk.steps)?dk.steps.filter(Boolean):[];
  const total=steps.length,done=steps.filter(s=>s.doneMs).length,cur=steps.find(s=>!s.doneMs);
  const e=dk.eta;
  const r={steps,total,done,cur};
  if(dk.stopped){r.mode='stopped';r.kind=dk.stopped.kind;r.at=+dk.stopped.ms; // an error or the user stopped the turn
    r.label=r.kind==='error'?ERROR_WORDS[dk.stopped.error]||(total?`ENDED ${done} OF ${total}`:'ENDED'):'INTERRUPTED';return r;}
  if(!e||!e.finishMs){r.mode=total?'steps':'none';return r;}
  if(e.allDone){r.mode='finished';const last=Math.max(0,...steps.map(s=>+s.doneMs||0));r.at=last||+dk.doneMs||e.finishMs;return r;}
  if(e.paused){r.mode='paused';r.fin=+e.finishMs;r.left=+e.finishMs-(+dk.pausedMs||now);return r;}
  const fin=+e.finishMs,past=now>fin?now-fin:0,lm=+e.lateMin||0;
  r.fin=fin; r.left=fin-now;
  if(lm>0||past>0){r.mode='late';r.late=Math.max(Math.ceil(lm),Math.ceil(past/60000),1);}else r.mode='ontime';
  return r;
}
