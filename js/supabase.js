if (typeof _supabase === 'undefined') {
    if (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase CDN atau config.js belum dimuat.");
    }
}