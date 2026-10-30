// Layout checks run inside the real page: logs "CHECK OK ..." or "CHECK FAIL ..." lines.
(function(){
  const fails=[],log=(ok,msg)=>{if(!ok)fails.push(msg);};
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d',{willReadFrequently:true});
  const alphaAt=(x,y)=>c.getImageData(x,y,1,1).data[3];
  const keep=themeKey,keepDesks=desks;
  for(const k of THEME_KEYS){
    themeKey=k;TH=THEMES[k];
    for(let n=1;n<=MAX_DESKS;n++){
      desks=Array.from({length:n},(_,i)=>({id:'t'+i,name:'Dev',steps:[]}));
      const xs=deskXs(n),w=deskHalf(n),h=boardHalf(n);
      // 1. nothing on a desk covers a seated Claude's eyes (gaze -1..1, every squash)
      xs.forEach(x=>{c.clearRect(0,0,W,H);drawDesk(c,x,desks[0],false,true,0,true);
        for(const ex of [x-5,x-4,x-3,x+2,x+3,x+4])for(let y=95;y<=98;y++){const a=alphaAt(ex,y);log(a<153,`${k} n=${n} desk@${x}: eye pixel (${ex},${y}) covered, alpha ${a}`);}});
      // 2. desks and boards keep clear of each other, of the door sign and of the window
      for(let i=0;i+1<n;i++){
        log(xs[i]+w-1<xs[i+1]-w-1,`${k} n=${n}: desks ${i} and ${i+1} touch`);
        log(xs[i]+h-1+2<xs[i+1]-h,`${k} n=${n}: boards ${i} and ${i+1} have under 2 px between them`);
      }
      log(xs[0]-h>=33,`${k} n=${n}: first board reaches the door sign (left edge ${xs[0]-h})`);
      log(xs[n-1]+h-1<=264,`${k} n=${n}: last board reaches the window (right edge ${xs[n-1]+h-1})`);
      // 3. a row that fits is centred under the clock
      const mid=(xs[0]+xs[n-1])/2; if(n<=3)log(Math.abs(mid-160)<=1,`${k} n=${n}: row centred at ${mid}, not under the clock (160)`);
      // 4. what a board draws (frame, face, shadow) stays inside its slot
      xs.forEach(x=>{c.clearRect(0,0,W,H);drawBoard(c,x,'#D97557',false,0);
        const d=c.getImageData(0,0,W,H).data;let lo=W,hi=-1;for(let y=0;y<80;y++)for(let xx=0;xx<W;xx++)if(d[(y*W+xx)*4+3]>40){lo=Math.min(lo,xx);hi=Math.max(hi,xx);}
        const slotL=x-deskSpan(n)/2,slotR=x+deskSpan(n)/2;
        log(lo>=slotL-1&&hi<=slotR,`${k} n=${n} board@${x}: drawn from ${lo} to ${hi}, outside its slot ${slotL.toFixed(1)}..${slotR.toFixed(1)}`);});
    }
  }
  // 5. visibility: every element must stand out from what it stands on (its own colour or its rim)
  const wallOf=T=>T.wall,floorOf=T=>T.floorA;
  for(const k of THEME_KEYS){const T=THEMES[k],parts=Object.assign({},T.parts||{});
    const els=[['door','wall',T.door],['sign','wall',T.sign],['shelves','wall',T.shelf],['clock','wall',T.clockRim],['board','wall',T.boardFrame],['gauge','wall',T.boardFrame],
      ['rug','floor',T.rugEdge],['cabinet','floor',T.cabinet],['machine','floor',T.machine],['counter','floor',T.counter],['plant pot','floor',T.pot],['desk','floor',T.desk==='pod'||T.desk==='cubicle'?T.partition:T.deskFront],['chair','floor',T.chair]];
    els.forEach(([name,on,col])=>{if(name in parts&&parts[name]===null)return;if(!col)return;const bg=on==='wall'?wallOf(T):floorOf(T);
      const c=Math.max(contrast(col,bg),contrast(T.ol,bg));log(c>=1.8,k+': '+name+' barely shows on the '+on+' (contrast '+c.toFixed(2)+')');});
  }
  // 6. nothing overlaps: room elements (and the buttons and item bar drawn over the room) keep apart
  const box=(n,x,y,w,h)=>({n,x,y,w,h}),hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  const room=[box('gauge',2,1,30,16),box('sign',1,30,29,7),box('door',3,38,25,46),box('left shelf',6,18,116,6),box('right shelf',198,18,116,6),box('clock',149,2,24,24),
    box('cabinet',18,138,22,42),box('machine',86,133,40,47),box('counter',COUNTER.x-1,152,42,28),box('plant',292,92,22,40),box('small plant',3,158,12,21),
    box('buttons',284,169,36,11),box('item bar',141,169,39,10)];
  const pairs=[];room.forEach((a,i)=>room.slice(i+1).forEach(b=>{if(hit(a,b))pairs.push(a.n+' / '+b.n);}));
  pairs.forEach(p=>log(false,'overlap: '+p));
  // 7. walking: no leg goes through a desk or fixed furniture, even when redirected halfway
  const spots=[...ROAM,...CHAT,...PLAY,SPOT.window,SPOT.plant,{x:46,y:177},{x:131,y:178},{x:81,y:178},{x:210,y:178},{x:171,y:158}];
  const route=(e,t)=>{const pts=buildPath(e,{...t});let a={x:e.x,y:e.y};return pts.map(b=>{const leg=[a,b];a=b;return leg;});};
  for(const k of THEME_KEYS){themeKey=k;TH=THEMES[k];
    for(let n=1;n<=MAX_DESKS;n++){
      desks=Array.from({length:n},(_,i)=>({id:'t'+i,name:'Dev',steps:[]}));
      const xs=deskXs(n),hw=deskHalf(n),deskBoxes=xs.map(x=>({x0:x-hw,y0:112,x1:x+hw,y1:122})),blocks=FLOOR_BLOCK.map(b=>({x0:b.x0+2,y0:Math.max(b.y0+2,WALK_Y+1),x1:b.x1-2,y1:b.y1-2}));
      // the corridor itself runs along the machine's back edge, so a block starts below it
      const test=(from,t,what)=>route({...from},t).forEach(([a,b])=>{const along=a.y===WALK_Y&&b.y===WALK_Y;
        (along?deskBoxes:[...deskBoxes,...blocks]).forEach(o=>{if(crosses(a,b,o))log(false,`${k} n=${n}: ${what} crosses (${o.x0},${o.y0}) on (${a.x},${a.y})-(${b.x},${b.y})`);});});
      spots.forEach(s=>{spots.forEach(u=>test({x:s.x,y:s.y,path:[]},u,'spot to spot'));
        xs.forEach(x=>{test({x,y:SEAT_Y,seated:true,seatX:x,path:[]},s,'seat to spot');test({x:x-8,y:SEAT_Y,path:[]},s,'redirected leaving a seat');test({x:s.x,y:s.y,path:[]},{x,y:SEAT_Y,seated:true},'spot to seat');});});
    }
  }
  // 8. a walker faces where it goes, and two walkers meeting head on pass apart
  themeKey=keep;TH=THEMES[keep];
  {const live=[...chars.entries()];chars.clear();
    const mk=(id,x,y,px)=>{const e={...newChar(id,{c:'#fff'}),hidden:false,x,y,path:[{x:px,y}],tgt:{x:px,y,dir:1}};chars.set(id,e);return e;};
    const a=mk('a',60,150,260),b=mk('b',260,150,60);let min=1e9;
    for(let i=0;i<600&&(a.path.length||b.path.length);i++){stepEntity(a,1/60);stepEntity(b,1/60);if(a.path.length&&b.path.length)min=Math.min(min,Math.hypot(a.x-b.x,a.y-b.y));}
    log(min>=6,'walkers meet at '+min.toFixed(1)+' px');log(!a.path.length&&!b.path.length,'walkers never arrived');
    const c=mk('c',200,150,100);stepEntity(c,1/60);log(dirOf(c)===-1,'a walker going left faces '+dirOf(c));
    chars.clear();live.forEach(([k,v])=>chars.set(k,v));}
  // 9. the cat: every state stays inside the box its outline is drawn from, in every look and both ways
  {const keepCat=cat,tp=performance.now(),big=document.createElement('canvas');big.width=120;big.height=120;const b=big.getContext('2d',{willReadFrequently:true});
    const shots=[{state:'sit'},{state:'sleep'},{state:'stretch'},{state:'crouch'},{state:'rub'},{state:'swipe',swipe:tp},{state:'swipe',swipe:tp-400},{state:'sit',pet:9},{state:'sit',fid:{k:'groom',until:1e12}},{state:'sit',fid:{k:'yawn',until:1e12}},
      {state:'walk',path:[{x:0,y:0}]},{state:'walk',path:[{x:0,y:0}],speed:34,v:34,stride:5},{air:{t0:tp-100,dur:400,z0:0,z1:0}},{air:{t0:tp-300,dur:400,z0:0,z1:0}},{land:tp+1e4}];
    for(const k of THEME_KEYS){themeKey=k;TH=THEMES[k];shots.forEach((o,i)=>[1,-1].forEach(face=>{
      cat=Object.assign(newCat(0),{x:60,y:70,face,hop:0},o);b.clearRect(0,0,120,120);drawCat(b,tp);
      const d=b.getImageData(0,0,120,120).data;let out=0;for(let y=0;y<120;y++)for(let x=0;x<120;x++)if(d[(y*120+x)*4+3]&&(x<50||x>70||y<50||y>73))out++;
      log(!out,`${k}: cat shot ${i} face ${face} has ${out} px outside its box`);}));}
    // it speeds up and brakes, jumps through a crouch and lands in one, and gets where it was going
    themeKey=keep;TH=THEMES[keep];cat=newCat(0);cat.x=100;cat.y=150;catGo(180,150,true);let t=performance.now(),top=0,first=0,last=1e9;
    for(let i=0;i<300&&cat.path.length;i++){t+=16;stepCat(.016,t);if(!i)first=cat.v;top=Math.max(top,cat.v);if(cat.path.length)last=cat.v;}
    log(!cat.path.length&&cat.x===180,'cat never reached its spot');log(first<10&&top===34,`cat speed ${first.toFixed(1)} to ${top.toFixed(1)}`);log(last<14,'cat ends at speed '+last.toFixed(1));
    catJump(190,150,14,300,6);t=cat.air.t0-50;stepCat(.016,t);log(cat.z===0&&cat.x===180,'cat left before its crouch ended');t+=500;stepCat(.016,t);
    log(!cat.air&&cat.z===14&&cat.land>t,'cat did not land in a crouch');
    cat=keepCat;}
  // 10. a chat line stays in the room, clear of both Claudes' badges and of the other Claude's head
  CHAT.forEach((s,i)=>{const o=CHAT[1-i],t=s.y-15,b=speechBox({x:s.x,bodyTop:t},Math.sign(o.x-s.x),7,7),rimmed=box('bubble',b.x-1,b.y,b.w+1,b.h+2);
    log(b.x>=3&&b.x+b.w<=W-3&&b.y>=2,`chat bubble ${i} leaves the room`);
    [s,o].forEach(c=>log(!hit(rimmed,box('badge',c.x-7,t-26,14,26)),`chat bubble ${i} on the badge at ${c.x}`));
    log(!hit(rimmed,box('head',o.x-8,t,16,15)),`chat bubble ${i} on the other Claude`);});
  themeKey=keep;TH=THEMES[keep];desks=keepDesks;
  // 10. the page follows a /office-theme once, and T stays free to change it afterwards
  {const k=THEME_KEYS.find(x=>x!==keep),other=THEME_KEYS.find(x=>x!==keep&&x!==k),ms=Date.now()+1e9;
    followRoom({theme:k,ms});log(themeKey===k,'/office-theme not followed: '+themeKey);
    setTheme(other);followRoom({theme:k,ms});log(themeKey===other,'/office-theme applied twice');
    setTheme(keep);}
  // one line per failure: the browser log keeps only the first line of a message
  if(!fails.length)console.log('CHECK OK all layout checks passed');
  else{console.log('CHECK FAIL '+fails.length);fails.slice(0,40).forEach(m=>console.log('CHECK FAIL: '+m));}
})();
// Moving a desk, with real pointer events once the desks have come in: the last desk dragged onto the
// first place lands there, the others shift along, Claudes follow, and the order outlives new data.
setTimeout(()=>{
  const fails=[],ids=()=>desks.map(d=>String(d.id)),r=stage.getBoundingClientRect(),keepOrder=deskOrder;
  const fire=(type,x,y)=>stage.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,pointerId:1,clientX:r.left+x/W*r.width,clientY:r.top+y/H*r.height}));
  const before=ids(),n=before.length,xs=deskXs(n),y=BOARD_TOP+9,last=before[n-1],seated=[...chars.values()].find(c=>c.id===before[0]);
  if(n<2)fails.push('only '+n+' desks in the fake data');
  fire('pointerdown',xs[n-1],y);fire('pointermove',xs[n-1]-30,y);
  if(!boardDrag||!boardDrag.on)fails.push('dragging a board did not pick it up');
  if(boardShift(desks[n-1])!==-30)fails.push('the board moved by '+boardShift(desks[n-1]));
  fire('pointermove',xs[0],y);fire('pointerup',xs[0],y);
  const want=[last,...before.slice(0,n-1)].join();
  if(ids().join()!==want)fails.push('order '+ids().join()+', wanted '+want);
  ids().forEach((id,i)=>{if(chars.get(id).dx!==xs[i])fails.push(id+' desk at '+chars.get(id).dx+', wanted '+xs[i]);});
  if(seated&&seated.act!=='idle'&&!seated.errand&&seated.tgt.x!==xs[1])fails.push('its Claude is not going to its new place');
  ingest(lastData,false);if(ids().join()!==want)fails.push('new data undid the order');
  fire('pointerdown',xs[1],y);fire('pointermove',xs[3],y);window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));fire('pointerup',xs[3],y);
  if(ids().join()!==want)fails.push('Escape did not cancel the drag');
  fire('pointerdown',xs[1],y);fire('pointerup',xs[1],y);
  if(ids().join()!==want)fails.push('a plain click moved a desk');
  deskOrder=keepOrder;try{localStorage.removeItem('office.deskOrder');}catch(e){}ingest(lastData,false);
  if(ids().join()!==before.join())fails.push('order not put back');
  if(!fails.length)console.log('CHECK OK moving a desk');else fails.forEach(m=>console.log('CHECK FAIL: '+m));
},2500);
