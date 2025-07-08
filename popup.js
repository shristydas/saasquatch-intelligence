// popup.js - Popup functionality
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Load stats
  const stats = await chrome.storage.local.get(['profilesScanned', 'leadsFound']);
  document.getElementById('profilesScanned').textContent = stats.profilesScanned || 0;
  document.getElementById('leadsFound').textContent = stats.leadsFound || 0;
  
  // Load recent leads
  const allData = await chrome.storage.local.get(null);
  const leads = [];
  
  // Extract profile data from storage
  for (const key in allData) {
    if (key.startsWith('https://www.linkedin.com/in/')) {
      leads.push(allData[key]);
    }
  }
  
  // Sort by score and get top 5
  const topLeads = leads
    .filter(lead => lead.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  const container = document.getElementById('savedLeads');
  
  if (topLeads.length > 0) {
    container.innerHTML = topLeads.map(lead => `
      <div class="lead-item" data-url="${lead.profileUrl}">
        <div class="lead-info">
          <div class="lead-name">${lead.name}</div>
          <div class="lead-company">${lead.title} at ${lead.company}</div>
        </div>
        <div class="lead-score ${getScoreClass(lead.score)}">${lead.score}</div>
      </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.lead-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        chrome.tabs.create({ url });
      });
    });
  }
});

function getScoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-medium';
  return 'score-low';
}