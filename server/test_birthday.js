import { processBirthdayWishes } from './services/birthdayService.js';
import './db/db.js';

// Simple test to trigger birthday wishes
async function testBirthdayWishes() {
  try {
    console.log('🎂 Testing birthday wishes system...');
    const result = await processBirthdayWishes();
    console.log('✅ Birthday wishes result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testBirthdayWishes();