let _supabase = null;
let supabaseInitPromise = null;

async function initSupabase() {
    if (_supabase) return _supabase;
    if (supabaseInitPromise) return supabaseInitPromise;

    supabaseInitPromise = (async () => {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error('Gagal memuat konfigurasi dari /api/config');
            const config = await res.json();
            
            if (typeof supabase !== 'undefined') {
                _supabase = supabase.createClient(config.supabaseUrl, config.supabaseKey);
            } else {
                console.error('Supabase CDN SDK belum dimuat di HTML!');
            }
            return _supabase;
        } catch (err) {
            console.error('Error Inisialisasi Supabase:', err);
            return null;
        }
    })();

    return supabaseInitPromise;
}

async function getSupabase() {
    if (_supabase) return _supabase;
    return await initSupabase();
}

// Jalankan inisialisasi awal
initSupabase();