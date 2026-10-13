// 1. Dibuat oleh Tutor saat sesi mengajar
async function generateAttendancePasscode(bookingId) {
    if (!bookingId) {
        alert("ID Pemesanan tidak valid.");
        return null;
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GL-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await _supabase
        .from('bookings')
        .update({ attendance_passcode: code })
        .eq('id', bookingId)
        .select();

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

    const cleanInput = inputPasscode.trim().toUpperCase();

    const { data: booking, error } = await _supabase
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
        const { error: updateErr } = await _supabase
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