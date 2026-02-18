import 'dotenv/config';
import { db } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`UPDATE company_settings SET form_config = NULL`);
  console.log('formConfig reset to NULL — new defaults will be used');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
