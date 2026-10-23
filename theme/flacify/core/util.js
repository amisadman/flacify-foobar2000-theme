/* flacify/core/util.js -- small pure helpers with no foobar or paint state
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- helpers ------------------------- */
function hash(s){ s=String(s); var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h>>>0; }
function coverCol(seed){ return PALETTE[hash(seed)%PALETTE.length]; }
function blend(c1,c2,t){ var r=(c1>>16)&255,g=(c1>>8)&255,b=c1&255,r2=(c2>>16)&255,g2=(c2>>8)&255,b2=c2&255; return RGB(Math.round(r+(r2-r)*t),Math.round(g+(g2-g)*t),Math.round(b+(b2-b)*t)); }
function fmtTime(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
function inRect(x,y,r){ return x>=r.x0 && x<r.x1 && y>=r.y0 && y<r.y1; }
function cxOf(x,w,cw){ return x+Math.round((w-cw)/2); }   // x that centres a cw-wide thing inside [x,w]
function clamp01(v){ return isNaN(v)?0:(v<0?0:(v>1?1:v)); }
function clampPx(v,max){ return isNaN(v)?0:(v<0?0:(v>max?max:v)); }
function hitIdx(list,x,y){ for(var i=0;i<list.length;i++) if(inRect(x,y,list[i])) return i; return -1; }
function hit(list,x,y){ var i=hitIdx(list,x,y); return i<0?null:list[i]; }
function labelOf(list,v,dflt){ for(var i=0;i<list.length;i++) if(list[i][1]===v) return list[i][0]; return dflt; }
function playingLoc(){ return plman.GetPlayingItemLocation?plman.GetPlayingItemLocation():null; }

function fmtNum(n){ n=String(n); var out='', c=0; for(var i=n.length-1;i>=0;i--){ out=n.charAt(i)+out; if(++c%3===0 && i>0) out=','+out; } return out; }

// "1 hr 23 min" / "42 min" / "38 sec" style duration
function fmtDur(s){
  s=Math.max(0,Math.round(s)); var h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
  if(h>0) return h+' hr '+m+' min';
  if(m>0) return m+' min';
  return s+' sec';
}

/* ------------------------- color & ambient aura helpers ------------------------- */
function rgbToHsl(r, g, b){
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h = 0, s = 0, l = (max + min) / 2;
  if(max !== min){
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max){
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l){
  var r, g, b;
  if(s === 0){
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return RGB(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function clampPaletteColor(c, minL, maxL, minS){
  minL = (minL !== undefined) ? minL : 0.14;
  maxL = (maxL !== undefined) ? maxL : 0.32;
  minS = (minS !== undefined) ? minS : 0.35;
  var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  var hsl = rgbToHsl(r, g, b);
  var h = hsl[0], s = Math.max(minS, hsl[1]), l = Math.max(minL, Math.min(maxL, hsl[2]));
  return hslToRgb(h, s, l);
}

function vibrantAccentColor(c){
  var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  var hsl = rgbToHsl(r, g, b);
  var h = hsl[0], s = Math.max(0.65, hsl[1]), l = Math.max(0.42, Math.min(0.55, hsl[2]));
  return hslToRgb(h, s, l);
}

function drawArtworkAura(gr, x, y, sz, rad, col){
  if(!col) col = RGBA(30, 215, 96, 60);
  var r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
  var outPad = Math.max(6, Math.round(sz * 0.05));
  gr.FillRoundRect(x - outPad, y - outPad + 2, sz + outPad * 2, sz + outPad * 2, rad + 8, rad + 8, RGBA(r, g, b, 50));
  var inPad = Math.max(2, Math.round(sz * 0.02));
  gr.FillRoundRect(x - inPad, y - inPad + 1, sz + inPad * 2, sz + inPad * 2, rad + 4, rad + 4, RGBA(r, g, b, 85));
  gr.FillRoundRect(x + 2, y + 4, sz, sz, rad, rad, RGBA(0, 0, 0, 160));
}
