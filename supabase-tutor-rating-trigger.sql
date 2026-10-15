-- Jalankan sekali di Supabase > SQL Editor (setelah supabase-session-rating.sql).
-- Menghitung ulang rating & jumlah ulasan tutor otomatis di database setiap kali
-- siswa memberi rating sesi les atau ulasan video. Berjalan sebagai "security definer",
-- jadi tidak terhalang RLS walaupun yang memberi rating adalah akun siswa.

-- 1. Pastikan kolom ringkasan rating ada di tabel tutors
alter table public.tutors
    add column if not exists rating numeric(2,1) default 0,
    add column if not exists total_reviews integer default 0,
    add column if not exists offline_eligible boolean default false;

-- 2. Fungsi hitung ulang untuk satu tutor
create or replace function public.recalc_tutor_rating(p_tutor_id public.tutors.id%type)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_video_count  integer;
    v_video_avg    numeric;
    v_session_count integer;
    v_session_sum  numeric;
    v_video_sum    numeric;
    v_total        integer;
begin
    select count(*), coalesce(sum(rating), 0), coalesce(avg(rating), 0)
      into v_video_count, v_video_sum, v_video_avg
      from video_reviews
     where tutor_id = p_tutor_id;

    select count(*), coalesce(sum(session_rating), 0)
      into v_session_count, v_session_sum
      from bookings
     where tutor_id = p_tutor_id
       and session_rating is not null;

    v_total := v_video_count + v_session_count;

    update tutors
       set total_reviews = v_total,
           rating = case when v_total > 0
                         then round((v_video_sum + v_session_sum) / v_total, 1)
                         else 0 end,
           -- Syarat offline tetap dari ulasan video: minimal 5 ulasan, rata-rata >= 4.0
           offline_eligible = (v_video_count >= 5 and v_video_avg >= 4.0)
     where id = p_tutor_id;
end;
$$;

-- 3. Trigger: rating sesi les di tabel bookings
create or replace function public.trg_bookings_recalc_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'DELETE' then
        perform recalc_tutor_rating(old.tutor_id);
        return old;
    end if;
    perform recalc_tutor_rating(new.tutor_id);
    if tg_op = 'UPDATE' and old.tutor_id is distinct from new.tutor_id then
        perform recalc_tutor_rating(old.tutor_id);
    end if;
    return new;
end;
$$;

drop trigger if exists bookings_recalc_rating on public.bookings;
create trigger bookings_recalc_rating
    after insert or delete or update of session_rating, tutor_id on public.bookings
    for each row execute function public.trg_bookings_recalc_rating();

-- 4. Trigger: ulasan video di tabel video_reviews
drop trigger if exists video_reviews_recalc_rating on public.video_reviews;
create trigger video_reviews_recalc_rating
    after insert or delete or update of rating, tutor_id on public.video_reviews
    for each row execute function public.trg_bookings_recalc_rating();

-- 5. Hitung ulang semua tutor sekarang (supaya rating yang sudah masuk langsung tampil)
select public.recalc_tutor_rating(id) from public.tutors where role = 'tutor';
