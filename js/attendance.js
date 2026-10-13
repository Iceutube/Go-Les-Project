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