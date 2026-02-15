import { db } from '../server/db';
import { companySettings } from '../shared/schema';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for company_settings...\n');
    
    const settings = await db.select().from(companySettings);
    
    if (settings.length === 0) {
      console.log('❌ NO DATA FOUND in company_settings table!');
      console.log('The table is empty.\n');
    } else {
      console.log(`✅ Found ${settings.length} row(s) in company_settings:\n`);
      settings.forEach((row, idx) => {
        console.log(`Row ${idx + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Company Name: ${row.companyName || '(empty)'}`);
        console.log(`  Hero Title: ${row.heroTitle || '(empty)'}`);
        console.log(`  Hero Subtitle: ${row.heroSubtitle || '(empty)'}`);
        console.log(`  Hero Image URL: ${row.heroImageUrl || '(empty)'}`);
        console.log(`  Hero Background Image URL: ${row.heroBackgroundImageUrl || '(empty)'}`);
        console.log(`  CTA Text: ${row.ctaText || '(empty)'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();
