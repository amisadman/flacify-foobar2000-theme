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
  fb.Pause();
  if(sleepTimer.startVol !== undefined){
    fb.Volume = sleepTimer.startVol;
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
