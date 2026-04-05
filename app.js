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
  libTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

  const songList     = document.getElementById('songList');
  const favoritesList= document.getElementById('favoritesList');
  const playlistsGrid= document.getElementById('playlistsGrid');

  songList.style.display      = tabName === 'all' || tabName === 'local' ? '' : 'none';
  favoritesList.style.display = tabName === 'favorites' ? '' : 'none';
  playlistsGrid.style.display = tabName === 'playlists' ? '' : 'none';

  if (tabName === 'favorites') Player.renderFavorites();
  if (tabName === 'playlists') Player.renderPlaylists();
}

libTabs.forEach(t => t.addEventListener('click', () => switchLibTab(t.dataset.tab)));

// ---- Nav buttons ----
bnavBtns.forEach(btn => {
  btn.addEventListener('click', () => switchScreen(btn.dataset.screen, btn.dataset.tab));
});

// ---- Top bar buttons ----
document.getElementById('btnGoLibrary').addEventListener('click', () => switchScreen('library'));
document.getElementById('btnQueue').addEventListener('click', () => switchScreen('library'));

// Clear All button
document.getElementById('btnClearAll').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear ALL songs, favorites, playlists, and feedback? This cannot be undone.')) {
    if (Player.clearEverything()) {
      showToast('Everything cleared successfully');
    }
  }
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
libScreen.addEventListener('dragover', (e) => { e.preventDefault(); libScreen.style.outline = '2px dashed #f59e0b'; });
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
  ctxTargetIndex = songIndex;
  const song = Player.getSongs()[songIndex];
  ctxSongName.textContent = song ? `${song.name} — ${song.artist || 'Unknown'}` : 'Options';
  // Update like label
  const favIds = JSON.parse(localStorage.getItem('groovix_favs') || '[]');
  const liked  = song && favIds.includes(song.id);
  document.getElementById('ctxLike').innerHTML = liked
    ? '<i class="fa-solid fa-heart" style="color:#f43f5e"></i> Unlike'
    : '<i class="fa-regular fa-heart"></i> Like';
  contextMenu.classList.add('open');
  contextBackdrop.classList.add('open');
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

// Like
document.getElementById('ctxLike').addEventListener('click', () => {
  const songs  = Player.getSongs();
  const song   = songs[ctxTargetIndex];
  if (song) {
    let favIds = JSON.parse(localStorage.getItem('groovix_favs') || '[]');
    if (favIds.includes(song.id)) favIds = favIds.filter(id => id !== song.id);
    else favIds.push(song.id);
    localStorage.setItem('groovix_favs', JSON.stringify(favIds));
    Player.renderList('');
    Player.renderFavorites();
    showToast(favIds.includes(song.id) ? 'Added to Favorites' : 'Removed from Favorites');
  }
  closeContextMenu();
});

// Ask AI About Track
document.getElementById('ctxAskAI').addEventListener('click', () => {
  const song = Player.getSongs()[ctxTargetIndex];
  if (song) {
    const q = `Tell me about the song "${song.name}" by ${song.artist || 'Unknown Artist'}`;
    document.getElementById('chatInput').value = q;
    aiPanel.classList.add('open');
    document.getElementById('chatInput').focus();
  }
  closeContextMenu();
});

// Delete
document.getElementById('ctxDelete').addEventListener('click', () => {
  if (ctxTargetIndex >= 0) Player.removeSong(ctxTargetIndex);
  closeContextMenu();
});

// Feedback shortcut from menu
document.getElementById('ctxFeedback').addEventListener('click', () => {
  closeContextMenu();
  openFeedback();
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
  const song = Player.getCurrentSong();
  const songs = Player.getSongs();
  const idx   = songs.indexOf(song);
  openContextMenu(idx >= 0 ? idx : 0);
});

// ---- Toast ----
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:calc(var(--bnav-h) + 80px); left:50%; transform:translateX(-50%);
    background:#333; color:#fff; padding:10px 20px; border-radius:20px;
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

// ---- Feedback ----
const feedbackModal = document.getElementById('feedbackModal');
let selectedStars   = 0;

function openFeedback() {
  selectedStars = 0;
  document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  document.getElementById('feedbackText').value = '';
  feedbackModal.classList.add('open');
}

document.getElementById('feedbackClose').addEventListener('click', () => feedbackModal.classList.remove('open'));
feedbackModal.addEventListener('click', (e) => { if (e.target === feedbackModal) feedbackModal.classList.remove('open'); });

document.getElementById('bnavFeedback').addEventListener('click', openFeedback);

document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('click', () => {
    selectedStars = parseInt(star.dataset.val);
    document.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < selectedStars);
      s.innerHTML = i < selectedStars ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    });
  });
});

document.getElementById('btnSubmitFeedback').addEventListener('click', () => {
  const text = document.getElementById('feedbackText').value.trim();
  if (!selectedStars) { showToast('Please select a star rating'); return; }

  // Save feedback to localStorage
  const feedbacks = JSON.parse(localStorage.getItem('groovix_feedback') || '[]');
  feedbacks.push({ stars: selectedStars, text, date: new Date().toISOString() });
  localStorage.setItem('groovix_feedback', JSON.stringify(feedbacks));

  feedbackModal.classList.remove('open');
  showToast(`Thanks for your ${selectedStars}★ feedback!`);
});

// ---- Bulk Select Mode ----
let selectMode = false;
const selectedIds = new Set();

const btnSelectMode    = document.getElementById('btnSelectMode');
const btnSelectAll     = document.getElementById('btnSelectAll');
const btnDeleteSelected= document.getElementById('btnDeleteSelected');
const btnCancelSelect  = document.getElementById('btnCancelSelect');
const libNormalActions = document.getElementById('libNormalActions');
const libSelectActions = document.getElementById('libSelectActions');
const libTopbarTitle   = document.getElementById('libTopbarTitle');

// Create select bar
const selectBar = document.createElement('div');
selectBar.className = 'select-bar';
selectBar.innerHTML = `
  <span class="select-bar-count" id="selectCount">0 selected</span>
  <button class="select-bar-btn" id="selectBarSelectAll"><i class="fa fa-check-double"></i> All</button>
  <button class="select-bar-btn" id="selectBarAddPlaylist"><i class="fa fa-list-ul"></i> Playlist</button>
  <button class="select-bar-btn danger" id="selectBarDelete"><i class="fa fa-trash"></i> Delete</button>
  <button class="select-bar-btn" id="selectBarCancel"><i class="fa fa-xmark"></i></button>
`;
document.body.appendChild(selectBar);

function enterSelectMode() {
  selectMode = true;
  selectedIds.clear();
  libNormalActions.style.display = 'none';
  libSelectActions.style.display = 'flex';
  libTopbarTitle.textContent = 'SELECT SONGS';
  selectBar.classList.add('visible');
  Player.renderList('');
}

function exitSelectMode() {
  selectMode = false;
  selectedIds.clear();
  libNormalActions.style.display = 'flex';
  libSelectActions.style.display = 'none';
  libTopbarTitle.textContent = 'MY LIBRARY';
  selectBar.classList.remove('visible');
  Player.renderList('');
}

function updateSelectCount() {
  document.getElementById('selectCount').textContent =
    `${selectedIds.size} selected`;
}

function deleteSelected() {
  if (!selectedIds.size) return;
  const count = selectedIds.size;
  const ids = [...selectedIds];
  Player.removeSongsByIds(ids);
  exitSelectMode();
  if (typeof showToast === 'function') showToast(`Deleted ${count} song${count !== 1 ? 's' : ''}`);
}

btnSelectMode.addEventListener('click', enterSelectMode);
btnCancelSelect.addEventListener('click', exitSelectMode);
document.getElementById('selectBarCancel').addEventListener('click', exitSelectMode);

btnSelectAll.addEventListener('click', () => {
  const songs = Player.getSongs();
  if (selectedIds.size === songs.length) {
    selectedIds.clear();
  } else {
    songs.forEach(s => selectedIds.add(s.id));
  }
  updateSelectCount();
  Player.renderList('');
});

document.getElementById('selectBarSelectAll').addEventListener('click', () => {
  const songs = Player.getSongs();
  if (selectedIds.size === songs.length) {
    selectedIds.clear();
  } else {
    songs.forEach(s => selectedIds.add(s.id));
  }
  updateSelectCount();
  Player.renderList('');
});

btnDeleteSelected.addEventListener('click', deleteSelected);
document.getElementById('selectBarDelete').addEventListener('click', deleteSelected);

// Add selected songs to a playlist
document.getElementById('selectBarAddPlaylist').addEventListener('click', () => {
  if (!selectedIds.size) { showToast('Select at least one song'); return; }
  document.getElementById('playlistNameInput').value = '';
  document.getElementById('newPlaylistModal').classList.add('open');
  // After playlist is created, add selected songs to it
  window._pendingSelectAdd = true;
});

// Expose to player.js for rendering checkboxes
window.selectMode      = () => selectMode;
window.selectedIds     = selectedIds;
window.enterSelectMode = enterSelectMode;
window.exitSelectMode  = exitSelectMode;
window.toggleSelect    = (id) => {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  updateSelectCount();
  Player.renderList('');
};

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
      aiFabEl.style.right = 'auto';
      aiFabEl.style.bottom = 'auto';
      aiFabEl.style.left = p.x + 'px';
      aiFabEl.style.top  = p.y + 'px';
    }
  } catch(e) {}
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

// Init: start on player screen
switchScreen('player');

