async function getTutors() {
  const { data, error } = await _supabase
    .from('tutors')
    .select('*')
    .eq('status', 'approved');

  if (error) {
    console.error('Gagal mengambil data tutor:', error.message);
    return [];
  }
  return data;
}

async function registerTutor(tutorData) {
  const { data, error } = await _supabase
    .from('tutors')
    .insert([
      {
        name: tutorData.name,
        subject: tutorData.subject,
        level: tutorData.level,
        price: tutorData.price,
        phone_number: tutorData.phone_number,
        location: tutorData.location,
        teaching_video_url: tutorData.teaching_video_url,
        available_hours: tutorData.available_hours,
        status: 'pending'
      }
    ]);

  if (error) {
    console.error('Gagal mendaftar tutor:', error.message);
    return { success: false, error };
  }
  return { success: true, data };
}