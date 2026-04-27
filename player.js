// ===================== PLAYER =====================
const Player = (() => {
  let songs = JSON.parse(localStorage.getItem('groovix_songs') || '[]');

  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let isRepeat  = false;
  let sortMode  = 'default';

  const audio        = document.getElementById('audioPlayer');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnPrev      = document.getElementById('btnPrev');
  const btnNext      = document.getElementById('btnNext');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnRepeat  = document.getElementById('btnRepeat');
  const progressBar  = document.getElementById('progressBar');
  const volumeBar    = document.getElementById('volumeBar');
  const currentTimeEl= document.getElementById('currentTime');
  const durationEl   = document.getElementById('duration');
  const songTitleEl  = document.getElementById('songTitle');
  const songArtistEl = document.getElementById('songArtist');
  const albumArt = document.getElementById('albumArt');
  const songList = document.getElementById('songList');
  const fileInput    = document.getElementById('fileInput');
  const searchInput  = document.getElementById('searchInput');
  const sortSelect   = document.getElementById('sortSelect');
  const waveform     = document.getElementById('waveform');

  const blobUrls = {};
  const WAVEFORM_BARS = 60;
  const AUDIO_EXTS = ['mp3','wav','flac','ogg','aac','m4a','opus','weba'];

  // ---- IndexedDB for Persistent Storage ----
  const DB_VERSION = 2;
  const STORE_MUSIC = 'music';
  const STORE_COVERS = 'covers';
  
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_MUSIC)) db.createObjectStore(STORE_MUSIC);
        if (!db.objectStoreNames.contains(STORE_COVERS)) db.createObjectStore(STORE_COVERS);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveFileToDB(id, file) {
    const db = await openDB();
    const tx = db.transaction(STORE_MUSIC, 'readwrite');
    tx.objectStore(STORE_MUSIC).put(file, id);
  }

  async function getFileFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_MUSIC).objectStore(STORE_MUSIC).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveCoverToDB(id, blob) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_COVERS, 'readwrite');
      tx.objectStore(STORE_COVERS).put(blob, id);
    } catch(e) { console.warn('Cover save error', e); }
  }

  async function getCoverFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_COVERS).objectStore(STORE_COVERS).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteFromDB(id) {
    const db = await openDB();
    const tx = db.transaction([STORE_MUSIC, STORE_COVERS], 'readwrite');
    tx.objectStore(STORE_MUSIC).delete(id);
    tx.objectStore(STORE_COVERS).delete(id);
  }

  async function hydrateCovers() {
    console.log('Hydrating covers...');
    for (const song of songs) {
      if (!song.coverUrl || song.coverUrl.startsWith('blob:')) {
        try {
          const blob = await getCoverFromDB(song.id);
          if (blob) {
            song.coverUrl = URL.createObjectURL(blob);
          }
        } catch(e) { console.warn('Hydration failed for', song.id, e); }
      }
    }
    renderList(searchInput ? searchInput.value : '');
  }


  // Web Audio EQ
  let audioCtx, sourceNode, eqFilters = [];
  
  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sourceNode = audioCtx.createMediaElementSource(audio);
      
      // 3-band EQ
      const freqs = [150, 1000, 8000];
      const types = ['lowshelf', 'peaking', 'highshelf'];
      
      let lastNode = sourceNode;
      freqs.forEach((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.value = f;
        filter.gain.value = 0;
        lastNode.connect(filter);
        lastNode = filter;
        eqFilters.push(filter);
      });
      lastNode.connect(audioCtx.destination);
    } catch(e) { console.warn("Web Audio not supported", e); }
  }

  function setEQ(preset) {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    
    const gains = {
      'normal': [0, 0, 0],
      'bass':   [12, 0, -4],
      'pop':    [-2, 6, 4],
      'rock':   [6, -4, 6],
      'classical': [0, 2, 10]
    };
    const vals = gains[preset] || gains['normal'];
    if (eqFilters.length) {
      vals.forEach((v, i) => eqFilters[i].gain.setTargetAtTime(v, audioCtx.currentTime, 0.1));
    }
  }

  function setSpeed(val) {
    audio.playbackRate = val;
  }

  // ---- Helpers ----
  function formatTime(sec) {
    if (isNaN(sec) || sec == null) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function durationToSec(str) {
    if (!str || str === '--') return 0;
    const [m, s] = str.split(':').map(Number);
    return m * 60 + s;
  }

  function saveSongs() {
    localStorage.setItem('groovix_songs', JSON.stringify(
      songs.map(s => ({ 
        id: s.id, 
        name: s.name, 
        artist: s.artist, 
        album: s.album, 
        duration: s.duration, 
        coverUrl: s.coverUrl, // Note: transient blob URLs won't work after reload
        dateAdded: s.dateAdded 
      }))
    ));
  }


  // ---- Waveform ----
  function buildWaveform() {
    waveform.innerHTML = '';
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      const h = 20 + Math.random() * 80;
      bar.style.height = h + '%';
      waveform.appendChild(bar);
    }
  }

  function updateWaveform() {
    if (!audio.duration) return;
    const pct = audio.currentTime / audio.duration;
    const played = Math.floor(pct * WAVEFORM_BARS);
    const bars = waveform.querySelectorAll('.waveform-bar');
    bars.forEach((b, i) => b.classList.toggle('played', i < played));
  }

  buildWaveform();

  // ---- Clean filename ----
  function cleanFilename(filename) {
    let name = filename
      .replace(/\.[^.]+$/, '')
      .replace(/^\d+_\d+_?/g, '')
      .replace(/^\d+[\s_-]+/g, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      return { title: parts.slice(1).join(' - ').trim(), artist: parts[0].trim() };
    }
    return { title: name || 'Unknown Title', artist: 'Unknown Artist' };
  }

  // ---- Sort ----
  function getSortedSongs(list) {
    if (!list) return [];
    const arr = [...list];
    if (sortMode === 'title') return arr.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    if (sortMode === 'artist') return arr.sort((a,b) => (a.artist||'').localeCompare(b.artist||''));
    if (sortMode === 'newest') return arr.sort((a,b) => (b.dateAdded||0) - (a.dateAdded||0));
    return arr;
  }

  // ---- Song item ----
  function makeSongItem(song, realIdx, isActive) {
    const li = document.createElement('li');
    li.className = 'song-item' + (isActive ? ' active' : '');
    
    const isFav = (typeof favorites !== 'undefined') && favorites.includes(song.id);
    const thumb = song.coverUrl 
      ? `<img src="${song.coverUrl}" alt="cover" onerror="this.style.display='none'"/>` 
      : '<i class="fa fa-music"></i>';

    li.innerHTML = `
      <div class="song-thumb">${thumb}</div>
      <div class="song-item-info">
        <div class="title">${song.name || 'Unknown Title'}</div>
        <div class="artist">${song.artist || 'Unknown Artist'}</div>
      </div>
      <div class="song-item-right">
        <button class="song-item-action btn-fav ${isFav ? 'fav-active' : ''}"><i class="fa fa-heart"></i></button>
        <button class="song-item-menu"><i class="fa fa-ellipsis-vertical"></i></button>
      </div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.song-item-right')) return;
      const idx = songs.findIndex(s => s.id === song.id);
      if (idx >= 0) playSong(idx);
    });

    const fBtn = li.querySelector('.btn-fav');
    if (fBtn) fBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = songs.findIndex(s => s.id === song.id);
      if (idx >= 0) { currentIndex = idx; toggleFavorite(); fBtn.classList.toggle('fav-active'); }
    });

    const mBtn = li.querySelector('.song-item-menu');
    if (mBtn) mBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = songs.findIndex(s => s.id === song.id);
      if (typeof window.openContextMenu === 'function') window.openContextMenu(idx >= 0 ? idx : realIdx);
    });

    return li;
  }

  // ---- Render lists ----
  function renderList(filter = '') {
    console.log('renderList called with filter:', filter);
    if (!songList) return;
    
    // Force visibility of the main list
    songList.style.display = '';
    const favoritesList = document.getElementById('favoritesList');
    if (favoritesList) favoritesList.style.display = 'none';

    songList.innerHTML = '';
    let list = songs || [];
    
    // Apply sorting
    if (typeof getSortedSongs === 'function') {
      list = getSortedSongs(list);
    }
    
    // Apply filtering
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(f)) || 
        ((s.artist||'').toLowerCase().includes(f))
      );
    }

    if (list.length === 0) {
      songList.innerHTML = '<li class="empty-msg"><i class="fa fa-music"></i><br>No songs yet. Tap the plus icon at the top to add a music folder.</li>';
      return;
    }

    list.forEach(song => {
      try {
        const realIdx = songs.indexOf(song);
        const item = makeSongItem(song, realIdx, realIdx === currentIndex);
        songList.appendChild(item);
      } catch (e) {
        console.error('Error rendering song item:', e);
      }
    });
    console.log('renderList finished. Items in DOM:', songList.children.length);
  }







  // ---- Now Playing Bar ----
  const nowPlayingBar = document.getElementById('nowPlayingBar');
  const npbArt        = document.getElementById('npbArt');
  const npbTitle      = document.getElementById('npbTitle');
  const npbArtist     = document.getElementById('npbArtist');
  const npbPlay       = document.getElementById('npbPlay');

  function updateNowPlayingBar() {
    const song = songs[currentIndex];
    if (!song) { 
      nowPlayingBar.classList.remove('visible'); 
      return; 
    }
    npbTitle.textContent  = song.name;
    npbArtist.textContent = song.artist || 'Unknown Artist';
    npbArt.innerHTML = song.coverUrl ? `<img src="${song.coverUrl}" alt=""/>` : '<i class="fa fa-music"></i>';
    npbPlay.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
    nowPlayingBar.classList.add('visible');
  }

  npbPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // ---- Favorites ----
  const btnHeart = document.getElementById('btnHeart');
  const btnFavoriteAction = document.getElementById('btnFavoriteAction');
  let favorites = JSON.parse(localStorage.getItem('groovix_favorites') || '[]');

  function updateHeartBtns() {
    const song = songs[currentIndex];
    if (!song) return;
    
    const isFav = favorites.includes(song.id);
    if (btnHeart) {
      btnHeart.classList.toggle('fav-active', isFav);
      btnHeart.innerHTML = isFav ? '<i class="fa fa-heart"></i>' : '<i class="fa fa-heart"></i>';
    }
    if (btnFavoriteAction) {
      btnFavoriteAction.classList.toggle('fav-action', isFav);
      btnFavoriteAction.innerHTML = isFav ? '<i class="fa fa-heart"></i><span>Favorited</span>' : '<i class="fa fa-heart"></i><span>Favorite</span>';
    }
  }

  function toggleFavorite() {
    if (currentIndex === -1) return;
    const song = songs[currentIndex];
    if (!song) return;
    
    const index = favorites.indexOf(song.id);
    if (index === -1) {
      favorites.push(song.id);
    } else {
      favorites.splice(index, 1);
    }
    
    localStorage.setItem('groovix_favorites', JSON.stringify(favorites));
    updateHeartBtns();
    renderFavorites();
  }

  function renderFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    if (!favoritesList) return;
    
    favoritesList.innerHTML = '';
    const favSongs = songs.filter(song => favorites.includes(song.id));
    
    if (favSongs.length === 0) {
      favoritesList.innerHTML = '<li class="empty-msg"><i class="fa fa-heart"></i><br>No favorite songs yet.</li>';
      return;
    }
    
    favSongs.forEach(song => {
      const realIdx = songs.indexOf(song);
      favoritesList.appendChild(makeSongItem(song, realIdx, realIdx === currentIndex));
    });
  }

  // Add heart button event listener
  if (btnHeart) {
    btnHeart.addEventListener('click', toggleFavorite);
  }
  
  // Add action row favorite button event listener
  if (btnFavoriteAction) {
    btnFavoriteAction.addEventListener('click', toggleFavorite);
  }

  // ---- Playlists ----
  let playlists = JSON.parse(localStorage.getItem('groovix_playlists') || '[]');

  function renderPlaylists() {
    const playlistsGrid = document.getElementById('playlistsGrid');
    if (!playlistsGrid) return;
    
    playlistsGrid.innerHTML = '';
    
    // Add Create Playlist button
    const createCard = document.createElement('div');
    createCard.className = 'playlist-card';
    createCard.style.cursor = 'pointer';
    createCard.style.background = 'var(--surface)';
    createCard.innerHTML = `
      <div class="playlist-card-icon" style="background: var(--accent);"><i class="fa fa-plus"></i></div>
      <div class="playlist-card-name">Create Playlist</div>
      <div class="playlist-card-count">Tap to create</div>
    `;
    
    createCard.addEventListener('click', () => {
      createNewPlaylist();
    });
    
    playlistsGrid.appendChild(createCard);
    
    if (playlists.length === 0) {
      return;
    }
    
    playlists.forEach((playlist, index) => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
        <div class="playlist-card-icon"><i class="fa fa-music"></i></div>
        <div class="playlist-card-name">${playlist.name}</div>
        <div class="playlist-card-count">${playlist.songs.length} songs</div>
        <button class="playlist-card-delete" data-index="${index}"><i class="fa fa-trash"></i></button>
      `;
      
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.playlist-card-delete')) {
          // Open playlist view
          openPlaylistView(index);
        }
      });
      
      const deleteBtn = card.querySelector('.playlist-card-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deletePlaylist(index);
        });
      }
      
      playlistsGrid.appendChild(card);
    });
  }

  function createNewPlaylist() {
    const name = prompt('Enter playlist name:');
    if (!name) return;
    
    const newPlaylist = {
      id: Date.now().toString(),
      name: name.trim(),
      songs: [],
      created: new Date().toISOString()
    };
    
    playlists.push(newPlaylist);
    localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
    renderPlaylists();
  }

  function openPlaylistView(playlistIndex) {
    // Simple implementation - just show alert for now
    const playlist = playlists[playlistIndex];
    alert(`Playlist: ${playlist.name}\nSongs: ${playlist.songs.length}`);
  }

  function deletePlaylist(index) {
    if (confirm('Delete this playlist?')) {
      playlists.splice(index, 1);
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      renderPlaylists();
    }
  }

  // ---- Playback ----
  function updatePlayerDisplay(song) {
    songTitleEl.textContent  = song.name;
    songArtistEl.textContent = song.artist || 'Unknown Artist';
    albumArt.innerHTML = song.coverUrl ? `<img src="${song.coverUrl}" alt="cover"/>` : '<i class="fa fa-music"></i>';
    updateHeartBtns();
    updateNowPlayingBar();
    buildWaveform();
  }

  async function playSong(index) {
    console.log('playSong called with index:', index);
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];
    console.log('Playing song:', song);
    updatePlayerDisplay(song);

    // Persist check: if no blobUrl, try fetching from IndexedDB
    if (!blobUrls[song.id]) {
      const file = await getFileFromDB(song.id);
      if (file) {
        blobUrls[song.id] = URL.createObjectURL(file);
      } else {
        console.warn('File not found in IndexedDB:', song.id);
        showReloadBanner();
        if (typeof switchScreen === 'function') switchScreen('player');
        return;
      }
    }

    audio.src = blobUrls[song.id];
    
    try {
      await audio.play();
      isPlaying = true;
      albumArt.classList.add('playing');
      updatePlayBtn();
      updateNowPlayingBar();
      renderList(searchInput ? searchInput.value : '');
    } catch (e) {
      console.error('Play error:', e);
      isPlaying = false;
      updatePlayBtn();
      // Handle "NotAllowedError" or other autoplay issues
      showToast('Click play to start');
    }

    if (typeof switchScreen === 'function') switchScreen('player');
  }

  function togglePlay() {
    if (!songs.length) return;
    if (currentIndex === -1) { playSong(0); return; }
    
    // Check actual audio state, not just isPlaying variable
    const audioIsActuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0 && audio.readyState > 2;
    
    if (isPlaying || audioIsActuallyPlaying) {
      // Pause audio
      audio.pause();
      isPlaying = false;
      albumArt.classList.remove('playing');
      updatePlayBtn();
      updateNowPlayingBar();
    } else {
      // Play audio
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          isPlaying = true;
          albumArt.classList.add('playing');
          updatePlayBtn();
          updateNowPlayingBar();
        }).catch(() => {
          isPlaying = false;
          updatePlayBtn();
        });
      } else {
        isPlaying = true;
        albumArt.classList.add('playing');
        updatePlayBtn();
        updateNowPlayingBar();
      }
    }
  }

  function updatePlayBtn() {
    btnPlayPause.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
  }

  function nextSong() {
    if (!songs.length) return;
    currentIndex = isShuffle ? Math.floor(Math.random() * songs.length) : (currentIndex + 1) % songs.length;
    playSong(currentIndex);
  }

  function prevSong() {
    if (!songs.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(currentIndex);
  }

  function removeSong(index) {
    const song = songs[index];
    if (!song) return;
    if (blobUrls[song.id]) { URL.revokeObjectURL(blobUrls[song.id]); delete blobUrls[song.id]; }
    deleteFromDB(song.id); // Also remove from IndexedDB (music & cover)
    songs.splice(index, 1);
    if (currentIndex === index) {
      audio.pause(); isPlaying = false; currentIndex = -1;
      songTitleEl.textContent = 'No song selected'; songArtistEl.textContent = '--';
      albumArt.innerHTML = '<i class="fa fa-music"></i>'; albumArt.classList.remove('playing');
      updatePlayBtn(); updateNowPlayingBar();
    } else if (currentIndex > index) { currentIndex--; }
    saveSongs();
    renderList(searchInput ? searchInput.value : '');
  }

  // Bulk delete by IDs — does one pass then re-renders once
  function removeSongsByIds(ids) {
    const idSet = new Set(ids);
    // Stop playback if current song is being deleted
    const currentSong = songs[currentIndex];
    if (currentSong && idSet.has(currentSong.id)) {
      audio.pause(); isPlaying = false; currentIndex = -1;
      songTitleEl.textContent = 'No song selected'; songArtistEl.textContent = '--';
      albumArt.innerHTML = '<i class="fa fa-music"></i>'; albumArt.classList.remove('playing');
      updatePlayBtn(); updateNowPlayingBar();
    }
    // Remove all matching songs
    for (let i = songs.length - 1; i >= 0; i--) {
      if (idSet.has(songs[i].id)) {
        const song = songs[i];
        if (blobUrls[song.id]) { URL.revokeObjectURL(blobUrls[song.id]); delete blobUrls[song.id]; }
        deleteFromDB(song.id); // Also remove from IndexedDB (music & cover)
        songs.splice(i, 1);
        if (currentIndex > i) currentIndex--;
      }
    }
    saveSongs();
    renderList(searchInput ? searchInput.value : '');
  }

  async function addFiles(files) {
    console.log('addFiles called with', files.length, 'files');
    const filesArray = Array.from(files);
    
    // Clear reload prompt if it was showing
    if (albumArt.querySelector('label')) albumArt.innerHTML = '<i class="fa fa-music"></i>';

    let count = 0;
    const total = filesArray.length;
    
    if (total > 5) showToast(`Importing ${total} songs...`);

    for (const file of filesArray) {
      try {
        const { title, artist } = cleanFilename(file.name);
        const id = 'gx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        const url = URL.createObjectURL(file);
        blobUrls[id] = url;

        const song = { 
          id, 
          name: title, 
          artist: artist, 
          album: '', 
          duration: '--:--', 
          coverUrl: null,
          dateAdded: Date.now()
        };

        songs.push(song);
        
        // Background tasks (non-blocking)
        saveFileToDB(id, file).catch(e => console.warn('DB Save Error:', e));
        
        // Try to get duration
        const tmp = new Audio(url);
        tmp.onloadedmetadata = () => {
          song.duration = formatTime(tmp.duration);
          saveSongs();
          renderList(searchInput ? searchInput.value : '');
        };

        // Try to get tags
        if (window.jsmediatags) {
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              const t = tag.tags;
              if (t.title) song.name = t.title.trim();
              if (t.artist) song.artist = t.artist.trim();
              if (t.album) song.album = t.album.trim();
              if (t.picture) {
                const blob = new Blob([new Uint8Array(t.picture.data)], { type: t.picture.format });
                song.coverUrl = URL.createObjectURL(blob);
                saveCoverToDB(id, blob);
              }
              saveSongs();
              renderList(searchInput ? searchInput.value : '');
            },
            onError: (err) => {
              console.warn('Tag read error for', file.name, err);
            }
          });
        }
        
        count++;
      } catch (fErr) {
        console.error('File process error:', file.name, fErr);
      }
    }

    saveSongs();
    renderList(searchInput ? searchInput.value : '');
    showToast(`Successfully added ${count} songs`);
  }

  // ---- Controls ----
  btnPlayPause.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextSong);
  btnPrev.addEventListener('click', prevSong);
  btnShuffle.addEventListener('click', () => { isShuffle = !isShuffle; btnShuffle.classList.toggle('active', isShuffle); });
  btnRepeat.addEventListener('click',  () => { isRepeat  = !isRepeat;  btnRepeat.classList.toggle('active',  isRepeat);  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progressBar.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent    = formatTime(audio.duration);
    updateWaveform();
  });

  progressBar.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  if (volumeBar) {
    volumeBar.addEventListener('input', () => { audio.volume = volumeBar.value / 100; });
    audio.volume = volumeBar.value / 100;
  }

  audio.addEventListener('ended', () => {
    if (isRepeat) { audio.currentTime = 0; audio.play(); } else { nextSong(); }
  });

  fileInput.addEventListener('change', (e) => {
    const prevCount = songs.length;
    addFiles(e.target.files);
    // Auto-play first new song if nothing is playing
    if (currentIndex === -1 && e.target.files.length > 0) {
      setTimeout(() => playSong(prevCount), 400);
    }
  });
  if (searchInput) searchInput.addEventListener('input', () => renderList(searchInput.value));
  if (sortSelect)  sortSelect.addEventListener('change', () => { sortMode = sortSelect.value; renderList(searchInput ? searchInput.value : ''); });

  // ---- Folder Access ----
  const grantFolderBtn = document.getElementById('grantFolderBtn');
  const folderStatus   = document.getElementById('folderStatus');

  function setFolderStatus(msg, type = '') {
    folderStatus.style.display = 'flex';
    folderStatus.className = `folder-status ${type}`;
    folderStatus.innerHTML = msg;
  }

  async function scanDirectory(dir, collected = []) {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && AUDIO_EXTS.includes(entry.name.split('.').pop().toLowerCase())) collected.push(entry);
      else if (entry.kind === 'directory') await scanDirectory(entry, collected);
    }
    return collected;
  }

  // Shared function to trigger folder picker
  async function triggerFolderPicker() {
    console.log('triggerFolderPicker starting...');
    showToast('Opening folder picker...');

    // 1. Try the Modern File System Access API (best for Desktop)
    if ('showDirectoryPicker' in window) {
      try {
        setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Waiting...', 'loading');
        const dir = await window.showDirectoryPicker({ mode: 'read' });
        
        setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Scanning...', 'loading');
        const entries = await scanDirectory(dir);
        
        if (!entries.length) { 
          setFolderStatus('<i class="fa fa-circle-info"></i> No audio files found.', ''); 
          showToast('No audio found in that folder.');
          return; 
        }

        showToast(`Scanning ${entries.length} files...`);
        const files = await Promise.all(entries.map(e => e.getFile()));
        await addFiles(files);
        setFolderStatus(`<i class="fa fa-circle-check"></i> Loaded <b>${entries.length}</b> song(s) from <b>${dir.name}</b>`, 'success');
        return; // Success!
      } catch (err) {
        if (err.name === 'AbortError') {
          setFolderStatus('<i class="fa fa-circle-xmark"></i> Cancelled.', '');
          return;
        }
        console.warn('showDirectoryPicker failed, trying fallback...', err);
      }
    }

    // 2. Fallback for Mobile/Safari: Use the hidden directory input
    const folderInput = document.getElementById('folderInput');
    if (folderInput) {
      console.log('Using folderInput.click() fallback');
      folderInput.click();
    } else {
      showToast('Error: Folder picker not found.');
    }
  }

  // Listen for changes on the hidden folder input
  const folderInputEl = document.getElementById('folderInput');
  if (folderInputEl) {
    folderInputEl.addEventListener('change', async (e) => {
      const allFiles = Array.from(e.target.files);
      if (allFiles.length > 0) {
        // Filter for audio files
        const audioFiles = allFiles.filter(f => {
          const ext = f.name.split('.').pop().toLowerCase();
          return AUDIO_EXTS.includes(ext);
        });

        console.log('Total files picked:', allFiles.length, 'Audio files found:', audioFiles.length);
        
        if (audioFiles.length > 0) {
          showToast(`Processing ${audioFiles.length} songs...`);
          await addFiles(audioFiles);
          showToast(`Successfully added ${audioFiles.length} songs!`);
        } else {
          showToast('No audio files found in that folder.');
        }
      }
    });
  }

  if (grantFolderBtn) grantFolderBtn.addEventListener('click', triggerFolderPicker);
  const btnImportFolder = document.getElementById('btnImportFolder');
  if (btnImportFolder) btnImportFolder.addEventListener('click', triggerFolderPicker);
  
  // Expose to window for direct HTML access
  window.triggerFolderPicker = triggerFolderPicker;

  // ---- Add playlist btn ----
  const btnAddPlaylist = document.getElementById('btnAddPlaylist');
  // Note: btnAddPlaylist doesn't exist in HTML, so this code won't run
  // If you add this button to HTML, uncomment the code below:
  /*
  if (btnAddPlaylist) btnAddPlaylist.addEventListener('click', () => {
    const playlistNameInput = document.getElementById('playlistNameInput');
    const newPlaylistModal = document.getElementById('newPlaylistModal');
    if (playlistNameInput) playlistNameInput.value = '';
    if (newPlaylistModal) newPlaylistModal.classList.add('open');
  });
  */

  // ---- Reload prompt (shown inside player, not as top banner) ----
  function showReloadBanner() {
    // Show prompt inside the album art area instead
    albumArt.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;text-align:center;">
        <i class="fa fa-circle-exclamation" style="font-size:2rem;color:var(--accent)"></i>
        <p style="font-size:0.85rem;color:var(--text);line-height:1.5">Tap below to re-add your songs</p>
        <label for="fileInput" style="background:var(--accent);color:#000;padding:10px 22px;border-radius:20px;cursor:pointer;font-size:0.85rem;font-weight:700;">
          <i class="fa fa-plus"></i> Add Songs
        </label>
      </div>
    `;
  }

  // On load, if we have saved songs but no blobs, show the banner

  // ---- Clear Everything Function ----
  function clearEverything() {
    // Stop playback
    audio.pause();
    isPlaying = false;
    currentIndex = -1;
    
    // Clear all blob URLs
    Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
    Object.keys(blobUrls).forEach(key => delete blobUrls[key]);
    
    // Clear all arrays
    songs.length = 0;
    
    // Clear localStorage
    localStorage.removeItem('groovix_songs');
    localStorage.removeItem('groovix_fab');
    
    // Reset UI
    songTitleEl.textContent = 'No song selected';
    songArtistEl.textContent = '--';
    albumArt.innerHTML = '<i class="fa fa-music"></i>';
    albumArt.classList.remove('playing');
    updatePlayBtn();
    updateNowPlayingBar();
    
    // Clear IndexedDB
    openDB().then(db => {
      db.transaction(STORE_MUSIC, 'readwrite').objectStore(STORE_MUSIC).clear();
      db.transaction(STORE_COVERS, 'readwrite').objectStore(STORE_COVERS).clear();
    });
    
    // Clear lists
    renderList();
    
    // Hide reload banner if showing
    if (albumArt.querySelector('label[for="fileInput"]')) {
      albumArt.innerHTML = '<i class="fa fa-music"></i>';
    }
    
    return true;
  }

  // Init
  renderList();
  hydrateCovers();

  return {
    getSongs: () => songs,
    getCurrentSong: () => songs[currentIndex] || null,
    isPlaying: () => isPlaying,
    playSong, addFiles, renderList,
    removeSong, removeSongsByIds, clearEverything,
    renderFavorites,
    renderPlaylists,
    setEQ,
    setSpeed,
    showNowPlayingBar: (show) => { 
      if (show && songs[currentIndex]) {
        nowPlayingBar.classList.add('visible'); 
      } else {
        nowPlayingBar.classList.remove('visible'); 
      }
    }
  };
})();
