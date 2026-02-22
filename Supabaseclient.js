require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL)
  throw new Error("SUPABASE_URL is missing in .env file");
if (!process.env.SUPABASE_ANON_KEY)
  throw new Error("SUPABASE_ANON_KEY is missing in .env file");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

module.exports = { supabase };
