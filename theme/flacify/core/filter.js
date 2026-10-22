/* flacify/core/filter.js -- In-place quick tracklist filter (Ctrl+F)
   Part of FLACify. Loaded by main.js. */

var inlineFilterOpen = false;
var inlineFilterText = '';
var HB_INLINE_FILTER = null;
var HB_FILTER_BTN = null;

function toggleInlineFilter(){
  if(inlineFilterOpen){
    closeInlineFilter();
  } else {
    openInlineFilter();
  }
}

function openInlineFilter(){
  inlineFilterOpen = true;
  inlineFilterText = '';
  caretOn = true;
  startCaret();
  applyKeyMode();
  repaintAll();
}

function closeInlineFilter(){
  inlineFilterOpen = false;
  inlineFilterText = '';
  HB_INLINE_FILTER = null;
  stopCaret();
  applyKeyMode();
  repaintAll();
}

function clearInlineFilter(){
  inlineFilterText = '';
  repaintAll();
}

function drawInlineFilterBar(gr, x, y, w, h, matchCount, totalCount){
  HB_INLINE_FILTER = {};
  var isHot = hv(x, y, x + w, y + h);

  // Background capsule
  gr.FillRoundRect(x, y, w, h, 6, 6, RGB(32, 32, 32));
  strokeRound(gr, x, y, w, h, 6, 1, inlineFilterOpen ? COL.green : (isHot ? RGBA(255, 255, 255, 60) : RGBA(255, 255, 255, 25)));
  HB_INLINE_FILTER.box = {x0: x, y0: y, x1: x + w, y1: y + h};

  // Search icon
  drawIcon(gr, 'search', inlineFilterOpen ? COL.green : COL.text2, x + 10, y + Math.round((h - 16) / 2), 16, 16, 15);

  // Close / Clear button
  var cbSz = 24;
  var cbX = x + w - cbSz - 6;
  var cbY = y + Math.round((h - cbSz) / 2);
  var cbHot = hv(cbX, cbY, cbX + cbSz, cbY + cbSz);
  if(cbHot) gr.FillEllipse(cbX, cbY, cbSz, cbSz, RGBA(255, 255, 255, 20));
  drawIcon(gr, 'close', cbHot ? COL.white : COL.text2, cbX + 4, cbY + 4, 16, 16, 13);
  HB_INLINE_FILTER.close = {x0: cbX, y0: cbY, x1: cbX + cbSz, y1: cbY + cbSz};

  // Stats badge on the right (before close button)
  var countStr = '';
  if(totalCount !== undefined && totalCount > 0){
    if(inlineFilterText.length > 0){
      countStr = matchCount + ' of ' + totalCount + ' tracks';
    } else {
      countStr = totalCount + ' tracks';
    }
  }
  var cW = countStr ? (Math.round(gr.CalcTextWidth(countStr, FONT.plSub)) + 16) : 0;
  if(cW > 0){
    var cX = cbX - cW - 8;
    tL(gr, countStr, FONT.plSub, COL.text3, cX, y, cW, h);
  }

  // Text / Placeholder
  var tx = x + 34;
  var tw = (cW > 0 ? (cbX - cW - 16) : (cbX - 8)) - tx;
  if(tw < 40) tw = 40;

  var displayTxt = inlineFilterText;
  if(!displayTxt && !inlineFilterOpen){
    displayTxt = 'Quick filter tracks... (Ctrl+F)';
    tL(gr, displayTxt, FONT.pl, COL.text3, tx, y, tw, h);
  } else if(!displayTxt && inlineFilterOpen){
    tL(gr, 'Type to filter tracks...', FONT.pl, COL.text3, tx, y, tw, h);
  } else {
    tL(gr, displayTxt, FONT.pl, COL.text, tx, y, tw, h);
  }

  // Blinking Caret
  if(inlineFilterOpen && caretOn){
    var txtW = Math.round(gr.CalcTextWidth(inlineFilterText, FONT.pl));
    var caretX = tx + Math.min(tw - 2, txtW);
    var caretH = 18;
    var caretY = y + Math.round((h - caretH) / 2);
    gr.FillSolidRect(caretX, caretY, 2, caretH, COL.green);
  }
}

function drawFilterButton(gr, x, y, sz){
  var isActive = inlineFilterOpen || (inlineFilterText.length > 0);
  var isHot = hv(x, y, x + sz, y + sz);
  if(isActive){
    gr.FillRoundRect(x, y, sz, sz, sz / 2, sz / 2, RGBA(30, 215, 96, 30));
    strokeRound(gr, x, y, sz, sz, sz / 2, 1, COL.green);
    drawIcon(gr, 'search', COL.green, x, y, sz, sz, 17);
  } else {
    if(isHot) gr.FillRoundRect(x, y, sz, sz, sz / 2, sz / 2, RGBA(255, 255, 255, 18));
    strokeRound(gr, x, y, sz, sz, sz / 2, 1, isHot ? COL.white : RGBA(255, 255, 255, 30));
    drawIcon(gr, 'search', isHot ? COL.white : COL.text2, x, y, sz, sz, 17);
  }
  HB_FILTER_BTN = {x0: x, y0: y, x1: x + sz, y1: y + sz};
}
