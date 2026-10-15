const VIDEO_SUB_MAX_PRICE = 20000;
const OFFLINE_ELIGIBLE_MIN_REVIEWS = 5;
const OFFLINE_ELIGIBLE_MIN_RATING = 4.0;
let videoSubTargetTutor = null;
let activeVideoSubscription = null;
let selectedPayMethod = 'qris';

// --- HELPER ---

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isSafeUrl(url) {
    return /^https?:\/\//i.test(url || '');
}

function getVideoSubPrice(tutor) {
    return Math.min(Math.max(parseInt(tutor?.video_subscription_price) || 0, 0), VIDEO_SUB_MAX_PRICE);
}

async function getActiveSubscription(sb, tutorId, studentId) {
    const { data, error } = await sb
        .from('video_subscriptions')
        .select('*')
        .eq('tutor_id', tutorId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
}

// --- MODAL & FLOW LANGGANAN SISWA ---

function openVideoSubscriptionModal(tutorId) {
    const tutor = rawApprovedTutors.find(t => t.id === tutorId);
    if (!tutor) return;
    videoSubTargetTutor = tutor;
    const price = getVideoSubPrice(tutor);
    document.getElementById('video-sub-tutor-name').innerText = tutor.name;
    document.getElementById('video-sub-tutor-subject').innerText = `${tutor.subject || '-'} (${tutor.level || 'Umum'})`;
    document.getElementById('video-sub-tutor-avatar').src = tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`;

    const introLink = document.getElementById('video-sub-intro-link');
    if (isSafeUrl(tutor.teaching_video_url)) {
        introLink.href = tutor.teaching_video_url;
        introLink.classList.remove('hidden');
    } else {
        introLink.classList.add('hidden');
    }
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
    renderLockedVideoNotice();
    checkExistingVideoSubscription(tutor.id);
    document.getElementById('video-sub-modal').classList.remove('hidden');
}

function closeVideoSubscriptionModal() {
    document.getElementById('video-sub-modal').classList.add('hidden');
    videoSubTargetTutor = null;
    activeVideoSubscription = null;
}

async function checkExistingVideoSubscription(tutorId) {
    if (typeof currentStudent === 'undefined' || !currentStudent) return;
    const sb = await getSupabase();
    if (!sb) return;

    let sub = null;
    try {
        sub = await getActiveSubscription(sb, tutorId, currentStudent.id);
    } catch (err) {
        console.error('Gagal cek langganan video:', err);
        return;
    }
    // Modal bisa sudah ditutup / ganti tutor selama query berjalan
    if (!sub || !videoSubTargetTutor || videoSubTargetTutor.id !== tutorId) return;

    activeVideoSubscription = sub;
    document.getElementById('video-sub-subscribe-box').classList.add('hidden');
    document.getElementById('video-sub-review-box').classList.remove('hidden');
    document.getElementById('video-sub-expiry-info').innerText =
        `Langganan aktif sampai ${new Date(sub.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    await renderGatedVideoList(tutorId);
    await checkExistingReview(sub.id);
}

function renderLockedVideoNotice() {
    const box = document.getElementById('video-sub-gated-list');
    box.innerHTML = `
        <div class="text-center text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl py-6">
            <i class="fa-solid fa-lock text-lg mb-1 block"></i>
            Berlangganan dulu untuk membuka semua video mengajar tutor ini.
        </div>
    `;
}

async function renderGatedVideoList(tutorId) {
    const box = document.getElementById('video-sub-gated-list');
    box.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4">Memuat video...</p>`;
    const sb = await getSupabase();
    if (!sb) return;

    const { data: videos, error } = await sb
        .from('tutor_videos')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });

    const playable = (videos || []).filter(v => isSafeUrl(v.video_url));
    if (error || playable.length === 0) {
        box.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4">Tutor ini belum menambahkan video mengajar.</p>`;
        return;
    }
    box.innerHTML = playable.map(v => `
        <a href="${escapeHtml(v.video_url)}" target="_blank" rel="noopener" class="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 hover:bg-emerald-100 transition">
            <div class="w-9 h-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-play text-xs"></i>
            </div>
            <span class="text-xs font-bold text-emerald-800 flex-1">${escapeHtml(v.title)}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-emerald-400 text-[10px]"></i>
        </a>
    `).join('');
}

// --- DAFTAR LANGGANAN SISWA (TAB "VIDEO LANGGANAN") ---

async function loadMyVideoSubscriptions() {
    const list = document.getElementById('my-video-subs-list');
    if (!list || typeof currentStudent === 'undefined' || !currentStudent) return;
    const sb = await getSupabase();
    if (!sb) return;

    const { data: subs, error } = await sb
        .from('video_subscriptions')
        .select('*')
        .eq('student_id', currentStudent.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

    if (error) {
        list.innerHTML = `<p class="text-center text-xs text-rose-500 py-6">Gagal memuat langganan video.</p>`;
        return;
    }
    if (!subs || subs.length === 0) {
        list.innerHTML = `
            <div class="text-center text-xs text-slate-400 py-8 space-y-1">
                <i class="fa-solid fa-film text-2xl block mb-2 text-slate-300"></i>
                <p>Kamu belum berlangganan video mengajar.</p>
                <p>Buka tab <b>Cari Tutor & Katalog</b> lalu klik tombol <b>Video</b> di kartu tutor.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = subs.map(sub => {
        const tutor = rawApprovedTutors.find(t => t.id === sub.tutor_id);
        const name = tutor ? tutor.name : 'Tutor GO-LES';
        const avatar = tutor && tutor.avatar ? tutor.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
        const expiry = new Date(sub.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const openBtn = tutor
            ? `<button onclick="openVideoSubscriptionModal(${sub.tutor_id})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm whitespace-nowrap"><i class="fa-solid fa-play"></i> Buka Video</button>`
            : `<span class="text-[10px] text-slate-400">Tutor tidak aktif</span>`;
        return `
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <img src="${escapeHtml(avatar)}" class="w-11 h-11 rounded-xl object-cover border border-slate-200">
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 text-sm truncate">${escapeHtml(name)}</h4>
                    <p class="text-[11px] text-slate-500">${tutor ? escapeHtml(tutor.subject || '-') : ''} · Aktif sampai <b>${expiry}</b></p>
                </div>
                ${openBtn}
            </div>
        `;
    }).join('');
}

// --- LOGIKA SIMULATOR PEMBAYARAN LANGGANAN ---

function subscribeToVideo() {
    if (!videoSubTargetTutor || typeof currentStudent === 'undefined' || !currentStudent) {
        alert('Silakan login terlebih dahulu sebagai Siswa.');
        return;
    }

    const price = getVideoSubPrice(videoSubTargetTutor);
    if (price <= 0) {
        alert('Tutor ini belum mengatur harga langganan video mengajar.');
        return;
    }

    document.getElementById('pay-tutor-name').innerText = `Tutor: ${videoSubTargetTutor.name}`;
    document.getElementById('pay-amount-display').innerText = `Rp ${price.toLocaleString('id-ID')}`;

    switchPayMethod('qris');
    document.getElementById('video-payment-modal').classList.remove('hidden');
}

function closeVideoPaymentModal() {
    document.getElementById('video-payment-modal').classList.add('hidden');
}

function switchPayMethod(method) {
    selectedPayMethod = method;
    const btnQris = document.getElementById('pay-method-qris');
    const btnTf = document.getElementById('pay-method-tf');
    const boxQris = document.getElementById('pay-box-qris');
    const boxTf = document.getElementById('pay-box-tf');

    if (method === 'qris') {
        btnQris.className = "border-2 border-indigo-600 bg-indigo-50 text-indigo-700 p-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition";
        btnTf.className = "border-2 border-slate-200 text-slate-600 p-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition";
        boxQris.classList.remove('hidden');
        boxTf.classList.add('hidden');
    } else {
        btnTf.className = "border-2 border-indigo-600 bg-indigo-50 text-indigo-700 p-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition";
        btnQris.className = "border-2 border-slate-200 text-slate-600 p-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition";
        boxTf.classList.remove('hidden');
        boxQris.classList.add('hidden');
    }
}

async function processDummyPayment() {
    if (!videoSubTargetTutor || typeof currentStudent === 'undefined' || !currentStudent) {
        alert('Sesi langganan tidak valid. Tutup lalu buka kembali halaman tutor.');
        closeVideoPaymentModal();
        return;
    }

    const btn = document.getElementById('btn-confirm-video-pay');
    btn.disabled = true;
    btn.innerText = 'Memproses Pembayaran...';

    const tutor = videoSubTargetTutor;

    try {
        const sb = await getSupabase();
        if (!sb) {
            alert('Gagal terhubung ke server. Coba lagi.');
            return;
        }

        // Cegah langganan dobel ke tutor yang sama
        const existing = await getActiveSubscription(sb, tutor.id, currentStudent.id);
        if (existing) {
            closeVideoPaymentModal();
            alert('Kamu sudah berlangganan video tutor ini.');
            await checkExistingVideoSubscription(tutor.id);
            return;
        }

        const price = getVideoSubPrice(tutor);
        const startedAt = new Date();
        const expiresAt = new Date(startedAt);
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data, error } = await sb.from('video_subscriptions').insert([{
            tutor_id: tutor.id,
            student_id: currentStudent.id,
            price: price,
            status: 'active',
            started_at: startedAt.toISOString(),
            expires_at: expiresAt.toISOString()
        }]).select();

        if (error) {
            alert('Gagal memproses pembayaran: ' + error.message);
            return;
        }

        closeVideoPaymentModal();
        alert(`Pembayaran via ${selectedPayMethod === 'qris' ? 'QRIS' : 'Transfer Bank'} berhasil! Akses video mengajar dan ulasan telah diaktifkan.`);

        activeVideoSubscription = data && data[0] ? data[0] : null;
        await checkExistingVideoSubscription(tutor.id);
        await loadMyVideoSubscriptions();
    } catch (err) {
        console.error('Error pembayaran langganan:', err);
        alert('Terjadi kesalahan saat memproses pembayaran: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Bayar & Aktifkan Langganan`;
    }
}

// --- ULASAN & RATING VIDEO ---

async function checkExistingReview(subscriptionId) {
    const sb = await getSupabase();
    if (!sb) return;

    const { data } = await sb
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
        formBox.reset();
        formBox.classList.remove('hidden');
        doneBox.classList.add('hidden');
    }
}

// Hitung ulang rating tutor dari ulasan video + rating sesi les, supaya kartu tutor
// ikut berubah. Syarat verifikasi offline tetap dihitung dari ulasan video saja.
async function refreshTutorRating(sb, tutorId) {
    const { data: videoReviews, error } = await sb
        .from('video_reviews')
        .select('rating')
        .eq('tutor_id', tutorId);
    if (error || !videoReviews) return;

    // Kalau kolom session_rating belum ada, anggap belum ada rating sesi
    const { data: sessionRatings } = await sb
        .from('bookings')
        .select('session_rating')
        .eq('tutor_id', tutorId)
        .not('session_rating', 'is', null);

    const avg = list => list.length > 0
        ? Math.round((list.reduce((sum, r) => sum + r, 0) / list.length) * 10) / 10
        : 0;

    const videoValues = videoReviews.map(r => r.rating);
    const allValues = videoValues.concat((sessionRatings || []).map(b => b.session_rating));
    const totalReviews = allValues.length;
    const avgRating = avg(allValues);
    const avgVideoRating = avg(videoValues);

    const { error: updateError } = await sb
        .from('tutors')
        .update({
            rating: avgRating,
            total_reviews: totalReviews,
            offline_eligible: videoValues.length >= OFFLINE_ELIGIBLE_MIN_REVIEWS && avgVideoRating >= OFFLINE_ELIGIBLE_MIN_RATING
        })
        .eq('id', tutorId);

    if (updateError) {
        console.warn('Gagal memperbarui rating tutor:', updateError.message);
        return;
    }

    const cached = typeof rawApprovedTutors !== 'undefined' ? rawApprovedTutors.find(t => t.id === tutorId) : null;
    if (cached) {
        cached.rating = avgRating;
        cached.total_reviews = totalReviews;
        if (typeof filterTutors === 'function') filterTutors();
    }
}

async function submitVideoReview(e) {
    e.preventDefault();
    if (!activeVideoSubscription || !videoSubTargetTutor || typeof currentStudent === 'undefined' || !currentStudent) return;

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

    const sub = activeVideoSubscription;
    const tutorId = videoSubTargetTutor.id;

    try {
        const sb = await getSupabase();
        if (!sb) {
            alert('Gagal terhubung ke server. Coba lagi.');
            return;
        }

        const { error } = await sb.from('video_reviews').insert([{
            subscription_id: sub.id,
            tutor_id: tutorId,
            student_id: currentStudent.id,
            rating: rating,
            comment: comment
        }]);

        if (error) {
            alert('Gagal mengirim ulasan: ' + error.message);
            return;
        }

        await refreshTutorRating(sb, tutorId);
        alert('Terima kasih! Ulasanmu membantu tutor ini memenuhi syarat mengajar offline.');
        await checkExistingReview(sub.id);
    } catch (err) {
        console.error('Error kirim ulasan:', err);
        alert('Terjadi kesalahan saat mengirim ulasan: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.innerText = 'Kirim Ulasan';
    }
}

// --- FUNGSI PORTAL TUTOR (HARGA, TAMBAH, HAPUS, STATISTIK VIDEO) ---

async function saveVideoSubscriptionPrice(e) {
    e.preventDefault();
    if (typeof currentTutorProfile === 'undefined' || !currentTutorProfile) return;

    const input = document.getElementById('video-price-input');
    const raw = parseInt(input.value) || 0;
    if (raw < 0 || raw > VIDEO_SUB_MAX_PRICE) {
        alert(`Harga langganan harus antara Rp0 dan Rp${VIDEO_SUB_MAX_PRICE.toLocaleString('id-ID')}.`);
        return;
    }

    const btn = document.getElementById('btn-save-video-price');
    btn.disabled = true;
    btn.innerText = 'Menyimpan...';

    try {
        const sb = await getSupabase();
        if (!sb) {
            alert('Gagal terhubung ke server. Coba lagi.');
            return;
        }

        const { error } = await sb
            .from('tutors')
            .update({ video_subscription_price: raw })
            .eq('id', currentTutorProfile.id);

        if (error) {
            alert('Gagal menyimpan harga: ' + error.message);
            return;
        }

        currentTutorProfile.video_subscription_price = raw;
        alert(raw > 0
            ? `Harga langganan disimpan: Rp${raw.toLocaleString('id-ID')}/bulan.`
            : 'Harga langganan diset Rp0 — siswa belum bisa berlangganan video kamu.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Simpan Harga';
    }
}

async function loadTutorVideoList(tutorId) {
    const list = document.getElementById('tutor-video-list');
    if (!list) return;
    const sb = await getSupabase();
    if (!sb) return;

    const { data: videos, error } = await sb
        .from('tutor_videos')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });

    if (error || !videos || videos.length === 0) {
        list.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4">Belum ada video. Tambahkan video pertamamu di atas.</p>`;
        return;
    }

    list.innerHTML = videos.map(v => {
        const link = isSafeUrl(v.video_url)
            ? `<a href="${escapeHtml(v.video_url)}" target="_blank" rel="noopener" class="text-[10px] text-sky-600 hover:underline truncate block">${escapeHtml(v.video_url)}</a>`
            : `<span class="text-[10px] text-rose-500">Link tidak valid</span>`;
        return `
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div class="w-9 h-9 bg-sky-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-video text-xs"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate">${escapeHtml(v.title)}</p>
                    ${link}
                </div>
                <button type="button" onclick="deleteTutorVideo(${Number(v.id)}, ${Number(tutorId)})" class="text-rose-500 hover:text-rose-700 text-xs flex-shrink-0" title="Hapus video">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function addTutorVideo(e) {
    e.preventDefault();
    if (typeof currentTutorProfile === 'undefined' || !currentTutorProfile) return;

    const title = document.getElementById('new-video-title').value.trim();
    const url = document.getElementById('new-video-url').value.trim();

    if (!title || !url) {
        alert('Isi judul dan link video terlebih dahulu.');
        return;
    }
    if (!isSafeUrl(url)) {
        alert('Link video harus berupa URL yang valid (contoh: link YouTube atau Google Drive), diawali http:// atau https://');
        return;
    }

    const btn = document.getElementById('btn-add-video');
    btn.disabled = true;
    btn.innerText = 'Menambahkan...';

    try {
        const sb = await getSupabase();
        if (!sb) {
            alert('Gagal terhubung ke server. Coba lagi.');
            return;
        }

        const { error } = await sb.from('tutor_videos').insert([{
            tutor_id: currentTutorProfile.id,
            title: title,
            video_url: url
        }]);

        if (error) {
            alert('Gagal menambahkan video: ' + error.message);
            return;
        }

        document.getElementById('form-add-video').reset();
        await loadTutorVideoList(currentTutorProfile.id);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Tambah Video';
    }
}

async function deleteTutorVideo(videoId, tutorId) {
    if (!confirm('Hapus video ini? Siswa yang berlangganan tidak akan bisa mengaksesnya lagi.')) return;
    const sb = await getSupabase();
    if (!sb) return;

    const { error } = await sb.from('tutor_videos').delete().eq('id', videoId);
    if (error) {
        alert('Gagal menghapus video: ' + error.message);
        return;
    }
    await loadTutorVideoList(tutorId);
}

async function loadVideoSubscriptionStats(tutorId) {
    const statBox = document.getElementById('video-stats-box');
    if (!statBox) return;
    const sb = await getSupabase();
    if (!sb) return;

    const priceInput = document.getElementById('video-price-input');
    if (priceInput && typeof currentTutorProfile !== 'undefined' && currentTutorProfile) {
        priceInput.value = currentTutorProfile.video_subscription_price || '';
    }

    const { count: subscriberCount } = await sb
        .from('video_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', tutorId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

    const { data: reviews } = await sb
        .from('video_reviews')
        .select('rating')
        .eq('tutor_id', tutorId);

    const totalReviews = reviews ? reviews.length : 0;
    const avgRatingNum = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const avgRating = totalReviews > 0 ? avgRatingNum.toFixed(1) : '-';

    document.getElementById('stat-video-subscribers').innerText = subscriberCount || 0;
    document.getElementById('stat-video-reviews').innerText = totalReviews;
    document.getElementById('stat-video-rating').innerText = avgRating;

    // Hitung dari data ulasan langsung, jadi badge tetap benar walau kolom offline_eligible belum ter-update
    const isEligible = totalReviews >= OFFLINE_ELIGIBLE_MIN_REVIEWS && avgRatingNum >= OFFLINE_ELIGIBLE_MIN_RATING;
    const eligibleBadge = document.getElementById('offline-eligible-badge');
    if (eligibleBadge) {
        if (isEligible) {
            eligibleBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Memenuhi syarat diajukan offline`;
            eligibleBadge.className = 'inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-3 py-1.5 rounded-full';
        } else {
            eligibleBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Kumpulkan minimal ${OFFLINE_ELIGIBLE_MIN_REVIEWS} ulasan (rating rata-rata >= ${OFFLINE_ELIGIBLE_MIN_RATING.toFixed(1)}) untuk memenuhi syarat offline`;
            eligibleBadge.className = 'inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full';
        }
    }
}
