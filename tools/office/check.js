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
  themeKey=keep;TH=THEMES[keep];desks=keepDesks;
  // one line per failure: the browser log keeps only the first line of a message
  if(!fails.length)console.log('CHECK OK all layout checks passed');
  else{console.log('CHECK FAIL '+fails.length);fails.slice(0,40).forEach(m=>console.log('CHECK FAIL: '+m));}
})();
