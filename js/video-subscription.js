// =============================================================================
// GO-LES: Langganan Video Mengajar Bulanan
// -----------------------------------------------------------------------------
// Modul terpisah (tetap di folder js/ yang sama) untuk fitur:
//   - Siswa berlangganan video mengajar seorang tutor per bulan
//   - Harga langganan dibatasi maksimal Rp20.000/bulan (VIDEO_SUB_MAX_PRICE)
//   - Setelah berlangganan, siswa bisa memberi 1 ulasan per periode langganan
//   - Ulasan ini terkumpul jadi salah satu syarat tutor memenuhi kelayakan
//     mengajar offline (offline_eligible), yang jadi rekomendasi buat Admin
//     sebelum menekan tombol "Approve + Offline" di admin.html
// Dipakai oleh: dashboard-siswa.html (berlangganan + ulasan)
//               dashboard-tutor.html (lihat statistik pelanggan & kelayakan)
// =============================================================================

const VIDEO_SUB_MAX_PRICE = 20000;

let videoSubTargetTutor = null;
let activeVideoSubscription = null;

// ---------------------------------------------------------------------------
// SISI SISWA (dashboard-siswa.html)
// ---------------------------------------------------------------------------

function openVideoSubscriptionModal(tutorId) {
    const tutor = rawApprovedTutors.find(t => t.id === tutorId);
    if (!tutor) return;

    videoSubTargetTutor = tutor;
    const price = Math.min(tutor.video_subscription_price || 0, VIDEO_SUB_MAX_PRICE);

    document.getElementById('video-sub-tutor-name').innerText = tutor.name;
    document.getElementById('video-sub-tutor-avatar').src = tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`;
    document.getElementById('video-sub-video-link').href = tutor.teaching_video_url || '#';

    const btnSubscribe = document.getElementById('btn-subscribe-video');
    if (price > 0) {
        btnSubscribe.innerText = `Langganan Sekarang - Rp ${price.toLocaleString('id-ID')}/bulan`;
        btnSubscribe.disabled = false;
    } else {
        btnSubscribe.innerText = 'Tutor belum mengatur harga langganan';
        btnSubscribe.disabled = true;
    }

    document.getElementById('video-sub-review-box').classList.add('hidden');
    document.getElementById('video-sub-subscribe-box').classList.remove('hidden');
    activeVideoSubscription = null;

    checkExistingVideoSubscription(tutor.id);

    document.getElementById('video-sub-modal').classList.remove('hidden');
}

function closeVideoSubscriptionModal() {
    document.getElementById('video-sub-modal').classList.add('hidden');
    videoSubTargetTutor = null;
    activeVideoSubscription = null;
}

async function checkExistingVideoSubscription(tutorId) {
    const { data, error } = await _supabase
        .from('video_subscriptions')
        .select('*')
        .eq('tutor_id', tutorId)
        .eq('student_id', currentStudent.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) return;

    const sub = data[0];
    const isExpired = new Date(sub.expires_at) < new Date();
    if (isExpired) return;

    activeVideoSubscription = sub;

    document.getElementById('video-sub-subscribe-box').classList.add('hidden');
    document.getElementById('video-sub-review-box').classList.remove('hidden');
    document.getElementById('video-sub-expiry-info').innerText =
        `Langganan aktif sampai ${new Date(sub.expires_at).toLocaleDateString('id-ID')}`;

    await checkExistingReview(sub.id);
}

async function subscribeToVideo() {
    if (!videoSubTargetTutor || !currentStudent) return;

    const price = Math.min(videoSubTargetTutor.video_subscription_price || 0, VIDEO_SUB_MAX_PRICE);
    if (price <= 0) {
        alert('Tutor ini belum mengatur harga langganan video mengajar.');
        return;
    }

    const btn = document.getElementById('btn-subscribe-video');
    btn.disabled = true;
    btn.innerText = 'Memproses...';

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + 30); // langganan bulanan = 30 hari

    const { data, error } = await _supabase.from('video_subscriptions').insert([{
        tutor_id: videoSubTargetTutor.id,
        student_id: currentStudent.id,
        price: price,
        status: 'active',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString()
    }]).select();

    if (error) {
        btn.disabled = false;
        btn.innerText = `Langganan Sekarang - Rp ${price.toLocaleString('id-ID')}/bulan`;
        alert('Gagal membuat langganan: ' + error.message);
        return;
    }

    alert('Berlangganan video mengajar berhasil! Setelah menonton, kamu bisa memberi ulasan di modal ini.');
    activeVideoSubscription = data[0];
    await checkExistingVideoSubscription(videoSubTargetTutor.id);
}

async function checkExistingReview(subscriptionId) {
    const { data } = await _supabase
        .from('video_reviews')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .limit(1);

    const formBox = document.getElementById('video-review-form');
    const doneBox = document.getElementById('video-review-done');

    if (data && data.length > 0) {
        formBox.classList.add('hidden');
        doneBox.classList.remove('hidden');
    } else {
        formBox.classList.remove('hidden');
        doneBox.classList.add('hidden');
    }
}

async function submitVideoReview(e) {
    e.preventDefault();
    if (!activeVideoSubscription || !videoSubTargetTutor) return;

    const ratingInput = document.querySelector('input[name="video-review-rating"]:checked');
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const comment = document.getElementById('video-review-comment').value.trim();

    if (!rating) {
        alert('Pilih bintang penilaian dulu ya.');
        return;
    }

    const btn = document.getElementById('btn-submit-video-review');
    btn.disabled = true;
    btn.innerText = 'Mengirim...';

    const { error } = await _supabase.from('video_reviews').insert([{
        subscription_id: activeVideoSubscription.id,
        tutor_id: videoSubTargetTutor.id,
        student_id: currentStudent.id,
        rating: rating,
        comment: comment
    }]);

    btn.disabled = false;
    btn.innerText = 'Kirim Ulasan';

    if (error) {
        alert('Gagal mengirim ulasan: ' + error.message);
        return;
    }

    alert('Terima kasih! Ulasanmu membantu tutor ini memenuhi syarat mengajar offline.');
    // Trigger Postgres di file SQL migrasi otomatis update rating & offline_eligible tutor.
    await checkExistingReview(activeVideoSubscription.id);
}

// ---------------------------------------------------------------------------
// SISI TUTOR (dashboard-tutor.html) - ringkasan pelanggan & kelayakan offline
// ---------------------------------------------------------------------------

async function loadVideoSubscriptionStats(tutorId) {
    const statBox = document.getElementById('video-stats-box');
    if (!statBox) return; // elemen ini hanya ada di dashboard-tutor.html

    const { count: subscriberCount } = await _supabase
        .from('video_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', tutorId)
        .eq('status', 'active');

    const { data: reviews } = await _supabase
        .from('video_reviews')
        .select('rating')
        .eq('tutor_id', tutorId);

    const totalReviews = reviews ? reviews.length : 0;
    const avgRating = totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : '-';

    document.getElementById('stat-video-subscribers').innerText = subscriberCount || 0;
    document.getElementById('stat-video-reviews').innerText = totalReviews;
    document.getElementById('stat-video-rating').innerText = avgRating;

    const eligibleBadge = document.getElementById('offline-eligible-badge');
    if (currentTutorProfile && currentTutorProfile.offline_eligible) {
        eligibleBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Memenuhi syarat diajukan offline`;
        eligibleBadge.className = 'inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-3 py-1.5 rounded-full';
    } else {
        eligibleBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Kumpulkan minimal 5 ulasan (rating rata-rata ≥ 4.0) untuk memenuhi syarat offline`;
        eligibleBadge.className = 'inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full';
    }
}
