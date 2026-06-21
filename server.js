const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { db, initSchema } = require('./db');
const { scrapeWikiForRecipes } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 6660;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database schema
initSchema();

// Ensure Admin user exists with correct role and password hash on startup
function ensureAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  try {
    const existingAdmin = db.prepare(`SELECT id, role FROM users WHERE username = ?`).get(adminUsername);
    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
      `).run(adminUsername, passwordHash);
      console.log(`Default admin user ensured: '${adminUsername}'`);
    } else {
      db.prepare(`
        UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?
      `).run(passwordHash, existingAdmin.id);
      console.log(`Admin user verified and updated on startup: '${adminUsername}'`);
    }
  } catch (err) {
    console.error("Failed to ensure admin user on startup:", err);
  }
}
ensureAdminUser();

// Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Authentication Middleware
function authenticate(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const session = db.prepare(`
    SELECT s.token, u.id, u.username, u.role 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.token = ?
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = {
    id: session.id,
    username: session.username,
    role: session.role
  };
  next();
}

// Admin checking middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
  next();
}

/* ================= AUTHENTICATION ROUTES ================= */

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const password_hash = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')
    `).run(username, password_hash);
    
    res.status(201).json({ message: 'Registration successful', userId: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const password_hash = hashPassword(password);
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? AND password_hash = ?
    `).get(username, password_hash);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = crypto.randomUUID();
    db.prepare(`
      INSERT INTO sessions (token, user_id) VALUES (?, ?)
    `).run(token, user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  const token = req.headers['x-auth-token'];
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});


/* ================= SERVER & SCENARIO ROUTES ================= */

// List all scenarios and servers
app.get('/api/servers', (req, res) => {
  try {
    const servers = db.prepare('SELECT * FROM servers ORDER BY scenario_name, name').all();
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create scenario / server dynamically
app.post('/api/servers', authenticate, (req, res) => {
  const { name, scenario_name } = req.body;
  if (!name || !scenario_name) {
    return res.status(400).json({ error: 'Server name and Scenario name are required' });
  }

  try {
    db.prepare(`
      INSERT OR IGNORE INTO servers (name, scenario_name) VALUES (?, ?)
    `).run(name, scenario_name);

    const server = db.prepare(`
      SELECT * FROM servers WHERE name = ? AND scenario_name = ?
    `).get(name, scenario_name);

    res.status(201).json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ================= GUILD ROUTES ================= */

// Create a Guild
app.post('/api/guilds', authenticate, (req, res) => {
  const { name, join_passcode } = req.body;
  if (!name || !join_passcode) {
    return res.status(400).json({ error: 'Guild name and passcode are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO guilds (name, join_passcode, creator_id) VALUES (?, ?, ?)
    `).run(name, join_passcode, req.user.id);

    res.status(201).json({ guildId: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Guild name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// List all Guilds (simple search / list)
app.get('/api/guilds', authenticate, (req, res) => {
  try {
    const guilds = db.prepare('SELECT id, name FROM guilds ORDER BY name').all();
    res.json(guilds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Guild Details & Member List
app.get('/api/guilds/:id', authenticate, (req, res) => {
  const guildId = req.params.id;

  try {
    const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const members = db.prepare(`
      SELECT c.id, c.name, c.level, u.username as owner_name, s.name as server_name, s.scenario_name
      FROM characters c
      JOIN users u ON c.user_id = u.id
      JOIN servers s ON c.server_id = s.id
      WHERE c.guild_id = ?
      ORDER BY c.name
    `).all(guildId);

    const isCreator = guild.creator_id === req.user.id;

    res.json({
      id: guild.id,
      name: guild.name,
      creator_id: guild.creator_id,
      is_creator: isCreator,
      // Only return the passcode to the creator
      join_passcode: isCreator ? guild.join_passcode : null,
      members
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Guild passcode (Creator only)
app.put('/api/guilds/:id/passcode', authenticate, (req, res) => {
  const guildId = req.params.id;
  const { join_passcode } = req.body;

  if (!join_passcode) {
    return res.status(400).json({ error: 'New passcode is required' });
  }

  try {
    const guild = db.prepare('SELECT creator_id FROM guilds WHERE id = ?').get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (guild.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Only the guild creator can change the passcode' });
    }

    db.prepare('UPDATE guilds SET join_passcode = ? WHERE id = ?').run(join_passcode, guildId);
    res.json({ message: 'Guild passcode updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kick member from Guild (Creator only)
app.post('/api/guilds/:id/kick', authenticate, (req, res) => {
  const guildId = req.params.id;
  const { character_id } = req.body;

  if (!character_id) {
    return res.status(400).json({ error: 'character_id is required' });
  }

  try {
    const guild = db.prepare('SELECT creator_id FROM guilds WHERE id = ?').get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (guild.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Only the guild creator can kick members' });
    }

    const result = db.prepare('UPDATE characters SET guild_id = NULL WHERE id = ? AND guild_id = ?').run(character_id, guildId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found in this guild' });
    }

    res.json({ message: 'Character kicked from guild successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disband Guild (Creator only)
app.delete('/api/guilds/:id', authenticate, (req, res) => {
  const guildId = req.params.id;

  try {
    const guild = db.prepare('SELECT creator_id FROM guilds WHERE id = ?').get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (guild.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Only the guild creator can disband it' });
    }

    // 1. Remove all characters from this guild
    db.prepare('UPDATE characters SET guild_id = NULL WHERE guild_id = ?').run(guildId);

    // 2. Delete the guild
    db.prepare('DELETE FROM guilds WHERE id = ?').run(guildId);

    res.json({ message: 'Guild disbanded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Guild Crafting Matrix
app.get('/api/guilds/:id/matrix', authenticate, (req, res) => {
  const guildId = req.params.id;
  const serverId = req.query.server_id; // Filter matrix by active Server/Scenario

  try {
    // 1. Get all active characters in this guild
    let query = `
      SELECT c.*, u.username as owner_name, s.name as server_name, s.scenario_name
      FROM characters c
      JOIN users u ON c.user_id = u.id
      JOIN servers s ON c.server_id = s.id
      WHERE c.guild_id = ? AND c.is_active = 1
    `;
    const params = [guildId];

    if (serverId) {
      query += ` AND c.server_id = ?`;
      params.push(serverId);
    }

    const characters = db.prepare(query).all(params);

    // 2. Get all approved recipes
    const recipes = db.prepare(`
      SELECT * FROM recipes WHERE is_approved = 1 ORDER BY category, item_name
    `).all();

    // 3. Get recipe states for all these characters
    const characterIds = characters.map(c => c.id);
    let recipeStates = [];
    
    if (characterIds.length > 0) {
      const placeholders = characterIds.map(() => '?').join(',');
      recipeStates = db.prepare(`
        SELECT character_id, recipe_id, status 
        FROM character_recipes 
        WHERE character_id IN (${placeholders})
      `).all(characterIds);
    }

    // Format states as map: character_id -> recipe_id -> status
    const stateMap = {};
    for (const row of recipeStates) {
      if (!stateMap[row.character_id]) {
        stateMap[row.character_id] = {};
      }
      stateMap[row.character_id][row.recipe_id] = row.status;
    }

    res.json({
      characters,
      recipes,
      stateMap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ================= CHARACTER ROUTES ================= */

// Get current user's alts / characters
app.get('/api/characters', authenticate, (req, res) => {
  try {
    const characters = db.prepare(`
      SELECT c.*, s.name as server_name, s.scenario_name, g.name as guild_name
      FROM characters c
      JOIN servers s ON c.server_id = s.id
      LEFT JOIN guilds g ON c.guild_id = g.id
      WHERE c.user_id = ?
    `).all(req.user.id);
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Character (Alt)
app.post('/api/characters', authenticate, (req, res) => {
  const { name, server_id, guild_id, join_passcode } = req.body;
  if (!name || !server_id) {
    return res.status(400).json({ error: 'Character name and Server are required' });
  }

  try {
    let finalGuildId = null;
    
    // If attempting to join a guild during creation, verify passcode
    if (guild_id) {
      const guild = db.prepare('SELECT id, join_passcode FROM guilds WHERE id = ?').get(guild_id);
      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }
      if (guild.join_passcode !== join_passcode) {
        return res.status(401).json({ error: 'Invalid guild passcode' });
      }
      finalGuildId = guild.id;
    }

    const result = db.prepare(`
      INSERT INTO characters (user_id, guild_id, server_id, name, level, is_active)
      VALUES (?, ?, ?, ?, 1, 1)
    `).run(req.user.id, finalGuildId, server_id, name);

    res.status(201).json({ characterId: result.lastInsertRowid, name });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A character with this name already exists on this server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update / Join Guild for character
app.post('/api/characters/:id/join-guild', authenticate, (req, res) => {
  const characterId = req.params.id;
  const { guild_id, join_passcode } = req.body;

  try {
    // Verify character ownership
    const char = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?').get(characterId, req.user.id);
    if (!char) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }

    if (!guild_id) {
      // Leave guild
      db.prepare('UPDATE characters SET guild_id = NULL WHERE id = ?').run(characterId);
      return res.json({ message: 'Left guild successfully' });
    }

    const guild = db.prepare('SELECT id, join_passcode FROM guilds WHERE id = ?').get(guild_id);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    if (guild.join_passcode !== join_passcode) {
      return res.status(401).json({ error: 'Invalid guild passcode' });
    }

    db.prepare('UPDATE characters SET guild_id = ? WHERE id = ?').run(guild.id, characterId);
    res.json({ message: 'Successfully joined guild' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migrate / Reset Character Scenario
app.post('/api/characters/:id/migrate', authenticate, (req, res) => {
  const characterId = req.params.id;
  const { server_id } = req.body;
  if (!server_id) {
    return res.status(400).json({ error: 'Target server is required for migration' });
  }

  try {
    // Verify character ownership
    const char = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?').get(characterId, req.user.id);
    if (!char) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }

    // 1. Reset recipes
    db.prepare('DELETE FROM character_recipes WHERE character_id = ?').run(characterId);
    
    // 2. Set level to 1 and update server
    db.prepare('UPDATE characters SET server_id = ?, level = 1 WHERE id = ?').run(server_id, characterId);

    res.json({ message: 'Character successfully migrated to new scenario and progress reset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete character
app.delete('/api/characters/:id', authenticate, (req, res) => {
  const characterId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM characters WHERE id = ? AND user_id = ?').run(characterId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found or access denied' });
    }
    res.json({ message: 'Character deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get character specializations
app.get('/api/characters/:id/specializations', authenticate, (req, res) => {
  const characterId = req.params.id;
  try {
    const specs = db.prepare('SELECT specialization_name FROM character_specializations WHERE character_id = ?').all(characterId);
    res.json(specs.map(s => s.specialization_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update character specializations
app.post('/api/characters/:id/specializations', authenticate, (req, res) => {
  const characterId = req.params.id;
  const { specializations } = req.body;

  if (!Array.isArray(specializations)) {
    return res.status(400).json({ error: 'specializations must be an array of strings' });
  }

  try {
    // Verify ownership
    const char = db.prepare('SELECT 1 FROM characters WHERE id = ? AND user_id = ?').get(characterId, req.user.id);
    if (!char) {
      return res.status(403).json({ error: 'Access denied to character' });
    }

    db.prepare('DELETE FROM character_specializations WHERE character_id = ?').run(characterId);

    const insertSpec = db.prepare('INSERT INTO character_specializations (character_id, specialization_name) VALUES (?, ?)');
    for (const specName of specializations) {
      insertSpec.run(characterId, specName);
    }

    res.json({ message: 'Specializations updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get guild specializations
app.get('/api/guilds/:id/specializations', authenticate, (req, res) => {
  const guildId = req.params.id;
  try {
    const guildSpecs = db.prepare(`
      SELECT cs.specialization_name, c.id as character_id, c.name as character_name
      FROM character_specializations cs
      JOIN characters c ON cs.character_id = c.id
      WHERE c.guild_id = ?
    `).all(guildId);
    res.json(guildSpecs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ================= RECIPE STATE ROUTES ================= */

// List recipes (optionally returning status for a specific character)
app.get('/api/recipes', authenticate, (req, res) => {
  const characterId = req.query.character_id;
  try {
    let recipes;
    if (characterId) {
      // Return recipes with a status column for the character
      recipes = db.prepare(`
        SELECT r.*, cr.status
        FROM recipes r
        LEFT JOIN character_recipes cr ON r.id = cr.recipe_id AND cr.character_id = ?
        WHERE r.is_approved = 1
        ORDER BY r.category, r.item_name
      `).all(characterId);
    } else {
      recipes = db.prepare('SELECT * FROM recipes WHERE is_approved = 1 ORDER BY category, item_name').all();
    }
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set recipe status for a character (toggle learned/learning/unlearned)
app.post('/api/recipes/:recipeId/status', authenticate, (req, res) => {
  const recipeId = req.params.recipeId;
  const { character_id, status } = req.body; // status: 'learned', 'learning', or null (to delete)

  if (!character_id) {
    return res.status(400).json({ error: 'character_id is required' });
  }

  try {
    // Verify character ownership
    const char = db.prepare('SELECT 1 FROM characters WHERE id = ? AND user_id = ?').get(character_id, req.user.id);
    if (!char) {
      return res.status(403).json({ error: 'Unauthorized access to character' });
    }

    if (!status) {
      // Remove recipe progress
      db.prepare('DELETE FROM character_recipes WHERE character_id = ? AND recipe_id = ?').run(character_id, recipeId);
      return res.json({ message: 'Recipe progress removed' });
    }

    // Insert or update status
    db.prepare(`
      INSERT INTO character_recipes (character_id, recipe_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(character_id, recipe_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
    `).run(character_id, recipeId, status);

    res.json({ message: `Recipe marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a recipe custom
app.post('/api/recipes', authenticate, (req, res) => {
  const { item_name, formula, category, acquired_by, submit_to_global } = req.body;
  if (!item_name || !category) {
    return res.status(400).json({ error: 'Item name and Category are required' });
  }

  try {
    const isApproved = submit_to_global ? 0 : 1; // 0 goes to admin queue, 1 is local immediately available

    const result = db.prepare(`
      INSERT INTO recipes (item_name, formula, category, acquired_by, is_approved, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(item_name, formula || '', category, acquired_by || '', isApproved, req.user.id);

    res.status(201).json({
      recipeId: result.lastInsertRowid,
      item_name,
      is_approved: isApproved,
      message: submit_to_global
        ? 'Recipe submitted and pending global moderator approval.'
        : 'Recipe created locally.'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Recipe with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});


/* ================= ADMIN & SCRAPER ROUTES ================= */

// List pending recipes (Admin only)
app.get('/api/admin/pending-recipes', authenticate, requireAdmin, (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT r.*, u.username as submitter_name
      FROM recipes r
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE r.is_approved = 0
      ORDER BY r.item_name
    `).all();
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve pending recipe (Admin only)
app.post('/api/admin/approve-recipe/:id', authenticate, requireAdmin, (req, res) => {
  const recipeId = req.params.id;
  try {
    const result = db.prepare('UPDATE recipes SET is_approved = 1 WHERE id = ?').run(recipeId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pending recipe not found' });
    }
    res.json({ message: 'Recipe approved and added to global catalog' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject/Delete recipe (Admin only)
app.delete('/api/admin/reject-recipe/:id', authenticate, requireAdmin, (req, res) => {
  const recipeId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe rejected and deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Web Scrape (Admin only)
app.post('/api/admin/scrape', authenticate, requireAdmin, async (req, res) => {
  const { use_mock } = req.body;
  try {
    const newRecipes = await scrapeWikiForRecipes(use_mock);
    res.json({
      message: `Scrape complete. Found ${newRecipes.length} new recipes needing approval.`,
      newRecipes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Scenario (Admin only)
app.post('/api/admin/reset-scenario', authenticate, requireAdmin, (req, res) => {
  const { server_id } = req.body;
  if (!server_id) {
    return res.status(400).json({ error: 'server_id is required' });
  }

  try {
    // Get all characters in that server
    const characters = db.prepare('SELECT id FROM characters WHERE server_id = ?').all(server_id);
    const characterIds = characters.map(c => c.id);

    if (characterIds.length > 0) {
      const placeholders = characterIds.map(() => '?').join(',');
      
      // Wipe character recipes
      db.prepare(`DELETE FROM character_recipes WHERE character_id IN (${placeholders})`).run(characterIds);
      
      // Reset level to 1
      db.prepare(`UPDATE characters SET level = 1 WHERE id IN (${placeholders})`).run(characterIds);
    }

    res.json({ message: `Successfully reset scenario server progress. Reset ${characterIds.length} characters.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Server (Admin only)
app.delete('/api/admin/servers/:id', authenticate, requireAdmin, (req, res) => {
  const serverId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM servers WHERE id = ?').run(serverId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ message: 'Server deleted successfully from database' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to infer Once Human scenario from server name prefix
function inferScenario(serverName, fallbackScenario) {
  const upper = serverName.toUpperCase();
  
  if (upper.includes('MANIBUS')) {
    return 'Manibus';
  }
  if (upper.includes('E_DREAM') || upper.includes('EDREAM') || upper.includes('ENDLESS_DREAM')) {
    return 'Endless Dream';
  }
  if (upper.includes('WINTER') || upper.includes('WAY_OF_WINTER')) {
    return 'The Way of Winter';
  }
  if (upper.includes('PRISM') || upper.includes('PRISMVERSE')) {
    return "Prismverse's Clash";
  }
  if (upper.includes('P_CLASH') || upper.includes('P-CLASH') || upper.includes('PCLASH')) {
    return "Prism Clash";
  }
  if (upper.includes('EVOLUTION') || upper.includes('EVOLUTIONS_CALL') || upper.includes('EVOLUTION_CALL')) {
    return "Evolution's Call";
  }
  if (upper.includes('NOVICE')) {
    return 'Novice';
  }

  // Attempt to parse general prefix before the suffix
  // e.g. "SCENARIO-X0001", "SCENARIO_S-00001", "SCENARIO-PVE-01-0001"
  const prefixMatch = serverName.match(/^([A-Z0-9_]+?)(?:-|_)[XYAS]\d+/i) || 
                      serverName.match(/^([A-Z0-9_]+?)(?:-|_)[XYAS][-_]\d+/i) ||
                      serverName.match(/^([A-Z0-9_]+?)(?:-|_)(?:PVE|PVP)(?:-|_)(?:[A-Z0-9]{2,5}(?:-|_))?\d+/i);
                      
  if (prefixMatch && prefixMatch[1]) {
    const rawPrefix = prefixMatch[1].toUpperCase();
    if (rawPrefix !== 'PVE' && rawPrefix !== 'PVP') {
      const words = rawPrefix.split(/_+|-+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      return words.join(' ');
    }
  }

  return fallbackScenario || 'Standard';
}

// Helper to clean formatting artifacts/run-together characters from parsed server codes
function cleanServerName(serverName) {
  const upper = serverName.toUpperCase();
  
  const knownKeywords = [
    'WAY_OF_WINTER',
    'WINTER',
    'MANIBUS',
    'E_DREAM',
    'EDREAM',
    'ENDLESS_DREAM',
    'PRISMVERSE',
    'PRISM',
    'P_CLASH',
    'EVOLUTION',
    'NOVICE_S',
    'NOVICE',
    'HARDCORE',
    'SOFTCORE',
    'VANILLA',
    'NORMAL',
    'HARD',
    'PVE',
    'PVP'
  ];
  
  for (const kw of knownKeywords) {
    const idx = upper.indexOf(kw);
    if (idx !== -1) {
      return serverName.substring(idx).toUpperCase();
    }
  }
  
  const shorthandMatch = serverName.match(/[XYAS][-_]?\d{4,6}/i);
  if (shorthandMatch) {
    return shorthandMatch[0].toUpperCase();
  }
  
  return serverName.toUpperCase();
}

// Harvest Server Codes from Raw text (Admin only)
app.post('/api/admin/harvest-servers', authenticate, requireAdmin, (req, res) => {
  const { scenario_name, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content is required for harvesting' });
  }

  const fallbackScenario = scenario_name || 'Standard';

  try {
    // Regexes to extract standard Once Human server strings
    const patterns = [
      /\b(?:PVE|PVP)[-_](?:[A-Z0-9]{2,5}[-_])?\d{1,2}[-_]\d{4,6}\b/gi,
      /\b(?:[A-Z0-9_]+[-_])?[XYAS][-_]?\d{4,6}\b/gi
    ];

    const foundServers = new Set();
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      while ((match = pattern.exec(text)) !== null) {
        const cleaned = cleanServerName(match[0]);
        if (cleaned) {
          foundServers.add(cleaned);
        }
      }
    }

    // 1. In-memory deduplication (longest names first, discard shorthands that are suffixes of longer names)
    const dedupedList = [];
    const sortedFound = Array.from(foundServers).sort((a, b) => b.length - a.length);
    for (const name of sortedFound) {
      const isSuffix = dedupedList.some(longerName => 
        longerName.endsWith('-' + name) || longerName.endsWith('_' + name)
      );
      if (!isSuffix) {
        dedupedList.push(name);
      }
    }

    // 2. Database level checks/updates across all scenarios
    const newServers = [];
    const existingServers = db.prepare(`
      SELECT id, name, scenario_name FROM servers
    `).all();

    const insertServer = db.prepare(`
      INSERT INTO servers (name, scenario_name) VALUES (?, ?)
    `);

    const updateServerName = db.prepare(`
      UPDATE servers SET name = ?, scenario_name = ? WHERE id = ?
    `);

    for (const serverName of dedupedList) {
      const scenario = inferScenario(serverName, fallbackScenario);
      let isDuplicate = false;
      let matchedServerId = null;
      let shouldUpdateName = false;

      for (const existing of existingServers) {
        // Match within same scenario or check for shorthand conversion
        if (existing.scenario_name === scenario || existing.scenario_name === 'Standard') {
          if (existing.name === serverName) {
            isDuplicate = true;
            break;
          }

          // DB has shorthand, incoming is full
          if (serverName.endsWith('-' + existing.name) || serverName.endsWith('_' + existing.name)) {
            matchedServerId = existing.id;
            shouldUpdateName = true;
            break;
          }

          // DB has full, incoming is shorthand
          if (existing.name.endsWith('-' + serverName) || existing.name.endsWith('_' + serverName)) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (shouldUpdateName && matchedServerId !== null) {
        updateServerName.run(serverName, scenario, matchedServerId);
        newServers.push(`${serverName} (Updated shorthand in '${scenario}')`);
        // Update local cache
        const ext = existingServers.find(e => e.id === matchedServerId);
        if (ext) {
          ext.name = serverName;
          ext.scenario_name = scenario;
        }
      } else if (!isDuplicate) {
        insertServer.run(serverName, scenario);
        newServers.push(`${serverName} ('${scenario}')`);
        existingServers.push({ name: serverName, scenario_name: scenario });
      }
    }

    res.json({
      message: `Scanned text. Found ${foundServers.size} raw codes. Registered/updated ${newServers.length} servers.`,
      newServers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Harvest Server Codes from Steam Announcements (Admin only)
app.post('/api/admin/harvest-steam-news', authenticate, requireAdmin, async (req, res) => {
  try {
    const appId = '2139460';
    const url = `http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=100&maxlength=100000&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Steam API returned status: ${response.status}`);
    }
    const data = await response.json();
    const newsItems = data.appnews.newsitems || [];
    
    const patterns = [
      /\b(?:PVE|PVP)[-_](?:[A-Z0-9]{2,5}[-_])?\d{1,2}[-_]\d{4,6}\b/gi,
      /\b(?:[A-Z0-9_]+[-_])?[XYAS][-_]?\d{4,6}\b/gi
    ];
    
    const harvested = [];
    const existingServers = db.prepare(`SELECT id, name, scenario_name FROM servers`).all();
    const insertServer = db.prepare(`INSERT INTO servers (name, scenario_name) VALUES (?, ?)`);
    const updateServerName = db.prepare(`UPDATE servers SET name = ?, scenario_name = ? WHERE id = ?`);
    
    let totalScanned = 0;
    
    for (const item of newsItems) {
      const content = item.contents || '';
      const foundInArticle = new Set();
      
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
          const cleaned = cleanServerName(match[0]);
          if (cleaned) {
            foundInArticle.add(cleaned);
          }
        }
      }
      
      if (foundInArticle.size === 0) continue;
      
      totalScanned++;
      
      const dedupedArticleCodes = [];
      const sortedCodes = Array.from(foundInArticle).sort((a, b) => b.length - a.length);
      for (const name of sortedCodes) {
        const isSuffix = dedupedArticleCodes.some(longerName => 
          longerName.endsWith('-' + name) || longerName.endsWith('_' + name)
        );
        if (!isSuffix) {
          dedupedArticleCodes.push(name);
        }
      }
      
      for (const serverName of dedupedArticleCodes) {
        const scenario = inferScenario(serverName, 'Standard');
        let isDuplicate = false;
        let matchedServerId = null;
        let shouldUpdateName = false;
        
        for (const existing of existingServers) {
          if (existing.scenario_name === scenario || existing.scenario_name === 'Standard') {
            if (existing.name === serverName) {
              isDuplicate = true;
              break;
            }
            
            if (serverName.endsWith('-' + existing.name) || serverName.endsWith('_' + existing.name)) {
              matchedServerId = existing.id;
              shouldUpdateName = true;
              break;
            }
            
            if (existing.name.endsWith('-' + serverName) || existing.name.endsWith('_' + serverName)) {
              isDuplicate = true;
              break;
            }
          }
        }
        
        if (shouldUpdateName && matchedServerId !== null) {
          updateServerName.run(serverName, scenario, matchedServerId);
          harvested.push(`${serverName} (Updated shorthand in '${scenario}')`);
          const ext = existingServers.find(e => e.id === matchedServerId);
          if (ext) {
            ext.name = serverName;
            ext.scenario_name = scenario;
          }
        } else if (!isDuplicate) {
          insertServer.run(serverName, scenario);
          harvested.push(`${serverName} ('${scenario}')`);
          existingServers.push({ name: serverName, scenario_name: scenario });
        }
      }
    }
    
    res.json({
      message: `Scanned the last 100 Steam announcements. Found ${totalScanned} articles containing server codes. Registered/updated ${harvested.length} servers.`,
      newServers: harvested
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🔥 Once Human Crafting Tracker Backend started!`);
  console.log(`👾 Port: ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
