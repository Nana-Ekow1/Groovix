// ---- Splash Screen ----
window.addEventListener('load', () => {
  const splash = document.getElementById('splash');
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }, 2200);
});

// ---- Navigation ----
const navBtns  = document.querySelectorAll('.nav-btn');
const bnavBtns = document.querySelectorAll('.bnav-btn');
const views    = document.querySelectorAll('.view');

function switchView(target) {
  navBtns.forEach(b  => b.classList.toggle('active',  b.dataset.view === target));
  bnavBtns.forEach(b => b.classList.toggle('active',  b.dataset.view === target));
  views.forEach(v    => v.classList.remove('active'));
  document.getElementById(`view-${target}`).classList.add('active');

  if (target === 'library')   Player.renderList(document.getElementById('searchInput').value);
  if (target === 'favorites') Player.renderFavorites();
  if (target === 'playlists') Player.renderPlaylists();
}

navBtns.forEach(b  => b.addEventListener('click', () => switchView(b.dataset.view)));
bnavBtns.forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

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
  if (!aiPanel.contains(e.target) && !aiFab.contains(e.target)) {
    aiPanel.classList.remove('open');
  }
});

// ---- Drag & drop on library ----
const libraryView = document.getElementById('view-library');

libraryView.addEventListener('dragover', (e) => {
  e.preventDefault();
  libraryView.style.outline = '2px dashed #a855f7';
});

libraryView.addEventListener('dragleave', () => { libraryView.style.outline = ''; });

libraryView.addEventListener('drop', (e) => {
  e.preventDefault();
  libraryView.style.outline = '';
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
  if (files.length) Player.addFiles(files);
});
