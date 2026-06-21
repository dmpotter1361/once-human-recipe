// ================= STATE & CONFIGURATION ================= //
const API_BASE = '/api';
const SPECIALIZATIONS_LIST = [
  "Sulfur Chemist (Acid production)",
  "Gold/Silver Smelting (Smelt Ore to Ingots)",
  "Portable Fridge (Increases food preservation)",
  "Super Refinery (Refines acid/fuel faster)",
  "Biomass Generator: Yield (Higher power output)",
  "Solar Generator: Boost (Higher power output)",
  "Copper Ammo: High Yield (+copper ammo count)",
  "Steel Ammo: High Yield (+steel ammo count)",
  "Electronic Parts Recycling (Higher yield)",
  "Kitchen Master (+food buff durations)",
  "Medication Synthesis: High Yield",
  "Stardust Water Pump (Automatic stardust water extraction)",
  "High-Efficiency Smelter (-smelting time/costs)",
  "Mining Platform: Extra Drills (+drill yield)",
  "Chips/Keycards Crafting (Sells for energy links)",
  "Specialized Armor Plating (+armor durability)",
  "Specialized Weapon Tuning (+weapon damage/durability)"
];

const state = {
  token: localStorage.getItem('stardust_token') || null,
  user: JSON.parse(localStorage.getItem('stardust_user')) || null,
  activeTab: 'matrix-tab',
  
  // Data lists
  servers: [],
  guilds: [],
  recipes: [],
  myCharacters: [],
  
  // Active Selections
  activeCharacterId: null,
  activeGuildId: null,
  activeServerFilterId: null,
  
  // Matrix specific
  matrixCharacters: [],
  matrixRecipes: [],
  matrixState: {},
  activeCoordinatorView: 'recipe', // 'recipe' or 'spec'
  calcQueue: [] // [{ recipeId, qty }]
};

// ================= INITIALIZATION ================= //
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  initAuth();
  initTabs();
  initEventListeners();
  
  if (state.token) {
    showDashboard();
  } else {
    showLogin();
  }
  
  lucide.createIcons();
});

// ================= DOM ELEMENT REFERENCES ================= //
let DOM = {};
function initDOM() {
  DOM = {
    authContainer: document.getElementById('auth-container'),
    mainDashboard: document.getElementById('main-dashboard'),
    authTitle: document.getElementById('auth-title'),
    authDesc: document.getElementById('auth-desc'),
    authForm: document.getElementById('auth-form'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authError: document.getElementById('auth-error'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authToggleText: document.getElementById('auth-toggle-text'),
    authToggleLink: document.getElementById('auth-toggle-link'),
    authHeaderActions: document.getElementById('auth-header-actions'),
    
    // Tab panes
    tabPanes: document.querySelectorAll('.tab-pane'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    
    // Matrix Tab
    matrixServerSelect: document.getElementById('matrix-server-select'),
    matrixSearch: document.getElementById('matrix-search'),
    matrixTableHead: document.querySelector('#matrix-table-el thead'),
    matrixTableBody: document.querySelector('#matrix-table-el tbody'),
    matrixEmpty: document.getElementById('matrix-empty'),
    desktopMatrixView: document.getElementById('desktop-matrix-view'),
    mobileMatrixView: document.getElementById('mobile-matrix-view'),
    matrixCategoryFilters: document.getElementById('matrix-category-filters'),
    matrixSpotlightsContainer: document.getElementById('matrix-spotlights-container'),
    showRecipeMatrixBtn: document.getElementById('show-recipe-matrix-btn'),
    showSpecMatrixBtn: document.getElementById('show-spec-matrix-btn'),
    recipeMatrixViewBlock: document.getElementById('recipe-matrix-view-block'),
    specMatrixViewBlock: document.getElementById('spec-matrix-view-block'),
    specGapAlerts: document.getElementById('spec-gap-alerts'),
    specTableEl: document.getElementById('spec-table-el'),
    specEmpty: document.getElementById('spec-empty'),
    mobileSpecView: document.getElementById('mobile-spec-view'),
    
    // Wishlist Tab
    wishlistServerSelect: document.getElementById('wishlist-server-select'),
    wishlistContainer: document.getElementById('wishlist-container'),
    
    // Characters Tab
    myCharactersList: document.getElementById('my-characters-list'),
    openCreateCharBtn: document.getElementById('open-create-char-btn'),
    createCharModal: document.getElementById('create-char-modal'),
    createCharForm: document.getElementById('create-char-form'),
    charNewName: document.getElementById('char-new-name'),
    charSoloCheck: document.getElementById('char-solo-check'),
    charOnlineFields: document.getElementById('char-online-fields'),
    charNewScenario: document.getElementById('char-new-scenario'),
    customScenarioGroup: document.getElementById('custom-scenario-group'),
    charCustomScenario: document.getElementById('char-custom-scenario'),
    charNewServer: document.getElementById('char-new-server'),
    charJoinGuildCheck: document.getElementById('char-join-guild-check'),
    modalGuildJoinFields: document.getElementById('modal-guild-join-fields'),
    charJoinGuildSelect: document.getElementById('char-join-guild-select'),
    charJoinGuildPasscode: document.getElementById('char-join-guild-passcode'),
    
    // Character Detail
    characterDetailPanel: document.getElementById('character-detail-panel'),
    detailCharName: document.getElementById('detail-char-name'),
    detailCharServer: document.getElementById('detail-char-server'),
    deleteCharBtn: document.getElementById('delete-char-btn'),
    migrateCharBtnTrigger: document.getElementById('migrate-char-btn-trigger'),
    charGuildBox: document.getElementById('char-guild-box'),
    charSpecChecklistContainer: document.getElementById('char-spec-checklist-container'),
    charSpecCheckboxes: document.getElementById('char-spec-checkboxes'),
    saveCharSpecsBtn: document.getElementById('save-char-specs-btn'),
    charRecipeChecklistContainer: document.getElementById('char-recipe-checklist-container'),
    recipeChecklistEl: document.getElementById('recipe-checklist-el'),
    checklistSearchInput: document.getElementById('checklist-search-input'),
    
    // Migration Modal
    migrateCharModal: document.getElementById('migrate-char-modal'),
    migrateCharForm: document.getElementById('migrate-char-form'),
    migrateScenario: document.getElementById('migrate-scenario'),
    migrateServer: document.getElementById('migrate-server'),
    
    // Catalog Tab
    catalogSearch: document.getElementById('catalog-search'),
    catalogCategorySelect: document.getElementById('catalog-category-select'),
    catalogSourceSelect: document.getElementById('catalog-source-select'),
    catalogSortSelect: document.getElementById('catalog-sort-select'),
    globalCatalogList: document.getElementById('global-catalog-list'),
    submitRecipeForm: document.getElementById('submit-recipe-form'),
    recNewName: document.getElementById('rec-new-name'),
    recNewFormula: document.getElementById('rec-new-formula'),
    recNewCategory: document.getElementById('rec-new-category'),
    recNewAcquired: document.getElementById('rec-new-acquired'),
    recSubmitGlobal: document.getElementById('rec-submit-global'),
    submitRecipeSuccess: document.getElementById('submit-recipe-success'),
    submitRecipeError: document.getElementById('submit-recipe-error'),
    openSubmitRecipeBtn: document.getElementById('open-submit-recipe-btn'),
    submitRecipeModal: document.getElementById('submit-recipe-modal'),
    openCalculatorBtn: document.getElementById('open-calculator-btn'),
    calculatorModal: document.getElementById('calculator-modal'),
    calcQueueList: document.getElementById('calc-queue-list'),
    calcShoppingList: document.getElementById('calc-shopping-list'),
    
    // Guild Modals & Managers
    joinGuildModal: document.getElementById('join-guild-modal'),
    joinGuildForm: document.getElementById('join-guild-form'),
    joinGuildSelect: document.getElementById('join-guild-select'),
    joinGuildPasscode: document.getElementById('join-guild-passcode'),
    
    createGuildModal: document.getElementById('create-guild-modal'),
    createGuildForm: document.getElementById('create-guild-form'),
    createGuildName: document.getElementById('create-guild-name'),
    createGuildPasscode: document.getElementById('create-guild-passcode'),
    
    guildManagerModal: document.getElementById('guild-manager-modal'),
    guildManagerTitle: document.getElementById('guild-manager-title'),
    guildManagerSettingsBlock: document.getElementById('guild-manager-settings-block'),
    guildManagerCurrentPasscode: document.getElementById('guild-manager-current-passcode'),
    guildManagerPasscodeInput: document.getElementById('guild-manager-passcode-input'),
    guildManagerUpdatePasscodeBtn: document.getElementById('guild-manager-update-passcode-btn'),
    guildManagerDisbandBtn: document.getElementById('guild-manager-disband-btn'),
    guildManagerMembersList: document.getElementById('guild-manager-members-list'),
    
    // Admin Tab
    adminPendingList: document.getElementById('admin-pending-list'),
    scraperUseMock: document.getElementById('scraper-use-mock'),
    runScraperBtn: document.getElementById('run-scraper-btn'),
    harvesterScenarioSelect: document.getElementById('harvester-scenario-select'),
    harvesterText: document.getElementById('harvester-text'),
    runHarvesterBtn: document.getElementById('run-harvester-btn'),
    runSteamHarvesterBtn: document.getElementById('run-steam-harvester-btn'),
    adminResetServer: document.getElementById('admin-reset-server'),
    resetScenarioBtn: document.getElementById('reset-scenario-btn'),
    adminTabBtn: document.getElementById('admin-tab-btn'),
    
    // Notifications
    notificationToast: document.getElementById('notification-toast')
  };
}

// ================= API UTILITIES ================= //
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (state.token) {
    headers['x-auth-token'] = state.token;
  }
  
  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }
    return data;
  } catch (err) {
    showToast(err.message, true);
    throw err;
  }
}

// ================= TOAST NOTIFICATION ================= //
function showToast(message, isError = false) {
  DOM.notificationToast.textContent = message;
  DOM.notificationToast.classList.remove('hidden', 'error-alert');
  
  if (isError) {
    DOM.notificationToast.classList.add('error-alert');
  }
  
  setTimeout(() => {
    DOM.notificationToast.classList.add('hidden');
  }, 4000);
}

// ================= AUTHENTICATION LOGIC ================= //
let isRegisterMode = false;

function initAuth() {
  DOM.authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    
    if (isRegisterMode) {
      DOM.authTitle.textContent = "Create Player Account";
      DOM.authDesc.textContent = "Register a new player profile to begin tracking your alts.";
      DOM.authSubmitBtn.querySelector('span').textContent = "Create Account";
      DOM.authToggleText.textContent = "Already have an account?";
      DOM.authToggleLink.textContent = "Sign In";
    } else {
      DOM.authTitle.textContent = "Guild Crafting Portal";
      DOM.authDesc.textContent = "Log in or register your account to sync recipes with your guild.";
      DOM.authSubmitBtn.querySelector('span').textContent = "Sign In";
      DOM.authToggleText.textContent = "First time here?";
      DOM.authToggleLink.textContent = "Create Player Account";
    }
  });

  DOM.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.authError.classList.add('hidden');
    
    const username = DOM.authUsername.value;
    const password = DOM.authPassword.value;
    
    const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
    try {
      const data = await apiCall(endpoint, 'POST', { username, password });
      
      if (isRegisterMode) {
        showToast("Registration successful! Logging in...", false);
        isRegisterMode = false;
        // Auto-login
        const loginData = await apiCall('/auth/login', 'POST', { username, password });
        saveAuthSession(loginData);
      } else {
        saveAuthSession(data);
      }
    } catch (err) {
      DOM.authError.textContent = err.message;
      DOM.authError.classList.remove('hidden');
    }
  });
}

function saveAuthSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('stardust_token', data.token);
  localStorage.setItem('stardust_user', JSON.stringify(data.user));
  showDashboard();
}

function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiCall('/auth/logout', 'POST');
      } catch (err) {
        // Continue logout even if server call fails
      }
      state.token = null;
      state.user = null;
      localStorage.removeItem('stardust_token');
      localStorage.removeItem('stardust_user');
      showLogin();
    });
  }
}

function showLogin() {
  DOM.authContainer.classList.remove('hidden');
  DOM.mainDashboard.classList.add('hidden');
  DOM.authHeaderActions.innerHTML = '';
}

async function showDashboard() {
  DOM.authContainer.classList.add('hidden');
  DOM.mainDashboard.classList.remove('hidden');
  
  // Render user header
  DOM.authHeaderActions.innerHTML = `
    <div class="user-profile-badge">
      <span class="username-tag"><i data-lucide="user"></i> ${state.user.username}</span>
      <span class="badge ${state.user.role === 'admin' ? 'primary' : ''}">${state.user.role}</span>
      <button class="btn btn-sm danger-btn" id="logout-btn"><i data-lucide="log-out"></i> Logout</button>
    </div>
  `;
  
  if (state.user.role === 'admin') {
    DOM.adminTabBtn.classList.remove('hidden');
  } else {
    DOM.adminTabBtn.classList.add('hidden');
  }
  
  initLogout();
  lucide.createIcons();
  
  // Fetch initial data
  await loadMetadata();
  await loadCharacters();
  switchTab(state.activeTab);
}

// ================= METADATA LOADING (SERVERS/GUILDS) ================= //
async function loadMetadata() {
  try {
    state.servers = await apiCall('/servers');
    state.guilds = await apiCall('/guilds');
    
    populateServerDropdowns();
  } catch (err) {
    console.error("Failed to load metadata", err);
  }
}

function populateServerDropdowns() {
  // Clear lists
  DOM.matrixServerSelect.innerHTML = '<option value="">All Guild Instances...</option>';
  DOM.wishlistServerSelect.innerHTML = '<option value="">All Guild Instances...</option>';
  DOM.adminResetServer.innerHTML = '<option value="">Select server to reset...</option>';
  DOM.charJoinGuildSelect.innerHTML = '<option value="">No Guild / Leave Guild</option>';

  // Map to group scenarios
  const groupedServers = {};
  for (const s of state.servers) {
    if (!groupedServers[s.scenario_name]) {
      groupedServers[s.scenario_name] = [];
    }
    groupedServers[s.scenario_name].push(s);
  }

  // Populate Server Dropdowns
  for (const scenario in groupedServers) {
    const optGroupMatrix = document.createElement('optgroup');
    optGroupMatrix.label = scenario;
    const optGroupWishlist = document.createElement('optgroup');
    optGroupWishlist.label = scenario;
    const optGroupAdmin = document.createElement('optgroup');
    optGroupAdmin.label = scenario;

    for (const s of groupedServers[scenario]) {
      const optionText = `${s.name} (${scenario})`;
      
      const o1 = new Option(optionText, s.id);
      const o2 = new Option(optionText, s.id);
      const o3 = new Option(optionText, s.id);
      
      optGroupMatrix.appendChild(o1);
      optGroupWishlist.appendChild(o2);
      optGroupAdmin.appendChild(o3);
    }
    
    DOM.matrixServerSelect.appendChild(optGroupMatrix);
    DOM.wishlistServerSelect.appendChild(optGroupWishlist);
    DOM.adminResetServer.appendChild(optGroupAdmin);
  }

  // Populate Guild join select
  for (const g of state.guilds) {
    DOM.charJoinGuildSelect.add(new Option(g.name, g.id));
  }
}

// ================= TABS SWITCHING ================= //
function initTabs() {
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  DOM.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  
  DOM.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  // Load tab-specific dynamic data
  if (tabId === 'matrix-tab') {
    loadMatrix();
  } else if (tabId === 'wishlist-tab') {
    loadWishlist();
  } else if (tabId === 'recipes-tab') {
    loadCatalog();
  } else if (tabId === 'admin-tab') {
    loadAdminQueue();
  }
}

// ================= 1. MATRIX TAB LOGIC ================= //

async function loadMatrix() {
  // Find which guild to display. For simplicity, we display the guild of the first active character we own,
  // or let users filter. Let's find first character that belongs to a guild.
  let guildId = state.activeGuildId;
  if (!guildId) {
    const charWithGuild = state.myCharacters.find(c => c.guild_id !== null);
    if (charWithGuild) {
      guildId = charWithGuild.guild_id;
      state.activeGuildId = guildId;
    }
  }

  if (!guildId) {
    // Render empty matrix guide
    DOM.matrixTableHead.innerHTML = '<tr><th>Recipe / Item Name</th></tr>';
    DOM.matrixTableBody.innerHTML = '<tr><td style="color: var(--text-muted);">Please create a character and join a Guild to view the matrix.</td></tr>';
    DOM.mobileMatrixView.innerHTML = '<p class="empty-state">Join a guild to synchronize data.</p>';
    return;
  }

  try {
    let endpoint = `/guilds/${guildId}/matrix`;
    if (state.activeServerFilterId) {
      endpoint += `?server_id=${state.activeServerFilterId}`;
    }
    
    const data = await apiCall(endpoint);
    state.matrixCharacters = data.characters;
    state.matrixRecipes = data.recipes;
    state.matrixState = data.stateMap;

    renderMatrix();
    renderGuildMVPSpotlights();
  } catch (err) {
    console.error("Failed to load matrix data", err);
  }
}

function renderMatrix() {
  // 1. Render Headers
  let headHtml = `<tr>
    <th>Recipe / Item Name</th>
  `;
  for (const c of state.matrixCharacters) {
    headHtml += `
      <th class="char-col">
        ${c.name}
        <span class="char-owner">@${c.owner_name}</span>
        <span class="recipe-formula-sub">${c.server_name}</span>
      </th>
    `;
  }
  headHtml += `</tr>`;
  DOM.matrixTableHead.innerHTML = headHtml;

  // 2. Render Rows
  filterMatrixUI();
}

function filterMatrixUI() {
  const searchQuery = DOM.matrixSearch.value.toLowerCase();
  const selectedCatBtn = DOM.matrixCategoryFilters.querySelector('.cat-btn.active');
  const activeCategory = selectedCatBtn ? selectedCatBtn.getAttribute('data-category') : 'all';

  const filteredRecipes = state.matrixRecipes.filter(r => {
    const matchesSearch = r.item_name.toLowerCase().includes(searchQuery) || (r.formula && r.formula.toLowerCase().includes(searchQuery));
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (filteredRecipes.length === 0) {
    DOM.matrixTableBody.innerHTML = '';
    DOM.matrixEmpty.classList.remove('hidden');
    DOM.mobileMatrixView.innerHTML = '';
    return;
  }
  DOM.matrixEmpty.classList.add('hidden');

  // Desktop Matrix Render
  let tbodyHtml = '';
  for (const r of filteredRecipes) {
    tbodyHtml += `<tr class="matrix-row">
      <td class="recipe-name">
        ${r.item_name}
        <span class="recipe-formula-sub">${r.formula || 'No formula'}</span>
      </td>
    `;
    
    for (const c of state.matrixCharacters) {
      const status = (state.matrixState[c.id] && state.matrixState[c.id][r.id]) || null;
      let dotClass = 'cell-dot';
      let dotIcon = '-';
      
      if (status === 'learned') {
        dotClass += ' learned';
        dotIcon = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
      } else if (status === 'learning') {
        dotClass += ' learning';
        dotIcon = '<i data-lucide="target" style="width: 14px; height: 14px;"></i>';
      }

      // Check if logged-in user owns this character to allow direct cell toggles
      const isOwner = c.user_id === state.user.id;
      const onClickAttr = isOwner ? `onclick="toggleMatrixCell(${c.id}, ${r.id}, '${status}')"` : '';
      const cursorStyle = isOwner ? 'style="cursor: pointer;"' : 'style="cursor: default;"';

      tbodyHtml += `
        <td class="status-cell" ${onClickAttr} ${cursorStyle}>
          <div class="${dotClass}">${dotIcon}</div>
        </td>
      `;
    }
    tbodyHtml += `</tr>`;
  }
  DOM.matrixTableBody.innerHTML = tbodyHtml;

  // Mobile Cards Render (Context-Aware UI)
  let mobileHtml = '';
  for (const r of filteredRecipes) {
    // Get status list for this recipe
    const activeLearned = [];
    const activeLearning = [];
    
    for (const c of state.matrixCharacters) {
      const status = (state.matrixState[c.id] && state.matrixState[c.id][r.id]) || null;
      if (status === 'learned') activeLearned.push(`${c.name} (@${c.owner_name})`);
      if (status === 'learning') activeLearning.push(`${c.name} (@${c.owner_name})`);
    }

    mobileHtml += `
      <div class="mobile-card glass-panel">
        <div class="mobile-card-header">
          <h4>${r.item_name}</h4>
          <span class="badge primary">${r.category}</span>
        </div>
        <div class="mobile-card-body">
          <p><strong>Formula:</strong> ${r.formula || 'None'}</p>
          <div class="mobile-card-status-list">
            ${activeLearned.map(name => `<span class="mobile-status-tag learned"><i data-lucide="check"></i> ${name}</span>`).join('')}
            ${activeLearning.map(name => `<span class="mobile-status-tag learning"><i data-lucide="target"></i> ${name}</span>`).join('')}
            ${activeLearned.length === 0 && activeLearning.length === 0 ? '<span style="color: var(--text-muted); font-size: 0.8rem;">Not learned by anyone in active instances.</span>' : ''}
          </div>
          </div>
        </div>
      </div>
    `;
  }
  DOM.mobileMatrixView.innerHTML = mobileHtml;
  
  lucide.createIcons();
}

function renderGuildMVPSpotlights() {
  const spotlights = [];
  
  // Find solo crafters
  state.matrixRecipes.forEach(r => {
    // state.matrixState structure: { charId: { recipeId: status } }
    const learnedBy = [];
    state.matrixCharacters.forEach(c => {
      const status = (state.matrixState[c.id] && state.matrixState[c.id][r.id]) || null;
      if (status === 'learned') {
        learnedBy.push(c.name);
      }
    });

    if (learnedBy.length === 1) {
      spotlights.push({
        recipeName: r.item_name,
        crafterName: learnedBy[0],
        category: r.category
      });
    }
  });

  if (spotlights.length > 0) {
    DOM.matrixSpotlightsContainer.classList.remove('hidden');
    let html = `
      <div class="glass-panel" style="padding: 15px; border-color: rgba(0, 242, 254, 0.1); border-radius: 8px;">
        <h4 style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
          <i data-lucide="crown" style="color: var(--status-learned-glow); width: 18px; height: 18px;"></i>
          <span>Solo Crafter Spotlights</span>
        </h4>
        <div style="max-height: 100px; overflow-y: auto; font-size: 0.8rem; display: flex; flex-direction: column; gap: 5px; padding-right: 5px;">
    `;
    spotlights.slice(0, 5).forEach(s => {
      html += `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 3px;">
          <span style="font-weight: 600;">${s.recipeName}</span>
          <span style="color: var(--status-learned-glow); font-family: monospace;">Only ${s.crafterName}</span>
        </div>
      `;
    });
    if (spotlights.length > 5) {
      html += `<div style="text-align: right; color: var(--text-muted); font-size: 0.75rem;">+${spotlights.length - 5} more solo formulas</div>`;
    }
    html += `
        </div>
      </div>
      
      <div class="glass-panel" style="padding: 15px; border-color: rgba(246, 211, 101, 0.1); border-radius: 8px;">
        <h4 style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
          <i data-lucide="award" style="color: var(--status-learning-glow); width: 18px; height: 18px;"></i>
          <span>Guild Formula Coverage</span>
        </h4>
        <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Total Recipes Tracked:</span>
            <strong style="font-family: monospace; font-size: 0.9rem;">${state.matrixRecipes.length}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Unique Known Recipes:</span>
            <strong style="font-family: monospace; font-size: 0.9rem; color: var(--status-learned-glow);">
              ${state.matrixRecipes.filter(r => {
                return state.matrixCharacters.some(c => {
                  const status = (state.matrixState[c.id] && state.matrixState[c.id][r.id]) || null;
                  return status === 'learned';
                });
              }).length}
            </strong>
          </div>
        </div>
      </div>
    `;
    DOM.matrixSpotlightsContainer.innerHTML = html;
  } else {
    DOM.matrixSpotlightsContainer.classList.add('hidden');
  }

  lucide.createIcons();
}

async function loadSpecializationMatrix() {
  let guildId = state.activeGuildId;
  if (!guildId) {
    const charWithGuild = state.myCharacters.find(c => c.guild_id !== null);
    if (charWithGuild) {
      guildId = charWithGuild.guild_id;
      state.activeGuildId = guildId;
    }
  }

  if (!guildId) {
    DOM.specEmpty.classList.remove('hidden');
    return;
  }

  try {
    const data = await apiCall(`/guilds/${guildId}/specializations`);
    renderSpecializationMatrixUI(data);
  } catch (err) {
    console.error(err);
  }
}

function renderSpecializationMatrixUI(guildSpecs) {
  if (state.matrixCharacters.length === 0) {
    DOM.specEmpty.classList.remove('hidden');
    return;
  }

  DOM.specEmpty.classList.add('hidden');

  // Build table headers
  let headHtml = '<tr><th>Memetic Specialization</th>';
  state.matrixCharacters.forEach(c => {
    headHtml += `<th>${c.name}</th>`;
  });
  headHtml += '</tr>';
  DOM.specTableEl.querySelector('thead').innerHTML = headHtml;

  // Build lookup map of { characterId_specName: true }
  const specLookup = {};
  const specCounts = {};
  SPECIALIZATIONS_LIST.forEach(s => specCounts[s] = 0);

  guildSpecs.forEach(item => {
    specLookup[`${item.character_id}_${item.specialization_name}`] = true;
    if (specCounts[item.specialization_name] !== undefined) {
      specCounts[item.specialization_name]++;
    }
  });

  // Build table rows
  let bodyHtml = '';
  SPECIALIZATIONS_LIST.forEach(specName => {
    bodyHtml += `<tr><td style="font-weight: 600;">${specName}</td>`;
    state.matrixCharacters.forEach(c => {
      const hasIt = specLookup[`${c.id}_${specName}`];
      if (hasIt) {
        bodyHtml += `<td class="status-cell" style="text-align: center;"><div class="cell-dot learned"><i data-lucide="check" style="width: 14px; height: 14px;"></i></div></td>`;
      } else {
        bodyHtml += `<td class="status-cell" style="text-align: center;"><div class="cell-dot" style="opacity: 0.15;">-</div></td>`;
      }
    });
    bodyHtml += '</tr>';
  });
  DOM.specTableEl.querySelector('tbody').innerHTML = bodyHtml;

  // Gap analysis
  const gaps = SPECIALIZATIONS_LIST.filter(s => specCounts[s] === 0);
  if (gaps.length > 0) {
    DOM.specGapAlerts.style.display = 'block';
    let alertsHtml = `
      <h4 style="color: var(--status-learning-glow); font-size: 0.95rem; margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">
        <i data-lucide="alert-triangle"></i> Guild Specialization Gaps (${gaps.length} Missing)
      </h4>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">No members in your guild have selected these critical specializations. Coordinate to respec or allocate them on level up:</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    `;
    gaps.forEach(g => {
      alertsHtml += `<span class="badge" style="background: rgba(230, 76, 76, 0.1); border-color: rgba(230, 76, 76, 0.2); color: var(--status-learning);">${g.split(' (')[0]}</span>`;
    });
    alertsHtml += '</div>';
    DOM.specGapAlerts.innerHTML = alertsHtml;
  } else {
    DOM.specGapAlerts.style.display = 'none';
  }

  // Render Mobile Specializations List Card View
  let mobileHtml = '';
  SPECIALIZATIONS_LIST.forEach(specName => {
    const membersWhoHaveIt = guildSpecs
      .filter(item => item.specialization_name === specName)
      .map(item => item.character_name);
    
    if (membersWhoHaveIt.length > 0) {
      mobileHtml += `
        <div class="mobile-card glass-panel" style="margin-bottom: 12px; padding: 15px;">
          <h4 style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-main);">${specName}</h4>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            <label style="display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--status-learned-glow); margin-bottom: 4px;">Known By</label>
            <div>${membersWhoHaveIt.join(', ')}</div>
          </div>
        </div>
      `;
    }
  });

  if (!mobileHtml) {
    mobileHtml = '<p class="empty-state">No specializations found.</p>';
  }
  DOM.mobileSpecView.innerHTML = mobileHtml;

  lucide.createIcons();
}

function toggleCoordinatorView(view) {
  state.activeCoordinatorView = view;
  if (view === 'recipe') {
    DOM.showRecipeMatrixBtn.classList.add('active');
    DOM.showRecipeMatrixBtn.classList.replace('secondary-btn', 'primary-btn');
    DOM.showSpecMatrixBtn.classList.remove('active');
    DOM.showSpecMatrixBtn.classList.replace('primary-btn', 'secondary-btn');
    DOM.recipeMatrixViewBlock.classList.remove('hidden');
    DOM.specMatrixViewBlock.classList.add('hidden');
    loadMatrix();
  } else {
    DOM.showSpecMatrixBtn.classList.add('active');
    DOM.showSpecMatrixBtn.classList.replace('secondary-btn', 'primary-btn');
    DOM.showRecipeMatrixBtn.classList.remove('active');
    DOM.showRecipeMatrixBtn.classList.replace('primary-btn', 'secondary-btn');
    DOM.recipeMatrixViewBlock.classList.add('hidden');
    DOM.specMatrixViewBlock.classList.remove('hidden');
    loadSpecializationMatrix();
  }
}

// Toggles recipe state directly from matrix if you own the character
async function toggleMatrixCell(charId, recipeId, currentStatus) {
  let nextStatus = null;
  if (!currentStatus || currentStatus === 'null') {
    nextStatus = 'learning';
  } else if (currentStatus === 'learning') {
    nextStatus = 'learned';
  } // if learned, it cycles back to null
  
  try {
    await apiCall(`/recipes/${recipeId}/status`, 'POST', {
      character_id: charId,
      status: nextStatus
    });
    
    // Optimistic UI update
    if (!state.matrixState[charId]) state.matrixState[charId] = {};
    if (nextStatus) {
      state.matrixState[charId][recipeId] = nextStatus;
    } else {
      delete state.matrixState[charId][recipeId];
    }
    
    showToast(`Updated recipe status!`, false);
    filterMatrixUI();
  } catch (err) {
    console.error("Cell update failed", err);
  }
}
window.toggleMatrixCell = toggleMatrixCell; // Expose to HTML click handler

// ================= 2. WISHLIST TAB LOGIC ================= //

async function loadWishlist() {
  let guildId = state.activeGuildId;
  if (!guildId) {
    const charWithGuild = state.myCharacters.find(c => c.guild_id !== null);
    if (charWithGuild) {
      guildId = charWithGuild.guild_id;
      state.activeGuildId = guildId;
    }
  }

  if (!guildId) {
    DOM.wishlistContainer.innerHTML = '<p class="empty-state">Join a guild to view wishlists.</p>';
    return;
  }

  const serverFilter = DOM.wishlistServerSelect.value;
  try {
    let endpoint = `/guilds/${guildId}/matrix`;
    if (serverFilter) {
      endpoint += `?server_id=${serverFilter}`;
    }
    
    const data = await apiCall(endpoint);
    
    // Parse wishlist: Recipes where someone is 'learning'
    const wishes = {}; // recipe_id -> { recipe, wishers: [], helpers: [] }
    
    for (const r of data.recipes) {
      const wishers = [];
      const helpers = [];
      
      for (const c of data.characters) {
        const status = (data.stateMap[c.id] && data.stateMap[c.id][r.id]) || null;
        if (status === 'learning') {
          wishers.push(c);
        } else if (status === 'learned') {
          helpers.push(c);
        }
      }
      
      if (wishers.length > 0) {
        wishes[r.id] = {
          recipe: r,
          wishers,
          helpers
        };
      }
    }

    renderWishlistUI(wishes);
  } catch (err) {
    console.error(err);
  }
}

function renderWishlistUI(wishes) {
  const wishArray = Object.values(wishes);
  if (wishArray.length === 0) {
    DOM.wishlistContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="target"></i>
        <p>No active wishlist items found. Guild members can add items by marking recipes as "Trying to Learn" on their alts.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '';
  for (const item of wishArray) {
    html += `
      <div class="wishlist-card glass-panel">
        <div class="wish-header">
          <div>
            <h3>${item.recipe.item_name}</h3>
            <span class="recipe-formula-sub">${item.recipe.formula || 'No formula'}</span>
          </div>
          <span class="category">${item.recipe.category}</span>
        </div>
        
        <div class="wish-people">
          <span class="wish-label"><i data-lucide="target" style="color: var(--status-learning);"></i> Actively Trying to Learn:</span>
          ${item.wishers.map(c => `
            <div class="wish-char-tag">
              <span>${c.name} <span class="char-owner">@${c.owner_name}</span></span>
              <span class="badge">${c.server_name}</span>
            </div>
          `).join('')}
        </div>

        <div class="wish-people">
          <span class="wish-label"><i data-lucide="shield-check" style="color: var(--status-learned);"></i> Can Craft for Guild:</span>
          <div class="helpers-list">
            ${item.helpers.map(c => `
              <div class="helper-char-tag">
                <span>${c.name} <span class="char-owner">@${c.owner_name}</span></span>
                <span class="badge primary">${c.server_name}</span>
              </div>
            `).join('')}
            ${item.helpers.length === 0 ? '<span style="color: var(--text-muted); font-size: 0.8rem; padding-left: 10px;">Nobody knows this recipe yet!</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  DOM.wishlistContainer.innerHTML = html;
  lucide.createIcons();
}

// ================= 3. MY CHARACTERS TAB LOGIC ================= //
async function loadCharacters() {
  try {
    state.myCharacters = await apiCall('/characters');
    renderMyCharactersList();
  } catch (err) {
    console.error(err);
  }
}

function renderMyCharactersList() {
  if (state.myCharacters.length === 0) {
    DOM.myCharactersList.innerHTML = '<p style="color: var(--text-muted);">No characters registered. Click "Create Character" below to start!</p>';
    DOM.characterDetailPanel.classList.add('hidden');
    return;
  }

  let html = '';
  for (const c of state.myCharacters) {
    const isActiveClass = state.activeCharacterId === c.id ? 'active' : '';
    html += `
      <div class="character-card glass-panel ${isActiveClass}" onclick="selectCharacter(${c.id})">
        <div class="char-info">
          <h4>${c.name}</h4>
          <p>${c.server_name} (${c.scenario_name}) | Level ${c.level}</p>
          ${c.guild_name ? `<span class="badge primary">${c.guild_name}</span>` : '<span class="badge">No Guild</span>'}
        </div>
        <i data-lucide="chevron-right"></i>
      </div>
    `;
  }
  DOM.myCharactersList.innerHTML = html;
  lucide.createIcons();

  if (state.activeCharacterId) {
    renderCharacterDetail();
  }
}

async function selectCharacter(id) {
  state.activeCharacterId = id;
  
  // Highlight active character card
  document.querySelectorAll('.character-card').forEach(card => card.classList.remove('active'));
  renderMyCharactersList();
}

async function renderCharacterDetail() {
  const char = state.myCharacters.find(c => c.id === state.activeCharacterId);
  if (!char) return;

  DOM.characterDetailPanel.classList.remove('hidden');
  DOM.detailCharName.textContent = char.name;
  DOM.detailCharServer.textContent = `${char.server_name} (${char.scenario_name})`;

  // Guild box state
  let guildHtml = '';
  if (char.guild_id) {
    guildHtml = `
      <div>
        <label>Active Guild</label>
        <h4>${char.guild_name}</h4>
      </div>
      <div class="form-row" style="margin-top: 10px;">
        <button class="btn btn-sm secondary-btn" onclick="openGuildManagerModal(${char.guild_id})"><i data-lucide="sliders"></i> Manage Guild</button>
        <button class="btn btn-sm danger-btn" onclick="leaveGuild(${char.id})">Leave Guild</button>
      </div>
    `;
  } else {
    guildHtml = `
      <div>
        <label>Guild association required to share formulas</label>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Join an existing guild or create a new one.</p>
      </div>
      <div class="form-row" style="margin-top: 10px;">
        <button class="btn btn-sm secondary-btn" onclick="openJoinGuildModal(${char.id})">Join Guild</button>
        <button class="btn btn-sm secondary-btn" onclick="openCreateGuildModal()">Create Guild</button>
      </div>
    `;
  }
  DOM.charGuildBox.innerHTML = guildHtml;
  lucide.createIcons();

  // Render specializations checklist
  let specCheckboxesHtml = '';
  SPECIALIZATIONS_LIST.forEach((specName, index) => {
    specCheckboxesHtml += `
      <div class="checkbox-group" style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
        <input type="checkbox" id="spec-checkbox-${index}" value="${specName}" class="char-spec-cb">
        <label for="spec-checkbox-${index}" style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer;">${specName}</label>
      </div>
    `;
  });
  DOM.charSpecCheckboxes.innerHTML = specCheckboxesHtml;
  DOM.charSpecChecklistContainer.classList.remove('hidden');

  // Load recipes list with user status checks
  await loadRecipeChecklist(char.id);

  // Fetch active specializations and check boxes
  try {
    const activeSpecs = await apiCall(`/characters/${char.id}/specializations`);
    const activeSet = new Set(activeSpecs);
    document.querySelectorAll('.char-spec-cb').forEach(cb => {
      cb.checked = activeSet.has(cb.value);
    });
  } catch (err) {
    console.error("Error loading character specializations:", err);
  }
}

async function loadRecipeChecklist(charId) {
  try {
    const recipes = await apiCall(`/recipes?character_id=${charId}`);
    state.recipes = recipes;
    renderRecipeChecklistUI();
  } catch (err) {
    console.error(err);
  }
}



function renderRecipeChecklistUI() {
  const searchQuery = DOM.checklistSearchInput.value.toLowerCase();
  
  const filtered = state.recipes.filter(r => 
    r.item_name.toLowerCase().includes(searchQuery) || 
    (r.formula && r.formula.toLowerCase().includes(searchQuery))
  );

  if (filtered.length === 0) {
    DOM.recipeChecklistEl.innerHTML = '<p class="empty-state">No matching recipes found.</p>';
    return;
  }

  let html = '';
  for (const r of filtered) {
    const isLearned = r.status === 'learned';
    const isLearning = r.status === 'learning';

    html += `
      <div class="recipe-checklist-item">
        <div class="checklist-info">
          <h5>${r.item_name}</h5>
          <p>${r.formula || 'No formula'}</p>
        </div>
        <div class="checklist-actions">
          <button class="checklist-btn learning ${isLearning ? 'active' : ''}" 
            onclick="updateRecipeStatus(${r.id}, 'learning')">
            <i data-lucide="target"></i> Learning
          </button>
          <button class="checklist-btn learned ${isLearned ? 'active' : ''}" 
            onclick="updateRecipeStatus(${r.id}, 'learned')">
            <i data-lucide="check"></i> Learned
          </button>
        </div>
      </div>
    `;
  }
  
  DOM.recipeChecklistEl.innerHTML = html;
  DOM.charRecipeChecklistContainer.classList.remove('hidden');
  lucide.createIcons();
}

async function updateRecipeStatus(recipeId, targetStatus) {
  const charId = state.activeCharacterId;
  const currentRecipe = state.recipes.find(r => r.id === recipeId);
  
  // If clicking an already active status, remove it (set to null)
  const nextStatus = currentRecipe.status === targetStatus ? null : targetStatus;
  
  try {
    await apiCall(`/recipes/${recipeId}/status`, 'POST', {
      character_id: charId,
      status: nextStatus
    });

    currentRecipe.status = nextStatus;
    showToast("Status updated!", false);
    renderRecipeChecklistUI();
  } catch (err) {
    console.error(err);
  }
}
window.updateRecipeStatus = updateRecipeStatus;

// Guild Actions
async function leaveGuild(charId) {
  if (confirm("Are you sure you want to leave this guild?")) {
    try {
      await apiCall(`/characters/${charId}/join-guild`, 'POST', { guild_id: null });
      showToast("Left guild.", false);
      await loadCharacters();
    } catch (err) {
      console.error(err);
    }
  }
}
window.leaveGuild = leaveGuild;

function openJoinGuildModal(charId) {
  DOM.joinGuildSelect.innerHTML = '<option value="">Select Guild to Join...</option>';
  for (const g of state.guilds) {
    DOM.joinGuildSelect.add(new Option(g.name, g.id));
  }
  
  DOM.joinGuildForm.onsubmit = async (e) => {
    e.preventDefault();
    const guildId = parseInt(DOM.joinGuildSelect.value, 10);
    const passcode = DOM.joinGuildPasscode.value.trim();
    
    try {
      await apiCall(`/characters/${charId}/join-guild`, 'POST', {
        guild_id: guildId,
        join_passcode: passcode
      });
      showToast("Joined guild successfully!", false);
      state.activeGuildId = guildId;
      DOM.joinGuildForm.reset();
      DOM.joinGuildModal.classList.add('hidden');
      await loadCharacters();
    } catch (err) {
      console.error(err);
    }
  };
  
  DOM.joinGuildModal.classList.remove('hidden');
}
window.openJoinGuildModal = openJoinGuildModal;

async function joinGuild(charId, guildId, passcode) {
  try {
    await apiCall(`/characters/${charId}/join-guild`, 'POST', {
      guild_id: guildId,
      join_passcode: passcode
    });
    showToast("Joined guild successfully!", false);
    state.activeGuildId = guildId;
    await loadCharacters();
  } catch (err) {
    console.error(err);
  }
}

function openCreateGuildModal() {
  DOM.createGuildForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = DOM.createGuildName.value.trim();
    const passcode = DOM.createGuildPasscode.value.trim();
    
    try {
      const data = await apiCall('/guilds', 'POST', {
        name,
        join_passcode: passcode
      });
      showToast("Guild created successfully!", false);
      DOM.createGuildForm.reset();
      DOM.createGuildModal.classList.add('hidden');
      await loadMetadata();
      if (state.activeCharacterId) {
        await joinGuild(state.activeCharacterId, data.guildId, passcode);
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  DOM.createGuildModal.classList.remove('hidden');
}
window.openCreateGuildModal = openCreateGuildModal;

async function openGuildManagerModal(guildId) {
  try {
    const data = await apiCall(`/guilds/${guildId}`);
    
    DOM.guildManagerTitle.textContent = `Guild Manager: ${data.name}`;
    
    if (data.is_creator) {
      DOM.guildManagerSettingsBlock.classList.remove('hidden');
      DOM.guildManagerCurrentPasscode.textContent = data.join_passcode;
      DOM.guildManagerPasscodeInput.value = '';
      
      DOM.guildManagerUpdatePasscodeBtn.onclick = async () => {
        const newPasscode = DOM.guildManagerPasscodeInput.value.trim();
        if (!newPasscode) {
          showToast("Please enter a new passcode.", true);
          return;
        }
        try {
          await apiCall(`/guilds/${guildId}/passcode`, 'PUT', { join_passcode: newPasscode });
          showToast("Passcode updated successfully!", false);
          DOM.guildManagerCurrentPasscode.textContent = newPasscode;
          DOM.guildManagerPasscodeInput.value = '';
        } catch (err) {
          console.error(err);
        }
      };
      
      DOM.guildManagerDisbandBtn.onclick = async () => {
        if (confirm("CRITICAL WARNING!\nAre you sure you want to disband this guild? This removes all characters and deletes the guild permanently!")) {
          try {
            await apiCall(`/guilds/${guildId}`, 'DELETE');
            showToast("Guild disbanded.", false);
            DOM.guildManagerModal.classList.add('hidden');
            await loadMetadata();
            await loadCharacters();
          } catch (err) {
            console.error(err);
          }
        }
      };
    } else {
      DOM.guildManagerSettingsBlock.classList.add('hidden');
    }
    
    let html = '';
    if (data.members.length === 0) {
      html = '<p style="color: var(--text-muted); padding: 10px;">No characters in this guild.</p>';
    } else {
      for (const m of data.members) {
        const isOwnCharacter = state.myCharacters.some(c => c.id === m.id);
        const canKick = data.is_creator && !isOwnCharacter;
        
        html += `
          <div class="recipe-checklist-item" style="margin-bottom: 5px;">
            <div class="checklist-info">
              <h5>${m.name} <span class="char-owner" style="display: inline;">@${m.owner_name}</span></h5>
              <p>${m.server_name} (${m.scenario_name}) | Level ${m.level}</p>
            </div>
            ${canKick ? `
              <button class="btn btn-sm danger-btn" onclick="kickGuildMember(${guildId}, ${m.id}, '${m.name}')">
                Kick
              </button>
            ` : ''}
          </div>
        `;
      }
    }
    DOM.guildManagerMembersList.innerHTML = html;
    
    DOM.guildManagerModal.classList.remove('hidden');
    lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}
window.openGuildManagerModal = openGuildManagerModal;

async function kickGuildMember(guildId, characterId, name) {
  if (confirm(`Are you sure you want to kick ${name} from the guild?`)) {
    try {
      await apiCall(`/guilds/${guildId}/kick`, 'POST', { character_id: characterId });
      showToast(`${name} has been kicked.`, false);
      await openGuildManagerModal(guildId);
      await loadCharacters();
    } catch (err) {
      console.error(err);
    }
  }
}
window.kickGuildMember = kickGuildMember;

// ================= 4. CATALOG TAB LOGIC ================= //

async function loadCatalog() {
  try {
    state.recipes = await apiCall('/recipes');
    filterCatalogUI();
  } catch (err) {
    console.error(err);
  }
}

function filterCatalogUI() {
  const searchQuery = DOM.catalogSearch.value.toLowerCase();
  const category = DOM.catalogCategorySelect.value;
  const sourceFilter = DOM.catalogSourceSelect.value;

  const filtered = state.recipes.filter(r => {
    const matchesSearch = r.item_name.toLowerCase().includes(searchQuery) || (r.formula && r.formula.toLowerCase().includes(searchQuery));
    const matchesCategory = category === 'all' || r.category === category;
    
    let matchesSource = true;
    if (sourceFilter === 'settlement') {
      matchesSource = r.acquired_by && r.acquired_by.toLowerCase().includes('settlement');
    } else if (sourceFilter === 'recycling') {
      matchesSource = r.acquired_by && r.acquired_by.toLowerCase().includes('recycling');
    }
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  if (filtered.length === 0) {
    DOM.globalCatalogList.innerHTML = '<p class="empty-state">No recipes found matching query.</p>';
    return;
  }

  let html = '';
  for (const r of filtered) {
    html += `
      <div class="catalog-item glass-panel">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <h4 style="margin: 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 170px;">${r.item_name}</h4>
          ${r.formula ? `
            <button class="btn btn-sm secondary-btn" style="padding: 2px 8px; font-size: 0.72rem; border-color: rgba(255,255,255,0.05); white-space: nowrap; flex-shrink: 0;" onclick="addRecipeToCalculator(${r.id})">
              <i data-lucide="calculator" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i> + Calc
            </button>
          ` : ''}
        </div>
        <p class="formula" style="margin-top: 8px;"><strong>Formula:</strong> ${r.formula || 'No recipe ingredients recorded'}</p>
        <div class="meta-row" style="margin-top: 10px;">
          <span class="badge primary">${r.category}</span>
          ${r.acquired_by ? `<span class="badge" style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px;">Source: ${formatCoords(r.acquired_by)}</span>` : ''}
        </div>
      </div>
    `;
  }
  DOM.globalCatalogList.innerHTML = html;
  lucide.createIcons();
}




// ================= 5. ADMIN CONSOLE TAB LOGIC ================= //
async function loadAdminQueue() {
  if (state.user.role !== 'admin') return;

  try {
    const pending = await apiCall('/admin/pending-recipes');
    renderPendingList(pending);
  } catch (err) {
    console.error(err);
  }
}

function renderPendingList(pending) {
  if (pending.length === 0) {
    DOM.adminPendingList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No pending verification reviews.</p>';
    return;
  }

  let html = '';
  for (const r of pending) {
    html += `
      <div class="pending-card glass-panel">
        <div>
          <h4>${r.item_name}</h4>
          <p class="recipe-formula-sub">Formula: ${r.formula || 'None'}</p>
          <span class="badge primary">${r.category}</span>
          <span class="badge">Submitted by @${r.submitter_name || 'System'}</span>
        </div>
        <div class="pending-actions">
          <button class="btn btn-sm primary-btn" onclick="approveRecipe(${r.id})">Approve</button>
          <button class="btn btn-sm danger-btn" onclick="rejectRecipe(${r.id})">Reject</button>
        </div>
      </div>
    `;
  }
  DOM.adminPendingList.innerHTML = html;
}

async function approveRecipe(id) {
  try {
    await apiCall(`/admin/approve-recipe/${id}`, 'POST');
    showToast("Recipe approved and published globally!", false);
    loadAdminQueue();
  } catch (err) {
    console.error(err);
  }
}
window.approveRecipe = approveRecipe;

async function rejectRecipe(id) {
  if (confirm("Are you sure you want to reject and delete this submission?")) {
    try {
      await apiCall(`/admin/reject-recipe/${id}`, 'DELETE');
      showToast("Submission rejected.", false);
      loadAdminQueue();
    } catch (err) {
      console.error(err);
    }
  }
}
window.rejectRecipe = rejectRecipe;

// ================= EVENT LISTENERS INITIALIZATION ================= //
function initEventListeners() {
  // Matrix Tab
  DOM.matrixServerSelect.addEventListener('change', () => {
    state.activeServerFilterId = DOM.matrixServerSelect.value;
    loadMatrix();
  });

  DOM.matrixSearch.addEventListener('input', () => {
    filterMatrixUI();
  });

  DOM.matrixCategoryFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('cat-btn')) {
      DOM.matrixCategoryFilters.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      filterMatrixUI();
    }
  });

  // Wishlist Tab
  DOM.wishlistServerSelect.addEventListener('change', () => {
    loadWishlist();
  });

  // Characters Tab - Recipe Checklist
  DOM.checklistSearchInput.addEventListener('input', () => {
    renderRecipeChecklistUI();
  });

  // Characters Tab - Specializations saving
  DOM.saveCharSpecsBtn.addEventListener('click', async () => {
    if (!state.activeCharacterId) return;
    const selectedSpecs = [];
    document.querySelectorAll('.char-spec-cb').forEach(cb => {
      if (cb.checked) {
        selectedSpecs.push(cb.value);
      }
    });

    try {
      DOM.saveCharSpecsBtn.disabled = true;
      DOM.saveCharSpecsBtn.textContent = 'Saving...';
      await apiCall(`/characters/${state.activeCharacterId}/specializations`, 'POST', {
        specializations: selectedSpecs
      });
      showToast("Specializations saved successfully!", false);
      
      // If we are looking at the specialization matrix, refresh it!
      if (state.activeCoordinatorView === 'spec') {
        loadSpecializationMatrix();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save specializations.", true);
    } finally {
      DOM.saveCharSpecsBtn.disabled = false;
      DOM.saveCharSpecsBtn.textContent = 'Save Specializations';
    }
  });

  // Character deletion
  DOM.deleteCharBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to delete this character permanently? This wipes all recipe progress!")) {
      try {
        await apiCall(`/characters/${state.activeCharacterId}`, 'DELETE');
        showToast("Character deleted.", false);
        state.activeCharacterId = null;
        await loadCharacters();
      } catch (err) {
        console.error(err);
      }
    }
  });

  // Create character alt / recipe submission modal controls
  DOM.openCreateCharBtn.addEventListener('click', () => {
    DOM.createCharModal.classList.remove('hidden');
  });

  DOM.openSubmitRecipeBtn.addEventListener('click', () => {
    DOM.submitRecipeModal.classList.remove('hidden');
  });

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    });
  });

  DOM.charSoloCheck.addEventListener('change', () => {
    const isSolo = DOM.charSoloCheck.checked;
    DOM.charOnlineFields.classList.toggle('hidden', isSolo);
    if (isSolo) {
      DOM.charNewScenario.removeAttribute('required');
      DOM.charNewServer.removeAttribute('required');
    } else {
      DOM.charNewScenario.setAttribute('required', '');
      DOM.charNewServer.setAttribute('required', '');
    }
  });

  DOM.charNewScenario.addEventListener('change', () => {
    if (DOM.charNewScenario.value === 'custom') {
      DOM.customScenarioGroup.classList.remove('hidden');
    } else {
      DOM.customScenarioGroup.classList.add('hidden');
    }
  });

  DOM.charJoinGuildCheck.addEventListener('change', () => {
    DOM.modalGuildJoinFields.classList.toggle('hidden', !DOM.charJoinGuildCheck.checked);
  });

  DOM.createCharForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isSolo = DOM.charSoloCheck.checked;
    let scenario = isSolo ? "Solo" : DOM.charNewScenario.value;
    if (!isSolo && scenario === 'custom') {
      scenario = DOM.charCustomScenario.value;
    }
    const serverCode = isSolo ? "Solo Tracking" : DOM.charNewServer.value;
    const name = DOM.charNewName.value;
    try {
      const server = await apiCall('/servers', 'POST', {
        name: serverCode,
        scenario_name: scenario
      });
      let body = {
        name,
        server_id: server.id
      };
      if (!isSolo && DOM.charJoinGuildCheck.checked) {
        body.guild_id = parseInt(DOM.charJoinGuildSelect.value, 10);
        body.join_passcode = DOM.charJoinGuildPasscode.value;
      }
      await apiCall('/characters', 'POST', body);
      showToast("Character created successfully!", false);
      
      // Reset form state
      DOM.createCharForm.reset();
      DOM.charOnlineFields.classList.remove('hidden');
      DOM.charNewScenario.setAttribute('required', '');
      DOM.charNewServer.setAttribute('required', '');
      
      DOM.createCharModal.classList.add('hidden');
      DOM.customScenarioGroup.classList.add('hidden');
      DOM.modalGuildJoinFields.classList.add('hidden');
      await loadMetadata();
      await loadCharacters();
    } catch (err) {
      console.error(err);
    }
  });

  // Migration Season triggers
  DOM.migrateCharBtnTrigger.addEventListener('click', () => {
    DOM.migrateCharModal.classList.remove('hidden');
  });

  DOM.migrateCharForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scenario = DOM.migrateScenario.value;
    const serverCode = DOM.migrateServer.value;
    try {
      const server = await apiCall('/servers', 'POST', {
        name: serverCode,
        scenario_name: scenario
      });
      await apiCall(`/characters/${state.activeCharacterId}/migrate`, 'POST', {
        server_id: server.id
      });
      showToast("Character migrated! Seasonal recipe progress reset.", false);
      DOM.migrateCharModal.classList.add('hidden');
      DOM.migrateCharForm.reset();
      await loadMetadata();
      await loadCharacters();
    } catch (err) {
      console.error(err);
    }
  });

  // Catalog Tab filters
  DOM.catalogSearch.addEventListener('input', () => filterCatalogUI());
  DOM.catalogCategorySelect.addEventListener('change', () => filterCatalogUI());
  DOM.catalogSourceSelect.addEventListener('change', () => filterCatalogUI());
  DOM.catalogSortSelect.addEventListener('change', () => filterCatalogUI());

  // Submit Recipe Form
  DOM.submitRecipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.submitRecipeError.classList.add('hidden');
    DOM.submitRecipeSuccess.classList.add('hidden');
    const item_name = DOM.recNewName.value;
    const formula = DOM.recNewFormula.value;
    const category = DOM.recNewCategory.value;
    const acquired_by = DOM.recNewAcquired.value;
    const submit_to_global = DOM.recSubmitGlobal.checked;
    try {
      const res = await apiCall('/recipes', 'POST', {
        item_name,
        formula,
        category,
        acquired_by,
        submit_to_global
      });
      showToast(res.message || "Recipe submitted successfully!", false);
      DOM.submitRecipeForm.reset();
      DOM.submitRecipeModal.classList.add('hidden');
      await loadCatalog();
    } catch (err) {
      DOM.submitRecipeError.textContent = err.message;
      DOM.submitRecipeError.classList.remove('hidden');
    }
  });

  // Execute Scraper Scan
  DOM.runScraperBtn.addEventListener('click', async () => {
    DOM.runScraperBtn.disabled = true;
    DOM.runScraperBtn.querySelector('span').textContent = 'Scanning...';
    const use_mock = DOM.scraperUseMock.checked;
    try {
      const res = await apiCall('/admin/scrape', 'POST', { use_mock });
      showToast(res.message, false);
      await loadAdminQueue();
    } catch (err) {
      console.error(err);
    } finally {
      DOM.runScraperBtn.disabled = false;
      DOM.runScraperBtn.querySelector('span').textContent = 'Execute Scraper Scan';
    }
  });

  // Execute Server Code Harvester
  DOM.runHarvesterBtn.addEventListener('click', async () => {
    const scenario = DOM.harvesterScenarioSelect.value;
    const text = DOM.harvesterText.value;
    if (!text.trim()) {
      showToast("Please paste some text containing server codes to harvest.", true);
      return;
    }
    DOM.runHarvesterBtn.disabled = true;
    DOM.runHarvesterBtn.querySelector('span').textContent = 'Extracting...';
    try {
      const res = await apiCall('/admin/harvest-servers', 'POST', {
        scenario_name: scenario,
        text: text
      });
      showToast(res.message, false);
      DOM.harvesterText.value = '';
      await loadMetadata();
    } catch (err) {
      console.error(err);
    } finally {
      DOM.runHarvesterBtn.disabled = false;
      DOM.runHarvesterBtn.querySelector('span').textContent = 'Extract & Register Servers';
    }
  });

  // Execute Steam News Auto-Harvester
  DOM.runSteamHarvesterBtn.addEventListener('click', async () => {
    DOM.runSteamHarvesterBtn.disabled = true;
    DOM.runSteamHarvesterBtn.querySelector('span').textContent = 'Harvesting Steam feed...';
    try {
      const res = await apiCall('/admin/harvest-steam-news', 'POST');
      showToast(res.message, false);
      await loadMetadata();
    } catch (err) {
      console.error(err);
    } finally {
      DOM.runSteamHarvesterBtn.disabled = false;
      DOM.runSteamHarvesterBtn.querySelector('span').textContent = 'Auto-Harvest from Steam Feed';
      lucide.createIcons();
    }
  });

  // Reset Scenario Server
  DOM.resetScenarioBtn.addEventListener('click', async () => {
    const serverId = DOM.adminResetServer.value;
    if (!serverId) {
      showToast("Please select a target server to reset.", true);
      return;
    }
    const code = prompt("CRITICAL ACTION REQUIRED!\nThis deletes all recipe progress and resets character levels to 1 for all characters on this server!\n\nType the word 'RESET' to confirm:");
    if (code !== 'RESET') {
      showToast("Reset canceled: Incorrect confirmation code.", true);
      return;
    }
    try {
      const res = await apiCall('/admin/reset-scenario', 'POST', { server_id: parseInt(serverId, 10) });
      showToast(res.message, false);
      await loadMetadata();
    } catch (err) {
      console.error(err);
    }
  });

  // Coordinator Mode toggles
  DOM.showRecipeMatrixBtn.addEventListener('click', () => toggleCoordinatorView('recipe'));
  DOM.showSpecMatrixBtn.addEventListener('click', () => toggleCoordinatorView('spec'));

  // Crafting Calculator triggers
  DOM.openCalculatorBtn.addEventListener('click', () => {
    DOM.calculatorModal.classList.remove('hidden');
    renderCalculatorUI();
  });
}

// Expose calculator functions to global scope for templates
function addRecipeToCalculator(recipeId) {
  const existing = state.calcQueue.find(item => item.recipeId === recipeId);
  if (existing) {
    existing.qty++;
  } else {
    state.calcQueue.push({ recipeId, qty: 1 });
  }
  showToast("Item added to Crafting Calculator!", false);
  renderCalculatorUI();
}

function adjustQueueQty(recipeId, delta) {
  const item = state.calcQueue.find(i => i.recipeId === recipeId);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromQueue(recipeId);
    } else {
      renderCalculatorUI();
    }
  }
}

function removeFromQueue(recipeId) {
  state.calcQueue = state.calcQueue.filter(i => i.recipeId !== recipeId);
  renderCalculatorUI();
}

function copyCoordsToClipboard(coords) {
  navigator.clipboard.writeText(coords).then(() => {
    showToast(`Coordinates ${coords} copied! Paste in game chat to drop pin.`, false);
  }).catch(err => {
    console.error("Failed to copy coordinates:", err);
    showToast("Failed to copy coordinates.", true);
  });
}

function formatCoords(text) {
  if (!text) return '';
  return text.replace(/\[\s*-?\d+\s*,\s*-?\d+\s*\]/g, (match) => {
    const clean = match.replace(/\s+/g, '');
    return `
      <span class="coord-pill" style="cursor: pointer; background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px; color: var(--status-learned-glow); vertical-align: middle; margin-left: 3px;" onclick="copyCoordsToClipboard('${clean}')" title="Click to copy waypoint pin coordinates">
        <i data-lucide="copy" style="width: 12px; height: 12px; display: inline-block;"></i> ${clean}
      </span>
    `;
  });
}

function parseFormulaString(formula) {
  if (!formula) return [];
  return formula.split(',').map(s => {
    const parts = s.trim().match(/^(\d+)\s+(.+)$/);
    if (parts) {
      return { qty: parseInt(parts[1], 10), name: parts[2].trim() };
    }
    return { qty: 1, name: s.trim() };
  }).filter(item => item.name.length > 0);
}

function calculateShoppingList() {
  const rawMaterials = {};
  const intermediateCrafts = {};
  
  function recurseIngredients(itemName, qty) {
    const recipe = state.recipes.find(r => r.item_name.toLowerCase() === itemName.toLowerCase());
    if (recipe && recipe.formula) {
      intermediateCrafts[recipe.item_name] = (intermediateCrafts[recipe.item_name] || 0) + qty;
      
      const parsedIngredients = parseFormulaString(recipe.formula);
      parsedIngredients.forEach(ing => {
        recurseIngredients(ing.name, ing.qty * qty);
      });
    } else {
      const cleanName = itemName.trim();
      rawMaterials[cleanName] = (rawMaterials[cleanName] || 0) + qty;
    }
  }

  state.calcQueue.forEach(item => {
    const recipe = state.recipes.find(r => r.id === item.recipeId);
    if (recipe) {
      const parsedIngredients = parseFormulaString(recipe.formula);
      parsedIngredients.forEach(ing => {
        recurseIngredients(ing.name, ing.qty * item.qty);
      });
    }
  });

  let resultsHtml = '';
  
  resultsHtml += `<h5 style="color: var(--status-learned-glow); font-size: 0.85rem; margin-top: 5px; margin-bottom: 5px;">Raw Materials</h5>`;
  const rawKeys = Object.keys(rawMaterials);
  if (rawKeys.length === 0) {
    resultsHtml += `<p style="color: var(--text-muted); font-size: 0.8rem; padding-left: 10px;">None</p>`;
  } else {
    rawKeys.sort().forEach(name => {
      resultsHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.01);">
          <span>${name}</span>
          <strong style="color: var(--text-main); font-family: monospace;">x${rawMaterials[name]}</strong>
        </div>
      `;
    });
  }

  resultsHtml += `<h5 style="color: var(--status-learning-glow); font-size: 0.85rem; margin-top: 15px; margin-bottom: 5px;">Intermediate Crafting Steps</h5>`;
  const interKeys = Object.keys(intermediateCrafts);
  if (interKeys.length === 0) {
    resultsHtml += `<p style="color: var(--text-muted); font-size: 0.8rem; padding-left: 10px;">None</p>`;
  } else {
    interKeys.sort().forEach(name => {
      const recipe = state.recipes.find(r => r.item_name === name);
      let crafterHelp = '';
      if (recipe) {
        const knownCrafters = [];
        state.matrixCharacters.forEach(c => {
          const status = (state.matrixState[c.id] && state.matrixState[c.id][recipe.id]) || null;
          if (status === 'learned') {
            knownCrafters.push(c.name);
          }
        });
        if (knownCrafters.length > 0) {
          crafterHelp = `<span style="font-size: 0.7rem; color: var(--status-learned-glow); display: block;">Known by: ${knownCrafters.join(', ')}</span>`;
        } else {
          crafterHelp = `<span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Nobody in guild knows this</span>`;
        }
      }

      resultsHtml += `
        <div style="font-size: 0.8rem; padding: 4px 10px; border-bottom: 1px solid rgba(255,255,255,0.01);">
          <div style="display: flex; justify-content: space-between;">
            <span>Craft ${name}</span>
            <strong style="color: var(--text-main); font-family: monospace;">x${intermediateCrafts[name]}</strong>
          </div>
          ${crafterHelp}
        </div>
      `;
    });
  }

  DOM.calcShoppingList.innerHTML = resultsHtml;
}

function renderCalculatorUI() {
  if (state.calcQueue.length === 0) {
    DOM.calcQueueList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; text-align: center;">Queue is empty. Add items from the catalog list below!</p>';
    DOM.calcShoppingList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; text-align: center;">No raw materials calculated.</p>';
    return;
  }

  let queueHtml = '';
  state.calcQueue.forEach(item => {
    const recipe = state.recipes.find(r => r.id === item.recipeId);
    if (!recipe) return;
    queueHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.02);">
        <div style="font-size: 0.85rem; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 130px;">${recipe.item_name}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-sm secondary-btn" style="padding: 2px 6px; min-width: unset;" onclick="adjustQueueQty(${item.recipeId}, -1)">-</button>
          <span style="font-size: 0.85rem; font-family: monospace; font-weight: bold; min-width: 15px; text-align: center;">${item.qty}</span>
          <button class="btn btn-sm secondary-btn" style="padding: 2px 6px; min-width: unset;" onclick="adjustQueueQty(${item.recipeId}, 1)">+</button>
          <button class="btn btn-sm danger-btn" style="padding: 2px 6px; min-width: unset; margin-left: 5px;" onclick="removeFromQueue(${item.recipeId})">x</button>
        </div>
      </div>
    `;
  });
  DOM.calcQueueList.innerHTML = queueHtml;

  calculateShoppingList();
  lucide.createIcons();
}

window.addRecipeToCalculator = addRecipeToCalculator;
window.adjustQueueQty = adjustQueueQty;
window.removeFromQueue = removeFromQueue;
window.copyCoordsToClipboard = copyCoordsToClipboard;
