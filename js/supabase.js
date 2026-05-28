// js/supabase.js
const SUPABASE_URL = 'https://vvaaeoiplfdxatwjcffj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2YWFlb2lwbGZkeGF0d2pjZmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDY4MzYsImV4cCI6MjA5NTMyMjgzNn0.Q9Sn3RNzJSXn01XfaFfKX_yH8Oyfz07qaUimF30BMsw';

// Importa o cliente Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
