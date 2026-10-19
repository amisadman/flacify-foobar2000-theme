/* flacify/views/history.js -- Listening History full-page view
   Displays chronologically played tracks with relative timestamps, play indicators, heart toggle, and one-click replay. */

var historyScroll = 0, historyScrollT = 0, HISTORY_MAXPX = 0;
var HB_HISTORY_CLEAR = null;

function drawHistory(gr, r){
  var x0 = r.x + M.cpad, w = r.w - M.cpad * 2;
  var items = getHistoryList();
  var count = items ? items.length : 0;

  // Header background gradient (deep indigo to dark base)
  gr.FillGradRect(r.x, r.y, r.w, M.headH, 90, blend(RGB(40, 60, 110), COL.base, 0.45), COL.base, 1.0);

  // Eyebrow & Title
  var tx = x0, ty = r.y + 44;
  tL(gr, 'YOUR ACTIVITY', FONT.eyebrow, COL.text2, tx, ty, w, 18);
  tL(gr, 'Listening History', FONT.title, COL.text, tx, ty + 24, w - 160, 72);

  // Subtitle & Clear Button
  var subY = ty + 104;
  tL(gr, count + ' tracks played', FONT.meta, COL.text2, tx, subY + 6, 260, 22);

  HB_HISTORY_CLEAR = null;
  if(count > 0){
    var clW = 120, clH = 32, clX = r.x + r.w - M.cpad - clW, clY = subY;
    var clHot = hv(clX, clY, clX + clW, clY + clH);
    gr.FillRoundRect(clX, clY, clW, clH, clH / 2, clH / 2, clHot ? RGBA(255, 255, 255, 24) : RGBA(255, 255, 255, 10));
    gr.DrawRoundRect(clX, clY, clW, clH, clH / 2, clH / 2, 1, clHot ? RGBA(255, 255, 255, 120) : RGBA(255, 255, 255, 40));
    gr.GdiDrawText('Clear history', FONT.plSub, clHot ? COL.white : COL.text2, clX, clY, clW, clH, DT_C);
    HB_HISTORY_CLEAR = { x0: clX, y0: clY, x1: clX + clW, y1: clY + clH };
  }

  // Track list geometry
  var lx = x0, rx = r.x + r.w - M.cpad;
  var listTop = r.y + M.headH + 8;
  var numW = 32, durW = 54, heartW = 28, timeW = 96, cgap = 14;
  var availW = rx - lx - numW - durW - heartW - timeW - cgap * 5;
  var albumW = Math.round(availW * 0.32);
  var titleW = availW - albumW;

  var titleX = lx + numW + cgap;
  var albumX = titleX + titleW + cgap;
  var timeX = albumX + albumW + cgap;
  var heartX = timeX + timeW + cgap;

  var rowsTop = listTop + 34, rh = M.rowH, cropY = r.y + r.h, viewH = cropY - rowsTop;
  var contentH = count * rh;
  var maxPx = Math.max(0, contentH - viewH);
  HISTORY_MAXPX = maxPx;

  historyScroll = clampPx(historyScroll, maxPx);
  historyScrollT = clampPx(historyScrollT, maxPx);

  if(count === 0){
    gr.FillSolidRect(r.x, rowsTop - rh, r.w, rh, COL.base);
    var empY = rowsTop + 60;
    drawIcon(gr, 'clock', COL.text3, r.x + Math.round(r.w / 2) - 32, empY, 64, 64, 48);
    tC(gr, 'No listening history yet', FONT.sect, COL.text, r.x, empY + 76, r.w, 28);
    tC(gr, 'Songs you listen to will show up here chronologically with replay stats.', FONT.plSub, COL.text2, r.x, empY + 108, r.w, 20);
    return;
  }

  for(var d = Math.floor(historyScroll / rh); d < count; d++){
    var ry = rowsTop + d * rh - historyScroll;
    if(ry >= cropY) break;

    var it = items[d];
    if(!it) continue;

    var isPlaying = (NP && NP.Path === it.path);
    var isHover = hv(lx - 8, ry, rx + 8, ry + rh);

    if(isHover) gr.FillRoundRect(lx - 8, ry, rx - lx + 16, rh, 4, 4, COL.rowHover);

    var titleCol = isPlaying ? COL.green : COL.text;

    // Track number or Play button on hover
    if(isHover){
      drawIcon(gr, 'play', COL.text, lx, ry, numW, rh, 14);
    } else {
      tL(gr, String(d + 1), FONT.rowNum, isPlaying ? COL.green : COL.white, lx, ry, numW, rh);
    }

    // Cover art
    var cs = 40, cy = ry + (rh - cs) / 2;
    var h = it.handle || (typeof getHandleByPath === 'function' ? getHandleByPath(it.path) : null);
    if(h && !it.handle) it.handle = h;
    drawRounded(gr, titleX, cy, cs, 3, h, it.album || it.title);

    // Title & Artist
    var ttx = titleX + cs + 12, ttw = titleW - cs - 12;
    tL(gr, it.title, FONT.rowTitle, titleCol, ttx, ry + 8, ttw, 20);
    tL(gr, it.artist, FONT.rowArtist, COL.text2, ttx, ry + 30, ttw, 16);

    // Album
    tL(gr, it.album || '-', FONT.rowCell, COL.text2, albumX, ry, albumW, rh);

    // Relative timestamp ("Just now", "15m ago", "Yesterday")
    tL(gr, fmtRelativeTime(it.time), FONT.rowCell, COL.text3, timeX, ry, timeW, rh);

    // Heart icon
    var lk = false;
    if(it.path && likedSet[it.path]) lk = true;
    if(isHover || lk){
      var hCol = lk ? COL.green : (hv(heartX - 4, ry + (rh - 18) / 2 - 2, heartX + 22, ry + (rh - 18) / 2 + 20) ? COL.text : COL.text2);
      drawIcon(gr, lk ? 'heartFilled' : 'heart', hCol, heartX, ry + (rh - 18) / 2, 18, 18, 15);
    }

    // Duration
    tR(gr, it.dur || '--:--', FONT.rowCell, isPlaying ? COL.green : COL.white, rx - durW, ry, durW, rh);

    HB_TR.push({
      x0: lx - 8,
      y0: ry,
      x1: rx + 8,
      y1: ry + rh,
      historyRow: true,
      path: it.path,
      idx: d,
      pgx0: lx,
      pgx1: lx + numW,
      hx0: heartX - 6,
      hx1: heartX + 24
    });
  }

  // Crop partial rows top & bottom, sticky header
  gr.FillSolidRect(r.x, rowsTop - rh, r.w, rh, COL.base);
  gr.FillSolidRect(r.x, cropY, r.w, M.pad + 2, COL.black);

  tL(gr, '#', FONT.head, COL.text2, lx, listTop, numW, 20);
  tL(gr, 'TITLE', FONT.head, COL.text2, titleX, listTop, titleW, 20);
  tL(gr, 'ALBUM', FONT.head, COL.text2, albumX, listTop, albumW, 20);
  tL(gr, 'PLAYED', FONT.head, COL.text2, timeX, listTop, timeW, 20);
  drawIcon(gr, 'clock', COL.text2, rx - 16, listTop, 16, 20, 15);

  gr.DrawLine(lx, listTop + 26, rx, listTop + 26, 1, COL.line);
  drawScrollbar(gr, rx + 8, rowsTop, viewH, historyScroll, maxPx, viewH, contentH, hv(r.x, r.y, r.x + r.w, cropY) || drag === 'scroll');
}
