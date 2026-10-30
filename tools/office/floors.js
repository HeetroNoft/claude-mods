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
  const first=ids().join();
  floorsEl.querySelector('[data-f="1"]').click();
  ok(curFloor===1&&ids().join()!==first,'clicking a floor did not change it');
  ok([...chars.keys()].sort().join()===ids().sort().join(),'the Claudes on show are not this floor\'s');
  ok(floorSlide&&floorSlide.dir===1,'no ride up');
  ingest(lastData,false);ok(curFloor===1,'new data changed the floor');
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp'}));ok(curFloor===2,'PageUp');
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'1'}));ok(curFloor===0&&ids().join()===first&&floorSlide.dir===-1,'key 1 did not come back down');
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
  const three=JSON.parse(JSON.stringify(five));three.desks.splice(1,2);ingest(three,false);
  ok(floorCount===1&&curFloor===0&&floorOf.get(up)===0&&desks.length===3&&chars.size===3,'3 + 1 did not merge: '+floorCount+' floors, on '+curFloor+', '+chars.size+' Claudes');
  ok(floorSlide&&floorSlide.dir===-1,'no ride down with the merge');
  ok(moveToFloor(up,1),'sending a desk up');ok(floorCount===2,'a hand-placed desk merged back straight away');
  ingest(three,false);ok(floorCount===2&&floorOf.get(up)===1,'a hand-placed desk merged on new data');
  try{localStorage.removeItem('office.deskFloor');localStorage.removeItem('office.deskPinned');}catch(e){}
  // the room comes back from the fade: real pixels on the floor, a moment later
  setTimeout(()=>{
    const d=wx.getImageData(150,150,1,1).data,lit=d[0]+d[1]+d[2];console.log('STATE room pixel '+[...d].slice(0,3)+' fade left '+Math.round(floorFade-performance.now()));
    ok(lit>60,'the room stayed dark after changing floors');
    if(!fails.length)console.log('CHECK OK floors');else fails.forEach(m=>console.log('CHECK FAIL: floors: '+m));
  },1200);
},2500);
