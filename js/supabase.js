const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function fetchTutorsFromSQL() {
    try {
        const response = await fetch('/api/tutors');
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data dari server');
        }

        const data = await response.json();
        return data || [];
    } catch (err) {
        console.error("Gagal terhubung ke API:", err);
        return [];
    }
}