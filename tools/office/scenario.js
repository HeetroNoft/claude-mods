// Test page script: forces activities so a screenshot shows them (scn=t: the room's own break activities,
// scn=i: every treat mid-story, scn=a / scn=b: pairs, floating, treats, picking up, a high five, scn=c: a chat and a thought, scn=r: a round of rock, paper, scissors, scn=p: the settings panel, scn=g: the gauge away and the items hidden, scn=o: the cat behind the table and the counter). Logs ERR and STATE lines.
'use strict';
window.addEventListener('error',e=>console.log('ERR '+e.message+' @'+e.filename.split('/').pop()+':'+e.lineno));
const SCN=(location.search.match(/scn=(\w+)/)||[])[1]||'a';
const orig=window.__office;window.__office=d=>{d.desks.forEach((x,i)=>{if(i>=2)x.activity='idle';});if(SCN==='c')d.desks[0].activity='think';orig(d);};
const tele=ch=>{if(ch&&ch.tgt){ch.x=ch.tgt.x;ch.y=ch.tgt.y;ch.path=[];ch.arrived=true;}};
setTimeout(()=>{try{
  const C=id=>chars.get(id);
  if(SCN==='w1'){curtainsShut=true;curAmt=1;if(TH.window==='painting'){paintIdx=2;}}
  else if(SCN==='w2'){winOpen=true;winAmt=1;}
  else if(SCN==='mi'||SCN==='mw'||SCN==='mb'){const od=drawMachine,m={mi:'idle',mw:'web',mb:'bash'}[SCN];drawMachine=(g,tp)=>od(g,tp,m);} // the terminal in one mode
  else if(SCN==='cb'){const od=drawCoffee;drawCoffee=(g,tp,b)=>{if(tp)brewUntil=tp+1300;od(g,tp,true);};} // the coffee maker halfway through a brew
  else if(SCN==='sh'){ // the shelf: fill it, add one more (the oldest goes to the cabinet), edit one again, lose a carrier on the way
    shelf.clear();shelfOf.clear();reserved.clear();const a=C('a1'),b=C('b2'),r=[];let tp=performance.now();const step=dt=>{tp+=dt;drawShelf(wx,tp);};
    for(let i=0;i<14;i++)shelfOnFile(null,'f'+i+'.js','#4FA3E0',1000+i,true);r.push('full '+shelf.size);
    shelfOnFile(a,'new.js','#E5484D',5000,false);shelfErrands(a,tp);r.push('old kept while carried '+shelfOf.has('f0.js')+' reserved '+reserved.size);
    a.path=[];a.arrived=true;shelfErrands(a,tp);step(600);r.push('landed '+shelfOf.has('new.js')+' f0 archived '+!shelfOf.has('f0.js')+' size '+shelf.size);
    step(800);shelfErrands(a,tp);shelfOnFile(a,'f5.js','#E5484D',6000,false);shelfErrands(a,tp);a.path=[];a.arrived=true;shelfErrands(a,tp);step(600);r.push('re-edit same place '+(shelfOf.get('f5.js')===5)+' size '+shelf.size);
    shelfOnFile(b,'gone.js','#5BD08A',7000,false);shelfErrands(b,tp);b.removed=true;shelfErrands(b,tp);step(600);r.push('carrier left, file landed '+shelfOf.has('gone.js')+' size '+shelf.size+' reserved '+reserved.size);
    b.removed=false;console.log('STATE shelf '+r.join(' | '));}
  else if(SCN==='v'){ // the volume: change it, mute, unmute, and 0 mutes
    const r=[];setVolume(40);r.push(soundOn+'/'+volume);setVolume(90);r.push(soundOn+'/'+volume);setSound(false);r.push(soundOn+'/'+volume);
    setSound(true);r.push(soundOn+'/'+volume);setVolume(0);r.push(soundOn+'/'+volume);setSound(true);r.push(soundOn+'/'+volume);setVolume(70);
    console.log('STATE volume '+r.join(' | ')+' gain '+(master?master.gain.value.toFixed(2):'none'));}
  else if(SCN==='k'){knockDoor(performance.now());setTimeout(()=>console.log('STATE knock: looking at the door '+[...chars.values()].filter(c=>c.lookDoor).length),200);} // a knock on the door
  else if(SCN==='d1'||SCN==='d2'){const od=drawDoor,amt=SCN==='d1'?.4:1;drawDoor=(g,tp,dt,n)=>{doorAmt=amt;od(g,tp,0,n);};} // the door ajar, then wide open
  else if(SCN==='i'){
    // every treat at a chosen moment of its story, as seen when the screenshot is taken (about 1.9 s later)
    [['a1','coffee',.2],['b2','cookie',.5],['c3','ball',.2],['d4','flower',.5],['e4','gift',.2],['e5','gift',.8]].forEach(([id,k,u])=>{const c=C(id);if(!c)return;if(c.idle||!c.seated){releaseIdle(c);c.idle={phase:'pick',t:1e12};c.path=[];c.tgt={key:'pinned'};c.x=110+['c3','d4','e4','e5'].indexOf(id)*36;c.y=146;}giveItem(c,k);c.treat.t0=performance.now()+1900-u*TREATS[k].ms;c.treat.until=c.treat.t0+TREATS[k].ms;});
  }else if(SCN==='t'){
    const acts=Object.keys(THEME_IDLES[themeKey]||{});['c3','d4','e4','e5'].forEach((id,i)=>{const a=acts[i%acts.length]||'read';if(a==='catpet'&&!cat)return;startIdle(C(id),a,null);tele(C(id));});
    ['a1','b2'].forEach((id,i)=>giveItem(C(id),['coffee','ball'][i]));
  }else if(SCN==='c'){
    startIdle(C('c3'),'chat',C('d4'));tele(C('c3'));tele(C('d4'));
  }else if(SCN==='r'){
    startIdle(C('c3'),'rps',C('d4'));tele(C('c3'));tele(C('d4'));
  }else if(SCN==='o'){
    setCatName('Mochi');catTagUntil=1e12;Object.assign(cat,{x:190,y:152,z:0,path:[],state:'sit',until:1e12,nextJob:1e12,nextTrip:1e12});
    const c=C('e4');if(c){releaseIdle(c);c.idle={phase:'pick',t:1e12};c.path=[];c.x=258;c.y=150;}
  }else if(SCN==='g'){
    setPref('calm',true);setPref('gauge',false);setBar(false);
  }else if(SCN==='p'){
    document.body.classList.add('calm');setCatName('Mochi');catTagUntil=1e12;openPrefs(true); // calm: the screenshot shows the panel at rest
  }else if(SCN==='a'){
    startIdle(C('c3'),'rps',C('d4'));tele(C('c3'));tele(C('d4'));
    startIdle(C('e4'),'float',null);tele(C('e4'));
    startIdle(C('e5'),'dance',null);tele(C('e5'));
    giveItem(C('a1'),'flower');giveItem(C('b2'),'gift');
  }else{
    startIdle(C('c3'),'game',null);tele(C('c3'));
    startIdle(C('e4'),'read',null);tele(C('e4'));
    pickUp(C('e5'),{x:200,y:120},performance.now());C('e5').held={x:200,y:120};
    C('d4').idle={phase:'pick',t:1e12};
    sceneHighFive('a1');tele(C('d4'));
    giveItem(C('b2'),'cookie');
  }
  // headless virtual time barely runs frames: step the idle brain by hand so activities start
  for(let k=0;k<4;k++)chars.forEach(c=>{if(c.idle&&!c.removed)thinkIdle(c,performance.now(),Date.now());});
  if(SCN==='c'){C('c3').idle.sync=performance.now()-80;C('a1').thoughtAt=1;const od=drawThought;drawThought=(g,ch,tp)=>{ch.thoughtAt=1;od(g,ch,tp);};} // mid-line when the screenshot is taken
  if(SCN==='r')C('c3').idle.sync=performance.now()-1200;
  console.log('SCENARIO started '+SCN);
  setTimeout(()=>{const s=[...chars.values()].map(c=>c.id+':'+(c.idle?c.idle.act+'/'+c.idle.phase:'-')+(c.held?'/held':'')+(c.treat?'/'+c.treat.kind:'')).join(' ');console.log('STATE '+s);},1500);
}catch(err){console.log('ERR scenario '+err.message);}},3000);
