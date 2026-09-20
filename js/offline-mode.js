let bookingTargetTutor = null;

function openBookingModal(tutorId) {
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
        offlineBtn.disabled = false;
        offlineBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        offlineLockedNotice.classList.add('hidden');
    } else {
        offlineBtn.disabled = true;
        offlineBtn.classList.add('opacity-40', 'cursor-not-allowed');
        offlineLockedNotice.classList.remove('hidden');
    }
    document.getElementById('booking-form').reset();
    setBookingMode('online');
    document.getElementById('booking-modal').classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('booking-modal').classList.add('hidden');
    bookingTargetTutor = null;
}

function setBookingMode(mode) {
    if (mode === 'offline' && document.getElementById('booking-mode-btn-offline').disabled) {
        return;
    }
    ['online', 'offline'].forEach(m => {
        const btn = document.getElementById(`booking-mode-btn-${m}`);
        if (m === mode) {
            btn.classList.add('border-sky-600', 'bg-sky-50', 'text-sky-700');
            btn.classList.remove('border-slate-200', 'text-slate-600');
        } else {
            btn.classList.remove('border-sky-600', 'bg-sky-50', 'text-sky-700');
            btn.classList.add('border-slate-200', 'text-slate-600');
        }
    });
    document.getElementById('booking-form-mode').value = mode;
    const locationRow = document.getElementById('booking-offline-location-row');
    if (mode === 'offline') {
        locationRow.classList.remove('hidden');
    } else {
        locationRow.classList.add('hidden');
    }
}

async function submitBooking(e) {
    e.preventDefault();
    if (!bookingTargetTutor || !currentStudent) return;
    const mode = document.getElementById('booking-form-mode').value;
    let offlineLocation = null;
    if (mode === 'offline') {
        const chosen = document.querySelector('input[name="offline-location-choice"]:checked');
        if (!chosen) {
            alert('Pilih dulu lokasi les offline: tutor datang ke rumah siswa, atau siswa datang ke rumah tutor.');
            return;
        }
        offlineLocation = chosen.value;
    }
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const phone = document.getElementById('booking-phone').value.trim();
    if (!date || !time || !phone) {
        alert('Lengkapi tanggal, jam, dan nomor WhatsApp kamu terlebih dahulu.');
        return;
    }
    const btn = document.getElementById('btn-submit-booking');
    btn.disabled = true;
    btn.innerText = 'Memproses...';
    const { error } = await _supabase.from('bookings').insert([{
        tutor_id: bookingTargetTutor.id,
        student_id: currentStudent.id,
        student_name: document.getElementById('student-name').innerText,
        student_phone: phone,
        booking_date: date,
        booking_time: time,
        session_mode: mode,
        offline_location: offlineLocation,
        status: 'pending'
    }]);
    btn.disabled = false;
    btn.innerText = 'Konfirmasi Pesan Sesi';
    if (error) {
        alert('Gagal membuat pemesanan: ' + error.message);
        return;
    }
    const modeLabel = mode === 'online'
        ? 'Online'
        : (offlineLocation === 'rumah_siswa' ? 'Offline - Tutor ke rumah siswa' : 'Offline - Siswa ke rumah tutor');
    alert(`Sesi berhasil dipesan (${modeLabel})! Tunggu konfirmasi dari tutor melalui menu Chat.`);
    closeBookingModal();
}