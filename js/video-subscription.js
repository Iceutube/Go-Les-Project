const VIDEO_SUB_MAX_PRICE = 20000; 
let videoSubTargetTutor = null; 
let activeVideoSubscription = null; 

function openVideoSubscriptionModal(tutorId) {
    const tutor = rawApprovedTutors.find(t => t.id === tutorId);
    if (!tutor) return;
    videoSubTargetTutor = tutor;
    const price = Math.min(tutor.video_subscription_price || 0, VIDEO_SUB_MAX_PRICE);
    document.getElementById('video-sub-tutor-name').innerText = tutor.name;
    document.getElementById('video-sub-tutor-avatar').src = tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`;
    
    const introLink = document.getElementById('video-sub-intro-link');
    if (tutor.teaching_video_url) {
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
    const { data: videos, error } = await _supabase
        .from('tutor_videos')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });
    if (error || !videos || videos.length === 0) {
        box.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4">Tutor ini belum menambahkan video mengajar.</p>`;
        return;
    }
    box.innerHTML = '';
    videos.forEach(v => {
        box.innerHTML += `
            <a href="${v.video_url}" target="_blank" rel="noopener" class="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 hover:bg-emerald-100 transition">
                <div class="w-9 h-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-play text-xs"></i>
                </div>
                <span class="text-xs font-bold text-emerald-800 flex-1">${v.title}</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-emerald-400 text-[10px]"></i>
            </a>
        `;
    });
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
    expiresAt.setDate(expiresAt.getDate() + 30);
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
    await checkExistingReview(activeVideoSubscription.id);
}

async function loadTutorVideoList(tutorId) {
    const list = document.getElementById('tutor-video-list');
    if (!list) return;
    const { data: videos, error } = await _supabase
        .from('tutor_videos')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false });
    if (error || !videos || videos.length === 0) {
        list.innerHTML = `<p class="text-center text-[11px] text-slate-400 py-4">Belum ada video. Tambahkan video pertamamu di atas.</p>`;
        return;
    }
    list.innerHTML = '';
    videos.forEach(v => {
        list.innerHTML += `
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div class="w-9 h-9 bg-sky-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-video text-xs"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate">${v.title}</p>
                    <a href="${v.video_url}" target="_blank" rel="noopener" class="text-[10px] text-sky-600 hover:underline truncate block">${v.video_url}</a>
                </div>
                <button type="button" onclick="deleteTutorVideo(${v.id}, ${tutorId})" class="text-rose-500 hover:text-rose-700 text-xs flex-shrink-0" title="Hapus video">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
}

async function addTutorVideo(e) {
    e.preventDefault();
    if (!currentTutorProfile) return;
    const title = document.getElementById('new-video-title').value.trim();
    const url = document.getElementById('new-video-url').value.trim();
    if (!title || !url) {
        alert('Isi judul dan link video terlebih dahulu.');
        return;
    }
    if (!/^https?:\/\//i.test(url)) {
        alert('Link video harus berupa URL yang valid (contoh: link YouTube atau Google Drive), diawali http:// atau https://');
        return;
    }
    const btn = document.getElementById('btn-add-video');
    btn.disabled = true;
    btn.innerText = 'Menambahkan...';
    const { error } = await _supabase.from('tutor_videos').insert([{
        tutor_id: currentTutorProfile.id,
        title: title,
        video_url: url
    }]);
    btn.disabled = false;
    btn.innerText = 'Tambah Video';
    if (error) {
        alert('Gagal menambahkan video: ' + error.message);
        return;
    }
    document.getElementById('form-add-video').reset();
    await loadTutorVideoList(currentTutorProfile.id);
}

async function deleteTutorVideo(videoId, tutorId) {
    if (!confirm('Hapus video ini? Siswa yang berlangganan tidak akan bisa mengaksesnya lagi.')) return;
    const { error } = await _supabase.from('tutor_videos').delete().eq('id', videoId);
    if (error) {
        alert('Gagal menghapus video: ' + error.message);
        return;
    }
    await loadTutorVideoList(tutorId);
}

async function loadVideoSubscriptionStats(tutorId) {
    const statBox = document.getElementById('video-stats-box');
    if (!statBox) return;
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
        eligibleBadge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Kumpulkan minimal 5 ulasan (rating rata-rata >= 4.0) untuk memenuhi syarat offline`;
        eligibleBadge.className = 'inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full';
    }
}