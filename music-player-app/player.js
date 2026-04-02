// ---- Player State ----
const Player = (() => {
  let songs    = JSON.parse(localStorage.getItem('groovix_songs')     || '[]');
  let favIds   = JSON.parse(localStorage.getItem('groovix_favs')      || '[]');
  let playlists= JSON.parse(localStorage.getItem('groovix_playlists') || '[]');

  let currentIndex = -1;
  let isPlaying = false;
  let isShuffle = false;
  let isRepeat  = false;
  let sortMode  = 'default';
  let activePlaylistId = null; // null = full library queue

  const audio         = document.getElementById('audioPlayer');
  const btnPlayPause  = document.getElementById('btnPlayPause');
  const btnPrev       = document.getElementById('btnPrev');
  const btnNext       = document.getElementById('btnNext');
  const btnShuffle    = document.getElementById('btnShuffle');
  const btnRepeat     = document.getElementById('btnRepeat');
  const btnFavPlayer  = document.getElementById('btnFavPlayer');
  const progressBar   = document.getElementById('progressBar');
  const volumeBar     = document.getElementById('volumeBar');
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl    = document.getElementById('duration');
  const songTitleEl   = document.getElementById('songTitle');
  const songArtistEl  = document.getElementById('songArtist');
  const albumArt      = document.getElementById('albumArt');
  const songList      = document.getElementById('songList');
  const favoritesList = document.getElementById('favoritesList');
  const playlistsGrid = document.getElementById('playlistsGrid');
  const fileInput     = document.getElementById('fileInput');
  const searchInput   = document.getElementById('searchInput');
  const sortSelect    = document.getElementById('sortSelect');

  const blobUrls = {};

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
      songs.map(s => ({ id: s.id, name: s.name, artist: s.artist, duration: s.duration }))
    ));
  }

  function saveFavs()      { localStorage.setItem('groovix_favs',      JSON.stringify(favIds));    }
  function savePlaylists() { localStorage.setItem('groovix_playlists', JSON.stringify(playlists)); }

  function isFav(id) { return favIds.includes(id); }

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

  // ---- Render song item ----
  function makeSongItem(song, realIdx, isActive, opts = {}) {
    const li = document.createElement('li');
    li.className = 'song-item' + (isActive ? ' active' : '');
    li.dataset.index = realIdx;

    const favIcon = isFav(song.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const favActive = isFav(song.id) ? ' fav-active' : '';

    let extraBtns = '';
    if (opts.showAddToPlaylist) {
      extraBtns += `<button class="song-item-action btn-add-pl" data-id="${song.id}" title="Add to playlist"><i class="fa fa-plus"></i></button>`;
    }
    if (opts.showRemoveFromPlaylist) {
      extraBtns += `<button class="song-item-action btn-rm-pl" data-id="${song.id}" title="Remove from playlist"><i class="fa fa-minus"></i></button>`;
    }
    if (opts.showDelete !== false) {
      extraBtns += `<button class="song-item-delete" data-index="${realIdx}" title="Remove"><i class="fa fa-trash"></i></button>`;
    }

    li.innerHTML = `
      <div class="song-icon"><i class="fa fa-music"></i></div>
      <div class="song-item-info">
        <div class="title">${song.name}</div>
        <div class="artist">${song.artist || 'Unknown Artist'}</div>
      </div>
      <span class="song-item-duration">${song.duration || '--'}</span>
      <button class="song-item-action btn-fav${favActive}" data-id="${song.id}" title="Favorite">
        <i class="${favIcon}"></i>
      </button>
      ${extraBtns}
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.song-item-action') || e.target.closest('.song-item-delete')) return;
      playSong(realIdx);
    });

    li.querySelector('.btn-fav').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(song.id);
    });

    const delBtn = li.querySelector('.song-item-delete');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeSong(realIdx); });
    }

    return li;
  }

  // ---- Render Library ----
  function renderList(filter = '') {
    songList.innerHTML = '';
    let list = getSortedSongs(songs);
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(f) || (s.artist||'').toLowerCase().includes(f));
    }
    if (list.length === 0) {
      songList.innerHTML = '<li class="empty-msg">No songs found.</li>';
      return;
    }
    list.forEach(song => {
      const realIdx = songs.indexOf(song);
      songList.appendChild(makeSongItem(song, realIdx, realIdx === currentIndex));
    });
  }

  // ---- Render Favorites ----
  function renderFavorites() {
    favoritesList.innerHTML = '';
    const favSongs = songs.filter(s => isFav(s.id));
    if (favSongs.length === 0) {
      favoritesList.innerHTML = '<li class="empty-msg">No favorites yet. Hit the heart icon on any song!</li>';
      return;
    }
    favSongs.forEach(song => {
      const realIdx = songs.indexOf(song);
      favoritesList.appendChild(makeSongItem(song, realIdx, realIdx === currentIndex, { showDelete: false }));
    });
  }

  // ---- Render Playlists Grid ----
  function renderPlaylists() {
    playlistsGrid.innerHTML = '';
    if (playlists.length === 0) {
      playlistsGrid.innerHTML = '<div class="empty-msg">No playlists yet. Create one!</div>';
      return;
    }
    playlists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
        <div class="playlist-card-icon"><i class="fa fa-layer-group"></i></div>
        <div class="playlist-card-info">
          <div class="playlist-card-name">${pl.name}</div>
          <div class="playlist-card-count">${pl.songIds.length} song${pl.songIds.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="playlist-card-delete" data-id="${pl.id}" title="Delete playlist"><i class="fa fa-trash"></i></button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.playlist-card-delete')) return;
        openPlaylistModal(pl.id);
      });
      card.querySelector('.playlist-card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deletePlaylist(pl.id);
      });
      playlistsGrid.appendChild(card);
    });
  }

  // ---- Playlist Modal ----
  const playlistModal   = document.getElementById('playlistModal');
  const modalClose      = document.getElementById('modalClose');
  const modalPlName     = document.getElementById('modalPlaylistName');
  const playlistSongList= document.getElementById('playlistSongList');
  const modalLibSongs   = document.getElementById('modalLibrarySongs');

  function openPlaylistModal(plId) {
    activePlaylistId = plId;
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    modalPlName.textContent = pl.name;
    renderPlaylistModal(pl);
    playlistModal.classList.add('open');
  }

  function renderPlaylistModal(pl) {
    // Songs in playlist
    playlistSongList.innerHTML = '';
    const plSongs = pl.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);
    if (plSongs.length === 0) {
      playlistSongList.innerHTML = '<li class="empty-msg" style="padding:16px">No songs in this playlist yet.</li>';
    } else {
      plSongs.forEach(song => {
        const realIdx = songs.indexOf(song);
        const li = makeSongItem(song, realIdx, realIdx === currentIndex, { showDelete: false, showRemoveFromPlaylist: true });
        li.querySelector('.btn-rm-pl').addEventListener('click', (e) => {
          e.stopPropagation();
          removeFromPlaylist(pl.id, song.id);
        });
        playlistSongList.appendChild(li);
      });
    }

    // Library songs not in playlist
    modalLibSongs.innerHTML = '';
    const notInPl = songs.filter(s => !pl.songIds.includes(s.id));
    if (notInPl.length === 0) {
      modalLibSongs.innerHTML = '<li class="empty-msg" style="padding:16px">All songs are already in this playlist.</li>';
    } else {
      notInPl.forEach(song => {
        const realIdx = songs.indexOf(song);
        const li = makeSongItem(song, realIdx, false, { showDelete: false, showAddToPlaylist: true });
        li.querySelector('.btn-add-pl').addEventListener('click', (e) => {
          e.stopPropagation();
          addToPlaylist(pl.id, song.id);
        });
        modalLibSongs.appendChild(li);
      });
    }
  }

  modalClose.addEventListener('click', () => {
    playlistModal.classList.remove('open');
    activePlaylistId = null;
  });
  playlistModal.addEventListener('click', (e) => {
    if (e.target === playlistModal) { playlistModal.classList.remove('open'); activePlaylistId = null; }
  });

  // ---- New Playlist Modal ----
  const newPlaylistModal  = document.getElementById('newPlaylistModal');
  const newPlaylistClose  = document.getElementById('newPlaylistClose');
  const playlistNameInput = document.getElementById('playlistNameInput');
  const btnNewPlaylist    = document.getElementById('btnNewPlaylist');
  const btnCreatePlaylist = document.getElementById('btnCreatePlaylist');

  btnNewPlaylist.addEventListener('click', () => {
    playlistNameInput.value = '';
    newPlaylistModal.classList.add('open');
    setTimeout(() => playlistNameInput.focus(), 100);
  });

  newPlaylistClose.addEventListener('click', () => newPlaylistModal.classList.remove('open'));
  newPlaylistModal.addEventListener('click', (e) => { if (e.target === newPlaylistModal) newPlaylistModal.classList.remove('open'); });

  btnCreatePlaylist.addEventListener('click', createPlaylist);
  playlistNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') createPlaylist(); });

  function createPlaylist() {
    const name = playlistNameInput.value.trim();
    if (!name) return;
    const pl = { id: Date.now().toString(), name, songIds: [] };
    playlists.push(pl);
    savePlaylists();
    renderPlaylists();
    newPlaylistModal.classList.remove('open');
  }

  function deletePlaylist(id) {
    playlists = playlists.filter(p => p.id !== id);
    savePlaylists();
    renderPlaylists();
  }

  function addToPlaylist(plId, songId) {
    const pl = playlists.find(p => p.id === plId);
    if (!pl || pl.songIds.includes(songId)) return;
    pl.songIds.push(songId);
    savePlaylists();
    renderPlaylistModal(pl);
    renderPlaylists();
  }

  function removeFromPlaylist(plId, songId) {
    const pl = playlists.find(p => p.id === plId);
    if (!pl) return;
    pl.songIds = pl.songIds.filter(id => id !== songId);
    savePlaylists();
    renderPlaylistModal(pl);
    renderPlaylists();
  }

  // ---- Favorites ----
  function toggleFav(id) {
    if (isFav(id)) {
      favIds = favIds.filter(f => f !== id);
    } else {
      favIds.push(id);
    }
    saveFavs();
    renderList(searchInput.value);
    renderFavorites();
    updatePlayerHeartBtn();
  }

  function updatePlayerHeartBtn() {
    const song = songs[currentIndex];
    if (!song) { btnFavPlayer.innerHTML = '<i class="fa-regular fa-heart"></i>'; btnFavPlayer.classList.remove('fav-active'); return; }
    if (isFav(song.id)) {
      btnFavPlayer.innerHTML = '<i class="fa-solid fa-heart"></i>';
      btnFavPlayer.classList.add('fav-active');
    } else {
      btnFavPlayer.innerHTML = '<i class="fa-regular fa-heart"></i>';
      btnFavPlayer.classList.remove('fav-active');
    }
  }

  btnFavPlayer.addEventListener('click', () => {
    const song = songs[currentIndex];
    if (song) toggleFav(song.id);
  });

  // ---- Playback ----
  function playSong(index) {
    if (index < 0 || index >= songs.length) return;
    currentIndex = index;
    const song = songs[index];

    if (!blobUrls[song.id]) {
      songTitleEl.textContent = song.name;
      songArtistEl.textContent = song.artist || 'Unknown Artist';
      updatePlayerHeartBtn();
      return;
    }

    audio.src = blobUrls[song.id];
    audio.play();
    isPlaying = true;
    updatePlayBtn();
    albumArt.classList.add('playing');
    songTitleEl.textContent = song.name;
    songArtistEl.textContent = song.artist || 'Unknown Artist';
    updatePlayerHeartBtn();
    renderList(searchInput.value);
    renderFavorites();
  }

  function togglePlay() {
    if (songs.length === 0) return;
    if (currentIndex === -1) { playSong(0); return; }
    if (isPlaying) {
      audio.pause(); isPlaying = false; albumArt.classList.remove('playing');
    } else {
      audio.play(); isPlaying = true; albumArt.classList.add('playing');
    }
    updatePlayBtn();
  }

  function updatePlayBtn() {
    btnPlayPause.innerHTML = isPlaying ? '<i class="fa fa-pause"></i>' : '<i class="fa fa-play"></i>';
  }

  function nextSong() {
    if (songs.length === 0) return;
    currentIndex = isShuffle
      ? Math.floor(Math.random() * songs.length)
      : (currentIndex + 1) % songs.length;
    playSong(currentIndex);
  }

  function prevSong() {
    if (songs.length === 0) return;
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
      updatePlayBtn(); updatePlayerHeartBtn();
    } else if (currentIndex > index) { currentIndex--; }
    saveSongs(); saveFavs(); savePlaylists();
    renderList(searchInput.value); renderFavorites(); renderPlaylists();
  }

  function addFiles(files) {
    Array.from(files).forEach(file => {
      const id = Date.now() + Math.random().toString(36).slice(2);
      const url = URL.createObjectURL(file);
      blobUrls[id] = url;
      const raw = file.name.replace(/\.[^.]+$/, '');
      let name = raw, artist = 'Unknown Artist';
      if (raw.includes(' - ')) {
        const parts = raw.split(' - ');
        artist = parts[0].trim();
        name = parts.slice(1).join(' - ').trim();
      }
      const song = { id, name, artist, duration: null };
      songs.push(song);
      const tmpAudio = new Audio(url);
      tmpAudio.addEventListener('loadedmetadata', () => {
        song.duration = formatTime(tmpAudio.duration);
        saveSongs(); renderList(searchInput.value);
      });
    });
    saveSongs(); renderList(searchInput.value);
  }

  // ---- Controls ----
  btnPlayPause.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextSong);
  btnPrev.addEventListener('click', prevSong);

  btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle; btnShuffle.classList.toggle('active', isShuffle);
  });
  btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat; btnRepeat.classList.toggle('active', isRepeat);
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progressBar.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  });

  progressBar.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  volumeBar.addEventListener('input', () => { audio.volume = volumeBar.value / 100; });
  audio.volume = volumeBar.value / 100;

  audio.addEventListener('ended', () => {
    if (isRepeat) { audio.currentTime = 0; audio.play(); } else { nextSong(); }
  });

  fileInput.addEventListener('change', (e) => addFiles(e.target.files));
  searchInput.addEventListener('input', () => renderList(searchInput.value));

  sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value;
    renderList(searchInput.value);
  });

  // ---- Folder Access ----
  const grantFolderBtn = document.getElementById('grantFolderBtn');
  const folderStatus   = document.getElementById('folderStatus');
  const AUDIO_EXTS     = ['mp3','wav','flac','ogg','aac','m4a','opus','weba'];

  function setFolderStatus(msg, type = '') {
    folderStatus.style.display = 'flex';
    folderStatus.className = `folder-status ${type}`;
    folderStatus.innerHTML = msg;
  }

  async function scanDirectory(dirHandle, collected = []) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop().toLowerCase();
        if (AUDIO_EXTS.includes(ext)) collected.push(entry);
      } else if (entry.kind === 'directory') {
        await scanDirectory(entry, collected);
      }
    }
    return collected;
  }

  async function openMusicFolder() {
    if (!('showDirectoryPicker' in window)) {
      setFolderStatus('<i class="fa fa-circle-exclamation"></i> Your browser does not support folder access. Use Chrome or Edge.', 'error');
      return;
    }
    try {
      setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Waiting for folder permission...', 'loading');
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      setFolderStatus('<i class="fa fa-spinner fa-spin"></i> Scanning folder...', 'loading');
      const fileEntries = await scanDirectory(dirHandle);
      if (fileEntries.length === 0) { setFolderStatus('<i class="fa fa-circle-info"></i> No audio files found.', ''); return; }
      setFolderStatus(`<i class="fa fa-spinner fa-spin"></i> Loading ${fileEntries.length} song(s)...`, 'loading');
      const fileObjects = await Promise.all(fileEntries.map(e => e.getFile()));
      addFiles(fileObjects);
      setFolderStatus(`<i class="fa fa-circle-check"></i> Loaded <b>${fileEntries.length}</b> song(s) from <b>${dirHandle.name}</b>`, 'success');
    } catch (err) {
      if (err.name === 'AbortError') setFolderStatus('<i class="fa fa-circle-xmark"></i> Cancelled.', '');
      else setFolderStatus(`<i class="fa fa-circle-exclamation"></i> Error: ${err.message}`, 'error');
    }
  }

  grantFolderBtn.addEventListener('click', openMusicFolder);

  // Init
  renderList();
  renderFavorites();
  renderPlaylists();

  return {
    getSongs: () => songs,
    getCurrentSong: () => songs[currentIndex] || null,
    playSong, addFiles, renderList, renderFavorites, renderPlaylists
  };
})();
