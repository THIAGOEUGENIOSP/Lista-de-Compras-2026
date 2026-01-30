// ✅ Coloque aqui a URL e a ANON KEY do seu projeto Supabase
// Supabase Dashboard -> Project Settings -> API

export const SUPABASE_URL = "https://kpgaywxqckwnixpzxnib.supabase.co";
export const SUPABASE_ANON_KEY =  
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ2F5d3hxY2t3bml4cHp4bmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTkwODQsImV4cCI6MjA4NTM3NTA4NH0.gOZk9bCMCv6MWp0GXgRRXjBeZR7TGC6zCZvNTY8xewQ";

export const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
