# Once Human Crafting Tracker

[![Package version](https://img.shields.io/github/package-json/v/dmpotter1361/once-human-recipe?color=blue&label=version)](https://github.com/dmpotter1361/once-human-recipe/blob/main/package.json)

A premium, self-hosted companion web application for *Once Human* players and guilds. It tracks recipe formulas, coordinates memetic specializations, calculates recursive crafting breakdowns, and displays a side-by-side guild matrix.

> Personal project. Not affiliated with, endorsed by, or sponsored by NetEase Games or Starry Studio.

### ⬇ Download & Deploy

**[Get the latest version](https://github.com/dmpotter1361/once-human-recipe/releases/latest)** — clone the repository and deploy instantly using Docker Compose:

```bash
docker compose up --build -d
```
See [How to Run](#how-to-run) for details.

---

## Features

- **Guild Crafting Matrix** — A comparative desktop grid mapping all characters side-by-side so you can see who knows which recipe in your current guild at a glance.
- **Mobile-Adaptive Layout** — Automatically transforms on phone screens into a search-first card stack layout, preventing horizontal scroll fatigue.
- **Memetic Specialization Coordinator** — A registry where members track level-up specializations (e.g., *Sulfur Chemist*, *Gold Smelting*), featuring an **automatic gap analyzer** that highlights missing production perks.
- **Recursive Crafting Calculator** — Recursively breaks down crafting formulas to raw base ingredients (e.g. *Charcoal* and *Dirty Water* for *Pure Water*), and matches intermediate recipes to who in the guild knows how to craft them.
- **Click-to-Copy Waypoints** — Converts coordinates (e.g. `[5830, -3210]`) in recipe sources into interactive copy pills. Clicking copies the waypoint, which you can paste (`Ctrl+V`) into Once Human in-game chat to drop map pins.
- **Registered Server Directory** — A searchable, table-based admin console showing all registered servers in the database. Pre-seeded with over **2,700 derived Once Human servers** across all scenarios.
- **Solo / Self-Tracking Mode** — Check off "Solo Mode" during character creation to disable guild/server details and track recipe checklists completely offline.

---

## Privacy

Everything runs locally on your own machine or private server. Passwords are saved as secure SHA-256 hashes in the local SQLite database. Sessions are managed using DPAPI-encrypted keys or secure session tokens at rest. No external telemetry or remote cloud databases are used.

---

## How to Run

### Option A: Running with Docker (Recommended)
Launch the tracker in the background on the custom port `6660`:
```bash
docker compose up --build -d
```
The SQLite database file is written to a local `./data/` folder on your host machine to guarantee persistence across container rebuilds.

### Option B: Local Development Setup
Prerequisites:
- [Node.js (v18+)](https://nodejs.org/)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Seed the database (runs migrations and seeds 2,700+ servers and 200+ default sheet recipes):
   ```bash
   node seed.js
   ```
3. Start the Express server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:6660` and log in with the default admin account:
   * **Username:** `admin`
   * **Password:** `admin123`

---

## How it Works

The tracker runs an Express backend server using Node's native, compiled-free **`node:sqlite`** (`DatabaseSync`) module. This avoids binary build dependencies (like `sqlite3` or `better-sqlite3`), making local setup and Docker builds extremely lightweight. 

The frontend uses Vanilla HTML5/CSS3 styled with translucent glassmorphic components, neon cyan-violet gradients, Space Grotesk typography, and Lucide icons.

---

## Continuing Development with Agentic IDEs & AI Assistants

This application is built as a self-contained server-side Node.js web service. Because it uses zero-compilation SQLite (`node:sqlite`) and standard Express, it is extremely friendly to clone, run, and modify using **Agentic IDEs & AI Assistants** (such as **Cursor**, **Windsurf**, **VS Code Copilot**, **Claude**, or **Gemini / Antigravity**).

To set up a local copy and run it as a web service on your own machine:

1. **Clone the Repository**
   Clone a copy of the repository to your local drive:
   ```bash
   git clone https://github.com/dmpotter1361/once-human-recipe.git
   cd once-human-recipe
   ```

2. **Open in your Agentic IDE / Workspace**
   Open the root directory in your favorite AI-integrated editor, or launch your workspace coding agent inside the directory.

3. **Install & Run Locally**
   Follow the [Option B: Local Development Setup](#option-b-local-development-setup) instructions to install dependencies and spin up the local web service.

4. **Leverage your AI Developer Agent**
   Since the codebase has zero complex binary or network compilation requirements, you can prompt your IDE's agent to write features, check logic, or run local tests. A great starting prompt:
   > "Read the README, `db.js`, `server.js`, and `public/app.js` to understand the architecture. I'd like to [insert your request here]."

### Helpful map for a new contributor (human or AI)

- **`server.js`** — Express backend, API endpoints, session cookie management, server harvesters, and dynamic scenario mapping.
- **`db.js`** — SQLite database schema definitions and migrations.
- **`seed.js`** — Quotes-aware CSV recipe parser and server seeder.
- **`servers_seed.json`** — Range-derived JSON list of over 2,700 Once Human servers.
- **`public/app.js`** — Frontend matrix renderer, searchable dropdown handlers, and API client routines.
- **`public/index.html`** / **`public/styles.css`** — The glassmorphic UI, responsive grids, and coordinate pill transitions.

---

## Acknowledgments

Once Human Crafting Tracker was designed and built collaboratively with **Antigravity** (Google DeepMind's AI coding assistant), pair-programming with the author from the initial database design through the matrix layouts, calculators, coordinates coping, searchable selects, and this README. The direction, features, and in-game validation are human; the implementation was AI-assisted — and we're happy to say so. 🤖🤝

---

## License

[MIT](LICENSE)
