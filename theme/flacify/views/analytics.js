/* flacify/views/analytics.js -- FLACify Wrapped & Personal Listening Analytics
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var ANALYTICS_SCROLL = 0, ANALYTICS_SCROLL_T = 0, ANALYTICS_MAX_SCROLL = 0;
var HB_ANALYTICS_EXPORT = null;
var HB_PODIUM = [];
var analyticsToastMsg = '';
var analyticsToastTimer = 0;

function showAnalyticsToast(msg){
  analyticsToastMsg = msg;
  analyticsToastTimer = Date.now() + 4000;
  repaintMain();
}

/* ------------------------- 1080x1920 Story Exporter ------------------------- */
function exportWrappedCard(){
  try {
    var summary = (typeof getAnalyticsSummary === 'function') ? getAnalyticsSummary(true) : null;
    if(!summary) return;

    var W = 1080, H = 1920;
    var bmp = gdi.CreateImage(W, H);
    var gr = bmp.GetGraphics();
    gr.SetSmoothingMode(2);

    // Dark sleek background with ambient glow
    gr.FillSolidRect(0, 0, W, H, RGB(14, 14, 16));
    gr.FillGradRect(0, 0, W, 600, 90, RGBA(30, 215, 96, 45), RGBA(14, 14, 16, 0));
    gr.FillGradRect(0, H - 400, W, 400, 90, RGBA(14, 14, 16, 0), RGBA(139, 92, 246, 35));

    // Fonts for 1080x1920 poster
    var fTitle = gdi.Font('Segoe UI Black', 54, 1);
    var fSub = gdi.Font('Segoe UI Semibold', 26, 0);
    var fSect = gdi.Font('Segoe UI Bold', 34, 1);
    var fStat = gdi.Font('Segoe UI Black', 64, 1);
    var fLabel = gdi.Font('Segoe UI', 22, 0);
    var fRank = gdi.Font('Segoe UI Black', 28, 1);
    var fItem = gdi.Font('Segoe UI Semibold', 26, 0);

    // Top Header
    tL(gr, 'FLACIFY WRAPPED', fTitle, RGB(30, 215, 96), 80, 90, 700, 70);
    tL(gr, 'Personal Lossless Listening Telemetry', fSub, RGB(160, 160, 170), 80, 165, 700, 40);

    // Pill badge
    gr.FillRoundRect(W - 260, 100, 180, 48, 24, 24, RGBA(255, 255, 255, 18));
    tC(gr, 'AUDIOPHILE', gdi.Font('Segoe UI Bold', 18, 1), RGB(245, 158, 11), W - 260, 100, 180, 48);

    // 3 Big Stats
    var statY = 260, boxW = 280, gap = 40, startX = 80;
    // Box 1: Hours
    gr.FillRoundRect(startX, statY, boxW, 160, 16, 16, RGB(26, 26, 30));
    tL(gr, summary.totalHours, fStat, RGB(255, 255, 255), startX + 24, statY + 20, boxW - 48, 70);
    tL(gr, 'HOURS STREAMED', fLabel, RGB(140, 140, 150), startX + 24, statY + 100, boxW - 48, 30);

    // Box 2: Tracks
    gr.FillRoundRect(startX + boxW + gap, statY, boxW, 160, 16, 16, RGB(26, 26, 30));
    tL(gr, '' + summary.totalTracks, fStat, RGB(30, 215, 96), startX + boxW + gap + 24, statY + 20, boxW - 48, 70);
    tL(gr, 'TRACKS PLAYED', fLabel, RGB(140, 140, 150), startX + boxW + gap + 24, statY + 100, boxW - 48, 30);

    // Box 3: Lossless %
    gr.FillRoundRect(startX + (boxW + gap) * 2, statY, boxW, 160, 16, 16, RGB(26, 26, 30));
    var losslessTotalPct = (summary.fidelity.hiresPct + summary.fidelity.cdPct);
    tL(gr, losslessTotalPct + '%', fStat, RGB(139, 92, 246), startX + (boxW + gap) * 2 + 24, statY + 20, boxW - 48, 70);
    tL(gr, 'LOSSLESS PURITY', fLabel, RGB(140, 140, 150), startX + (boxW + gap) * 2 + 24, statY + 100, boxW - 48, 30);

    // Top Artists Section
    var artY = 480;
    tL(gr, 'Top Artists', fSect, RGB(255, 255, 255), startX, artY, 500, 45);
    var artListY = artY + 60;
    for(var ai = 0; ai < summary.topArtists.length && ai < 5; ai++){
      var a = summary.topArtists[ai];
      var ay = artListY + ai * 76;
      gr.FillRoundRect(startX, ay, W - startX * 2, 64, 12, 12, RGB(22, 22, 26));

      var rankCol = (ai === 0) ? RGB(245, 158, 11) : ((ai === 1) ? RGB(160, 160, 175) : ((ai === 2) ? RGB(180, 83, 9) : RGB(100, 100, 110)));
      tC(gr, '#' + (ai + 1), fRank, rankCol, startX + 16, ay + 14, 50, 36);
      tL(gr, a.name, fItem, RGB(255, 255, 255), startX + 80, ay + 16, 500, 36);
      tR(gr, a.plays + ' plays', fLabel, RGB(140, 140, 150), startX + 80, ay + 18, W - startX * 2 - 110, 30);
    }

    // Top Albums Section
    var albY = 940;
    tL(gr, 'Top Albums', fSect, RGB(255, 255, 255), startX, albY, 500, 45);
    var albListY = albY + 60;
    for(var bi = 0; bi < summary.topAlbums.length && bi < 5; bi++){
      var b = summary.topAlbums[bi];
      var by = albListY + bi * 76;
      gr.FillRoundRect(startX, by, W - startX * 2, 64, 12, 12, RGB(22, 22, 26));

      var bRankCol = (bi === 0) ? RGB(245, 158, 11) : ((bi === 1) ? RGB(160, 160, 175) : ((bi === 2) ? RGB(180, 83, 9) : RGB(100, 100, 110)));
      tC(gr, '#' + (bi + 1), fRank, bRankCol, startX + 16, by + 14, 50, 36);
      tL(gr, b.title, fItem, RGB(255, 255, 255), startX + 80, by + 16, 500, 36);
      tR(gr, b.plays + ' plays', fLabel, RGB(140, 140, 150), startX + 80, by + 18, W - startX * 2 - 110, 30);
    }

    // Audiophile Fidelity Breakdown Section
    var fidY = 1400;
    tL(gr, 'Lossless Fidelity Distribution', fSect, RGB(255, 255, 255), startX, fidY, 600, 45);

    // Fidelity Bar
    var barY = fidY + 70, barW = W - startX * 2, barH = 36;
    gr.FillRoundRect(startX, barY, barW, barH, 8, 8, RGB(35, 35, 40));
    var hiresW = Math.round(barW * (summary.fidelity.hiresPct / 100));
    var cdW = Math.round(barW * (summary.fidelity.cdPct / 100));
    if(hiresW > 0) gr.FillRoundRect(startX, barY, hiresW, barH, 8, 8, RGB(139, 92, 246));
    if(cdW > 0) gr.FillSolidRect(startX + hiresW, barY, cdW, barH, RGB(16, 185, 129));

    // Legend
    var legY = barY + 54;
    gr.FillEllipse(startX, legY + 6, 16, 16, RGB(139, 92, 246));
    tL(gr, 'Studio Master Hi-Res (' + summary.fidelity.hiresPct + '%)', fLabel, RGB(220, 220, 230), startX + 26, legY, 300, 30);

    gr.FillEllipse(startX + 340, legY + 6, 16, 16, RGB(16, 185, 129));
    tL(gr, 'CD Lossless (' + summary.fidelity.cdPct + '%)', fLabel, RGB(220, 220, 230), startX + 366, legY, 260, 30);

    gr.FillEllipse(startX + 640, legY + 6, 16, 16, RGB(100, 116, 139));
    tL(gr, 'Lossy (' + summary.fidelity.lossyPct + '%)', fLabel, RGB(220, 220, 230), startX + 666, legY, 200, 30);

    // Footer
    var footY = H - 140;
    gr.DrawLine(startX, footY, W - startX, footY, 1, RGB(40, 40, 45));
    tL(gr, 'FLACify for foobar2000 - Pure Bit-Perfect Audio', fLabel, RGB(120, 120, 130), startX, footY + 30, 600, 30);
    tR(gr, 'Bit-Perfect Lossless Playback', fLabel, RGB(16, 185, 129), startX, footY + 30, W - startX * 2, 30);

    bmp.ReleaseGraphics(gr);

    // Save image to Pictures via SaveAs (official GdiBitmap API)
    var picsDir = '';
    try {
      var shell = new ActiveXObject('WScript.Shell');
      picsDir = shell.SpecialFolders('MyPictures');
    } catch(e){}
    if(!picsDir) picsDir = fb.ProfilePath + 'flacify';

    var ts = Date.now();
    var outPath = picsDir + '\\FLACify_Wrapped_' + ts + '.png';
    bmp.SaveAs(outPath, 'image/png');

    showAnalyticsToast('Wrapped Story card exported to Pictures!');
  } catch(e){
    showAnalyticsToast('Export failed: ' + e);
  }
}

/* ------------------------- UI Rendering ------------------------- */
function drawAnalytics(gr, r){
  HB_PODIUM = [];
  HB_ANALYTICS_EXPORT = null;

  var summary = (typeof getAnalyticsSummary === 'function') ? getAnalyticsSummary() : null;
  if(!summary){
    tC(gr, 'Loading listening analytics...', FONT.sect2, COL.text2, r.x, r.y + 100, r.w, 40);
    return;
  }

  var pad = M.cpad, x0 = r.x + pad, w = r.w - pad * 2, rightEdge = r.x + r.w;

  // Background Ambient Tint Glow
  var homeGlow = (typeof getSmoothAmbientRGB==='function') ? getSmoothAmbientRGB() : COL.base;
  gr.FillGradRect(r.x, r.y, r.w, Math.min(340, Math.round(r.h * 0.5)), 90, blend(homeGlow, COL.base, 0.40), COL.base, 1.0);

  // Top Sticky / Pinned Header: Title & Export Button
  var headerY = r.y + 16, headerH = 64;
  tL(gr, 'FLACify Wrapped & Personal Analytics', FONT.sect, COL.text, x0, headerY, w - 240, 36);
  tL(gr, '100% offline listening telemetry, dynamic range scoring & habits', FONT.plSub, COL.text2, x0, headerY + 36, w - 240, 20);

  // Export Button
  var ebW = 200, ebH = 40, ebX = rightEdge - pad - ebW, ebY = headerY + 6;
  var ebHov = hv(ebX, ebY, ebX + ebW, ebY + ebH);
  gr.FillRoundRect(ebX, ebY, ebW, ebH, 20, 20, ebHov ? COL.green : RGBA(255, 255, 255, 18));
  drawIcon(gr, 'camera', ebHov ? COL.black : COL.text, ebX + 16, ebY + 10, 20, 20, 18);
  tL(gr, 'Export Story Card', FONT.card, ebHov ? COL.black : COL.text, ebX + 44, ebY + 10, ebW - 50, 20);
  HB_ANALYTICS_EXPORT = { x0: ebX, y0: ebY, x1: ebX + ebW, y1: ebY + ebH };

  // Scrollable Body
  var gy = headerY + headerH + 16, cropY = r.y + r.h, viewH = cropY - gy;

  // Layout Calculations
  var statTileH = 80;
  var heatmapH = 180;
  var podiumH = 250;
  var contentH = statTileH + heatmapH + podiumH + 120;
  var maxPx = Math.max(0, contentH - viewH);
  ANALYTICS_MAX_SCROLL = maxPx;
  ANALYTICS_SCROLL = clampPx(ANALYTICS_SCROLL, maxPx);
  ANALYTICS_SCROLL_T = clampPx(ANALYTICS_SCROLL_T, maxPx);

  var cy = gy - ANALYTICS_SCROLL;

  // ---- 1) 4 Stat Highlight Tiles ----
  var tileGap = 16;
  var tileCols = Math.min(4, Math.max(2, Math.floor((w + tileGap) / 220)));
  var tileW = Math.floor((w - tileGap * (tileCols - 1)) / tileCols);

  var tiles = [
    { label: 'HOURS STREAMED', val: summary.totalHours + ' hrs', sub: summary.totalTracks + ' tracks played', icon: 'clock', col: COL.green },
    { label: 'ARTISTS DISCOVERED', val: '' + summary.uniqueArtists, sub: 'in local library', icon: 'artist', col: RGB(6, 182, 212) },
    { label: 'LOSSLESS PURITY', val: (summary.fidelity.hiresPct + summary.fidelity.cdPct) + '%', sub: summary.fidelity.hiresPct + '% Studio Master', icon: 'sparkle', col: RGB(139, 92, 246) },
    { label: 'HI-RES AUDIO SHARE', val: summary.fidelity.hiresPct + '%', sub: summary.fidelity.hiresCount + ' studio master tracks', icon: 'sparkle', col: RGB(245, 158, 11) }
  ];

  for(var ti = 0; ti < tileCols && ti < tiles.length; ti++){
    var tx = x0 + ti * (tileW + tileGap), ty = cy;
    if(ty + statTileH > gy && ty < cropY){
      var tHov = hv(tx, ty, tx + tileW, ty + statTileH);
      gr.FillRoundRect(tx, ty, tileW, statTileH, 8, 8, tHov ? COL.rowHover : COL.elev);
      drawIcon(gr, tiles[ti].icon, tiles[ti].col, tx + 14, ty + 16, 24, 24, 20);
      tL(gr, tiles[ti].label, FONT.eyebrow, COL.text3, tx + 48, ty + 14, tileW - 60, 16);
      tL(gr, tiles[ti].val, FONT.sect2, COL.text, tx + 48, ty + 30, tileW - 60, 24);
      tL(gr, tiles[ti].sub, FONT.plSub, COL.text2, tx + 48, ty + 54, tileW - 60, 16);
    }
  }
  cy += statTileH + 28;

  // ---- 2) 52-Week Activity Heatmap (GitHub Calendar Style) ----
  if(cy + heatmapH > gy && cy < cropY){
    tL(gr, '52-Week Listening Heatmap', FONT.sect2, COL.text, x0, cy, w, 26);
    var hBoxY = cy + 32;
    var sq = 12, sqGap = 3, hmStartX = x0 + 36;
    var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day labels
    for(var di = 0; di < 7; di++){
      if(di === 1 || di === 3 || di === 5){
        tL(gr, dayLabels[di], FONT.eyebrow, COL.text3, x0, hBoxY + di * (sq + sqGap), 30, sq);
      }
    }

    var hoveredDay = null;
    for(var hi = 0; hi < summary.heatmap.length; hi++){
      var hm = summary.heatmap[hi];
      var cellX = hmStartX + hm.col * (sq + sqGap);
      var cellY = hBoxY + hm.row * (sq + sqGap);

      var cellCol = RGB(26, 26, 30);
      if(hm.level === 1) cellCol = RGB(14, 68, 41);
      else if(hm.level === 2) cellCol = RGB(0, 109, 50);
      else if(hm.level === 3) cellCol = RGB(38, 166, 65);
      else if(hm.level === 4) cellCol = RGB(57, 211, 83);

      var isCellHov = hv(cellX, cellY, cellX + sq, cellY + sq);
      if(isCellHov && !hm.isFuture){
        hoveredDay = hm;
        cellCol = COL.text;
      }

      gr.FillRoundRect(cellX, cellY, sq, sq, 2, 2, cellCol);
    }

    // Legend & Tooltip
    var legY = hBoxY + 7 * (sq + sqGap) + 8;
    if(hoveredDay){
      var tooltip = hoveredDay.dateStr + ': ' + hoveredDay.count + ' tracks (' + Math.round(hoveredDay.seconds / 60) + ' mins)';
      tL(gr, tooltip, FONT.pl, COL.green, x0, legY, w - 200, 20);
    } else {
      tL(gr, 'Activity measured in daily tracks played', FONT.plSub, COL.text3, x0, legY, w - 200, 20);
    }

    // Color bar
    var legStartX = rightEdge - pad - 120;
    tL(gr, 'Less', FONT.eyebrow, COL.text3, legStartX - 32, legY, 30, sq);
    var legColors = [RGB(26, 26, 30), RGB(14, 68, 41), RGB(0, 109, 50), RGB(38, 166, 65), RGB(57, 211, 83)];
    for(var lci = 0; lci < 5; lci++){
      gr.FillRoundRect(legStartX + lci * (sq + sqGap), legY + 2, sq, sq, 2, 2, legColors[lci]);
    }
    tL(gr, 'More', FONT.eyebrow, COL.text3, legStartX + 5 * (sq + sqGap) + 4, legY, 30, sq);
  }
  cy += heatmapH + 20;

  // ---- 3) Top Artists Podium & Lossless Fidelity Spectrum (Side by Side) ----
  var halfW = Math.floor((w - 24) / 2);

  // Left Column: Top 3 Artists Podium
  if(cy + podiumH > gy && cy < cropY){
    var podX = x0, podY = cy;
    tL(gr, 'Top Artists Podium', FONT.sect2, COL.text, podX, podY, halfW, 26);

    var arts3 = summary.topArtists.slice(0, 3);
    var basePodiumY = podY + podiumH - 24;
    var podStepW = Math.floor(halfW / 3) - 8;

    // Center (#1 Gold), Left (#2 Silver), Right (#3 Bronze)
    var podSlots = [
      { rank: 2, art: arts3[1], h: 74, col: RGB(160, 160, 175), label: '#2 Silver', colIdx: 0 },
      { rank: 1, art: arts3[0], h: 110, col: RGB(245, 158, 11), label: '#1 Gold', colIdx: 1 },
      { rank: 3, art: arts3[2], h: 54, col: RGB(180, 83, 9), label: '#3 Bronze', colIdx: 2 }
    ];

    for(var psi = 0; psi < podSlots.length; psi++){
      var slot = podSlots[psi];
      var sx = podX + slot.colIdx * (podStepW + 8);
      var sy = basePodiumY - slot.h;

      // Podium Block
      var slotHov = hv(sx, sy - 50, sx + podStepW, basePodiumY);
      gr.FillRoundRect(sx, sy, podStepW, slot.h, 6, 6, slotHov ? COL.rowHover : COL.elev);
      gr.FillSolidRect(sx, sy, podStepW, 4, slot.col);
      tC(gr, slot.label, FONT.tab, slot.col, sx, sy + 8, podStepW, 20);

      if(slot.art){
        tC(gr, slot.art.plays + ' plays', FONT.eyebrow, COL.text2, sx, sy + 32, podStepW, 16);
        // Artist portrait circle above podium
        var aCirS = 46, aCirX = sx + Math.floor((podStepW - aCirS) / 2), aCirY = sy - aCirS - 10;
        var ah = slot.art.handle || (typeof artistCover === 'function' ? artistCover(slot.art.name) : null);
        drawCircle(gr, aCirX, aCirY, aCirS, ah, slot.art.name);
        tC(gr, slot.art.name, FONT.card, slotHov ? COL.green : COL.text, sx, sy - 10, podStepW, 20);

        HB_PODIUM.push({ x0: sx, y0: sy - aCirS - 10, x1: sx + podStepW, y1: basePodiumY, artist: slot.art.name });
      } else {
        tC(gr, '---', FONT.plSub, COL.text3, sx, sy - 20, podStepW, 20);
      }
    }
  }

  // Right Column: Lossless Fidelity Spectrum
  if(cy + podiumH > gy && cy < cropY){
    var pieX = x0 + halfW + 24, pieY = cy;
    tL(gr, 'Lossless Fidelity Spectrum', FONT.sect2, COL.text, pieX, pieY, halfW, 26);

    var dCardY = pieY + 36, dCardH = podiumH - 40;
    gr.FillRoundRect(pieX, dCardY, halfW, dCardH, 8, 8, COL.elev);

    var fid = summary.fidelity;
    var pureLossless = fid.hiresPct + fid.cdPct;

    // Header Stat
    tL(gr, pureLossless + '% Lossless Stream Purity', FONT.sect2, COL.green, pieX + 20, dCardY + 16, halfW - 40, 24);
    tL(gr, 'Studio Master Hi-Res + CD Quality Lossless', FONT.plSub, COL.text2, pieX + 20, dCardY + 40, halfW - 40, 18);

    // Spectrum Stacked Bar
    var barX = pieX + 20, barY = dCardY + 68, barW = halfW - 40, barH = 22;
    gr.FillRoundRect(barX, barY, barW, barH, 4, 4, RGB(35, 35, 40));

    var hiresW = Math.round(barW * (fid.hiresPct / 100));
    var cdW = Math.round(barW * (fid.cdPct / 100));
    if(hiresW > 0){
      gr.FillRoundRect(barX, barY, Math.min(barW, hiresW + 4), barH, 4, 4, RGB(139, 92, 246));
    }
    if(cdW > 0){
      gr.FillSolidRect(barX + hiresW, barY, cdW, barH, RGB(16, 185, 129));
    }

    // Legend List
    var legY0 = barY + barH + 16;

    // Item 1: Studio Master Hi-Res
    gr.FillRoundRect(barX, legY0 + 4, 12, 12, 2, 2, RGB(139, 92, 246));
    tL(gr, 'Studio Master Hi-Res', FONT.card, COL.text, barX + 20, legY0, halfW - 60, 20);
    tL(gr, fid.hiresCount + ' tracks (' + fid.hiresPct + '%) - >= 24-bit / DSD', FONT.plSub, COL.text2, barX + 20, legY0 + 20, halfW - 60, 16);

    // Item 2: CD Lossless
    gr.FillRoundRect(barX, legY0 + 46, 12, 12, 2, 2, RGB(16, 185, 129));
    tL(gr, 'CD Quality Lossless', FONT.card, COL.text, barX + 20, legY0 + 42, halfW - 60, 20);
    tL(gr, fid.cdCount + ' tracks (' + fid.cdPct + '%) - 16-bit FLAC/WAV', FONT.plSub, COL.text2, barX + 20, legY0 + 62, halfW - 60, 16);

    // Item 3: Lossy
    gr.FillRoundRect(barX, legY0 + 88, 12, 12, 2, 2, RGB(100, 116, 139));
    tL(gr, 'Compressed Lossy', FONT.card, COL.text, barX + 20, legY0 + 84, halfW - 60, 20);
    tL(gr, fid.lossyCount + ' tracks (' + fid.lossyPct + '%) - MP3/AAC/Vorbis', FONT.plSub, COL.text2, barX + 20, legY0 + 104, halfW - 60, 16);
  }
  cy += podiumH + 30;

  // ---- 4) Toast Notification ----
  if(analyticsToastTimer > Date.now() && analyticsToastMsg){
    var tw = Math.min(420, w), th = 42, tx = x0 + Math.floor((w - tw) / 2), ty = r.y + r.h - th - 20;
    gr.FillRoundRect(tx, ty, tw, th, 8, 8, RGB(22, 101, 52));
    drawIcon(gr, 'check', COL.white, tx + 14, ty + 12, 18, 18, 16);
    tL(gr, analyticsToastMsg, FONT.card, COL.white, tx + 40, ty + 11, tw - 50, 20);
  }

  // Vertical Scrollbar
  drawScrollbar(gr, x0 + w + 8, gy, viewH, ANALYTICS_SCROLL, maxPx, viewH, contentH, hv(x0, gy, x0 + w + 16, cropY) || drag === 'scroll');
}
