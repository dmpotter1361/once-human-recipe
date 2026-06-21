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

function normalizeFormula(text) {
  if (!text) return '';
  let clean = text.replace(/\+/g, ',');
  return clean.split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}

function seed() {
  console.log("Initializing database schema...");
  initSchema();

  // 1. Seed Scenarios & Servers
  console.log("Seeding scenarios and servers...");
  const seedJsonPath = path.join(__dirname, 'servers_seed.json');
  let serversToSeed = [
    { name: 'X0001', scenario_name: 'The Way of Winter' },
    { name: 'PVE-01-0001', scenario_name: 'Manibus' },
    { name: 'PVP-01-0001', scenario_name: "Prismverse's Clash" },
    { name: 'PVE-01-0002', scenario_name: "Evolution's Call" },
    { name: 'Solo Tracking', scenario_name: 'Solo' }
  ];

  if (fs.existsSync(seedJsonPath)) {
    try {
      const fileData = fs.readFileSync(seedJsonPath, 'utf8');
      serversToSeed = JSON.parse(fileData);
      console.log(`Loaded ${serversToSeed.length} servers from servers_seed.json`);
    } catch (err) {
      console.error("Failed to parse servers_seed.json, falling back to default list", err);
    }
  } else {
    console.log("servers_seed.json not found, seeding default list");
  }

  const insertServer = db.prepare(`
    INSERT OR IGNORE INTO servers (name, scenario_name) VALUES (?, ?)
  `);

  for (const s of serversToSeed) {
    insertServer.run(s.name, s.scenario_name);
  }

  const crypto = require('crypto');
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  const existingAdmin = db.prepare(`SELECT id, role FROM users WHERE username = ?`).get(adminUsername);
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
    `).run(adminUsername, passwordHash);
    console.log(`Default admin created: username: '${adminUsername}', password: '${adminPassword}'`);
  } else {
    db.prepare(`
      UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?
    `).run(passwordHash, existingAdmin.id);
    console.log(`Default admin verified/reset: username: '${adminUsername}', role forced to 'admin', password reset to default.`);
  }

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
    const formula = normalizeFormula(columns[1] || '');
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

  // 4. Normalize all existing formulas in the database (ensures existing DB updates without wipe)
  console.log("Normalizing all recipe formulas in the database...");
  const recipes = db.prepare(`SELECT id, formula FROM recipes`).all();
  const updateRecipeFormula = db.prepare(`UPDATE recipes SET formula = ? WHERE id = ?`);
  let normalizedCount = 0;
  for (const r of recipes) {
    const clean = normalizeFormula(r.formula);
    if (clean !== r.formula) {
      updateRecipeFormula.run(clean, r.id);
      normalizedCount++;
    }
  }
  console.log(`Normalized ${normalizedCount} existing recipe formulas.`);

  console.log(`Database seeding completed! Seeded ${count} recipes.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
