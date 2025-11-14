import path from "path";
import dotenv from "dotenv";

// Load your test env
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL!;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;