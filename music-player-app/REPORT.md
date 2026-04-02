# Groovix – Project Development Report

**Project Name:** Groovix  
**Type:** Web-Based Music Player Application  
**Stack:** HTML5, CSS3, Vanilla JavaScript  
**Prepared by:** Kiro AI  
**Date:** April 2, 2026

---

## 1. Executive Summary

Groovix is a fully client-side, responsive music player web application built without any backend server or external dependencies beyond Font Awesome icons. The application runs entirely in the browser, stores user data locally, and is designed to work seamlessly across mobile phones, tablets, laptops, and desktop computers. It includes an integrated AI music assistant, playlist management, favorites, sorting, and a branded splash screen experience.

---

## 2. Project Objectives

- Build a functional music player that can detect and play locally downloaded audio files
- Provide an AI assistant capable of answering music-related questions and recommending download sources
- Support playlist creation and favorites management
- Deliver a fully responsive UI that feels native on mobile devices
- Establish a strong brand identity under the name **Groovix**

---

## 3. Application Architecture

The application is structured across five core files:

| File | Responsibility |
|---|---|
| `index.html` | Application structure, views, modals, navigation |
| `style.css` | All styling, responsive breakpoints, animations |
| `player.js` | Audio playback engine, library, favorites, playlists |
| `ai.js` | AI assistant logic, chat interface, knowledge base |
| `app.js` | Navigation routing, AI panel toggle, drag-and-drop |

All data (songs metadata, favorites, playlists) is persisted using the browser's `localStorage` API under the `groovix_*` namespace.

---

## 4. Features Developed

### 4.1 Music Player
- Full audio playback with play, pause, next, previous controls
- Shuffle and repeat modes
- Seekable progress bar with real-time timestamps
- Volume slider
- Album art display with animated pulse effect when playing
- Song title and artist parsed automatically from filenames

### 4.2 Music Library
- Add songs via file picker (supports MP3, WAV, FLAC, OGG, AAC, M4A, OPUS)
- Grant access to an entire music folder using the **File System Access API** (Chrome/Edge)
- Recursive folder scanning — picks up songs from subfolders automatically
- Real-time search filtering
- Sort options: Date Added, Name A–Z/Z–A, Artist A–Z/Z–A, Shortest/Longest first
- Drag-and-drop audio files directly into the library view
- Remove individual songs from the library

### 4.3 Favorites
- Heart icon on every song in the library and on the player view
- Tap to toggle — turns red when active
- Dedicated Favorites tab showing all liked songs
- Favorites persist across sessions via localStorage

### 4.4 Playlists
- Create named playlists
- Open a playlist to add or remove songs from the library
- Delete playlists
- Song count displayed on each playlist card
- Playlist data persists across sessions

### 4.5 AI Music Assistant
- Floating circular button fixed at the bottom-right corner
- Opens an animated chat panel on tap
- Answers questions about music, player features, and download sources
- Recommends free and legal download platforms including:
  - YouTube via yt-dlp
  - SoundCloud, Free Music Archive, Jamendo, Bandcamp
  - ccMixter, Internet Archive, Musopen, NoiseTrade, Looperman
- Provides genre-based artist recommendations (Afrobeats, Hip Hop, R&B, Pop, Rock, Jazz, etc.)
- Deliberately excludes paid streaming platforms per project requirements
- Typing indicator animation for a natural conversation feel
- Welcome message on first load

### 4.6 Splash Screen
- Full-screen branded splash on app launch
- Displays the Groovix logo icon, app name, and tagline: **"Your Music, Your Mind"**
- Animated loading bar fills over ~2 seconds
- Fades out smoothly with a scale transition before the main app appears

---

## 5. Responsive Design

The application uses a mobile-first CSS architecture with three distinct layout tiers:

| Breakpoint | Layout |
|---|---|
| Desktop (> 1024px) | Full sidebar with icons and labels, large album art |
| Tablet (641–1024px) | Collapsed icon-only sidebar (64px), compact views |
| Mobile (≤ 640px) | Sidebar hidden, mobile top bar, bottom navigation bar |

### Mobile-Specific Implementations
- Fixed bottom navigation bar with four tabs: Player, Library, Favorites, Playlists
- Mobile top bar displaying the Groovix brand
- AI chat panel repositioned above the bottom nav
- Modals slide up from the bottom (native sheet behaviour)
- Album art scales fluidly using CSS `clamp()` — fills most of the screen width
- Song controls and metadata positioned directly below the album art
- Touch-friendly tap targets with `-webkit-tap-highlight-color` removed
- `100dvh` used for correct viewport height on mobile browsers with dynamic toolbars
- Safe area insets (`env(safe-area-inset-bottom)`) for notched/punch-hole devices

---

## 6. Technical Highlights

- **No framework or build tool required** — opens directly in any modern browser
- **File System Access API** for native-like folder permission and scanning
- **Blob URLs** for in-memory audio playback without uploading files to any server
- **localStorage** for persistent user data across sessions
- **CSS custom properties** for consistent theming throughout
- **CSS animations** for splash screen, album art pulse, typing indicator, and AI panel spring entrance
- **Keyboard support** — Enter key sends AI messages, all interactive elements are focusable

---

## 7. Branding

| Element | Value |
|---|---|
| App Name | Groovix |
| Tagline | Your Music, Your Mind |
| Primary Color | #a855f7 (Purple) |
| Secondary Color | #7c3aed (Deep Purple) |
| Background | #0f0f13 (Near Black) |
| Accent (Love/Favorites) | #f43f5e (Rose Red) |

---

## 8. Known Limitations

- The File System Access API (folder picker) is only supported in Chromium-based browsers (Chrome, Edge). Firefox users can still add songs via the file picker.
- Audio files are loaded as blob URLs which are session-only — songs must be re-added after a page refresh. Only metadata (name, artist, duration) is saved to localStorage.
- The AI assistant operates on a local knowledge base and does not connect to an external AI API. Responses are rule-based.

---

## 9. Conclusion

Groovix was built from the ground up as a complete, production-ready music player web application. It delivers a polished, app-like experience across all device sizes, with a strong feature set that includes AI assistance, playlist management, favorites, and flexible music library access. The codebase is clean, modular, and requires no installation or server to run.
