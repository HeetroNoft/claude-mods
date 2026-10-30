// The room's terminal: what the sessions do on the machine (the web, commands). Each room has its own
// model (TH.machineKind), painted in the room's machine colours (TH.machine, TH.machineHi), and they
// all share one screen: a page scrolling for the web, a console for commands, the Claude spark
// drifting when idle, a light show when clicked. Everything stays in x 86..127, y 132..180.
//   classic  a retro mainframe: LEDs, three buttons, a lever (pixel)
//   kiosk    a slim cream kiosk on a pillar, one orange light (claude)
//   radio    a wooden TV cabinet: rounded amber tube, brass knobs, a speaker grille (cosy)
//   arcade   an arcade cabinet: glowing marquee, joystick, two buttons, coin slots (neon)
//   zen      a lacquered cabinet: a scroll-framed screen, gold corners, three lantern lights (japan)
//   desktop  a 2000 office PC: a CRT monitor on a desktop case, floppy and CD, two LEDs (paper)
//   terminal a cream boxy terminal on a pedestal, keyboard tray and trackball (retro)
//   console  a ship's console: a holo screen, a grid of blinking keys, a slider, hazard stripes (space)

// The screen palettes: web page, console, idle; each model can bring its own.
const SCREEN={bg:'#0A1426',web:'#BFE6FF',webBar:'#5BA8E0',webLine:'#5E7FA3',sh:'#06200F',shLine:'#5BD08A',idle:'#0F1C33',spark:shade(ORANGE,-.15),glow:'160,215,255'};
function drawScreen(g,x,y,w,h,mode,tp,P){
  P=Object.assign({},SCREEN,P||{});const t=tp/1000;
  R(g,x,y,w,h,P.bg);
  if(tp<funUntil){
    // clicked: a little light show with the Claude spark
    const k=Math.floor(t*8);for(let i=0;i<w;i++)R(g,x+i,y,1,h,['#FF5D5D','#FFB547','#FFD84A','#5BD08A','#5BA8E0','#8E6CCF'][(i+k)%6]);
    const cx=x+(w>>1),cy=y+(h>>1);R(g,cx-5,cy-4,10,9,P.bg);pattern(g,SPARK,cx-2,cy-2,Math.floor(t*4)%2?'#FFFFFF':ORANGE);
  }else if(mode==='web'){
    R(g,x,y,w,h,P.web);R(g,x,y,w,2,P.webBar);
    const s=Math.floor(t*4)%6;for(let i=0;i<4;i++){const ly=y+3+((i*2+s)%Math.max(1,h-4));if(ly<y+h)R(g,x+2,ly,Math.max(2,(i%2?w*.55:w*.8)|0),1,P.webLine);}
  }else if(mode==='bash'){
    R(g,x,y,w,h,P.sh);const s=Math.floor(t*6),rows=Math.max(1,Math.floor((h-1)/2.5));
    for(let i=0;i<rows;i++){const lw=Math.min(w-2,3+((s+i*7)%Math.max(4,w-6)));R(g,x+1,Math.round(y+1+i*2.5),lw,1,P.shLine);}
    if(Math.floor(t*3)%2)R(g,x+1+((s*3)%Math.max(1,w-4)),y+h-1,2,1,P.shLine);
  }else{
    // idle: the Claude spark drifts around the screen, bouncing off its edges
    R(g,x,y,w,h,P.idle);const tri=(v,m)=>{if(m<=0)return 0;const k=v%(2*m);return k<m?k:2*m-k;};
    pattern(g,SPARK,x+Math.round(tri(t*6,w-5)),y+Math.round(tri(t*4,h-5)),P.spark);
  }
  R(g,x,y,w,1,'rgba(255,255,255,.12)'); // the glass catches the light
}
// how fast the lights blink, and whether one is lit: busier work, faster lights
const mSpeed=mode=>mode==='bash'?8:mode==='web'?4:1.2;
const lit=(tp,mode,i)=>(Math.floor(tp/1000*mSpeed(mode)+i*1.7)%3)!==0;
const fun=tp=>tp<funUntil;

const MACHINES={
  classic(g,tp,mode){
    const t=tp/1000,M=TH.machine,H=TH.machineHi;
    R(g,88,136,34,41,M);R(g,88,136,34,1,H);floorShadow(g,88,177,34);
    [[89,137],[120,137],[89,175],[120,175]].forEach(([x,y])=>R(g,x,y,1,1,shade(H,.3)));
    for(let x=110;x<119;x+=2)R(g,x,155,1,4,shade(M,-.35));
    R(g,90,177,4,1,'#1B2740');R(g,116,177,4,1,'#1B2740');
    R(g,91,139,28,13,'#0A1426');drawScreen(g,92,140,26,11,mode,tp);
    ['#FF5D5D','#FFB547','#5BD08A','#5BA8E0','#FF5D5D'].forEach((c,i)=>R(g,92+i*5,155,3,2,lit(tp,mode,i)?c:'#1B2740'));
    [ORANGE,'#2A9D8F','#E0B04A'].forEach((c,i)=>{const p=mode==='bash'&&Math.floor(t*5)%3===i;R(g,92+i*9,161+(p?1:0),7,4,p?shade(c,-.25):c);R(g,92+i*9,165,7,1,'#1B2740');});
    R(g,92,169,26,5,shade(M,-.2));R(g,94,171,22,1,H);
    R(g,122,150,2,12,H);const up=mode==='bash'||fun(tp)?(Math.floor(t*2)%2):0;
    R(g,124,up?148:156,1,6,'#9AA6B8');R(g,123,up?146:161,3,3,'#FF5D5D');
  },
  kiosk(g,tp,mode){
    const M='#F4EFE6',E='#DCD3C2',D=TH.machine;
    floorShadow(g,94,177,24);
    R(g,95,174,22,3,E);R(g,95,174,22,1,M);R(g,96,177,20,1,shade(E,-.25));     // the foot
    R(g,103,158,6,16,E);R(g,103,158,1,16,M);R(g,108,158,1,16,shade(E,-.15));  // the pillar
    R(g,89,134,34,25,D);R(g,90,135,32,23,M);R(g,90,135,32,1,'#FFFFFF');R(g,121,136,1,22,E); // the cream frame
    drawScreen(g,93,138,26,15,mode,tp,{idle:'#2B2A24',bg:'#2B2A24',spark:ORANGE,web:'#FBF8F2',webBar:ORANGE,webLine:'#B9AE98',sh:'#1F1E1D',shLine:'#F0C9A0'});
    // the chin: one orange light that breathes when idle and pulses at work
    const a=mode==='idle'&&!fun(tp)?.45+.35*Math.sin(tp/900):lit(tp,mode,0)?1:.35;
    g.globalAlpha=a;R(g,104,155,4,1,ORANGE);g.globalAlpha=1;R(g,96,155,3,1,E);R(g,113,155,3,1,E);
  },
  radio(g,tp,mode){
    const t=tp/1000,W='#6E4630',Wd='#4E3022',Wl='#8A5A3E',B='#E0B04A';
    floorShadow(g,88,177,34);
    [[90],[118]].forEach(([x])=>{R(g,x,173,3,4,Wd);R(g,x+1,176,1,1,'#2E1E16');}); // tapered legs
    R(g,88,135,34,39,W);R(g,88,135,34,2,Wl);R(g,88,172,34,2,Wd);R(g,88,135,1,39,Wl);R(g,121,135,1,39,Wd);
    for(let y=140;y<170;y+=5)R(g,90+((y*7)%9),y,8,1,shade(W,-.12)); // wood grain
    // the rounded tube in its bezel, warm amber
    R(g,91,139,22,17,Wd);R(g,92,138,20,1,Wd);R(g,92,156,20,1,Wd);
    drawScreen(g,93,140,18,15,mode,tp,{bg:'#2A1A10',idle:'#2A1A10',spark:'#FFB547',web:'#FFE8C2',webBar:'#E0A050',webLine:'#A0703A',sh:'#1E140C',shLine:'#FFB547'});
    R(g,93,140,1,1,Wd);R(g,110,140,1,1,Wd);R(g,93,154,1,1,Wd);R(g,110,154,1,1,Wd); // rounded corners
    // brass knobs: their marks turn as it works
    [[116,142],[116,150]].forEach(([x,y],i)=>{R(g,x-1,y,5,3,shade(B,-.3));R(g,x,y-1,3,5,shade(B,-.3));R(g,x,y,3,3,B);
      const k=Math.floor(t*(mode==='idle'?.3:mSpeed(mode))+i*2)%4;R(g,x+[1,2,1,0][k],y+[0,1,2,1][k],1,1,'#4E3022');});
    // the magic eye: a green tuning light
    g.globalAlpha=mode==='idle'?.5:lit(tp,mode,1)?1:.6;R(g,116,157,3,2,'#7FE8A0');g.globalAlpha=1;
    // the speaker grille
    R(g,91,160,28,11,Wd);for(let y=161;y<170;y+=2)R(g,92,y,26,1,'#C9A577');
  },
  arcade(g,tp,mode){
    const t=tp/1000,M=TH.machine,H=TH.machineHi,P='#FF3DCB',C='#2DE2E6';
    floorShadow(g,88,177,34);
    R(g,90,134,30,43,M);R(g,90,134,1,43,H);R(g,119,134,1,43,H);R(g,90,176,30,1,shade(M,-.3)); // the cabinet, neon edged
    // the marquee, glowing
    const glow=.75+.25*Math.sin(tp/400);g.globalAlpha=glow;R(g,90,134,30,6,P);g.globalAlpha=1;
    R(g,92,136,26,2,'#FF9BE6');for(let i=0;i<5;i++)R(g,94+i*5,135,3,1,i%2?C:'#FFFFFF');
    R(g,92,141,26,14,'#0B0818');drawScreen(g,93,142,24,12,mode,tp,{bg:'#0B0818',idle:'#120E26',spark:P,web:'#C9F7FF',webBar:C,webLine:'#7B5CFF',sh:'#0B0818',shLine:C});
    // the control panel juts out: joystick and two buttons
    R(g,88,156,34,5,shade(M,.15));R(g,88,156,34,1,H);R(g,88,161,34,1,shade(M,-.35));
    const j=mode==='bash'||fun(tp)?[-1,0,1,0][Math.floor(t*6)%4]:0;R(g,97,158,4,2,'#1B1B1B');R(g,98+j,156,2,2,'#9AA6B8');R(g,97+j,154,4,2,'#FF5D5D');
    [[107,C],[113,P]].forEach(([x,c],i)=>{const on=lit(tp,mode,i);R(g,x,157,4,2,on?c:shade(c,-.5));});
    // coin slots
    [[98],[108]].forEach(([x],i)=>{R(g,x,166,5,6,shade(M,-.3));R(g,x+2,167,1,3,lit(tp,'idle',i)?'#FF5D5D':'#5A1A1A');});
  },
  zen(g,tp,mode){
    const M=TH.machine,Rd=TH.machineHi,G='#C9A54A',P='#F3EAD7';
    floorShadow(g,88,177,34);
    R(g,88,138,34,38,M);R(g,88,138,34,1,shade(M,.25));R(g,88,174,34,2,Rd);R(g,88,138,1,36,shade(M,.18));
    [[88,138],[120,138],[88,174],[120,174]].forEach(([x,y])=>R(g,x,y,2,2,G)); // gold corners
    R(g,92,176,4,1,shade(M,-.4));R(g,114,176,4,1,shade(M,-.4));
    // the screen, framed like a hanging scroll: a rod above and below
    R(g,91,140,28,16,P);R(g,90,139,30,1,'#5A3E2B');R(g,90,156,30,1,'#5A3E2B');
    drawScreen(g,93,142,24,12,mode,tp,{bg:'#1A1F33',idle:'#26315C',spark:'#F7B6C8',web:P,webBar:'#B03A2E',webLine:'#2E3E5C',sh:'#14261A',shLine:'#9CCB7A'});
    // three small lantern lights
    ['#FF8A5B','#FFD27A','#FF8A5B'].forEach((c,i)=>{const on=lit(tp,mode,i);R(g,96+i*8,160,4,4,on?c:shade(c,-.55));R(g,97+i*8,159,2,1,'#2E2219');});
    // two gold pull knobs on the drawer
    R(g,90,167,30,1,shade(M,-.3));R(g,98,169,4,2,G);R(g,108,169,4,2,G);
  },
  desktop(g,tp,mode){
    const M=TH.machine,H=TH.machineHi,S='#9AA0A8';
    floorShadow(g,88,177,34);
    // the desktop case on the floor: floppy, CD tray, power and disk LEDs
    R(g,88,160,34,17,M);R(g,88,160,34,1,H);R(g,88,176,34,1,shade(M,-.3));R(g,121,160,1,17,shade(M,-.15));
    R(g,91,163,14,3,shade(M,-.12));R(g,92,164,12,1,'#5C5F66');      // CD tray
    R(g,91,168,10,2,shade(M,-.12));R(g,92,168,6,1,'#2E3440');       // floppy slot
    R(g,112,165,2,1,'#5BD08A');R(g,116,165,2,1,mode!=='idle'&&lit(tp,mode,2)?'#FFB547':'#6A5A3A'); // power, disk
    for(let x=108;x<120;x+=2)R(g,x,170,1,4,shade(M,-.2));             // vents
    // the CRT monitor on its foot
    R(g,100,157,10,3,S);R(g,98,159,14,1,shade(S,-.2));
    R(g,90,135,30,22,H);R(g,90,135,30,1,'#FFFFFF');R(g,119,135,1,22,M);R(g,90,156,30,1,M);
    drawScreen(g,93,138,24,15,mode,tp,{bg:'#10243A',idle:'#0A3A6A',spark:'#FFFFFF',web:'#FFFFFF',webBar:'#2B5A9E',webLine:'#7C8796',sh:'#000000',shLine:'#C9D2DE'});
    R(g,114,154,2,1,'#5BD08A');                                       // the monitor's power light
  },
  terminal(g,tp,mode){
    const M=TH.machine,H=TH.machineHi,D=shade(M,-.25);
    floorShadow(g,94,177,24);
    R(g,96,174,18,3,D);R(g,96,174,18,1,M);R(g,102,165,6,9,M);R(g,107,165,1,9,D); // pedestal and foot
    // the keyboard tray and its trackball
    R(g,88,161,34,4,H);R(g,88,164,34,1,D);for(let x=90;x<112;x+=3)R(g,x,162,2,1,shade(H,-.12));
    R(g,114,161,4,3,'#2B2F3A');R(g,115,161,2,1,'#5A8A70');
    // the boxy cream body, deep screen set in it
    R(g,90,134,30,27,M);R(g,90,134,30,1,H);R(g,90,134,1,27,H);R(g,119,135,1,26,D);R(g,91,159,28,2,D);
    R(g,93,137,24,17,D);
    drawScreen(g,94,138,22,15,mode,tp,{bg:'#0B1612',idle:'#0F2A26',spark:'#8EF0C8',web:'#DDF5EA',webBar:'#3E7A63',webLine:'#6E9E88',sh:'#0B1612',shLine:'#8EF0C8'});
    R(g,113,156,2,1,mode==='idle'?'#3E7A63':'#8EF0C8');               // the power light
  },
  console(g,tp,mode){
    const t=tp/1000,M=TH.machine,C=TH.machineHi,Y='#E0B04A';
    floorShadow(g,88,177,34);
    R(g,88,136,34,41,M);R(g,88,136,34,1,shade(M,.3));R(g,88,136,1,41,shade(M,.2));R(g,121,136,1,41,shade(M,-.3));
    for(let x=88;x<122;x+=4){R(g,x,172,2,4,Y);R(g,x+2,172,2,4,'#1B2433');} // hazard stripes
    R(g,88,176,34,1,shade(M,-.4));
    // the holo screen: a cyan glass with scan lines
    R(g,91,139,28,15,'#0E1420');
    drawScreen(g,92,140,26,13,mode,tp,{bg:'#06101C',idle:'#0A1A2E',spark:C,web:'#BDEBFF',webBar:C,webLine:'#2A7AA8',sh:'#04101A',shLine:C});
    g.fillStyle='rgba(79,195,255,.08)';for(let y=140;y<153;y+=2)g.fillRect(92,y,26,1);
    // a grid of small keys, each blinking in turn
    for(let r=0;r<3;r++)for(let k=0;k<6;k++){const i=r*6+k,on=(Math.floor(t*mSpeed(mode)*1.5+i*2.3)%5)<2;R(g,92+k*4,157+r*4,3,2,on?[C,'#5BD08A','#FFB547'][(i+r)%3]:'#1B2433');}
    // a slider that runs while commands run
    R(g,118,157,2,13,'#1B2433');const sy=mode==='bash'||fun(tp)?157+Math.round(5+5*Math.sin(t*4)):166;R(g,117,sy,4,2,'#C7D0DB');
  },
};
function drawMachine(g,tp,mode){(MACHINES[TH.machineKind]||MACHINES.classic)(g,tp,mode);}
