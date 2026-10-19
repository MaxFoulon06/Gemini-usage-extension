let syncTabId = null;
let syncResponseCallback = null;
let fallbackTimeout = null;

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

function performSync(sendResponse) {
  // Close any orphaned tab from a previous sync
  if (syncTabId) {
    chrome.tabs.remove(syncTabId).catch(() => {});
  }

  syncResponseCallback = sendResponse;

  chrome.tabs.create(
    { url: 'https://gemini.google.com/usage', active: false },
    (tab) => {
      syncTabId = tab.id;

      // Hard safety timeout (25s) in case Wi-Fi cuts out completely or Gemini errors
      clearTimeout(fallbackTimeout);
      fallbackTimeout = setTimeout(() => {
        closeSyncTab();
      }, 25000);
    }
  );
}

// Clean up state if the user manually closes the background tab
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === syncTabId) {
    closeSyncTab();
  }
});

// Listen for sync triggers and scrape-completion signals
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerSync') {
    performSync(sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.action === 'syncComplete') {
    // Data successfully scraped: wait 1 second, then close tab
    setTimeout(() => {
      closeSyncTab();
    }, 1000);
  }
});