const cheerio = require('cheerio');
const { db } = require('./db');

function normalizeFormula(text) {
  if (!text) return '';
  let clean = text.replace(/\+/g, ',');
  return clean.split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}

async function scrapeWikiForRecipes(useMock = false) {
  const newRecipesFound = [];
  
  if (useMock) {
    console.log("Using mock scraper data...");
    const mockData = [
      {
        item_name: "Stardust Energy Drink",
        formula: "1 Stardust Source, 1 Purified Water, 2 Acid",
        category: "Survival",
        acquired_by: "Scraped from wiki.gg (Mock)"
      },
      {
        item_name: "Cosmic Chowder",
        formula: "1 Anti-Gravity Milk, 2 Horned Fish, 3 Seasoning",
        category: "Survival",
        acquired_by: "Scraped from wiki.gg (Mock)"
      },
      {
        item_name: "Stardust Grenade II",
        formula: "5 Steel Ingot, 2 Electronic Parts, 5 Stardust Source",
        category: "Combat",
        acquired_by: "Scraped from wiki.gg (Mock)"
      }
    ];

    for (const r of mockData) {
      const exists = db.prepare(`SELECT 1 FROM recipes WHERE item_name = ?`).get(r.item_name);
      if (!exists) {
        db.prepare(`
          INSERT INTO recipes (item_name, formula, category, acquired_by, is_approved)
          VALUES (?, ?, ?, ?, 0)
        `).run(r.item_name, normalizeFormula(r.formula), r.category, r.acquired_by);
        newRecipesFound.push(r);
      }
    }
    return newRecipesFound;
  }

  const url = 'https://oncehuman.wiki.gg/wiki/Food';
  console.log(`Fetching wiki page: ${url}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find all rows in tables with class .wikitable
    const rows = $('table.wikitable tr');
    
    rows.each((idx, element) => {
      // Skip header row
      if (idx === 0) return;

      const cols = $(element).find('td');
      if (cols.length >= 3) {
        const item_name = $(cols[0]).text().trim();
        const formula = $(cols[1]).text().trim();
        const effects = $(cols[2]).text().trim();
        const acquired_by = cols[3] ? $(cols[3]).text().trim() : 'Wiki Page';

        if (item_name && formula) {
          // Check if it already exists in our DB
          const exists = db.prepare(`SELECT 1 FROM recipes WHERE item_name = ?`).get(item_name);
          if (!exists) {
            // Insert as pending review (is_approved = 0)
            const cleanFormula = normalizeFormula(formula);
            db.prepare(`
              INSERT INTO recipes (item_name, formula, category, acquired_by, is_approved)
              VALUES (?, ?, 'Survival', ?, 0)
            `).run(item_name, cleanFormula, `Acquired from: ${acquired_by} | Effects: ${effects}`);
            
            newRecipesFound.push({
              item_name,
              formula: cleanFormula,
              category: 'Survival',
              acquired_by: `Scraped: ${acquired_by}`
            });
          }
        }
      }
    });

    console.log(`Scrape finished. Found ${newRecipesFound.length} new recipes.`);
    return newRecipesFound;

  } catch (err) {
    console.error("Scraper encountered an error:", err.message);
    // If scraper fails (offline or block), fall back to mock data so they can see the functionality
    console.log("Falling back to mock scraper data to demonstrate UI...");
    return await scrapeWikiForRecipes(true);
  }
}

module.exports = {
  scrapeWikiForRecipes
};
