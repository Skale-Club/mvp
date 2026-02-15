import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hdscpbpkqntuktfewcsh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkc2NwYnBrcW50dWt0ZmV3Y3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA2NDUwNywiZXhwIjoyMDg2NjQwNTA3fQ.bzFqCW27gaatxHw4MUS4lCOtW_b-7iyD10dnOJvV32Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running migration: add_hero_background_image.sql\n');
    
    const migrationPath = join(process.cwd(), 'migrations', 'add_hero_background_image.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('Executing SQL:\n', sql, '\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   Added column: hero_background_image_url\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
