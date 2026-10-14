if (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Gagal menginisialisasi Supabase. Pastikan config.js dan Supabase CDN sudah dimuat sebelum file ini.");
}