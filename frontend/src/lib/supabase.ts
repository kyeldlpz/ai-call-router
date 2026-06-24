import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yxwjhabsybpngvpyrvip.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4d2poYWJzeWJwbmd2cHlydmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDQ2NzIsImV4cCI6MjA5NzgyMDY3Mn0.yUcT-dGNBqw5xFSoVcqJDkCjokzzUdMYJ2dmmwejleM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
