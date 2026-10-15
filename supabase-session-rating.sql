-- Jalankan sekali di Supabase > SQL Editor.
-- Menambah kolom rating sesi les pada tabel bookings (diisi siswa setelah sesi selesai).
alter table public.bookings
    add column if not exists session_rating smallint check (session_rating between 1 and 5),
    add column if not exists session_review text,
    add column if not exists rated_at timestamptz;
