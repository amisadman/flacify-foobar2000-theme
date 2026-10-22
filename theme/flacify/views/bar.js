/* flacify/views/bar.js -- bottom playback bar
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

function ctrlBtn(gr,name,cx,cyc,active,act,rad,isz){
  rad=rad||18; isz=isz||22;
  drawIcon(gr,name,active?COL.green:(hv(cx-rad,cyc-rad,cx+rad,cyc+rad)?COL.text:COL.text2),cx-rad,cyc-rad,rad*2,rad*2,isz);
  HB_CTRL.push({x0:cx-rad,y0:cyc-rad,x1:cx+rad,y1:cyc+rad,act:act});
}
// seek / volume track: filled progress on a dim rail, with a generously padded hitbox
function drawTrackBar(gr,x,y,w,th,trackCol,pos){
  gr.FillSolidRect(x,y,w,th,trackCol);
  if(pos>0) gr.FillSolidRect(x,y,Math.max(1,Math.round(w*pos)),th,COL.text);
  return {x0:x,y0:y-10,x1:x+w,y1:y+10+th,x:x,w:w};
}
function getAudioBadge(h){
  if(!h) return null;
  var codec=(TF.codec.EvalWithMetadb(h)||'').toUpperCase();
  var bits=parseInt(TF.bitdepth.EvalWithMetadb(h),10)||0;
  var rate=parseInt(TF.samplerate.EvalWithMetadb(h),10)||0;
  var isLossless=(codec==='FLAC'||codec==='ALAC'||codec==='WAV'||codec==='AIFF'||codec==='APE'||codec==='WAVPACK'||codec.indexOf('DSD')>=0);
  var isHiRes=(bits>=24||rate>=88200||codec.indexOf('DSD')>=0);

  if(!codec && !bits && !rate) return null;

  var rateStr='';
  if(rate>=1000){
    var khz=rate/1000;
    rateStr=(rate%1000?khz.toFixed(1):Math.round(khz))+' kHz';
  } else if(rate>0){
    rateStr=rate+' Hz';
  }

  var label='';
  if(isHiRes){
    label='HI-RES LOSSLESS';
    if(bits && rateStr) label+=' '+bits+'B/'+rateStr;
    else if(bits) label+=' '+bits+'-BIT';
    else if(rateStr) label+=' '+rateStr;
    return {text:label,isHiRes:true,isLossless:true};
  } else if(isLossless){
    label='LOSSLESS';
    if(bits && bits!==16) label+=' '+bits+'-BIT';
    if(rateStr && rateStr!=='44.1 kHz') label+=' '+rateStr;
    return {text:label,isHiRes:false,isLossless:true};
  } else {
    var br=TF.bitrate.EvalWithMetadb(h);
    label=codec||'LOSSY';
    if(br) label+=' '+br+' kbps';
    return {text:label,isHiRes:false,isLossless:false};
  }
}

function drawBar(gr){
  HB_CTRL=[];
  var by=R.barY;
  gr.FillSolidRect(0,by,W,M.barH,COL.black);

  // Dynamic Ambient Top-Edge Glow
  var glowCol = (typeof getSmoothAmbientGlow === 'function') ? getSmoothAmbientGlow(65) : RGBA(30,215,96,40);
  gr.FillGradRect(0, by, W, 4, 90, glowCol, RGBA(0,0,0,0), 1.0);

  var playing=fb.IsPlaying&&!fb.IsPaused;
  var cxC=Math.round(W/2);

  // left: cover + title/artist + heart + lossless badge
  var cs=64, cx=16, cy=by+(M.barH-cs)/2;
  if(NP && typeof drawArtworkAura === 'function'){
    drawArtworkAura(gr, cx, cy, cs, 5, glowCol);
  }
  drawCover(gr,cx,cy,cs,5,NP,'np');
  if(NP) HB_CTRL.push({x0:cx,y0:cy,x1:cx+cs,y1:cy+cs,act:'details'});

  var tx=cx+cs+14;
  var maxLeftW=Math.max(180, Math.min(340, cxC-130-tx));

  if(NP){
    // 1. Title line with Heart button & Plus (+) button
    var maxTitleW=Math.max(60, maxLeftW-64);
    var tw=Math.min(maxTitleW, Math.max(40, Math.round(gr.CalcTextWidth(npTitleStr, FONT.npTitle))));
    tL(gr, npTitleStr, FONT.npTitle, COL.text, tx, by+24, tw, 22);

    var hx=tx+tw+10, hy=by+23, hs=22;
    var liked=isLiked(NP);
    var hHot=hv(hx-4, hy-2, hx+hs+4, hy+hs+2);
    var hCol=liked?COL.green:(hHot?COL.text:COL.text2);
    drawIcon(gr, liked?'heartFilled':'heart', hCol, hx, hy, hs, hs, 18);
    HB_CTRL.push({x0:hx-6, y0:hy-4, x1:hx+hs+6, y1:hy+hs+4, act:'like'});

    var px=hx+hs+8, py=by+23, ps=22;
    var pHot=hv(px-4, py-2, px+ps+4, py+ps+2);
    drawIcon(gr, 'add', pHot?COL.text:COL.text2, px, py, ps, ps, 18);
    HB_CTRL.push({x0:px-6, y0:py-4, x1:px+ps+6, y1:py+ps+4, act:'add_to_pl'});

    // 2. Artist line with Quality Badge
    var badge=getAudioBadge(NP);
    var bw=0, bh=18;
    if(badge){
      bw=Math.min(160, Math.round(gr.CalcTextWidth(badge.text, FONT.badge))+14);
    }

    var maxArtW=Math.max(30, maxLeftW-(badge?bw+8:0));
    var aw=Math.min(maxArtW, Math.round(gr.CalcTextWidth(npArtistStr, FONT.npArtist)));
    tL(gr, npArtistStr, FONT.npArtist, COL.text2, tx, by+50, aw, 18);

    if(badge){
      var bx=tx+aw+10, byBadge=by+49;
      var bHot=hv(bx, byBadge, bx+bw, byBadge+bh);
      var bBg=badge.isHiRes?(bHot?RGBA(30,215,96,48):RGBA(30,215,96,22)):
              (badge.isLossless?(bHot?RGBA(255,255,255,30):RGBA(255,255,255,14)):
              (bHot?RGBA(255,255,255,20):RGBA(255,255,255,8)));
      var bBorder=badge.isHiRes?(bHot?RGBA(30,215,96,200):RGBA(30,215,96,110)):
                  (badge.isLossless?(bHot?RGBA(255,255,255,150):RGBA(255,255,255,60)):
                  (bHot?RGBA(255,255,255,100):RGBA(255,255,255,40)));
      var bCol=badge.isHiRes?COL.green:(badge.isLossless?(bHot?COL.white:COL.text):COL.text2);

      gr.FillRoundRect(bx, byBadge, bw, bh, 3, 3, bBg);
      gr.DrawRoundRect(bx, byBadge, bw, bh, 3, 3, 1, bBorder);
      gr.GdiDrawText(badge.text, FONT.badge, bCol, bx, byBadge, bw, bh, DT_C);
      HB_CTRL.push({x0:bx, y0:byBadge, x1:bx+bw, y1:byBadge+bh, act:'details'});
    }
  } else {
    tL(gr, 'FLACify', FONT.npTitle, COL.text2, tx, by+26, 260, 20);
    tL(gr, 'Ready to play lossless music', FONT.npArtist, COL.text3, tx, by+50, 260, 18);
  }
  // center: transport row + seekbar
  cxC=Math.round(W/2);
  var pcy=by+34, pb=hv(cxC-27,by+7,cxC+27,by+61)?52:48, pbx=cxC-pb/2, pby=pcy-pb/2;
  ctrlBtn(gr,'shuffle',cxC-108,pcy,pbShuffle,'shuffle',22,26);
  ctrlBtn(gr,'prev',cxC-58,pcy,false,'prev',22,26);
  gr.FillEllipse(pbx,pby,pb,pb,COL.text);
  drawIcon(gr,playing?'pause':'play',COL.black,pbx,pby,pb,pb,Math.round(pb*0.5));
  HB_CTRL.push({x0:pbx,y0:pby,x1:pbx+pb,y1:pby+pb,act:'play'});
  ctrlBtn(gr,'next',cxC+58,pcy,false,'next',22,26);
  ctrlBtn(gr,pbRepeat===2?'repeat1':'repeat',cxC+108,pcy,pbRepeat>0,'repeat',22,26);
  var sbW=Math.min(Math.round(W*0.36),560), sbX=cxC-sbW/2, sbY=by+74;
  var len=fb.PlaybackLength, pos=(drag==='seek')?dragFrac:(len>0?fb.PlaybackTime/len:0);
  HB_SEEK=drawTrackBar(gr,sbX,sbY,sbW,5,COL.seekbg,pos);
  tR(gr,fmtTime((drag==='seek')?len*dragFrac:fb.PlaybackTime),FONT.time,COL.white,sbX-54,sbY-7,46,17);
  tL(gr,fmtTime(len),FONT.time,COL.white,sbX+sbW+10,sbY-7,46,17);
  // right: volume + fullscreen + sleep timer
  var gearC=by+M.barH/2, fsx=W-46;
  drawIcon(gr,'expand',hv(fsx-8,gearC-16,fsx+30,gearC+16)?COL.text:COL.text2,fsx,gearC-13,26,26,22);
  HB_CTRL.push({x0:fsx-8,y0:gearC-16,x1:fsx+30,y1:gearC+16,act:'fullscreen'});
  var volW=104, volX=fsx-24-volW, volY=gearC-2;
  var isMuted=(fb.Volume<=-99);
  var spkIco=isMuted?'volumeMute':'volume';
  var spkX=volX-32, spkY=gearC-13, spkW=26, spkH=26;
  var spkHov=hv(spkX-6,gearC-16,spkX+spkW+4,gearC+16);
  var spkCol=spkHov?COL.text:(isMuted?RGB(220,80,80):COL.text2);
  drawIcon(gr,spkIco,spkCol,spkX,spkY,spkW,spkH,22);
  HB_CTRL.push({x0:spkX-6,y0:gearC-16,x1:spkX+spkW+4,y1:gearC+16,act:'mute'});
  HB_VOL=drawTrackBar(gr,volX,volY,volW,5,COL.seekbg,isMuted?0:clamp01(vol2pos(fb.Volume)));

  // sleep timer button / active countdown badge
  var stActive=(typeof sleepTimer!=='undefined' && sleepTimer.active);
  var stStr=stActive ? formatSleepTimerRemaining() : '';
  var stW=stActive ? (Math.round(gr.CalcTextWidth(stStr, FONT.plSub))+38) : 26;
  var stX=spkX-14-stW, stY=gearC-13;
  var stHov=hv(stX-4, gearC-16, stX+stW+4, gearC+16);
  if(stActive){
    gr.FillRoundRect(stX, gearC-14, stW, 26, 13, 13, stHov ? RGBA(30,215,96,40) : RGBA(30,215,96,20));
    strokeRound(gr, stX, gearC-14, stW, 26, 13, 1, stHov ? COL.green : RGBA(30,215,96,120));
    drawIcon(gr, 'moon', COL.green, stX+8, gearC-8, 14, 14, 12);
    tL(gr, stStr, FONT.plSub, COL.green, stX+26, gearC-11, stW-30, 22);
  } else {
    drawIcon(gr, 'timer', stHov ? COL.text : COL.text2, stX, stY, 26, 26, 20);
  }
  HB_CTRL.push({x0:stX-4, y0:gearC-16, x1:stX+stW+4, y1:gearC+16, act:'sleep_timer'});

  // 1-Click Audio Output Device Switcher (headphones / DAC)
  var devX=stX-32, devY=gearC-13, devW=26, devH=26;
  var devHov=hv(devX-4, gearC-16, devX+devW+4, gearC+16);
  drawIcon(gr,'headphones',devHov?COL.text:COL.text2,devX,devY,devW,devH,20);
  HB_CTRL.push({x0:devX-4, y0:gearC-16, x1:devX+devW+4, y1:gearC+16, act:'device_picker'});

  // Parametric EQ Curve Preset Quick-Toggle
  var eqX=devX-30, eqY=gearC-13, eqW=26, eqH=26;
  var eqHov=hv(eqX-4, gearC-16, eqX+eqW+4, gearC+16);
  drawIcon(gr,'equalizer',eqHov?COL.text:COL.text2,eqX,eqY,eqW,eqH,18);
  HB_CTRL.push({x0:eqX-4, y0:gearC-16, x1:eqX+eqW+4, y1:gearC+16, act:'eq_modal'});
}
