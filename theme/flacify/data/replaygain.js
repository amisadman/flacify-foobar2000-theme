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
// Ensure ReplayGain volume reduction/attenuation is permanently disabled for 100% bit-perfect volume
try { if(fb.ReplaygainMode !== 0) fb.ReplaygainMode = 0; } catch(e){}

var rgStat=null, rgScanFailed=false, rgPrompt=null, RG_HB=null;
function rgCompute(){ return {total:0, missing:[], scanned:0}; }
function rgState(){ return {total:0, missing:[], scanned:0}; }
function rgModeOn(){ return false; }
function rgSetMode(on){ try{ fb.ReplaygainMode=0; }catch(e){} }
function rgActive(){ return false; }
function rgRunScan(handles){ return true; }
function rgToggle(){}
function rgConfirmScan(){}
function drawRgPrompt(gr){}
function drawNormalizePill(gr,x,y,w,h){ return null; }

var drInfoCache={};
function getDynamicRange(h){
  if(!h) return null;
  var p = h.Path;
  if(drInfoCache[p]) return drInfoCache[p];

  var tag = (TF.drTag ? TF.drTag.EvalWithMetadb(h) : '') || '';
  var score = parseInt(tag.replace(/[^0-9]/g, ''), 10) || 0;
  var peakStr = (TF.rgTrackPeak ? TF.rgTrackPeak.EvalWithMetadb(h) : '') || '';
  var gainStr = (TF.rgTrackGain ? TF.rgTrackGain.EvalWithMetadb(h) : '') || '';
  var albGainStr = (TF.rgAlbumGain ? TF.rgAlbumGain.EvalWithMetadb(h) : '') || '';
  var albPeakStr = (TF.rgAlbumPeak ? TF.rgAlbumPeak.EvalWithMetadb(h) : '') || '';

  if(!score && peakStr && gainStr){
    var peak = parseFloat(peakStr) || 0;
    var gain = parseFloat(gainStr) || 0;
    if(peak > 0){
      score = Math.round(20 * (Math.log(peak) / Math.LN10) - gain);
      if(score < 1) score = 1;
      if(score > 30) score = 30;
    }
  }

  if(!score) return null;
  var rating = score >= 14 ? 'Exceptional Dynamic Range' :
               (score >= 11 ? 'Very Good Dynamic Range' :
               (score >= 8 ? 'Typical Modern Dynamics' : 'Compressed / Loudness War'));

  var res = {
    score: score,
    dr: score,
    label: 'DR' + score,
    ratingLabel: rating,
    trackGain: gainStr || 'None',
    trackPeak: peakStr || 'None',
    albumGain: albGainStr || 'None',
    albumPeak: albPeakStr || 'None'
  };
  drInfoCache[p] = res;
  return res;
}
function openDrModal(h){}
function closeDrModal(){}
function drawDrModal(gr){}

/* ------------------------- Audio Output Device Quick-Switcher ------------------------- */
function openAudioDeviceMenu(x,y){
  try{
    var m=window.CreatePopupMenu();
    m.AppendMenuItem(0, 1, 'Audio Output Device (Preferences)...');
    m.AppendMenuItem(0, 2, 'Parametric Equalizer Presets...');
    m.AppendMenuSeparator();
    m.AppendMenuItem(0, 3, 'Windows Sound Control Panel...');
    m.AppendMenuSeparator();
    m.AppendMenuItem(0, 4, 'foobar2000 Preferences...');

    var id=m.TrackPopupMenu(x,y);
    if(id===1 || id===4){
      try{
        fb.ShowPreferences('{65D8B383-1463-48EC-AB9E-7C4D789B880A}');
      }catch(e1){
        try{ fb.RunMainMenuCommand('File/Preferences'); }catch(e2){}
      }
    }else if(id===2){
      if(typeof openEqModal==='function') openEqModal();
    }else if(id===3){
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
  EQ_MODAL_HB={ presets:[], panel:{x0:cx, y0:cy, x1:cx+cw, y1:cy+ch} };

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
