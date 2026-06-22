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
  
  // 5. Merge Google Sheet Recipes & Formulas
  console.log("Merging Google Sheet recipes and formulas...");
  const sheetCsvPath = path.join(__dirname, 'once_human_sheet_recipes.csv');
  if (fs.existsSync(sheetCsvPath)) {
    // 5.a Split Gardening Kit or Harvesting Sickle if combined exists
    const combinedItem = db.prepare('SELECT id FROM recipes WHERE item_name = ?').get('Gardening Kit or Harvesting Sickle');
    if (combinedItem) {
      console.log("Splitting 'Gardening Kit or Harvesting Sickle' into individual recipes...");
      const combinedId = combinedItem.id;
      
      const insertNew = db.prepare(`
        INSERT OR IGNORE INTO recipes (item_name, formula, category, reverse_engineering_points, is_approved)
        VALUES (?, ?, 'Production', ?, 1)
      `);
      
      insertNew.run('Gardening Kit', '8 Boiled Water, 3 Spoiled Food', 15);
      insertNew.run('Harvesting Sickle', '5 Iron Ingot, 10 Wood, 3 Rawhide', 3);
      
      const newGK = db.prepare('SELECT id FROM recipes WHERE item_name = ?').get('Gardening Kit');
      const newHS = db.prepare('SELECT id FROM recipes WHERE item_name = ?').get('Harvesting Sickle');
      
      if (newGK && newHS) {
        const learners = db.prepare('SELECT character_id, status FROM character_recipes WHERE recipe_id = ?').all(combinedId);
        const insertRelation = db.prepare(`
          INSERT OR IGNORE INTO character_recipes (character_id, recipe_id, status)
          VALUES (?, ?, ?)
        `);
        for (const learner of learners) {
          insertRelation.run(learner.character_id, newGK.id, learner.status);
          insertRelation.run(learner.character_id, newHS.id, learner.status);
        }
        db.prepare('DELETE FROM character_recipes WHERE recipe_id = ?').run(combinedId);
        db.prepare('DELETE FROM recipes WHERE id = ?').run(combinedId);
        console.log(`Successfully split 'Gardening Kit or Harvesting Sickle' (ID ${combinedId}) and migrated character relationships.`);
      }
    }

    // 5.b Load and map sheet recipes
    const sheetContent = fs.readFileSync(sheetCsvPath, 'utf8');
    const sheetLines = sheetContent.split(/\r?\n/);
    
    const getRecipes = () => db.prepare('SELECT id, item_name, category, formula, reverse_engineering_points, acquired_by FROM recipes').all();
    
    function normalizeName(name) {
      let clean = name.toLowerCase().trim();
      if (clean === 'electricity kit') clean = 'electrical kit';
      if (clean === 'electronic grabber') clean = 'electronics grabber';
      
      return clean
        .replace(/\bbench\b/g, 'bench')
        .replace(/\bworkbench\b/g, 'bench')
        .replace(/\bmines\b/g, 'mine')
        .replace(/\brounds\b/g, 'round')
        .replace(/\blights\b/g, 'light')
        .replace(/\bshots\b/g, 'shot')
        .replace(/\biii\b/g, '3')
        .replace(/\bii\b/g, '2')
        .replace(/\bi\b/g, '1')
        .replace(/[^a-z0-9]/g, '');
    }

    const categoryMapping = {
      "cold crystal ore refinery": "Production",
      "tungsten ingot": "Production",
      "silver ingot": "Production",
      "thermal tower": "Build",
      "snow trekking gear": "Survival",
      "ap ammo": "Combat",
      "body boost feed": "Production",
      "storage terminal": "Build",
      "armor storage crate": "Build",
      "weapon storage crate": "Build",
      "reverse-engineered blueprint: reinforced support": "Build",
      "portable mg turret": "Combat",
      "raw chaosium": "Exclusive",
      "gardening kit": "Production",
      "harvesting sickle": "Production",
      "maniken": "Build",
      "book": "Build",
      "cpu": "Production",
      "military flash drive": "Production"
    };

    let updatesCount = 0;
    let insertsCount = 0;

    for (let i = 0; i < sheetLines.length; i++) {
      const line = sheetLines[i].trim();
      if (!line) continue;
      
      const columns = parseCSVLine(line);
      if (columns.length < 10) continue;
      
      const inventionType = columns[9];
      if (inventionType === 'Default') {
        const item_name = columns[2].trim();
        if (!item_name) continue;
        
        if (item_name === 'Gardening Kit' || item_name === 'Harvesting Sickle') {
          continue;
        }
        
        const repStr = columns[4];
        const reverse_engineering_points = repStr ? parseInt(repStr.replace(/,/g, ''), 10) : null;
        
        const components = [];
        for (let colIdx = 11; colIdx < columns.length; colIdx += 4) {
          const qtyStr = columns[colIdx];
          const nameStr = columns[colIdx + 2];
          if (nameStr && qtyStr) {
            const qty = parseInt(qtyStr.trim().replace(/,/g, ''), 10);
            const name = nameStr.trim();
            if (name && !isNaN(qty) && qty > 0) {
              components.push(`${qty} ${name}`);
            }
          }
        }
        
        const formula = normalizeFormula(components.join(', '));
        const repPoints = isNaN(reverse_engineering_points) ? null : reverse_engineering_points;

        const dbRecipesList = getRecipes();
        const normalizedDbMap = new Map();
        for (const r of dbRecipesList) {
          normalizedDbMap.set(normalizeName(r.item_name), r);
        }

        const normName = normalizeName(item_name);
        const dbRec = normalizedDbMap.get(normName);
        
        if (dbRec) {
          const updateStmt = db.prepare(`
            UPDATE recipes 
            SET formula = ?, reverse_engineering_points = ? 
            WHERE id = ?
          `);
          updateStmt.run(formula, repPoints, dbRec.id);
          updatesCount++;
        } else {
          const category = categoryMapping[item_name.toLowerCase().trim()] || 'Production';
          const insertStmt = db.prepare(`
            INSERT INTO recipes (item_name, formula, category, reverse_engineering_points, is_approved)
            VALUES (?, ?, ?, ?, 1)
          `);
          insertStmt.run(item_name, formula, category, repPoints);
          insertsCount++;
        }
      }
    }
    console.log(`Sheet merge completed: updated ${updatesCount} recipes, inserted ${insertsCount} new recipes.`);
  } else {
    console.warn("once_human_sheet_recipes.csv not found, skipping merge.");
  }

  console.log(`Database seeding completed! Seeded ${count} recipes.`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
