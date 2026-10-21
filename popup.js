document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.ai-tab');
  const toggle = document.getElementById('toggleAlwaysOn');
  const statusDot = document.getElementById('statusDot');
  const enableLabel = document.getElementById('enableLabel');
  const fiveHourStat = document.getElementById('fiveHourStat');
  const fiveHourFill = document.getElementById('fiveHourFill');
  const fiveHourReset = document.getElementById('fiveHourReset');
  const weeklyStat = document.getElementById('weeklyStat');
  const weeklyFill = document.getElementById('weeklyFill');
  const weeklyReset = document.getElementById('weeklyReset');
  const claudeHelper = document.getElementById('claudeHelper');
  const claudeAddMsg = document.getElementById('claudeAddMsg');
  const claudeReset5h = document.getElementById('claudeReset5h');
  const syncBtn = document.getElementById('syncBtn');
  const viewBtn = document.getElementById('viewBtn');

  let selectedAI = 'gemini';

  const AI_META = {
    gemini: {
      name: 'Gemini',
      bar1: '#8ab4f8',
      bar2: '#b388ff',
      url: 'https://gemini.google.com/usage',
      keys: {
        alwaysOn: 'alwaysOn',
        currentUsage: 'currentUsage',
        weeklyUsage: 'weeklyUsage',
        currentReset: 'currentReset',
        weeklyReset: 'weeklyReset'
      }
    },
    chatgpt: {
      name: 'ChatGPT',
      bar1: '#10a37f',
      bar2: '#34d399',
      url: 'https://chatgpt.com/settings/usage?tab=overview',
      keys: {
        alwaysOn: 'chatgpt_alwaysOn',
        currentUsage: 'chatgpt_currentUsage',
        weeklyUsage: 'chatgpt_weeklyUsage',
        currentReset: 'chatgpt_currentReset',
        weeklyReset: 'chatgpt_weeklyReset'
      }
    },
    claude: {
      name: 'Claude',
      bar1: '#d97757',
      bar2: '#f59e0b',
      url: 'https://claude.ai/settings/usage',
      keys: {
        alwaysOn: 'claude_alwaysOn',
        currentUsage: 'claude_currentUsage',
        weeklyUsage: 'claude_weeklyUsage',
        currentReset: 'claude_currentReset',
        weeklyReset: 'claude_weeklyReset'
      }
    }
  };

  function selectTab(ai) {
    selectedAI = ai;
    const meta = AI_META[ai];

    tabs.forEach(t => t.classList.toggle('active', t.dataset.ai === ai));
    enableLabel.textContent = `Enable on ${meta.name}`;
    fiveHourFill.style.backgroundColor = meta.bar1;
    weeklyFill.style.backgroundColor = meta.bar2;
    claudeHelper.style.display = ai === 'claude' ? 'flex' : 'none';

    loadSelectedAIData();
  }

  function loadSelectedAIData() {
    const meta = AI_META[selectedAI];
    const k = meta.keys;

    chrome.storage.local.get(Object.values(k), (res) => {
      const isEnabled = res[k.alwaysOn] !== false;
      toggle.checked = isEnabled;
      statusDot.classList.toggle('off', !isEnabled);

      const cur = res[k.currentUsage] !== undefined ? res[k.currentUsage] : 0;
      const wk = res[k.weeklyUsage] !== undefined ? res[k.weeklyUsage] : 0;

      fiveHourStat.textContent = `${cur}%`;
      fiveHourFill.style.width = `${Math.min(100, cur)}%`;
      fiveHourReset.textContent = res[k.currentReset] ? `Resets at ${res[k.currentReset]}` : 'Resets at --:--';

      weeklyStat.textContent = `${wk}%`;
      weeklyFill.style.width = `${Math.min(100, wk)}%`;
      weeklyReset.textContent = res[k.weeklyReset] || 'Resets --';
    });
  }

  // Detect active browser tab to highlight "Current" AI
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (activeTabs && activeTabs[0] && activeTabs[0].url) {
      const url = activeTabs[0].url;
      let detected = null;
      if (url.includes('gemini.google.com')) detected = 'gemini';
      else if (url.includes('chatgpt.com')) detected = 'chatgpt';
      else if (url.includes('claude.ai')) detected = 'claude';

      if (detected) {
        const matchingBtn = document.querySelector(`.ai-tab[data-ai="${detected}"]`);
        if (matchingBtn) matchingBtn.classList.add('is-current');
        selectTab(detected);
        return;
      }
    }
    selectTab('gemini');
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => selectTab(tab.dataset.ai));
  });

  toggle.addEventListener('change', () => {
    const k = AI_META[selectedAI].keys;
    statusDot.classList.toggle('off', !toggle.checked);
    chrome.storage.local.set({ [k.alwaysOn]: toggle.checked });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadSelectedAIData();
    }
  });

  // Claude manual helper buttons
  claudeAddMsg.addEventListener('click', () => {
    chrome.storage.local.get(['claude_timestamps'], (res) => {
      const list = Array.isArray(res.claude_timestamps) ? res.claude_timestamps : [];
      list.push(Date.now());
      const pct = Math.min(100, Math.round((list.length / 20) * 100));
      chrome.storage.local.set({ claude_timestamps: list, claude_currentUsage: pct });
    });
  });

  claudeReset5h.addEventListener('click', () => {
    chrome.storage.local.set({
      claude_timestamps: [],
      claude_currentUsage: 0,
      claude_weeklyUsage: 0
    });
  });

  syncBtn.addEventListener('click', () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    chrome.runtime.sendMessage({ action: 'triggerSync', platform: selectedAI }, () => {
      loadSelectedAIData();
      syncBtn.disabled = false;
      syncBtn.textContent = '↻ Sync Now';
    });
  });

  viewBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: AI_META[selectedAI].url, active: true });
  });
});