# ☁️ CloudVault — Cloud Project Storage Manager

> Website penyimpanan project berbasis cloud modern — Tanpa PHP, tanpa MySQL.
> Dibangun dengan HTML5, CSS3, Vanilla JS, dan Firebase.

---

## 🚀 Fitur Lengkap

| Fitur | Status |
|---|---|
| Login Google & GitHub | ✅ Firebase Auth |
| Upload File (drag & drop) | ✅ Firebase Storage |
| Simpan & Sinkron Realtime | ✅ Firestore |
| Dashboard + Chart Statistik | ✅ Chart.js |
| Dark / Light Mode | ✅ |
| Search Realtime | ✅ |
| Favorit & Trash System | ✅ |
| Responsive (mobile + desktop) | ✅ |
| Animasi Premium (AOS + GSAP) | ✅ |
| Export / Import Backup JSON | ✅ |
| Syntax Highlight | ✅ Highlight.js |
| Background Particles | ✅ Canvas |

---

## 📁 Struktur File

```
cloud-storage/
├── index.html          ← Halaman utama (semua UI)
├── style.css           ← Semua styling (dark neon glassmorphism)
├── script.js           ← Logika utama + Firebase
├── firebase-config.js  ← Template konfigurasi (tidak wajib, sudah inline)
└── README.md           ← Panduan ini
```

---

## ⚙️ Setup Firebase (WAJIB)

### Langkah 1 — Buat Firebase Project
1. Buka https://console.firebase.google.com
2. Klik **"Add Project"**
3. Beri nama project (misal: `cloudvault-app`)
4. Klik **Continue** → **Create Project**

### Langkah 2 — Aktifkan Authentication
1. Di Firebase Console, klik **Authentication** → **Get Started**
2. Tab **Sign-in method** → aktifkan:
   - **Google** → Enable → Save
   - **GitHub** → Enable → isi Client ID & Secret dari GitHub OAuth App → Save
   
> **Buat GitHub OAuth App:**
> - Buka https://github.com/settings/developers
> - New OAuth App
> - Homepage URL: `http://localhost` (atau domain kamu)
> - Authorization callback URL: salin dari Firebase Console

### Langkah 3 — Aktifkan Firestore
1. Klik **Firestore Database** → **Create Database**
2. Pilih **Start in test mode** (untuk development)
3. Pilih region terdekat → **Done**

### Langkah 4 — Aktifkan Storage
1. Klik **Storage** → **Get Started**
2. Pilih **Start in test mode**
3. Klik **Done**

### Langkah 5 — Salin Config
1. Di Firebase Console → ⚙️ Project Settings → **Your apps**
2. Klik ikon Web `</>`
3. Register app → salin `firebaseConfig`

### Langkah 6 — Paste Config ke script.js
Buka `script.js`, ganti bagian ini (baris pertama):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",               // ← ganti
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 🔐 Firestore Security Rules (Produksi)

Setelah testing, ganti rules di Firestore Console → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      // Hanya pemilik yang bisa baca/tulis
      allow read, write: if request.auth != null && 
                            request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 🌐 Firebase Storage Rules (Produksi)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId;
    }
  }
}
```

---

## 🔖 Firestore Index

Agar sorting berjalan mulus, buat Composite Index di Firestore:

- Collection: `projects`
- Fields: `ownerId` (Ascending) + `createdAt` (Descending)

Atau klik link error di browser console — Firebase otomatis mengarahkan.

---

## 🚀 Deploy

### Option A — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option B — Vercel
```bash
npm install -g vercel
vercel
```

### Option C — Netlify
Drag & drop folder ke https://netlify.com/drop

---

## 📦 CDN yang Digunakan

| Library | Versi | Fungsi |
|---|---|---|
| Firebase SDK | 10.7.1 | Auth, Firestore, Storage |
| Font Awesome | 6.5.0 | Icons |
| GSAP | 3.12.4 | Animasi premium |
| AOS | 2.3.4 | Scroll animation |
| Chart.js | 4.4.1 | Grafik statistik |
| Highlight.js | 11.9.0 | Syntax highlighting |
| Google Fonts | — | Syne + DM Mono + Inter |

---

## 💡 Tips Pengembangan

1. **Aktifkan Firebase Emulator** untuk testing lokal tanpa koneksi internet
2. **Gunakan Firebase App Check** untuk production security
3. **Batasi Storage** di Firebase Console agar tidak overquota
4. **Tambah field `tags`** di Firestore untuk fitur tag project

---

## 🐛 Troubleshooting

| Problem | Solusi |
|---|---|
| Login popup blocked | Allow popup di browser settings |
| "Missing or insufficient permissions" | Cek Firestore Rules, pastikan test mode |
| Upload gagal | Cek Storage Rules & bucket name |
| Data tidak sync | Pastikan Firestore index sudah dibuat |
| GitHub login error | Cek callback URL di GitHub OAuth App |

---

## 👨‍💻 Dibuat untuk Mahasiswa Developer

Kode ini ditulis dengan banyak komentar agar mudah dipahami dan dikembangkan.
Cocok untuk tugas akhir, portofolio, atau project freelance.

**Stack:** HTML5 · CSS3 · Vanilla JavaScript · Firebase v10

---

*CloudVault © 2026 — Developer Workspace Modern*
