// usage.js - Track API usage
class UsageTracker {
  constructor() {
    this.resetDate = this.getMonthStart();
  }

  getMonthStart() {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  async checkAndReset() {
    const currentMonthStart = this.getMonthStart();
    const stored = await chrome.storage.sync.get(['resetDate']);
    
    if (!stored.resetDate || stored.resetDate < currentMonthStart) {
      // Reset usage for new month
      await chrome.storage.sync.set({
        resetDate: currentMonthStart,
        apolloUsage: 0,
        hunterUsage: 0
      });
    }
  }

  async incrementUsage(api) {
    await this.checkAndReset();
    
    const usage = await chrome.storage.sync.get([`${api}Usage`]);
    const current = usage[`${api}Usage`] || 0;
    
    await chrome.storage.sync.set({
      [`${api}Usage`]: current + 1
    });
    
    return current + 1;
  }

  async getUsage() {
    await this.checkAndReset();
    
    const usage = await chrome.storage.sync.get(['apolloUsage', 'hunterUsage']);
    return {
      apollo: usage.apolloUsage || 0,
      hunter: usage.hunterUsage || 0
    };
  }
}

window.UsageTracker = UsageTracker;