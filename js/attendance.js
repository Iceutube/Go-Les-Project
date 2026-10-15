// PIN kehadiran baru bisa dibuat mulai X menit sebelum sesi dimulai
const PIN_OPEN_MINUTES_BEFORE = 15;

// booking_date "YYYY-MM-DD" + booking_time "08:00 - 09:00" (atau "08:00") -> Date waktu lokal
function getSessionStart(booking) {
    if (!booking || !booking.booking_date || !booking.booking_time) return null;
    const match = String(booking.booking_time).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const [year, month, day] = booking.booking_date.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, Number(match[1]), Number(match[2]));
}

function getPinOpenTime(booking) {
    const start = getSessionStart(booking);
    return start ? new Date(start.getTime() - PIN_OPEN_MINUTES_BEFORE * 60 * 1000) : null;
}

function isPinWindowOpen(booking) {
    const openTime = getPinOpenTime(booking);
    // Format jam tidak dikenali: jangan kunci, supaya sesi tetap bisa diselesaikan
    return !openTime || new Date() >= openTime;
}

// 1. Dibuat oleh Tutor saat sesi mengajar
async function generateAttendancePasscode(bookingId) {
    if (!bookingId) {
        alert("ID Pemesanan tidak valid.");
        return null;
    }

    const sb = await getSupabase();
    if (!sb) {
        alert('Gagal terhubung ke server. Coba lagi.');
        return null;
    }

    const { data: booking, error: fetchError } = await sb
        .from('bookings')
        .select('id, status, booking_date, booking_time, attendance_passcode')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) {
        alert('Sesi pemesanan tidak ditemukan.');
        return null;
    }
    if (booking.status !== 'confirmed') {
        alert('PIN hanya bisa dibuat untuk sesi yang sudah dikonfirmasi dan belum selesai.');
        return null;
    }
    if (booking.attendance_passcode) {
        return booking.attendance_passcode;
    }
    if (!isPinWindowOpen(booking)) {
        const openTime = getPinOpenTime(booking);
        alert(`PIN kehadiran baru bisa dibuat mulai ${openTime.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} (${PIN_OPEN_MINUTES_BEFORE} menit sebelum sesi dimulai).`);
        return null;
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GL-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error } = await sb
        .from('bookings')
        .update({ attendance_passcode: code })
        .eq('id', bookingId);

    if (error) {
        alert('Gagal membuat PIN kehadiran di database: ' + error.message);
        return null;
    }
    return code;
}

// 2. Diverifikasi oleh Siswa saat memasukkan PIN
async function verifyAttendancePasscode(bookingId, inputPasscode) {
    if (!inputPasscode) {
        alert('Masukkan PIN kehadiran terlebih dahulu.');
        return false;
    }

    const sb = await getSupabase();
    if (!sb) {
        alert('Gagal terhubung ke server. Coba lagi.');
        return false;
    }

    const cleanInput = inputPasscode.trim().toUpperCase();

    const { data: booking, error } = await sb
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (error || !booking) {
        alert('Sesi pemesanan tidak ditemukan.');
        return false;
    }

    if (!booking.attendance_passcode) {
        alert('PIN kehadiran belum dibuat oleh Tutor.');
        return false;
    }

    if (booking.attendance_passcode.toUpperCase() === cleanInput) {
        const { error: updateErr } = await sb
            .from('bookings')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (updateErr) {
            alert('Gagal memperbarui status kehadiran: ' + updateErr.message);
            return false;
        }

        alert('Verifikasi Kehadiran Berhasil! Sesi belajar telah dinyatakan Selesai.');
        return true;
    } else {
        alert('PIN Kehadiran Salah! Pastikan PIN yang dimasukkan sesuai dengan PIN Tutor.');
        return false;
    }
}
