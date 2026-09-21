let bookingTargetTutor = null;

// Dipanggil saat tombol "Pesan" pada kartu tutor diklik
async function openBookingModal(tutorId) {
    const tutor = rawApprovedTutors.find(t => t.id === tutorId);
    if (!tutor) return;
    bookingTargetTutor = tutor;
    
    document.getElementById('booking-modal-tutor-name').innerText = tutor.name;
    document.getElementById('booking-modal-tutor-subject').innerText = `${tutor.subject} (${tutor.level || 'Umum'})`;
    document.getElementById('booking-modal-price').innerText = `Rp ${(tutor.price || 0).toLocaleString('id-ID')}/jam`;
    document.getElementById('booking-modal-avatar').src = tutor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}`;
    
    const offlineBtn = document.getElementById('booking-mode-btn-offline');
    const offlineLockedNotice = document.getElementById('booking-offline-locked-notice');

    if (tutor.is_offline_verified) {
        if (offlineBtn) {
            offlineBtn.disabled = false;
            offlineBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        }
        if (offlineLockedNotice) offlineLockedNotice.classList.add('hidden');
    } else {
        if (offlineBtn) {
            offlineBtn.disabled = true;
            offlineBtn.classList.add('opacity-40', 'cursor-not-allowed');
        }
        if (offlineLockedNotice) offlineLockedNotice.classList.remove('hidden');
    }

    // --- MENCEGAH PILIH HARI SEBELUMNYA ---
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.min = todayStr;
        dateInput.value = todayStr;
        dateInput.onchange = () => {
            if (dateInput.value < todayStr) {
                alert('Tidak dapat memilih tanggal yang sudah lewat.');
                dateInput.value = todayStr;
            }
            renderTutorBookingHours(tutor.available_hours, tutor.id, dateInput.value);
        };
    }

    await renderTutorBookingHours(tutor.available_hours, tutor.id, todayStr);

    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) bookingForm.reset();

    setBookingMode('online');
    document.getElementById('booking-modal').classList.remove('hidden');
}

function setBookingMode(mode) {
    const offlineBtn = document.getElementById('booking-mode-btn-offline');
    if (mode === 'offline' && offlineBtn && offlineBtn.disabled) {
        return;
    }
    
    ['online', 'offline'].forEach(m => {
        const btn = document.getElementById(`booking-mode-btn-${m}`);
        if (btn) {
            if (m === mode) {
                btn.classList.add('border-sky-600', 'bg-sky-50', 'text-sky-700');
                btn.classList.remove('border-slate-200', 'text-slate-600');
            } else {
                btn.classList.remove('border-sky-600', 'bg-sky-50', 'text-sky-700');
                btn.classList.add('border-slate-200', 'text-slate-600');
            }
        }
    });

    const modeInput = document.getElementById('booking-form-mode');
    if (modeInput) modeInput.value = mode;

    const locationRow = document.getElementById('booking-offline-location-row');
    if (locationRow) {
        if (mode === 'offline') {
            locationRow.classList.remove('hidden');
        } else {
            locationRow.classList.add('hidden');
        }
    }

    const dateInput = document.getElementById('booking-date');
    if (bookingTargetTutor && dateInput) {
        renderTutorBookingHours(bookingTargetTutor.available_hours, bookingTargetTutor.id, dateInput.value);
    }
}

function toggleStudentAddressInput(show) {
    const addressBox = document.getElementById('student-address-container');
    if (addressBox) {
        if (show) addressBox.classList.remove('hidden');
        else addressBox.classList.add('hidden');
    }
}

async function renderTutorBookingHours(availableHoursStr, tutorId, selectedDate) {
    const container = document.getElementById('booking-available-hours-container');
    if (!container) return;
    container.innerHTML = '';

    if (!availableHoursStr || availableHoursStr.trim() === '') {
        container.innerHTML = `<p class="col-span-full text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] font-semibold text-center"><i class="fa-solid fa-circle-info"></i> Tutor ini belum mengatur slot jam mengajar.</p>`;
        return;
    }

    const hoursList = availableHoursStr.split(',').map(h => h.trim()).filter(h => h.length > 0);
    const mode = document.getElementById('booking-form-mode')?.value || 'online';

    let bookedTimes = [];
    if (tutorId && selectedDate) {
        const { data: existingBookings } = await _supabase
            .from('bookings')
            .select('booking_time, session_mode')
            .eq('tutor_id', tutorId)
            .eq('booking_date', selectedDate);

        if (existingBookings) {
            bookedTimes = existingBookings
                .filter(b => b.session_mode === 'offline')
                .map(b => b.booking_time);
        }
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const isToday = selectedDate === todayStr;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let validSlotsCount = 0;

    hoursList.forEach((hourStr) => {
        const isConflict = mode === 'offline' && bookedTimes.includes(hourStr);

        let isPastTime = false;
        if (isToday) {
            const startTimeStr = hourStr.split('-')[0].trim();
            const [startHour, startMinute] = startTimeStr.split(':').map(Number);

            if (startHour < currentHour || (startHour === currentHour && startMinute <= currentMinute)) {
                isPastTime = true;
            }
        }

        if (isPastTime) {
            container.innerHTML += `
                <label class="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-400 cursor-not-allowed text-xs font-medium opacity-60" title="Sesi jam ini sudah lewat">
                    <input type="radio" disabled name="booking-selected-time" value="${hourStr}" class="accent-slate-400">
                    <i class="fa-regular fa-clock"></i> ${hourStr} (Sesi Lewat)
                </label>
            `;
        } else if (isConflict) {
            container.innerHTML += `
                <label class="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-400 cursor-not-allowed text-xs font-medium opacity-60" title="Sudah dipesan siswa lain">
                    <input type="radio" disabled name="booking-selected-time" value="${hourStr}" class="accent-slate-400">
                    <i class="fa-regular fa-clock"></i> ${hourStr} (Sudah Dipesan)
                </label>
            `;
        } else {
            validSlotsCount++;
            container.innerHTML += `
                <label class="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer text-xs font-medium hover:border-sky-500 hover:bg-sky-50/50 transition">
                    <input type="radio" name="booking-selected-time" value="${hourStr}" ${validSlotsCount === 1 ? 'checked' : ''} class="accent-sky-600">
                    <i class="fa-regular fa-clock text-sky-600"></i> ${hourStr}
                </label>
            `;
        }
    });

    if (validSlotsCount === 0 && hoursList.length > 0) {
        container.innerHTML += `
            <p class="col-span-full text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl text-[11px] font-semibold text-center mt-1">
                <i class="fa-solid fa-circle-exclamation"></i> Semua slot jam mengajar untuk hari ini sudah lewat / terisi. Silakan pilih tanggal besok.
            </p>
        `;
    }
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.add('hidden');
    bookingTargetTutor = null;
}

// FUNGSI KOMPRESI DENGAN CANVAS DAHULU SEBELUM SUBMIT
async function submitBooking(e) {
    e.preventDefault();
    if (!bookingTargetTutor || !currentStudent) return;

    const modeInput = document.getElementById('booking-form-mode');
    const mode = modeInput ? modeInput.value : 'online';
    let offlineLocation = null;
    let studentAddress = null;

    if (mode === 'offline') {
        const chosenLoc = document.querySelector('input[name="offline-location-choice"]:checked');
        if (!chosenLoc) {
            alert('Pilih dulu lokasi les offline: tutor datang ke rumah siswa, atau siswa datang ke rumah tutor.');
            return;
        }
        offlineLocation = chosenLoc.value;

        if (offlineLocation === 'rumah_siswa') {
            studentAddress = document.getElementById('booking-student-address').value.trim();
            if (!studentAddress) {
                alert('Mohon isi alamat lengkap rumah kamu.');
                return;
            }
        }
    }

    const dateInput = document.getElementById('booking-date');
    const date = dateInput ? dateInput.value : null;
    const selectedTimeInput = document.querySelector('input[name="booking-selected-time"]:checked');
    const time = selectedTimeInput ? selectedTimeInput.value : null;
    const phoneInput = document.getElementById('booking-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';

    const proofFileInput = document.getElementById('booking-payment-proof-file');
    const proofFile = proofFileInput && proofFileInput.files[0] ? proofFileInput.files[0] : null;

    if (!date || !time || !phone || !proofFile) {
        alert('Lengkapi tanggal, slot jam sesi, nomor WhatsApp, dan foto bukti pembayaran.');
        return;
    }

    const btn = document.getElementById('btn-submit-booking');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Memproses Gambar...';
    }

    // MEMBACA DAN MENGOMPRES GAMBAR KUALITAS CANVAS
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleFactor = MAX_WIDTH / img.width;
            
            if (img.width > MAX_WIDTH) {
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleFactor;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Kompres foto ke format JPEG kualitas 70%
            const paymentProofBase64 = canvas.toDataURL('image/jpeg', 0.7);

            if (btn) btn.innerText = 'Memproses...';

            const studentNameElem = document.getElementById('student-name');
            const studentName = studentNameElem ? studentNameElem.innerText : 'Siswa';

            // Simpan ke Supabase
            const { error } = await _supabase.from('bookings').insert([{
                tutor_id: bookingTargetTutor.id,
                student_id: currentStudent.id,
                student_name: studentName,
                student_phone: phone,
                booking_date: date,
                booking_time: time,
                session_mode: mode,
                offline_location: offlineLocation,
                student_address: studentAddress,
                payment_status: 'paid',
                payment_proof: paymentProofBase64,
                status: 'pending'
            }]);

            if (error) {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = 'Konfirmasi & Bayar Sesi';
                }
                alert('Gagal membuat pemesanan: ' + error.message);
                return;
            }

            // Kirim pesan otomatis ke tutor
            if (bookingTargetTutor.user_id) {
                const autoMessage = `Ditunggu ya kelas privatnya di jam ${time} (Tanggal: ${date}).`;
                await _supabase.from('messages').insert([{
                    sender_id: currentStudent.id,
                    receiver_id: bookingTargetTutor.user_id,
                    message: autoMessage
                }]);
            }

            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Konfirmasi & Bayar Sesi';
            }

            alert(`Pemesanan berhasil dikirim beserta foto bukti bayar! Tunggu verifikasi admin paling lambat 10 menit.`);
            closeBookingModal();
        };
        img.src = event.target.result;
    };

    reader.readAsDataURL(proofFile);
}