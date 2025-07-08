// background.js - Handle extension events
console.log('SaaSquatch Intelligence: Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.action === 'export') {
    // In production, this would integrate with CRM APIs
    console.log('Exporting lead:', request.data);
    // Example: Send to webhook
    // fetch('https://your-crm.com/api/leads', {
    //   method: 'POST',
    //   body: JSON.stringify(request.data)
    // });
  } else if (request.action === 'save') {
    // Save to a list
    chrome.storage.local.get(['savedLeads'], (result) => {
      const leads = result.savedLeads || [];
      leads.push(request.data);
      chrome.storage.local.set({ savedLeads: leads });
    });
  }
  
  sendResponse({ success: true });
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SaaSquatch Intelligence: Extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    profilesScanned: 0,
    leadsFound: 0,
    savedLeads: []
  });
});