const CIRCUMFERENCE = 2 * Math.PI * 15;

function parsePercent(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
}

function parseResetTime(text) {
  if (!text) return null;
  const match12 = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const match24 = text.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = String(parseInt(match24[1], 10)).padStart(2, '0');
    const m = match24[2];
    return `${h}:${m}`;
  }
  return null;
}

function parseWeeklyReset(text) {
  if (!text) return null;
  const timeStr = parseResetTime(text) || '00:00';
  const monthMap = {
    jan: 0, janv: 0, january: 0, janvier: 0, feb: 1, févr: 1, fevr: 1, february: 1, février: 1, fevrier: 1,
    mar: 2, mars: 2, march: 2, apr: 3, avr: 3, april: 3, avril: 3, may: 4, mai: 4, jun: 5, juin: 5, june: 5,
    jul: 6, juil: 6, july: 6, juillet: 6, aug: 7, aoû: 7, aout: 7, août: 7, august: 7, sep: 8, sept: 8, september: 8, septembre: 8,
    oct: 9, october: 9, octobre: 9, nov: 10, november: 10, novembre: 10, dec: 11, déc: 11, december: 11, décembre: 11
  };
  let day = null, month = null;

  let match = text.match(/(\d{1,2})\s+([a-zA-Zà-ÿ.]+)/);
  if (match) {
    const cleanMonth = match[2].toLowerCase().replace('.', '');
    for (const [key, val] of Object.entries(monthMap)) {
      if (cleanMonth.startsWith(key)) { day = parseInt(match[1], 10); month = val; break; }
    }
  }
  if (day === null) {
    match = text.match(/([a-zA-Zà-ÿ.]+)\s+(\d{1,2})/);
    if (match) {
      const cleanMonth = match[1].toLowerCase().replace('.', '');
      for (const [key, val] of Object.entries(monthMap)) {
        if (cleanMonth.startsWith(key)) { day = parseInt(match[2], 10); month = val; break; }
      }
    }
  }

  if (day !== null && month !== null) {
    const now = new Date();
    let year = now.getFullYear();
    if (month < now.getMonth() - 2) year += 1;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const resetDate = new Date(year, month, day, hours, minutes);
    const diffMs = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.max(0, Math.round(diffMs / 86400000));
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Resets in ${diffDays} days, on ${daysOfWeek[resetDate.getDay()]} ${String(resetDate.getDate()).padStart(2, '0')}/${String(resetDate.getMonth() + 1).padStart(2, '0')}/${resetDate.getFullYear()} at ${timeStr}`;
  }
  return null;
}

function updateAllUI(data) {
  const circle = document.getElementById('gemini-progress-circle-fill');
  const text = document.getElementById('gemini-usage-text');
  
  if (circle && text && data.currentUsage !== undefined) {
    circle.style.strokeDashoffset = CIRCUMFERENCE - (data.currentUsage / 100) * CIRCUMFERENCE;
    text.textContent = `${data.currentUsage}%`;
  }
  
  if (data.currentUsage !== undefined) {
    const fhStat = document.getElementById('gxt-fiveHourStat');
    const fhFill = document.getElementById('gxt-fiveHourFill');
    if (fhStat) fhStat.textContent = `${data.currentUsage}%`;
    if (fhFill) fhFill.style.width = `${data.currentUsage}%`;
  }
  if (data.weeklyUsage !== undefined) {
    const wStat = document.getElementById('gxt-weeklyStat');
    const wFill = document.getElementById('gxt-weeklyFill');
    if (wStat) wStat.textContent = `${data.weeklyUsage}%`;
    if (wFill) wFill.style.width = `${data.weeklyUsage}%`;
  }
  if (data.currentReset) {
    const fhRes = document.getElementById('gxt-fiveHourReset');
    if (fhRes) fhRes.textContent = `Resets at ${data.currentReset}`;
  }
  if (data.weeklyReset) {
    const wRes = document.getElementById('gxt-weeklyReset');
    if (wRes) wRes.textContent = data.weeklyReset;
  }
}

function scrapeUsagePage() {
  const currentElem = document.querySelector('div[data-test-id="gxu-currently"]');
  const weeklyElem = document.querySelector('div[data-test-id="gxu-weekly"]');
  if (currentElem) {
    const currentPercent = parsePercent(currentElem.innerText);
    const weeklyPercent = weeklyElem ? parsePercent(weeklyElem.innerText) : null;
    if (currentPercent !== null) {
      chrome.storage.local.set({
        currentUsage: currentPercent,
        weeklyUsage: weeklyPercent !== null ? weeklyPercent : 0,
        currentReset: parseResetTime(currentElem.innerText),
        weeklyReset: parseWeeklyReset(weeklyElem ? weeklyElem.innerText : ''),
        lastUpdated: Date.now()
      });
      return true;
    }
  }
  return false;
}

function triggerSyncProcess() {
  const container = document.getElementById('gemini-usage-tracker-container');
  if (!container || container.classList.contains('syncing')) return;

  container.classList.add('syncing');

  const syncBtn = document.getElementById('gxt-syncBtn');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span>↻ Syncing...</span>';
  }

  chrome.runtime.sendMessage({ action: 'triggerSync' }, () => {
    container.classList.remove('syncing');
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<span>↻ Sync</span>';
    }
  });
}

function initUsageTracker() {
  if (document.getElementById('gemini-usage-tracker-container')) return;

  const container = document.createElement('div');
  container.id = 'gemini-usage-tracker-container';

  container.innerHTML = `
    <!-- PILL VIEW -->
    <svg id="gemini-pill-view" viewBox="0 0 36 58">
      <defs>
        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7cacf8" /><stop offset="100%" stop-color="#b388ff" />
        </linearGradient>
      </defs>
      <path id="gemini-pill-btn" fill-rule="evenodd" d="M 0 18 A 18 18 0 0 1 36 18 L 36 40 A 18 18 0 0 1 0 40 Z M 18 4.5 A 13.5 13.5 0 1 0 18 31.5 A 13.5 13.5 0 1 0 18 4.5 Z" />
      <g transform="rotate(-90 18 18)">
        <circle class="gemini-circle-bg" cx="18" cy="18" r="15" />
        <circle id="gemini-progress-circle-fill" class="gemini-circle-fill" cx="18" cy="18" r="15" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}" />
      </g>
      <text id="gemini-usage-text" x="18" y="44">--%</text>
    </svg>

    <!-- EXPANDED MENU UI -->
    <div id="gemini-expanded-menu">
      <!-- Click Blockers: kept at z-index: 1 so they stay behind content elements -->
      <div class="gxt-backdrop-blocker" style="top: 0; left: 36px; right: 0; height: 58px;"></div>
      <div class="gxt-backdrop-blocker" style="top: 58px; left: 0; right: 0; bottom: 0;"></div>

      <div class="gxt-header">Usage Limits</div>
      <div class="gxt-toggle-row">
        <span>Always-on Display</span>
        <label class="gxt-switch">
          <input type="checkbox" id="gxt-toggleAlwaysOn" checked>
          <span class="gxt-slider"></span>
        </label>
      </div>
      <div class="gxt-stats-card">
        <div class="gxt-stat-item">
          <span class="gxt-stat-label">5-Hour Period</span>
          <span class="gxt-stat-value" id="gxt-fiveHourStat">--%</span>
          <div class="gxt-mini-track"><div class="gxt-mini-fill" id="gxt-fiveHourFill" style="width: 0%;"></div></div>
          <span class="gxt-stat-reset" id="gxt-fiveHourReset">Resets at --:--</span>
        </div>
        <div class="gxt-stat-item">
          <span class="gxt-stat-label">Weekly Usage</span>
          <span class="gxt-stat-value" id="gxt-weeklyStat">--%</span>
          <div class="gxt-mini-track"><div class="gxt-mini-fill" id="gxt-weeklyFill" style="width: 0%; background: #b388ff;"></div></div>
          <span class="gxt-stat-reset" id="gxt-weeklyReset">Resets --</span>
        </div>
      </div>
      <div class="gxt-button-group">
        <button class="gxt-action-btn" id="gxt-syncBtn"><span>↻ Sync</span></button>
        <button class="gxt-action-btn" id="gxt-viewBtn"><span>↗ View Limits</span></button>
      </div>
      
      <!-- Retract Button -->
      <button id="gxt-retract-btn" title="Retract to Pill">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="19" x2="6" y2="6"></line>
          <polyline points="14 6 6 6 6 14"></polyline>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(container);

  // --- LONG PRESS LOGIC ---
  const pillBtn = container.querySelector('#gemini-pill-btn');
  let pressTimer;
  let isLongPress = false;
  
  const closeMenu = () => container.classList.remove('expanded');

  pillBtn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    
    if (container.classList.contains('expanded')) {
      closeMenu();
      return;
    }

    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      container.classList.add('expanded');
    }, 400);
  });

  pillBtn.addEventListener('mouseleave', () => clearTimeout(pressTimer));

  pillBtn.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
    if (!isLongPress && !container.classList.contains('expanded')) {
      triggerSyncProcess();
    }
  });

  // --- MENU INTERACTIONS ---
  const toggle = container.querySelector('#gxt-toggleAlwaysOn');
  toggle.addEventListener('change', () => chrome.storage.local.set({ alwaysOn: toggle.checked }));

  container.querySelector('#gxt-syncBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    triggerSyncProcess();
  });

  // Direct tab opening that works natively in webpage context
  container.querySelector('#gxt-viewBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.open('https://gemini.google.com/usage', '_blank');
  });

  container.querySelector('#gxt-retract-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  // Close when clicking off the menu
  document.addEventListener('mousedown', (e) => {
    if (container.classList.contains('expanded') && !container.contains(e.target)) {
      closeMenu();
    }
  });

  container.addEventListener('mousedown', (e) => e.stopPropagation());

  // --- INITIAL DATA LOAD ---
  chrome.storage.local.get(['alwaysOn', 'currentUsage', 'weeklyUsage', 'currentReset', 'weeklyReset'], (result) => {
    if (result.alwaysOn === false) container.classList.add('tracker-hidden');
    toggle.checked = result.alwaysOn !== false;
    updateAllUI(result);
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const container = document.getElementById('gemini-usage-tracker-container');
    if (changes.alwaysOn && container) {
      if (changes.alwaysOn.newValue === false) container.classList.add('tracker-hidden');
      else container.classList.remove('tracker-hidden');
    }
    const update = {};
    if (changes.currentUsage) update.currentUsage = changes.currentUsage.newValue;
    if (changes.weeklyUsage) update.weeklyUsage = changes.weeklyUsage.newValue;
    if (changes.currentReset) update.currentReset = changes.currentReset.newValue;
    if (changes.weeklyReset) update.weeklyReset = changes.weeklyReset.newValue;
    updateAllUI(update);
  }
});

window.addEventListener('load', () => {
  if (window.location.pathname.includes('/usage')) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (scrapeUsagePage()) {
        clearInterval(interval);
        chrome.runtime.sendMessage({ action: 'syncComplete' });
      } else if (attempts >= 100) {
        clearInterval(interval);
        chrome.runtime.sendMessage({ action: 'syncComplete' });
      }
    }, 250);
  } else {
    initUsageTracker();
  }
});