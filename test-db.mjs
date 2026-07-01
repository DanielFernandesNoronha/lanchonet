import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://odvxkwqrtggirlszvafy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdnhrd3FydGdnaXJsc3p2YWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzM5ODUsImV4cCI6MjA5Njk0OTk4NX0.4lwpVCuZ5PIjLUQO7D5qMBHvzUmeM8s7A71KWlmzRu4'
);

async function test() {
  const { data, error } = await supabase
    .from('lojistas')
    .select('id, nome, slug, status_assinatura, trial_expira_em')
    .eq('slug', 'budulanches')
    .single();

  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

test();
