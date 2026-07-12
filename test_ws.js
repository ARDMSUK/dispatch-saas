const { createClient } = require('@supabase/supabase-js');
const url = 'https://ynhnlsrylhrpyoqglpvc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaG5sc3J5bGhycHlvcWdscHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDM4MTQsImV4cCI6MjA5ODUxOTgxNH0.YjJyst6f7rjeqIhl-t0uEp-ltic4eqH9tWwkBMD-9tY';
const supabase = createClient(url, key);
const channel = supabase.channel('test-channel');
channel.subscribe((status) => {
  console.log("Status:", status);
  if(status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
    process.exit(0);
  }
});
