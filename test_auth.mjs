import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tspmqygpqaobkjccwskg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcG1xeWdwcWFvYmtqY2N3c2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjYxMTEsImV4cCI6MjA5NDU0MjExMX0.DL5e0oq5sLfVKUHn-ztak24s4b-YIsCWvVHROPw8sVs'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function toBase64Url(value) {
  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  utf8.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const username = "中文玩家"
const password = "password123"
const email = `u-${toBase64Url(username)}@players.arcane.local`

async function test() {
  console.log("Signing in...", email)
  const res = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  console.log("Sign in res:", res.error || "Success")
}

test()