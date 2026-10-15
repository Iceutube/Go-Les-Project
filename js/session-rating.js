// Rating sesi les privat oleh siswa setelah sesi selesai.
// Sesi dianggap selesai jika status 'completed' (PIN kehadiran diverifikasi),
// atau status 'confirmed' dan jam sesinya sudah lewat.
// Butuh kolom session_rating, session_review, rated_at di tabel bookings (lihat supabase-session-rating.sql).
// Memakai escapeHtml() dan refreshTutorRating() dari js/video-subscription.js.

const DEFAULT_SESSION_MINUTES = 60;
let sessionRatingTarget = null;

// booking_date "YYYY-MM-DD" + booking_time "08:00 - 09:00" -> Date jam selesai (waktu lokal).
// Jika jam selesai tidak ada, dianggap 60 menit setelah jam mulai.
function getSessionEndTime(booking) {
    if (!booking || !booking.booking_date || !booking.booking_time) return null;
    const times = String(booking.booking_time).match(/\d{1,2}:\d{2}/g);
    if (!times) return null;
    const [year, month, day] = booking.booking_date.split('-').map(Number);
    if (!year || !month || !day) return null;

    const toDate = hhmm => {
        const [h, m] = hhmm.split(':').map(Number);
        return new Date(year, month - 1, day, h, m);
    };
    if (times.length >= 2) return toDate(times[1]);
    return new Date(toDate(times[0]).getTime() + DEFAULT_SESSION_MINUTES * 60 * 1000);
}

function isSessionFinished(booking) {
    if (!booking) return false;
    if (booking.status === 'completed') return true;
    if (booking.status !== 'confirmed') return false;
    const end = getSessionEndTime(booking);
    return !!end && new Date() >= end;
}

function canRateSession(booking) {
    return isSessionFinished(booking) && !booking.session_rating;
}

function renderStarDisplay(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fa-solid fa-star ${i <= rating ? 'text-amber-400' : 'text-slate-200'}"></i>`;
    }
    return stars;
}

// Cari sesi les yang sudah selesai tapi belum dirating siswa (data terbaru dari database).
// Return null juga kalau kolom session_rating belum dibuat, supaya booking tidak terblokir.
async function findUnratedCompletedSession() {
    if (typeof currentStudent === 'undefined' || !currentStudent) return null;
    const sb = await getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('bookings')
        .select('*, tutors(name, subject, phone_number, location)')
        .eq('student_id', currentStudent.id)
        .in('status', ['confirmed', 'completed'])
        .is('session_rating', null)
        .order('booking_date', { ascending: true });

    if (error) {
        console.warn('Cek rating sesi dilewati:', error.message);
        return null;
    }
    return (data || []).find(canRateSession) || null;
}

// Dipanggil sebelum memesan sesi baru. Return true kalau siswa boleh memesan.
async function ensureSessionsRatedBeforeBooking() {
    const unrated = await findUnratedCompletedSession();
    if (!unrated) return true;

    // Pastikan sesi ini ada di cache supaya modal rating bisa dibuka
    if (typeof studentBookingsCache !== 'undefined' && !studentBookingsCache.some(b => b.id === unrated.id)) {
        studentBookingsCache.push(unrated);
    }
    const tutorName = unrated.tutors ? unrated.tutors.name : 'tutor sebelumnya';
    alert(`Beri rating dulu untuk sesi les bersama ${tutorName} (${unrated.booking_date}) sebelum memesan sesi baru.`);
    openSessionRatingModal(unrated.id);
    return false;
}

function openSessionRatingModal(bookingId) {
    const booking = (typeof studentBookingsCache !== 'undefined' ? studentBookingsCache : []).find(b => b.id === bookingId);
    if (!booking) return;
    if (booking.session_rating) {
        alert('Kamu sudah memberi rating untuk sesi ini.');
        return;
    }
    if (!isSessionFinished(booking)) {
        alert('Rating bisa diberikan setelah jam sesi les selesai.');
        return;
    }

    sessionRatingTarget = booking;
    const tutorName = booking.tutors ? booking.tutors.name : 'Tutor GO-LES';
    document.getElementById('session-rating-tutor').innerText = tutorName;
    document.getElementById('session-rating-date').innerText = `${booking.booking_date || '-'} · ${booking.booking_time || '-'}`;
    document.getElementById('session-rating-form').reset();
    document.getElementById('session-rating-modal').classList.remove('hidden');
}

function closeSessionRatingModal() {
    document.getElementById('session-rating-modal').classList.add('hidden');
    sessionRatingTarget = null;
}

async function submitSessionRating(e) {
    e.preventDefault();
    if (!sessionRatingTarget) return;

    const ratingInput = document.querySelector('input[name="session-rating"]:checked');
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const review = document.getElementById('session-rating-comment').value.trim();
    if (!rating) {
        alert('Pilih bintang penilaian dulu ya.');
        return;
    }

    const booking = sessionRatingTarget;
    if (!isSessionFinished(booking)) {
        alert('Rating bisa diberikan setelah jam sesi les selesai.');
        return;
    }

    const btn = document.getElementById('btn-submit-session-rating');
    btn.disabled = true;
    btn.innerText = 'Mengirim...';

    try {
        const sb = await getSupabase();
        if (!sb) {
            alert('Gagal terhubung ke server. Coba lagi.');
            return;
        }

        const now = new Date().toISOString();
        const updates = {
            session_rating: rating,
            session_review: review || null,
            rated_at: now
        };
        // Sesi yang jamnya sudah lewat tapi belum diverifikasi PIN ikut ditandai selesai
        if (booking.status === 'confirmed') {
            updates.status = 'completed';
            updates.completed_at = now;
        }

        // Filter session_rating null supaya rating tidak bisa ditimpa
        const { data, error } = await sb
            .from('bookings')
            .update(updates)
            .eq('id', booking.id)
            .in('status', ['confirmed', 'completed'])
            .is('session_rating', null)
            .select('id');

        if (error) {
            alert('Gagal mengirim rating: ' + error.message);
            return;
        }
        if (!data || data.length === 0) {
            alert('Rating untuk sesi ini sudah pernah dikirim.');
        } else {
            await refreshTutorRating(sb, booking.tutor_id);
            alert('Terima kasih! Rating sesi les kamu sudah terkirim.');
        }

        closeSessionRatingModal();
        if (typeof currentStudent !== 'undefined' && currentStudent) {
            await loadStudentBookings(currentStudent.id);
        }
    } catch (err) {
        console.error('Error kirim rating sesi:', err);
        alert('Terjadi kesalahan saat mengirim rating: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.innerText = 'Kirim Rating';
    }
}
