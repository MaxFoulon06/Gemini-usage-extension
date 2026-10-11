// Function to run the silent background sync tab
function performSync(sendResponse) {
  chrome.tabs.create(
    { url: 'https://gemini.google.com/usage', active: false },
    (tab) => {
      setTimeout(() => {
        if (tab.id) {
          chrome.tabs.remove(tab.id);
        }
        if (sendResponse) sendResponse({ status: 'done' });
      }, 7000);
    }
  );
}

// Listen for sync requests from content.js or popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerSync') {
    performSync(sendResponse);
    return true; // Keep message channel open for async response
  }
});