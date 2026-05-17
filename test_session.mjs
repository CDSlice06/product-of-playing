import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tspmqygpqaobkjccwskg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcG1xeWdwcWFvYmtqY2N3c2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjYxMTEsImV4cCI6MjA5NDU0MjExMX0.DL5e0oq5sLfVKUHn-ztak24s4b-YIsCWvVHROPw8sVs'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
    }
})

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'u-dGVzdHVzZXI@players.arcane.local',
    password: 'password123',
  })
  
  console.log("Sign in:", error ? error.message : "Success")
  
  const { data: sessionData } = await supabase.auth.getSession()
  console.log("Session immediately after:", sessionData.session ? "Exists" : "Null")
}

test()