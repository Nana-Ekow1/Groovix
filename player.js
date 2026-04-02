// ===================== PLAYER =====================
const Player = (() => {
  let songs     = JSON.parse(localStorage.getItem('groovix_songs')     || '[]');
  let favIds    = JSON.parse(localStorage.getItem('groovix_favs')      || '[]');
  let playlists = JSON.parse(localStorage.getItem('groovix_playlists') || '[]');

  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let isRepeat  = false;
  let sortMode  = 'default';

  const audio        = document.getElementById('audioPlayer');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnPrev      = document.getElementById('btnPrev');
  const btnNext      = document.getElementById('btnNext');
  const btnShuffle   = document.getElementById('btnShuffle');
  const btnRepeat    = document.getElementById('btnRepeat');
  const btnFavPlayer = document.getElementById('btnFavPlayer');
  const btnLike      = document.getElementById('btnLike');
  const progressBar  = document.getElementById('progressBar');
  const volumeBar    = document.getElementById('volumeBar');
  const currentTimeEl= document.getElementById('currentTime');
  const durationEl   = document.getElementById('duration');
  const songTitleEl  = document.getElementById('songTitle');
  const songArtistEl = document.getElementById('songArtist');
  const albumArt     = document.getElementById('albumArt');
  const songList     = document.getElementById('songList');
  const favoritesList= document.getElementById('favoritesList');
  const playlistsGrid= document.getElementById('playlistsGrid');
  const fileInput    = document.getElementById('fileInput');
  const searchInput  = document.getElementById('searchInput');
  const sortSelect   = document.getElementById('sortSelect');
  const waveform     = document.getElementById('waveform');

  const blobUrls = {};
  const WAVEFORM_BARS = 60;

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
      songs.map(s => ({ id: s.id, name: s.name, artist: s.artist, album: s.album, duration: s.duration }))
    ));
  }

  function saveFavs()      { localStorage.setItem('groovix_favs',      JSON.stringify(favIds));    }
  function savePlaylists() { localStorage.setItem('groovix_playlists', JSON.stringify(playlists)); }
  function isFav(id)       { return favIds.includes(id); }

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
    const arr = [...list];
    switch (sortMode) {
      case 'name-asc':      return arr.sort((a,b) => a.name.localeCompare(b.name));
      case 'name-desc':     return arr.sort((a,b) => b.name.localeCompare(a.name));
      case 'artist-asc':    return arr.sort((a,b) => (a.artist||'').localeCompare(b.artist||''));
      case 'artist-desc':   return arr.sort((a,b) => (b.artist||'').localeCompare(a.artist||''));
      case 'duration-asc':  return arr.sort((a,b) => durationToSec(a.duration) - durationToSec(b.duration));
      case 'duration-desc': return arr.sort((a,b) => durationToSec(b.duration) - durationToSec(a.duration));
      default:              return arr;
    }
  }

  // ---- Song item ----
  function makeSongItem(song, realIdx, isActive, opts = {}) {
    const li = document.createElement('li');
    const inSelectMode = typeof window.selectMode === 'function' && window.selectMode();
    const isSelected   = inSelectMode && window.selectedIds && window.selectedIds.has(song.id);

    li.className = 'song-item' + (isActive ? ' active' : '') + (isSelected ? ' selected' : '');
    li.dataset.index = realIdx;

    // In select mode show checkbox, otherwise show normal buttons
    if (inSelectMode) {
      const thumb = song.coverUrl ? `<img src="${song.coverUrl}" alt="cover"/>` : '<i class="fa fa-music"></i>';
      li.innerHTML = `
        <div class="select-check"><i class="fa fa-check"></i></div>
        <div class="song-thumb">${thumb}</div>
        <div class="song-item-info">
          <div class="title">${song.name}</div>
          <div class="artist">${song.artist || 'Unknown Artist'}${song.album ? ' · ' + song.album : ''}</div>
        </div>
      `;
      li.addEventListener('click', () => {
        if (typeof window.toggleSelect === 'function') window.toggleSelect(song.id);
      });
      return li;
    }

    const favIcon   = isFav(song.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const favActive = isFav(song.id) ? ' fav-active' : '';

    let rightBtns = `<button class="btn-fav${favActive}" data-id="${song.id}"><i class="${favIcon}"></i></button>`;

    if (opts.showAddToPlaylist)      rightBtns += `<button class="song-item-action btn-add-pl" data-id="${song.id}"><i class="fa fa-plus"></i></button>`;
    if (opts.showRemoveFromPlaylist) rightBtns += `<button class="song-item-action btn-rm-pl"  data-id="${song.id}"><i class="fa fa-minus"></i></button>`;
    if (opts.showDelete !== false)   rightBtns += `<button class="song-item-menu" data-id="${song.id}" title="More options"><i class="fa fa-ellipsis-vertical"></i></button>`;

    const thumb = song.coverUrl ? `<img src="${song.coverUrl}" alt="cover"/>` : '<i class="fa fa-music"></i>';

    li.innerHTML = `
      <div class="song-thumb">${thumb}</div>
      <div class="song-item-info">
        <div class="title">${song.name}</div>
        <div class="artist">${song.artist || 'Unknown Artist'}${song.album ? ' · ' + song.album : ''}</div>
      </div>
      <div class="song-item-right">${rightBtns}</div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.song-item-right')) return;
      const clickIdx = songs.findIndex(s => s.id === song.id);
      playSong(clickIdx >= 0 ? clickIdx : realIdx);
    });

    li.querySelector('.btn-fav').addEventListener('click', (e) => { e.stopPropagation(); toggleFav(song.id); });

    const menuBtn = li.querySelector('.song-item-menu');
    if (menuBtn) menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = songs.findIndex(s => s.id === song.id);
      if (typeof window.openContextMenu === 'function') window.openContextMenu(idx >= 0 ? idx : realIdx);
    });

    const del = li.querySelector('.song-item-delete');
    if (del) del.addEventListener('click', (e) => { e.stopPropagation(); removeSong(realIdx); });

    return li;
  }

  // ---- Render lists ----
  function renderList(filter = '') {
    songList.innerHTML = '';
    let list = getSortedSongs(songs);
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(f) || (s.artist||'').toLowerCase().includes(f));
    }
    if (list.length === 0) {
      songList.innerHTML = '<li class="empty-msg"><i class="fa fa-music"></i><br>No songs found.</li>';
      return;
    }
    list.forEach(song => {
      const realIdx = songs.indexOf(song);
      songList.appendChild(makeSongItem(song, realIdx, realIdx === currentIndex));
    });
  }

  function renderFavorites() {
    favoritesList.innerHTML = '';
    const favSongs = songs.filter(s => isFav(s.id));
    if (favSongs.length === 0) {
      favoritesList.innerHTML = '<li class="empty-msg"><i class="fa fa-heart"></i><br>No favorites yet.</li>';
      return;
    }
    favSongs.forEach(song => {
      const realIdx = songs.indexOf(song);
      favoritesList.appendChild(makeSongItem(song, realIdx, realIdx === currentIndex, { showDelete: false }));
    });
  }

  function renderPlaylists() {
    playlistsGrid.innerHTML = '';
    if (playlists.length === 0) {
      playlistsGrid.innerHTML = '<div class="empty-msg"><i class="fa fa-layer-group"></i><br>No playlists yet.</div>';
      return;
    }
    playlists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
        <div class="playlist-card-icon"><i class="fa fa-layer-group"></i></div>
        <div class="playlist-card-name">${pl.name}</div>
        <div class="playlist-card-count">${pl.songIds.length} song${pl.songIds.length !== 1 ? 's' : ''}</div>
        <button class="playlist-card-delete" data-id="${pl.id}"><i class="fa fa-trash"></i></button>
      `;
      card.addEventListener('click', (e) => { if (!e.target.closest('.playlist-card-delete')) openPlaylistModal(pl.id); });
      card.querySelector('.playlist-card-delete').addEventListener('click', (e) => { e.stopPropagation(); deletePlaylist(pl.id); });
      playlistsGrid.appendChild(card);
    });
  }

  // ---- Playlist modals ----
  const playlistModal    = document.getElementById('playlistModal');
  const modalClose       = document.getElementById('modalClose');
  const modalPlName      = document.getElementById('modalPlaylistName');
  const playlistSongList = document.getElementById('playlistSongList');
  const modalLibSongs    = document.getElementById('modalLibrarySongs');
  const newPlaylistModal = document.getElementById('newPlaylistModal');
  const newPlaylistClose = document.getElementById('newPlaylistClose');
  const playlistNameInput= document.getElementById('playlistNameInput');
  const btnCreatePlaylist= document.getElementById('btnCreatePlaylist');

  function openPlaylistModal(plId) {
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    modalPlName.textContent = pl.name;
    renderPlaylistModal(pl);
    playlistModal.classList.add('open');
  }

  function renderPlaylistModal(pl) {
    playlistSongList.innerHTML = '';
    const plSongs = pl.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    if (!plSongs.length) {
      playlistSongList.innerHTML = '<li class="empty-msg" style="padding:16px">No songs yet.</li>';
    } else {
      plSongs.forEach(song => {
        const li = makeSongItem(song, songs.indexOf(song), false, { showDelete: false, showRemoveFromPlaylist: true });
        li.querySelector('.btn-rm-pl').addEventListener('click', (e) => { e.stopPropagation(); removeFromPlaylist(pl.id, song.id); });
        playlistSongList.appendChild(li);
      });
    }
    modalLibSongs.innerHTML = '';
    songs.filter(s => !pl.songIds.includes(s.id)).forEach(song => {
      const li = makeSongItem(song, songs.indexOf(song), false, { showDelete: false, showAddToPlaylist: true });
      li.querySelector('.btn-add-pl').addEventListener('click', (e) => { e.stopPropagation(); addToPlaylist(pl.id, song.id); });
      modalLibSongs.appendChild(li);
    });
  }

  modalClose.addEventListener('click', () => playlistModal.classList.remove('open'));
  playlistModal.addEventListener('click', (e) => { if (e.target === playlistModal) playlistModal.classList.remove('open'); });
  newPlaylistClose.addEventListener('click', () => newPlaylistModal.classList.remove('open'));
  newPlaylistModal.addEventListener('click', (e) => { if (e.target === newPlaylistModal) newPlaylistModal.classList.remove('open'); });
  btnCreatePlaylist.addEventListener('click', createPlaylist);
  playlistNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') createPlaylist(); });

  function createPlaylist() {
    const name = playlistNameInput.value.trim();
    if (!name) return;
    playlists.push({ id: Date.now().toString(), name, songIds: [] });
    savePlaylists(); renderPlaylists();
    newPlaylistModal.classList.remove('open');
  }

  function deletePlaylist(id) {
    playlists = playlists.filter(p => p.id !== id);
    savePlaylists(); renderPlaylists();
  }

  function addToPlaylist(plId, songId) {
    const pl = playlists.find(p => p.id === plId);
    if (!pl || pl.songIds.includes(songId)) return;
    pl.songIds.push(songId);
    savePlaylists(); renderPlaylistModal(pl); renderPlaylists();
  }

  function removeFromPlaylist(plId, songId) {
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    pl.songIds = pl.songIds.filter(id => id !== songId);
    savePlaylists(); renderPlaylistModal(pl); renderPlaylists();
  }

  // ---- Favorites ----
  function toggleFav(id) {
    if (isFav(id)) favIds = favIds.filter(f => f !== id);
    else favIds.push(id);
    saveFavs();
    renderList(searchInput ? searchInput.value : '');
    renderFavorites();
    updateHeartBtns();
  }

  function updateHeartBtns() {
    const song = songs[currentIndex];
    const active = song && isFav(song.id);
    [btnFavPlayer, btnLike].forEach(btn => {
      if (!btn) return;
      btn.innerHTML = active ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
      btn.classList.toggle('fav-active', active);
    });
    if (btnLike) btnLike.classList.toggle('active', active);
  }

  if (btnFavPlayer) btnFavPlayer.addEventListener('click', () => { const s = songs[currentIndex]; if (s) toggleFav(s.id); });
  if (btnLike)      btnLike.addEventListener('click',      () => { const s = songs[currentIndex]; if (s) toggleFav(s.id); });

  // ---- Now Playing Bar ----
  const nowPlayingBar = document.getElementById('nowPlayingBar');
  const npbArt        = document.getElementById('npbArt');
  const npbTitle      = document.getElementById('npbTitle');
  const npbArtist     = document.getElementById('npbArtist');
  const npbPlay       = document.getElementById('npbPlay');

  function updateNowPlayingBar() {
    const song = songs[currentIndex];
    if (!song) { nowPlayingBar.classList.remove('visible'); return; }
    npbTitle.textContent  = song.name;
    npbArtist.textContent = song.artist || 'Unknown Artist';
    npbArt.innerHTML = song.coverUrl ? `<img src="${song.coverUrl}" alt=""/>` : '<i class="fa fa-music"></i>';
    npbPlay.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
  }

  npbPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPlaying) { audio.pause(); isPlaying = false; albumArt.classList.remove('playing'); }
    else           { audio.play();  isPlaying = true;  albumArt.classList.add('playing'); }
    updatePlayBtn(); updateNowPlayingBar();
  });

  // ---- Playback ----
  function updatePlayerDisplay(song) {
    songTitleEl.textContent  = song.name;
    songArtistEl.textContent = song.artist || 'Unknown Artist';
    albumArt.innerHTML = song.coverUrl ? `<img src="${song.coverUrl}" alt="cover"/>` : '<i class="fa fa-music"></i>';
    updateHeartBtns();
    updateNowPlayingBar();
    buildWaveform();
  }

  function playSong(index) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];
    updatePlayerDisplay(song);

    if (!blobUrls[song.id]) {
      showReloadBanner();
      if (typeof switchScreen === 'function') switchScreen('player');
      return;
    }

    // Reset audio element fully before setting new src
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    audio.load();

    audio.src = blobUrls[song.id];
    audio.load();

    const tryPlay = () => {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          isPlaying = true;
          updatePlayBtn();
          albumArt.classList.add('playing');
          updateNowPlayingBar();
          renderList(searchInput ? searchInput.value : '');
          renderFavorites();
        }).catch(err => {
          console.warn('Playback error:', err);
          isPlaying = false;
          updatePlayBtn();
        });
      } else {
        isPlaying = true;
        updatePlayBtn();
        albumArt.classList.add('playing');
        updateNowPlayingBar();
      }
    };

    // Wait for canplay before attempting play
    audio.addEventListener('canplay', tryPlay, { once: true });

    if (typeof switchScreen === 'function') switchScreen('player');
  }

  function togglePlay() {
    if (!songs.length) return;
    if (currentIndex === -1) { playSong(0); return; }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      albumArt.classList.remove('playing');
      updatePlayBtn();
      updateNowPlayingBar();
    } else {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          isPlaying = true;
          albumArt.classList.add('playing');
          updatePlayBtn();
          updateNowPlayingBar();
        }).catch(() => {});
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
    if (blobUrls[song.id]) { URL.revokeObjectURL(blobUrls[song.id]); delete blobUrls[song.id]; }
    favIds = favIds.filter(id => id !== song.id);
    playlists.forEach(pl => { pl.songIds = pl.songIds.filter(id => id !== song.id); });
    songs.splice(index, 1);
    if (currentIndex === index) {
      audio.pause(); isPlaying = false; currentIndex = -1;
      songTitleEl.textContent = 'No song selected'; songArtistEl.textContent = '--';
      albumArt.innerHTML = '<i class="fa fa-music"></i>'; albumArt.classList.remove('playing');
      updatePlayBtn(); updateHeartBtns(); updateNowPlayingBar();
    } else if (currentIndex > index) { currentIndex--; }
    saveSongs(); saveFavs(); savePlaylists();
    renderList(searchInput ? searchInput.value : ''); renderFavorites(); renderPlaylists();
  }

  function addFiles(files) {
    // Clear reload prompt from album art if showing
    if (albumArt.querySelector('label[for="fileInput"]')) {
      albumArt.innerHTML = '<i class="fa fa-music"></i>';
    }

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const { title, artist } = cleanFilename(file.name);

      // Try to match an existing song by name to reconnect blob
      const existing = songs.find(s => s.name === title || s.name === file.name.replace(/\.[^.]+$/, ''));
      if (existing && !blobUrls[existing.id]) {
        blobUrls[existing.id] = url;
        const tmp = new Audio(url);
        tmp.addEventListener('loadedmetadata', () => {
          existing.duration = formatTime(tmp.duration);
          saveSongs(); renderList(searchInput ? searchInput.value : '');
        });
        if (window.jsmediatags) {
          jsmediatags.read(file, {
            onSuccess(tag) {
              const t = tag.tags;
              if (t.title  && t.title.trim())  existing.name   = t.title.trim();
              if (t.artist && t.artist.trim()) existing.artist = t.artist.trim();
              if (t.album  && t.album.trim())  existing.album  = t.album.trim();
              const pic = t.picture;
              if (pic) {
                const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
                existing.coverUrl = URL.createObjectURL(blob);
              }
              saveSongs();
              renderList(searchInput ? searchInput.value : '');
              renderFavorites();
              if (songs[currentIndex] && songs[currentIndex].id === existing.id) updatePlayerDisplay(existing);
            },
            onError() { saveSongs(); renderList(searchInput ? searchInput.value : ''); }
          });
        }
        return;
      }

      // New song
      const id  = Date.now() + Math.random().toString(36).slice(2);
      blobUrls[id] = url;
      const song = { id, name: title, artist, album: '', duration: null, coverUrl: null };
      songs.push(song);

      const tmp = new Audio(url);
      tmp.addEventListener('loadedmetadata', () => {
        song.duration = formatTime(tmp.duration);
        saveSongs(); renderList(searchInput ? searchInput.value : '');
      });

      if (window.jsmediatags) {
        jsmediatags.read(file, {
          onSuccess(tag) {
            const t = tag.tags;
            if (t.title  && t.title.trim())  song.name   = t.title.trim();
            if (t.artist && t.artist.trim()) song.artist = t.artist.trim();
            if (t.album  && t.album.trim())  song.album  = t.album.trim();
            const pic = t.picture;
            if (pic) {
              const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
              song.coverUrl = URL.createObjectURL(blob);
            }
            saveSongs();
            renderList(searchInput ? searchInput.value : '');
            renderFavorites();
            if (songs[currentIndex] && songs[currentIndex].id === song.id) updatePlayerDisplay(song);
          },
          onError() { saveSongs(); renderList(searchInput ? searchInput.value : ''); }
        });
      }
    });
    saveSongs(); renderList(searchInput ? searchInput.value : '');
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

  volumeBar.addEventListener('input', () => { audio.volume = volumeBar.value / 100; });
  audio.volume = volumeBar.value / 100;

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
  const AUDIO_EXTS     = ['mp3','wav','flac','ogg','aac','m4a','opus','weba'];

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

  if (grantFolderBtn) grantFolderBtn.addEventListener('click', async () => {
    // Mobile browsers don't support showDirectoryPicker — use file input instead
    if (!('showDirectoryPicker' in window)) {
      const mobileInput = document.createElement('input');
      mobileInput.type = 'file';
      mobileInput.accept = 'audio/*';
      mobileInput.multiple = true;
      mobileInput.addEventListener('change', (e) => {
        if (e.target.files.length) addFiles(e.target.files);
      });
      mobileInput.click();
      return;
    }
    try {
      setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Waiting...', 'loading');
      const dir = await window.showDirectoryPicker({ mode: 'read' });
      setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Scanning...', 'loading');
      const entries = await scanDirectory(dir);
      if (!entries.length) { setFolderStatus('<i class="fa fa-circle-info"></i> No audio files found.', ''); return; }
      const files = await Promise.all(entries.map(e => e.getFile()));
      const prevCount = songs.length;
      addFiles(files);
      setFolderStatus(`<i class="fa fa-circle-check"></i> Loaded <b>${entries.length}</b> song(s) from <b>${dir.name}</b>`, 'success');
      // Auto-play first new song
      if (currentIndex === -1 && songs.length > prevCount) {
        setTimeout(() => playSong(prevCount), 300);
      }
    } catch (err) {
      if (err.name === 'AbortError') setFolderStatus('<i class="fa fa-circle-xmark"></i> Cancelled.', '');
      else setFolderStatus(`<i class="fa fa-circle-exclamation"></i> ${err.message}`, 'error');
    }
  });

  // ---- Add playlist btn ----
  const btnAddPlaylist = document.getElementById('btnAddPlaylist');
  if (btnAddPlaylist) btnAddPlaylist.addEventListener('click', () => {
    document.getElementById('playlistNameInput').value = '';
    document.getElementById('newPlaylistModal').classList.add('open');
  });

  // ---- Reload prompt (shown inside player, not as top banner) ----
  function showReloadBanner() {
    // Remove any existing banner
    const old = document.getElementById('reloadBanner');
    if (old) old.remove();

    // Show prompt inside the album art area instead
    albumArt.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;text-align:center;">
        <i class="fa fa-circle-exclamation" style="font-size:2rem;color:#f59e0b"></i>
        <p style="font-size:0.85rem;color:#fff;line-height:1.5">Tap below to re-add your songs</p>
        <label for="fileInput" style="background:#f59e0b;color:#000;padding:10px 22px;border-radius:20px;cursor:pointer;font-size:0.85rem;font-weight:700;">
          <i class="fa fa-plus"></i> Add Songs
        </label>
      </div>
    `;
  }

  // On load, if we have saved songs but no blobs, show the banner
  if (songs.length > 0) showReloadBanner();

  // Init
  renderList(); renderFavorites(); renderPlaylists();

  return {
    getSongs: () => songs,
    getCurrentSong: () => songs[currentIndex] || null,
    isPlaying: () => isPlaying,
    playSong, addFiles, renderList, renderFavorites, renderPlaylists,
    removeSong,
    showNowPlayingBar: (show) => { if (show && songs[currentIndex]) nowPlayingBar.classList.add('visible'); else nowPlayingBar.classList.remove('visible'); }
  };
})();
