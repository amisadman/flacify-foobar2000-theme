# Verdant Lossless Theme - Repository Commit History & State Documentation
**Base Commit**: `162df03` ("Bump to 1.2.0")  
**Target Repository**: `d:\Coding\!Git\verdant-foobar2000-theme`  
**Scope**: All features, redesigns, bug fixes, and data layer enhancements developed from the base commit to the current state.

---

## Overview of Commit Sequence

This document outlines the sequential states of the repository from the upstream base commit up to the current working tree. Each state represents a cohesive, functional unit designed for clean git history when forking the repository.

```
162df03 (Base: Bump to 1.2.0)
   │
   ├── Commit 1: feat(core): add lossless metadata TitleFormat patterns and embedded lyrics parsing
   ├── Commit 2: feat(barcode): implement native GDI+ vector EAN-13 and Code-128 barcode engine
   ├── Commit 3: feat(art): add multi-artist parsing and Deezer portrait fetcher with local cache
   ├── Commit 4: feat(albums): introduce dedicated Albums grid view and library indexing
   ├── Commit 5: feat(artists): add dedicated Artists grid view to library navigation
   ├── Commit 6: feat(nav): implement Spotify-style navigation history stack with back/forward controls
   ├── Commit 7: feat(details): add comprehensive Song Details modal with lossless specs and barcode
   ├── Commit 8: refactor(details): enlarge album art to 220px, add scrollable viewport, and collapsible lyrics
   ├── Commit 9: feat(album): redesign album details with 250px cover, action bar, sticky headers, and release footer
   ├── Commit 10: feat(album): add multi-artist header links, individual spotlight cards, and discography shelves
   └── Commit 11: feat(home): add Recently Added shelf and update release packaging
```

---

## Detailed Commit Breakdown

### Commit 1: Core TitleFormat & Embedded Lyrics Support
- **Commit Title**: `feat(core): add lossless metadata TitleFormat patterns and embedded lyrics parsing`
- **Scope**: Data layer & TitleFormat expansion
- **Modified Files**:
  - `theme/verdant/core/tf.js`
  - `theme/verdant/data/lyrics.js`
- **Key Changes**:
  - Defined TitleFormat patterns for lossless metadata: `%barcode%`, `%upc%`, `%ean%`, `%isrc%`, `%copyright%`, audio specs (`$info(codec)`, `$info(bitrate)`, `$info(bitspersample)`, `$info(samplerate)`), `%composer%`, `%lyricist%`, `%label%`, `%catalognumber%`, `%last_modified%`, `%encoder%`, and audio MD5.
  - Extended lyrics loader in `theme/verdant/data/lyrics.js` to inspect embedded Vorbis/ID3 `%lyrics%` and `%unsyncedlyrics%` tags, parsing synced timestamps (`[mm:ss.xx]`) with fallback to unsynced formatting.
- **Rationale**: Provides the core data contracts needed for all subsequent UI views and lossless library features.

---

### Commit 2: GDI+ Vector Barcode Engine
- **Commit Title**: `feat(barcode): implement native GDI+ vector EAN-13 and Code-128 barcode engine`
- **Scope**: Core vector graphics module
- **Created Files**:
  - `theme/verdant/core/barcode.js`
- **Modified Files**:
  - `theme/verdant/main.js`
- **Key Changes**:
  - Implemented `drawBarcode(gr, x, y, w, h, code, colBars, colText)` using foobar2000's native GDI+ primitives.
  - Implemented standard EAN-13 encoding tables (L-code, G-code, R-code parity patterns), start/center/stop guard bars, and human-readable digit layout.
  - Added Code-128 and numeric barcode fallback for non-EAN-13 inputs.
  - Registered `core/barcode.js` in `main.js` loader sequence.
- **Rationale**: Eliminates dependencies on external barcode image generators or network calls, allowing resolution-independent barcode rendering anywhere in the theme.

---

### Commit 3: Multi-Artist Parsing & External Portrait Fetcher
- **Commit Title**: `feat(art): add multi-artist extraction and Deezer portrait fetcher with local cache`
- **Scope**: Data layer & Artist Imagery
- **Modified Files**:
  - `theme/verdant/data/library.js`
  - `theme/verdant/data/art.js`
- **Key Changes**:
  - Added `splitArtists(str)` supporting commas, semicolons, slashes, and `feat.` / `ft.` delimiters.
  - Implemented Deezer open API artist portrait fetcher (`fetchArtistImageDeezer`) with disk caching under foobar2000 profile directory.
  - Updated `drawCircle()` in `art.js` to prioritize cached artist portraits before falling back to album artwork masks or procedural color avatars.
- **Rationale**: Correctly segments tracks with multiple collaborating artists and brings modern streaming-style circular artist portraits to the interface.

---

### Commit 4: Dedicated "Your Albums" Grid View
- **Commit Title**: `feat(albums): introduce dedicated Albums grid view and library indexing`
- **Scope**: Library views & Navigation
- **Created Files**:
  - `theme/verdant/views/albums.js`
- **Modified Files**:
  - `theme/verdant/data/library.js`
  - `theme/verdant/views/nav.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Implemented `getAlbumList()` and `loadAlbum()` in `library.js` to index all library albums and singles.
  - Created `theme/verdant/views/albums.js` rendering a responsive grid of album cards with artwork, title, artist, year, and hover play buttons.
  - Added "Albums" link to the "Your Library" sidebar section in `nav.js`.
  - Added click, hover, and scroll routing in `app.js`.
- **Rationale**: Gives users a dedicated Spotify-style album browsing experience distinct from playlist and song views.

---

### Commit 5: Dedicated "Artists" Grid View
- **Commit Title**: `feat(artists): add dedicated Artists grid view to library navigation`
- **Scope**: Library views & Navigation
- **Created Files**:
  - `theme/verdant/views/artists.js`
- **Modified Files**:
  - `theme/verdant/views/nav.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Created `theme/verdant/views/artists.js` displaying all library artists in a responsive grid.
  - Rendered 120px circular artist portraits with subtle hover zoom and Spotify-green highlight.
  - Displayed artist name and album/track count badges.
  - Added "Artists" tab under "Your Library" in `theme/verdant/views/nav.js`.
- **Rationale**: Allows users to quickly locate and explore individual artists in their collection.

---

### Commit 6: Browser-Style Navigation History Stack
- **Commit Title**: `feat(nav): implement browser-style navigation history stack with back/forward controls`
- **Scope**: UI navigation & User Experience
- **Modified Files**:
  - `theme/verdant/app.js`
  - `theme/verdant/views/nav.js`
  - `theme/verdant/ui/chrome.js`
- **Key Changes**:
  - Implemented `navHistory`, `navIndex`, `pushNav()`, `navBack()`, and `navForward()` in `app.js`.
  - Added Spotify-style `<` and `>` circular buttons to the top title bar and view headers.
  - Connected mouse Back/Forward buttons and Alt+Left / Alt+Right keyboard shortcuts.
- **Rationale**: Allows natural exploration across albums, artists, search, playlists, and settings with instant backward/forward traversal.

---

### Commit 7: Song Details Modal with Technical Metadata & Barcode
- **Commit Title**: `feat(details): add comprehensive Song Details modal with lossless specs and barcode`
- **Scope**: Track inspection & Metadata modal
- **Created Files**:
  - `theme/verdant/views/song_details.js`
- **Modified Files**:
  - `theme/verdant/app.js`
  - `theme/verdant/main.js`
  - `theme/verdant/data/playlist_edit.js`
- **Key Changes**:
  - Created modal overlay `drawSongDetails(gr, r)` displaying track metadata, lossless quality badge, and technical specifications (Codec, Sample Rate, Bit Depth, Bitrate, Channels, Audio MD5, Encoder).
  - Added contextual metadata (Release Date, Album Artist, Label, Catalog #, ISRC, Copyright, File Path).
  - Added left-aligned vector barcode beneath copyright notice.
  - Added "Song Details" option to track right-click context menu and album artwork hover button.
- **Rationale**: Essential for audiophiles and lossless collectors needing instant access to master-quality technical tags.

---

### Commit 8: Song Details Modal Redesign
- **Commit Title**: `refactor(details): enlarge album art to 220px, add scrollable viewport, and collapsible lyrics`
- **Scope**: UI refinement & Layout fixes
- **Modified Files**:
  - `theme/verdant/views/song_details.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Enlarged album artwork to 220×220px with centered play capsule button.
  - Added expandable lyrics card (`[Show More]` / `[Show Less]` toggle) with 3-line preview and fallback for un-lyriced tracks.
  - Implemented vertical viewport image-slicing and border clipping to prevent art/title leaking outside the modal during scroll.
  - Replaced `...` button with a clean vector `X` close button.
  - Converted the modal to a full mouse-wheel scrollable container with custom draggable scrollbar.
- **Rationale**: Solves visual overflow glitches, makes lyrics legible without opening separate panels, and provides a polished modal presentation.

---

### Commit 9: Full-Page Spotify-Grade Album Details View
- **Commit Title**: `feat(album): redesign album details with 250px cover, action bar, sticky headers, and release footer`
- **Scope**: Album View overhaul
- **Created/Overhauled Files**:
  - `theme/verdant/views/album.js`
- **Modified Files**:
  - `theme/verdant/app.js`
  - `theme/verdant/data/library.js`
- **Key Changes**:
  - Replaced split-pane layout with unified full-page scrolling canvas (`albumScroll`, `ALBUM_MAXPX`).
  - Hero Header: 250×250px cover art with ambient drop shadow, dominant hue background gradient, dynamic auto-sizing title, and Hi-Res lossless badge (`FLAC • 24-bit / 48.0 kHz • Lossless`).
  - Streaming Action Bar: 56px circular green Play button and 38px Shuffle button.
  - Sticky Tracklist: `# TITLE DURATION` column headers pin smoothly to the top of the viewport when scrolling down. Active playing track displays Spotify-green text and equalizer icon.
  - Release Footer: Exact release date, copyright notices, and left-aligned vector barcode.
- **Rationale**: Eliminates empty space on high-resolution screens and provides a premium desktop streaming experience.

---

### Commit 10: Multi-Artist Distinction, Redirections & Discography Shelves
- **Commit Title**: `feat(album): add multi-artist header links, individual spotlight cards, and discography shelves`
- **Scope**: Collaborative artist support
- **Modified Files**:
  - `theme/verdant/views/album.js`
  - `theme/verdant/data/library.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Multi-Artist Hero Header: Renders overlapping 26px circular portraits and individual comma-separated artist names with independent green hover states and click redirections.
  - Individual Artist Spotlight Cards: Below the tracklist, renders dedicated 92px cards for each collaborating artist with library stats (*"X albums • Y songs in your library"*) and capsule `[ View Artist ]` CTA buttons.
  - Discography & Song Shelves: For each collaborating artist, renders "More by [Artist]" album shelves (140px covers with hover play) or "More songs by [Artist]" track lists.
  - Unified Hitbox Array: Wired `HB_ALBUM_ARTISTS` in `app.js` for clean hit testing and hover signatures.
- **Rationale**: Fully supports collaborative albums (e.g., hip-hop, split releases, compilations), allowing independent exploration of every artist on a track.

---

### Commit 11: Home View "Recently Added" Shelf & Build Polish
- **Commit Title**: `feat(home): add Recently Added shelf and update release packaging`
- **Scope**: Home view & Release tooling
- **Modified Files**:
  - `theme/verdant/views/home.js`
  - `theme/verdant/core/tokens.js`
  - `tools/make-release.ps1`
- **Key Changes**:
  - Added "Recently Added" shelf to Home view displaying the 5 most recently added/modified albums and tracks.
  - Fixed UTF-8 character encoding artifacts by replacing raw dot literals with `CH_DOT` (`chr(0xB7)`).
  - Updated release build automation in `tools/make-release.ps1` to produce verified drop-in profile bundles.
- **Rationale**: Brings new additions immediately to the user's attention upon launch.

---

### Commit 12: Album Grouping Unification Across Multiple Artists
- **Commit Title**: `fix(library): unify tracks of the same album across multiple artists using album artist and directory path`
- **Scope**: Album grouping & track indexing
- **Modified Files**:
  - `theme/verdant/core/tf.js`
  - `theme/verdant/data/library.js`
- **Key Changes**:
  - Solved split album duplication where tracks on the same album with differing guest artists were creating separate album cards.
  - Implemented prioritized album grouping key: `%album artist%` -> Directory path (`$directory_path(%path%)`) -> Track Artist.
  - Added intelligent predominant artist detection for albums missing explicit `ALBUM ARTIST` tags.
  - Added multi-disc track sorting (`discnumber * 1000 + tracknumber`).
- **Rationale**: Ensures all songs of the same album stick together into a single cohesive album card even when metadata contains varied collaborator tags.

### Commit 13: Spotify-Grade Artist Profile Redesign with Deezer & Wikipedia Integration
- **Commit Title**: `feat(artist): redesign artist view with Deezer imagery, fan stats, popular tracks, and categorized discography`
- **Scope**: Artist Profile view, Deezer/Wikipedia APIs, disk caching, full-page scrolling
- **Modified Files**:
  - `theme/verdant/data/art.js`
  - `theme/verdant/data/library.js`
  - `theme/verdant/views/artist.js`
  - `theme/verdant/ui/chrome.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Implemented online artist metadata fetcher querying Deezer API (`picture_xl`, `nb_fan`) and Wikipedia summary REST endpoint for artist biographies, cached locally in `cache/artists/{safeName}_meta.json`.
  - Added raw high-res unmasked image loader `getArtistHeroImg(name)` for cinematic 320px hero banner backgrounds with bottom gradient fade.
  - Redesigned Artist view (`views/artist.js`) featuring:
    - Verified Artist capsule badge with checkmark icon.
    - Large dynamic typography and monthly listener stats paired with library stats.
    - 56px green Play + 38px Shuffle + Follow capsule toggle buttons.
    - Top Popular tracks list (Top 5 / expandable to Top 10 via "See more"/"Show less") with 40×40 cover thumbnails, rank numbers, equalizer animation, and hover play buttons.
    - Latest Release spotlight card (88×88 art, type badge, track count, instant play).
    - Categorized horizontal discography shelves for "Albums", "Singles and EPs", and "Appears On".
    - "About" card featuring 130px circular portrait, listener count, and 4-line wrapped bio excerpt.
    - Pinned sticky header bar when scrolled past the hero banner.
    - 60fps continuous eased scrolling synchronized with draggable custom scrollbars and mouse wheel.
- **Rationale**: Elevates the artist profile from a basic 43-line stub into a rich, modern music streaming platform experience.

### Commit 14: Offline-First Artist Cloud Sync Manager & Unresponsive Script Fix
- **Commit Title**: `feat(sync): add offline-first Artist Cloud Sync manager, live progress page, and fix unresponsive script warning`
- **Scope**: Performance hotfix, offline caching, dedicated Artist Sync full-page view, background worker
- **Modified Files**:
  - `theme/verdant/data/art.js`
  - `theme/verdant/views/artist_sync.js`
  - `theme/verdant/tools/sync_artists.ps1`
  - `theme/verdant/views/nav.js`
  - `theme/verdant/views/artists.js`
  - `theme/verdant/core/tokens.js`
  - `theme/verdant/main.js`
  - `theme/verdant/ui/chrome.js`
  - `theme/verdant/app.js`
- **Key Changes**:
  - Eliminated "Warning: Unresponsive script" by removing paint-time process spawning from `getExternalArtistImg`, `drawCircle`, and `getArtistMeta`. Rendering is now 100% offline-first reading only from local cache.
  - Added persistent artist state manifest (`cache/artists/index.json`) tracking which artists are cached, their fan count, and metadata state.
  - Implemented dedicated full-page Artist Cloud Sync & Media Manager view (`views/artist_sync.js`) accessible from the sidebar navigation ("Artist Sync") and Artists view header ("Cloud Sync" button).
  - Designed live progress bar, artist library metrics (Total, Cached, Missing), and controls: `[ Fetch Missing ]`, `[ Refresh All ]`, `[ Stop Sync ]`, and `[ Open Cache Folder ]`.
  - Added interactive table of all library artists displaying circular portraits, track count, listeners, status badges (`✓ Cached`, `⏳ Fetching`, `— Missing`), and individual `[ Fetch ]` buttons.
  - Implemented detached rate-limited background worker (`tools/sync_artists.ps1`) updating `sync_progress.json` without blocking foobar2000's UI thread.
- **Rationale**: Gives users complete control over when and how online artist media is fetched, with visual progress feedback and guaranteed zero UI freezes.

### Commit 15: Artist Page Album-Style Hero Redesign & Sync UI Polish
- **Commit Title**: `refactor(artist): redesign artist hero with album-style artwork card, white typography, and polish sync UI`
- **Scope**: Artist view hero redesign, typography styling, sync manager button & status indicator polish
- **Modified Files**:
  - `theme/verdant/views/artist.js`
  - `theme/verdant/views/artist_sync.js`
  - `theme/verdant/data/art.js`
- **Key Changes**:
  - Removed full-width stretched background hero banner on the Artist page in favor of a clean, anchored ambient tinted gradient and a prominent 240×240 artwork card with rounded corners and drop shadow matching the Album view.
  - Added `drawArtistCard` and `getExternalArtistCard` in `art.js` to render the artist's portrait as a rounded card with library artwork fallback.
  - Made the artist title pure bold white (`COL.white`) across the hero and the sticky top bar.
  - Formatted artist page statistics with numbers in pure bright white (`COL.white`) for monthly listeners, release count, and total library songs.
  - Removed play icon from the `[ Fetch Missing ]` button in the Artist Cloud Sync view and centered the text.
  - Replaced UTF-8 unicode characters in the sync status pills (`✓`, `⏳`, `—`) with native 6px GDI LED indicator dots and clean ASCII text (`Cached`, `Syncing`, `Missing`), permanently eliminating broken byte glyphs and unknown character boxes.
- **Rationale**: Improves visual consistency between the Album and Artist profile pages, ensures high contrast on all metadata numbers, and fixes font encoding artifacts in the sync table.

### Commit 16: Image Source Tracking & Zero-Resync Cache Guard
- **Commit Title**: `feat(sync): add image source column to sync table and guarantee cached artists are never re-fetched`
- **Scope**: Metadata source attribution, sync table layout, cache skip verification
- **Modified Files**:
  - `theme/verdant/tools/sync_artists.ps1`
  - `theme/verdant/views/artist_sync.js`
- **Key Changes**:
  - Added dedicated **`IMAGE SOURCE`** column to the Artist Cloud Sync table displaying the origin of each artist portrait (`Deezer HD`, `Wikipedia`, or `Local Track`).
  - Recorded `imageSource` in `_meta.json` and `index.json` manifests when downloading artwork.
  - Added Wikipedia image fallback when an artist lacks an official Deezer portrait.
  - Reinforced zero-resync protection in `sync_artists.ps1`: cached artists with existing artwork and metadata are skipped in 0ms without redundant network requests or file overwrites.
  - Realigned column coordinates in `views/artist_sync.js` for clear readability across all window dimensions.
- **Rationale**: Transparently displays image origin for every artist in the library and provides absolute certainty that offline-cached media is preserved and never re-downloaded unnecessarily.

### Commit 17: Fix Function Name Collision in Cards & Redesign Artist Popular Table
- **Commit Title**: `fix(artist): rename drawArtistPhoto to resolve collision with cards.js and redesign Popular tracks table`
- **Scope**: Runtime crash fix (`can't convert clipTop to number`), table UI overhaul
- **Modified Files**:
  - `theme/verdant/data/art.js`
  - `theme/verdant/views/artist.js`
- **Key Changes**:
  - Resolved `can't convert clipTop to number` crash at `cards.js:68:12` by renaming our rounded artist photo function in `art.js` from `drawArtistCard` to `drawArtistPhoto`, eliminating the namespace collision with `views/cards.js`.
  - Overhauled the Popular Tracks table in `views/artist.js`:
    - Added dedicated column headers: `#` (rank), `TITLE`, `ALBUM`, and `DURATION` (clock icon) with an aligned horizontal rule `COL.line`.
    - Added clean **ALBUM** column displaying the originating album name for each popular track.
    - Added 40×40 album art thumbnail, rank number, play icon on hover, and playing equalizer indicator.
    - Restyled the `[ Show 5 more ]` / `[ Show less ]` toggle into a rounded capsule button with hover feedback.
- **Rationale**: Eliminates the crash when opening the artist profile and elevates the popular tracks table into a polished, streaming-grade component matching the Album view tracklist.

### Commit 18: Distribute Artist Sync Table Columns Evenly & Make Numbers White Across Views
- **Commit Title**: `refactor(ui): distribute artist sync table columns evenly and make all numbers pure white across all views`
- **Scope**: Table layout optimization, space distribution, universal white typography for numbers
- **Modified Files**:
  - `theme/verdant/core/tokens.js`
  - `theme/verdant/views/artist_sync.js`
  - `theme/verdant/views/artist.js`
  - `theme/verdant/views/album.js`
  - `theme/verdant/views/albums.js`
  - `theme/verdant/views/artists.js`
  - `theme/verdant/views/bar.js`
  - `theme/verdant/views/fullscreen.js`
  - `theme/verdant/views/playlist.js`
  - `theme/verdant/views/search.js`
  - `theme/verdant/views/song_details.js`
  - `theme/verdant/views/songs.js`
  - `docs/commits_history.md`
- **Key Changes**:
  - **Artist Cloud Sync Table Column Distribution**:
    - Eliminated the wide, vacant dead-space gap between the `STATUS` column and the right-aligned `ACTION` button by recalculating table column layout from the right margin with consistent 24px column gaps.
    - Assigned balanced, proportional widths: `Action` (76px), `Status` (86px), `Listeners` (18% fluid, min 140px), `Image Source` (16% fluid, min 130px), `Tracks` (76px), with `Artist Name` fluidly taking all remaining left-side space.
  - **Universal Pure White Numbers (`COL.white`)**:
    - Added `white: RGB(255, 255, 255)` explicitly to the `COL` palette in `tokens.js`.
    - Converted all numbers that previously rendered dark or muted (`COL.black`, `COL.text2`, `COL.text3`) to pure `COL.white` across every view:
      - **Artist Sync View**: Metrics cards (Library Artists, Offline Cached count & percentage, Pending/Missing), `Fetch Missing (X)` button text, sync progress percentage and ratio `X% (Y/Z)`, track counts, and monthly listener counts.
      - **Artist Profile View**: Monthly listener figures, release counts, library song totals, Popular Tracks rank numbers (`1..10`), popular track durations, Latest Release year and track count, and discography release years.
      - **Album View**: Track numbers (`tr.trackno`), track durations (`tr.dur`), and album header year, track count, and total duration.
      - **Songs View**: Row index numbers, track durations, and header total songs count and library duration.
      - **Playlist View**: Track indices (`1..N`), track durations, and playlist header songs count and duration.
      - **Albums & Artists Grid Views**: Total library album/artist count numbers in sticky headers, and album release years on cards.
      - **Bottom Playback Bar & Fullscreen Seekbar**: Playback elapsed time and total duration numbers (`fmtTime`) rendered in crisp `COL.white`.
      - **Search View & Song Details Modal**: Search result durations and Song Details track/disc/duration metadata numbers rendered in `COL.white`.
- **Rationale**: Eliminates awkward layout stretching on widescreen monitors and dramatically improves contrast and legibility across dark backgrounds by ensuring all numerical metrics are sharp, vibrant white.

---

## Git Staging Instructions for Forking

If you wish to apply these commits sequentially to a fresh fork or new branch, you can execute the following commands in order:

```bash
# 1. Create a clean feature branch from base
git checkout -b feature/lossless-experience

# Commit 1: Core TitleFormat & Embedded Lyrics
git add theme/verdant/core/tf.js theme/verdant/data/lyrics.js
git commit -m "feat(core): add lossless metadata TitleFormat patterns and embedded lyrics parsing"

# Commit 2: Vector Barcode Engine
git add theme/verdant/core/barcode.js theme/verdant/main.js
git commit -m "feat(barcode): implement native GDI+ vector EAN-13 and Code-128 barcode engine"

# Commit 3: Multi-Artist Parsing & Art Fetcher
git add theme/verdant/data/art.js
git commit -m "feat(art): add multi-artist parsing and Deezer portrait fetcher with local cache"

# Commit 4: Dedicated Albums Grid View
git add theme/verdant/views/albums.js
git commit -m "feat(albums): introduce dedicated Albums grid view and library indexing"

# Commit 5: Dedicated Artists Grid View
git add theme/verdant/views/artists.js
git commit -m "feat(artists): add dedicated Artists grid view to library navigation"

# Commit 6: Navigation History Stack
git add theme/verdant/views/nav.js theme/verdant/ui/chrome.js
git commit -m "feat(nav): implement browser-style navigation history stack with back/forward controls"

# Commit 7 & 8: Song Details Modal & Redesign
git add theme/verdant/views/song_details.js theme/verdant/data/playlist_edit.js
git commit -m "feat(details): add comprehensive Song Details modal with lossless specs and collapsible lyrics"

# Commit 9 & 10: Album Description Redesign & Multi-Artist Support
git add theme/verdant/views/album.js theme/verdant/data/library.js theme/verdant/app.js
git commit -m "feat(album): redesign album details with 250px cover, sticky headers, and multi-artist support"

# Commit 11: Home View Recently Added & Tokens
git add theme/verdant/views/home.js theme/verdant/core/tokens.js
git commit -m "feat(home): add Recently Added shelf and update release packaging"

# Commit 12: Album Grouping Unification
git add theme/verdant/core/tf.js theme/verdant/data/library.js docs/
git commit -m "fix(library): unify tracks of the same album across multiple artists using album artist and directory path"

# Commit 13: Artist Profile Redesign with Deezer & Wikipedia Integration
git add theme/verdant/data/art.js theme/verdant/data/library.js theme/verdant/views/artist.js theme/verdant/ui/chrome.js theme/verdant/app.js docs/
git commit -m "feat(artist): redesign artist view with Deezer imagery, fan stats, popular tracks, and categorized discography"

# Commit 14: Offline-First Artist Cloud Sync Manager & Unresponsive Script Fix
git add theme/verdant/data/art.js theme/verdant/views/artist_sync.js theme/verdant/tools/sync_artists.ps1 theme/verdant/views/nav.js theme/verdant/views/artists.js theme/verdant/core/tokens.js theme/verdant/main.js theme/verdant/ui/chrome.js theme/verdant/app.js docs/
git commit -m "feat(sync): add offline-first Artist Cloud Sync manager, live progress page, and fix unresponsive script warning"

# Commit 15: Artist Hero Redesign & Sync UI Polish
git add theme/verdant/data/art.js theme/verdant/views/artist.js theme/verdant/views/artist_sync.js docs/
git commit -m "refactor(artist): redesign artist hero with album-style artwork card, white typography, and polish sync UI"

# Commit 16: Image Source Column & Zero-Resync Cache Guard
git add theme/verdant/tools/sync_artists.ps1 theme/verdant/views/artist_sync.js docs/
git commit -m "feat(sync): add image source column to sync table and guarantee cached artists are never re-fetched"

# Commit 17: Fix Name Collision in Cards & Redesign Popular Table
git add theme/verdant/data/art.js theme/verdant/views/artist.js docs/
git commit -m "fix(artist): rename drawArtistPhoto to resolve collision with cards.js and redesign Popular tracks table"

# Commit 18: Distribute Artist Sync Table Columns Evenly & Make Numbers White Across Views
git add theme/verdant/core/tokens.js theme/verdant/views/artist_sync.js theme/verdant/views/artist.js theme/verdant/views/album.js theme/verdant/views/albums.js theme/verdant/views/artists.js theme/verdant/views/bar.js theme/verdant/views/fullscreen.js theme/verdant/views/playlist.js theme/verdant/views/search.js theme/verdant/views/song_details.js theme/verdant/views/songs.js docs/commits_history.md
git commit -m "refactor(ui): distribute artist sync table columns evenly and make all numbers pure white across all views"
```


