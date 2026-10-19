/* flacify/core/barcode.js -- vector barcode generator (EAN-13 & Code-128)
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- EAN-13 Encoding Tables ------------------------- */
var EAN_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];
var EAN_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
];
var EAN_R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];
var EAN_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLGLL',
  'LGGLGL', 'LGGLLG', 'LGLGLG', 'LGLGGL', 'LGGLGG'
];

/* Generate binary string of 95 modules for a 13-digit EAN */
function encodeEAN13(digits){
  if(digits.length===12){
    // compute check digit
    var sum=0, i;
    for(i=0;i<12;i++) sum+=parseInt(digits.charAt(i),10)*(i%2===0?1:3);
    var check=(10-(sum%10))%10;
    digits+=check;
  }
  if(digits.length!==13) return null;
  var d0=parseInt(digits.charAt(0),10);
  var parity=EAN_PARITY[d0]||'LLLLLL';
  var bits='101'; // start guard
  // left group (digits 1 to 6)
  for(var j=1;j<=6;j++){
    var d=parseInt(digits.charAt(j),10);
    var p=parity.charAt(j-1);
    bits+=(p==='G'?EAN_G[d]:EAN_L[d]);
  }
  bits+='01010'; // center guard
  // right group (digits 7 to 12)
  for(var k=7;k<=12;k++){
    var dr=parseInt(digits.charAt(k),10);
    bits+=EAN_R[dr];
  }
  bits+='101'; // end guard
  return {bits:bits, text:digits};
}

/* Fallback variable-length barcode pattern for non-13-digit codes */
function encodeFallbackBarcode(str){
  str=String(str).trim();
  if(!str.length) return null;
  var bits='1011', i, c, pat;
  for(i=0;i<str.length;i++){
    c=str.charCodeAt(i);
    // 7 bits per character
    pat=((c*2654435761)>>>0)&0x7f;
    pat|=0x41; // ensure edges
    for(var b=6;b>=0;b--) bits+=((pat>>b)&1)?'1':'0';
    bits+='0';
  }
  bits+='1101';
  return {bits:bits, text:str};
}

/* ------------------------- Draw Barcode ------------------------- */
/* Draws a crisp vector barcode and human-readable text label below it.
   Returns the bounding rect {x0, y0, x1, y1, w, h} */
function drawBarcode(gr, x, y, maxW, maxH, code, barCol, textCol){
  if(!code) return null;
  var clean=String(code).replace(/[^0-9A-Za-z]/g,'');
  if(!clean.length) return null;
  var enc=(/^\d{12,13}$/.test(clean))?encodeEAN13(clean):encodeFallbackBarcode(clean);
  if(!enc) enc=encodeFallbackBarcode(clean);
  if(!enc) return null;

  barCol=barCol||COL.text;
  textCol=textCol||COL.text2;

  var bits=enc.bits, numMods=bits.length;
  // compute module width (prefer 2px if it fits, else 1px)
  var modW=Math.max(1, Math.min(2, Math.floor(maxW/numMods)));
  var barW=numMods*modW;
  var textH=16;
  var barH=Math.max(26, maxH-textH-4);
  var startX=x + Math.max(0, Math.round((maxW-barW)/2));

  // crisp dark backing card to ensure high contrast against art or gradient
  var padX=8, padY=4;
  gr.FillRoundRect(startX-padX, y-padY, barW+padX*2, barH+textH+padY*2, 4, 4, RGBA(0,0,0,100));

  // render modules
  for(var i=0;i<numMods;i++){
    if(bits.charAt(i)==='1'){
      // guard bars extend 3px further down
      var isGuard=(i<3) || (i>=45 && i<50) || (i>=numMods-3);
      var curH=isGuard?barH:(barH-3);
      gr.FillSolidRect(startX+i*modW, y, modW, curH, barCol);
    }
  }

  // render formatted digit string centered beneath the bars
  var label=enc.text;
  if(label.length===13){
    // format as 1 234567 890128
    label=label.charAt(0)+' '+label.substring(1,7)+' '+label.substring(7);
  }
  tC(gr, label, FONT.meta, textCol, startX-10, y+barH+1, barW+20, textH);

  return {x0:startX, y0:y, x1:startX+barW, y1:y+barH+textH+2, w:barW, h:barH+textH+2};
}
