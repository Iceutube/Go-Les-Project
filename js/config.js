let _supabase = null;

// Mengambil URL & Key dari file .env via API
async function initSupabase() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) {
            throw new Error('Gagal mengambil konfigurasi Supabase dari server');
        }
        const config = await res.json();
        
        // Inisialisasi client Supabase secara dinamis
        _supabase = supabase.createClient(config.supabaseUrl, config.supabaseKey);
    } catch (err) {
        console.error('Error Inisialisasi Supabase:', err);
    }
}

// Jalankan inisialisasi saat file dimuat
initSupabase();