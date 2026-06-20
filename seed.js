const fs = require('fs');
const path = require('path');
const { db, initSchema } = require('./db');

// Helper to parse CSV lines taking quotes into account
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function seed() {
  console.log("Initializing database schema...");
  initSchema();

  // 1. Seed Scenarios
  console.log("Seeding default scenarios...");
  const defaultScenarios = [
    { name: 'X0001', scenario: 'The Way of Winter' },
    { name: 'PVE-01-0001', scenario: 'Manibus' },
    { name: 'PVP-01-0001', scenario: 'Prismverse\'s Clash' },
    { name: 'PVE-01-0002', scenario: 'Evolution\'s Call' },
    { name: 'Solo Tracking', scenario: 'Solo' }
  ];

  const insertServer = db.prepare(`
    INSERT OR IGNORE INTO servers (name, scenario_name) VALUES (?, ?)
  `);

  for (const s of defaultScenarios) {
    insertServer.run(s.name, s.scenario);
  }

  // 2. Seed Default Admin User
  // For simplicity in this demo, password is stored plaintext or with a simple mock hash.
  // We'll use a simple plain text string for the mock auth since security is not critical,
  // but we can also use bcrypt/crypto. Node.js has a built-in crypto module!
  const crypto = require('crypto');
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const passwordHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
  `);
  insertUser.run(adminUsername, passwordHash);
  console.log(`Default admin created: username: '${adminUsername}', password: '${adminPassword}'`);

  // 3. Seed Recipes from CSV
  const csvPath = path.join(__dirname, 'once_human_crafting_formulas.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split(/\r?\n/);
  
  if (lines.length < 2) {
    console.error("CSV file is empty or missing headers");
    return;
  }

  // Verify headers
  const headers = parseCSVLine(lines[0]);
  console.log("CSV Headers parsed:", headers);

  const insertRecipe = db.prepare(`
    INSERT OR IGNORE INTO recipes (
      item_name, formula, category, reverse_engineering_points, acquired_by, is_approved
    ) VALUES (?, ?, ?, ?, ?, 1)
  `);

  let count = 0;
  // Start from line 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    if (columns.length < 3) continue; // Must have at least item, formula, category

    const item_name = columns[0];
    const formula = columns[1] || '';
    const category = columns[2] || '';
    const repPoints = columns[3] ? parseInt(columns[3], 10) : null;
    const reverse_engineering_points = isNaN(repPoints) ? null : repPoints;
    const acquired_by = columns[4] || '';

    try {
      insertRecipe.run(item_name, formula, category, reverse_engineering_points, acquired_by);
      count++;
    } catch (err) {
      console.error(`Failed to insert recipe: ${item_name}`, err);
    }
  }

  console.log(`Database seeding completed! Seeded ${count} recipes.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
