import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tspmqygpqaobkjccwskg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcG1xeWdwcWFvYmtqY2N3c2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjYxMTEsImV4cCI6MjA5NDU0MjExMX0.DL5e0oq5sLfVKUHn-ztak24s4b-YIsCWvVHROPw8sVs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'u-dGVzdHVzZXI@players.arcane.local',
    password: 'password123',
  })
  
  console.log("Sign in:", error ? error.message : "Success")
  
  if (data.user) {
    const payload = {
        id: data.user.id,
        username: "testuser",
        display_name: "testuser",
        rating_points: 0,
        rank_tier: "Bronze",
        wins: 0,
        losses: 0,
        status: "online",
        updated_at: new Date().toISOString(),
      };
    
      const { error: upsertError } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });
      console.log("Profile insert error:", upsertError)
  }
}

test()