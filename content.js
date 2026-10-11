const CIRCUMFERENCE = 2 * Math.PI * 15; // Radius = 15 => ~94.25px

function parsePercent(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
}

// Extracts 24h time format (HH:MM)
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

// Parses French and English date strings into "In X days, on Mon DD/MM/YYYY at HH:MM"
function parseWeeklyReset(text) {
  if (!text) return null;

  const timeStr = parseResetTime(text) || '00:00';

  const monthMap = {
    jan: 0, janv: 0, january: 0, janvier: 0,
    feb: 1, févr: 1, fevr: 1, february: 1, février: 1, fevrier: 1,
    mar: 2, mars: 2, march: 2,
    apr: 3, avr: 3, april: 3, avril: 3,
    may: 4, mai: 4,
    jun: 5, juin: 5, june: 5,
    jul: 6, juil: 6, july: 6, juillet: 6,
    aug: 7, aoû: 7, aout: 7, août: 7, august: 7,
    sep: 8, sept: 8, september: 8, septembre: 8,
    oct: 9, october: 9, octobre: 9,
    nov: 10, november: 10, novembre: 10,
    dec: 11, déc: 11, december: 11, décembre: 11
  };

  let day = null;
  let month = null;

  // Day first: "13 oct."
  const dayMonthMatch = text.match(/(\d{1,2})\s+([a-zA-Zà-ÿ.]+)/);
  if (dayMonthMatch) {
    const cleanMonth = dayMonthMatch[2].toLowerCase().replace('.', '');
    for (const [key, val] of Object.entries(monthMap)) {
      if (cleanMonth.startsWith(key)) {
        day = parseInt(dayMonthMatch[1], 10);
        month = val;
        break;
      }
    }
  }

  // Month first: "Oct 13"
  if (day === null) {
    const monthDayMatch = text.match(/([a-zA-Zà-ÿ.]+)\s+(\d{1,2})/);
    if (monthDayMatch) {
      const cleanMonth = monthDayMatch[1].toLowerCase().replace('.', '');
      for (const [key, val] of Object.entries(monthMap)) {
        if (cleanMonth.startsWith(key)) {
          day = parseInt(monthDayMatch[2], 10);
          month = val;
          break;
        }
      }
    }
  }

  if (day !== null && month !== null) {
    const now = new Date();
    let year = now.getFullYear();
    if (month < now.getMonth() - 2) {
      year += 1;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const resetDate = new Date(year, month, day, hours, minutes);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetDayStart = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate());
    const diffMs = resetDayStart.getTime() - todayStart.getTime();
    let diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = daysOfWeek[resetDate.getDay()];
    const dd = String(resetDate.getDate()).padStart(2, '0');
    const mm = String(resetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = resetDate.getFullYear();

    return `Resets in ${diffDays} days, on ${weekday} ${dd}/${mm}/${yyyy} at ${timeStr}`;
  }

  return null;
}

function updateCircularUI(percent) {
  const circle = document.getElementById('gemini-progress-circle-fill');
  const text = document.getElementById('gemini-usage-text');

  if (circle && text && percent !== null) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    circle.style.strokeDashoffset = offset;
    text.textContent = `${percent}%`;
  }
}

function scrapeUsagePage() {
  const currentElem = document.querySelector('div[data-test-id="gxu-currently"]');
  const weeklyElem = document.querySelector('div[data-test-id="gxu-weekly"]');

  if (currentElem) {
    const currentPercent = parsePercent(currentElem.innerText);
    const weeklyPercent = weeklyElem ? parsePercent(weeklyElem.innerText) : null;
    const currentResetTime = parseResetTime(currentElem.innerText);
    const weeklyResetStr = parseWeeklyReset(weeklyElem ? weeklyElem.innerText : '');

    if (currentPercent !== null) {
      const dataToSave = {
        currentUsage: currentPercent,
        weeklyUsage: weeklyPercent !== null ? weeklyPercent : 0,
        lastUpdated: Date.now()
      };

      if (currentResetTime) {
        dataToSave.currentReset = currentResetTime;
      }
      if (weeklyResetStr) {
        dataToSave.weeklyReset = weeklyResetStr;
      }

      chrome.storage.local.set(dataToSave);
      return true;
    }
  }
  return false;
}

function triggerSyncProcess() {
  const container = document.getElementById('gemini-usage-tracker-container');
  if (!container || container.classList.contains('syncing')) return;

  container.classList.add('syncing');
  chrome.runtime.sendMessage({ action: 'triggerSync' }, () => {
    container.classList.remove('syncing');
  });
}

function initUsageTracker() {
  if (document.getElementById('gemini-usage-tracker-container')) return;

  const container = document.createElement('div');
  container.id = 'gemini-usage-tracker-container';

  container.innerHTML = `
    <svg id="gemini-pill-svg" viewBox="0 0 36 58">
      <defs>
        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7cacf8" />
          <stop offset="100%" stop-color="#b388ff" />
        </linearGradient>
      </defs>

      <path
        id="gemini-pill-btn"
        fill-rule="evenodd"
        d="M 0 18 A 18 18 0 0 1 36 18 L 36 40 A 18 18 0 0 1 0 40 Z M 18 4.5 A 13.5 13.5 0 1 0 18 31.5 A 13.5 13.5 0 1 0 18 4.5 Z"
      />

      <g transform="rotate(-90 18 18)">
        <circle class="gemini-circle-bg" cx="18" cy="18" r="15" />
        <circle
          id="gemini-progress-circle-fill"
          class="gemini-circle-fill"
          cx="18"
          cy="18"
          r="15"
          stroke-dasharray="${CIRCUMFERENCE}"
          stroke-dashoffset="${CIRCUMFERENCE}"
        />
      </g>

      <text id="gemini-usage-text" x="18" y="44">--%</text>
    </svg>
  `;

  const pillBtn = container.querySelector('#gemini-pill-btn');
  pillBtn.addEventListener('click', triggerSyncProcess);

  document.body.appendChild(container);

  chrome.storage.local.get(['alwaysOn', 'currentUsage'], (result) => {
    if (result.alwaysOn === false) {
      container.classList.add('tracker-hidden');
    }
    if (result.currentUsage !== undefined) {
      updateCircularUI(result.currentUsage);
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const container = document.getElementById('gemini-usage-tracker-container');
    if (changes.alwaysOn && container) {
      if (changes.alwaysOn.newValue === false) {
        container.classList.add('tracker-hidden');
      } else {
        container.classList.remove('tracker-hidden');
      }
    }
    if (changes.currentUsage) {
      updateCircularUI(changes.currentUsage.newValue);
    }
  }
});

window.addEventListener('load', () => {
  if (window.location.pathname.includes('/usage')) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const done = scrapeUsagePage();
      if (done || attempts > 30) {
        clearInterval(interval);
      }
    }, 200);
  } else {
    initUsageTracker();
  }
});