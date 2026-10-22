/* flacify/core/timer.js -- Smart Sleep Timer with smooth volume fade-out
   Part of FLACify. Loaded by main.js. */

var sleepTimer = {
  active: false,
  totalSec: 0,
  remainSec: 0,
  mode: 'time', // 'time' or 'track'
  startVol: 0,
  timerId: null,
  fading: false
};

function startSleepTimer(minutes, mode){
  stopSleepTimer();
  var sec = (minutes || 15) * 60;
  var currentVol = fb.Volume;
  if(currentVol <= -99) currentVol = (typeof lastNonMuteVol !== 'undefined' ? lastNonMuteVol : 0);

  sleepTimer.active = true;
  sleepTimer.totalSec = sec;
  sleepTimer.remainSec = sec;
  sleepTimer.mode = mode || 'time';
  sleepTimer.startVol = currentVol;
  sleepTimer.fading = false;

  sleepTimer.timerId = window.SetInterval(function(){
    if(!sleepTimer.active) return;
    if(!fb.IsPlaying && !fb.IsPaused) return;

    if(sleepTimer.mode === 'track'){
      var len = fb.PlaybackLength, pos = fb.PlaybackTime;
      if(len > 0 && pos >= len - 1){
        triggerSleepTimerStop();
      }
      return;
    }

    sleepTimer.remainSec--;
    if(sleepTimer.remainSec <= 5 && sleepTimer.remainSec > 0){
      sleepTimer.fading = true;
      var frac = sleepTimer.remainSec / 5.0;
      var targetVol = sleepTimer.startVol - (1.0 - frac) * 45.0;
      if(targetVol < -90) targetVol = -100;
      fb.Volume = targetVol;
    } else if(sleepTimer.remainSec <= 0){
      triggerSleepTimerStop();
    }

    repaintAll();
  }, 1000);

  repaintAll();
}

function triggerSleepTimerStop(){
  try{
    if(fb.IsPlaying && !fb.IsPaused) fb.Pause();
  }catch(e){
    try{ fb.Stop(); }catch(e2){}
  }
  if(sleepTimer.startVol !== undefined){
    try{ fb.Volume = sleepTimer.startVol; }catch(ev){}
  }
  stopSleepTimer();
  repaintAll();
}

function stopSleepTimer(){
  if(sleepTimer.timerId){
    window.ClearInterval(sleepTimer.timerId);
    sleepTimer.timerId = null;
  }
  if(sleepTimer.fading && sleepTimer.startVol !== undefined){
    fb.Volume = sleepTimer.startVol;
  }
  sleepTimer.active = false;
  sleepTimer.remainSec = 0;
  sleepTimer.fading = false;
  repaintAll();
}

function formatSleepTimerRemaining(){
  if(!sleepTimer.active) return '';
  if(sleepTimer.mode === 'track') return 'Track end';
  var m = Math.floor(sleepTimer.remainSec / 60);
  var s = sleepTimer.remainSec % 60;
  if(m >= 60){
    var h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }
  if(m > 0) return m + 'm';
  return s + 's';
}

function openSleepTimerMenu(x, y){
  var m = window.CreatePopupMenu();
  m.AppendMenuItem(0, 1, '15 minutes');
  m.AppendMenuItem(0, 2, '30 minutes');
  m.AppendMenuItem(0, 3, '45 minutes');
  m.AppendMenuItem(0, 4, '1 hour');
  m.AppendMenuItem(0, 5, 'End of current track');
  if(sleepTimer.active){
    m.AppendMenuSeparator();
    m.AppendMenuItem(0, 99, 'Turn off timer (' + formatSleepTimerRemaining() + ' left)');
  }
  var id = m.TrackPopupMenu(x, y);
  if(id === 1) startSleepTimer(15, 'time');
  else if(id === 2) startSleepTimer(30, 'time');
  else if(id === 3) startSleepTimer(45, 'time');
  else if(id === 4) startSleepTimer(60, 'time');
  else if(id === 5) startSleepTimer(0, 'track');
  else if(id === 99) stopSleepTimer();
}

/* ------------------------- 60 FPS Delta-Time Ambient Glow Engine ------------------------- */
var ambientGlow = {
  currR: 18, currG: 18, currB: 18,
  targetR: 18, targetG: 18, targetB: 18,
  animTimer: null
};

function updateAmbientGlow(targetCol, immediate){
  var r = (targetCol >> 16) & 255;
  var g = (targetCol >> 8) & 255;
  var b = targetCol & 255;
  ambientGlow.targetR = r;
  ambientGlow.targetG = g;
  ambientGlow.targetB = b;

  if(immediate){
    ambientGlow.currR = r;
    ambientGlow.currG = g;
    ambientGlow.currB = b;
    if(ambientGlow.animTimer){
      window.ClearInterval(ambientGlow.animTimer);
      ambientGlow.animTimer = null;
    }
    return;
  }

  if(!ambientGlow.animTimer){
    ambientGlow.animTimer = window.SetInterval(ambientGlowTick, 16); // 60 FPS
  }
}

function ambientGlowTick(){
  var dr = ambientGlow.targetR - ambientGlow.currR;
  var dg = ambientGlow.targetG - ambientGlow.currG;
  var db = ambientGlow.targetB - ambientGlow.currB;

  var step = 0.12;
  ambientGlow.currR += dr * step;
  ambientGlow.currG += dg * step;
  ambientGlow.currB += db * step;

  if(typeof repaintBar === 'function') repaintBar();
  if(typeof repaintMain === 'function') repaintMain();

  // Stop timer at convergence threshold to guarantee 0% idle CPU
  if(Math.abs(dr) < 0.8 && Math.abs(dg) < 0.8 && Math.abs(db) < 0.8){
    ambientGlow.currR = ambientGlow.targetR;
    ambientGlow.currG = ambientGlow.targetG;
    ambientGlow.currB = ambientGlow.targetB;
    window.ClearInterval(ambientGlow.animTimer);
    ambientGlow.animTimer = null;
  }
}

function getSmoothAmbientGlow(alpha){
  var a = (alpha !== undefined) ? alpha : 75;
  var r = Math.round(ambientGlow.currR);
  var g = Math.round(ambientGlow.currG);
  var b = Math.round(ambientGlow.currB);
  return RGBA(r, g, b, a);
}

function getSmoothAmbientRGB(){
  var r = Math.round(ambientGlow.currR);
  var g = Math.round(ambientGlow.currG);
  var b = Math.round(ambientGlow.currB);
  return RGB(r, g, b);
}
