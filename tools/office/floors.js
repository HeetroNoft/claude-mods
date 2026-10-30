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
  ok(r.right<st.left+st.width*239/W&&r.left>=st.left+st.width*180/W-1,'panel at '+Math.round((r.left-st.left)/st.width*W)+'..'+Math.round((r.right-st.left)/st.width*W));
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
