let bookingTargetTutor = null;

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

    // Set tanggal default ke hari ini
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = today;
        dateInput.onchange = () => renderTutorBookingHours(tutor.available_hours, tutor.id, dateInput.value);
    }

    // Render slot jam mengajar tutor
    await renderTutorBookingHours(tutor.available_hours, tutor.id, today);

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

    // Trigger re-render jam untuk mengecek bentrok sesuai mode yang dipilih
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

    // Ambil data pemesanan offline yang sudah ada untuk tutor & tanggal ini
    let bookedTimes = [];
    if (tutorId && selectedDate) {
        const { data: existingBookings } = await _supabase
            .from('bookings')
            .select('booking_time, session_mode')
            .eq('tutor_id', tutorId)
            .eq('booking_date', selectedDate);

        if (existingBookings) {
            // Jika mode offline, jam yang sudah dipesan dalam sesi offline akan dikunci
            bookedTimes = existingBookings
                .filter(b => b.session_mode === 'offline')
                .map(b => b.booking_time);
        }
    }

    hoursList.forEach((hour, index) => {
        // Cek apakah jam ini terbentrok sesi offline lain
        const isConflict = mode === 'offline' && bookedTimes.includes(hour);

        if (isConflict) {
            container.innerHTML += `
                <label class="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-400 cursor-not-allowed text-xs font-medium opacity-60">
                    <input type="radio" disabled name="booking-selected-time" value="${hour}" class="accent-slate-400">
                    <i class="fa-regular fa-clock"></i> ${hour} (Sudah Dipesan)
                </label>
            `;
        } else {
            container.innerHTML += `
                <label class="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer text-xs font-medium hover:border-sky-500 hover:bg-sky-50/50 transition">
                    <input type="radio" name="booking-selected-time" value="${hour}" ${index === 0 ? 'checked' : ''} class="accent-sky-600">
                    <i class="fa-regular fa-clock text-sky-600"></i> ${hour}
                </label>
            `;
        }
    });
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.add('hidden');
    bookingTargetTutor = null;
}

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
    const paymentProof = document.getElementById('booking-payment-proof').value.trim();

    if (!date || !time || !phone || !paymentProof) {
        alert('Lengkapi tanggal, slot jam sesi, nomor WhatsApp, dan link bukti pembayaran.');
        return;
    }

    const btn = document.getElementById('btn-submit-booking');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Memproses...';
    }

    const studentNameElem = document.getElementById('student-name');
    const studentName = studentNameElem ? studentNameElem.innerText : 'Siswa';

    // 1. Simpan Pemesanan ke Tabel Bookings
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
        payment_proof: paymentProof,
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

    alert(`Pemesanan berhasil dikirim dan pesan otomatis telah terkirim ke tutor! Tunggu verifikasi admin paling lambat 10 menit.`);
    closeBookingModal();
}