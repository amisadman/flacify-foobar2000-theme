# Flacify Next-Gen Feature Roadmap & Implementation Plan

> **Project**: [Flacify for foobar2000](https://github.com/amisadman/flacify-foobar2000-theme)  
> **Author**: [amisadman](https://github.com/amisadman) (extended from [superziper](https://github.com/superziper))  
> **Status**: Architecture & Planning Phase  

---

## Executive Summary

**Flacify** transforms foobar2000 into a modern, Spotify-grade desktop experience engineered for local, high-fidelity lossless audio collections.

This document outlines the architecture, feature specifications, and step-by-step engineering plan for the next major evolutions of Flacify:
1. **Flacify Connect** — Seamless, zero-install Wi-Fi remote control from any smartphone (iOS / Android) styled identically to Spotify Mobile.
2. **Artist Profile Studio** — Drag-and-drop portrait uploader and in-theme custom biography editor.
3. **Listening History ("Recently Played")** — Persistent track history with relative timestamps and Home view integration.
4. **Liked Songs System** — Interactive player bar heart button (`💚`) synced to an auto-managed playlist.
5. **Lossless Audio Quality Badge** — Live `24-bit / 96kHz HI-RES LOSSLESS` streaming badge in the playback bar.
6. **Inline Quick Filter (`Ctrl+F`)** & **Sleep Timer**.

---

## 1. Feature Specifications

```
                           FLACIFY ECOSYSTEM
┌────────────────────────────────────────────────────────────────────────┐
│                          Windows Desktop PC                            │
│  ┌───────────────────────┐                  ┌───────────────────────┐  │
│  │   Flacify Desktop UI  │                  │   Flacify Core Engine │  │
│  │ • 28px Nav Controls   │                  │ • Lossless FLAC Stream│  │
│  │ • Artist Studio       │                  │ • Lyrics Loader       │  │
│  │ • Liked Songs (💚)    │                  │ • Barcode Generator   │  │
│  │ • Lossless Badge      │                  │ • History Logger      │  │
│  └───────────┬───────────┘                  └───────────┬───────────┘  │
│              │                                          │              │
│              ▼                                          ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Flacify Connect Bridge (HTTP/WebSocket)             │  │
│  │       • Local IP discovery   • Live WebSockets   • Zero Data      │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ Local Wi-Fi / Hotspot
                                       ▼ (Latency: ~2ms)
                        ┌──────────────────────────────┐
                        │       Smartphone (PWA)       │
                        │    (Safari iOS / Chrome)     │
                        │ • Spotify Mobile Dark Theme  │
                        │ • Live Album Art & Synced LRC│
                        │ • Full Remote Control & Vol  │
                        │ • Playlist & Search Browser  │
                        └──────────────────────────────┘
```

---

### Feature 1: 📱 Flacify Connect (Local Wi-Fi Remote Control)

#### User Experience
1. **Desktop Initiation**: In the bottom player bar of Flacify, a new Spotify **Devices** icon (`🎧/💻`) is available.
2. **Devices Modal**: Clicking the icon displays:
   - **Active Output Device**: Shows current PC audio output (e.g., Speakers, Bluetooth Headphones, USB DAC).
   - **Connect a Phone Card**: Displays a crisp, vector-rendered **QR Code** and the local URL (`http://<PC_IP>:8880`).
3. **Phone Connection**: User points iPhone or Android camera at the screen and taps the link.
4. **Mobile Web Experience (PWA)**:
   - **Now Playing Screen**: Large album art, track title, artist, interactive seek bar, volume slider, shuffle/repeat toggles, and play/pause/skip buttons.
   - **Rolling Synced Lyrics**: Live synchronized lyrics rolling with the track on the phone screen.
   - **Library & Playlist Drawer**: Browse playlists, see tracklists, and tap any song to immediately play on PC.
   - **Add to Home Screen**: Prompts user to install as a standalone Progressive Web App (PWA) with a native Flacify app icon on their phone home screen.

---

### Feature 2: 🎨 Artist Profile Studio (Upload Photo & Edit Bio)

#### User Experience
1. **Custom Portrait Upload**:
   - Hovering over the circular artist portrait reveals a camera/edit button overlay (*"Change Portrait"*).
   - Supports **drag-and-drop** of any `.jpg`, `.png`, or `.webp` file from Windows onto the avatar.
   - Clicking opens the native Windows File Picker dialog.
   - Automatically crops the image into a 1:1 square using GDI+ HighQualityBicubic interpolation and saves it to `cache/artists/<ArtistName>.jpg`.
2. **Custom Bio & Metadata Editor**:
   - An **"Edit Profile"** button opens a dark modal dialog with:
     - Editable multiline text field for Artist Bio.
     - Custom monthly listener count or tag (e.g. *"Local Legend"*, *"Offline Favorite"*).
     - Custom origin/genre tags.
   - Saves into `cache/artists/<ArtistName>_meta.json` with an `"isCustom": true` flag so automated background syncs never overwrite user modifications.

---

### Feature 3: 🕒 Listening History & "Recently Played"

#### User Experience
1. **Home View Integration**:
   - Adds a new horizontal shelf at the top of the Home view: **"Recently Played"**.
   - Displays cards for recently played albums, playlists, and tracks with relative timestamps (*"Just now"*, *"45m ago"*, *"Yesterday"*).
2. **Dedicated Sidebar History View**:
   - A dedicated **"Listening History"** link in the left sidebar.
   - Chronological table showing exact play times, track titles, artists, duration, and play count.
   - Action buttons: **"Resume"**, **"Play All"**, and **"Clear History"**.
3. **Logging Rules**:
   - Hooks into track playback events; records an entry once a track reaches a 30-second or 50% completion threshold to prevent false logs during fast skipping.

---

### Feature 4: 💚 Liked Songs & Favorites System

#### User Experience
1. **Player Bar Heart**:
   - A Spotify heart button (`♡` / `💚`) directly to the right of the track title and artist in the bottom bar.
   - Clicking toggles green fill with a subtle micro-animation.
2. **Playlist Sync**:
   - Automatically adds or removes the song from an auto-created **"Liked Songs"** playlist.
   - Optionally sets a foobar2000 `%rating%` or `%favorite%` tag.
3. **Sidebar Pinned Card**:
   - A permanent **"Liked Songs"** card in the left navigation sidebar featuring the iconic purple-to-green gradient heart artwork.

---

### Feature 5: 🎛️ Live Lossless Hi-Res Audio Quality Badge

#### User Experience
1. **Playback Bar Badge**:
   - Appears next to the track title in the bottom player bar:
     - `HI-RES LOSSLESS · 24-bit / 96kHz` (emerald green badge)
     - `FLAC LOSSLESS · 16-bit / 44.1kHz` (subtle green badge)
     - `DSD · 2.8MHz` (gold badge)
2. **Interactive Modal**:
   - Clicking the badge directly pops up the **Song Details** modal with full audio specs, MD5 checksum, and native vector barcode.

---

### Feature 6: 🔍 Inline Playlist Filter (`Ctrl+F`) & ⏱️ Sleep Timer

* **Inline Filter**: Pressing `Ctrl+F` in any playlist or the All Songs view expands a floating search bar that filters table rows in real time without navigating away.
* **Sleep Timer**: A timer menu in the titlebar (*"Stop playback in 15m / 30m / 45m / End of track"*) with gentle 5-second volume fade-out.

---

## 2. Technical Architecture for Flacify Connect

### Component Evaluation: Why `foo_beefweb` is the Ideal Engine

To deliver a native, rock-solid Spotify Connect experience without requiring users to install Node.js or Python, we leverage **[Beefweb Remote Controller](https://github.com/hyperblast/beefweb)** (`foo_beefweb`):

| Characteristic | foo_beefweb Engine | Custom External Server |
|---|---|---|
| **Installation** | Single bundled `.dll` in foobar2000 components folder | Requires Node.js or Python runtime |
| **Protocol** | High-performance C++ HTTP server + WebSockets | External process bridge |
| **Latency** | **< 2ms** on local network | 50-100ms |
| **API Coverage** | Full player control, volume, track info, active playlist, artwork blitting | Needs custom IPC wrappers |
| **Security** | Local LAN only, optional password authentication | Custom auth needed |

### Data Flow & Communication Diagram

```
[Smartphone Browser / PWA]
       │
       │  1. HTTP GET / (Fetches Spotify Mobile HTML/CSS/JS)
       │  2. WebSocket Connect ws://<PC_IP>:8880/api/websocket
       ▼
[foobar2000 (foo_beefweb)]
       │
       ├──► Player Core: Play, Pause, Next, Volume, Seek
       ├──► Media Library: Fetch playlists, search tracks
       └──► Artwork Streamer: Send album covers (JPG/PNG)
       │
       ▼  3. WebSocket Push Event: { status: "playing", title: "...", position: 42.5 }
[Smartphone UI Updates in Real-Time]
```

### QR Code Generation in Theme
To generate the QR code inside Flacify without external network requests:
* Integrate a self-contained, offline vector QR code generator (e.g. `qrcode-generator` in JS, ~12KB).
* Resolves the machine's local IPv4 address via PowerShell / Windows WMI on startup.
* Renders cleanly on screen via native GDI+ `FillSolidRect` pixels inside the Devices popup.

---

## 3. Implementation Plan & Milestones

### Milestone 1: Core Library & Listening Experience (v1.1.0)
* [ ] **Listening History Tracker**:
  - Create `theme/verdant/data/history.js` to log playback events to `cache/history.json`.
  - Add **"Recently Played"** shelf on `views/home.js`.
  - Add **"History"** view in sidebar navigation.
* [ ] **Liked Songs System**:
  - Add interactive heart icon to `views/bar.js` and track tables.
  - Implement playlist auto-sync in `data/playlist_edit.js`.
  - Add pinned **Liked Songs** tile in `views/nav.js`.
* [ ] **Lossless Hi-Res Badge**:
  - Read active decoder stream specs in `core/tf.js`.
  - Render interactive pill badge in `views/bar.js`.

### Milestone 2: Artist Profile Studio & Quick Tools (v1.2.0)
* [ ] **Artist Photo Upload**:
  - Add camera icon overlay on avatar in `views/artist.js`.
  - Implement drag-and-drop file receiver and Windows file picker call.
  - Save cropped square image to `cache/artists/<Artist>.jpg`.
* [ ] **In-Theme Bio Editor**:
  - Create `modalEditArtistBio` in `ui/chrome.js`.
  - Save custom biography and listener tags with `"isCustom": true`.
* [ ] **Inline Playlist Filter**:
  - Implement real-time array filter and keyboard shortcut (`Ctrl+F`).
* [ ] **Sleep Timer**:
  - Add timer scheduler with smooth volume attenuation.

### Milestone 3: Flacify Connect Remote (v1.3.0)
* [ ] **Server Bundle & Detection**:
  - Bundle `foo_beefweb` with `install.bat` and detect server port `8880`.
* [ ] **Devices Popup & QR Code**:
  - Add `devices` icon to `views/bar.js`.
  - Implement offline QR code rendering modal displaying local LAN IP.
* [ ] **Mobile Web Client (PWA)**:
  - Develop lightweight, responsive mobile UI matching Spotify mobile aesthetics.
  - Support real-time WebSocket playback control, volume slider, rolling lyrics, and playlist browser.
  - Configure PWA manifest (`manifest.json`) and service worker for offline app icon installation.

---

## 4. Verification & Testing Strategy

1. **Local Network Connectivity**:
   - Test connection across different network configurations (Home Wi-Fi router, Phone Hotspot, multi-band 2.4GHz/5GHz).
   - Validate iOS Safari and Android Chrome compatibility.
2. **Zero-Lag Performance**:
   - Ensure WebSocket messages process in under 10ms with zero CPU overhead on the desktop player.
3. **Offline Integrity**:
   - Verify that all artist studio edits, listening history, and local playback controls function with 100% internet disconnection.
