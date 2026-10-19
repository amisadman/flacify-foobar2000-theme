/* verdant/views/artist.js -- Spotify-grade Artist Profile view
   Featuring Deezer high-res imagery, verified artist badge, online fan stats,
   popular tracks top-10, latest release spotlight, discography shelves, bio card,
   and 60fps full-page continuous scrolling with sticky top bar.
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js. */

var HB_ARTIST_PLAY=null, HB_ARTIST_SHUFFLE=null, HB_ARTIST_FOLLOW=null, HB_ARTIST_SEE_MORE=null;
var HB_ARTIST_LATEST=null, HB_ARTIST_ALBUMS=[], HB_ARTIST_SINGLES=[], HB_ARTIST_APPEARS=[];
var HB_ARTIST_PHOTO=null, HB_ARTIST_EDIT_BTN=null, HB_ARTIST_EDIT_BIO_BTN=null;
var artistStudioModal=null, ARTIST_STUDIO_HB=null;
var artistFollowingMap={};

function wrapText(gr, str, font, maxW, maxLines){
  if(!str) return [];
  var words=String(str).split(/\s+/);
  var lines=[], curLine='';
  var truncated=false;
  for(var i=0; i<words.length; i++){
    var testLine=curLine ? (curLine+' '+words[i]) : words[i];
    if(gr.CalcTextWidth(testLine, font) > maxW && curLine){
      lines.push(curLine);
      curLine=words[i];
      if(maxLines && lines.length>=maxLines){
        truncated=true;
        break;
      }
    } else {
      curLine=testLine;
    }
  }
  if(curLine && (!maxLines || lines.length<maxLines)){
    lines.push(curLine);
  } else if(curLine){
    truncated=true;
  }
  if(truncated && lines.length>0){
    var last=lines[lines.length-1];
    if(!/\.\.\.$/.test(last)){
      while(last.length>0 && gr.CalcTextWidth(last+'...', font)>maxW){
        last=last.substring(0, last.length-1).replace(/\s+$/, '');
      }
      lines[lines.length-1]=last+'...';
    }
  }
  return lines;
}

function drawArtist(gr, r){
  HB_TR=[];
  HB_ARTIST_PLAY=null;
  HB_ARTIST_SHUFFLE=null;
  HB_ARTIST_FOLLOW=null;
  HB_ARTIST_SEE_MORE=null;
  HB_ARTIST_LATEST=null;
  HB_ARTIST_ALBUMS=[];
  HB_ARTIST_SINGLES=[];
  HB_ARTIST_APPEARS=[];
  HB_ARTIST_PHOTO=null;
  HB_ARTIST_EDIT_BTN=null;
  HB_ARTIST_EDIT_BIO_BTN=null;

  if(!viewArtist){
    tC(gr, 'No artist selected', FONT.sect, COL.text2, r.x, r.y+Math.round(r.h/2)-20, r.w, 24);
    return;
  }

  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2;
  var scroll=Math.round(artistScroll);
  var cropY=r.y+r.h;

  // Retrieve artist online metadata and first handle for fallback artwork
  var meta=getArtistMeta(viewArtist);
  var heroImg=getArtistHeroImg(viewArtist);
  var firstHandle=(artistAlbums.length && artistAlbums[0].handle) ? artistAlbums[0].handle : null;

  // Collect all artist handles for play/shuffle buttons
  var allArtistHandles=[];
  for(var ai=0; ai<artistAlbums.length; ai++){
    for(var ti=0; ti<artistAlbums[ai].tracks.length; ti++){
      allArtistHandles.push(artistAlbums[ai].tracks[ti].handle);
    }
  }
  for(var si=0; si<artistSingles.length; si++){
    for(var sti=0; sti<artistSingles[si].tracks.length; sti++){
      allArtistHandles.push(artistSingles[si].tracks[sti].handle);
    }
  }

  // 1. Dynamic Ambient Tinted Gradient (Anchored to view top, just like album view)
  var gradH=Math.max(380, Math.min(500, Math.round(r.h*0.65)));
  gr.FillGradRect(r.x, r.y, r.w, gradH, 90, blend(artHue(firstHandle, viewArtist), COL.base, 0.42), COL.base, 1.0);

  // 2. Hero Section: Enlarged Artist Portrait Card (240x240) & Rich Metadata (Matching Album view)
  var artSz=240;
  var ax=x0, ay=r.y+24-scroll;

  if(ay+artSz>r.y && ay<cropY){
    // Ambient drop shadow behind artist portrait card
    gr.FillRoundRect(ax+4, ay+6, artSz, artSz, 10, 10, RGBA(0,0,0,160));
    drawArtistPhoto(gr, ax, ay, artSz, 8, firstHandle, viewArtist);
    strokeRound(gr, ax, ay, artSz, artSz, 8, 1, RGBA(255,255,255,24));

    // Hover overlay: Choose/Change photo (Spotify-style)
    var photoHot=hv(ax, Math.max(ay, r.y), ax+artSz, Math.min(ay+artSz, cropY));
    if(photoHot){
      gr.FillRoundRect(ax, ay, artSz, artSz, 8, 8, RGBA(0,0,0,140));
      var isz=44, icx=ax+(artSz-isz)/2, icy=ay+(artSz-isz)/2-14;
      drawIcon(gr, 'album', COL.white, icx, icy, isz, isz, 36);
      var plbl=(getArtistHeroImg(viewArtist) ? 'Change photo' : 'Choose photo');
      var plblW=Math.round(gr.CalcTextWidth(plbl, FONT.plSub))+24, plblH=28;
      var plblX=ax+(artSz-plblW)/2, plblY=icy+isz+10;
      gr.FillRoundRect(plblX, plblY, plblW, plblH, plblH/2, plblH/2, RGBA(255,255,255,28));
      gr.DrawRoundRect(plblX, plblY, plblW, plblH, plblH/2, plblH/2, 1, RGBA(255,255,255,140));
      gr.GdiDrawText(plbl, FONT.plSub, COL.white, plblX, plblY, plblW, plblH, DT_C);
    }
    HB_ARTIST_PHOTO={x0:ax, y0:Math.max(ay, r.y), x1:ax+artSz, y1:Math.min(ay+artSz, cropY), artist:viewArtist};
  }

  // Right Column: Eyebrow, White Title, Description, and Stats with Pure White Numbers
  var tx=ax+artSz+28, tw=r.x+r.w-pad-tx;
  var ty=ay+6;

  // Eyebrow: Verified Artist Badge
  var vbW=126, vbH=24;
  if(ty+vbH>r.y && ty<cropY){
    gr.FillRoundRect(tx, ty, vbW, vbH, vbH/2, vbH/2, RGBA(41,128,255,180));
    strokeRound(gr, tx, ty, vbW, vbH, vbH/2, 1, RGBA(255,255,255,60));
    drawIcon(gr, 'badge', COL.white, tx+6, ty, 18, vbH, 14);
    tL(gr, 'Verified Artist', FONT.eyebrow, COL.white, tx+26, ty, vbW-28, vbH);
  }
  ty+=vbH+12;

  // Artist Title (User requested: "make the artist name white")
  var nameFont=(viewArtist.length>22 ? FONT.sect2 : FONT.title);
  var nameH=(viewArtist.length>22 ? 40 : 64);
  if(ty+nameH>r.y && ty<cropY){
    tL(gr, viewArtist, nameFont, COL.white, tx, ty, tw, nameH);
  }
  ty+=nameH+10;

  // Wikipedia Short Description / Bio teaser (if available)
  if(meta && meta.desc){
    if(ty+20>r.y && ty<cropY){
      tL(gr, meta.desc, FONT.pl, COL.text2, tx, ty, tw, 20);
    }
    ty+=26;
  }

  // Monthly Listeners & Library Stats (User requested: "library artist number should be white")
  var totalAlbs=artistAlbums.length+artistSingles.length;
  if(ty+22>r.y && ty<cropY){
    var curStatX=tx;
    if(meta && meta.fansFormatted){
      var fVal=meta.fansFormatted;
      var fValW=Math.round(gr.CalcTextWidth(fVal, FONT.meta));
      tL(gr, fVal, FONT.meta, COL.white, curStatX, ty, fValW, 22);
      curStatX+=fValW;

      var fLbl=' monthly listeners '+CH_DOT+' ';
      var fLblW=Math.round(gr.CalcTextWidth(fLbl, FONT.meta));
      tL(gr, fLbl, FONT.meta, COL.text2, curStatX, ty, fLblW, 22);
      curStatX+=fLblW;
    }

    var rVal=String(totalAlbs);
    var rValW=Math.round(gr.CalcTextWidth(rVal, FONT.meta));
    tL(gr, rVal, FONT.meta, COL.white, curStatX, ty, rValW, 22);
    curStatX+=rValW;

    var rLbl=' release'+(totalAlbs===1?'':'s')+' '+CH_DOT+' ';
    var rLblW=Math.round(gr.CalcTextWidth(rLbl, FONT.meta));
    tL(gr, rLbl, FONT.meta, COL.text2, curStatX, ty, rLblW, 22);
    curStatX+=rLblW;

    var sVal=String(artistTotalSongs);
    var sValW=Math.round(gr.CalcTextWidth(sVal, FONT.meta));
    tL(gr, sVal, FONT.meta, COL.white, curStatX, ty, sValW, 22);
    curStatX+=sValW;

    var sLbl=' songs in your library';
    var sLblW=Math.round(gr.CalcTextWidth(sLbl, FONT.meta));
    tL(gr, sLbl, FONT.meta, COL.text2, curStatX, ty, sLblW, 22);
  }

  // 3. Action Controls Bar: Big Play Button (56px) + Shuffle (38px) + Following (34px)
  var playRowY=ay+artSz+24;
  var pb=56;
  var pbHot=hv(x0, Math.max(playRowY, r.y), x0+pb, Math.min(playRowY+pb, cropY));
  if(playRowY+pb>r.y && playRowY<cropY){
    gr.FillEllipse(x0, playRowY, pb, pb, pbHot ? RGB(45,230,115) : COL.green);
    drawIcon(gr, 'play', COL.black, x0, playRowY, pb, pb, 24);
    HB_ARTIST_PLAY={x0:x0, y0:Math.max(playRowY, r.y), x1:x0+pb, y1:Math.min(playRowY+pb, cropY), handles:allArtistHandles};
  }

  // Shuffle Button
  var shufX=x0+pb+18, shufSz=38, shufY=playRowY+Math.round((pb-shufSz)/2);
  var shufHot=hv(shufX, Math.max(shufY, r.y), shufX+shufSz, Math.min(shufY+shufSz, cropY));
  if(shufY+shufSz>r.y && shufY<cropY){
    gr.FillEllipse(shufX, shufY, shufSz, shufSz, shufHot ? RGBA(255,255,255,24) : RGBA(255,255,255,12));
    strokeRound(gr, shufX, shufY, shufSz, shufSz, shufSz/2, 1, shufHot ? COL.green : RGBA(255,255,255,28));
    drawIcon(gr, 'shuffle', shufHot ? COL.green : COL.text2, shufX, shufY, shufSz, shufSz, 18);
    HB_ARTIST_SHUFFLE={x0:shufX, y0:Math.max(shufY, r.y), x1:shufX+shufSz, y1:Math.min(shufY+shufSz, cropY), handles:allArtistHandles};
  }

  // Follow Capsule Button
  var folX=shufX+shufSz+18, folW=104, folH=34, folY=playRowY+Math.round((pb-folH)/2);
  var isFollowing=!!artistFollowingMap[viewArtist];
  var folHot=hv(folX, Math.max(folY, r.y), folX+folW, Math.min(folY+folH, cropY));
  if(folY+folH>r.y && folY<cropY){
    gr.FillRoundRect(folX, folY, folW, folH, folH/2, folH/2, folHot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
    strokeRound(gr, folX, folY, folW, folH, folH/2, 1, folHot ? COL.green : RGBA(255,255,255,30));
    tC(gr, isFollowing ? 'Following' : 'Follow', FONT.plSub, folHot ? COL.green : COL.text, folX, folY, folW, folH);
    HB_ARTIST_FOLLOW={x0:folX, y0:Math.max(folY, r.y), x1:folX+folW, y1:Math.min(folY+folH, cropY), artist:viewArtist};
  }

  // Edit Profile Capsule Button
  var editX=folX+folW+12, editW=110, editH=34, editY=folY;
  var editHot=hv(editX, Math.max(editY, r.y), editX+editW, Math.min(editY+editH, cropY));
  if(editY+editH>r.y && editY<cropY){
    gr.FillRoundRect(editX, editY, editW, editH, editH/2, editH/2, editHot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
    strokeRound(gr, editX, editY, editW, editH, editH/2, 1, editHot ? COL.green : RGBA(255,255,255,30));
    tC(gr, 'Edit Profile', FONT.plSub, editHot ? COL.green : COL.text, editX, editY, editW, editH);
    HB_ARTIST_EDIT_BTN={x0:editX, y0:Math.max(editY, r.y), x1:editX+editW, y1:Math.min(editY+editH, cropY), artist:viewArtist};
  }

  var curY=playRowY+pb+32;

  // 3. Popular Tracks Section
  if(artistPopularTracks && artistPopularTracks.length>0){
    if(curY+26>r.y && curY<cropY){
      tL(gr, 'Popular', FONT.sect, COL.white, x0, curY, w, 28);
    }
    curY+=36;

    var numW=36, thumbSz=40, durW=60;
    var durX=x0+w-durW;
    var titleX=x0+numW+thumbSz+16;
    var albW=Math.max(140, Math.round(w*0.30));
    var titleW=Math.max(160, durX-16-albW-titleX);
    var albX=titleX+titleW+16;

    // Tracklist Column Headers
    if(curY+24>r.y && curY<cropY){
      tL(gr, '#', FONT.eyebrow, COL.text3, x0+12, curY, numW, 20);
      tL(gr, 'TITLE', FONT.eyebrow, COL.text3, titleX, curY, titleW, 20);
      tL(gr, 'ALBUM', FONT.eyebrow, COL.text3, albX, curY, albW, 20);
      tR(gr, 'DURATION', FONT.eyebrow, COL.text3, durX, curY, durW, 20);
      gr.FillSolidRect(x0, curY+22, w, 1, COL.line);
    }
    curY+=30;

    var popCount=artistPopularExpanded ? Math.min(10, artistPopularTracks.length) : Math.min(5, artistPopularTracks.length);
    var prh=52;

    for(var pi=0; pi<popCount; pi++){
      var pry=curY+pi*prh;
      if(pry+prh<=r.y) continue;
      if(pry>=cropY) break;

      var ptrk=artistPopularTracks[pi];
      var isPlaying=!!(NP && ptrk.handle && NP.Path===ptrk.handle.Path);
      var isHov=hv(x0-4, Math.max(pry, r.y), x0+w+4, Math.min(pry+prh, cropY));

      if(isHov) gr.FillRoundRect(x0-4, pry, w+8, prh, 6, 6, COL.rowHover);

      // Rank Number / Equalizer / Hover Play
      if(isHov) {
        drawIcon(gr, 'play', COL.text, x0+8, pry+Math.round((prh-16)/2), 20, 16, 14);
      } else if(isPlaying) {
        drawIcon(gr, 'equalizer', COL.green, x0+8, pry+Math.round((prh-16)/2), 20, 16, 14);
      } else {
        tC(gr, String(pi+1), FONT.rowNum, COL.white, x0, pry, numW, prh);
      }

      // 40x40 Thumbnail Album Art
      var thX=x0+numW+6, thY=pry+Math.round((prh-thumbSz)/2);
      drawRounded(gr, thX, thY, thumbSz, 4, ptrk.handle, ptrk.album);

      // Track Title & Collaborating Artist Subtitle
      if(ptrk.artist && ptrk.artist!==viewArtist){
        tL(gr, ptrk.title, FONT.rowTitle, isPlaying ? COL.green : (isHov ? COL.white : COL.text), titleX, pry+6, titleW, 20);
        tL(gr, ptrk.artist, FONT.plSub, COL.text3, titleX, pry+27, titleW, 16);
      } else {
        tL(gr, ptrk.title, FONT.rowTitle, isPlaying ? COL.green : (isHov ? COL.white : COL.text), titleX, pry, titleW, prh);
      }

      // Album Column
      tL(gr, ptrk.album || '-', FONT.rowCell, isHov ? COL.text : COL.text2, albX, pry, albW, prh);

      // Duration Column
      tR(gr, ptrk.dur, FONT.rowCell, isPlaying ? COL.green : COL.white, durX, pry, durW, prh);

      var pcy0=Math.max(pry, r.y), pcy1=Math.min(pry+prh, cropY);
      if(pcy1>pcy0){
        HB_TR.push({
          x0:x0-4, y0:pcy0, x1:x0+w+4, y1:pcy1,
          albumRow:true, idx:0, handles:[ptrk.handle], pgx0:x0, pgx1:x0+numW
        });
      }
    }
    curY+=popCount*prh+14;

    // "See more" / "Show less" toggle capsule button if more than 5 tracks exist
    if(artistPopularTracks.length>5){
      var smW=124, smH=30;
      var smHot=hv(x0, Math.max(curY, r.y), x0+smW, Math.min(curY+smH, cropY));
      if(curY+smH>r.y && curY<cropY){
        gr.FillRoundRect(x0, curY, smW, smH, smH/2, smH/2, smHot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
        strokeRound(gr, x0, curY, smW, smH, smH/2, 1, smHot ? COL.green : RGBA(255,255,255,26));
        tC(gr, artistPopularExpanded ? 'Show less' : 'Show 5 more', FONT.plSub, smHot ? COL.green : COL.text, x0, curY, smW, smH);
        HB_ARTIST_SEE_MORE={x0:x0, y0:Math.max(curY, r.y), x1:x0+smW, y1:Math.min(curY+smH, cropY)};
      }
      curY+=smH+30;
    } else {
      curY+=24;
    }
  }

  // 4. Latest Release Spotlight Card
  if(artistLatestRelease){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Latest Release', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var lCardH=112;
    var lcY=curY;
    if(lcY+lCardH>r.y && lcY<cropY){
      var lcHov=hv(x0, Math.max(lcY, r.y), x0+w, Math.min(lcY+lCardH, cropY));
      gr.FillRoundRect(x0, lcY, w, lCardH, 10, 10, lcHov ? RGB(32,32,32) : RGB(24,24,24));
      strokeRound(gr, x0, lcY, w, lCardH, 10, 1, lcHov ? RGBA(255,255,255,28) : RGBA(255,255,255,14));

      // 96x96 cover art
      var lArtSz=88;
      var lax=x0+12, lay=lcY+12;
      drawRounded(gr, lax, lay, lArtSz, 6, artistLatestRelease.handle, artistLatestRelease.album);

      // Hover Play Button on Artwork
      if(lcHov){
        var lpb=36, lpx=lax+lArtSz-lpb-6, lpy=lay+lArtSz-lpb-6;
        gr.FillEllipse(lpx, lpy, lpb, lpb, COL.green);
        drawIcon(gr, 'play', COL.black, lpx, lpy, lpb, lpb, 18);
      }

      // Title & metadata
      var ltx=lax+lArtSz+20;
      var ltw=w-lArtSz-40;
      tL(gr, 'LATEST RELEASE', FONT.eyebrow, COL.text3, ltx, lcY+16, ltw, 16);
      tL(gr, artistLatestRelease.album, FONT.sect, lcHov ? COL.green : COL.text, ltx, lcY+36, ltw, 26);
      var curLrx=ltx;
      if(artistLatestRelease.year){
        var lYr=String(artistLatestRelease.year);
        var lYrW=Math.round(gr.CalcTextWidth(lYr, FONT.plSub));
        tL(gr, lYr, FONT.plSub, COL.white, curLrx, lcY+66, lYrW, 20);
        curLrx+=lYrW;
        var dotL=' '+CH_DOT+' ';
        var dotLW=Math.round(gr.CalcTextWidth(dotL, FONT.plSub));
        tL(gr, dotL, FONT.plSub, COL.text2, curLrx, lcY+66, dotLW, 20);
        curLrx+=dotLW;
      }
      var relTypeStr=(artistLatestRelease.tracks.length>3 ? 'Album' : 'Single/EP')+' '+CH_DOT+' ';
      var relTypeW=Math.round(gr.CalcTextWidth(relTypeStr, FONT.plSub));
      tL(gr, relTypeStr, FONT.plSub, COL.text2, curLrx, lcY+66, relTypeW, 20);
      curLrx+=relTypeW;

      var sNumStr=String(artistLatestRelease.tracks.length);
      var sNumW=Math.round(gr.CalcTextWidth(sNumStr, FONT.plSub));
      tL(gr, sNumStr, FONT.plSub, COL.white, curLrx, lcY+66, sNumW, 20);
      curLrx+=sNumW;

      var sLblStr=' song'+(artistLatestRelease.tracks.length===1?'':'s');
      tL(gr, sLblStr, FONT.plSub, COL.text2, curLrx, lcY+66, ltw-(curLrx-ltx), 20);

      HB_ARTIST_LATEST={
        x0:x0, y0:Math.max(lcY, r.y), x1:x0+w, y1:Math.min(lcY+lCardH, cropY),
        album:artistLatestRelease
      };
    }
    curY+=lCardH+36;
  }

  // 5. Discography: Albums Shelf
  if(artistAlbums && artistAlbums.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Albums', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var aCardW=140, aGap=16, aCardH=aCardW+56;
    var maxAlbs=Math.min(6, artistAlbums.length);
    for(var ai=0; ai<maxAlbs; ai++){
      var acX=x0+ai*(aCardW+aGap);
      var acY=curY;
      if(acX+aCardW>x0+w) break;

      if(acY+aCardH>r.y && acY<cropY){
        var albObj=artistAlbums[ai];
        var aHov=hv(acX-6, Math.max(acY-6, r.y), acX+aCardW+6, Math.min(acY+aCardH+6, cropY));
        if(aHov) gr.FillRoundRect(acX-6, acY-6, aCardW+12, aCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, acX, acY, aCardW, 6, albObj.handle, albObj.album);

        var aPlayBox=null;
        if(aHov){
          var apb=38, apx=acX+aCardW-apb-6, apy=acY+aCardW-apb-6;
          gr.FillEllipse(apx, apy, apb, apb, COL.green);
          drawIcon(gr, 'play', COL.black, apx, apy, apb, apb, 18);
          aPlayBox={x0:apx, y0:apy, x1:apx+apb, y1:apy+apb};
        }

        tL(gr, albObj.album, FONT.card, aHov ? COL.green : COL.text, acX, acY+aCardW+10, aCardW, 20);
        tL(gr, albObj.year || 'Album', FONT.plSub, albObj.year ? COL.white : COL.text3, acX, acY+aCardW+32, aCardW, 16);

        HB_ARTIST_ALBUMS.push({
          x0:acX-6, y0:Math.max(acY-6, r.y), x1:acX+aCardW+6, y1:Math.min(acY+aCardH+6, cropY),
          album:albObj, playBtn:aPlayBox
        });
      }
    }
    curY+=aCardH+36;
  }

  // 6. Discography: Singles & EPs Shelf
  if(artistSingles && artistSingles.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Singles and EPs', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var sCardW=140, sGap=16, sCardH=sCardW+56;
    var maxSingles=Math.min(6, artistSingles.length);
    for(var si=0; si<maxSingles; si++){
      var scX=x0+si*(sCardW+sGap);
      var scY=curY;
      if(scX+sCardW>x0+w) break;

      if(scY+sCardH>r.y && scY<cropY){
        var sObj=artistSingles[si];
        var sHov=hv(scX-6, Math.max(scY-6, r.y), scX+sCardW+6, Math.min(scY+sCardH+6, cropY));
        if(sHov) gr.FillRoundRect(scX-6, scY-6, sCardW+12, sCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, scX, scY, sCardW, 6, sObj.handle, sObj.album);

        var sPlayBox=null;
        if(sHov){
          var spb=38, spx=scX+sCardW-spb-6, spy=scY+sCardW-spb-6;
          gr.FillEllipse(spx, spy, spb, spb, COL.green);
          drawIcon(gr, 'play', COL.black, spx, spy, spb, spb, 18);
          sPlayBox={x0:spx, y0:spy, x1:spx+spb, y1:spy+spb};
        }

        tL(gr, sObj.album, FONT.card, sHov ? COL.green : COL.text, scX, scY+sCardW+10, sCardW, 20);
        tL(gr, sObj.year || 'Single', FONT.plSub, sObj.year ? COL.white : COL.text3, scX, scY+sCardW+32, sCardW, 16);

        HB_ARTIST_SINGLES.push({
          x0:scX-6, y0:Math.max(scY-6, r.y), x1:scX+sCardW+6, y1:Math.min(scY+sCardH+6, cropY),
          album:sObj, playBtn:sPlayBox
        });
      }
    }
    curY+=sCardH+36;
  }

  // 7. Appears On (Collaborations & Compilations)
  if(artistAppearsOn && artistAppearsOn.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Appears On', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var apCardW=140, apGap=16, apCardH=apCardW+56;
    for(var api=0; api<artistAppearsOn.length; api++){
      var apcX=x0+api*(apCardW+apGap);
      var apcY=curY;
      if(apcX+apCardW>x0+w) break;

      if(apcY+apCardH>r.y && apcY<cropY){
        var apAlb=artistAppearsOn[api];
        var apHov=hv(apcX-6, Math.max(apcY-6, r.y), apcX+apCardW+6, Math.min(apcY+apCardH+6, cropY));
        if(apHov) gr.FillRoundRect(apcX-6, apcY-6, apCardW+12, apCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, apcX, apcY, apCardW, 6, apAlb.handle, apAlb.name);

        tL(gr, apAlb.name, FONT.card, apHov ? COL.green : COL.text, apcX, apcY+apCardW+10, apCardW, 20);
        tL(gr, apAlb.artist || 'Compilation', FONT.plSub, COL.text3, apcX, apcY+apCardW+32, apCardW, 16);

        HB_ARTIST_APPEARS.push({
          x0:apcX-6, y0:Math.max(apcY-6, r.y), x1:apcX+apCardW+6, y1:Math.min(apcY+apCardH+6, cropY),
          album:apAlb
        });
      }
    }
    curY+=apCardH+36;
  }

  // 8. About Section: Artist Portrait & Biography Card
  if(curY+24>r.y && curY<cropY){
    tL(gr, 'About', FONT.sect, COL.text, x0, curY, w-120, 24);
    var abEbW=92, abEbH=24, abEbX=x0+w-abEbW, abEbY=curY;
    var abEbHot=hv(abEbX, Math.max(abEbY, r.y), abEbX+abEbW, Math.min(abEbY+abEbH, cropY));
    gr.FillRoundRect(abEbX, abEbY, abEbW, abEbH, abEbH/2, abEbH/2, abEbHot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
    strokeRound(gr, abEbX, abEbY, abEbW, abEbH, abEbH/2, 1, abEbHot ? COL.green : RGBA(255,255,255,30));
    tC(gr, 'Edit Bio', FONT.plSub, abEbHot ? COL.green : COL.text, abEbX, abEbY, abEbW, abEbH);
    HB_ARTIST_EDIT_BIO_BTN={x0:abEbX, y0:Math.max(abEbY, r.y), x1:abEbX+abEbW, y1:Math.min(abEbY+abEbH, cropY), artist:viewArtist};
  }
  curY+=32;

  var bioH=180;
  var bioY=curY;
  if(bioY+bioH>r.y && bioY<cropY){
    gr.FillRoundRect(x0, bioY, w, bioH, 12, 12, RGB(24,24,24));
    strokeRound(gr, x0, bioY, w, bioH, 12, 1, RGBA(255,255,255,14));

    // Circular portrait
    var bArtSz=130;
    var bax=x0+24, bay=bioY+Math.round((bioH-bArtSz)/2);
    drawCircle(gr, bax, bay, bArtSz, firstHandle, viewArtist);

    // Bio text content
    var btx=bax+bArtSz+24;
    var btw=w-bArtSz-72;

    var monthlyTxt=(meta && meta.fansFormatted) ? (meta.fansFormatted+' monthly listeners') : (artistTotalSongs+' tracks in your library');
    tL(gr, monthlyTxt, FONT.sect, COL.white, btx, bioY+20, btw, 24);

    var bioContent=(meta && meta.bio) ? meta.bio : (
      (meta && meta.desc) ? (viewArtist+' is a '+meta.desc+'.') :
      (viewArtist+' is featured in your music library with '+totalAlbs+' releases and '+artistTotalSongs+' tracks.')
    );
    // Draw bio text wrapped across up to 4 lines
    var lines=wrapText(gr, bioContent, FONT.pl, btw, 4);
    for(var li=0; li<lines.length; li++){
      tL(gr, lines[li], FONT.pl, COL.text2, btx, bioY+54+li*22, btw, 22);
    }

    var srcName = (meta && meta.imageSource) ? meta.imageSource : 'Deezer & Wikipedia';
    tL(gr, 'Verified profile via ' + srcName, FONT.eyebrow, COL.text3, btx, bioY+bioH-30, btw, 16);
  }
  curY+=bioH+64;

  // 9. Sticky Header Bar (Pins to top when scrolled past hero)
  if(scroll>230){
    gr.FillSolidRect(r.x, r.y, r.w, 52, COL.base);
    gr.FillSolidRect(r.x, r.y+51, r.w, 1, COL.line);

    // 32px circular avatar
    var savSz=32;
    drawCircle(gr, x0, r.y+10, savSz, firstHandle, viewArtist);

    // Sticky Play Button (36px)
    var spbSz=36, spbX=x0+savSz+14, spbY=r.y+8;
    var spbHot=hv(spbX, r.y+4, spbX+spbSz, r.y+4+spbSz);
    gr.FillEllipse(spbX, spbY, spbSz, spbSz, spbHot ? RGB(45,230,115) : COL.green);
    drawIcon(gr, 'play', COL.black, spbX, spbY, spbSz, spbSz, 16);
    HB_ARTIST_PLAY={x0:spbX, y0:r.y+4, x1:spbX+spbSz, y1:r.y+4+spbSz, handles:allArtistHandles};

    // Artist Name (Pure White)
    tL(gr, viewArtist, FONT.sect, COL.white, spbX+spbSz+14, r.y+12, w-spbX-spbSz, 28);
  }

  // 10. Max Scroll Calculation & Custom Scrollbar
  var totalContentH=curY+scroll-r.y;
  var viewH=r.h;
  var maxPx=Math.max(0, totalContentH-viewH+20);
  ARTIST_MAXPX=maxPx;
  artistScroll=clampPx(artistScroll, maxPx);
  artistScrollT=clampPx(artistScrollT, maxPx);

  drawScrollbar(gr, x0+w+8, r.y, r.h, artistScroll, maxPx, r.h, totalContentH, hv(x0, r.y, x0+w+16, r.y+r.h)||drag==='scroll');
}

function openArtistStudio(artistName){
  if(!artistName) return;
  var meta=getArtistMeta(artistName)||{};
  var currentBio=meta.bio||meta.desc||'';
  var currentListeners=meta.fansFormatted?meta.fansFormatted:(meta.fans?fmtNum(meta.fans):'');
  artistStudioModal={
    artist:artistName,
    bio:currentBio,
    listeners:currentListeners,
    originalBio:currentBio,
    originalListeners:currentListeners,
    activeField:'bio',
    meta:meta
  };
  caretOn=true;
  startCaret();
  applyKeyMode();
  dirtyAll=true;
  repaintAll();
  if(window.Repaint) window.Repaint();
}

function closeArtistStudio(){
  artistStudioModal=null;
  ARTIST_STUDIO_HB=null;
  applyKeyMode();
  dirtyAll=true;
  repaintAll();
  if(window.Repaint) window.Repaint();
}

function saveArtistStudio(){
  if(!artistStudioModal) return;
  var m=artistStudioModal;
  var meta=getArtistMeta(m.artist)||(m.meta||{});
  meta.name=m.artist;
  meta.bio=m.bio.trim();
  meta.isCustom=true;
  meta.imageSource=meta.imageSource||"Custom Studio";

  var lisRaw=m.listeners.replace(/[^\d]/g, '');
  if(lisRaw.length>0){
    meta.fans=parseInt(lisRaw, 10)||0;
    meta.fansFormatted=m.listeners.trim();
  } else {
    meta.fansFormatted=m.listeners.trim();
  }

  saveArtistMeta(m.artist, meta);
  closeArtistStudio();
}

function drawArtistStudioModal(gr){
  if(!artistStudioModal) return;
  ARTIST_STUDIO_HB={};
  var m=artistStudioModal;

  // Dark modal backdrop
  gr.FillSolidRect(0, 0, W, H, RGBA(0, 0, 0, 190));

  var mw=Math.min(580, W-40);
  var mh=Math.min(520, H-40);
  var mx=Math.round((W-mw)/2);
  var my=Math.round((H-mh)/2);

  // Modal Card
  gr.FillRoundRect(mx, my, mw, mh, 12, 12, RGB(24, 24, 24));
  strokeRound(gr, mx, my, mw, mh, 12, 1, RGBA(255, 255, 255, 30));
  ARTIST_STUDIO_HB.panel = {x0:mx, y0:my, x1:mx+mw, y1:my+mh};

  // Header
  tL(gr, 'Artist Profile Studio', FONT.sect2, COL.white, mx+28, my+24, mw-90, 28);
  tL(gr, 'Customize photo, monthly listeners, and bio for '+m.artist, FONT.plSub, COL.text2, mx+28, my+54, mw-90, 20);

  // Close X button
  var cbSz=32, cbX=mx+mw-24-cbSz, cbY=my+22;
  var cbHot=hv(cbX, cbY, cbX+cbSz, cbY+cbSz);
  if(cbHot) gr.FillEllipse(cbX, cbY, cbSz, cbSz, RGBA(255, 255, 255, 20));
  drawIcon(gr, 'close', cbHot ? COL.white : COL.text2, cbX+7, cbY+7, 18, 18, 14);
  ARTIST_STUDIO_HB.close={x0:cbX, y0:cbY, x1:cbX+cbSz, y1:cbY+cbSz};

  // Section 1: Portrait & Listener Count
  var pSz=80;
  var px=mx+28, py=my+92;
  drawCircle(gr, px, py, pSz, null, m.artist);
  strokeRound(gr, px, py, pSz, pSz, pSz/2, 1, RGBA(255, 255, 255, 40));

  var chTxtW=Math.round(gr.CalcTextWidth('Change Photo', FONT.meta));
  var chBtnW=Math.max(116, chTxtW+28), chBtnH=28;
  var chBtnX=px+Math.round((pSz-chBtnW)/2), chBtnY=py+pSz+10;
  var chHot=hv(chBtnX, chBtnY, chBtnX+chBtnW, chBtnY+chBtnH);
  gr.FillRoundRect(chBtnX, chBtnY, chBtnW, chBtnH, chBtnH/2, chBtnH/2, chHot ? RGBA(255, 255, 255, 30) : RGBA(255, 255, 255, 14));
  strokeRound(gr, chBtnX, chBtnY, chBtnW, chBtnH, chBtnH/2, 1, chHot ? COL.green : RGBA(255, 255, 255, 40));
  tC(gr, 'Change Photo', FONT.meta, chHot ? COL.green : COL.white, chBtnX, chBtnY, chBtnW, chBtnH);
  ARTIST_STUDIO_HB.changePhoto={x0:chBtnX, y0:chBtnY, x1:chBtnX+chBtnW, y1:chBtnY+chBtnH};

  // Listeners field (Right of portrait)
  var lX=px+pSz+30, lW=Math.max(100, (mx+mw-28)-lX);
  tL(gr, 'MONTHLY LISTENERS OR BADGE', FONT.eyebrow, COL.text3, lX, py, lW, 16);

  var lBoxY=py+22, lBoxH=38;
  var isLFoc=(m.activeField==='listeners');
  var lHot=hv(lX, lBoxY, lX+lW, lBoxY+lBoxH);
  gr.FillRoundRect(lX, lBoxY, lW, lBoxH, 6, 6, RGB(34, 34, 34));
  strokeRound(gr, lX, lBoxY, lW, lBoxH, 6, 1, isLFoc ? COL.green : (lHot ? RGBA(255, 255, 255, 50) : RGBA(255, 255, 255, 20)));

  var lTxt=m.listeners||'e.g. 24,500,000 or Local Legend';
  var lCol=m.listeners?COL.text:COL.text3;
  tL(gr, lTxt, FONT.pl, lCol, lX+12, lBoxY+8, lW-24, 22);
  if(isLFoc && caretOn){
    var cX=lX+12+Math.min(lW-30, Math.round(gr.CalcTextWidth(m.listeners, FONT.pl)));
    gr.FillSolidRect(cX, lBoxY+9, 2, 20, COL.green);
  }
  ARTIST_STUDIO_HB.listenersField={x0:lX, y0:lBoxY, x1:lX+lW, y1:lBoxY+lBoxH};

  // Section 2: Biography Text Area
  var bioAreaY=py+pSz+46;
  var bioAreaW=mw-56;
  var bioAreaH=170;
  tL(gr, 'ARTIST BIOGRAPHY', FONT.eyebrow, COL.text3, mx+28, bioAreaY, bioAreaW, 16);

  var bBoxY=bioAreaY+22;
  var isBFoc=(m.activeField==='bio');
  var bHot=hv(mx+28, bBoxY, mx+28+bioAreaW, bBoxY+bioAreaH);
  gr.FillRoundRect(mx+28, bBoxY, bioAreaW, bioAreaH, 8, 8, RGB(34, 34, 34));
  strokeRound(gr, mx+28, bBoxY, bioAreaW, bioAreaH, 8, 1, isBFoc ? COL.green : (bHot ? RGBA(255, 255, 255, 50) : RGBA(255, 255, 255, 20)));

  // Wrapped bio lines inside editor
  var bWrapW=bioAreaW-24;
  var bioDisplay=m.bio||'Write a custom bio or summary for this artist...';
  var bCol=m.bio?COL.text:COL.text3;
  var bLines=wrapText(gr, bioDisplay, FONT.pl, bWrapW, 7);
  for(var bi=0; bi<bLines.length; bi++){
    tL(gr, bLines[bi], FONT.pl, bCol, mx+40, bBoxY+12+bi*22, bWrapW, 20);
  }
  if(isBFoc && caretOn && bLines.length>0){
    var lastLine=bLines[bLines.length-1];
    var lastW=Math.round(gr.CalcTextWidth(lastLine, FONT.pl));
    var caretX=mx+40+Math.min(bWrapW-4, lastW);
    var caretY=bBoxY+12+(bLines.length-1)*22;
    gr.FillSolidRect(caretX, caretY+1, 2, 18, COL.green);
  }
  ARTIST_STUDIO_HB.bioField={x0:mx+28, y0:bBoxY, x1:mx+28+bioAreaW, y1:bBoxY+bioAreaH};

  // Bottom Buttons: Reset, Cancel, Save
  var btnH=38;
  var btnY=my+mh-btnH-24;

  // Restore Official / Clear
  var resW=140, resX=mx+28;
  var resHot=hv(resX, btnY, resX+resW, btnY+btnH);
  if(resHot) gr.FillRoundRect(resX, btnY, resW, btnH, btnH/2, btnH/2, RGBA(255, 255, 255, 14));
  strokeRound(gr, resX, btnY, resW, btnH, btnH/2, 1, resHot ? COL.white : RGBA(255, 255, 255, 30));
  tC(gr, 'Clear / Reset', FONT.plSub, resHot ? COL.white : COL.text2, resX, btnY, resW, btnH);
  ARTIST_STUDIO_HB.resetBtn={x0:resX, y0:btnY, x1:resX+resW, y1:btnY+btnH};

  // Save Button
  var saveW=120, saveX=mx+mw-28-saveW;
  var saveHot=hv(saveX, btnY, saveX+saveW, btnY+btnH);
  gr.FillRoundRect(saveX, btnY, saveW, btnH, btnH/2, btnH/2, saveHot ? RGB(45, 230, 115) : COL.green);
  tC(gr, 'Save Profile', FONT.pl, COL.black, saveX, btnY, saveW, btnH);
  ARTIST_STUDIO_HB.saveBtn={x0:saveX, y0:btnY, x1:saveX+saveW, y1:btnY+btnH};

  // Cancel Button
  var canW=90, canX=saveX-14-canW;
  var canHot=hv(canX, btnY, canX+canW, btnY+btnH);
  if(canHot) gr.FillRoundRect(canX, btnY, canW, btnH, btnH/2, btnH/2, RGBA(255, 255, 255, 14));
  strokeRound(gr, canX, btnY, canW, btnH, btnH/2, 1, canHot ? COL.white : RGBA(255, 255, 255, 30));
  tC(gr, 'Cancel', FONT.plSub, canHot ? COL.white : COL.text2, canX, btnY, canW, btnH);
  ARTIST_STUDIO_HB.cancelBtn={x0:canX, y0:btnY, x1:canX+canW, y1:btnY+btnH};
}
