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

// Init: start on player screen
switchScreen('player');
