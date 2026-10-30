// Floors test (run.sh check, 11 desks): logs CHECK lines. Everyone gets a floor, four at most each, and
// changing floors, moving a desk, the panel, the keys and new data all behave.
setTimeout(()=>{
  const fails=[],ok=(c,m)=>{if(!c)fails.push(m);},ids=()=>desks.map(d=>String(d.id)),count=f=>floorDesks(f).length;
  ok(everyDesk.length===11,'desks known: '+everyDesk.length);ok(floorCount===3,'floors: '+floorCount);
  ok(desks.length===4&&MAX_DESKS===4,'desks on show: '+desks.length);ok(chars.size===4,'Claudes on show: '+chars.size);
  for(let f=0;f<floorCount;f++)ok(count(f)<=4,'floor '+f+' holds '+count(f));
  ok(everyDesk.every(d=>floorOf.has(String(d.id))),'a desk has no floor');
  ok(floorsEl.classList.contains('show')&&floorsEl.querySelectorAll('button').length===3,'panel not showing 3 floors');
  ok(document.title.startsWith('(1) '),'tab title '+document.title);
  ok(floorsEl.querySelector('i.wait'),'no blinking light for the waiting desk');
  ok(floorsEl.querySelector('[data-f="1"] i.limit'),'no red light for the out-of-usage desk');
  const r=floorsEl.getBoundingClientRect(),st=stage.getBoundingClientRect();
  ok(Math.abs((r.left+r.right)/2-(st.left+st.width/2))<2,'panel at '+Math.round((r.left-st.left)/st.width*W)+'..'+Math.round((r.right-st.left)/st.width*W)+', not centred');
  // seasons: the real dates, both hemispheres, and the settings pin one
  [['2026-03-19','winter'],['2026-03-20','spring'],['2026-06-20','spring'],['2026-06-21','summer'],['2026-09-21','summer'],['2026-09-22','autumn'],['2026-12-20','autumn'],['2026-12-21','winter'],['2026-01-15','winter']].forEach(([d,s])=>ok(seasonOf(new Date(d+'T12:00:00'),false)===s,d+' is not '+s));
  ok(seasonOf(new Date('2026-01-15T12:00:00'),true)==='summer'&&seasonOf(new Date('2026-07-15T12:00:00'),true)==='winter','the south has the north\'s seasons');
  setPref('season','winter');ok(seasonNow()==='winter','the setting did not pin the season');setPref('season','auto');ok(seasonNow()===seasonOf(new Date(),false),'Live does not follow the date');
  setPref('hemi','south');ok(seasonNow()===seasonOf(new Date(),true),'the south setting is ignored');setPref('hemi','north');
  // the settings: tabs, arrows, focus kept through a redraw and handed back on closing
  openPrefs(true);const tab=k=>prefsEl.querySelector('[data-tab="'+k+'"]'),key=(el,k)=>el.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
  ok(document.activeElement===tab('room'),'opening does not focus the tab');
  key(tab('room'),'ArrowRight');ok(prefsTab==='display'&&prefsEl.querySelector('[data-sw="labels"]'),'the arrow did not change tab');
  renderPrefs();ok(document.activeElement===tab('display'),'the redraw lost the tab focus');
  key(tab('display'),'ArrowLeft');key(tab('room'),'ArrowLeft');ok(prefsTab==='keys'&&prefsEl.querySelector('dl'),'the arrows do not wrap round');
  tab('room').click();renderPrefs();const seg0=prefsEl.querySelector('[data-seg="time"][data-v="auto"]');seg0.focus();key(seg0,'ArrowRight');
  ok(PREFS.time==='day'&&document.activeElement.dataset.v==='day','the arrow did not choose in a radio group');setPref('time','auto');
  const pr=prefsEl.getBoundingClientRect();ok(prefsEl.scrollWidth<=prefsEl.clientWidth&&pr.width>=300,'the panel is too narrow');
  [...prefsEl.querySelectorAll('button')].forEach(b=>{const r=b.getBoundingClientRect();ok(r.height>=34,'a control is only '+r.height+' px high: '+b.textContent);});
  openPrefs(false);ok(document.activeElement===setBtn,'closing does not hand the focus back');prefsEl.blur();setBtn.blur();
  // the new scenes: every one runs through its begin, tick, pose, props and end, in every season
  const sc=[...chars.values()][0],sb=[...chars.values()][1],keepIdle=sc.idle,keepIdleB=sb.idle;
  SEASONS.forEach(s=>{SEASON=s;['season','clock','doodle','shelfread','share','mop'].forEach(a=>{const D=IDLES[a],I={act:a,phase:'do',start:0,dur:1000,until:1e12};sc.idle=I;stain=stain||{floor:curFloor,x:100,y:176,left:1};
    try{if(D.spot)D.spot(sc);if(D.begin)D.begin(sc,I,0);if(D.tick)D.tick(sc,I,1);ok(typeof D.pose(sc,1)==='string',a+' has no pose');if(D.props)D.props(wx,sc,1,I);if(D.end)D.end(sc,I,1);}catch(err){ok(false,a+' in '+s+': '+err.message);}});
    ['snowball','selfie','napside'].forEach(a=>{const D=IDLES[a],I={act:a,phase:'do',pair:sb,role:0,sync:1,dur:9000,start:0,until:1e12};sc.idle=I;sb.idle={act:a,phase:'do',pair:sc,role:1,dur:9000,start:0,until:1e12};
    try{if(D.tick){D.tick(sc,I,5000);D.tick(sc,I,7000);}ok(typeof D.pose(sc,5000)==='string',a+' has no pose');if(D.props)D.props(wx,sc,5000,I);}catch(err){ok(false,a+' in '+s+': '+err.message);}});
    const its=[];floorThing={floor:curFloor,kind:s,until:Date.now()+1e4};try{roomItems(its,wx);its.forEach(i=>i.f());}catch(err){ok(false,'room items in '+s+': '+err.message);}});
  ok(photos.length>0,'the selfie left no photo');stain={floor:curFloor,x:100,y:176,left:1};ok(IDLES.mop.weight()>0,'a stain does not call for a mop');mopEnd(sc);ok(!stain,'mopping left the stain');
  floorThing=null;photos=[];sc.idle=keepIdle;sb.idle=keepIdleB;
  // the pointer: a Claude let go in flight lands, dizzy, and the floor can be tapped
  const fx=sc.x;flingClaude(sc,200,60,0);for(let i=0;i<400&&sc.fly;i++)flyTick(sc,.02,i);ok(!sc.fly&&sc.x>=8&&sc.x<=312,'the throw never landed');ok(sc.mood==='dizzy','the thrown Claude is not dizzy');sc.x=fx;sc.resumeAt=0;
  floorTap({x:150,y:150},performance.now());
  // avatars: the first one in is the plain Claude, the rest are drawn, and a refresh changes nobody
  const lookKey=()=>everyDesk.map(d=>{const l=looksFor(String(d.id));return d.id+'='+l.c+':'+l.style;}).join();
  const lookRules=why=>{const pairs=everyDesk.map(d=>{const l=looksFor(String(d.id));return l.c+':'+l.style;});ok(new Set(pairs).size===pairs.length,why+': two sessions share an avatar');
    for(let f=0;f<floorCount;f++){const c=floorDesks(f).map(d=>looksFor(String(d.id)).c);ok(new Set(c).size===c.length,why+': a colour twice on floor '+f);}};
  const a0=looksFor(String(everyDesk[0].id));ok(a0.c===LOOKS[0].c&&a0.style===0,'the first one in is not the plain Claude');
  ok(everyDesk.slice(1).some(d=>{const l=looksFor(String(d.id));return !LOOKS.some(x=>x.c===l.c&&x.style===l.style);}),'colours and accessories are not mixed');
  lookRules('at the start');
  const refresh=()=>{const k=lookKey();lookObj.clear();lookHere=new Set();loadLooks();firstLoad=true;settleLooks(everyDesk);firstLoad=false;return k;};
  ok(refresh()===lookKey(),'a refresh changed the avatars');
  const [d1,d2,d3]=everyDesk.map(d=>String(d.id)),keep1=lookKey();
  Object.assign(lookMem.get(d2),{c:lookMem.get(d1).c,s:lookMem.get(d1).s});settleLooks(everyDesk);
  ok(lookMem.get(d2).c!==lookMem.get(d1).c&&a0.c===LOOKS[0].c,'two with one avatar: the later one kept it');lookRules('after a clash');
  const far=String(floorDesks(1)[0].id);Object.assign(lookMem.get(far),{c:lookMem.get(d1).c,s:(lookMem.get(d1).s+1)%10});settleLooks(everyDesk);lookRules('same colour, other floor');
  ok(lookMem.get(far).c===lookMem.get(d1).c,'the same colour was refused on another floor');
  const s3=lookMem.get(d3).s;Object.assign(lookMem.get(d3),{c:lookMem.get(d1).c});settleLooks(everyDesk);
  ok(lookMem.get(d3).s===s3&&lookMem.get(d3).c!==lookMem.get(d1).c,'a colour clash cost it its accessory');lookRules('colour clash on a floor');
  // an accessory chosen on the card survives a colour clash and a refresh; a twin's is refused
  const pick=[...LOOKS.keys()].find(s=>s!==lookMem.get(d2).s&&!accessoryTaken(d2,s));setAccessory(d2,pick);
  Object.assign(lookMem.get(d2),{c:lookMem.get(d1).c});settleLooks(everyDesk);
  ok(lookMem.get(d2).s===pick&&lookMem.get(d2).c!==lookMem.get(d1).c,'a chosen accessory was lost to a colour clash');lookRules('chosen accessory');
  ok(refresh()===lookKey()&&lookMem.get(d2).pin,'a refresh lost the chosen accessory');
  Object.assign(lookMem.get(far),{c:lookMem.get(d3).c,s:(lookMem.get(d3).s+1)%10});
  ok(accessoryTaken(far,lookMem.get(d3).s),'an accessory that makes a twin was offered');settleLooks(everyDesk);lookRules('twin refused');
  // the card's arrows: a free accessory is worn at once, a taken one greys and changes nothing
  openCard(d1);const was=looksFor(d1).style,nx=(was+1)%VARIANTS.length,other=everyDesk.find(d=>String(d.id)!==d1&&lookMem.get(String(d.id)).c===lookMem.get(d1).c);
  if(other)lookMem.get(String(other.id)).s=-1;
  const twin=lookMem.get(d2),keep={c:twin.c,s:twin.s};Object.assign(twin,{c:lookMem.get(d1).c,s:nx});
  card.querySelector('[data-pick="acc"][data-step="1"]').click();
  ok(looksFor(d1).style===was&&card.querySelector('.acc .off'),'the card wore a taken accessory');
  Object.assign(twin,keep);if(other)lookMem.get(String(other.id)).s=looksFor(String(other.id)).style;
  card.querySelector('[data-pick="acc"][data-step="-1"]').click();card.querySelector('[data-pick="acc"][data-step="1"]').click();
  ok(looksFor(d1).style===nx&&lookMem.get(d1).pin&&!card.querySelector('.acc .off'),'the card did not wear a free accessory');
  closeCard();settleLooks(everyDesk);lookRules('after the card');
  // the arrows stay under the pointer through every accessory, a hat of any height and a greyed name
  openCard(d1);const arrow=()=>card.querySelector('[data-pick="acc"][data-step="1"]'),arrowAt=Math.round(arrow().getBoundingClientRect().top),chD1=chars.get(d1),head=chD1.headTop;
  for(let i=0;i<VARIANTS.length;i++){arrow().click();chD1.headTop=head-i;renderCard();ok(Math.round(arrow().getBoundingClientRect().top)===arrowAt,'the card moved on accessory step '+i);}
  chD1.headTop=head;closeCard();settleLooks(everyDesk);lookRules('after going round the accessories');
  // the colour: one on the floor is skipped, the next free one is worn and stays
  const c0=lookMem.get(d1).c,c2=lookMem.get(d2).c,nextC=()=>card.querySelector('[data-pick="col"][data-step="1"]').click();
  lookMem.get(d2).c=(c0+1)%LOOKS.length;openCard(d1);nextC();
  const freeC=lookMem.get(d1).c;
  ok(freeC!==c0&&freeC!==(c0+1)%LOOKS.length&&looksFor(d1).c===LOOKS[freeC].c&&lookMem.get(d1).pinC&&!card.querySelector('.acc .off'),'the card did not skip a taken colour for the next free one');
  lookMem.get(d2).c=c2;closeCard();settleLooks(everyDesk);saveLooks();
  ok(refresh()===lookKey()&&lookMem.get(d1).c===freeC,'a refresh lost the chosen colour');lookRules('chosen colour');
  // a drawn colour gives way to a chosen one; of two chosen, the later arrival gives way and loses its pin
  const c4=String(floorDesks(0)[3].id);Object.assign(lookMem.get(d2),{c:freeC,pinC:false});settleLooks(everyDesk);
  ok(lookMem.get(d1).c===freeC&&lookMem.get(d2).c!==freeC,'a chosen colour gave way to a drawn one');lookRules('chosen against drawn');
  Object.assign(lookMem.get(c4),{c:freeC,pinC:true,at:lookMem.get(d1).at+1});settleLooks(everyDesk);
  ok(lookMem.get(d1).c===freeC&&lookMem.get(c4).c!==freeC&&!lookMem.get(c4).pinC,'two chosen colours: the later arrival kept it');lookRules('two chosen colours');
  const first=ids().join();
  floorsEl.querySelector('[data-f="1"]').click();
  ok(curFloor===1&&ids().join()!==first,'clicking a floor did not change it');
  ok([...chars.keys()].sort().join()===ids().sort().join(),'the Claudes on show are not this floor\'s');
  ok(floorSlide&&floorSlide.dir===1,'no ride up');
  ingest(lastData,false);ok(curFloor===1,'new data changed the floor');
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp'}));ok(curFloor===2,'PageUp');
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'1'}));ok(curFloor===0&&ids().join()===first&&floorSlide.dir===-1,'key 1 did not come back down');
  // each floor keeps its own room, and a file written upstairs lands upstairs
  const up0=String(floorDesks(1)[0].id),fdata=JSON.parse(JSON.stringify(lastData));fdata.desks.find(d=>String(d.id)===up0).files=[{kind:'edit',name:'upstairs.js',ms:Date.now()-200000}];
  shelfPut(0,'downstairs.js','#fff',Date.now(),0);winOpen=true;
  ingest(fdata,false);
  ok(shelfOf.has('downstairs.js')&&!shelfOf.has('upstairs.js'),'a file from upstairs landed on the floor on show');
  const plant=knockables().find(k=>k.kind==='plant');if(plant){dropThing(plant,performance.now());fallen.state='down';}
  const hasFallen=!!fallen;
  goFloor(1);
  ok(!shelfOf.has('downstairs.js')&&shelfOf.has('upstairs.js'),'floor 2 shows the wrong shelf');ok(!winOpen&&!winAmt,'floor 2 shares the window');ok(!fallen&&!bgHide.length,'floor 2 shares what fell');
  ok(cat.away&&cat.floor===0,'the cat came along to floor 2');ok(floorsEl.querySelector('[data-f="0"] u.cat')&&!floorsEl.querySelector('[data-f="1"] u.cat'),'panel does not show the cat on floor 1');
  goFloor(0);
  ok(shelfOf.has('downstairs.js')&&!shelfOf.has('upstairs.js'),'floor 1 lost its shelf');ok(winOpen&&winAmt===1,'floor 1 lost its window');ok(!!fallen===hasFallen&&bgHide.length===(hasFallen?1:0),'floor 1 lost what fell');
  if(fallen)restoreFallen();winOpen=false;
  ok(!cat.away&&cat.x>0,'the cat is not back in its room');ok(JSON.parse(localStorage.getItem('office.rooms'))[1].some(f=>f.name==='upstairs.js'),'shelves not remembered per floor');
  // the cat walks out by the door, and comes in by it
  const runCat=(n)=>{let t=performance.now();for(let i=0;i<n&&!cat.away;i++){t+=16;updateCat(.016,t);}return t;};
  const jobless=()=>{cat.job=null;cat.air=null;cat.path=[];cat.z=0;cat.state='sit';cat.until=1e12;catBall=null;};
  jobless();cat.nextTrip=0;cat.nextJob=1e12;runCat(1);ok(cat.job&&cat.job.kind==='trip','the cat did not set off');
  let nearDoor=false;{let t=performance.now();for(let i=0;i<4000&&!cat.away;i++){t+=16;const x=cat.x,y=cat.y;updateCat(.016,t);if(Math.hypot(x-DOOR.x,y-DOOR.y)<4)nearDoor=true;}}
  ok(cat.away&&cat.floor!==0&&nearDoor,'the cat did not leave by the door: floor '+cat.floor+' away '+cat.away);
  cat.floor=1;cat.nextTrip=0;const rnd=Math.random;Math.random=()=>0;updateCat(.016,performance.now());Math.random=rnd;
  ok(!cat.away&&cat.floor===0&&Math.hypot(cat.x-DOOR.x,cat.y-DOOR.y)<1&&cat.job&&cat.job.kind==='arrive','the cat did not come in by the door');
  jobless();cat.nextTrip=1e12;
  // moving a desk: a full floor refuses, a new floor takes it and its Claude leaves by the door
  const id=ids()[0],xs=deskXs(4),at=x=>st.left+x/W*st.width,fire=(t,x,y)=>stage.dispatchEvent(new PointerEvent(t,{bubbles:true,button:0,pointerId:1,clientX:x,clientY:y}));
  const by=st.top+36/H*st.height;
  ok(!moveToFloor(id,1),'a full floor took a fifth desk');
  fire('pointerdown',at(xs[0]),by);fire('pointermove',at(xs[0]+30),by);
  ok(floorsEl.querySelector('.new'),'no new-floor chip while dragging');ok(floorsEl.querySelector('[data-f="1"].full'),'a full floor is not marked');
  const b=floorsEl.querySelector('.new').getBoundingClientRect();
  fire('pointerup',b.left+b.width/2,b.top+b.height/2);
  ok(floorOf.get(id)===3&&floorCount===4&&desks.length===3,'dropping on + gave floor '+floorOf.get(id));
  const leaving=chars.get(id);ok(leaving&&leaving.removed&&leaving.tgt.exit,'its Claude does not leave by the door');
  ok(!floorsEl.querySelector('.new'),'new-floor chip stayed');
  // a floor that empties closes, and a new session takes the lowest floor with room
  ok(moveToFloor(id,0),'moving back');ok(floorCount===3&&floorOf.get(id)===0,'the empty floor stayed open');
  const data=JSON.parse(JSON.stringify(lastData));data.desks.push({id:'zz',name:'New',activity:'read',steps:[]});ingest(data,false);
  ok(floorOf.get('zz')===2,'a new session went to floor '+floorOf.get('zz'));
  const gone=data.desks.filter(d=>floorOf.get(String(d.id))===1).map(d=>String(d.id));data.desks=data.desks.filter(d=>!gone.includes(String(d.id)));ingest(data,false);
  ok(floorCount===2&&floorOf.get('zz')===1,'floor 2 going home left '+floorCount+' floors');
  ok(localStorage.getItem('office.deskFloor').includes('zz'),'floors not remembered');
  // two floors that fit on one merge, and if you are on the upper one you go down with them; a desk
  // placed by hand stays
  floorPinned.clear();floorOf.clear();curFloor=0;
  const five=JSON.parse(JSON.stringify(lastData));five.desks=five.desks.slice(0,5);ingest(five,false);
  ok(floorCount===2,'five desks on '+floorCount+' floors');goFloor(1);
  const up=String(five.desks[4].id);ok(curFloor===1&&chars.has(up),'not on the second floor');
  shelfPut(0,'kept.js','#fff',5,0);
  const three=JSON.parse(JSON.stringify(five));three.desks.splice(1,2);ingest(three,false);
  ok(shelfOf.has('kept.js'),'the upper shelf did not come down with the merge');ok(cat.floor===0,'cat on closed floor '+cat.floor);
  ok(floorCount===1&&curFloor===0&&floorOf.get(up)===0&&desks.length===3&&chars.size===3,'3 + 1 did not merge: '+floorCount+' floors, on '+curFloor+', '+chars.size+' Claudes');
  ok(floorSlide&&floorSlide.dir===-1,'no ride down with the merge');

  ok(moveToFloor(up,1),'sending a desk up');ok(floorCount===2,'a hand-placed desk merged back straight away');
  ingest(three,false);ok(floorCount===2&&floorOf.get(up)===1,'a hand-placed desk merged on new data');
  try{localStorage.removeItem('office.deskFloor');localStorage.removeItem('office.deskPinned');localStorage.removeItem('office.rooms');localStorage.removeItem('office.looks');}catch(e){}
  // the room comes back from the fade: real pixels on the floor, a moment later
  setTimeout(()=>{
    const d=wx.getImageData(150,150,1,1).data,lit=d[0]+d[1]+d[2];console.log('STATE room pixel '+[...d].slice(0,3)+' fade left '+Math.round(floorFade-performance.now()));
    ok(lit>60,'the room stayed dark after changing floors');
    if(!fails.length)console.log('CHECK OK floors');else fails.forEach(m=>console.log('CHECK FAIL: floors: '+m));
  },1200);
},2500);
