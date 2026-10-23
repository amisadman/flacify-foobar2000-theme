/* flacify/data/clustering.js -- offline algorithmic Daily Mixes & smart lossless collections
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- Offline Clustering Engine -------------------------
   Runs 100% locally via JScript on the user's media library. Evaluates genre taxonomy,
   artist co-occurrence, and decade metadata to cluster tracks into 4 cohesive Daily Mixes.
   Cached persistently in cache/daily_mixes.json with a 24-hour freshness TTL. */

var dailyMixesCache = null;
var DAILY_MIX_CACHE_PATH = fb.ProfilePath + 'flacify\\cache\\daily_mixes.json';

var MIX_DEFINITIONS = [
  {
    id: 1,
    title: 'Daily Mix 1',
    category: 'Rock / Alternative / Metal',
    desc: 'High-energy guitar riffs, post-punk, and alternative anthems from your library.',
    genres: ['rock', 'metal', 'alternative', 'punk', 'grunge', 'indie rock', 'hard rock', 'classic rock', 'post-punk', 'heavy metal', 'emo', 'garage']
  },
  {
    id: 2,
    title: 'Daily Mix 2',
    category: 'Pop / Electronic / R&B',
    desc: 'Club beats, synthwave hooks, modern pop, and smooth R&B grooves.',
    genres: ['pop', 'dance', 'electronic', 'synth', 'techno', 'house', 'edm', 'hip-hop', 'hip hop', 'rap', 'r&b', 'soul', 'disco', 'funk', 'electro']
  },
  {
    id: 3,
    title: 'Daily Mix 3',
    category: 'Chill / Lo-Fi / Acoustic',
    desc: 'Downtempo vibes, acoustic melodies, indie folk, and atmospheric ambient textures.',
    genres: ['chill', 'ambient', 'lo-fi', 'lofi', 'acoustic', 'indie folk', 'folk', 'downtempo', 'dream pop', 'shoegaze', 'trip-hop', 'meditation', 'piano']
  },
  {
    id: 4,
    title: 'Daily Mix 4',
    category: 'Jazz / Classical / Soundtracks',
    desc: 'Sophisticated improvisations, orchestral scores, timeless blues, and cinema soundtracks.',
    genres: ['jazz', 'classical', 'blues', 'soundtrack', 'score', 'orchestral', 'instrumental', 'fusion', 'cinematic', 'baroque', 'bop', 'latin']
  }
];

function loadDailyMixesFromDisk(){
  try {
    var raw = utils.ReadTextFile(DAILY_MIX_CACHE_PATH, 65001);
    if(raw){
      if(raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      // Discard cache if it contains mojibake characters
      if(raw.indexOf('\u00E2\u20AC') >= 0 || raw.indexOf('\u00F0\u0178') >= 0 || raw.indexOf('\u2022') >= 0){
        return null;
      }
      var data = JSON.parse(raw);
      // Valid if created within past 24 hours
      if(data && data.timestamp && (Date.now() - data.timestamp) < 86400000 && data.mixes && data.mixes.length === 4){
        // Hydrate handles
        var validCount = 0;
        for(var mi = 0; mi < data.mixes.length; mi++){
          var m = data.mixes[mi];
          if(m.category){
            m.category = m.category.replace(/[\u2022\u00E2\u20AC\u0178]+/g, '/').replace(/\s+/g, ' ');
          }
          m.handles = [];
          if(m.paths && m.paths.length){
            for(var pi = 0; pi < m.paths.length; pi++){
              var h = getHandleByPath(m.paths[pi]);
              if(h) m.handles.push(h);
            }
          }
          // Hydrate candidate album handles for mosaic artwork
          m.cands = [];
          var candPaths = m.cands || [];
          for(var ci = 0; ci < candPaths.length; ci++){
            var cp = candPaths[ci];
            var ch = (typeof cp === 'string') ? getHandleByPath(cp) : cp;
            if(ch && typeof ch === 'object' && ch.Path) m.cands.push(ch);
          }
          if(m.cands.length < 4 && m.handles.length >= 4){
            var seen = {};
            for(var sc = 0; sc < m.cands.length; sc++) seen[m.cands[sc].Path] = true;
            for(var hi = 0; hi < m.handles.length && m.cands.length < 4; hi++){
              var candH = m.handles[hi];
              if(candH && candH.Path && !seen[candH.Path]){
                seen[candH.Path] = true;
                m.cands.push(candH);
              }
            }
          }
          m.single = m.cands.length ? m.cands[0] : (m.handles.length ? m.handles[0] : null);
          if(m.handles.length > 0) validCount++;
        }
        if(validCount >= 2){
          dailyMixesCache = data.mixes;
          return dailyMixesCache;
        }
      }
    }
  } catch(e){}
  return null;
}

function saveDailyMixesToDisk(mixes){
  try {
    var data = {
      timestamp: Date.now(),
      mixes: []
    };
    for(var mi = 0; mi < mixes.length; mi++){
      var src = mixes[mi];
      var paths = [];
      for(var pi = 0; pi < src.handles.length; pi++){
        if(src.handles[pi] && src.handles[pi].Path) paths.push(src.handles[pi].Path);
      }
      data.mixes.push({
        id: src.id,
        title: src.title,
        category: src.category,
        desc: src.desc,
        paths: paths,
        cands: (src.cands || []).slice(0, 4).map(function(h){ return h ? h.Path : ''; })
      });
    }
    utils.WriteTextFile(DAILY_MIX_CACHE_PATH, JSON.stringify(data, null, 2));
  } catch(e){}
}

function buildDailyMixes(){
  var disk = loadDailyMixesFromDisk();
  if(disk) return disk;

  var lib = libItems();
  if(!lib || !lib.Count) return [];

  var genres = libTF('genre');
  var artists = libTF('artistName');

  var buckets = [[], [], [], []];
  var unassigned = [];

  for(var i = 0; i < lib.Count; i++){
    var g = (genres[i] || '').toLowerCase();
    var matched = false;

    for(var mi = 0; mi < MIX_DEFINITIONS.length; mi++){
      var def = MIX_DEFINITIONS[mi];
      for(var gi = 0; gi < def.genres.length; gi++){
        if(g.indexOf(def.genres[gi]) >= 0){
          buckets[mi].push(lib[i]);
          matched = true;
          break;
        }
      }
      if(matched) break;
    }

    if(!matched) unassigned.push(lib[i]);
  }

  // Distribute unassigned tracks round-robin to ensure all mixes are populated
  for(var ui = 0; ui < unassigned.length; ui++){
    var targetBucket = ui % 4;
    buckets[targetBucket].push(unassigned[ui]);
  }

  var result = [];
  for(var bi = 0; bi < 4; bi++){
    def = MIX_DEFINITIONS[bi];
    var bItems = buckets[bi];

    // Shuffle bucket tracks
    shuffleArr(bItems);
    var mixItems = bItems.slice(0, Math.min(50, bItems.length));

    // Extract 4 distinctive album candidates for 2x2 mosaic cover
    var cands = [];
    var seenAlbums = {};
    for(var ci = 0; ci < mixItems.length && cands.length < 4; ci++){
      var h = mixItems[ci];
      var k = albKey(h);
      if(!seenAlbums[k]){
        seenAlbums[k] = true;
        cands.push(h);
      }
    }

    result.push({
      id: def.id,
      title: def.title,
      category: def.category,
      desc: def.desc,
      handles: mixItems,
      cands: cands,
      single: cands.length ? cands[0] : (mixItems.length ? mixItems[0] : null)
    });
  }

  dailyMixesCache = result;
  saveDailyMixesToDisk(result);
  return result;
}

function getDailyMixes(){
  if(dailyMixesCache) return dailyMixesCache;
  return buildDailyMixes();
}

function getPlaylistDescription(name){
  if(!name) return '';
  if(typeof MIX_DEFINITIONS !== 'undefined' && MIX_DEFINITIONS){
    for(var i = 0; i < MIX_DEFINITIONS.length; i++){
      if(name.indexOf(MIX_DEFINITIONS[i].title) >= 0){
        return MIX_DEFINITIONS[i].desc || '';
      }
    }
  }
  var low = name.toLowerCase();
  if(low.indexOf('24-bit') >= 0 || low.indexOf('hi-res') >= 0) return 'Studio Master Quality lossless audio (>= 24-bit / DSD) from your library.';
  if(low.indexOf('forgotten gems') >= 0) return 'High-affinity tracks from your library you haven\'t played recently.';
  if(low.indexOf('heavy rotation') >= 0) return 'Your most-played library favorites on repeat.';
  if(name === (typeof LIKED_PLAYLIST_NAME !== 'undefined' ? LIKED_PLAYLIST_NAME : 'Liked Songs')) return '';
  return '';
}

/* ------------------------- Play Daily Mix ------------------------- */
function playDailyMix(mixId, startPlayback){
  var mixes = getDailyMixes();
  for(var i = 0; i < mixes.length; i++){
    if(mixes[i].id === mixId){
      var m = mixes[i];
      if(!m.handles || !m.handles.length) return;

      var plName = m.title + ' (' + m.category + ')';
      var pi = plman.FindOrCreatePlaylist(plName, true);
      try { plman.ClearPlaylist(pi); } catch(e){}

      var hl = fb.CreateHandleList();
      for(var j = 0; j < m.handles.length; j++) hl.Add(m.handles[j]);

      plman.InsertPlaylistItems(pi, 0, hl, false);
      plman.ActivePlaylist = pi;
      invalidateItems();

      firstRow = firstRowT = 0;
      pushNav('playlist', { pl: pi });
      view = 'playlist';

      if(startPlayback !== false){
        try { plman.ExecutePlaylistDefaultAction(pi, 0); } catch(e){}
      }
      repaintAll();
      return;
    }
  }
}

/* ------------------------- Smart Playlists Suite ------------------------- */
function playHiResVault(startPlayback){
  var lib = libItems();
  if(!lib || !lib.Count) return;

  var bitsArr = libTF('bitdepth');
  var rateArr = libTF('samplerate');
  var codecArr = libTF('codec');

  var hl = fb.CreateHandleList();
  for(var i = 0; i < lib.Count; i++){
    var b = parseInt(bitsArr[i], 10) || 0;
    var r = parseInt(rateArr[i], 10) || 0;
    var c = (codecArr[i] || '').toUpperCase();
    if(b >= 24 || r >= 88200 || c.indexOf('DSD') >= 0){
      hl.Add(lib[i]);
    }
  }

  if(!hl.Count) return;

  var pi = plman.FindOrCreatePlaylist('24-bit Hi-Res Vault', true);
  try { plman.ClearPlaylist(pi); } catch(e){}
  plman.InsertPlaylistItems(pi, 0, hl, false);
  plman.ActivePlaylist = pi;
  if(typeof invalidateItems === 'function') invalidateItems();
  firstRow = firstRowT = 0;
  pushNav('playlist', { pl: pi });
  view = 'playlist';
  if(startPlayback !== false){
    try { plman.ExecutePlaylistDefaultAction(pi, 0); } catch(e){}
  }
  repaintAll();
}

function playForgottenGems(startPlayback){
  var lib = libItems();
  if(!lib || !lib.Count) return;

  var hist = (typeof getHistoryList === 'function') ? getHistoryList() : [];
  var recentMap = {};
  var favArtists = {};
  for(var hi = 0; hi < Math.min(100, hist.length); hi++){
    if(hist[hi] && hist[hi].path){
      if(hi < 40) recentMap[hist[hi].path] = true;
      if(hist[hi].artist) favArtists[hist[hi].artist.toLowerCase()] = true;
    }
  }

  var likedCandidates = [];
  var artistCandidates = [];
  var otherCandidates = [];

  for(var i = 0; i < lib.Count; i++){
    var h = lib[i];
    if(!h || !h.Path) continue;
    if(recentMap[h.Path]) continue; // Exclude recently played songs

    if(isLiked(h)){
      likedCandidates.push(h);
    } else {
      var art = (TF.artist.EvalWithMetadb(h) || '').toLowerCase();
      if(art && favArtists[art]){
        artistCandidates.push(h);
      } else {
        otherCandidates.push(h);
      }
    }
  }

  if(typeof shuffleArr === 'function'){
    shuffleArr(likedCandidates);
    shuffleArr(artistCandidates);
    shuffleArr(otherCandidates);
  }

  var hl = fb.CreateHandleList();
  // Take up to 20 unplayed liked tracks
  for(var li = 0; li < likedCandidates.length && hl.Count < 20; li++){
    hl.Add(likedCandidates[li]);
  }
  // Fill with favorite artist tracks you haven't heard recently
  for(var ai = 0; ai < artistCandidates.length && hl.Count < 40; ai++){
    hl.Add(artistCandidates[ai]);
  }
  // Fill with other unplayed library gems
  for(var oi = 0; oi < otherCandidates.length && hl.Count < 45; oi++){
    hl.Add(otherCandidates[oi]);
  }

  // Fallback if needed
  if(!hl.Count){
    for(var j = 0; j < Math.min(40, lib.Count); j++) hl.Add(lib[j]);
  }

  var pi = plman.FindOrCreatePlaylist('Forgotten Gems', true);
  try { plman.ClearPlaylist(pi); } catch(e){}
  plman.InsertPlaylistItems(pi, 0, hl, false);
  plman.ActivePlaylist = pi;
  if(typeof invalidateItems === 'function') invalidateItems();

  firstRow = firstRowT = 0;
  pushNav('playlist', { pl: pi });
  view = 'playlist';
  if(startPlayback !== false){
    try { plman.ExecutePlaylistDefaultAction(pi, 0); } catch(e){}
  }
  repaintAll();
}

function playHeavyRotation(startPlayback){
  var lib = libItems();
  if(!lib || !lib.Count) return;

  var hl = fb.CreateHandleList();
  var hist = (typeof getHistoryList === 'function') ? getHistoryList() : [];
  var freq = {};
  for(var h = 0; h < hist.length; h++){
    var p = hist[h].path;
    freq[p] = (freq[p] || 0) + 1;
  }
  var sortedPaths = Object.keys(freq).sort(function(a, b){ return freq[b] - freq[a]; });
  for(var s = 0; s < sortedPaths.length && hl.Count < 50; s++){
    var handle = (typeof getHandleByPath === 'function') ? getHandleByPath(sortedPaths[s]) : null;
    if(handle) hl.Add(handle);
  }

  if(hl.Count < 20){
    for(var i = 0; i < Math.min(50 - hl.Count, lib.Count); i++){
      hl.Add(lib[i]);
    }
  }

  var pi = plman.FindOrCreatePlaylist('Heavy Rotation', true);
  try { plman.ClearPlaylist(pi); } catch(e){}
  plman.InsertPlaylistItems(pi, 0, hl, false);
  plman.ActivePlaylist = pi;
  if(typeof invalidateItems === 'function') invalidateItems();

  firstRow = firstRowT = 0;
  pushNav('playlist', { pl: pi });
  view = 'playlist';
  if(startPlayback !== false){
    try { plman.ExecutePlaylistDefaultAction(pi, 0); } catch(e){}
  }
  repaintAll();
}

/* ------------------------- Auto-Clean Mojibake Playlists ------------------------- */
function cleanupMojibakePlaylists(){
  try {
    var foundForgotten = false, foundHiRes = false, foundRotation = false, changed = false;
    for(var i = plman.PlaylistCount - 1; i >= 0; i--){
      var name = plman.GetPlaylistName(i);
      if(!name) continue;
      var low = name.toLowerCase();

      // Forgotten Gems cleanup: remove duplicate or malformed variants, keep one clean 'Forgotten Gems'
      if(low.indexOf('forgotten gems') >= 0){
        if(name === 'Forgotten Gems' && !foundForgotten){
          foundForgotten = true;
        } else if(foundForgotten){
          try { plman.RemovePlaylist(i); changed = true; } catch(e){}
        } else {
          try { plman.RenamePlaylist(i, 'Forgotten Gems'); changed = true; } catch(e){}
          foundForgotten = true;
        }
        continue;
      }

      // Heavy Rotation cleanup
      if(low.indexOf('heavy rotation') >= 0){
        if(name === 'Heavy Rotation' && !foundRotation){
          foundRotation = true;
        } else if(foundRotation){
          try { plman.RemovePlaylist(i); changed = true; } catch(e){}
        } else {
          try { plman.RenamePlaylist(i, 'Heavy Rotation'); changed = true; } catch(e){}
          foundRotation = true;
        }
        continue;
      }

      // Hi-Res Vault cleanup
      if(low.indexOf('hi-res') >= 0 || low.indexOf('24-bit') >= 0){
        if(name === '24-bit Hi-Res Vault' && !foundHiRes){
          foundHiRes = true;
        } else if(foundHiRes){
          try { plman.RemovePlaylist(i); changed = true; } catch(e){}
        } else {
          try { plman.RenamePlaylist(i, '24-bit Hi-Res Vault'); changed = true; } catch(e){}
          foundHiRes = true;
        }
        continue;
      }

      // Specific UTF-8/CP1252 mojibake sequence cleanup (e.g. â€¢) and stray leading bullets
      var hasMojibake = name.indexOf('\u00E2\u20AC') >= 0 || name.indexOf('\u0393\u00C7') >= 0;
      var hasLeadingPunct = /^[\s\/\-\u2022\u2013\u2014]+/.test(name);
      if(hasMojibake || hasLeadingPunct){
        var clean = name
          .replace(/[\u00E2\u20AC][\u00A2\u201C\u201D\u2122\u0153\u009D\u009C]*/g, '')
          .replace(/\u0393\u00C7[\s\S]?/g, '')
          .replace(/^[\s\/\-\u2022\u2013\u2014]+|[\s\/\-\u2022\u2013\u2014]+$/g, '')
          .replace(/\s+/g, ' ');
        if(clean && clean !== name){
          try { plman.RenamePlaylist(i, clean); changed = true; } catch(e){}
        }
      }
    }
    if(changed && typeof invalidateItems === 'function') invalidateItems();
  } catch(e){}
}
cleanupMojibakePlaylists();
