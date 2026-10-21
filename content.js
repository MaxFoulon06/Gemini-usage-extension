// Gemini default dimensions
const GEMINI_CIRCUMFERENCE = 2 * Math.PI * 15; // ~94.25px

function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('chatgpt.com')) return 'chatgpt';
  if (host.includes('claude.ai')) return 'claude';
  return 'gemini';
}

const PLATFORM = detectPlatform();

const PLATFORM_CONFIG = {
  gemini: {
    title: 'Usage Limits',
    gradStart: '#7cacf8',
    gradEnd: '#b388ff',
    bar1Color: '#8ab4f8',
    bar2Color: '#b388ff',
    usageUrl: 'https://gemini.google.com/usage',
    viewBox: '0 0 36 58',
    textX: 18,
    textY: 45
  },
  chatgpt: {
    title: 'ChatGPT Limits',
    gradStart: '#10a37f',
    gradEnd: '#34d399',
    bar1Color: '#10a37f',
    bar2Color: '#34d399',
    usageUrl: 'https://chatgpt.com/settings/usage?tab=overview'
  },
  claude: {
    title: 'Claude Limits',
    gradStart: '#d97757',
    gradEnd: '#f59e0b',
    bar1Color: '#d97757',
    bar2Color: '#f59e0b',
    usageUrl: 'https://claude.ai/settings/usage',
    viewBox: '0 0 32 42',
    textX: 16,
    textY: 33
  }
};

function getStorageKeys(platform) {
  if (platform === 'gemini') {
    return {
      alwaysOn: 'alwaysOn',
      currentUsage: 'currentUsage',
      weeklyUsage: 'weeklyUsage',
      currentReset: 'currentReset',
      weeklyReset: 'weeklyReset'
    };
  }
  return {
    alwaysOn: `${platform}_alwaysOn`,
    currentUsage: `${platform}_currentUsage`,
    weeklyUsage: `${platform}_weeklyUsage`,
    currentReset: `${platform}_currentReset`,
    weeklyReset: `${platform}_weeklyReset`
  };
}

function parsePercent(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Math.round(parseFloat(match[1])) : null;
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
  const pct = data.currentUsage !== undefined ? Math.min(100, Math.max(0, data.currentUsage)) : null;

  if (PLATFORM === 'chatgpt') {
    const barFill = document.getElementById('chatgpt-bar-fill');
    const barPct = document.getElementById('chatgpt-bar-pct');
    if (pct !== null) {
      if (barFill) barFill.style.width = `${pct}%`;
      if (barPct) barPct.textContent = `${pct}%`;
    }
  } else {
    const shapeFill = document.getElementById('gemini-progress-circle-fill');
    const text = document.getElementById('gemini-usage-text');
    if (shapeFill && text && pct !== null) {
      if (PLATFORM === 'gemini') {
        shapeFill.style.strokeDashoffset = GEMINI_CIRCUMFERENCE - (pct / 100) * GEMINI_CIRCUMFERENCE;
      } else if (PLATFORM === 'claude') {
        shapeFill.style.strokeDashoffset = 100 - pct;
      }
      text.textContent = `${pct}%`;
    }
  }

  if (data.currentUsage !== undefined) {
    const fhStat = document.getElementById('gxt-fiveHourStat');
    const fhFill = document.getElementById('gxt-fiveHourFill');
    if (fhStat) fhStat.textContent = `${data.currentUsage}%`;
    if (fhFill) fhFill.style.width = `${Math.min(100, data.currentUsage)}%`;
  }
  if (data.weeklyUsage !== undefined) {
    const wStat = document.getElementById('gxt-weeklyStat');
    const wFill = document.getElementById('gxt-weeklyFill');
    if (wStat) wStat.textContent = `${data.weeklyUsage}%`;
    if (wFill) wFill.style.width = `${Math.min(100, data.weeklyUsage)}%`;
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

// Scrapers
function scrapeGeminiUsage() {
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

// Scrapes ChatGPT and converts Remaining % to Consumed % (100 - remaining)
function scrapeChatGPTUsage() {
  const bodyText = document.body ? document.body.innerText : '';
  const allMatches = [...bodyText.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => Math.round(parseFloat(m[1])));
  if (allMatches.length > 0) {
    const rawRemaining = allMatches[0];
    const currentPercent = Math.max(0, Math.min(100, 100 - rawRemaining));
    const weeklyPercent = allMatches.length > 1 ? Math.max(0, Math.min(100, 100 - allMatches[1])) : 0;

    const resetTime = parseResetTime(bodyText) || '00:00';
    const weeklyReset = parseWeeklyReset(bodyText) || 'Resets in 7 days';

    chrome.storage.local.set({
      chatgpt_currentUsage: currentPercent,
      chatgpt_weeklyUsage: weeklyPercent,
      chatgpt_currentReset: resetTime,
      chatgpt_weeklyReset: weeklyReset,
      chatgpt_lastUpdated: Date.now()
    });
    return true;
  }
  return false;
}

// Claude rolling prompt counter
function recalculateClaudeRollingUsage(addNewTimestamp = false) {
  chrome.storage.local.get(['claude_timestamps', 'claude_max5h', 'claude_maxWeekly'], (res) => {
    const now = Date.now();
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const max5h = res.claude_max5h || 20;
    const maxWeekly = res.claude_maxWeekly || 140;

    let timestamps = Array.isArray(res.claude_timestamps) ? res.claude_timestamps : [];
    if (addNewTimestamp) timestamps.push(now);

    timestamps = timestamps.filter(ts => now - ts < SEVEN_DAYS);
    const active5h = timestamps.filter(ts => now - ts < FIVE_HOURS);

    const currentPct = Math.min(100, Math.round((active5h.length / max5h) * 100));
    const weeklyPct = Math.min(100, Math.round((timestamps.length / maxWeekly) * 100));

    let reset5hStr = '00:00';
    if (active5h.length > 0) {
      const oldest5h = Math.min(...active5h);
      const resetDate = new Date(oldest5h + FIVE_HOURS);
      reset5hStr = `${String(resetDate.getHours()).padStart(2, '0')}:${String(resetDate.getMinutes()).padStart(2, '0')}`;
    } else {
      const next5h = new Date(now + FIVE_HOURS);
      reset5hStr = `${String(next5h.getHours()).padStart(2, '0')}:${String(next5h.getMinutes()).padStart(2, '0')}`;
    }

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const wResetDate = timestamps.length > 0 ? new Date(Math.min(...timestamps) + SEVEN_DAYS) : new Date(now + SEVEN_DAYS);
    const diffDays = Math.max(0, Math.round((wResetDate.getTime() - now) / 86400000));
    const wResetStr = `Resets in ${diffDays} days, on ${daysOfWeek[wResetDate.getDay()]} ${String(wResetDate.getDate()).padStart(2, '0')}/${String(wResetDate.getMonth() + 1).padStart(2, '0')}/${wResetDate.getFullYear()} at 00:00`;

    chrome.storage.local.set({
      claude_timestamps: timestamps,
      claude_currentUsage: currentPct,
      claude_weeklyUsage: weeklyPct,
      claude_currentReset: reset5hStr,
      claude_weeklyReset: wResetStr,
      claude_lastUpdated: now
    });
  });
}

function setupClaudePromptListener() {
  recalculateClaudeRollingUsage(false);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const active = document.activeElement;
      if (active && (active.getAttribute('contenteditable') === 'true' || active.tagName === 'TEXTAREA')) {
        setTimeout(() => recalculateClaudeRollingUsage(true), 150);
      }
    }
  }, true);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[aria-label*="Send" i], button[data-testid*="send" i]');
    if (btn && !btn.disabled) {
      setTimeout(() => recalculateClaudeRollingUsage(true), 150);
    }
  }, true);
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

  if (PLATFORM === 'claude') {
    recalculateClaudeRollingUsage(false);
    setTimeout(() => {
      container.classList.remove('syncing');
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<span>↻ Sync Now</span>';
      }
    }, 500);
    return;
  }

  chrome.runtime.sendMessage({ action: 'triggerSync', platform: PLATFORM }, () => {
    container.classList.remove('syncing');
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<span>↻ Sync Now</span>';
    }
  });
}

function getGaugeMarkup() {
  if (PLATFORM === 'gemini') {
    return `
      <path id="gemini-pill-btn" fill-rule="evenodd" d="M 0 18 A 18 18 0 0 1 36 18 L 36 40 A 18 18 0 0 1 0 40 Z M 18 4.5 A 13.5 13.5 0 1 0 18 31.5 A 13.5 13.5 0 1 0 18 4.5 Z" />
      <g transform="rotate(-90 18 18)">
        <circle class="gemini-circle-bg" cx="18" cy="18" r="15" />
        <circle id="gemini-progress-circle-fill" class="gemini-circle-fill" cx="18" cy="18" r="15" stroke-dasharray="${GEMINI_CIRCUMFERENCE}" stroke-dashoffset="${GEMINI_CIRCUMFERENCE}" />
      </g>
    `;
  } else {
    // Claude
    return `
      <path id="gemini-pill-btn" fill-rule="evenodd" d="M 8 0 H 24 A 8 8 0 0 1 32 8 V 34 A 8 8 0 0 1 24 42 H 8 A 8 8 0 0 1 0 34 V 8 A 8 8 0 0 1 8 0 Z M 4 4 H 28 V 28 H 4 Z" />
      <rect class="gemini-circle-bg" x="2.5" y="2.5" width="27" height="27" rx="6" pathLength="100" />
      <rect id="gemini-progress-circle-fill" class="gemini-circle-fill" x="2.5" y="2.5" width="27" height="27" rx="6" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" />
    `;
  }
}

function initUsageTracker() {
  if (document.getElementById('gemini-usage-tracker-container')) return;

  const cfg = PLATFORM_CONFIG[PLATFORM];
  const keys = getStorageKeys(PLATFORM);

  const container = document.createElement('div');
  container.id = 'gemini-usage-tracker-container';
  container.classList.add(`ai-${PLATFORM}`);

  let primaryTrackerHtml = '';

  if (PLATFORM === 'chatgpt') {
    primaryTrackerHtml = `
      <div id="gemini-pill-btn" class="chatgpt-btn-surface" title="Click to sync, Hold for stats">
        <div class="chatgpt-bar-wrap">
          <div class="chatgpt-bar-track">
            <div id="chatgpt-bar-fill" class="chatgpt-bar-fill" style="width: 0%;"></div>
          </div>
        </div>
        <div class="chatgpt-bar-meta">
          <span id="chatgpt-bar-pct" class="chatgpt-bar-pct">0%</span>
        </div>
      </div>
    `;
  } else {
    primaryTrackerHtml = `
      <svg id="gemini-pill-view" viewBox="${cfg.viewBox}">
        <defs>
          <linearGradient id="ai-primary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.gradStart}" />
            <stop offset="100%" stop-color="${cfg.gradEnd}" />
          </linearGradient>
        </defs>
        ${getGaugeMarkup()}
        <text id="gemini-usage-text" x="${cfg.textX}" y="${cfg.textY}">--%</text>
      </svg>
    `;
  }

  container.innerHTML = `
    ${primaryTrackerHtml}

    <!-- EXPANDED MENU UI -->
    <div id="gemini-expanded-menu">
      <div class="gxt-backdrop-blocker" style="top: 0; left: 0; right: 0; bottom: 0;"></div>

      <div class="gxt-header">${cfg.title}</div>
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
          <div class="gxt-mini-track"><div class="gxt-mini-fill" id="gxt-fiveHourFill" style="width: 0%; background: ${cfg.bar1Color};"></div></div>
          <span class="gxt-stat-reset" id="gxt-fiveHourReset">Resets at --:--</span>
        </div>
        <div class="gxt-stat-item">
          <span class="gxt-stat-label">Weekly Usage</span>
          <span class="gxt-stat-value" id="gxt-weeklyStat">--%</span>
          <div class="gxt-mini-track"><div class="gxt-mini-fill" id="gxt-weeklyFill" style="width: 0%; background: ${cfg.bar2Color};"></div></div>
          <span class="gxt-stat-reset" id="gxt-weeklyReset">Resets --</span>
        </div>
      </div>
      <div class="gxt-button-group">
        <button class="gxt-action-btn" id="gxt-syncBtn"><span>↻ Sync Now</span></button>
        <button class="gxt-action-btn" id="gxt-viewBtn"><span>↗ View Limits Page</span></button>
      </div>

      <!-- Retract Button -->
      <button id="gxt-retract-btn" title="Retract to Tracker">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="19" x2="6" y2="6"></line>
          <polyline points="14 6 6 6 6 14"></polyline>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(container);

  const closeMenu = () => container.classList.remove('expanded');

  // Unified Long-Press & Single-Click Logic
  const pillBtn = container.querySelector('#gemini-pill-btn');
  let pressTimer;
  let isLongPress = false;

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

  // Common popout menu interactions
  const toggle = container.querySelector('#gxt-toggleAlwaysOn');
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ [keys.alwaysOn]: toggle.checked });
  });

  container.querySelector('#gxt-syncBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    triggerSyncProcess();
  });

  container.querySelector('#gxt-viewBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(cfg.usageUrl, '_blank');
  });

  container.querySelector('#gxt-retract-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
  });

  document.addEventListener('mousedown', (e) => {
    if (container.classList.contains('expanded') && !container.contains(e.target)) {
      closeMenu();
    }
  });

  container.addEventListener('mousedown', (e) => e.stopPropagation());

  // Load saved metrics
  chrome.storage.local.get(Object.values(keys), (result) => {
    const isAlwaysOn = result[keys.alwaysOn] !== false;
    if (!isAlwaysOn) container.classList.add('tracker-hidden');
    toggle.checked = isAlwaysOn;

    updateAllUI({
      currentUsage: result[keys.currentUsage] !== undefined ? result[keys.currentUsage] : 0,
      weeklyUsage: result[keys.weeklyUsage] !== undefined ? result[keys.weeklyUsage] : 0,
      currentReset: result[keys.currentReset],
      weeklyReset: result[keys.weeklyReset]
    });
  });

  if (PLATFORM === 'claude') {
    setupClaudePromptListener();
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const keys = getStorageKeys(PLATFORM);
    const container = document.getElementById('gemini-usage-tracker-container');
    const toggle = document.getElementById('gxt-toggleAlwaysOn');

    if (changes[keys.alwaysOn] && container) {
      const enabled = changes[keys.alwaysOn].newValue !== false;
      if (!enabled) container.classList.add('tracker-hidden');
      else container.classList.remove('tracker-hidden');
      if (toggle) toggle.checked = enabled;
    }

    const update = {};
    if (changes[keys.currentUsage]) update.currentUsage = changes[keys.currentUsage].newValue;
    if (changes[keys.weeklyUsage]) update.weeklyUsage = changes[keys.weeklyUsage].newValue;
    if (changes[keys.currentReset]) update.currentReset = changes[keys.currentReset].newValue;
    if (changes[keys.weeklyReset]) update.weeklyReset = changes[keys.weeklyReset].newValue;

    if (Object.keys(update).length > 0) {
      updateAllUI(update);
    }
  }
});

window.addEventListener('load', () => {
  const isGeminiUsage = PLATFORM === 'gemini' && window.location.pathname.includes('/usage');
  const isChatGPTUsage = PLATFORM === 'chatgpt' && (window.location.pathname.includes('/settings/usage') || window.location.search.includes('tab=overview'));

  if (isGeminiUsage || isChatGPTUsage) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const done = isGeminiUsage ? scrapeGeminiUsage() : scrapeChatGPTUsage();
      if (done || attempts >= 100) {
        clearInterval(interval);
        chrome.runtime.sendMessage({ action: 'syncComplete' });
      }
    }, 250);
  } else {
    initUsageTracker();
  }
});