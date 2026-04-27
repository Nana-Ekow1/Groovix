// ---- Splash ----
window.addEventListener('load', () => {
  const splash = document.getElementById('splash');
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }, 2200);
});

// ---- Screen switching ----
const screens  = document.querySelectorAll('.screen');
const bnavBtns = document.querySelectorAll('.bnav-btn');

function switchScreen(name, tab) {
  screens.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  bnavBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === name && (!b.dataset.tab || b.dataset.tab === tab)));

  // Toggle body class for visibility fixes (hiding FAB/Nav on player screen)
  document.body.classList.toggle('player-active', name === 'player');

  // Show/hide now playing bar
  Player.showNowPlayingBar(name !== 'player');

  // Switch library tab if specified
  if (name === 'library' && tab) switchLibTab(tab);
  if (name === 'library') Player.renderList(document.getElementById('searchInput')?.value || '');
}

// Make switchScreen global so player.js can call it
window.switchScreen = switchScreen;

// ---- Library tabs ----
const libTabs = document.querySelectorAll('.lib-tab');

function switchLibTab(tabName) {
  // Update lib tabs (only "all" tab remains)
  libTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

  const songList = document.getElementById('songList');
  const favoritesList = document.getElementById('favoritesList');
  const playlistsGrid = document.getElementById('playlistsGrid');
  
  // Show/hide appropriate content based on tab
  songList.style.display = tabName === 'all' ? '' : 'none';
  if (favoritesList) favoritesList.style.display = tabName === 'favorites' ? '' : 'none';
  if (playlistsGrid) playlistsGrid.style.display = tabName === 'playlists' ? '' : 'none';
  
  // If switching to favorites or playlists, render them
  if (tabName === 'favorites' && typeof Player !== 'undefined' && Player.renderFavorites) {
    Player.renderFavorites();
  }
  if (tabName === 'playlists' && typeof Player !== 'undefined' && Player.renderPlaylists) {
    Player.renderPlaylists();
  }
}

libTabs.forEach(t => t.addEventListener('click', () => switchLibTab(t.dataset.tab)));

// ---- Nav buttons ----
bnavBtns.forEach(btn => {
  btn.addEventListener('click', () => switchScreen(btn.dataset.screen, btn.dataset.tab));
});

// Top bar buttons
document.getElementById('btnGoLibrary').addEventListener('click', () => switchScreen('library'));
document.getElementById('btnQueue').addEventListener('click', () => switchScreen('library'));
document.getElementById('btnSettings')?.addEventListener('click', () => {
  switchScreen('settings');
  showSettingsSubpage(null); // Reset to main menu
});

// ---- Settings Navigation ----
const settingsMainMenu = document.getElementById('settings-main-menu');
const settingsSubpages = document.querySelectorAll('.settings-subpage');
const settingsMenuItems = document.querySelectorAll('.settings-menu-item');
let currentSubpage = null;

function showSettingsSubpage(subId) {
  currentSubpage = subId;
  if (!subId) {
    settingsMainMenu.style.display = 'block';
    settingsSubpages.forEach(p => p.style.display = 'none');
  } else {
    settingsMainMenu.style.display = 'none';
    settingsSubpages.forEach(p => {
      p.style.display = p.id === `subpage-${subId}` ? 'block' : 'none';
    });
  }
}

// Rewire menu items (to include dynamically added ones)
function wireSettingsMenu() {
  document.querySelectorAll('.settings-menu-item').forEach(item => {
    item.addEventListener('click', () => showSettingsSubpage(item.dataset.subpage));
  });
}
wireSettingsMenu();

// ---- Font Selection Logic ----
const fontOptions = document.querySelectorAll('.font-option');
const savedFont = localStorage.getItem('groovix_font') || "'Inter', sans-serif";

function applyFont(font) {
  document.body.style.fontFamily = font;
  localStorage.setItem('groovix_font', font);
  // Update UI
  const fontName = font.split("'")[1] || font;
  const currentFontVal = document.getElementById('currentFontValue');
  if (currentFontVal) currentFontVal.innerText = fontName;
  
  fontOptions.forEach(opt => opt.classList.toggle('active', opt.dataset.font === font));
}

// Initial apply
applyFont(savedFont);

fontOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    applyFont(opt.dataset.font);
    if (typeof showToast !== 'undefined') showToast(`Font set to ${opt.innerText}`);
  });
});

document.getElementById('btnBackSettings')?.addEventListener('click', () => {
  if (currentSubpage) {
    showSettingsSubpage(null);
  } else {
    switchScreen('library');
  }
});

// ---- Theme Management ----
const savedTheme = localStorage.getItem('groovix_theme') || 'default';
document.documentElement.setAttribute('data-theme', savedTheme);

const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
  if (btn.dataset.theme === savedTheme) {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  
  btn.addEventListener('click', () => {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('groovix_theme', theme);
  });
});

// Clear Data
document.getElementById('btnClearData')?.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    if (typeof Player !== 'undefined' && Player.clearEverything) {
      Player.clearEverything();
    }
    showToast('All data cleared');
  }
});

// Add to Playlist button
document.getElementById('btnAddToPlaylist').addEventListener('click', () => {
  addCurrentSongToPlaylist();
});

// Now playing bar tap → go to player
document.getElementById('nowPlayingBar').addEventListener('click', (e) => {
  if (!e.target.closest('#npbPlay')) switchScreen('player');
});

// ---- Search toggle ----
const libSearch    = document.getElementById('libSearch');
const btnSearch    = document.getElementById('btnSearch');
const btnCloseSearch = document.getElementById('btnCloseSearch');

btnSearch.addEventListener('click', () => {
  libSearch.style.display = libSearch.style.display === 'none' ? 'flex' : 'none';
  if (libSearch.style.display === 'flex') document.getElementById('searchInput').focus();
});

btnCloseSearch.addEventListener('click', () => {
  libSearch.style.display = 'none';
  document.getElementById('searchInput').value = '';
  Player.renderList('');
});

// ---- AI Panel ----
const aiFab        = document.getElementById('aiFab');
const aiPanel      = document.getElementById('aiPanel');
const aiPanelClose = document.getElementById('aiPanelClose');

aiFab.addEventListener('click', (e) => {
  e.stopPropagation();
  aiPanel.classList.toggle('open');
  if (aiPanel.classList.contains('open')) document.getElementById('chatInput').focus();
});

aiPanelClose.addEventListener('click', () => aiPanel.classList.remove('open'));

document.addEventListener('click', (e) => {
  if (!aiPanel.contains(e.target) && !aiFab.contains(e.target)) aiPanel.classList.remove('open');
});

// ---- Drag & drop ----
const libScreen = document.getElementById('screen-library');
libScreen.addEventListener('dragover', (e) => { e.preventDefault(); libScreen.style.outline = '2px dashed var(--accent)'; });
libScreen.addEventListener('dragleave', () => { libScreen.style.outline = ''; });
libScreen.addEventListener('drop', (e) => {
  e.preventDefault(); libScreen.style.outline = '';
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
  if (files.length) Player.addFiles(files);
});

// ---- Three-dot context menu ----
const contextMenu     = document.getElementById('contextMenu');
const contextBackdrop = document.getElementById('contextBackdrop');
const ctxSongName     = document.getElementById('contextMenuSongName');
let ctxTargetIndex    = -1;
let queue             = [];

function openContextMenu(songIndex) {
  try {
    ctxTargetIndex = songIndex;
    const songs = Player.getSongs();
    if (!songs) {
      console.error('Player.getSongs() returned undefined or null');
      ctxSongName.textContent = 'Options';
    } else if (songIndex < 0 || songIndex >= songs.length) {
      console.warn('Invalid song index:', songIndex, 'songs length:', songs.length);
      ctxSongName.textContent = 'Options';
    } else {
      const song = songs[songIndex];
      ctxSongName.textContent = song ? `${song.name} — ${song.artist || 'Unknown'}` : 'Options';
    }

    contextMenu.classList.add('open');
    contextBackdrop.classList.add('open');
    console.log('Context menu opened for song index:', songIndex);
  } catch (error) {
    console.error('Error opening context menu:', error);
    // Still try to open the menu even if there's an error
    contextMenu.classList.add('open');
    contextBackdrop.classList.add('open');
    ctxSongName.textContent = 'Options';
  }
}

function closeContextMenu() {
  contextMenu.classList.remove('open');
  contextBackdrop.classList.remove('open');
}

contextBackdrop.addEventListener('click', closeContextMenu);
document.getElementById('ctxCancel').addEventListener('click', closeContextMenu);

// Play Next
document.getElementById('ctxPlayNext').addEventListener('click', () => {
  if (ctxTargetIndex >= 0) {
    queue.unshift(ctxTargetIndex);
    showToast('Will play next');
  }
  closeContextMenu();
});

// Add to Queue
document.getElementById('ctxQueue').addEventListener('click', () => {
  if (ctxTargetIndex >= 0) {
    queue.push(ctxTargetIndex);
    showToast('Added to queue');
  }
  closeContextMenu();
});



// Add to Playlist from context menu
document.getElementById('ctxAddToPlaylist').addEventListener('click', () => {
  if (ctxTargetIndex >= 0) {
    const song = Player.getSongs()[ctxTargetIndex];
    if (song) {
      // Create a temporary current song to use the addCurrentSongToPlaylist logic
      const originalCurrentSong = Player.getCurrentSong();
      const originalCurrentIndex = Player.getSongs().indexOf(originalCurrentSong);
      
      // Temporarily set the context menu song as current
      const tempPlayer = {
        getCurrentSong: () => song
      };
      
      // Use a modified version of addCurrentSongToPlaylist
      addSongToPlaylist(song);
    }
  }
  closeContextMenu();
});

// Helper function to add any song to playlist
function addSongToPlaylist(song) {
  if (!song) {
    showToast('No song selected');
    return;
  }
  
  // Get playlists from localStorage
  let playlists = JSON.parse(localStorage.getItem('groovix_playlists') || '[]');
  
  if (playlists.length === 0) {
    // No playlists exist, ask to create one
    const playlistName = prompt('No playlists found. Create a new playlist:');
    if (playlistName && playlistName.trim()) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        songs: [song.id],
        created: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      showToast(`Added to "${playlistName}"`);
      
      // Refresh playlists display if on playlists tab
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    }
    return;
  }
  
  // Create playlist selection modal (similar to addCurrentSongToPlaylist but for any song)
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h3>Add "${song.name}" to Playlist</h3>
        <button class="modal-close" id="playlistModalClose"><i class="fa fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="section-label">SELECT PLAYLIST</div>
        <div id="playlistSelection" style="max-height: 300px; overflow-y: auto;">
          ${playlists.map((playlist, index) => `
            <div class="playlist-select-item" data-index="${index}" style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600;">${playlist.name}</div>
                <div style="font-size: 0.8rem; color: var(--muted);">${playlist.songs.length} songs</div>
              </div>
              ${playlist.songs.includes(song.id) ? '<i class="fa fa-check" style="color: var(--success);"></i>' : ''}
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="createNewPlaylistBtn" style="margin-top: 16px;">
          <i class="fa fa-plus"></i> Create New Playlist
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => modal.classList.add('open'), 10);
  
  // Close modal
  document.getElementById('playlistModalClose').addEventListener('click', () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  });
  
  // Playlist selection
  const playlistItems = modal.querySelectorAll('.playlist-select-item');
  playlistItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from bubbling to modal overlay
      const index = parseInt(item.dataset.index);
      const playlist = playlists[index];
      
      if (playlist.songs.includes(song.id)) {
        // Remove from playlist
        const songIndex = playlist.songs.indexOf(song.id);
        playlist.songs.splice(songIndex, 1);
        showToast(`Removed from "${playlist.name}"`);
      } else {
        // Add to playlist
        playlist.songs.push(song.id);
        showToast(`Added to "${playlist.name}"`);
      }
      
      // Update localStorage
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      
      // Update UI
      if (playlist.songs.includes(song.id)) {
        item.querySelector('i')?.remove();
        item.insertAdjacentHTML('beforeend', '<i class="fa fa-check" style="color: var(--success);"></i>');
      } else {
        item.querySelector('i')?.remove();
      }
      
      // Update count
      const countEl = item.querySelector('div:nth-child(2)');
      if (countEl) {
        countEl.textContent = `${playlist.songs.length} songs`;
      }
      
      // Refresh playlists display if on playlists tab
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    });
  });
  
  // Create new playlist button
  document.getElementById('createNewPlaylistBtn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling to modal overlay
    const playlistName = prompt('Enter playlist name:');
    if (playlistName && playlistName.trim()) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        songs: [song.id],
        created: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      showToast(`Created "${playlistName}" and added song`);
      
      // Close modal
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
      
      // Refresh playlists display
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    }
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
    }
  });
}

// Research Artist
document.getElementById('ctxResearchArtist').addEventListener('click', () => {
  const song = Player.getSongs()[ctxTargetIndex];
  if (song && song.artist) {
    const q = `Research artist: ${song.artist}`;
    document.getElementById('chatInput').value = q;
    aiPanel.classList.add('open');
    document.getElementById('chatInput').focus();
    // Auto-send if AI is ready
    if (typeof AI !== 'undefined' && AI.send) AI.send();
  } else {
    showToast('Artist information missing');
  }
  closeContextMenu();
});

// Ask AI About Track

// Delete
document.getElementById('ctxDelete').addEventListener('click', () => {
  if (ctxTargetIndex >= 0) Player.removeSong(ctxTargetIndex);
  closeContextMenu();
});



// Expose openContextMenu globally so song items can call it
window.openContextMenu = openContextMenu;

// Override song-item-delete to open context menu instead
document.addEventListener('click', (e) => {
  const menuBtn = e.target.closest('.song-item-menu');
  if (menuBtn) {
    e.stopPropagation();
    const li = menuBtn.closest('.song-item');
    if (li) openContextMenu(parseInt(li.dataset.index));
  }
});

// Three dots on player screen
document.getElementById('btnMore').addEventListener('click', () => {
  try {
    const song = Player.getCurrentSong();
    const songs = Player.getSongs();
    if (!songs || songs.length === 0) {
      console.warn('No songs in library, cannot open context menu');
      // Still open menu but with "Options" title
      openContextMenu(-1);
      return;
    }
    const idx = songs.indexOf(song);
    openContextMenu(idx >= 0 ? idx : 0);
  } catch (error) {
    console.error('Error opening context menu from btnMore:', error);
    // Still try to open menu
    openContextMenu(-1);
  }
});

// ---- Add to Playlist ----
function addCurrentSongToPlaylist() {
  const currentSong = Player.getCurrentSong();
  if (!currentSong) {
    showToast('No song playing');
    return;
  }
  
  // Get playlists from localStorage
  let playlists = JSON.parse(localStorage.getItem('groovix_playlists') || '[]');
  
  if (playlists.length === 0) {
    // No playlists exist, ask to create one
    const playlistName = prompt('No playlists found. Create a new playlist:');
    if (playlistName && playlistName.trim()) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        songs: [currentSong.id],
        created: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      showToast(`Added to "${playlistName}"`);
      
      // Refresh playlists display if on playlists tab
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    }
    return;
  }
  
  // Create playlist selection modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h3>Add to Playlist</h3>
        <button class="modal-close" id="playlistModalClose"><i class="fa fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="section-label">SELECT PLAYLIST</div>
        <div id="playlistSelection" style="max-height: 300px; overflow-y: auto;">
          ${playlists.map((playlist, index) => `
            <div class="playlist-select-item" data-index="${index}" style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600;">${playlist.name}</div>
                <div style="font-size: 0.8rem; color: var(--muted);">${playlist.songs.length} songs</div>
              </div>
              ${playlist.songs.includes(currentSong.id) ? '<i class="fa fa-check" style="color: var(--success);"></i>' : ''}
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="createNewPlaylistBtn" style="margin-top: 16px;">
          <i class="fa fa-plus"></i> Create New Playlist
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => modal.classList.add('open'), 10);
  
  // Close modal
  document.getElementById('playlistModalClose').addEventListener('click', () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  });
  
  // Playlist selection
  const playlistItems = modal.querySelectorAll('.playlist-select-item');
  playlistItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from bubbling to modal overlay
      const index = parseInt(item.dataset.index);
      const playlist = playlists[index];
      
      if (playlist.songs.includes(currentSong.id)) {
        // Remove from playlist
        const songIndex = playlist.songs.indexOf(currentSong.id);
        playlist.songs.splice(songIndex, 1);
        showToast(`Removed from "${playlist.name}"`);
      } else {
        // Add to playlist
        playlist.songs.push(currentSong.id);
        showToast(`Added to "${playlist.name}"`);
      }
      
      // Update localStorage
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      
      // Update UI
      if (playlist.songs.includes(currentSong.id)) {
        item.querySelector('i')?.remove();
        item.insertAdjacentHTML('beforeend', '<i class="fa fa-check" style="color: var(--success);"></i>');
      } else {
        item.querySelector('i')?.remove();
      }
      
      // Update count
      const countEl = item.querySelector('div:nth-child(2)');
      if (countEl) {
        countEl.textContent = `${playlist.songs.length} songs`;
      }
      
      // Refresh playlists display if on playlists tab
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    });
  });
  
  // Create new playlist button
  document.getElementById('createNewPlaylistBtn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling to modal overlay
    const playlistName = prompt('Enter playlist name:');
    if (playlistName && playlistName.trim()) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        songs: [currentSong.id],
        created: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      localStorage.setItem('groovix_playlists', JSON.stringify(playlists));
      showToast(`Created "${playlistName}" and added song`);
      
      // Close modal
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
      
      // Refresh playlists display
      if (typeof Player !== 'undefined' && Player.renderPlaylists) {
        Player.renderPlaylists();
      }
    }
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 300);
    }
  });
}

// ---- Toast ----
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:calc(var(--bnav-h) + 80px); left:50%; transform:translateX(-50%);
    background:var(--card); color:var(--text); padding:10px 20px; border-radius:20px;
    font-size:0.85rem; z-index:400; white-space:nowrap;
    animation: fadeInOut 2s ease forwards;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// Add toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `@keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(10px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }`;
document.head.appendChild(toastStyle);





// ---- Draggable AI FAB ----
const aiFabEl = document.getElementById('aiFab');
let fabX = 0, fabY = 0, startX = 0, startY = 0, dragging = false;

// Save position
function saveFabPos(x, y) {
  localStorage.setItem('groovix_fab', JSON.stringify({ x, y }));
}

function loadFabPos() {
  try {
    const p = JSON.parse(localStorage.getItem('groovix_fab'));
    if (p) {
      // Validate position is within viewport
      const fabSize = 56; // Same as CSS width/height
      const maxX = window.innerWidth - fabSize;
      const maxY = window.innerHeight - fabSize;
      
      // Clamp values to ensure FAB is visible
      const clampedX = Math.max(0, Math.min(p.x, maxX));
      const clampedY = Math.max(0, Math.min(p.y, maxY));
      
      aiFabEl.style.right = 'auto';
      aiFabEl.style.bottom = 'auto';
      aiFabEl.style.left = clampedX + 'px';
      aiFabEl.style.top  = clampedY + 'px';
      
      // If position was adjusted, save the clamped position
      if (clampedX !== p.x || clampedY !== p.y) {
        saveFabPos(clampedX, clampedY);
      }
      
      // Additional safety check: ensure FAB is actually visible
      // Wait for next frame to ensure styles are applied
      setTimeout(() => {
        const rect = aiFabEl.getBoundingClientRect();
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );
        
        if (!isVisible) {
          // FAB is not visible, reset to default position
          console.warn('AI FAB not visible, resetting to default position');
          aiFabEl.style.right = '16px';
          aiFabEl.style.bottom = 'calc(var(--bnav-h) + var(--safe-b) + 14px)';
          aiFabEl.style.left = 'auto';
          aiFabEl.style.top = 'auto';
          localStorage.removeItem('groovix_fab');
        }
      }, 100);
    } else {
      // No saved position, use default
      aiFabEl.style.right = '16px';
      aiFabEl.style.bottom = 'calc(var(--bnav-h) + var(--safe-b) + 14px)';
      aiFabEl.style.left = 'auto';
      aiFabEl.style.top = 'auto';
    }
  } catch(e) {
    // If there's an error, reset to default position
    aiFabEl.style.right = '16px';
    aiFabEl.style.bottom = 'calc(var(--bnav-h) + var(--safe-b) + 14px)';
    aiFabEl.style.left = 'auto';
    aiFabEl.style.top = 'auto';
    // Clear invalid saved position
    localStorage.removeItem('groovix_fab');
  }
}

loadFabPos();

function onFabPointerDown(e) {
  dragging = false;
  const rect = aiFabEl.getBoundingClientRect();
  startX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  startY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  aiFabEl.classList.add('dragging');
  document.addEventListener('mousemove', onFabPointerMove);
  document.addEventListener('touchmove', onFabPointerMove, { passive: false });
  document.addEventListener('mouseup',   onFabPointerUp);
  document.addEventListener('touchend',  onFabPointerUp);
}

function onFabPointerMove(e) {
  dragging = true;
  e.preventDefault();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  const size = 56;
  const maxX = window.innerWidth  - size;
  const maxY = window.innerHeight - size;
  fabX = Math.max(0, Math.min(cx - startX, maxX));
  fabY = Math.max(0, Math.min(cy - startY, maxY));
  aiFabEl.style.right  = 'auto';
  aiFabEl.style.bottom = 'auto';
  aiFabEl.style.left   = fabX + 'px';
  aiFabEl.style.top    = fabY + 'px';
}

function onFabPointerUp() {
  aiFabEl.classList.remove('dragging');
  document.removeEventListener('mousemove', onFabPointerMove);
  document.removeEventListener('touchmove', onFabPointerMove);
  document.removeEventListener('mouseup',   onFabPointerUp);
  document.removeEventListener('touchend',  onFabPointerUp);
  if (dragging) saveFabPos(fabX, fabY);
}

aiFabEl.addEventListener('mousedown',  onFabPointerDown);
aiFabEl.addEventListener('touchstart', onFabPointerDown, { passive: true });

// Expose resetFabPosition globally for debugging
window.resetFabPosition = function() {
  aiFabEl.style.right = '16px';
  aiFabEl.style.bottom = 'calc(var(--bnav-h) + var(--safe-b) + 14px)';
  aiFabEl.style.left = 'auto';
  aiFabEl.style.top = 'auto';
  localStorage.removeItem('groovix_fab');
  console.log('AI FAB position reset to default');
  if (typeof showToast === 'function') showToast('AI FAB position reset');
};

// ---- Detailed Settings Logic ----

// 1. Playback
const eqSelect = document.getElementById('eqSelect');
const eqValue  = document.getElementById('eqValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue  = document.getElementById('speedValue');
const crossfadeToggle = document.getElementById('crossfadeToggle');
const crossfadeValue  = document.getElementById('crossfadeValue');

eqSelect?.addEventListener('change', () => {
  const val = eqSelect.value;
  eqValue.textContent = eqSelect.options[eqSelect.selectedIndex].text;
  if (typeof Player !== 'undefined' && Player.setEQ) {
    Player.setEQ(val);
  }
  showToast(`Equalizer: ${eqValue.textContent}`);
});

speedSlider?.addEventListener('input', () => {
  const val = parseFloat(speedSlider.value);
  speedValue.textContent = `${val.toFixed(1)}x`;
  if (typeof Player !== 'undefined' && Player.setSpeed) {
    Player.setSpeed(val);
  }
});

crossfadeToggle?.addEventListener('change', () => {
  crossfadeValue.textContent = crossfadeToggle.checked ? 'On' : 'Off';
  showToast(`Crossfade: ${crossfadeValue.textContent}`);
});

// 2. Library
const autoScanToggle = document.getElementById('autoScanToggle');
const autoScanValue  = document.getElementById('autoScanValue');
const sortSelectSettings = document.getElementById('sortSelectSettings');
const sortValue = document.getElementById('sortValue');

autoScanToggle?.addEventListener('change', () => {
  autoScanValue.textContent = autoScanToggle.checked ? 'On' : 'Off';
  showToast(`Auto-scan: ${autoScanValue.textContent}`);
});

sortSelectSettings?.addEventListener('change', () => {
  const val = sortSelectSettings.value;
  sortValue.textContent = sortSelectSettings.options[sortSelectSettings.selectedIndex].text;
  // Sync with main sort select if it exists
  const mainSort = document.getElementById('sortSelect');
  if (mainSort) {
    mainSort.value = val;
    mainSort.dispatchEvent(new Event('change'));
  }
});

// 3. Appearance - Theme already handled above, adding Accent Color
const accentBtns = document.querySelectorAll('.accent-btn');
const accentValue = document.getElementById('accentValue');

accentBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const accent = btn.dataset.accent;
    const colors = {
      purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
      blue:   { primary: '#3b82f6', secondary: '#2563eb' },
      green:  { primary: '#10b981', secondary: '#059669' },
      pink:   { primary: '#ec4899', secondary: '#db2777' },
      orange: { primary: '#f97316', secondary: '#ea580c' }
    };
    
    const palette = colors[accent] || colors.purple;
    document.documentElement.style.setProperty('--accent', palette.primary);
    document.documentElement.style.setProperty('--accent2', palette.secondary);
    
    accentValue.textContent = accent.charAt(0).toUpperCase() + accent.slice(1);
    localStorage.setItem('groovix_accent', accent);
    showToast(`Accent set to ${accent}`);
  });
});

// Restore saved accent
const savedAccent = localStorage.getItem('groovix_accent');
if (savedAccent) {
  const colors = {
    purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
    blue:   { primary: '#3b82f6', secondary: '#2563eb' },
    green:  { primary: '#10b981', secondary: '#059669' },
    pink:   { primary: '#ec4899', secondary: '#db2777' },
    orange: { primary: '#f97316', secondary: '#ea580c' }
  };
  const palette = colors[savedAccent];
  if (palette) {
    document.documentElement.style.setProperty('--accent', palette.primary);
    document.documentElement.style.setProperty('--accent2', palette.secondary);
    if (accentValue) accentValue.textContent = savedAccent.charAt(0).toUpperCase() + savedAccent.slice(1);
  }
}

// 4. Notifications & Controls
const lockScreenToggle = document.getElementById('lockScreenToggle');
const lockScreenValue  = document.getElementById('lockScreenValue');
const headphonesToggle = document.getElementById('headphonesToggle');
const headphonesValue  = document.getElementById('headphonesValue');
const notifPlayerToggle = document.getElementById('notifPlayerToggle');
const notifPlayerValue = document.getElementById('notifPlayerValue');
const btControlsToggle = document.getElementById('btControlsToggle');
const btControlsValue = document.getElementById('btControlsValue');

const bindToggle = (el, valEl, name) => {
  el?.addEventListener('change', () => {
    const isOff = !el.checked;
    if (valEl) valEl.textContent = isOff ? 'Off' : 'On';
    showToast(`${name}: ${isOff ? 'Off' : 'On'}`);
    localStorage.setItem(`groovix_${el.id}`, isOff ? '0' : '1');
    if (el.id === 'aiEnabledToggle') {
      const aiFab = document.getElementById('aiFab');
      if (aiFab) aiFab.style.display = isOff ? 'none' : 'flex';
    }
  });
};

bindToggle(lockScreenToggle, lockScreenValue, 'Lock Screen');
bindToggle(headphonesToggle, headphonesValue, 'Auto-play Headphones');
bindToggle(notifPlayerToggle, notifPlayerValue, 'Notification Player');
bindToggle(btControlsToggle, btControlsValue, 'Bluetooth Controls');

// 5. AI Features
const aiEnabledToggle = document.getElementById('aiEnabledToggle');
const aiEnabledValue = document.getElementById('aiEnabledValue');
const aiRecToggle = document.getElementById('aiRecToggle');
const aiRecValue = document.getElementById('aiRecValue');
const aiSearchToggle = document.getElementById('aiSearchToggle');
const aiSearchValue = document.getElementById('aiSearchValue');
const aiVoiceToggle = document.getElementById('aiVoiceToggle');
const aiVoiceValue = document.getElementById('aiVoiceValue');

bindToggle(aiEnabledToggle, aiEnabledValue, 'AI Assistant');
bindToggle(aiRecToggle, aiRecValue, 'Recommendations');
bindToggle(aiSearchToggle, aiSearchValue, 'Search Assistant');
bindToggle(aiVoiceToggle, aiVoiceValue, 'Voice Commands');

// Restore AI state
if (localStorage.getItem('groovix_aiEnabledToggle') === '0') {
  if (aiEnabledToggle) aiEnabledToggle.checked = false;
  if (aiEnabledValue) aiEnabledValue.textContent = 'Off';
  const aiFab = document.getElementById('aiFab');
  if (aiFab) aiFab.style.display = 'none';
}

// 6. Font Size & Player Style
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
fontSizeSlider?.addEventListener('input', () => {
  const size = fontSizeSlider.value;
  fontSizeValue.textContent = `${size}px`;
  document.documentElement.style.fontSize = `${size}px`;
  localStorage.setItem('groovix_fontSize', size);
});

// Restore font size
const savedSize = localStorage.getItem('groovix_fontSize');
if (savedSize) {
  document.documentElement.style.fontSize = `${savedSize}px`;
  if (fontSizeSlider) fontSizeSlider.value = savedSize;
  if (fontSizeValue) fontSizeValue.textContent = `${savedSize}px`;
}

const playerStyleSelect = document.getElementById('playerStyleSelect');
const playerStyleValue = document.getElementById('playerStyleValue');
playerStyleSelect?.addEventListener('change', () => {
  const style = playerStyleSelect.value;
  playerStyleValue.textContent = playerStyleSelect.options[playerStyleSelect.selectedIndex].text;
  document.body.setAttribute('data-player-style', style);
  localStorage.setItem('groovix_playerStyle', style);
  showToast(`Player Style: ${playerStyleValue.textContent}`);
});

// Restore player style
const savedPlayerStyle = localStorage.getItem('groovix_playerStyle');
if (savedPlayerStyle) {
  document.body.setAttribute('data-player-style', savedPlayerStyle);
  if (playerStyleSelect) playerStyleSelect.value = savedPlayerStyle;
  if (playerStyleValue) playerStyleValue.textContent = playerStyleSelect.options[playerStyleSelect.selectedIndex].text;
}

// Init: start on library screen
switchScreen('library');

