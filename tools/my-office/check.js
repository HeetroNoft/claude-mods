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
  const room=[box('gauge',2,1,73,16),box('sign',1,30,29,7),box('door',3,38,25,46),box('left shelf',6,18,116,6),box('right shelf',198,18,116,6),box('clock',149,2,24,24),
    box('cabinet',18,138,22,42),box('machine',86,133,40,47),box('counter',COUNTER.x-1,152,42,28),box('plant',292,92,22,40),box('small plant',3,158,12,21),
    box('settings button',306,169,14,11),box('bottom bar',141,169,39,10),box('item bar over the floors',141,158,39,10)];
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
  // 10. the page follows a /my-office-theme once, and T stays free to change it afterwards
  {const k=THEME_KEYS.find(x=>x!==keep),other=THEME_KEYS.find(x=>x!==keep&&x!==k),ms=Date.now()+1e9;
    followRoom({theme:k,ms});log(themeKey===k,'/my-office-theme not followed: '+themeKey);
    setTheme(other);followRoom({theme:k,ms});log(themeKey===other,'/my-office-theme applied twice');
    setTheme(keep);}
  // 11. what a Claude holds or carries stays in front of what it wears: every pixel it adds to a
  // plain Claude must come out the same on a Claude with an accessory, for each one and both ways
  {const cv=document.createElement('canvas');cv.width=cv.height=48;const g=cv.getContext('2d',{willReadFrequently:true});
    const px=o=>{g.clearRect(0,0,48,48);drawPerson(g,24,40,o);return g.getImageData(0,0,48,48).data;},c='#8E6CCF';
    const mug={kind:'mug',fill:1},tea={kind:'teacup'},cookie={kind:'cookie'},donut={kind:'donut'},flower={kind:'flower'},gift={kind:'gift'},ball={kind:'ball'};
    const CASES=[['walk',0,{carry:'#4FA3E0'}],['walk',1,{carry:'#4FA3E0'}],['read',1],['game',1],['phone',1],['fold',0],['fold',1],['water',1],
      ...[mug,tea].flatMap(h=>[0,.5,1].map(r=>['sip',1,{held:h,raise:r}])),...[cookie,donut].flatMap(h=>[0,.5,1].map(r=>['eat',1,{held:h,raise:r}])),
      ['hold',0,{held:flower}],['hold',0,{held:flower,lift:4}],['hold',0,{held:gift}],['hold',0,{held:ball}]];
    for(let style=1;style<LOOKS.length;style++)for(const dir of [1,-1])for(const [pose,frame,extra] of CASES){
      const o=l=>({look:l,pose,frame,dir,...extra,held:extra&&extra.held?{...extra.held}:undefined}),base=px({look:{c,style:0},pose:'stand',dir}),A=px(o({c,style:0})),B=px(o({c,style}));let n=0;
      for(let i=0;i<A.length;i+=4){if(!A[i+3])continue;const added=A[i]!==base[i]||A[i+1]!==base[i+1]||A[i+2]!==base[i+2]||A[i+3]!==base[i+3];
        if(added&&(A[i]!==B[i]||A[i+1]!==B[i+1]||A[i+2]!==B[i+2]))n++;}
      log(!n,`${VARIANTS[style]} ${pose} ${extra&&extra.held?extra.held.kind:extra&&extra.carry?'file':''} dir ${dir} raise ${extra&&extra.raise}: ${n} px covered`);}}
  // 12. the settings button stays in its corner, the only button there
  {const r=stage.getBoundingClientRect(),bs=['set'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return box(id,(b.left-r.left)/r.width*W,(b.top-r.top)/r.height*H,b.width/r.width*W,b.height/r.height*H);});
    bs.forEach((a,i)=>{log(a.x>=306&&a.y>=169,`button ${a.n} leaves the corner: ${a.x.toFixed(1)},${a.y.toFixed(1)}`);});
    log(stage.querySelectorAll(':scope>button').length===1,'more than one action button');
    // 13. settings: open, each choice takes effect and is remembered, keys and defaults work
    const b=id=>document.getElementById(id),on=q=>document.querySelector('#prefs '+q),showTab=k=>on(`[data-tab=${k}]`).click();
    b('set').click();log(b('prefs').classList.contains('open'),'settings do not open');
    showTab('display');on('[data-sw=calm]').click();log(document.body.classList.contains('calm')&&calmMotion(),'less motion not applied');
    on('[data-sw=badges]').click();log(PREFS.badges===false,'head icons not switched');
    showTab('room');on('[data-seg=time][data-v=night]').click();showTab('display');const stored=JSON.parse(localStorage.getItem('office.prefs')||'{}');
    log(stored.calm===true&&stored.badges===false&&stored.time==='night','settings not remembered: '+JSON.stringify(stored));
    const w0=b('set').offsetWidth;on('[data-sw=compact]').click();log(b('set').offsetWidth<w0,'compact buttons not smaller');
    on('[data-sw=items]').click();log(barOn===false&&b('items').classList.contains('hide'),'item bar not hidden');
    on('.reset').click();log(barOn&&PREFS.badges&&!PREFS.calm&&!PREFS.compact&&PREFS.time==='auto'&&b('set').offsetWidth===w0,'defaults not restored');
    // 15. the bars, centred, in all four cases: floors at the edge with the items above, either alone
    // at that edge. Measured with no motion, so nothing is on its way
    setPref('calm',true);
    const fl=b('floors'),st=stage.getBoundingClientRect(),hadShow=fl.classList.contains('show'),mid=e=>{const q=e.getBoundingClientRect();return q.left+q.width/2;};
    const place=(fs,it)=>{fl.classList.toggle('show',fs);setBar(it);layoutBars();return {f:fl.getBoundingClientRect(),i:b('items').getBoundingClientRect()};};
    const onlyF=place(true,false),onlyI=place(false,true),both=place(true,true);
    log(Math.abs(mid(fl)-(st.left+st.width/2))<1.5,'floors not centred');log(Math.abs(mid(b('items'))-(st.left+st.width/2))<1.5,'items not centred');
    log(Math.abs(onlyI.i.bottom-onlyF.f.bottom)<1.5,'items alone are not in the floors place');
    log(Math.abs(both.f.bottom-onlyF.f.bottom)<1.5,'floors moved for the items');
    const rise=onlyI.i.bottom-both.i.bottom,fh=onlyI.i.height; // the floors are empty here: a full bar is as tall as the items
    log(rise>=fh&&rise<=fh+10,`items not just above the floors: up ${rise} for ${fh}`);
    place(false,false);log(!stage.classList.contains('two'),'no bars still counted as two');
    fl.classList.toggle('show',hadShow);setBar(true);layoutBars();
    // 16. the gauge: its own layer, hidden with its tab left in the room, and back; G does it too
    const us=b('usage'),x0=us.getBoundingClientRect().left;log(wx.canvas!==gcx.canvas,'gauge on the room canvas');
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'g'}));const tab=b('gtab').getBoundingClientRect();
    log(PREFS.gauge===false&&tab.left<=st.left+2&&tab.right>st.left+4,'gauge not hidden with its tab showing');
    b('gtab').click();log(PREFS.gauge===true&&Math.abs(us.getBoundingClientRect().left-x0)<1,'gauge not back');
    setPref('calm',false);
    // 17. the tab touches the gauge: nothing between the gauge's frame and it
    const g2=gcx.canvas.getBoundingClientRect(),tb=b('gtab').getBoundingClientRect(),edge=g2.left+g2.width*(GAUGE.x+GAUGE.w)/gcx.canvas.width;
    log(Math.abs(tb.left-edge)<2,`gauge tab apart from the gauge: ${tb.left} / ${edge}`);
    // 18. the cat keeps off the furniture, and what is painted with the room covers who is behind it
    for(const k of THEME_KEYS){themeKey=k;TH=THEMES[k];
      const spots=CAT_SPOTS.map(s=>{const p={...s};outOfFurniture(p);return p;});
      spots.forEach(a=>spots.forEach(t=>{let p=a;catRoute(a,t).forEach(q=>{const along=p.y===WALK_Y&&q.y===WALK_Y;
        FLOOR_BLOCK.concat(TH.obstacles||[]).forEach(o=>{if(!along&&crosses(p,q,o))log(false,`${k}: the cat crosses (${o.x0},${o.y0}) from ${p.x},${p.y} to ${q.x},${q.y}`);});p=q;});}));
      (TH.obstacles||[]).forEach(o=>log(standingBoxes(TH).some(([x,,w])=>x<o.x1&&x+w>o.x0),`${k}: a table is not sorted with the Claudes`));
      // 19. what stands on the floor sorts at its front edge, so nobody beside it is painted over it
      paintStanding(TH);const bottom=f=>{const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');f(g);const d=g.getImageData(0,0,W,H).data;for(let y=H-1;y>=0;y--)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>150)return y;return 0;};
      standingBoxes(TH).forEach(([x,y,w,h,d])=>{const b=bottom(g=>g.drawImage(standing,x,y,w,h,x,y,w,h));log(b<=d,`${k}: what is painted at ${x},${y} reaches ${b} but sorts at ${d}`);});
      [['cabinet',g=>drawCabinet(g,0,0)],['machine',g=>drawMachine(g,0,'idle')]].forEach(([n,f])=>{const b=bottom(f);log(b<=FRONT[n]&&FRONT[n]>=179,`${k}: the ${n} reaches ${b} but sorts at ${FRONT[n]}`);});}
    // 23. the cabinet opens a drawer at random, each in turn of every kind, stays on it while open, and never the same twice running
    {const g=document.createElement('canvas').getContext('2d');
      Object.entries(CABINETS).forEach(([k,K])=>{if(K.drawers.length<2)return;TH={...THEMES[keep],cabinetKind:k};const seen=new Set();let last=-1,same=false,moved=false;
        for(let i=0;i<600;i++){drawCabinet(g,0,0);drawCabinet(g,1,0);const d=cabDrawer;drawCabinet(g,1,0);if(cabDrawer!==d)moved=true;if(d===last)same=true;last=d;seen.add(d);}
        log(seen.size===K.drawers.length&&!same&&!moved,`${k}: drawers opened ${[...seen]}, same twice ${same}, moved ${moved}`);});
      drawCabinet(g,0,0);}
    // 24. a mopped stain leaves nothing on the floor, and what is wiped stays wiped when another Claude takes over
    {const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),count=()=>{g.clearRect(0,0,W,H);drawStain(g,stain);const d=g.getImageData(0,0,W,H).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;},was=stain;
      stain={floor:curFloor,x:200,y:150,left:1,wet:0,gone:new Set()};log(count()===STAIN_PIXELS,'a fresh stain is not whole');
      const t=performance.now(),I={until:t+5000,start:t,dur:5000};for(let i=0;i<400;i++)mopTick({},I,t+i*5);const left=stain.left;mopTick({},{until:t+1e4,start:t+9000,dur:1000},t+9000);
      log(left<1&&left>.3&&stain.left<=left,'the mop is off its pace or lets a stain grow back: '+left);
      mopEnd({},I,t);log(stain.left===0&&count()===0,'pixels stay after the mop');stain=was;}
    // 25. the door: wait for it, step through, gone only once it has shut; and the same way in
    {const was=doorAmt,e={...newChar('door',{c:'#fff'}),x:DOOR.x,y:DOOR.y,tgt:{exit:true,key:'x'},hidden:false};
      gateOut(e);doorAmt=0;stepGate(e,.1);log(e.gate.step==='wait'&&gateHolds(e),'someone does not wait for the door to open');
      doorAmt=1;for(let i=0;i<20;i++)stepGate(e,.05);log(e.gate&&e.gate.step==='shut'&&e.y===GATE.y&&!gateHolds(e)&&!e.hidden,'someone leaves before the door has shut');
      doorAmt=0;stepGate(e,.05);log(e.hidden&&!e.gate,'someone is still there behind the shut door');
      const f={...newChar('door2',{c:'#fff'})};gateIn(f);doorAmt=0;stepGate(f,.1);log(f.gate.step==='wait'&&f.y===GATE.y,'someone comes in through the shut door');
      doorAmt=1;for(let i=0;i<20;i++)if(f.gate)stepGate(f,.05);log(!f.gate&&f.y===DOOR.y,'someone does not reach the room through the door');doorAmt=was;}
    themeKey=keep;TH=THEMES[keep];buildBg();
    // 20. a Claude pets a cat that waits for it, within reach, or gives up: never a stroke from afar
    {cat=cat||newCat(performance.now());const live=[...chars.entries()],was={...cat},mk=(id,x,y)=>{const e={...newChar(id,{c:'#fff'}),hidden:false,x,y,path:[],tgt:{x,y},arrived:true,idle:{phase:'pick',t:0}};chars.set(id,e);return e;};
      const walking=()=>Object.assign(cat,{away:false,job:null,z:0,air:null,x:200,y:150,path:[{x:60,y:150}]});
      chars.clear();const me=mk('pet',120,150);walking();startIdle(me,'catpet');
      log(!cat.path.length&&catReach(me.tgt),'a Claude walks to a cat still on its way somewhere else');
      decor.push({x:200,y:120,vx:1,vy:0,life:2});cat.planeCD=0;watchPlanes(performance.now());decor.pop();
      log(!cat.job,'a plane draws off the cat a Claude came to pet');
      mk('side',190,151);me.tgt=null;me.idle={phase:'pick',t:0};walking();startIdle(me,'catpet');
      log(me.idle.phase==='pick'&&cat.path.length===1,'no room by the cat, yet a Claude goes to pet it');
      Object.assign(cat,{x:60,y:150,path:[]});me.idle={act:'catpet',phase:'do',until:performance.now()+5000};idleTick(me,me.idle,performance.now());
      log(me.idle.until===0,'a Claude goes on petting a cat out of reach');
      // 22. a Claude up the ladder really reaches the clock, and comes back down to the floor
      const up=performance.now();me.path=[];me.idle={act:'clock',phase:'do',start:up-4000,until:up+4000};
      log(sceneAir(me,up)===CLOCK_TOP&&CLOCK_SPOT+10>=CLOCK.x-CLOCK.r&&89-CLOCK_TOP-15<=CLOCK.y+CLOCK.r,'a Claude on the ladder does not reach the clock');
      me.idle.until=up+10;log(sceneAir(me,up+10)===0,'a Claude stays up the ladder');
      chars.clear();live.forEach(([k,v])=>chars.set(k,v));Object.assign(cat,was);}
    // 14. the cat's name: kept clean, remembered, and typing it presses no shortcut
    showTab('room');const room=themeKey,cn=on('#pcat');cn.value='Mïmi! the great';cn.dispatchEvent(new Event('input',{bubbles:true}));
    log(catName==='Mimi the g'&&localStorage.getItem('office.catName')===catName,'cat name not cleaned or kept: '+catName);
    cn.dispatchEvent(new KeyboardEvent('keydown',{key:'t',bubbles:true}));log(themeKey===room,'typing the name changed the room');
    catTagUntil=performance.now()+1e4;drawCatTag(wx,performance.now());setCatName('');
    // 21. the office's name: kept clean, in the tab's title, and typing it presses no shortcut; the tab's icon follows the room
    const pn=on('#poffice'),keepName=officeName,keepTheme=themeKey;pn.value='  Ma   boîte ';pn.dispatchEvent(new Event('input',{bubbles:true}));
    log(officeName==='Ma boîte'&&document.title.endsWith('Ma boîte'),'office name not in the title: '+document.title);
    pn.dispatchEvent(new KeyboardEvent('keydown',{key:'t',bubbles:true}));log(themeKey===keepTheme,'typing the office name changed the room');
    setOfficeName('');log(document.title.endsWith(BASE_TITLE),'an empty office name loses the title');setOfficeName(keepName);
    const icons=new Set(THEME_KEYS.map(k=>faviconFor(THEMES[k].catLook)));log(faviconEl.href.startsWith('data:image/png')&&icons.size===new Set(THEME_KEYS.map(k=>THEMES[k].catLook)).size,'each cat should have its own tab icon');
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));log(!b('prefs').classList.contains('open'),'Esc does not close settings');}
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
