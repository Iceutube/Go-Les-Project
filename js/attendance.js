async function startAttendanceSession(scheduleId) {
  const passcode = "GL-" + Math.random().toString(36).substring(2, 6).toUpperCase();

  const { data, error } = await _supabase
    .from('attendances')
    .insert([{ schedule_id: scheduleId, passcode: passcode }]);

  if (error) {
    alert("Gagal membuat kode presensi: " + error.message);
    return null;
  }
  return passcode;
}

async function submitAttendancePasscode(scheduleId, inputCode, userRole) {
  const { data: att, error: fetchErr } = await _supabase
    .from('attendances')
    .select('*')
    .eq('schedule_id', scheduleId)
    .single();

  if (fetchErr || !att) {
    alert("Sesi presensi belum dimulai oleh Tutor.");
    return;
  }

  if (att.passcode.toLowerCase() !== inputCode.trim().toLowerCase()) {
    alert("Kata sandi / Passcode tidak cocok!");
    return;
  }

  const updateData = userRole === 'tutor'
    ? { tutor_confirmed: true, tutor_confirmed_at: new Date().toISOString() }
    : { student_confirmed: true, student_confirmed_at: new Date().toISOString() };

  const { error: updateErr } = await _supabase
    .from('attendances')
    .update(updateData)
    .eq('schedule_id', scheduleId);

  if (updateErr) {
    alert("Gagal menyimpan konfirmasi: " + updateErr.message);
  } else {
    alert("Konfirmasi berhasil! Menunggu pihak lawan memasukkan kode...");
  }
}

async function generateAttendancePasscode(bookingId) {
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

// Verifikasi PIN Kehadiran untuk Siswa
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