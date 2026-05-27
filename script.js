// =====================================================
// CloudVault — Main Application Script
// Vanilla JavaScript + Firebase SDK
// =====================================================

"use strict";

// ── Firebase Configuration ──
// GANTI dengan konfigurasi Firebase project kamu sendiri!
// Daftar di: https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ── Initialize Firebase ──
firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

// ── Global State ──
let currentUser   = null;   // user yang sedang login
let allProjects   = [];     // semua project dari Firestore
let stagedFiles   = [];     // file yang belum diupload
let activeModal   = null;   // project yang dibuka di modal
let animEnabled   = true;   // toggle animasi
let unsubscribe   = null;   // listener Firestore realtime

// ── DOM References ──
const loadingScreen     = document.getElementById('loading-screen');
const authScreen        = document.getElementById('auth-screen');
const appEl             = document.getElementById('app');
const sidebarEl         = document.getElementById('sidebar');
const mainWrap          = document.getElementById('main-wrap');
const topbar            = document.getElementById('topbar');
const toastContainer    = document.getElementById('toast-container');

// =====================================================
//  INIT — Cek status login saat halaman dimuat
// =====================================================
window.addEventListener('DOMContentLoaded', () => {
  // Tampilkan loading screen dulu
  setTimeout(() => {
    // AOS init
    AOS.init({ duration: 500, once: true, easing: 'ease-out-cubic' });

    // Cek apakah user sudah login
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        initApp();
      } else {
        showAuthScreen();
      }
    });
  }, 2400); // durasi loading screen

  // Background particles
  initParticles();
});

// =====================================================
//  AUTH — Login & Logout
// =====================================================

function showAuthScreen() {
  loadingScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  appEl.classList.add('hidden');
  initAuthParticles();
}

function showApp() {
  loadingScreen.classList.add('hidden');
  authScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
}

// Login Google
document.getElementById('login-google').addEventListener('click', async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    // onAuthStateChanged akan otomatis trigger initApp()
  } catch (e) {
    showToast('Login Google gagal: ' + e.message, 'error');
    console.error(e);
  }
});

// Login GitHub
document.getElementById('login-github').addEventListener('click', async () => {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    showToast('Login GitHub gagal: ' + e.message, 'error');
    console.error(e);
  }
});

// Logout
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', doLogout);
  document.getElementById('settings-logout').addEventListener('click', doLogout);
}

async function doLogout() {
  if (unsubscribe) unsubscribe();  // hentikan listener Firestore
  await auth.signOut();
  currentUser = null;
  allProjects = [];
  showToast('Berhasil logout!', 'info');
  showAuthScreen();
}

// =====================================================
//  APP INIT — Setelah login berhasil
// =====================================================
async function initApp() {
  showApp();
  updateUserUI();
  setupLogout();
  setupSidebar();
  setupNavigation();
  setupTopbar();
  setupUpload();
  setupSearch();
  setupModal();
  setupSettings();
  startClock();
  startGreeting();

  // Load data dari Firestore dengan realtime listener
  listenProjects();

  // Navigasi ke dashboard
  navigateTo('dashboard');

  showToast(`Selamat datang, ${currentUser.displayName?.split(' ')[0] || 'Developer'}!`, 'success');
}

// =====================================================
//  USER UI — Avatar, nama, email
// =====================================================
function updateUserUI() {
  const avatar = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=00f5c3&color=000`;
  const name   = currentUser.displayName || currentUser.email || 'Developer';
  const email  = currentUser.email || '';

  document.getElementById('sidebar-avatar').src  = avatar;
  document.getElementById('topbar-avatar').src   = avatar;
  document.getElementById('settings-avatar').src = avatar;
  document.getElementById('sidebar-username').textContent  = name;
  document.getElementById('settings-username').textContent = name;
  document.getElementById('settings-email').textContent    = email;
  document.getElementById('greeting-name').textContent     = name.split(' ')[0];
}

// =====================================================
//  CLOCK & GREETING
// =====================================================
function startClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

function startGreeting() {
  const h = new Date().getHours();
  let greet = 'Good morning';
  if (h >= 12 && h < 17) greet = 'Good afternoon';
  else if (h >= 17) greet = 'Good evening';
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = greet;
}

// =====================================================
//  SIDEBAR — Toggle collapse & mobile
// =====================================================
function setupSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const hamburger = document.getElementById('hamburger');

  // Desktop collapse
  toggleBtn.addEventListener('click', () => {
    sidebarEl.classList.toggle('collapsed');
    mainWrap.classList.toggle('sidebar-collapsed');
  });

  // Mobile hamburger
  hamburger.addEventListener('click', () => {
    sidebarEl.classList.toggle('mobile-open');
    // tambah overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', () => {
        sidebarEl.classList.remove('mobile-open');
        overlay.classList.remove('show');
      });
    }
    overlay.classList.toggle('show');
  });
}

// =====================================================
//  NAVIGATION — Pindah antar halaman
// =====================================================
function setupNavigation() {
  // Nav items di sidebar
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      // Tutup mobile sidebar
      sidebarEl.classList.remove('mobile-open');
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) overlay.classList.remove('show');
    });
  });

  // Tombol dengan data-page-link (contoh: tombol "New Project")
  document.querySelectorAll('[data-page-link]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.pageLink));
  });
}

function navigateTo(pageId) {
  // Sembunyikan semua page
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  // Tampilkan page yang dipilih
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.remove('hidden');

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  // Refresh data khusus per halaman
  if (pageId === 'dashboard')   renderDashboard();
  if (pageId === 'projects')    renderProjectGrid('all-project-grid', getActiveProjects());
  if (pageId === 'categories')  renderCategories();
  if (pageId === 'favorites')   renderProjectGrid('favorites-grid', getFavoriteProjects());
  if (pageId === 'recent')      renderProjectGrid('recent-grid', getRecentProjects());
  if (pageId === 'trash')       renderTrashGrid();
}

// =====================================================
//  TOPBAR — Scroll shadow & theme toggle
// =====================================================
function setupTopbar() {
  // Shadow saat scroll
  document.querySelector('.page-content')?.addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', document.querySelector('.page-content').scrollTop > 10);
  });

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    document.getElementById('theme-icon').className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    document.getElementById('dark-mode-toggle').checked = isLight;
  });
}

// =====================================================
//  FIRESTORE — Realtime listener untuk semua project
// =====================================================
function listenProjects() {
  if (!currentUser) return;

  // Hentikan listener lama jika ada
  if (unsubscribe) unsubscribe();

  // Subscribe ke collection projects milik user ini
  unsubscribe = db.collection('projects')
    .where('ownerId', '==', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Update UI setelah data berubah
      updateNavBadges();
      updateStorageBar();
      refreshCurrentPage();
    }, err => {
      console.error('Firestore error:', err);
      // Jika belum ada index, tampilkan tanpa orderBy
      listenProjectsSimple();
    });
}

// Fallback tanpa orderBy (jika index belum dibuat)
function listenProjectsSimple() {
  unsubscribe = db.collection('projects')
    .where('ownerId', '==', currentUser.uid)
    .onSnapshot(snapshot => {
      allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allProjects.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      updateNavBadges();
      updateStorageBar();
      refreshCurrentPage();
    });
}

function refreshCurrentPage() {
  const activePage = document.querySelector('.nav-item.active')?.dataset?.page;
  if (activePage) navigateTo(activePage);
}

// ── Filter helpers ──
function getActiveProjects() {
  return allProjects.filter(p => !p.inTrash);
}
function getFavoriteProjects() {
  return allProjects.filter(p => p.isFavorite && !p.inTrash);
}
function getRecentProjects() {
  return getActiveProjects().slice(0, 20);
}
function getTrashProjects() {
  return allProjects.filter(p => p.inTrash);
}

// =====================================================
//  NAV BADGES & STORAGE BAR
// =====================================================
function updateNavBadges() {
  document.getElementById('nav-project-count').textContent = getActiveProjects().length;
  document.getElementById('nav-fav-count').textContent     = getFavoriteProjects().length;
  document.getElementById('nav-trash-count').textContent   = getTrashProjects().length;
}

function updateStorageBar() {
  const totalBytes = allProjects.reduce((sum, p) => sum + (p.size || 0), 0);
  const limitBytes = 5 * 1024 * 1024 * 1024; // 5 GB demo
  const pct = Math.min((totalBytes / limitBytes) * 100, 100).toFixed(1);

  document.getElementById('sidebar-storage-text').textContent = `${formatBytes(totalBytes)} / 5 GB`;
  document.getElementById('sidebar-storage-fill').style.width = `${pct}%`;
}

// =====================================================
//  DASHBOARD — Stat cards, charts, recent projects
// =====================================================
function renderDashboard() {
  const active = getActiveProjects();
  const favs   = getFavoriteProjects();
  const totalBytes = active.reduce((sum, p) => sum + (p.size || 0), 0);

  // Animated counters
  animateCounter('stat-projects',  active.length);
  animateCounter('stat-files',     active.reduce((s, p) => s + (p.fileCount || 1), 0));
  animateCounter('stat-favorites', favs.length);
  document.getElementById('stat-storage').textContent = formatBytes(totalBytes);

  // Recent projects (max 6)
  renderProjectGrid('recent-project-grid', active.slice(0, 6));

  // Charts
  renderUploadChart();
  renderCategoryChart();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// ── Upload Activity Chart ──
let uploadChartInstance = null;
function renderUploadChart() {
  const ctx = document.getElementById('upload-chart');
  if (!ctx) return;

  // Hitung upload per hari (7 hari terakhir)
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
    days.push(label);

    const count = allProjects.filter(p => {
      const created = p.createdAt?.toDate?.();
      if (!created) return false;
      return created.toDateString() === d.toDateString();
    }).length;
    counts.push(count);
  }

  if (uploadChartInstance) uploadChartInstance.destroy();

  uploadChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Uploads',
        data: counts,
        borderColor: '#00f5c3',
        backgroundColor: 'rgba(0,245,195,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00f5c3',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a9ab8', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a9ab8', font: { size: 11 }, precision: 0 } }
      }
    }
  });
}

// ── Category Donut Chart ──
let categoryChartInstance = null;
function renderCategoryChart() {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  const cats = {};
  getActiveProjects().forEach(p => {
    cats[p.category || 'Other'] = (cats[p.category || 'Other'] || 0) + 1;
  });

  const labels = Object.keys(cats);
  const data   = Object.values(cats);
  const colors = ['#00f5c3','#a78bfa','#f472b6','#fb923c','#38bdf8','#fbbf24','#34d399','#f87171'];

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: data.length ? colors.slice(0, labels.length) : ['rgba(255,255,255,0.05)'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#7a9ab8', font: { size: 10 }, padding: 8, boxWidth: 10 }
        }
      },
      cutout: '65%',
    }
  });
}

// =====================================================
//  PROJECT GRID — Render kartu project
// =====================================================
function renderProjectGrid(containerId, projects) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <p>Belum ada project di sini.</p>
      </div>`;
    return;
  }

  container.innerHTML = projects.map(p => buildProjectCard(p)).join('');

  // Event listeners untuk setiap card
  container.querySelectorAll('.project-card').forEach(card => {
    const id = card.dataset.id;
    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    // Klik card → buka modal
    card.querySelector('.card-open-btn')?.addEventListener('click', () => openModal(project));

    // Favorite toggle
    card.querySelector('.fav-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(project);
    });

    // Hapus (masuk trash)
    card.querySelector('.del-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      moveToTrash(project);
    });
  });
}

function buildProjectCard(p) {
  const thumbIcon = getFileIcon(p.fileType || p.name || '');
  const thumbBg   = getCategoryGradient(p.category);
  const favIcon   = p.isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
  const date      = p.createdAt?.toDate ? formatDate(p.createdAt.toDate()) : '—';

  return `
    <div class="project-card ${p.inTrash ? 'in-trash' : ''}" data-id="${p.id}">
      <div class="project-card-thumb" style="background: ${thumbBg}">
        <div class="file-type-icon">${thumbIcon}</div>
      </div>
      <div class="project-card-body">
        <div class="project-card-title" title="${p.name}">${p.name}</div>
        <div class="project-card-meta">
          <span class="project-card-cat">${p.category || 'Other'}</span>
          <span class="project-card-date">${date}</span>
        </div>
      </div>
      <div class="project-card-actions">
        <button class="icon-btn card-open-btn" title="Buka Detail"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        <button class="icon-btn fav-btn ${p.isFavorite ? 'active' : ''}" title="Favorite">
          <i class="${favIcon}"></i>
        </button>
        <button class="icon-btn icon-btn--danger del-btn" title="Hapus">
          <i class="fa-solid fa-trash"></i>
        </button>
        <span class="project-card-size">${formatBytes(p.size || 0)}</span>
      </div>
    </div>`;
}

// =====================================================
//  CATEGORIES PAGE
// =====================================================
const CATEGORIES = [
  { name: 'Landing Page',     icon: '🖥️', color: '#00f5c3' },
  { name: 'Portfolio',        icon: '🎨', color: '#a78bfa' },
  { name: 'Organization',     icon: '🏢', color: '#38bdf8' },
  { name: 'Birthday Website', icon: '🎂', color: '#f472b6' },
  { name: 'UI Design',        icon: '✏️', color: '#fbbf24' },
  { name: 'College Project',  icon: '🎓', color: '#34d399' },
  { name: 'E-Commerce',       icon: '🛒', color: '#fb923c' },
  { name: 'Mobile UI',        icon: '📱', color: '#f87171' },
];

function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;

  grid.innerHTML = CATEGORIES.map(cat => {
    const count = getActiveProjects().filter(p => p.category === cat.name).length;
    return `
      <div class="cat-card" data-cat="${cat.name}" style="border-top: 2px solid ${cat.color}20;">
        <span class="cat-icon">${cat.icon}</span>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-count">${count} project</div>
      </div>`;
  }).join('');

  // Klik kategori → filter project
  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const cat = card.dataset.cat;
      document.getElementById('cat-filter-title').textContent = cat;
      const filtered = getActiveProjects().filter(p => p.category === cat);
      renderProjectGrid('cat-project-grid', filtered);
    });
  });

  // Default: tampilkan semua
  renderProjectGrid('cat-project-grid', getActiveProjects());
}

// =====================================================
//  TRASH
// =====================================================
function renderTrashGrid() {
  const trashed = getTrashProjects();
  const container = document.getElementById('trash-grid');
  if (!container) return;

  if (trashed.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-trash-can"></i><p>Trash is empty.</p></div>`;
    return;
  }

  container.innerHTML = trashed.map(p => buildTrashCard(p)).join('');

  container.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', () => restoreFromTrash(allProjects.find(p => p.id === btn.dataset.id)));
  });
  container.querySelectorAll('.perm-del-btn').forEach(btn => {
    btn.addEventListener('click', () => permanentDelete(allProjects.find(p => p.id === btn.dataset.id)));
  });

  document.getElementById('empty-trash-btn').onclick = emptyTrash;
}

function buildTrashCard(p) {
  return `
    <div class="project-card in-trash" data-id="${p.id}">
      <div class="project-card-thumb" style="background: ${getCategoryGradient(p.category)}; filter: grayscale(0.6)">
        <div class="file-type-icon">${getFileIcon(p.name || '')}</div>
      </div>
      <div class="project-card-body">
        <div class="project-card-title">${p.name}</div>
        <div class="project-card-meta">
          <span class="project-card-cat">${p.category || 'Other'}</span>
        </div>
      </div>
      <div class="project-card-actions">
        <button class="icon-btn restore-btn" data-id="${p.id}" title="Restore" style="color:var(--cyan)">
          <i class="fa-solid fa-rotate-left"></i>
        </button>
        <button class="icon-btn icon-btn--danger perm-del-btn" data-id="${p.id}" title="Hapus Permanen">
          <i class="fa-solid fa-trash-can"></i>
        </button>
        <span class="project-card-size">${formatBytes(p.size || 0)}</span>
      </div>
    </div>`;
}

async function moveToTrash(project) {
  try {
    await db.collection('projects').doc(project.id).update({ inTrash: true });
    showToast(`"${project.name}" dipindahkan ke trash.`, 'warning');
  } catch(e) {
    showToast('Gagal menghapus: ' + e.message, 'error');
  }
}

async function restoreFromTrash(project) {
  if (!project) return;
  await db.collection('projects').doc(project.id).update({ inTrash: false });
  showToast(`"${project.name}" berhasil direstore!`, 'success');
}

async function permanentDelete(project) {
  if (!project) return;
  if (!confirm(`Hapus permanen "${project.name}"? Tidak bisa dibatalkan.`)) return;
  try {
    // Hapus file dari Storage jika ada
    if (project.storagePath) {
      await storage.ref(project.storagePath).delete().catch(() => {});
    }
    await db.collection('projects').doc(project.id).delete();
    showToast(`"${project.name}" dihapus permanen.`, 'info');
  } catch(e) {
    showToast('Gagal menghapus: ' + e.message, 'error');
  }
}

async function emptyTrash() {
  const trashed = getTrashProjects();
  if (trashed.length === 0) { showToast('Trash sudah kosong.', 'info'); return; }
  if (!confirm(`Hapus ${trashed.length} project secara permanen?`)) return;

  const batch = db.batch();
  for (const p of trashed) {
    if (p.storagePath) await storage.ref(p.storagePath).delete().catch(() => {});
    batch.delete(db.collection('projects').doc(p.id));
  }
  await batch.commit();
  showToast('Trash berhasil dikosongkan!', 'success');
}

// =====================================================
//  FAVORITE TOGGLE
// =====================================================
async function toggleFavorite(project) {
  const newVal = !project.isFavorite;
  await db.collection('projects').doc(project.id).update({ isFavorite: newVal });
  showToast(newVal ? '⭐ Ditambahkan ke Favorites!' : 'Dihapus dari Favorites.', newVal ? 'success' : 'info');
}

// =====================================================
//  UPLOAD — Drag & Drop + Firebase Storage
// =====================================================
function setupUpload() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');

  // Drag events
  ['dragenter','dragover'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  });
  ['dragleave','dragend'].forEach(evt => {
    dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // Browse file
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // Upload button
  uploadBtn.addEventListener('click', doUpload);
}

function handleFiles(fileList) {
  stagedFiles = [...fileList];
  renderStagedFiles();

  const uploadBtn = document.getElementById('upload-btn');
  uploadBtn.disabled = stagedFiles.length === 0;
}

function renderStagedFiles() {
  const container = document.getElementById('staged-files');
  if (stagedFiles.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = stagedFiles.map((f, i) => `
    <div class="staged-file">
      <i class="${getFileIconClass(f.name)}"></i>
      <span class="staged-file-name">${f.name}</span>
      <span class="staged-file-size">${formatBytes(f.size)}</span>
      <button class="staged-file-remove" data-index="${i}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>`).join('');

  container.querySelectorAll('.staged-file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      stagedFiles.splice(Number(btn.dataset.index), 1);
      renderStagedFiles();
      document.getElementById('upload-btn').disabled = stagedFiles.length === 0;
    });
  });
}

async function doUpload() {
  const name     = document.getElementById('project-name').value.trim();
  const category = document.getElementById('project-category').value;
  const desc     = document.getElementById('project-desc').value.trim();

  if (!name) { showToast('Masukkan nama project dulu!', 'warning'); return; }
  if (stagedFiles.length === 0) { showToast('Pilih file dulu!', 'warning'); return; }

  const progressWrap = document.getElementById('upload-progress-wrap');
  const progressBar  = document.getElementById('progress-bar-fill');
  const progressPct  = document.getElementById('progress-percent');
  const progressFn   = document.getElementById('progress-filename');
  const progressStat = document.getElementById('progress-status');
  const uploadBtn    = document.getElementById('upload-btn');

  progressWrap.classList.remove('hidden');
  uploadBtn.disabled = true;

  // Upload semua file satu per satu
  let totalSize = 0;
  const uploadedFiles = [];

  for (let i = 0; i < stagedFiles.length; i++) {
    const file = stagedFiles[i];
    totalSize += file.size;

    progressFn.textContent   = file.name;
    progressStat.textContent = `Uploading file ${i + 1} of ${stagedFiles.length}...`;

    try {
      // Simpan ke Firebase Storage
      const storagePath = `projects/${currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef  = storage.ref(storagePath);
      const uploadTask  = storageRef.put(file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            progressBar.style.width = `${pct}%`;
            progressPct.textContent = `${pct}%`;
          },
          reject,
          async () => {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            uploadedFiles.push({ name: file.name, url: downloadURL, storagePath, size: file.size });
            resolve();
          }
        );
      });

    } catch (e) {
      // Jika Storage belum dikonfigurasi, simpan tanpa file (demo mode)
      console.warn('Storage upload failed, saving metadata only:', e.message);
      uploadedFiles.push({ name: file.name, url: '', storagePath: '', size: file.size });
    }
  }

  progressStat.textContent = 'Saving to cloud...';
  progressPct.textContent  = '100%';
  progressBar.style.width  = '100%';

  // Simpan metadata ke Firestore
  try {
    await db.collection('projects').add({
      name,
      category,
      description: desc,
      size: totalSize,
      fileCount: stagedFiles.length,
      files: uploadedFiles,
      fileType: stagedFiles[0]?.name?.split('.').pop()?.toLowerCase() || 'file',
      storagePath: uploadedFiles[0]?.storagePath || '',
      downloadURL: uploadedFiles[0]?.url || '',
      ownerId: currentUser.uid,
      ownerName: currentUser.displayName || 'Unknown',
      ownerEmail: currentUser.email || '',
      isFavorite: false,
      inTrash: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showToast(`✅ "${name}" berhasil diupload!`, 'success');

    // Reset form
    document.getElementById('project-name').value = '';
    document.getElementById('project-desc').value = '';
    stagedFiles = [];
    renderStagedFiles();
    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';
    uploadBtn.disabled = true;

    // Kembali ke dashboard
    setTimeout(() => navigateTo('dashboard'), 1000);

  } catch (e) {
    showToast('Gagal menyimpan ke cloud: ' + e.message, 'error');
    console.error(e);
  }

  uploadBtn.disabled = false;
}

// =====================================================
//  SEARCH — Realtime search
// =====================================================
function setupSearch() {
  const input    = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.classList.remove('show'); return; }

    const results = getActiveProjects().filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 8);

    if (results.length === 0) {
      dropdown.innerHTML = `<div class="search-result-item" style="color:var(--text-muted)"><i class="fa-solid fa-magnifying-glass"></i> Tidak ada hasil.</div>`;
    } else {
      dropdown.innerHTML = results.map(p => `
        <div class="search-result-item" data-id="${p.id}">
          <i class="${getFileIconClass(p.name || '')}"></i>
          <span>${p.name}</span>
          <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted)">${p.category || ''}</span>
        </div>`).join('');

      dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const project = allProjects.find(p => p.id === item.dataset.id);
          if (project) { dropdown.classList.remove('show'); input.value = ''; openModal(project); }
        });
      });
    }

    dropdown.classList.add('show');
  });

  // Tutup dropdown saat klik luar
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Filter di halaman Projects
  document.getElementById('project-filter-cat')?.addEventListener('change', applyProjectFilter);
  document.getElementById('project-filter-sort')?.addEventListener('change', applyProjectFilter);
}

function applyProjectFilter() {
  const cat  = document.getElementById('project-filter-cat').value;
  const sort = document.getElementById('project-filter-sort').value;

  let filtered = getActiveProjects();

  if (cat !== 'all') filtered = filtered.filter(p => p.category === cat);

  switch (sort) {
    case 'oldest': filtered.sort((a,b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)); break;
    case 'name':   filtered.sort((a,b) => (a.name || '').localeCompare(b.name || '')); break;
    case 'size':   filtered.sort((a,b) => (b.size || 0) - (a.size || 0)); break;
    default:       filtered.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }

  renderProjectGrid('all-project-grid', filtered);
}

// =====================================================
//  MODAL — Project Detail
// =====================================================
function setupModal() {
  const modal    = document.getElementById('project-detail-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const tabs     = document.querySelectorAll('.modal-tab');
  const delBtn   = document.getElementById('modal-delete-btn');
  const favBtn   = document.getElementById('modal-favorite-btn');

  // Tutup modal
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`modal-tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });

  // Delete dari modal
  delBtn.addEventListener('click', () => {
    if (activeModal) { closeModal(); moveToTrash(activeModal); }
  });

  // Favorite dari modal
  favBtn.addEventListener('click', () => {
    if (activeModal) toggleFavorite(activeModal);
  });
}

function openModal(project) {
  activeModal = project;
  const modal = document.getElementById('project-detail-modal');

  // Isi data modal
  document.getElementById('modal-project-name').textContent = project.name;
  document.getElementById('modal-category').textContent     = project.category || '—';
  document.getElementById('modal-size').textContent         = formatBytes(project.size || 0);
  document.getElementById('modal-date').textContent         = project.createdAt?.toDate ? formatDate(project.createdAt.toDate()) : '—';
  document.getElementById('modal-owner').textContent        = project.ownerName || '—';
  document.getElementById('modal-desc').textContent         = project.description || 'Tidak ada deskripsi.';

  // Download link
  const dlLink = document.getElementById('modal-download-link');
  if (project.downloadURL) {
    dlLink.href = project.downloadURL;
    dlLink.style.display = 'inline-flex';
  } else {
    dlLink.style.display = 'none';
  }

  // Favorite icon
  const favBtn = document.getElementById('modal-favorite-btn');
  favBtn.innerHTML = project.isFavorite
    ? '<i class="fa-solid fa-star" style="color:var(--yellow)"></i>'
    : '<i class="fa-regular fa-star"></i>';

  // File list tab
  const fileList = document.getElementById('modal-file-list');
  if (project.files && project.files.length > 0) {
    fileList.innerHTML = project.files.map(f => `
      <div class="file-list-item">
        <i class="${getFileIconClass(f.name)}"></i>
        <span style="flex:1">${f.name}</span>
        <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted)">${formatBytes(f.size || 0)}</span>
        ${f.url ? `<a href="${f.url}" download style="color:var(--cyan);font-size:0.8rem;margin-left:0.5rem"><i class="fa-solid fa-download"></i></a>` : ''}
      </div>`).join('');
  } else {
    fileList.innerHTML = `<div class="file-list-item"><i class="fa-solid fa-file"></i><span>${project.name}</span></div>`;
  }

  // Preview tab
  const previewArea = document.getElementById('modal-preview-area');
  if (project.downloadURL) {
    const ext = (project.fileType || '').toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) {
      previewArea.innerHTML = `<img src="${project.downloadURL}" alt="${project.name}" style="max-width:100%;border-radius:8px">`;
    } else if (['mp4','webm'].includes(ext)) {
      previewArea.innerHTML = `<video src="${project.downloadURL}" controls style="max-width:100%;border-radius:8px"></video>`;
    } else if (ext === 'pdf') {
      previewArea.innerHTML = `<iframe src="${project.downloadURL}" style="width:100%;height:400px;border:none;border-radius:8px"></iframe>`;
    } else {
      previewArea.innerHTML = `<p class="preview-placeholder"><i class="fa-solid fa-eye-slash" style="display:block;font-size:2rem;margin-bottom:0.5rem;opacity:0.3"></i>Preview tidak tersedia untuk file ini.<br><small style="font-family:var(--font-mono)">.${ext}</small></p>`;
    }
  } else {
    previewArea.innerHTML = `<p class="preview-placeholder">File belum tersedia untuk preview.</p>`;
  }

  // Reset ke tab Info
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="info"]').classList.add('active');
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('modal-tab-info').classList.remove('hidden');

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('project-detail-modal').classList.add('hidden');
  document.body.style.overflow = '';
  activeModal = null;
}

// =====================================================
//  SETTINGS
// =====================================================
function setupSettings() {
  // Dark/Light mode toggle
  document.getElementById('dark-mode-toggle').addEventListener('change', e => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    document.getElementById('theme-icon').className = e.target.checked ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });

  // Animation toggle
  document.getElementById('anim-toggle').addEventListener('change', e => {
    animEnabled = e.target.checked;
    document.body.style.setProperty('--transition', animEnabled ? 'all 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none');
  });

  // Export backup JSON
  document.getElementById('export-btn').addEventListener('click', async () => {
    const data = JSON.stringify(getActiveProjects().map(p => ({
      name: p.name, category: p.category, description: p.description,
      size: p.size, fileType: p.fileType, downloadURL: p.downloadURL,
      createdAt: p.createdAt?.toDate?.()?.toISOString() || null,
    })), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `cloudvault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON berhasil diunduh!', 'success');
  });

  // Import backup
  document.getElementById('import-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text    = await file.text();
      const parsed  = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Format tidak valid.');

      const batch = db.batch();
      parsed.forEach(p => {
        const ref = db.collection('projects').doc();
        batch.set(ref, {
          ...p,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || 'Unknown',
          isFavorite: false,
          inTrash: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      showToast(`${parsed.length} project berhasil diimport!`, 'success');
    } catch(err) {
      showToast('Import gagal: ' + err.message, 'error');
    }
  });

  // Clear cache
  document.getElementById('clear-cache-btn').addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    showToast('Local cache berhasil dibersihkan!', 'info');
  });
}

// =====================================================
//  TOAST NOTIFICATIONS
// =====================================================
function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-solid fa-circle-check',
    error:   'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info:    'fa-solid fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <i class="toast-icon ${icons[type] || icons.info}"></i>
    <span>${message}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =====================================================
//  BACKGROUND PARTICLES (canvas)
// =====================================================
function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W = window.innerWidth;
  let H = window.innerHeight;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function rand(min, max) { return Math.random() * (max - min) + min; }

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.5, 2),
      vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2),
      alpha: rand(0.2, 0.7),
      color: ['#00f5c3','#a78bfa','#38bdf8','#f472b6'][Math.floor(Math.random() * 4)],
    });
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
}

// Auth screen particles (sedikit lebih banyak)
function initAuthParticles() {
  const container = document.getElementById('auth-particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      background: ${['#00f5c3','#a78bfa','#38bdf8','#f472b6'][Math.floor(Math.random()*4)]};
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.5 + 0.2};
      animation: float ${Math.random() * 4 + 3}s ease-in-out infinite alternate;
      animation-delay: ${Math.random() * 2}s;
    `;
    container.appendChild(dot);
  }
}

// =====================================================
//  HELPER FUNCTIONS
// =====================================================

// Format bytes ke KB/MB/GB
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format tanggal ke bahasa Indonesia
function formatDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Icon emoji berdasarkan ekstensi file
function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = {
    zip: '📦', rar: '📦',
    html: '🌐', htm: '🌐',
    css: '🎨',
    js: '⚡', ts: '⚡', jsx: '⚡', tsx: '⚡',
    vue: '💚', react: '⚛️',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬', webm: '🎬',
    pdf: '📄',
    json: '🗃️', md: '📝', txt: '📝',
    py: '🐍', php: '🐘', java: '☕', go: '🐹',
  };
  return icons[ext] || '📁';
}

// Font Awesome icon class berdasarkan ekstensi
function getFileIconClass(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const map = {
    zip: 'fa-solid fa-file-zipper',
    html: 'fa-brands fa-html5',
    css: 'fa-brands fa-css3-alt',
    js: 'fa-brands fa-js',
    ts: 'fa-solid fa-code',
    jsx: 'fa-brands fa-react',
    tsx: 'fa-brands fa-react',
    vue: 'fa-solid fa-code',
    png: 'fa-regular fa-image',
    jpg: 'fa-regular fa-image',
    jpeg: 'fa-regular fa-image',
    gif: 'fa-regular fa-image',
    svg: 'fa-regular fa-image',
    mp4: 'fa-solid fa-film',
    pdf: 'fa-solid fa-file-pdf',
    json: 'fa-solid fa-database',
    md: 'fa-brands fa-markdown',
    py: 'fa-brands fa-python',
  };
  return map[ext] || 'fa-solid fa-file';
}

// Gradient background per kategori
function getCategoryGradient(category) {
  const gradients = {
    'Landing Page':     'linear-gradient(135deg, #003d33, #00f5c310)',
    'Portfolio':        'linear-gradient(135deg, #2d1b6b, #a78bfa10)',
    'Organization':     'linear-gradient(135deg, #0c2233, #38bdf810)',
    'Birthday Website': 'linear-gradient(135deg, #3d1040, #f472b610)',
    'UI Design':        'linear-gradient(135deg, #3d2800, #fbbf2410)',
    'College Project':  'linear-gradient(135deg, #0d3320, #34d39910)',
    'E-Commerce':       'linear-gradient(135deg, #3d1a00, #fb923c10)',
    'Mobile UI':        'linear-gradient(135deg, #3d0c0c, #f8717110)',
  };
  return gradients[category] || 'linear-gradient(135deg, #0d1420, #1a2640)';
}

// ── Ripple Effect ──
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-danger, .auth-btn');
  if (!btn || !animEnabled) return;

  const rect   = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size   = Math.max(rect.width, rect.height);

  ripple.style.cssText = `
    position:absolute; border-radius:50%;
    width:${size}px; height:${size}px;
    background:rgba(255,255,255,0.15);
    left:${e.clientX - rect.left - size/2}px;
    top:${e.clientY - rect.top - size/2}px;
    transform:scale(0); opacity:1;
    animation:rippleAnim 0.5s ease-out forwards;
    pointer-events:none;
  `;

  if (!document.querySelector('#ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = '@keyframes rippleAnim{to{transform:scale(2);opacity:0}}';
    document.head.appendChild(style);
  }

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

console.log('%cCloudVault 🚀', 'font-size:20px;font-weight:bold;color:#00f5c3;');
console.log('%cCloud Project Storage Manager — Ready!', 'color:#a78bfa;');
