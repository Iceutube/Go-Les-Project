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
    renderTutorBookingHours(tutor.available_hours);

    document.getElementById('booking-form').reset();
    setBookingMode('online');
    document.getElementById('booking-modal').classList.remove('hidden');
}
function renderTutorBookingHours(availableHoursStr) {
    const container = document.getElementById('booking-available-hours-container');
    container.innerHTML = '';

    if (!availableHoursStr || availableHoursStr.trim() === '') {
        container.innerHTML = `<p class="col-span-full text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] font-semibold text-center"><i class="fa-solid fa-circle-info"></i> Tutor ini belum mengatur slot jam mengajar.</p>`;
        return;
    }

    const hoursList = availableHoursStr.split(',').map(h => h.trim()).filter(h => h.length > 0);

    if (hoursList.length === 0) {
        container.innerHTML = `<p class="col-span-full text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] font-semibold text-center"><i class="fa-solid fa-circle-info"></i> Tidak ada slot jam mengajar yang tersedia.</p>`;
        return;
    }

    hoursList.forEach((hour, index) => {
        container.innerHTML += `
            <label class="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer text-xs font-medium hover:border-sky-500 hover:bg-sky-50/50 transition">
                <input type="radio" name="booking-selected-time" value="${hour}" ${index === 0 ? 'checked' : ''} class="accent-sky-600">
                <i class="fa-regular fa-clock text-sky-600"></i> ${hour}
            </label>
        `;
    });
}