// js/app.js
let tutorsData = [];
let myBookings = [];

// 1. Inisialisasi saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', async () => {
    tutorsData = await fetchTutorsFromSQL();
    renderTutors();
    setupModalListeners();
});

// 2. Fungsi Buka & Tutup Modal "Jadi Tutor"
function setupModalListeners() {
    const btnJadiTutor = document.getElementById('btn-jadi-tutor');
    const modalTutor = document.getElementById('modal-tutor');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const formRegister = document.getElementById('form-register-tutor');

    // Buka Modal
    if (btnJadiTutor && modalTutor) {
        btnJadiTutor.addEventListener('click', () => {
            modalTutor.classList.remove('hidden');
        });
    }

    // Tutup Modal (Tombol X)
    if (btnCloseModal && modalTutor) {
        btnCloseModal.addEventListener('click', () => {
            modalTutor.classList.add('hidden');
        });
    }

    // Tutup Modal (Tombol Batal)
    if (btnCancelModal && modalTutor) {
        btnCancelModal.addEventListener('click', () => {
            modalTutor.classList.add('hidden');
        });
    }

    // Submit Pendaftaran Tutor Baru
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const selectedHours = Array.from(document.querySelectorAll('.reg-hour-check:checked')).map(cb => cb.value);

            const tutorProfile = {
                name: document.getElementById('reg-name').value,
                subject: document.getElementById('reg-subject').value,
                level: document.getElementById('reg-level').value,
                price: parseInt(document.getElementById('reg-price').value) || 0,
                phone_number: document.getElementById('reg-phone').value,
                location: document.getElementById('reg-location').value,
                teaching_video_url: document.getElementById('reg-video').value,
                available_hours: selectedHours
            };

            // Panggil fungsi registrasi di js/supabase.js
            const result = await registerTutorWithAuth(tutorProfile, email, password);

            if (result.success) {
                alert('Pendaftaran Berhasil! Akun kamu sudah dibuat. Silakan login melalui tombol Login Tutor.');
                formRegister.reset();
                modalTutor.classList.add('hidden');
                tutorsData = await fetchTutorsFromSQL();
                renderTutors();
            } else {
                alert(`Gagal Mendaftar: ${result.error}`);
            }
        });
    }
}

// 3. Render Kartu Tutor di Halaman Depan
function renderTutors() {
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const grid = document.getElementById('tutorGrid');
    
    if (!grid) return;

    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const subject = subjectFilter ? subjectFilter.value : 'Semua';
    
    grid.innerHTML = '';

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

// 4. Pemesanan Sesi
function bookTutor(name, subject, price) {
    myBookings.push({ name, subject, price, date: new Date().toLocaleDateString('id-ID') });
    alert(`Berhasil memesan sesi dengan ${name}!`);
    renderSchedule();
}

// 5. Render Jadwal Saya
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

// 6. Switch Tab Navigasi
function switchTab(tab) {
    if (tab === 'search') {
        document.getElementById('tabSearch').classList.remove('hidden');
        document.getElementById('tabSchedule').classList.add('hidden');
    } else {
        document.getElementById('tabSearch').classList.add('hidden');
        document.getElementById('tabSchedule').classList.remove('hidden');
    }
}