#!/usr/bin/env node

// Try to load dotenv, but don't fail if it's not available
try {
  require('dotenv').config();
} catch (e) {
  console.log('Note: dotenv not installed, using environment variables directly');
}

const prompts = require('prompts');
const fs = require('fs');
const path = require('path');
const { fetchSemrushKeywordsDomain, fetchSemrushKeywordsSubfolder } = require('../src/semrush-api');

// SEMrush database countries
const COUNTRIES = [
  { title: 'Afghanistan (af)', value: 'af' },
  { title: 'Albania (al)', value: 'al' },
  { title: 'Algeria (dz)', value: 'dz' },
  { title: 'Angola (ao)', value: 'ao' },
  { title: 'Argentina (ar)', value: 'ar' },
  { title: 'Armenia (am)', value: 'am' },
  { title: 'Australia (au)', value: 'au' },
  { title: 'Austria (at)', value: 'at' },
  { title: 'Azerbaijan (az)', value: 'az' },
  { title: 'Bahamas (bs)', value: 'bs' },
  { title: 'Bahrain (bh)', value: 'bh' },
  { title: 'Bangladesh (bd)', value: 'bd' },
  { title: 'Belarus (by)', value: 'by' },
  { title: 'Belgium (be)', value: 'be' },
  { title: 'Belize (bz)', value: 'bz' },
  { title: 'Bolivia (bo)', value: 'bo' },
  { title: 'Bosnia and Herzegovina (ba)', value: 'ba' },
  { title: 'Botswana (bw)', value: 'bw' },
  { title: 'Brazil (br)', value: 'br' },
  { title: 'Brunei (bn)', value: 'bn' },
  { title: 'Bulgaria (bg)', value: 'bg' },
  { title: 'Cabo Verde (cv)', value: 'cv' },
  { title: 'Cambodia (kh)', value: 'kh' },
  { title: 'Cameroon (cm)', value: 'cm' },
  { title: 'Canada (ca)', value: 'ca' },
  { title: 'Chile (cl)', value: 'cl' },
  { title: 'Colombia (co)', value: 'co' },
  { title: 'Congo (cg)', value: 'cg' },
  { title: 'Costa Rica (cr)', value: 'cr' },
  { title: 'Croatia (hr)', value: 'hr' },
  { title: 'Cyprus (cy)', value: 'cy' },
  { title: 'Czech Republic (cz)', value: 'cz' },
  { title: 'Denmark (dk)', value: 'dk' },
  { title: 'Dominican Republic (do)', value: 'do' },
  { title: 'Ecuador (ec)', value: 'ec' },
  { title: 'Egypt (eg)', value: 'eg' },
  { title: 'El Salvador (sv)', value: 'sv' },
  { title: 'Estonia (ee)', value: 'ee' },
  { title: 'Ethiopia (et)', value: 'et' },
  { title: 'Finland (fi)', value: 'fi' },
  { title: 'France (fr)', value: 'fr' },
  { title: 'Georgia (ge)', value: 'ge' },
  { title: 'Germany (de)', value: 'de' },
  { title: 'Ghana (gh)', value: 'gh' },
  { title: 'Greece (gr)', value: 'gr' },
  { title: 'Guatemala (gt)', value: 'gt' },
  { title: 'Guyana (gy)', value: 'gy' },
  { title: 'Haiti (ht)', value: 'ht' },
  { title: 'Honduras (hn)', value: 'hn' },
  { title: 'Hong Kong (hk)', value: 'hk' },
  { title: 'Hungary (hu)', value: 'hu' },
  { title: 'Iceland (is)', value: 'is' },
  { title: 'India (in)', value: 'in' },
  { title: 'Indonesia (id)', value: 'id' },
  { title: 'Ireland (ie)', value: 'ie' },
  { title: 'Israel (il)', value: 'il' },
  { title: 'Italy (it)', value: 'it' },
  { title: 'Jamaica (jm)', value: 'jm' },
  { title: 'Japan (jp)', value: 'jp' },
  { title: 'Jordan (jo)', value: 'jo' },
  { title: 'Kazakhstan (kz)', value: 'kz' },
  { title: 'Kuwait (kw)', value: 'kw' },
  { title: 'Latvia (lv)', value: 'lv' },
  { title: 'Lebanon (lb)', value: 'lb' },
  { title: 'Libya (ly)', value: 'ly' },
  { title: 'Lithuania (lt)', value: 'lt' },
  { title: 'Luxembourg (lu)', value: 'lu' },
  { title: 'Madagascar (mg)', value: 'mg' },
  { title: 'Malaysia (my)', value: 'my' },
  { title: 'Malta (mt)', value: 'mt' },
  { title: 'Mauritius (mu)', value: 'mu' },
  { title: 'Mexico (mx)', value: 'mx' },
  { title: 'Moldova (md)', value: 'md' },
  { title: 'Mongolia (mn)', value: 'mn' },
  { title: 'Montenegro (me)', value: 'me' },
  { title: 'Morocco (ma)', value: 'ma' },
  { title: 'Mozambique (mz)', value: 'mz' },
  { title: 'Namibia (na)', value: 'na' },
  { title: 'Nepal (np)', value: 'np' },
  { title: 'Netherlands (nl)', value: 'nl' },
  { title: 'New Zealand (nz)', value: 'nz' },
  { title: 'Nicaragua (ni)', value: 'ni' },
  { title: 'Nigeria (ng)', value: 'ng' },
  { title: 'Norway (no)', value: 'no' },
  { title: 'Oman (om)', value: 'om' },
  { title: 'Pakistan (pk)', value: 'pk' },
  { title: 'Paraguay (py)', value: 'py' },
  { title: 'Peru (pe)', value: 'pe' },
  { title: 'Philippines (ph)', value: 'ph' },
  { title: 'Poland (pl)', value: 'pl' },
  { title: 'Portugal (pt)', value: 'pt' },
  { title: 'Romania (ro)', value: 'ro' },
  { title: 'Russia (ru)', value: 'ru' },
  { title: 'Saudi Arabia (sa)', value: 'sa' },
  { title: 'Senegal (sn)', value: 'sn' },
  { title: 'Serbia (rs)', value: 'rs' },
  { title: 'Singapore (sg)', value: 'sg' },
  { title: 'Slovakia (sk)', value: 'sk' },
  { title: 'Slovenia (si)', value: 'si' },
  { title: 'South Africa (za)', value: 'za' },
  { title: 'South Korea (kr)', value: 'kr' },
  { title: 'Spain (es)', value: 'es' },
  { title: 'Sri Lanka (lk)', value: 'lk' },
  { title: 'Sweden (se)', value: 'se' },
  { title: 'Thailand (th)', value: 'th' },
  { title: 'Trinidad and Tobago (tt)', value: 'tt' },
  { title: 'Tunisia (tn)', value: 'tn' },
  { title: 'Turkey (tr)', value: 'tr' },
  { title: 'Ukraine (ua)', value: 'ua' },
  { title: 'United Arab Emirates (ae)', value: 'ae' },
  { title: 'United Kingdom (uk)', value: 'uk' },
  { title: 'United States (us)', value: 'us' },
  { title: 'Uruguay (uy)', value: 'uy' },
  { title: 'Venezuela (ve)', value: 've' },
  { title: 'Vietnam (vn)', value: 'vn' },
  { title: 'Zambia (zm)', value: 'zm' },
  { title: 'Zimbabwe (zw)', value: 'zw' }
];

async function main() {
  console.log('🔍 Keywords Cluster Topic Automation CLI\n');

  try {
    // Method selection
    const response1 = await prompts({
      type: 'select',
      name: 'method',
      message: 'Create project by:',
      choices: [
        { title: 'Domain', value: 'Domain' },
        { title: 'URL', value: 'URL' }
      ]
    });
    const method = response1.method;

    if (!method) {
      console.log('Operation cancelled');
      return;
    }

    // Get the actual domain or URL
    const response2 = await prompts({
      type: 'text',
      name: 'value',
      message: `Enter ${method}:`,
      validate: (input) => {
        if (!input.trim()) {
          return `Please enter a valid ${method.toLowerCase()}`;
        }
        if (method === 'URL' && !input.includes('://')) {
          return 'Please enter a complete URL including protocol (http:// or https://)';
        }
        return true;
      }
    });
    const value = response2.value;

    if (!value) {
      console.log('Operation cancelled');
      return;
    }

    // Get additional parameters
    const response3 = await prompts([
      {
        type: 'select',
        name: 'database',
        message: 'Select SEMrush database:',
        choices: COUNTRIES,
        initial: 0
      },
      {
        type: 'number',
        name: 'limit',
        message: 'Number of keywords to fetch:',
        initial: 10000,
        validate: (input) => input > 0 && input <= 10000 || 'Please enter a number between 1 and 10000'
      }
    ]);

    const { database, limit } = response3;

    if (!database || !limit) {
      console.log('Operation cancelled');
      return;
    }

    // Check for API key
    const apiKey = process.env.SEMRUSH_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: SEMRUSH_API_KEY environment variable is required');
      console.log('💡 Set it in your .env file or export SEMRUSH_API_KEY=your_key');
      process.exit(1);
    }

    console.log('\n🚀 Fetching SEMrush data...');
    
    let csvData;
    if (method === 'Domain') {
      csvData = await fetchSemrushKeywordsDomain({
        apiKey,
        target: value,
        database,
        limit
      });
    } else {
      csvData = await fetchSemrushKeywordsSubfolder({
        apiKey,
        subfolder: value,
        database,
        limit
      });
    }

    // Generate filename
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const csvFilename = `semrush_${sanitizedValue}_${timestamp}.csv`;

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save SEMrush data
    const csvPath = path.join(outputDir, csvFilename);
    fs.writeFileSync(csvPath, csvData, 'utf8');
    console.log(`✅ SEMrush data saved: ${csvPath}`);

    // Show summary
    const lines = csvData.split('\n').filter(Boolean);
    const keywordCount = lines.length - 1; // Subtract header
    
    console.log('\n📊 Summary:');
    console.log(`   Method: ${method}`);
    console.log(`   Target: ${value}`);
    console.log(`   Database: ${database}`);
    console.log(`   Keywords fetched: ${keywordCount}`);
    console.log(`   Output file: ${csvFilename}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { main };