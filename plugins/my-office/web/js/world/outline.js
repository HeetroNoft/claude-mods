// Outlines and floor/wall shadows that make furniture read against the room.
// Every piece of furniture gets a dark rim in the theme's TH.ol. The rim follows the silhouette: a
// clear pixel touching an opaque one (alpha >= .6, so shadows and glows get no rim) is painted.
'use strict';
const olScratch=document.createElement('canvas');olScratch.width=W;olScratch.height=H;
const osx=olScratch.getContext('2d',{willReadFrequently:true});
const olCache=new Map(),OL_CACHE_MAX=400;

// The rim of an RGBA buffer w x h, as a canvas plus its offset inside that buffer (null if empty).
function traceMask(src,w,h,col){
  const solid=i=>src[i*4+3]>=153,[r,g,b]=hexRgb(col),hit=[];let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(solid(i))continue;
    if((x>0&&solid(i-1))||(x<w-1&&solid(i+1))||(y>0&&solid(i-w))||(y<h-1&&solid(i+w))){hit.push(i);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
  if(!hit.length)return null;
  const cw=x1-x0+1,ch=y1-y0+1,c=document.createElement('canvas');c.width=cw;c.height=ch;
  const cx=c.getContext('2d'),img=cx.createImageData(cw,ch);
  hit.forEach(i=>{const o=((Math.floor(i/w)-y0)*cw+(i%w-x0))*4;img.data[o]=r;img.data[o+1]=g;img.data[o+2]=b;img.data[o+3]=255;});
  cx.putImageData(img,0,0);
  return {c,x:x0,y:y0};
}
// Traces the rim of whatever `draw` paints on a blank room-sized canvas.
function traceOutline(draw,col){osx.clearRect(0,0,W,H);draw(osx);return traceMask(osx.getImageData(0,0,W,H).data,W,H,col);}
function remember(k,v){if(olCache.size>OL_CACHE_MAX)olCache.clear();olCache.set(k,v);return v;}

// Things whose silhouette never changes (desks, chairs, boards): traced once per theme and key.
// `shape` paints the silhouette (defaults to `draw`); `draw` paints the real, animated thing.
function outlined(g,key,draw,shape){
  const k=themeKey+'|'+key,o=olCache.has(k)?olCache.get(k):remember(k,traceOutline(shape||draw,TH.ol));
  if(o)g.drawImage(o.c,o.x,o.y);
  draw(g);
}
// Things that move (a drawer sliding out, a swaying plant, a lever, the cat): drawn first inside
// their box [x, y, w, h] on a scratch canvas, read back, and the rim is traced once per distinct
// silhouette, so it follows every frame of the animation. The box needs 1 px of margin all round.
function outlinedLive(g,key,box,draw){
  const bx=Math.round(box[0]),by=Math.round(box[1]),bw=box[2],bh=box[3];
  osx.clearRect(bx,by,bw,bh);osx.save();osx.beginPath();osx.rect(bx,by,bw,bh);osx.clip();draw(osx);osx.restore();
  const d=osx.getImageData(bx,by,bw,bh).data;let h=2166136261;
  for(let i=3;i<d.length;i+=4){h^=d[i]>=153?7:1;h=Math.imul(h,16777619);}
  const k=themeKey+'|'+key+'|'+bw+'x'+bh+'|'+(h>>>0),o=olCache.has(k)?olCache.get(k):remember(k,traceMask(d,bw,bh,TH.ol));
  if(o)g.drawImage(o.c,bx+o.x,by+o.y);
  g.drawImage(olScratch,bx,by,bw,bh,bx,by,bw,bh);
}

// Light comes from the window, high on the right, so every shadow falls down and to the left.
// A soft contact shadow under something standing on the floor, fading over three rows.
function floorShadow(g,x,y,w){R(g,x-2,y,w+2,1,'rgba(0,0,0,.28)');R(g,x-2,y+1,w,1,'rgba(0,0,0,.15)');R(g,x-1,y+2,w-3,1,'rgba(0,0,0,.06)');} // down and to the left, away from the window
// The shadow something hung on the wall casts: one row under it, one column on its left.
function wallShadow(g,x,y,w,h){R(g,x-1,y+h,w,1,'rgba(0,0,0,.16)');R(g,x-1,y+1,1,h,'rgba(0,0,0,.12)');}
