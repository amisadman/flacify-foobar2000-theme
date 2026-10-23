/* flacify/views/song_details.js -- song details modal: lossless technical specs, metadata, lyrics, and barcode
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var songDetails=null, SONG_DET_HB=null, songDetScroll=0, songDetScrollT=0, SONG_DET_MAXPX=0, SONG_DET_SB=null;

function setSongDetScroll(y){
  if(!SONG_DET_SB) return;
  songDetScroll=songDetScrollT=Math.round(sbFrac(y,SONG_DET_SB.top,SONG_DET_SB.h,SONG_DET_SB.thumbH)*SONG_DET_SB.maxPx);
  repaintAll();
}

function openSongDetails(h){
  if(!h) return;
  var title='', artist='', album='', year='', dur='', barcode='', copyright='', isrc='',
      codec='', bitrate='', bitdepth='', samplerate='', channels='', filesize='', genre='',
      producer='', comment='', trackno='', totaltracks='', disc='', composer='', lyricist='',
      label='', releasetype='', path='', encoder='', audioMd5='', albumArtist='', catalog='', date='', rawLyrics='';
  try{
    title=TF.title.EvalWithMetadb(h);
    artist=TF.rawArtist.EvalWithMetadb(h)||TF.artist.EvalWithMetadb(h);
    album=TF.album.EvalWithMetadb(h);
    year=TF.year.EvalWithMetadb(h);
    dur=TF.len.EvalWithMetadb(h);
    barcode=TF.barcode.EvalWithMetadb(h);
    copyright=TF.copyright.EvalWithMetadb(h);
    isrc=TF.isrc.EvalWithMetadb(h);
    codec=TF.codec.EvalWithMetadb(h);
    bitrate=TF.bitrate.EvalWithMetadb(h);
    bitdepth=TF.bitdepth.EvalWithMetadb(h);
    samplerate=TF.samplerate.EvalWithMetadb(h);
    channels=TF.channels.EvalWithMetadb(h);
    filesize=TF.filesize.EvalWithMetadb(h);
    genre=TF.genre.EvalWithMetadb(h);
    producer=TF.producer.EvalWithMetadb(h);
    comment=TF.comment.EvalWithMetadb(h);
    trackno=TF.trackno.EvalWithMetadb(h);
    totaltracks=TF.totaltracks.EvalWithMetadb(h);
    disc=TF.disc.EvalWithMetadb(h);
    composer=TF.composer.EvalWithMetadb(h);
    lyricist=TF.lyricist.EvalWithMetadb(h);
    label=TF.label.EvalWithMetadb(h);
    releasetype=TF.releasetype.EvalWithMetadb(h);
    path=TF.path.EvalWithMetadb(h);
    encoder=TF.encoder.EvalWithMetadb(h);
    audioMd5=TF.audioMd5.EvalWithMetadb(h);
    albumArtist=TF.albumArtist.EvalWithMetadb(h);
    catalog=TF.catalog.EvalWithMetadb(h);
    date=TF.date.EvalWithMetadb(h);
    rawLyrics=TF.lyrics.EvalWithMetadb(h);
  }catch(e){}

  if(!barcode && comment){
    try{
      var bm=comment.match(/\b\d{12,13}\b/);
      if(bm) barcode=bm[0];
    }catch(e2){}
  }

  if(!rawLyrics && h && h.Path){
    try{
      var p=String(h.Path);
      var lastSep=p.lastIndexOf('\\');
      var dir=lastSep>=0?p.substring(0,lastSep+1):'';
      var fn=lastSep>=0?p.substring(lastSep+1):p;
      var lastDot=fn.lastIndexOf('.');
      var base=lastDot>=0?fn.substring(0,lastDot):fn;
      if(typeof readFirst==='function') rawLyrics=readFirst([dir+base+'.lrc',dir+base+'.txt'])||'';
    }catch(e3){}
  }

  var lyricLines=[];
  if(rawLyrics && typeof parseLyrics==='function'){
    try{
      var pl=parseLyrics(rawLyrics);
      if(pl && pl.lines){
        for(var li=0;li<pl.lines.length;li++){
          var txt=pl.lines[li].text;
          if(txt && txt.replace(/^\s+|\s+$/g,'').length>0) lyricLines.push(txt);
        }
      }
    }catch(e4){}
  }

  songDetScroll=0;
  songDetScrollT=0;
  SONG_DET_MAXPX=0;

  songDetails={
    handle:h,
    title:title||'Unknown Title',
    artist:artist||'Unknown Artist',
    album:album||'Unknown Album',
    year:year,
    date:date,
    dur:dur,
    barcode:barcode,
    copyright:copyright,
    isrc:isrc,
    codec:codec||'FLAC',
    bitrate:bitrate,
    bitdepth:bitdepth,
    samplerate:samplerate,
    channels:channels,
    filesize:filesize,
    genre:genre,
    producer:producer,
    comment:comment,
    trackno:trackno,
    totaltracks:totaltracks,
    disc:disc,
    composer:composer,
    lyricist:lyricist,
    label:label,
    releasetype:releasetype,
    path:path,
    encoder:encoder,
    audioMd5:audioMd5,
    albumArtist:albumArtist,
    catalog:catalog,
    lyrics:lyricLines,
    lyricsExpanded:false,
    drInfo:(typeof getDynamicRange==='function')?getDynamicRange(h):null,
    primaryArtist:(typeof splitArtists==='function'&&splitArtists(artist).length)?splitArtists(artist)[0]:(artist||'Unknown Artist'),
    splitArtists:(typeof splitArtists==='function')?splitArtists(artist):[]
  };
  repaintAll();
}

function toggleSongDetailsLyrics(){
  if(!songDetails || !songDetails.lyrics || !songDetails.lyrics.length) return;
  songDetails.lyricsExpanded = !songDetails.lyricsExpanded;
  if(!songDetails.lyricsExpanded){
    songDetScroll=0;
    songDetScrollT=0;
  }
  repaintAll();
}

function closeSongDetails(){
  songDetails=null;
  SONG_DET_HB=null;
  SONG_DET_SB=null;
  songDetScroll=0;
  songDetScrollT=0;
  repaintAll();
}

/* Modal rendering for Song Details with Scrollable Body */
function drawSongDetails(gr){
  if(!songDetails) return;
  var d=songDetails;

  var cw=Math.min(740, W-36), ch=Math.min(680, H-36);
  var cy=Math.max(10, Math.round((H-ch)/2));
  var cx=modalPanel(gr, cw, ch, cy);

  var pad=28, px=cx+pad, pw=cw-pad*2;
  var headH=52;
  var viewTop=cy+headH, viewH=ch-headH-12, cropY=viewTop+viewH;

  // Header Close "X" Button
  var closeSz=28, closeX=cx+cw-pad-closeSz, closeY=cy+12;
  var closeHov=hv(closeX,closeY,closeX+closeSz,closeY+closeSz);
  SONG_DET_HB={
    close:{x0:closeX-4,y0:closeY-4,x1:closeX+closeSz+4,y1:closeY+closeSz+4},
    panel:{x0:cx,y0:cy,x1:cx+cw,y1:cy+ch}
  };

  var scroll=Math.round(songDetScroll);
  var curY=viewTop+16-scroll;

  // 1. Cover Image (Enlarged 220x220) & Play Button
  var artSz=220;
  var artY=curY;
  var artY0=Math.max(artY,viewTop);
  var artY1=Math.min(artY+artSz,cropY);
  if(artY1>artY0){
    var visH=artY1-artY0;
    var ri=maskedArt(d.handle,d.title,artSz,roundMask(artSz,8),'r8');
    if(ri && ri.Width>0 && ri.Height>0){
      var srcY=Math.round((artY0-artY)*(ri.Height/artSz));
      var srcH=Math.round(visH*(ri.Height/artSz));
      gr.DrawImage(ri,px,artY0,artSz,visH,0,srcY,ri.Width,srcH,0,255);
    } else {
      gr.FillSolidRect(px,artY0,artSz,visH,coverCol(d.title));
    }
    // Hover play overlay on artwork (only when artwork is completely within scroll viewport)
    if(artY>=viewTop && artY+artSz<=cropY){
      var artHov=hv(px,artY,px+artSz,artY+artSz);
      if(artHov){
        gr.FillRoundRect(px,artY,artSz,artSz,8,8,RGBA(0,0,0,100));
        var apb=52, apx=px+Math.round((artSz-apb)/2), apy=artY+Math.round((artSz-apb)/2);
        gr.FillEllipse(apx,apy,apb,apb,COL.green);
        drawIcon(gr,'play',COL.black,apx,apy,apb,apb,24);
      }
      SONG_DET_HB.artPlay={x0:px,y0:artY,x1:px+artSz,y1:artY+artSz};
    }
  }

  // Play Button beneath artwork (Capsule button)
  var pbY=artY+artSz+10, pbW=artSz, pbH=38;
  if(pbY>=viewTop && pbY+pbH<=cropY){
    var pbHot=hv(px,pbY,px+pbW,pbY+pbH);
    gr.FillRoundRect(px,pbY,pbW,pbH,pbH/2,pbH/2,pbHot?RGB(45,215,110):COL.green);
    var pIconW=18, pTxtW=70, pTotalW=pIconW+8+pTxtW;
    var pStartX=px+Math.round((pbW-pTotalW)/2);
    drawIcon(gr,'play',COL.black,pStartX,pbY,pIconW,pbH,16);
    tL(gr,'Play Song',FONT.pl,COL.black,pStartX+pIconW+8,pbY,pTxtW+10,pbH);
    SONG_DET_HB.play={x0:px,y0:pbY,x1:px+pbW,y1:pbY+pbH};
  }

  // 2. Track Info & Lossless Banner (Right of artwork)
  var tx=px+artSz+24, tw=pw-artSz-24, ty=artY;
  if(ty>=viewTop && ty+32<=cropY) tL(gr,d.title,FONT.sect2,COL.green,tx,ty,tw,32);
  ty+=36;

  if(ty>=viewTop && ty+24<=cropY){
    var aTxtW=Math.min(tw, Math.round(gr.CalcTextWidth(d.artist, FONT.sect)));
    var artistHov=hv(tx, ty, tx+aTxtW, ty+24);
    tL(gr,d.artist,FONT.sect,artistHov?COL.green:COL.text,tx,ty,tw,24);
    SONG_DET_HB.artist={x0:tx, y0:ty, x1:tx+aTxtW, y1:ty+24, name:d.primaryArtist||d.artist};
  }
  ty+=30;

  if(ty>=viewTop && ty+22<=cropY) tL(gr,d.album+(d.year?(' ('+d.year+')'):''),FONT.card,COL.text2,tx,ty,tw,22);
  ty+=26;

  var trkInfo=(d.trackno?('Track '+d.trackno+(d.totaltracks?('/'+d.totaltracks):'')):'')+(d.disc?(' '+CH_DOT+' Disc '+d.disc):'');
  var durInfo=(d.dur?((trkInfo?(' '+CH_DOT+' '):'')+d.dur):'')+(d.filesize?(' '+CH_DOT+' '+d.filesize):'');
  if(ty>=viewTop && ty+20<=cropY) tL(gr,trkInfo+durInfo,FONT.meta,COL.white,tx,ty,tw,20);
  ty+=30;

  // Technical Audio Specs Banner
  var specH=42;
  if(ty>=viewTop && ty+specH<=cropY){
    gr.FillRoundRect(tx,ty,tw,specH,6,6,RGBA(255,255,255,12));
    strokeRound(gr,tx,ty,tw,specH,6,1,RGBA(255,255,255,24));

    var srStr=d.samplerate?(parseFloat(d.samplerate)>1000?(parseFloat(d.samplerate)/1000).toFixed(1)+' kHz':d.samplerate+' Hz'):'48.0 kHz';
    var bdStr=d.bitdepth?(d.bitdepth+'-bit'):'24-bit';
    var brStr=d.bitrate?(d.bitrate+' kbps'):'Lossless';
    var chStr=(d.channels==='2'||!d.channels)?'Stereo':(d.channels+' ch');

    var specText='Quality:  '+d.codec+' '+CH_DOT+' '+bdStr+' / '+srStr+' '+CH_DOT+' '+brStr+' ('+chStr+')';
    if(d.drInfo && d.drInfo.score>0) specText+=' '+CH_DOT+' '+d.drInfo.label;
    tC(gr,specText,FONT.pl,COL.green,tx,ty,tw,specH);
  }

  curY=pbY+pbH+20;

  // 3. Track & Release Metadata Table
  if(curY>=viewTop && curY+1<=cropY) gr.FillSolidRect(px,curY,pw,1,COL.line);
  curY+=14;
  if(curY>=viewTop && curY+18<=cropY) tL(gr,'TRACK & RELEASE METADATA',FONT.eyebrow,COL.text2,px,curY,pw,18);
  curY+=24;

  var rowH=21, col1W=Math.round(pw*0.5)-12, col2X=px+Math.round(pw*0.5)+12, col2W=col1W;

  function metaCell(label,val,rx,rw,ry){
    if(!val) return;
    if(ry<viewTop || ry+rowH>cropY) return;
    tL(gr,label+':',FONT.plSub,COL.text3,rx,ry,94,rowH);
    tL(gr,val,FONT.plSub,COL.text,rx+96,ry,rw-96,rowH);
  }

  function drawMetaRow(l1,v1,l2,v2){
    if(!v1 && !v2) return;
    if(v1) metaCell(l1,v1,px,col1W,curY);
    if(v2) metaCell(l2,v2,col2X,col2W,curY);
    curY+=rowH;
  }

  drawMetaRow('ISRC',d.isrc,'Barcode',d.barcode || (d.isrc?('(ISRC) '+d.isrc):''));
  drawMetaRow('Dynamic Range',d.drInfo?(d.drInfo.label+' ('+d.drInfo.ratingLabel+')'):'Unscanned','Track Peak',d.drInfo?d.drInfo.trackPeak:'None');
  drawMetaRow('Track Gain',d.drInfo?d.drInfo.trackGain:'None','Album Gain',d.drInfo?d.drInfo.albumGain:'None');
  drawMetaRow('Genre',d.genre,'Producer',d.producer);
  drawMetaRow('Composer',d.composer,'Lyricist',d.lyricist);
  drawMetaRow('Label',d.label,'Release Type',d.releasetype);
  drawMetaRow('Release Date',d.date || d.year,'Album Artist',d.albumArtist);
  drawMetaRow('Tool / Encoder',d.encoder,'Audio MD5',d.audioMd5);
  drawMetaRow('Catalog #',d.catalog,'Comment',d.comment && d.comment.indexOf('http')===-1?d.comment:'');

  if(d.path){
    metaCell('File Location',d.path,px,pw,curY);
    curY+=rowH;
  }

  // 4. Lyrics Section
  curY+=14;
  if(curY>=viewTop && curY+1<=cropY) gr.FillSolidRect(px,curY,pw,1,COL.line);
  curY+=14;

  var hasLyrics = d.lyrics && d.lyrics.length;
  if(hasLyrics){
    var toggleTxt = d.lyricsExpanded ? 'Show Less' : ('Show More (' + d.lyrics.length + ' lines)');
    var btnW = d.lyricsExpanded ? 88 : 156;
    var btnH = 22;
    var btnX = px + pw - btnW;
    var btnY = curY - 2;

    if(curY>=viewTop && curY+18<=cropY){
      tL(gr,'LYRICS',FONT.eyebrow,COL.text2,px,curY,pw-btnW-12,18);
    }

    if(btnY>=viewTop && btnY+btnH<=cropY){
      var btnHov = hv(btnX,btnY,btnX+btnW,btnY+btnH);
      gr.FillRoundRect(btnX, btnY, btnW, btnH, 10, 10, btnHov ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
      strokeRound(gr, btnX, btnY, btnW, btnH, 10, 1, btnHov ? COL.green : RGBA(255,255,255,24));
      tC(gr, toggleTxt, FONT.plSub, btnHov ? COL.green : COL.text2, btnX, btnY, btnW, btnH);
      SONG_DET_HB.toggleLyrics = {x0:btnX, y0:btnY, x1:btnX+btnW, y1:btnY+btnH};
    }
    curY+=26;

    if(!d.lyricsExpanded){
      // Collapsed preview: up to 3 lines + click to expand hint
      var previewLines = Math.min(3, d.lyrics.length);
      var lineH = 24;
      var cardPad = 12;
      var hintH = 20;
      var previewH = cardPad*2 + previewLines*lineH + hintH;

      var cardY0 = Math.max(viewTop, curY);
      var cardY1 = Math.min(cropY, curY + previewH);
      if(cardY1 > cardY0){
        var cardHov = hv(px, cardY0, px + pw, cardY1);
        gr.FillSolidRect(px, cardY0, pw, cardY1 - cardY0, cardHov ? RGBA(255,255,255,14) : RGBA(255,255,255,8));
        if(curY >= viewTop && curY + previewH <= cropY){
          strokeRound(gr, px, curY, pw, previewH, 8, 1, cardHov ? RGBA(255,255,255,28) : RGBA(255,255,255,16));
        }

        for(var pi=0; pi<previewLines; pi++){
          var lyY = curY + cardPad + pi*lineH;
          if(lyY>=viewTop && lyY+lineH<=cropY){
            var col = pi === 0 ? COL.text : (pi === 1 ? COL.text2 : COL.text3);
            tL(gr, d.lyrics[pi], FONT.pl, col, px+20, lyY, pw-40, lineH);
          }
        }

        var hintY = curY + cardPad + previewLines*lineH + 2;
        if(hintY>=viewTop && hintY+hintH<=cropY){
          var remLines = d.lyrics.length - previewLines;
          var hintMsg = remLines > 0 ? ('Click to expand full lyrics (' + remLines + ' more line' + (remLines===1?'':'s') + ')...') : 'Click to expand full lyrics...';
          tL(gr, hintMsg, FONT.plSub, cardHov ? COL.green : COL.text3, px+20, hintY, pw-40, hintH);
        }
        SONG_DET_HB.lyricCard = {x0:px, y0:cardY0, x1:px+pw, y1:cardY1};
      }
      curY += previewH + 18;
    } else {
      // Expanded: all lines rendered
      lineH = 25;
      var lyCardH = d.lyrics.length * lineH + 24;
      cardY0 = Math.max(viewTop, curY);
      cardY1 = Math.min(cropY, curY + lyCardH);
      if(cardY1 > cardY0){
        gr.FillSolidRect(px, cardY0, pw, cardY1 - cardY0, RGBA(255,255,255,8));
        for(var li=0; li<d.lyrics.length; li++){
          lyY = curY + 12 + li*lineH;
          if(lyY>=viewTop && lyY+lineH<=cropY){
            tL(gr, d.lyrics[li], FONT.pl, COL.text, px+22, lyY, pw-44, lineH);
          }
        }
      }
      curY += lyCardH + 14;

      // Bottom collapse button
      var bBtnW = 100, bBtnH = 24;
      var bBtnX = px + Math.round((pw - bBtnW)/2);
      var bBtnY = curY;
      if(bBtnY>=viewTop && bBtnY+bBtnH<=cropY){
        var bBtnHov = hv(bBtnX, bBtnY, bBtnX+bBtnW, bBtnY+bBtnH);
        gr.FillRoundRect(bBtnX, bBtnY, bBtnW, bBtnH, 10, 10, bBtnHov ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
        strokeRound(gr, bBtnX, bBtnY, bBtnW, bBtnH, 10, 1, bBtnHov ? COL.green : RGBA(255,255,255,24));
        tC(gr, 'Show Less', FONT.plSub, bBtnHov ? COL.green : COL.text2, bBtnX, bBtnY, bBtnW, bBtnH);
        SONG_DET_HB.toggleLyricsBottom = {x0:bBtnX, y0:bBtnY, x1:bBtnX+bBtnW, y1:bBtnY+bBtnH};
      }
      curY += bBtnH + 18;
    }
  } else {
    // If not found: same as now
    if(curY>=viewTop && curY+18<=cropY){
      tL(gr,'LYRICS',FONT.eyebrow,COL.text2,px,curY,pw,18);
    }
    curY+=24;
    if(curY>=viewTop && curY+20<=cropY){
      tL(gr,'No embedded lyrics found for this track.',FONT.plSub,COL.text3,px,curY,pw,20);
    }
    curY+=30;
  }

  // 5. Copyright
  if(d.copyright){
    if(curY>=viewTop && curY+20<=cropY){
      tL(gr,'Copyright:',FONT.plSub,COL.text3,px,curY,94,20);
      tL(gr,chr(0xA9)+' '+d.copyright,FONT.plSub,COL.text2,px+96,curY,pw-96,20);
    }
    curY+=26;
  }

  // 6. Vector Barcode -- At last, left aligned
  curY+=8;
  var codeToDraw = d.barcode || d.isrc;
  if(!codeToDraw && d.title){
    var hStr = ('000000000' + Math.abs(hash(d.title + (d.album||'')))).slice(-9);
    codeToDraw = '506' + hStr;
  }
  if(codeToDraw){
    if(curY>=viewTop && curY+44<=cropY){
      drawBarcode(gr,px,curY,220,44,codeToDraw,COL.text,COL.text2);
    }
    curY+=58;
  }

  // Compute total content height and clamp scroll
  var totalContentH=(curY+scroll)-viewTop;
  var maxPx=Math.max(0,totalContentH-viewH);
  SONG_DET_MAXPX=maxPx;
  songDetScroll=clampPx(songDetScroll,maxPx); songDetScrollT=clampPx(songDetScrollT,maxPx);

  // Sticky Top Header Mask & Border
  gr.FillSolidRect(cx,cy+12,cw,headH-12,RGB(42,42,42));
  gr.FillRoundRect(cx,cy,cw,headH,12,12,RGB(42,42,42));
  tL(gr,'Song Details & Credits',FONT.sect,COL.text,px,cy+16,pw-closeSz-16,24);
  if(closeHov) gr.FillEllipse(closeX,closeY,closeSz,closeSz,RGBA(255,255,255,20));
  drawIcon(gr,'close',closeHov?COL.text:COL.text2,closeX,closeY,closeSz,closeSz,14);
  gr.FillSolidRect(px,cy+headH-1,pw,1,COL.line);

  // Sticky Bottom Mask
  var botMaskH=Math.max(0,(cy+ch)-cropY);
  if(botMaskH>0) gr.FillSolidRect(cx+6,cropY,cw-12,botMaskH,RGB(42,42,42));

  // Outer border clipping safeguards (guarantee nothing ever leaks past dialog bounds)
  if(cy>0) gr.FillSolidRect(0,0,W,cy,RGBA(0,0,0,150));
  if(cy+ch<H) gr.FillSolidRect(0,cy+ch,W,H-(cy+ch),RGBA(0,0,0,150));
  if(cx>0) gr.FillSolidRect(0,cy,cx,ch,RGBA(0,0,0,150));
  if(cx+cw<W) gr.FillSolidRect(cx+cw,cy,W-(cx+cw),ch,RGBA(0,0,0,150));

  // Draggable Scrollbar
  SONG_DET_SB=drawSBV(gr,cx+cw-10,viewTop,viewH,songDetScroll,maxPx,viewH,totalContentH,maxPx>0,SB_NAV);
}
