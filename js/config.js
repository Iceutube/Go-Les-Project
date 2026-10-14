const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const scheduler = new Scheduler(_supabase);