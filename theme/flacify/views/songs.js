/* flacify/views/songs.js -- all songs view: header, group-by, grouped/flat rows
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ---- All Songs: header + group-by pill + grouped/flat track list ---- */
function drawSongs(gr,r){
  HB_TR=[]; HB_CARD=[]; HB_SG=null;
  var songsOk=ensureBuilt('songs',songsReady,songsSteps);
  if(!songsOk || !gateReady('songsart',rowHandlesSongs(),0,ROW_GATE_MS)){   // 0 = the default cap
    if(songsOk || skelVisible('songs')) drawViewSkeleton(gr,r);
    return;
  }
  var cov=libChoice(), g=songsGroup;
  // header: gradient wash + mosaic cover + title/meta, mirroring the playlist header
  gr.FillGradRect(r.x,r.y,r.w,SHEAD,90,blend(artHue(cov.single,'__lib__'),COL.base,0.42),COL.base,1.0);
  var rx=r.x+r.w-M.cpad, lx=r.x+M.cpad, ay=r.y+44, art=M.artSz;
  drawLibCover(gr,lx,ay,art,8);
  // header text stops short of the dropdown column so the two can never collide on a narrow panel
  var gpW=232, fltBtnSz=38, fltGap=12;
  var clW=gpW+fltGap+fltBtnSz;
  var fltBtnX=Math.max(lx+art+24,rx-clW);
  var gpX=fltBtnX+fltBtnSz+fltGap;
  var tx=lx+art+24, tw=Math.max(120,fltBtnX-12-tx);
  tL(gr,'LIBRARY',FONT.eyebrow,COL.text,tx,ay+6,tw,18);
  tL(gr,'All Songs',FONT.title,COL.text,tx,ay+28,tw,84);
  var totalUniqueSongs = (songsIdx && songsIdx.length) ? songsIdx.length : songsTracks.length;
  var sCntStr=fmtNum(totalUniqueSongs);
  var sCntW=Math.round(gr.CalcTextWidth(sCntStr, FONT.meta));
  tL(gr, sCntStr, FONT.meta, COL.white, tx, ay+150, sCntW, 22);
  var sRestX=tx+sCntW;
  var sLbl=' song'+(totalUniqueSongs===1?'':'s');
  var sLblW=Math.round(gr.CalcTextWidth(sLbl, FONT.meta));
  tL(gr, sLbl, FONT.meta, COL.text2, sRestX, ay+150, sLblW, 22);
  sRestX+=sLblW;
  if(songsTotalSec>0){
    var dotSep=' '+CH_DOT+' ';
    var dotSepW=Math.round(gr.CalcTextWidth(dotSep, FONT.meta));
    tL(gr, dotSep, FONT.meta, COL.text2, sRestX, ay+150, dotSepW, 22);
    sRestX+=dotSepW;
    var durStr=fmtDur(songsTotalSec);
    var durW=Math.round(gr.CalcTextWidth(durStr, FONT.meta));
    tL(gr, durStr, FONT.meta, COL.white, sRestX, ay+150, durW, 22);
  }
  drawFilterButton(gr,fltBtnX,ay+142,fltBtnSz);
  HB_SG=drawDropPill(gr,gpX,ay+142,gpW,38,'Group: '+labelOf(SONGS_GROUPS,songsGroup,'No grouping'),sgMenuOpen);

  if(!songsRows.length){
    tC(gr,'Nothing in your library yet',FONT.sect,COL.text2,r.x,r.y+SHEAD+40,r.w,24);
    tC(gr,'Add a music folder via Library '+CH_BULL+' Configure.',FONT.qArtist,COL.text3,r.x,r.y+SHEAD+70,r.w,18);
    return;
  }

  /* ---- columns: flat mode mirrors the playlist view (cover + two-line title/artist + ALBUM).
     Grouped mode drops all of that -- the header above already shows artwork, album and artist --
     so rows go single-line and indent one step per nesting level. Secondary column follows:
     ALBUM when flat, ARTIST when grouped by album, nothing when grouped by artist. */
  var flat=(g==='none'), tind=flat?0:(g==='both'?SG_IND*2:SG_IND);
  var showAlbum=flat, showArtist=(g==='album');
  var numW=flat?46:36, durW=64, cgap=16;   // index column fits the largest number it can hold
  var numX=lx+tind, titleX=numX+numW+cgap;
  var colW=showAlbum?Math.round((rx-titleX-durW-cgap*2)*0.34):(showArtist?Math.round((rx-titleX-durW-cgap*2)*0.28):0);
  var colX=rx-durW-cgap-colW;
  var titleW=(colW?colX:rx-durW)-cgap-titleX;

  var listTop=r.y+SHEAD+8;
  var filterActive=(typeof inlineFilterOpen!=='undefined'&&inlineFilterOpen)||(typeof inlineFilterText!=='undefined'&&inlineFilterText.length>0);
  var filterH=34;
  var filterY=listTop;
  var colTop=filterActive ? (listTop+filterH+10) : listTop;
  var rowsTop=colTop+34, cropY=r.y+r.h, viewH=cropY-rowsTop;

  var displaySongsRows=songsRows;
  var isQueryActive=(typeof inlineFilterText!=='undefined'&&inlineFilterText.length>0);
  if(isQueryActive){
    var sfq=inlineFilterText.toLowerCase();
    displaySongsRows=[];
    for(var si=0; si<songsRows.length; si++){
      var sRow=songsRows[si];
      if(sRow.k==='t'){
        var stTitle=(sRow.t.title||'').toLowerCase();
        var stArtist=(sRow.t.artist||'').toLowerCase();
        var stAlbum=(sRow.t.album||'').toLowerCase();
        var matchArtist=(stArtist.indexOf(sfq)!==-1);
        if(!matchArtist && sRow.t.splitArtists){
          for(var sp=0; sp<sRow.t.splitArtists.length; sp++){
            if(sRow.t.splitArtists[sp].toLowerCase().indexOf(sfq)!==-1){
              matchArtist=true; break;
            }
          }
        }
        if(stTitle.indexOf(sfq)!==-1 || matchArtist || stAlbum.indexOf(sfq)!==-1){
          displaySongsRows.push(sRow);
        }
      }
    }
  }

  var contentH=isQueryActive ? displaySongsRows.length*M.rowH : songsContentH;
  var maxPx=Math.max(0,contentH-viewH);
  SONGS_MAXPX=maxPx;
  songsScroll=clampPx(songsScroll,maxPx); songsScrollT=clampPx(songsScrollT,maxPx);

  if(displaySongsRows.length===0 && songsTracks.length>0){
    tC(gr,'No tracks match "'+inlineFilterText+'"',FONT.sect,COL.text2,r.x,rowsTop+40,r.w,24);
    tC(gr,'Press Escape to clear the filter',FONT.meta,COL.text3,r.x,rowsTop+70,r.w,20);
  }

  var j0 = isQueryActive ? Math.floor(songsScroll/M.rowH) : songsFirstAt(songsScroll);
  if(!isQueryActive && g==='both' && j0<songsRows.length){
    var q0=(songsRows[j0].g1i!==undefined)?songsRows[j0].g1i:j0;
    for(var q=q0;q<songsRows.length;q++){
      var gq=songsRows[q]; if(gq.k!=='g1') continue;
      var rt=rowsTop+gq.y+gq.h-songsScroll-4, rb=rowsTop+(gq.y1||0)-songsScroll-8;
      if(rt>=cropY) break;
      var t0=Math.max(rt,rowsTop), t1=Math.min(rb,cropY);
      if(t1>t0) gr.FillSolidRect(lx+SG_IND/2-1,t0,2,t1-t0,RGBA(255,255,255,30));   // centred in the indent gutter
    }
  }
  for(var j=j0; j<displaySongsRows.length; j++){
    var row=displaySongsRows[j];
    var ry = isQueryActive ? (rowsTop+j*M.rowH-songsScroll) : (rowsTop+row.y-songsScroll);
    var gh = isQueryActive ? M.rowH : row.h;
    if(ry>=cropY) break;
    var vy0=Math.max(ry,rowsTop), vy1=Math.min(ry+gh,cropY);   // visible band: rows scrolled
    if(vy1<=vy0) continue;                                     // under the sticky header don't take the mouse
    if(row.k==='t'){
      var t=row.t, isPlaying=!!(NP && t.h && t.h.Path===NP.Path);
      var isHover=hv(lx-8,vy0,rx+8,vy1);
      if(isHover) gr.FillRoundRect(lx-8,ry,rx-lx+16,gh,4,4,COL.rowHover);
      if(isHover) drawIcon(gr,'play',COL.text,numX,ry,numW,gh,14);
      else tR(gr,String(row.n),FONT.rowNum,isPlaying?COL.green:COL.white,numX,ry,numW-8,gh);
      if(flat){
        var cs=40, cy=ry+(gh-cs)/2;
        drawCover(gr,titleX,cy,cs,3,t.h,t.album||t.title,t.artkey);
        tL(gr,t.title,FONT.rowTitle,isPlaying?COL.green:COL.text,titleX+cs+12,ry+8,titleW-cs-12,20);
        tL(gr,t.artist,FONT.rowArtist,COL.text2,titleX+cs+12,ry+30,titleW-cs-12,16);
      } else {
        tL(gr,t.title,FONT.rowTitle,isPlaying?COL.green:COL.text,titleX,ry,titleW,gh);
      }
      if(showAlbum) tL(gr,t.album,FONT.rowCell,COL.text2,colX,ry,colW,gh);
      else if(showArtist) tL(gr,t.artist,FONT.rowCell,COL.text2,colX,ry,colW,gh);
      tR(gr,t.len,FONT.rowCell,isPlaying?COL.green:COL.white,rx-durW,ry,durW,gh);
      HB_TR.push({x0:lx-8,y0:vy0,x1:rx+8,y1:vy1,songs:true,ti:row.ti,pgx0:numX,pgx1:numX+numW});
    } else {
      /* Group header: every kind is the same block on the same rhythm (GAP, artwork, PADB),
         differing only in indent, artwork size and -- for the artist banner -- a slab + eyebrow. */
      var nest=(row.k==='g2'), isArt=(row.kind==='artist'), banner=(isArt && g==='both');
      var gap=nest?SG_GAP2:SG_GAP1, acs=nest?SG_ART2:SG_ART1;
      var blockTop=ry+gap, blockH=gh-gap-(nest?SG_PADB2:SG_PADB1);
      var hx=lx+(nest?SG_IND:0), hy=blockTop+(banner?SG_SLABP:0);
      // divider only once the row's top edge is actually in view (it sits above the crop band)
      if(j>0 && !nest && ry+2>=rowsTop) gr.DrawLine(lx,ry+2,rx,ry+2,banner?2:1,COL.line);
      var hb0=Math.max(blockTop-(banner?0:4),rowsTop), hb1=vy1;
      var hHov=isArt && hb1>hb0 && hv(lx-8,hb0,rx+8,hb1);
      if(banner) gr.FillRoundRect(lx-8,blockTop,rx-lx+16,blockH,8,8,hHov?COL.hover:RGB(34,34,34));
      else if(hHov) gr.FillRoundRect(lx-8,blockTop-4,rx-lx+16,blockH+8,6,6,COL.rowHover);
      if(isArt) drawCircle(gr,hx,hy,acs,rowCover(row),row.label);
      else drawRounded(gr,hx,hy,acs,5,row.handle,row.seed);
      // text block centred against the artwork, running to the same right edge as the rows
      var htx=hx+acs+SG_TGAP, htw=rx-htx;
      var eyeH=banner?16:0, nameH=nest?22:26, subH=16;
      var ty0=Math.round(hy+acs/2-(eyeH+nameH+subH)/2);
      var sub=banner?(fmtNum(row.albums||1)+' album'+((row.albums||1)===1?'':'s')+'  '+CH_DOT+'  '+fmtNum(row.count)+' songs')
                    :((row.sub?row.sub+'  '+CH_DOT+'  ':'')+fmtNum(row.count)+' songs');
      if(banner) tL(gr,'ARTIST',FONT.eyebrow,COL.text3,htx,ty0,htw,eyeH);
      tL(gr,row.label,nest?FONT.sect:FONT.sect2,COL.text,htx,ty0+eyeH,htw,nameH);
      tL(gr,sub,FONT.plSub,COL.text2,htx,ty0+eyeH+nameH,htw,subH);
      // artist headers are a shortcut to the full artist page
      if(isArt && hb1>hb0) HB_CARD.push({x0:lx-8,y0:hb0,x1:rx+8,y1:hb1,kind:'artist',id:row.label});
    }
  }
  // crop the partial rows top & bottom (tallest row is a group header), then the sticky column header
  gr.FillSolidRect(r.x,rowsTop-SG_CROP,r.w,SG_CROP,COL.base);
  if(filterActive) gr.FillSolidRect(r.x,filterY-4,r.w,rowsTop-filterY+4,COL.base);
  gr.FillSolidRect(r.x,cropY,r.w,M.pad+2,COL.black);   // gutter below the panel

  if(filterActive){
    drawInlineFilterBar(gr,lx,filterY,rx-lx,filterH,displaySongsRows.length,songsTracks.length);
  }

  tR(gr,'#',FONT.head,COL.text2,numX,colTop,numW-8,20);
  tL(gr,'TITLE',FONT.head,COL.text2,titleX,colTop,titleW,20);
  if(showAlbum) tL(gr,'ALBUM',FONT.head,COL.text2,colX,colTop,colW,20);
  else if(showArtist) tL(gr,'ARTIST',FONT.head,COL.text2,colX,colTop,colW,20);
  drawIcon(gr,'clock',COL.text2,rx-16,colTop,16,20,15);
  gr.DrawLine(lx,colTop+26,rx,colTop+26,1,COL.line);
  drawScrollbar(gr,rx+8,rowsTop,viewH,songsScroll,maxPx,viewH,contentH,hv(r.x,r.y,r.x+r.w,cropY)||drag==='scroll');
  drawGroupMenu(gr);
}
