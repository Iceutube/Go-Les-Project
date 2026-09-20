async function fetchTutorsFromSQL() {
    try {
        // Panggil endpoint serverless Vercel
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