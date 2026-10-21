let syncTabId = null;
let syncResponseCallback = null;
let fallbackTimeout = null;

const SYNC_URLS = {
  gemini: 'https://gemini.google.com/usage',
  chatgpt: 'https://chatgpt.com/settings/usage?tab=overview',
  claude: 'https://claude.ai/settings/usage'
};

function closeSyncTab() {
  clearTimeout(fallbackTimeout);
  if (syncTabId) {
    chrome.tabs.remove(syncTabId).catch(() => {});
    syncTabId = null;
  }
  if (syncResponseCallback) {
    syncResponseCallback({ status: 'done' });
    syncResponseCallback = null;
  }
}

function performSync(platform, sendResponse) {
  if (syncTabId) {
    chrome.tabs.remove(syncTabId).catch(() => {});
  }

  syncResponseCallback = sendResponse;
  const targetUrl = SYNC_URLS[platform] || SYNC_URLS.gemini;

  chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
    syncTabId = tab.id;

    clearTimeout(fallbackTimeout);
    fallbackTimeout = setTimeout(() => {
      closeSyncTab();
    }, 25000);
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === syncTabId) {
    closeSyncTab();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerSync') {
    const platform = request.platform || 'gemini';
    performSync(platform, sendResponse);
    return true;
  }

  if (request.action === 'syncComplete') {
    setTimeout(() => {
      closeSyncTab();
    }, 1000);
  }
});