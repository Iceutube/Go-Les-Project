// js/supabase.js

async function fetchTutorsFromSQL() {
    const grid = document.getElementById('tutorGrid');
    if (grid) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-8">Memuat data dari Database SQL...</p>`;
    }

    const { data, error } = await _supabase.from('tutors').select('*');

    if (error) {
        console.error("Error SQL:", error);
        if (grid) {
            grid.innerHTML = `<p class="col-span-full text-center text-red-500 py-8">Gagal mengambil data dari database.</p>`;
        }
        return [];
    }

    return data || [];
}

async function registerTutorToSQL(tutorData) {
    const { data, error } = await _supabase
        .from('tutors')
        .insert([tutorData]);

    if (error) {
        console.error("Error pendaftaran tutor:", error);
        return { success: false, error };
    }

    return { success: true, data };
}