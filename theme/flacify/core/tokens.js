/* flacify/core/tokens.js -- design tokens: colours, metrics, fonts, glyphs, text + icon drawing
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- colour helpers ------------------------- */
function RGB(r,g,b){ return (0xff000000|(r<<16)|(g<<8)|b); }
function RGBA(r,g,b,a){ return ((a<<24)|(r<<16)|(g<<8)|b); }

/* ------------------------- tokens -------------------------
   The two knobs worth touching are UISCALE (a panel property now -- see core/props.js) and
   M.navW / M.queueW (sidebar and queue-pane widths). Everything else is derived layout. */
var COL = {
  black:RGB(0,0,0), white:RGB(255,255,255), base:RGB(18,18,18), elev:RGB(24,24,24), hover:RGB(42,42,42),
  text:RGB(255,255,255), text2:RGB(179,179,179), text3:RGB(106,106,106),
  green:RGB(30,215,96), greenC:RGB(29,185,84),
  rowHover:RGBA(255,255,255,18), rowActive:RGBA(255,255,255,38),
  line:RGBA(255,255,255,28), seekbg:RGB(77,77,77)
};
var M = { pad:8, gap:8, navW:230, queueW:400, barH:96, navTopH:84, rowH:56, radius:10, cpad:24, headH:280, artSz:200 };   // navW/queueW: sidebar + queue widths
var PALETTE=[RGB(83,62,140),RGB(30,120,110),RGB(150,64,92),RGB(43,92,160),RGB(120,92,44),RGB(58,120,64),RGB(140,80,120),RGB(52,100,150),RGB(96,72,52),RGB(70,70,96)];

var ACCENT_THEMES = {
  spotify_green: { id:'spotify_green', name:'Spotify Green', primary:RGB(30,215,96), alt:RGB(29,185,84) },
  midnight_purple: { id:'midnight_purple', name:'Midnight Purple', primary:RGB(139,92,246), alt:RGB(124,58,237) },
  sunset_amber: { id:'sunset_amber', name:'Sunset Amber', primary:RGB(245,158,11), alt:RGB(217,119,6) },
  cyberpunk_cyan: { id:'cyberpunk_cyan', name:'Cyberpunk Cyan', primary:RGB(6,182,212), alt:RGB(8,145,178) },
  monochrome_slate: { id:'monochrome_slate', name:'Monochrome Slate', primary:RGB(148,163,184), alt:RGB(100,116,139) },
  adaptive: { id:'adaptive', name:'Adaptive Album Glow', primary:null, alt:null }
};
var currentAccentKey = (typeof ACCENT_THEME!=='undefined') ? ACCENT_THEME : 'adaptive';

function applyAccentTheme(overrideColor){
  var t = ACCENT_THEMES[currentAccentKey] || ACCENT_THEMES.adaptive;
  if(t.primary){
    COL.green = t.primary;
    COL.greenC = t.alt;
  } else if(overrideColor){
    COL.green = overrideColor;
    COL.greenC = (typeof blend==='function') ? blend(overrideColor, COL.black, 0.15) : overrideColor;
  } else {
    COL.green = RGB(30, 215, 96);
    COL.greenC = RGB(29, 185, 84);
  }
}

function setAccentTheme(key){
  if(ACCENT_THEMES.hasOwnProperty(key)){
    currentAccentKey = key;
    try{ window.SetProperty('Theme: Accent colorway (spotify_green | midnight_purple | sunset_amber | cyberpunk_cyan | monochrome_slate | adaptive)', key); }catch(e){}
    applyAccentTheme();
    if(typeof updateNP==='function') updateNP();
    if(typeof repaintAll==='function') repaintAll();
  }
}
applyAccentTheme();

/* ------------------------- fonts (create once) -------------------------
   Every font is built here at load time from UISCALE, which core/props.js has already resolved
   from the panel property (or the display DPI). That is why props.js loads first, and why a
   scale change needs a panel reload rather than just a repaint.
   Regular (non-bold) text uses 'Segoe UI Semibold' so it doesn't read thin. */
function gf(name,sz,style){ return gdi.Font(name, Math.max(1,Math.round(sz*UISCALE)), style||0); }
function F(sz,bold){ return gf(bold?'Segoe UI':'Segoe UI Semibold', sz, bold?1:0); }
var FONT = {
  lib:F(15,1), pl:F(13,1), plSub:F(11,0),
  eyebrow:F(11,1), title:F(52,1), meta:F(13,0),
  rowTitle:F(14,0), rowArtist:F(12,0), rowNum:F(13,0), rowCell:F(13,0), head:F(12,1),
  tab:F(16,1), sect:F(15,1), qName:F(13,0), qArtist:F(11,0),
  npTitle:F(15,0), npArtist:F(12,0), time:F(12,0),
  icon:gf('Segoe MDL2 Assets',15), iconBtn:gf('Segoe MDL2 Assets',18),
  navIco:gf('Segoe MDL2 Assets',24), cap:gf('Segoe MDL2 Assets',10),
  menu:gf('Segoe UI',12), card:gf('Segoe UI',14,1), sect2:gf('Segoe UI',22,1),
  searchTxt:gf('Segoe UI Semibold',16,0),
  lyric:gf('Segoe UI',18,1), fsLyric:gf('Segoe UI',30,1),
  fsSrc:gf('Segoe UI Semibold',13,0),
  fsSrcName:gf('Segoe UI',13,1),   // bold: the playlist name, vs. the plain-weight fixed caption
  badge:gf('Segoe UI',9,1)         // bold: lossless & hi-res audio stream quality badge
};
function chr(c){ return String.fromCharCode(c); }
// MDL2 fallbacks for drawIcon when gdi.LoadSVG is unavailable (keys mirror ICONS), plus caption buttons
var GLYPH = {
  play:chr(0xE768), pause:chr(0xE769), prev:chr(0xE892), next:chr(0xE893),
  arrowLeft:chr(0xE72B), arrowRight:chr(0xE72A),
  heart:chr(0xEB51), heartFilled:chr(0xEB52),
  shuffle:chr(0xE8B1), repeat:chr(0xE8EE), repeat1:chr(0xE8ED), volume:chr(0xE767), volumeMute:chr(0xE74F),
  search:chr(0xE721), home:chr(0xE80F), add:chr(0xE710), more:chr(0xE712), clock:chr(0xE823),
  artist:chr(0xE77B), album:chr(0xE93C),
  check:chr(0xE73E),
  timer:chr(0xE916), moon:chr(0xE708), edit:chr(0xE70F), headphones:chr(0xE7F6), chart:chr(0xE9D2), curve:chr(0xE9D9), camera:chr(0xE722), sparkle:chr(0xEA3A),
  cmin:chr(0xE921), cmax:chr(0xE922), crestore:chr(0xE923), cclose:chr(0xE8BB),
  close:chr(0xE8BB)
};
var CH_DOT=chr(0xB7), CH_BULL=chr(0x2022);

/* ------------------------- DrawText flags ------------------------- */
var DT_L = 0x4|0x20|0x800|0x8000;        // left + vcenter + singleline + noprefix + end-ellipsis
var DT_R = 0x2|0x4|0x20|0x800;           // right + vcenter + singleline + noprefix
var DT_C = 0x1|0x4|0x20|0x800;           // center + vcenter + singleline + noprefix
/* Labels are singleline+vcenter, which CLIPS to the rect: call sites pass hardcoded box heights
   while fonts scale with UISCALE, so descenders get sliced off. fitV() grows a too-short box
   symmetrically to the line height (identity-cached per font). */
var LH_F=[], LH_V=[];
function lineH(gr,f){
  for(var i=0;i<LH_F.length;i++) if(LH_F[i]===f) return LH_V[i];
  var n=0; try{ n=Math.ceil(gr.CalcTextHeight('Ag',f)); }catch(e){ n=0; }
  LH_F.push(f); LH_V.push(n); return n;
}
var fitY=0, fitH=0;
function fitV(gr,f,y,h){ var n=lineH(gr,f); if(n>h){ fitY=y-((n-h)>>1); fitH=n; } else { fitY=y; fitH=h; } }
function tL(gr,s,f,c,x,y,w,h){ fitV(gr,f,y,h); gr.GdiDrawText(s,f,c,x,fitY,w,fitH,DT_L); }
function tR(gr,s,f,c,x,y,w,h){ fitV(gr,f,y,h); gr.GdiDrawText(s,f,c,x,fitY,w,fitH,DT_R); }
function tC(gr,s,f,c,x,y,w,h){ fitV(gr,f,y,h); gr.GdiDrawText(s,f,c,x,fitY,w,fitH,DT_C); }
function tCE(gr,s,f,c,x,y,w,h){ fitV(gr,f,y,h); gr.GdiDrawText(s,f,c,x,fitY,w,fitH,DT_C|0x8000); }   // centered, ellipsized

/* ------------------------- vector icons (SVG rasterized via gdi.LoadSVG, tinted + cached) ------------------------- */
var ICONS={
 play:"<path d='M8 5v14l11-7z'/>",
 pause:"<rect x='6' y='5' width='4' height='14' rx='1.3'/><rect x='14' y='5' width='4' height='14' rx='1.3'/>",
 prev:"<path d='M6 6h2.2v12H6zm3 6l9 6V6z'/>",
 next:"<path d='M15.8 6H18v12h-2.2zM6 18l9-6-9-6z'/>",
 arrowLeft:"<path d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'/>",
 arrowRight:"<path d='M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z'/>",
 heart:"<path d='M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z'/>",
 heartFilled:"<path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/>",
 shuffle:"<path d='M10.59 9.17 5.41 4 4 5.41l5.17 5.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04z'/>",
 repeat:"<path d='M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z'/>",
 repeat1:"<path d='M13 15V9h-1l-2 1v1h1.5v4zm4-8v3l4-4-4-4v3H5v6h2V7zm0 10H7v-3l-4 4 4 4v-3h12v-6h-2z'/>",
 volume:"<path d='M3 9v6h4l5 5V4L7 9zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'/>",
 volumeMute:"<path d='M3 9v6h4l5 5V4L7 9H3zm13.59 3l2.71-2.71-1.41-1.41-2.71 2.71-2.71-2.71-1.41 1.41 2.71 2.71-2.71 2.71 1.41 1.41 2.71-2.71 2.71 2.71 1.41-1.41-2.71-2.71z'/>",
 home:"<path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/>",
 search:"<path d='M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z'/>",
 add:"<path d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'/>",
 more:"<path d='M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'/>",
 clock:"<path d='M11.99 2A10 10 0 1 0 22 12 10 10 0 0 0 11.99 2zM12 20a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/>",
 expand:"<path d='M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z'/>",
 compress:"<path d='M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z'/>",
 mic:"<path d='M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z'/>",
 equalizer:"<path d='M10 20h4V4h-4zm-6 0h4v-8H4zm12-11v11h4V9z'/>",
 chevron:"<path d='M7 10l5 5 5-5z'/>",
 sortAsc:"<path d='M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z'/>",
 sortDesc:"<path d='M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.59-5.58L4 12l8 8 8-8z'/>",
 artist:"<path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/>",
 album:"<path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z'/>",
 close:"<path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/>",
 cloud:"<path d='M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z'/>",
 sync:"<path d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'/>",
 check:"<path d='M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z'/>",
 timer:"<path d='M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z'/>",
 moon:"<path d='M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 10.9-10.9A10.02 10.02 0 0 1 12.3 2z'/>",
 edit:"<path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/>",
 headphones:"<path d='M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z'/>",
 chart:"<path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z'/>",
 curve:"<path d='M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z'/>",
 camera:"<path d='M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z'/>",
 sparkle:"<path d='M12 2L9.5 7.5 4 10l5.5 2.5L12 18l2.5-5.5L20 10l-5.5-2.5z'/>"
};
var svgCache={};
// keyed on the numeric colour (alpha stripped -- drawIcon applies that at blit time), so a hit
// costs one concat instead of unpacking the channels into a string on every icon of every frame
function iconImg(name,size,col){
  var key=name+'|'+size+'|'+(col&0xffffff);
  if(svgCache.hasOwnProperty(key)) return svgCache[key];
  var rgb=((col>>16)&0xff)+','+((col>>8)&0xff)+','+(col&0xff);
  var xml="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='"+size+"' height='"+size+"'><g fill='rgb("+rgb+")'>"+ICONS[name]+"</g></svg>";
  var bmp=null; try{ bmp=gdi.LoadSVG(xml,size); }catch(e){ bmp=null; }
  svgCache[key]=bmp; return bmp;
}
// draw a crisp size-px vector icon centred in [x,y,w,h]; falls back to the MDL2 glyph if LoadSVG is unavailable
function drawIcon(gr,name,col,x,y,w,h,size){
  var s=size||Math.min(w,h), img=iconImg(name,s,col);
  if(img){ var a=(col>>>24)&0xff; if(!a) a=255; gr.DrawImage(img,Math.round(x+(w-s)/2),Math.round(y+(h-s)/2),s,s,0,0,img.Width,img.Height,0,a); return; }
  tC(gr,GLYPH[name]||'?',(s>=26?FONT.navIco:(s>=18?FONT.iconBtn:FONT.icon)),col,x,y,w,h);
}
