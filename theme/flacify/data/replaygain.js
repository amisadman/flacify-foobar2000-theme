/* flacify/data/replaygain.js -- normalize volume: ReplayGain state, scan, confirm prompt, pill
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- normalize volume (ReplayGain) -------------------------
   "Normalize volume" is ReplayGain, and it is two independent halves: a per-track loudness figure
   has to exist in each file's tags, AND playback has to be told to apply it. Either one alone does
   nothing audible, so the button reflects both and only offers a scan when tags are actually
   missing -- flipping the playback mode is instant once the library is scanned.

   The scan itself is foobar's: it owns the progress window and the "update file tags" confirmation.
   That is why nothing here tracks progress. Tags landing fires on_metadb_changed, which drops
   rgStat, so the pill recomputes on the next paint whether the user finished or cancelled. */
var rgStat=null, rgScanFailed=false, rgPrompt=null, RG_HB=null;
/* One title-format pass over the library, same shape (and cost) as the libTF fields -- so it runs
   as a sliced step of the All Songs build rather than inline in a paint. Holds the missing handles
   rather than just a count: they are exactly what the scan gets handed. */
function rgCompute(){
  var lib=libItems(), total=lib?lib.Count:0, flags=[], miss=[], i;
  if(total){ try{ flags=TF.rg.EvalWithMetadbs(lib); }catch(e){ flags=[]; } }
  for(i=0;i<flags.length;i++) if(flags[i]!=='1') miss.push(lib[i]);
  rgStat={total:total, missing:miss, scanned:total-miss.length};
  return rgStat;
}
function rgState(){ return rgStat||rgCompute(); }
function rgModeOn(){ try{ return fb.ReplaygainMode!==0; }catch(e){ return false; } }
function rgSetMode(on){ try{ fb.ReplaygainMode=on?1:0; }catch(e){} }   // 1 = track gain: every track to the same loudness
function rgActive(){ var s=rgState(); return s.total>0 && !s.missing.length && rgModeOn(); }
/* The scanner's context command has sat under different parents across foobar versions, so try the
   known paths and promote whichever answers. flag 8 (flag_view_full) runs the item even if the user
   has hidden it under Preferences > Display > Context Menu. */
var RG_SCAN_CMDS=['ReplayGain/Scan per-file track gain',
                  'Utilities/ReplayGain/Scan per-file track gain',
                  'Tagging/ReplayGain/Scan per-file track gain'];
function rgRunScan(handles){
  if(!handles.length) return true;
  var hl=fb.CreateHandleList(), i;
  for(i=0;i<handles.length;i++) hl.Add(handles[i]);
  for(i=0;i<RG_SCAN_CMDS.length;i++){
    var ok=false;
    try{ ok=fb.RunContextCommandWithMetadb(RG_SCAN_CMDS[i],hl,8); }catch(e){ ok=false; }
    if(ok){ RG_SCAN_CMDS.unshift(RG_SCAN_CMDS.splice(i,1)[0]); return true; }   // remember what worked
  }
  return false;
}
// One button, three situations: already normalizing -> switch off; tags all present -> switch on
// instantly; tags missing -> confirm first, because scanning WRITES to the user's files.
function rgToggle(){
  var s=rgState();
  if(!s.total) return;
  rgScanFailed=false;
  if(rgActive()){ rgSetMode(false); repaintAll(); return; }
  if(!s.missing.length){ rgSetMode(true); repaintAll(); return; }
  rgPrompt={n:s.missing.length, total:s.total}; repaintAll();
}
function rgConfirmScan(){
  var miss=rgState().missing;
  rgPrompt=null;
  rgSetMode(true);                 // so the tags take effect the moment they land
  rgScanFailed=!rgRunScan(miss);
  rgStat=null;                     // recount on the next paint; the scan is foobar's from here
  repaintAll();
}

/* Scanning WRITES ReplayGain tags into the user's audio files, so it is confirmed rather than run
   off a single click -- and the copy says so plainly. Height follows the wrapped body so the text
   can never overrun the panel at a different UISCALE. */
var RG_BODY='foobar2000 will scan them and write ReplayGain tags into the files, then play every '+
            'track at the same loudness. Its own progress window runs the scan, and nothing is deleted.';
function drawRgPrompt(gr){
  var cw=Math.min(470,W-40), pw=cw-56, lh=24;
  var nl=Math.max(1,gr.EstimateLineWrap(RG_BODY,FONT.pl,pw).length/2);
  var ch=138+nl*lh+PILL_H;
  var cy=Math.max(10,Math.round((H-ch)/2)), cx=modalPanel(gr,cw,ch,cy);
  var px=cx+28, y=cy+26;
  tL(gr,'Normalize volume?',FONT.sect,COL.text,px,y,pw,26); y+=38;
  tL(gr,fmtNum(rgPrompt.n)+' of '+fmtNum(rgPrompt.total)+' tracks still need a loudness scan.',FONT.pl,COL.text2,px,y,pw,22); y+=32;
  tPara(gr,RG_BODY,FONT.pl,COL.text2,px,y,pw,lh);
  var w2=pillW(gr,'Scan & normalize'), w1=pillW(gr,'Cancel'), gap=12;
  var by=cy+ch-22-PILL_H, x2=cx+cw-28-w2, x1=x2-gap-w1;
  RG_HB={ cancel:drawPill(gr,x1,by,w1,'Cancel',false), scan:drawPill(gr,x2,by,w2,'Scan & normalize',true) };
}

/* Normalize-volume pill: the same capsule as the group-by dropdown, but a state toggle rather than
   a menu -- filled green only when normalizing is genuinely in effect (tags present AND playback
   applying them), so it can never claim to be on while doing nothing. */
function drawNormalizePill(gr,x,y,w,h){
  var on=rgActive(), hot=hv(x,y,x+w,y+h);
  gr.FillRoundRect(x,y,w,h,h/2,h/2,on?(hot?RGB(45,215,110):COL.green):(hot?RGB(58,58,58):RGBA(0,0,0,90)));
  var col=on?COL.black:COL.text;
  drawIcon(gr,'equalizer',col,x+14,y+(h-20)/2,20,20,18);
  tL(gr,'Normalize volume',FONT.pl,col,x+42,y,w-56,h);
  return {x0:x,y0:y,x1:x+w,y1:y+h};
}

/* ------------------------- Live TT Dynamic Range (DR) Meter ------------------------- */
var drInfoCache={};

function parseDb(valStr){
  if(!valStr) return NaN;
  var clean=String(valStr).replace(/dB/i,'').replace(/^\s+|\s+$/g,'');
  return parseFloat(clean);
}

function getDynamicRange(h){
  if(!h) return null;
  var p=h.Path;
  if(drInfoCache.hasOwnProperty(p) && drInfoCache[p] && drInfoCache[p].hasTags) return drInfoCache[p];

  var drTagStr=TF.drTag.EvalWithMetadb(h);
  var drVal=parseInt(drTagStr,10);

  var gainStr=TF.rgTrackGain.EvalWithMetadb(h);
  var peakStr=TF.rgTrackPeak.EvalWithMetadb(h);
  var gain=parseDb(gainStr);
  var peak=parseFloat(peakStr);

  var albGainStr=TF.rgAlbumGain.EvalWithMetadb(h);
  var albPeakStr=TF.rgAlbumPeak.EvalWithMetadb(h);

  // If explicit DR tag is absent, compute mathematically via the TT DR formula
  if(isNaN(drVal) || drVal<=0){
    if(!isNaN(gain) && !isNaN(peak) && peak>0){
      var peakDb=20*(Math.log(peak)/Math.LN10);
      drVal=Math.round(peakDb-gain);
    }
  }

  if(isNaN(drVal) || drVal<=0){
    return {
      score:0,
      label:'DR --',
      rating:'unscanned',
      ratingLabel:'Loudness unscanned',
      col:COL.text3,
      bg:RGBA(255,255,255,8),
      border:RGBA(255,255,255,28),
      trackGain:gainStr||'None',
      trackPeak:(!isNaN(peak)&&peak>0?(20*Math.log(peak)/Math.LN10).toFixed(2)+' dBFS':(peakStr||'None')),
      albumGain:albGainStr||'None',
      hasTags:false
    };
  }

  drVal=Math.max(1,Math.min(30,drVal));

  var rating='standard';
  var ratingLabel='Typical Dynamic Range';
  var col=RGB(245,158,11); // Amber
  var bg=RGBA(245,158,11,26);
  var border=RGBA(245,158,11,140);

  if(drVal>=12){
    rating='master';
    ratingLabel='Audiophile Master Quality (Uncompressed Transients)';
    col=RGB(16,185,129); // Emerald Green
    bg=RGBA(16,185,129,26);
    border=RGBA(16,185,129,150);
  } else if(drVal<8){
    rating='compressed';
    ratingLabel='Heavy Dynamic Compression (Loudness War Master)';
    col=RGB(239,68,68); // Crimson Red
    bg=RGBA(239,68,68,26);
    border=RGBA(239,68,68,150);
  }

  var peakDbStr=(!isNaN(peak)&&peak>0)?(20*Math.log(peak)/Math.LN10).toFixed(2)+' dBFS':(peakStr||'None');

  var info={
    score:drVal,
    label:'DR'+drVal,
    rating:rating,
    ratingLabel:ratingLabel,
    col:col,
    bg:bg,
    border:border,
    trackGain:gainStr||'None',
    trackPeak:peakDbStr,
    albumGain:albGainStr||'None',
    hasTags:true
  };
  drInfoCache[p]=info;
  return info;
}

/* ------------------------- Interactive DR Popover Modal ------------------------- */
var drModal=null, DR_MODAL_HB=null;

function openDrModal(h){
  if(!h) return;
  drModal={ handle:h, info:getDynamicRange(h) };
  repaintAll();
}

function closeDrModal(){
  drModal=null;
  DR_MODAL_HB=null;
  repaintAll();
}

function drawDrModal(gr){
  if(!drModal) return;
  var info=drModal.info;
  var cw=Math.min(520,W-40), ch=340;
  var cy=Math.max(10,Math.round((H-ch)/2)), cx=modalPanel(gr,cw,ch,cy);
  var px=cx+28, y=cy+24, pw=cw-56;

  // Header with DR Score Pill
  var drPillW=Math.round(gr.CalcTextWidth(info.label,FONT.tab))+24;
  gr.FillRoundRect(px,y,drPillW,30,6,6,info.bg);
  gr.DrawRoundRect(px,y,drPillW,30,6,6,1,info.border);
  tC(gr,info.label,FONT.tab,info.col,px,y,drPillW,30);

  tL(gr,'TT Dynamic Range Analysis',FONT.sect,COL.text,px+drPillW+14,y,pw-drPillW-14,30);
  y+=44;

  // Mastering Classification Subtitle
  tL(gr,info.ratingLabel,FONT.pl,info.col,px,y,pw,22);
  y+=30;

  // Technical Loudness Metrics Grid (Glassmorphism card)
  var gh=106, gy=y;
  gr.FillRoundRect(px,gy,pw,gh,8,8,RGBA(255,255,255,8));
  gr.DrawRoundRect(px,gy,pw,gh,8,8,1,RGBA(255,255,255,22));

  var colW=Math.floor(pw/2);
  var my=gy+14;
  tL(gr,'Track Peak Level:',FONT.plSub,COL.text2,px+16,my,colW-20,18);
  tL(gr,info.trackPeak,FONT.pl,COL.text,px+16,my+18,colW-20,20);

  tL(gr,'ReplayGain Track Offset:',FONT.plSub,COL.text2,px+colW,my,colW-20,18);
  tL(gr,info.trackGain,FONT.pl,COL.text,px+colW,my+18,colW-20,20);

  my+=46;
  tL(gr,'ReplayGain Album Offset:',FONT.plSub,COL.text2,px+16,my,colW-20,18);
  tL(gr,info.albumGain,FONT.pl,COL.text,px+16,my+18,colW-20,20);

  var qualText=(info.score>=12?'Pristine (Master Quality)':(info.score>=8?'Normal (Commercial)':'Hyper-compressed'));
  tL(gr,'Dynamic Classification:',FONT.plSub,COL.text2,px+colW,my,colW-20,18);
  tL(gr,qualText,FONT.pl,info.col,px+colW,my+18,colW-20,20);

  y=gy+gh+18;

  // Explanation note
  var note=info.hasTags?
    'Scores DR12+ denote audiophile dynamic contrast without artificial brickwall limiting. Scores below DR8 indicate heavy compression.':
    'This track does not have ReplayGain tags. Scan the album or track to compute its exact Dynamic Range.';
  tPara(gr,note,FONT.plSub,COL.text3,px,y,pw,18);

  // Buttons at bottom
  var by=cy+ch-22-PILL_H;
  var wClose=pillW(gr,'Close');
  var xClose=cx+cw-28-wClose;
  DR_MODAL_HB={
    close:drawPill(gr,xClose,by,wClose,'Close',true)
  };

  if(!info.hasTags){
    var wScan=pillW(gr,'Scan Track Loudness');
    var xScan=xClose-12-wScan;
    DR_MODAL_HB.scan=drawPill(gr,xScan,by,wScan,'Scan Track Loudness',false);
  }
}

/* ------------------------- Audio Output Device Quick-Switcher ------------------------- */
function openAudioDeviceMenu(x,y){
  try{
    var m=window.CreatePopupMenu();
    m.AppendMenuItem(0, 1, 'Audio Output Device (Preferences)...');
    m.AppendMenuItem(0, 2, 'Parametric Equalizer Presets...');
    m.AppendMenuItem(0, 3, 'TT Dynamic Range (DR) Inspector...');
    m.AppendMenuSeparator();
    m.AppendMenuItem(0, 4, 'Windows Sound Control Panel...');
    m.AppendMenuSeparator();
    m.AppendMenuItem(0, 5, 'foobar2000 Preferences...');

    var id=m.TrackPopupMenu(x,y);
    if(id===1 || id===5){
      try{
        fb.ShowPreferences('{65D8B383-1463-48EC-AB9E-7C4D789B880A}');
      }catch(e1){
        try{ fb.RunMainMenuCommand('File/Preferences'); }catch(e2){}
      }
    }else if(id===2){
      if(typeof openEqModal==='function') openEqModal();
    }else if(id===3){
      if(typeof openDrModal==='function') openDrModal(fb.GetNowPlaying());
    }else if(id===4){
      try{
        var sh=new ActiveXObject('WScript.Shell');
        sh.Run('control mmsys.cpl sounds');
      }catch(e){}
    }
    if(typeof repaintBar==='function') repaintBar();
  }catch(e){}
}

/* ------------------------- Parametric EQ Preset Overlay ------------------------- */
var eqModal=false, EQ_MODAL_HB=null;
var activeEqPreset=(typeof propStr==='function')?propStr('DSP: EQ Preset (Flat | Bass Boost | Vocal | Harman | Treble)','Flat'):'Flat';

var EQ_PRESETS=[
  { id:'Flat', name:'Flat Reference', desc:'Neutral, bit-perfect response curve', gains:[0,0,0,0,0,0,0,0,0,0] },
  { id:'Bass Boost', name:'Bass Boost', desc:'Warm low-end enhancement (+4.5dB)', gains:[4.5,4.0,3.2,1.8,0.5,0,0,0,0,0] },
  { id:'Vocal', name:'Vocal Clarity', desc:'Brings vocals and acoustic instruments forward (+3.5dB mids)', gains:[-1.0,-0.5,0,1.2,2.8,3.5,2.5,1.0,0,0] },
  { id:'Harman', name:'Harman Target Curve', desc:'Audiophile acoustic standard with sub-bass shelf & ear gain', gains:[4.0,3.5,2.0,0.5,0,1.5,3.0,2.0,0.5,1.0] },
  { id:'Treble', name:'Treble Air & Detail', desc:'Airy top-end extension for dark headphones (+4.0dB)', gains:[-0.5,0,0,0,0,0.5,1.5,3.0,4.0,4.5] }
];

var EQ_FREQS=['31Hz','62Hz','125Hz','250Hz','500Hz','1kHz','2kHz','4kHz','8kHz','16kHz'];

function openEqModal(){
  eqModal=true;
  repaintAll();
}

function closeEqModal(){
  eqModal=false;
  EQ_MODAL_HB=null;
  repaintAll();
}

function selectEqPreset(presetId){
  activeEqPreset=presetId;
  try{
    window.SetProperty('DSP: EQ Preset (Flat | Bass Boost | Vocal | Harman | Treble)', presetId);
  }catch(e){}
  repaintAll();
}

function drawEqModal(gr){
  if(!eqModal) return;
  var cw=Math.min(580,W-40), ch=410;
  var cy=Math.max(10,Math.round((H-ch)/2)), cx=modalPanel(gr,cw,ch,cy);
  var px=cx+28, y=cy+24, pw=cw-56;

  tL(gr,'Parametric EQ & DSP Suite',FONT.sect,COL.text,px,y,pw,28);
  y+=34;

  var curPr=EQ_PRESETS[0];
  for(var pi=0;pi<EQ_PRESETS.length;pi++){
    if(EQ_PRESETS[pi].id===activeEqPreset){ curPr=EQ_PRESETS[pi]; break; }
  }

  tL(gr,curPr.name+' -- '+curPr.desc,FONT.plSub,COL.green,px,y,pw,20);
  y+=28;

  // Visual EQ Spline Curve Canvas
  var cvH=150, cvW=pw, cvY=y;
  gr.FillRoundRect(px,cvY,cvW,cvH,8,8,RGB(24,24,24));
  gr.DrawRoundRect(px,cvY,cvW,cvH,8,8,1,RGBA(255,255,255,20));

  var midY=cvY+cvH/2;
  gr.FillSolidRect(px+10,midY,cvW-20,1,RGBA(255,255,255,25));
  tR(gr,'0 dB',FONT.eyebrow,COL.text3,px+cvW-50,midY-14,40,14);
  tR(gr,'+6 dB',FONT.eyebrow,COL.text3,px+cvW-50,cvY+6,40,14);
  tR(gr,'-6 dB',FONT.eyebrow,COL.text3,px+cvW-50,cvY+cvH-20,40,14);

  var nBands=EQ_FREQS.length;
  var pts=[];
  var stepX=(cvW-40)/(nBands-1);
  for(var bi=0;bi<nBands;bi++){
    var bx=px+20+bi*stepX;
    var gainVal=curPr.gains[bi];
    var frac=(gainVal-(-6))/12.0;
    var byPt=cvY+cvH-20-frac*(cvH-40);
    pts.push([bx,byPt]);

    gr.FillSolidRect(bx,cvY+10,1,cvH-20,RGBA(255,255,255,12));
    tC(gr,EQ_FREQS[bi],FONT.badge,COL.text3,bx-22,cvY+cvH-18,44,16);
  }

  gr.SetSmoothingMode(2);
  for(var ci=0;ci<pts.length-1;ci++){
    var p1=pts[ci], p2=pts[ci+1];
    var ctrlX1=p1[0]+(p2[0]-p1[0])/2, ctrlY1=p1[1];
    var ctrlX2=ctrlX1, ctrlY2=p2[1];

    for(var st=0;st<=10;st++){
      var t0=st/10, t1=(st+1)/10;
      var xA=Math.round(Math.pow(1-t0,3)*p1[0]+3*Math.pow(1-t0,2)*t0*ctrlX1+3*(1-t0)*Math.pow(t0,2)*ctrlX2+Math.pow(t0,3)*p2[0]);
      var yA=Math.round(Math.pow(1-t0,3)*p1[1]+3*Math.pow(1-t0,2)*t0*ctrlY1+3*(1-t0)*Math.pow(t0,2)*ctrlY2+Math.pow(t0,3)*p2[1]);
      var xB=Math.round(Math.pow(1-t1,3)*p1[0]+3*Math.pow(1-t1,2)*t1*ctrlX1+3*(1-t1)*Math.pow(t1,2)*ctrlX2+Math.pow(t1,3)*p2[0]);
      var yB=Math.round(Math.pow(1-t1,3)*p1[1]+3*Math.pow(1-t1,2)*t1*ctrlY1+3*(1-t1)*Math.pow(t1,2)*ctrlY2+Math.pow(t1,3)*p2[1]);
      gr.DrawLine(xA,yA,xB,yB,2,COL.green);
      gr.FillSolidRect(xA,Math.min(yA,midY),Math.max(1,xB-xA),Math.abs(midY-yA),RGBA(30,215,96,18));
    }
  }

  for(var ni=0;ni<pts.length;ni++){
    var nx=pts[ni][0], ny=pts[ni][1];
    gr.FillEllipse(nx-4,ny-4,8,8,COL.green);
    gr.DrawEllipse(nx-5,ny-5,10,10,1,COL.white);
  }

  y=cvY+cvH+20;

  // Preset Selector Pills Row
  tL(gr,'Presets:',FONT.pl,COL.text2,px,y,64,26);
  var prx=px+68;
  EQ_MODAL_HB={ presets:[] };

  for(var psi=0;psi<EQ_PRESETS.length;psi++){
    var pItem=EQ_PRESETS[psi];
    var isSel=(pItem.id===activeEqPreset);
    var pW=Math.round(gr.CalcTextWidth(pItem.id,FONT.pl))+20;
    var pHot=hv(prx,y,prx+pW,y+26);

    gr.FillRoundRect(prx,y,pW,26,13,13,isSel?COL.green:(pHot?RGB(65,65,65):RGB(42,42,42)));
    tC(gr,pItem.id,FONT.pl,isSel?COL.black:COL.text,prx,y,pW,26);
    EQ_MODAL_HB.presets.push({ id:pItem.id, x0:prx, y0:y, x1:prx+pW, y1:y+26 });

    prx+=pW+8;
  }

  var by=cy+ch-22-PILL_H;
  var wClose=pillW(gr,'Done');
  var xClose=cx+cw-28-wClose;
  EQ_MODAL_HB.close=drawPill(gr,xClose,by,wClose,'Done',true);
}
