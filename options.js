// options.js - Handle settings page
function saveOptions() {
  const apolloKey = document.getElementById('apolloKey').value;
  const hunterKey = document.getElementById('hunterKey').value;
  const minScore = document.getElementById('minScore').value;
  
  chrome.storage.sync.set({
    apolloKey: apolloKey,
    hunterKey: hunterKey,
    minScore: parseInt(minScore)
  }, () => {
    // Show success message
    const status = document.getElementById('status');
    status.textContent = 'Settings saved successfully!';
    status.className = 'success';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    apolloKey: '',
    hunterKey: '',
    minScore: 70
  }, (items) => {
    document.getElementById('apolloKey').value = items.apolloKey;
    document.getElementById('hunterKey').value = items.hunterKey;
    document.getElementById('minScore').value = items.minScore;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);