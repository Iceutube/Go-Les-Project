// js/app.js
let tutorsData = [];
let myBookings = [];

// Event Listener Utama saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', async () => {
    tutorsData = await fetchTutorsFromSQL();
    renderTutors();
    setupModalListeners();
});

// Fungsi Render Kartu Tutor
function renderTutors() {
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const grid = document.getElementById('tutorGrid');
    
    if (!grid) return;

    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const subject = subjectFilter ? subjectFilter.value : 'Semua';
    
    grid.innerHTML = '';

    // Jika data kosong
    if (!tutorsData || tutorsData.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-8">Belum ada data tutor di database.</p>`;
        return;
    }

    const filtered = tutorsData.filter(t => {
        const name = t.name ? t.name.toLowerCase() : '';
        const subj = t.subject ? t.subject.toLowerCase() : '';
        
        const matchSearch = search === '' || name.includes(search) || subj.includes(search);
        const matchSubject = subject === 'Semua' || (t.subject && t.subject.toLowerCase().includes(subject.toLowerCase()));
        
        return matchSearch && matchSubject;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-8">Tutor tidak ditemukan untuk pencarian ini.</p>`;
        return;
    }

    filtered.forEach(t => {
        const avatarUrl = t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || 'Tutor')}&background=0284c7&color=fff`;
        const locationText = t.location || 'Online';
        const typeText = t.type || 'Online';
        const ratingVal = t.rating || 'Baru';
        const levelText = t.level || 'Umum';
        const priceVal = t.price || 0;

        grid.innerHTML += `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
                <div class="p-5">
                    <div class="flex gap-4 items-start mb-4">
                        <img src="${avatarUrl}" class="w-16 h-16 rounded-xl object-cover" alt="${t.name}">
                        <div>
                            <span class="text-xs font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md">SQL Connected</span>
                            <h3 class="font-bold text-slate-900 mt-1">${t.name}</h3>
                            <p class="text-sm text-slate-500">${t.subject} (${levelText})</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl">
                        <div><i class="fa-solid fa-star text-amber-400"></i> <b>${ratingVal}</b></div>
                        <div><i class="fa-solid fa-location-dot text-slate-400"></i> ${locationText}</div>
                        <div><i class="fa-solid fa-video text-slate-400"></i> ${typeText}</div>
                    </div>
                    <div class="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                            <span class="text-xs text-slate-400 block">Tarif per sesi</span>
                            <span class="text-base font-bold text-sky-600">Rp ${priceVal.toLocaleString('id-ID')}</span>
                        </div>
                        <button onclick="bookTutor('${t.name}', '${t.subject}', ${priceVal})" class="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                            Pesan Sesi
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Pemesanan Tutor
function bookTutor(name, subject, price) {
    myBookings.push({ name, subject, price, date: new Date().toLocaleDateString('id-ID') });
    alert(`Berhasil memesan sesi dengan ${name}!`);
    renderSchedule();
}

// Render List Jadwal Saya
function renderSchedule() {
    const list = document.getElementById('scheduleList');
    if (!list) return;
    
    if (myBookings.length === 0) {
        list.innerHTML = `
            <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
                Belum ada jadwal les yang dipesan.
            </div>`;
        return;
    }
    
    list.innerHTML = '';
    myBookings.forEach((b) => {
        list.innerHTML += `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div>
                    <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Terkonfirmasi</span>
                    <h4 class="font-bold text-slate-900 mt-1">${b.name}</h4>
                    <p class="text-sm text-slate-500">${b.subject} • Dipesan tanggal ${b.date}</p>
                </div>
                <span class="font-bold text-sky-600">Rp ${b.price.toLocaleString('id-ID')}</span>
            </div>
        `;
    });
}

// Navigasi Tab Browser
function switchTab(tab) {
    if (tab === 'search') {
        document.getElementById('tabSearch').classList.remove('hidden');
        document.getElementById('tabSchedule').classList.add('hidden');
    } else {
        document.getElementById('tabSearch').classList.add('hidden');
        document.getElementById('tabSchedule').classList.remove('hidden');
    }
}

// Logika Modal Pendaftaran "Jadi Tutor"
function setupModalListeners() {
    const btnOpenModal = document.getElementById('btn-jadi-tutor');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const modal = document.getElementById('modal-tutor');
    const form = document.getElementById('form-register-tutor');

    const openModal = () => modal && modal.classList.remove('hidden');
    const closeModal = () => modal && modal.classList.add('hidden');

    if (btnOpenModal) btnOpenModal.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const selectedHours = Array.from(document.querySelectorAll('.reg-hour-check:checked')).map(cb => cb.value);

            const newTutor = {
                name: document.getElementById('reg-name').value,
                subject: document.getElementById('reg-subject').value,
                level: document.getElementById('reg-level').value,
                price: parseInt(document.getElementById('reg-price').value) || 0,
                phone_number: document.getElementById('reg-phone').value,
                location: document.getElementById('reg-location').value,
                teaching_video_url: document.getElementById('reg-video').value,
                available_hours: selectedHours,
                status: 'approved' // Set langsung approved untuk testing
            };

            const result = await registerTutorToSQL(newTutor);
            if (result.success) {
                alert('Pendaftaran berhasil terkirim!');
                form.reset();
                closeModal();
                tutorsData = await fetchTutorsFromSQL();
                renderTutors();
            } else {
                alert('Gagal mendaftar. Silakan periksa kembali data kamu.');
            }
        });
    }
}