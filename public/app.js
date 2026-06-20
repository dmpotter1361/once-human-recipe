// ================= STATE & CONFIGURATION ================= //
const API_BASE = '/api';
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
  matrixState: {}
};

// ================= INITIALIZATION ================= //
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  initAuth();
  initTabs();
  
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
    
    // Wishlist Tab
    wishlistServerSelect: document.getElementById('wishlist-server-select'),
    wishlistContainer: document.getElementById('wishlist-container'),
    
    // Characters Tab
    myCharactersList: document.getElementById('my-characters-list'),
    openCreateCharBtn: document.getElementById('open-create-char-btn'),
    createCharModal: document.getElementById('create-char-modal'),
    createCharForm: document.getElementById('create-char-form'),
    charNewName: document.getElementById('char-new-name'),
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
    globalCatalogList: document.getElementById('global-catalog-list'),
    submitRecipeForm: document.getElementById('submit-recipe-form'),
    recNewName: document.getElementById('rec-new-name'),
    recNewFormula: document.getElementById('rec-new-formula'),
    recNewCategory: document.getElementById('rec-new-category'),
    recNewAcquired: document.getElementById('rec-new-acquired'),
    recSubmitGlobal: document.getElementById('rec-submit-global'),
    submitRecipeSuccess: document.getElementById('submit-recipe-success'),
    submitRecipeError: document.getElementById('submit-recipe-error'),
    
    // Admin Tab
    adminPendingList: document.getElementById('admin-pending-list'),
    scraperUseMock: document.getElementById('scraper-use-mock'),
    runScraperBtn: document.getElementById('run-scraper-btn'),
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
      DOM.authTitle.textContent = "Initialize Stardust Sync";
      DOM.authDesc.textContent = "Register a new account to begin tracking.";
      DOM.authSubmitBtn.querySelector('span').textContent = "Register Node";
      DOM.authToggleText.textContent = "Already verified?";
      DOM.authToggleLink.textContent = "Authorize Account";
    } else {
      DOM.authTitle.textContent = "System Authorization";
      DOM.authDesc.textContent = "Connect to the guild stardust network to synchronize recipe data.";
      DOM.authSubmitBtn.querySelector('span').textContent = "Authorize";
      DOM.authToggleText.textContent = "New to the network?";
      DOM.authToggleLink.textContent = "Initialize Account";
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
    `;
  }
  DOM.mobileMatrixView.innerHTML = mobileHtml;
  
  lucide.createIcons();
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
DOM.wishlistServerSelect.addEventListener('change', () => {
  loadWishlist();
});

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
      <button class="btn btn-sm danger-btn" onclick="leaveGuild(${char.id})">Leave Guild</button>
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

  // Load recipes list with user status checks
  await loadRecipeChecklist(char.id);
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

DOM.checklistSearchInput.addEventListener('input', () => {
  renderRecipeChecklistUI();
});

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
  // Simple prompt overlay for simplicity
  const guildId = prompt(`Select Guild ID:\n` + state.guilds.map(g => `${g.id}: ${g.name}`).join('\n'));
  if (!guildId) return;
  const passcode = prompt("Enter Guild Join Passcode:");
  if (passcode === null) return;

  joinGuild(charId, parseInt(guildId, 10), passcode);
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
  const name = prompt("Enter new Guild Name:");
  if (!name) return;
  const passcode = prompt("Set Guild Join Passcode (others will use this to join):");
  if (!passcode) return;

  createGuild(name, passcode);
}
window.openCreateGuildModal = openCreateGuildModal;

async function createGuild(name, passcode) {
  try {
    const data = await apiCall('/guilds', 'POST', {
      name,
      join_passcode: passcode
    });
    showToast("Guild created successfully!", false);
    await loadMetadata();
    if (state.activeCharacterId) {
      await joinGuild(state.activeCharacterId, data.guildId, passcode);
    }
  } catch (err) {
    console.error(err);
  }
}

// Delete character
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

// Create character alt modal controls
DOM.openCreateCharBtn.addEventListener('click', () => {
  DOM.createCharModal.classList.remove('hidden');
});

document.querySelectorAll('.close-modal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.createCharModal.classList.add('hidden');
    DOM.migrateCharModal.classList.add('hidden');
  });
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
  
  let scenario = DOM.charNewScenario.value;
  if (scenario === 'custom') {
    scenario = DOM.charCustomScenario.value;
  }
  
  const serverCode = DOM.charNewServer.value;
  const name = DOM.charNewName.value;

  try {
    // 1. Create Server/Scenario entity
    const server = await apiCall('/servers', 'POST', {
      name: serverCode,
      scenario_name: scenario
    });

    // 2. Create Character
    let body = {
      name,
      server_id: server.id
    };

    if (DOM.charJoinGuildCheck.checked) {
      body.guild_id = parseInt(DOM.charJoinGuildSelect.value, 10);
      body.join_passcode = DOM.charJoinGuildPasscode.value;
    }

    await apiCall('/characters', 'POST', body);
    showToast("Character created successfully!", false);
    
    // Reset Form
    DOM.createCharForm.reset();
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
    // 1. Create target Server
    const server = await apiCall('/servers', 'POST', {
      name: serverCode,
      scenario_name: scenario
    });

    // 2. Trigger migration
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


// ================= 4. CATALOG TAB LOGIC ================= //
DOM.catalogSearch.addEventListener('input', () => filterCatalogUI());
DOM.catalogCategorySelect.addEventListener('change', () => filterCatalogUI());

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

  const filtered = state.recipes.filter(r => {
    const matchesSearch = r.item_name.toLowerCase().includes(searchQuery) || (r.formula && r.formula.toLowerCase().includes(searchQuery));
    const matchesCategory = category === 'all' || r.category === category;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    DOM.globalCatalogList.innerHTML = '<p class="empty-state">No recipes found matching query.</p>';
    return;
  }

  let html = '';
  for (const r of filtered) {
    html += `
      <div class="catalog-item glass-panel">
        <h4>${r.item_name}</h4>
        <p class="formula"><strong>Formula:</strong> ${r.formula || 'No recipe ingredients recorded'}</p>
        <div class="meta-row">
          <span class="badge primary">${r.category}</span>
          ${r.acquired_by ? `<span class="badge">Source: ${r.acquired_by}</span>` : ''}
        </div>
      </div>
    `;
  }
  DOM.globalCatalogList.innerHTML = html;
  lucide.createIcons();
}

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

    DOM.submitRecipeSuccess.textContent = res.message;
    DOM.submitRecipeSuccess.classList.remove('hidden');
    DOM.submitRecipeForm.reset();
    
    await loadCatalog();
  } catch (err) {
    DOM.submitRecipeError.textContent = err.message;
    DOM.submitRecipeError.classList.remove('hidden');
  }
});


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
