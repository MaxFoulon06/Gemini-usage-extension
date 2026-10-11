document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleAlwaysOn');
  const fiveHourStat = document.getElementById('fiveHourStat');
  const fiveHourFill = document.getElementById('fiveHourFill');
  const fiveHourReset = document.getElementById('fiveHourReset');
  const weeklyStat = document.getElementById('weeklyStat');
  const weeklyFill = document.getElementById('weeklyFill');
  const weeklyReset = document.getElementById('weeklyReset');
  const syncBtn = document.getElementById('syncBtn');
  const viewBtn = document.getElementById('viewBtn');

  function renderStats(data) {
    if (data.currentUsage !== undefined) {
      fiveHourStat.textContent = `${data.currentUsage}%`;
      fiveHourFill.style.width = `${data.currentUsage}%`;
    }
    if (data.weeklyUsage !== undefined) {
      weeklyStat.textContent = `${data.weeklyUsage}%`;
      weeklyFill.style.width = `${data.weeklyUsage}%`;
    }
    if (data.currentReset) {
      fiveHourReset.textContent = `Resets at ${data.currentReset}`;
    }
    if (data.weeklyReset) {
      weeklyReset.textContent = data.weeklyReset;
    }
  }

  chrome.storage.local.get(
    ['alwaysOn', 'currentUsage', 'weeklyUsage', 'currentReset', 'weeklyReset'],
    (result) => {
      toggle.checked = result.alwaysOn !== false;
      renderStats(result);
    }
  );

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ alwaysOn: toggle.checked });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      const update = {};
      if (changes.currentUsage) update.currentUsage = changes.currentUsage.newValue;
      if (changes.weeklyUsage) update.weeklyUsage = changes.weeklyUsage.newValue;
      if (changes.currentReset) update.currentReset = changes.currentReset.newValue;
      if (changes.weeklyReset) update.weeklyReset = changes.weeklyReset.newValue;
      renderStats(update);
    }
  });

  syncBtn.addEventListener('click', () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';

    chrome.runtime.sendMessage({ action: 'triggerSync' }, () => {
      chrome.storage.local.get(
        ['currentUsage', 'weeklyUsage', 'currentReset', 'weeklyReset'],
        (res) => {
          renderStats(res);
          syncBtn.disabled = false;
          syncBtn.textContent = '↻ Sync Now';
        }
      );
    });
  });

  viewBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://gemini.google.com/usage', active: true });
  });
});