# GO-LES

Platform les privat yang mempertemukan **siswa** dengan **tutor**, dikelola oleh **admin**.
Siswa bisa mencari tutor, memesan sesi les (online/offline), chat dengan tutor, berlangganan video mengajar, dan memberi rating. Tutor mengelola jadwal, kehadiran, video, dan penarikan saldo. Admin memverifikasi tutor, pembayaran, dan penarikan.

## Teknologi

- **Frontend:** HTML statis + JavaScript biasa (tanpa build step), Tailwind CSS & Font Awesome via CDN
- **Backend/Database:** [Supabase](https://supabase.com) (Auth, Postgres, Realtime), dipanggil langsung dari browser dengan `@supabase/supabase-js@2` via CDN
- **Serverless:** `api/config.js` (Vercel Function) — membagikan `SUPABASE_URL` & `SUPABASE_KEY` dari environment variable ke frontend

## Struktur Folder

```
api/
  config.js        GET /api/config → { supabaseUrl, supabaseKey } dari env
  tutors.js        GET /api/tutors → daftar tutor approved (belum dipakai frontend)
js/
  config.js        Inisialisasi client Supabase (getSupabase(), _supabase)
  supabase.js      Memicu inisialisasi
  app.js           Logika halaman publik / katalog
  offline-mode.js  Modal pemesanan sesi (online/offline, upload bukti bayar)
  attendance.js    Pembuatan & verifikasi PIN kehadiran
  session-rating.js  Rating sesi les oleh siswa
  video-subscription.js  Langganan video, ulasan video, kelola video tutor
index.html             Landing page + katalog tutor publik
login.html             Login semua peran (diarahkan sesuai role)
register-siswa.html    Pendaftaran siswa
register-tutor.html    Pendaftaran tutor
dashboard-siswa.html   Katalog, jadwal, video, chat (siswa)
dashboard-tutor.html   Jadwal, saldo, pengaturan, video, chat (tutor)
dashboard-admin.html   Verifikasi tutor, pemesanan, penarikan
kehadiran-siswa.html   Siswa memasukkan PIN kehadiran
kehadiran-tutor.html   Tutor membuat PIN kehadiran
riwayat-siswa.html     Riwayat sesi siswa
supabase-*.sql         Migrasi SQL tambahan (dijalankan manual)
```

## Tabel Supabase

| Tabel | Isi |
| `tutors` | Profil **semua pengguna** — kolom `role` berisi `admin`, `tutor`, atau `siswa`; `user_id` mengacu ke `auth.users` |
| `bookings` | Pemesanan sesi les (jadwal, mode, bukti bayar, status, PIN kehadiran, rating sesi) |
| `messages` | Chat antar pengguna (`sender_id`, `receiver_id`, `message`) |
| `withdrawals` | Permintaan penarikan saldo tutor |
| `tutor_videos` | Video mengajar milik tutor |
| `video_subscriptions` | Langganan video siswa ke tutor (berlaku per bulan) |
| `video_reviews` | Ulasan video dari siswa yang berlangganan |

Realtime harus aktif untuk tabel `messages` agar chat langsung muncul tanpa refresh.

## Alur Aplikasi

### 1. Pendaftaran & Login
- **Siswa** daftar di `register-siswa.html` → akun Supabase Auth + baris di `tutors` dengan `role = 'siswa'`, `status = 'approved'`.
- **Tutor** daftar di `register-tutor.html` → baris di `tutors` dengan `role = 'tutor'` dan menunggu verifikasi admin.
- **Admin** tidak punya halaman daftar; buat akun Auth lalu set `role = 'admin'` pada barisnya di tabel `tutors`.
- `login.html` mencari profil di `tutors` (berdasarkan `user_id` atau email) lalu mengarahkan ke dashboard sesuai `role`.

### 2. Verifikasi Tutor (Admin)
Admin meninjau tutor baru di `dashboard-admin.html` dan mengubah `status` menjadi `approved` / `rejected`. Admin juga bisa memberi **verifikasi offline** (`is_offline_verified`) — hanya tutor terverifikasi offline yang bisa dipesan untuk sesi tatap muka. Hanya tutor `approved` yang tampil di katalog.

### 3. Pemesanan Sesi (Siswa)
1. Siswa memilih tutor di katalog → **Pesan Sesi**.
2. Isi tanggal, jam, mode (online / offline di rumah siswa / di rumah tutor), lalu upload **foto bukti bayar**.
3. Booking tersimpan dengan `status = 'pending'`, dan pesan otomatis terkirim ke tutor lewat chat.
4. Siswa wajib memberi rating untuk sesi yang sudah selesai sebelum bisa memesan lagi.

### 4. Verifikasi Pembayaran (Admin)
Admin melihat bukti bayar dan mengonfirmasi booking (`status = 'confirmed'`). Booking yang masih `pending` lebih dari **10 menit** otomatis dikonfirmasi saat dashboard admin dibuka.

### 5. Chat
Siswa dan tutor bisa saling mengirim pesan lewat tombol chat melayang di dashboard. Siswa memulai chat dari tombol **Chat Tutor** di kartu katalog atau **Chat dengan Tutor** di kartu jadwal.

### 6. Kehadiran dengan PIN
1. Mulai **15 menit sebelum sesi**, tutor membuat PIN (format `GL-XXXX`) di `kehadiran-tutor.html`.
2. Tutor memberikan PIN ke siswa saat sesi berlangsung.
3. Siswa memasukkan PIN di `kehadiran-siswa.html` → booking menjadi `status = 'completed'`.

Sesi juga dianggap selesai jika sudah `confirmed` dan jam sesinya sudah lewat.

### 7. Rating
- Setelah sesi selesai, siswa memberi rating 1–5 + ulasan (`session_rating`, `session_review`).
- Siswa yang berlangganan video juga bisa memberi ulasan video.
- Trigger database menghitung ulang `rating` dan `total_reviews` tutor. Tutor dengan ≥ 5 ulasan video dan rata-rata ≥ 4.0 ditandai `offline_eligible`.

### 8. Video Mengajar
Tutor mengunggah link video dan menentukan harga langganan bulanan. Siswa berlangganan lewat pembayaran (simulasi/dummy) untuk membuka daftar video tutor tersebut selama 30 hari.

### 9. Saldo & Penarikan (Tutor)
Saldo tutor = jumlah booking `confirmed`/`completed` × tarif per jam, dikurangi penarikan yang `pending`/`approved`. Tutor mengajukan penarikan, lalu admin menyetujui atau menolaknya.

## Cara Menjalankan
### 1. Siapkan Supabase
1. Buat tabel-tabel di atas di proyek Supabase kamu.
2. Jalankan migrasi tambahan di **Supabase → SQL Editor**, berurutan:
   1. `supabase-session-rating.sql`
   2. `supabase-tutor-rating-trigger.sql`
3. Aktifkan Realtime untuk tabel `messages` (**Database → Replication**).

### 2. Atur Environment Variable
Buat file `.env` di root proyek
### 3. Jalankan Lokal

```bash
vercel dev
```

Buka `http://localhost:3000`. (Pertama kali, Vercel CLI akan meminta login dan menautkan proyek.)

### 4. Deploy

```bash
vercel --prod
```

Lalu isi `SUPABASE_URL` dan `SUPABASE_KEY` di **Vercel → Project → Settings → Environment Variables**.

## Akun Uji Coba

| Peran | Email | Password |
| Admin | admin@goles.com | 123 |
| Tutor | el@gmail.com | 123 |
| Siswa | siswa@goles.com | 123 |
