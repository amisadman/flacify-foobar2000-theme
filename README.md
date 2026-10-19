<div align="center">

# Flacify

### The modern, Spotify-style experience for your local lossless music library

*A powerful, high-fidelity foobar2000 theme that gives your local FLAC and lossless collection the sleek look, responsive feel, and rich metadata of modern Spotify desktop.*

[![Release](https://img.shields.io/github/v/release/superziper/verdant-foobar2000-theme?color=1DB954&label=release)](https://github.com/superziper/verdant-foobar2000-theme/releases/latest)
![foobar2000](https://img.shields.io/badge/foobar2000-v2%20·%2064--bit-1DB954)
![Audio](https://img.shields.io/badge/Lossless-FLAC%20%7C%20Hi--Res-1DB954)
![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-1DB954)
[![Fork of Verdant](https://img.shields.io/badge/extended%20from-Verdant-1DB954)](https://github.com/superziper/verdant-foobar2000-theme)

**Four-step install. No components to hunt down. No fonts to install.**

<img src="docs/images/home.png" alt="Flacify home view: playlist shelf, artist grid and queue" width="900">

</div>

---

## What is Flacify?

**Flacify** is a modern, dark-mode foobar2000 theme built specifically for music collectors who love **local high-quality lossless audio** (FLAC, ALAC, WAV, Hi-Res) but desire the fluid, aesthetic user experience of Spotify.

Everything on screen is custom-drawn in a [JSplitter](https://hydrogenaud.io/) panel running under [Columns UI](https://github.com/reupen/columns_ui) — custom sidebar, home shelf, dedicated albums and artists grids, comprehensive artist profile views, song details modal with vector barcode rendering, synced lyrics, player bar, and custom frameless titlebar with navigation history.

> **Note**: Flacify plays **only your local files** that you own on disk. It is completely offline-first, private, and subscription-free.

---

## The Perfect Companion for SpotiFLAC

If you curate your local high-fidelity library using **[SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC)**, **Flacify is built for you**.

- **Curate with SpotiFLAC**: Download your favorite tracks and playlists in true 16-bit / 24-bit lossless FLAC.
- **Listen with Flacify**: Load your folder into foobar2000 and enjoy an identical Spotify-inspired desktop interface with zero streaming compression, zero internet dependencies, and bit-perfect playback.

Special thanks and credit to **[afkarxyz/SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC)** for empowering music lovers to build pristine, offline lossless collections.

---

## Extended Features (What's New in Flacify)

Flacify is an extended evolution of the original **[Verdant](https://github.com/superziper/verdant-foobar2000-theme)** theme by [superziper](https://github.com/superziper). Flacify adds dozens of new capabilities designed specifically for local lossless library collectors:

| Feature | Base Verdant | Flacify (Extended) |
|---|---|---|
| **Dedicated Albums View** | ❌ No dedicated album grid | ✅ Full cover grid with release years, track counts & sorting |
| **Dedicated Artists View** | ❌ Home-only slice | ✅ Dedicated Artists grid with circular avatars & track totals |
| **Artist Profiles** | ⚠️ Basic view | ✅ Redesigned profile with genuine Spotify monthly listeners, verified bio, popular tracks & discography shelves |
| **Artist Cloud Sync** | ❌ None | ✅ Built-in offline-first sync manager powered by Spotify Web Scraper GraphQL (zero API key needed) |
| **Lossless Song Details** | ❌ Basic properties | ✅ Modal with audio codec, bit depth, sample rate, bitrate, MD5 & native vector EAN-13/Code-128 barcode |
| **Navigation History** | ⚠️ Prev/next track skips | ✅ Real browser-style Back/Forward history stack with enlarged 28px circular arrow buttons |
| **Multi-Artist Parsing** | ⚠️ Single artist string | ✅ Splits collaborating artists into individual clickable links & tags |
| **Image Proportion Engine** | ⚠️ Can stretch non-square art | ✅ Aspect-Fill square cropping using GDI+ HighQualityBicubic interpolation |
| **Bio Sanitizer** | ⚠️ Raw HTML & emoji boxes | ✅ Decodes HTML entities, strips raw tags, removes unrenderable emojis, repairs UTF-8 mojibake |
| **Lyrics Experience** | ⚠️ Cluttered subtitle | ✅ Clean vertical centering, embedded Vorbis/ID3 tag parsing + external `.lrc`/`.txt` support |

---

## Core Features

- **Home View** — Horizontal shelf of your playlists with 2×2 cover mosaics, Recently Added shelf, and artist highlights.
- **Dedicated Albums Grid** — Browse your albums with rich 1:1 covers, artist subtitles, release years, and track counts.
- **Dedicated Artists Grid** — Discover your collection by artist with high-res circular portraits and direct navigation.
- **Rich Artist Profiles** — Featuring official artist photography, verified monthly listeners, formatted biographies, top 5 popular tracks table with play count bars, and categorized discography (Albums, Singles & EPs).
- **Artist Cloud Sync** — Offline-first background synchronization using Spotify GraphQL and Deezer HD APIs. Once cached, metadata is permanently preserved locally with zero re-syncs.
- **Comprehensive Song Details Modal** — Press the details button on any track to view full lossless audio specs (FLAC/ALAC, sample rate, bit depth, bitrate, codec MD5), copyright info, ISRC, catalog number, collapsible synced lyrics, and a native vector EAN-13 / Code-128 barcode.
- **Desktop Navigation** — Browser-style navigation history stack with dedicated 28px left (`←`) and right (`→`) arrow buttons in the custom titlebar.
- **Lyrics & Queue Pane** — Toggle between upcoming queue items and real-time rolling synced lyrics (`.lrc` or embedded tags).
- **All Songs Virtual List** — Virtualized table capable of rendering tens of thousands of tracks with zero stutter, with instant ReplayGain loudness normalization.
- **Fullscreen Chill Mode** — Big now-playing cover art, rolling lyrics, or 4 distinct styles of real PCM FFT audio visualizers.
- **Smart Duplicate Detection** — Drag-and-drop tracks into playlists with automatic duplicate warning prompts.

---

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/images/playlist.png" alt="Playlist view"><br><sub><b>Playlist View with Dynamic Gradient</b></sub></td>
<td width="50%"><img src="docs/images/all-songs.png" alt="All Songs view"><br><sub><b>All Songs Virtualized List</b></sub></td>
</tr>
<tr>
<td><img src="docs/images/search.png" alt="Search"><br><sub><b>Instant Search Across Library</b></sub></td>
<td><img src="docs/images/artist.png" alt="Artist page"><br><sub><b>Rich Artist Profile & Discography</b></sub></td>
</tr>
<tr>
<td><img src="docs/images/fullscreen.png" alt="Fullscreen now playing"><br><sub><b>Fullscreen Now Playing</b></sub></td>
<td><img src="docs/images/fullscreen-lyrics.png" alt="Fullscreen synced lyrics"><br><sub><b>Fullscreen Synced Lyrics</b></sub></td>
</tr>
<tr>
<td><img src="docs/images/fullscreen-visualizer.png" alt="Fullscreen visualizer"><br><sub><b>Real-Time FFT Visualizer</b></sub></td>
<td><img src="docs/images/playlist-empty-rename.png" alt="Empty playlist and rename dialog"><br><sub><b>Playlist Management</b></sub></td>
</tr>
</table>

---

## Quick Installation

1. Install **foobar2000 v2 (64-bit)** as **portable** from the [official website](https://www.foobar2000.org/download).
2. Download **`Verdant-v1.2.0.zip`** (or latest Flacify release zip) from the **[Releases](https://github.com/superziper/verdant-foobar2000-theme/releases)**.
3. Extract the **`profile`** folder from the zip into foobar2000's root folder (the directory containing `foobar2000.exe`).
4. Start foobar2000. Under **Preferences → Media Library**, add your music folder (e.g. your SpotiFLAC download directory).

> Columns UI, JSplitter, and UI Wizard are bundled — nothing to install separately. And **no fonts to download**: Flacify uses native Windows Segoe UI and Segoe MDL2 Assets.

### Using with an existing foobar2000 setup?
Close foobar2000, double-click **`install.bat`**, and start foobar2000. The installer backs up your existing configuration in `<profile>\verdant-backup\<date>\`.

---

## Syncing Artist Photos & Monthly Listeners

Flacify comes with a built-in offline artist sync utility:

1. In the sidebar, click the **Cloud** icon or navigate to the Artist Cloud Sync view.
2. Click **Fetch Missing** (or run `tools/sync_artists.ps1` in PowerShell).
3. Flacify connects to the anonymous Spotify Web Scraper GraphQL pipeline, downloads official high-resolution avatars, verified monthly listener counts, and bio descriptions, crops them into 1:1 squares, and caches them to disk.
4. Once cached, Flacify runs **100% offline**.

---

## Credits & Acknowledgments

Flacify is built upon the wonderful work of the open-source foobar2000 and music communities:

- **[superziper](https://github.com/superziper)** — Creator of the original **[Verdant](https://github.com/superziper/verdant-foobar2000-theme)** theme, which laid the magnificent architectural foundation for this project.
- **[afkarxyz](https://github.com/afkarxyz)** — Creator of **[SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC)**, the premier tool for acquiring high-quality lossless FLAC music collections.
- **Reupen Shah** — Author of [Columns UI](https://github.com/reupen/columns_ui).
- **LUR** — Author of **JSplitter** (`foo_uie_jsplitter`).
- **The Wizardium** — Author of [UI Wizard](https://github.com/The-Wizardium/UI-Wizard).

---

## License & Disclaimer

- Flacify code is licensed under the [MIT License](LICENSE).
- Bundled third-party components retain their respective licenses (Columns UI: LGPL-3.0, UI Wizard: MIT).
- Not affiliated with, sponsored by, or endorsed by Spotify AB. "Spotify" is a registered trademark of Spotify AB. This is an independent, open-source fan-made theme for personal offline music players.
