import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Membaca kredensial rahasia dari file .env di server Vercel
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Kredensial Supabase di .env belum diatur' });
    }

    return res.status(200).json({
        supabaseUrl,
        supabaseKey
    });
}