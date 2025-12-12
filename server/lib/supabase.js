import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseClient;

if (supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("⚠️ Supabase credentials missing. Using Mock Client.");
    supabaseClient = new Proxy({}, {
        get: (target, prop) => () => {
            console.warn(`Supabase method '${String(prop)}' called but credentials missing.`);
            return { data: null, error: { message: "Supabase credentials missing" } };
        }
    });
}

export const supabase = supabaseClient;
