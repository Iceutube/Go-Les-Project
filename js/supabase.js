async function fetchTutorsFromSQL() {
    try {
        const { data, error } = await _supabase.from('tutors').select('*');
        if (error) {
            console.error("Error SQL:", error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("Gagal terhubung ke database:", err);
        return [];
    }
}

// Harga langganan video mengajar bulanan tidak boleh lebih dari ini.
const VIDEO_SUB_MAX_PRICE = 20000;

async function registerTutorWithAuth(tutorData, email, password) {
    try {
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        const userId = authData.user ? authData.user.id : null;

        // Pastikan harga langganan video tidak pernah melewati batas Rp20.000/bulan.
        const videoSubPrice = Math.min(
            Math.max(parseInt(tutorData.video_subscription_price) || 0, 0),
            VIDEO_SUB_MAX_PRICE
        );

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
                video_subscription_price: videoSubPrice,
                is_offline_verified: false,
                status: 'pending'
            }]);

        if (dbError) throw dbError;

        return { success: true };
    } catch (err) {
        console.error("Error registrasi tutor:", err.message);
        return { success: false, error: err.message };
    }
}