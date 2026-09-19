// js/supabase.js

async function registerTutorWithAuth(tutorData, email, password) {
    try {
        // 1. Buat Akun Pengguna di Supabase Auth
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        const userId = authData.user ? authData.user.id : null;

        // 2. Simpan Data Profil Tutor ke Tabel tutors
        const { data, error: dbError } = await _supabase
            .from('tutors')
            .insert([{
                user_id: userId,
                email: email,
                name: tutorData.name,
                subject: tutorData.subject,
                level: tutorData.level,
                price: tutorData.price,
                phone_number: tutorData.phone_number,
                location: tutorData.location,
                teaching_video_url: tutorData.teaching_video_url,
                available_hours: tutorData.available_hours,
                status: 'pending'
            }]);

        if (dbError) throw dbError;

        return { success: true };
    } catch (err) {
        console.error("Error registrasi tutor:", err.message);
        return { success: false, error: err.message };
    }
}