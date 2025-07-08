// content.js - Enhanced with Hunter.io (primary) and Apollo.io integration WITH DEBUG LOGGING
// Toggle this to turn debugging on/off

class LinkedInEnhancer {
  constructor() {
    this.profileData = {};
    this.apiClient = new window.APIClient();
    this.init();
  }

  async init() {
    console.log('SaaSquatch Intelligence: Initializing with API support...');
    if (DEBUG) console.log('=== INITIALIZATION STARTED ===');
    
    // Wait for API keys to load
    await this.apiClient.loadAPIKeys();
    this.observeUrlChanges();
    this.enhanceCurrentPage();
  }

  observeUrlChanges() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (DEBUG) console.log('URL changed to:', url);
        setTimeout(() => this.enhanceCurrentPage(), 1500);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  enhanceCurrentPage() {
    const existingWidget = document.querySelector('#saasquatch-widget');
    if (existingWidget) existingWidget.remove();

    if (this.isProfilePage()) {
      console.log('SaaSquatch Intelligence: Enhancing profile page...');
      setTimeout(() => this.enhanceProfile(), 1000);
    } else if (this.isSearchPage()) {
      console.log('SaaSquatch Intelligence: Enhancing search results...');
      setTimeout(() => this.enhanceSearchResults(), 1000);
    }
  }

  isProfilePage() {
    return window.location.pathname.includes('/in/');
  }

  isSearchPage() {
    return window.location.pathname.includes('/search/results/people/');
  }

  async enhanceProfile() {
    try {
      if (DEBUG) console.log('=== ENHANCE PROFILE STARTED ===');
      
      const profileData = this.extractProfileData();
      if (!profileData.name) {
        console.log('SaaSquatch Intelligence: Could not extract profile data');
        return;
      }

      // Show loading widget immediately
      this.injectLoadingWidget();

      // Enrich data with real APIs
      const enrichedData = await this.enrichProfileWithAPIs(profileData);
      
      // Calculate score based on real data
      enrichedData.score = this.calculateEnhancedScore(enrichedData);
      if (DEBUG) console.log('Final score calculated:', enrichedData.score);
      
      // Update widget with enriched data
      this.injectScoreWidget(enrichedData);
      
      // Update stats
      this.updateStats('profilesScanned');
      if (enrichedData.score >= 70) {
        this.updateStats('leadsFound');
      }

      // Cache the enriched data
      chrome.storage.local.set({ [profileData.profileUrl]: enrichedData });
      
    } catch (error) {
      console.error('SaaSquatch Intelligence: Error enhancing profile', error);
      // Show widget with basic data even if APIs fail
      const basicData = this.extractProfileData();
      basicData.score = this.calculateBasicScore(basicData);
      this.injectScoreWidget(basicData);
    }
  }

  extractProfileData() {
  if (DEBUG) console.log('=== STEP 1: EXTRACTING PROFILE DATA ===');
  
  const data = {
    name: '',
    headline: '',
    location: '',
    company: '',
    title: '',
    profileUrl: window.location.href,
    connectionDegree: ''
  };

  // Extract name
  const nameElement = document.querySelector('h1');
  if (nameElement) {
    data.name = nameElement.textContent.trim();
    if (DEBUG) console.log('Name found:', data.name);
  }

  // Extract headline
  const headlineElement = document.querySelector('div.text-body-medium');
  if (headlineElement) {
    data.headline = headlineElement.textContent.trim();
    if (DEBUG) console.log('Headline found:', data.headline);
  }

  // Extract connection degree
  const connectionElement = document.querySelector('span.dist-value');
  if (connectionElement) {
    data.connectionDegree = connectionElement.textContent.trim();
    if (DEBUG) console.log('Connection degree:', data.connectionDegree);
  }

  // Extract current position
  try {
    const experienceSection = Array.from(document.querySelectorAll('section')).find(
      section => section.querySelector('div[id*="experience"]')
    );
    
    if (experienceSection) {
      const roleElement = experienceSection.querySelector('div[data-view-name="profile-component-entity"]');
      if (roleElement) {
        // Extract title
        const titleElement = roleElement.querySelector('span[aria-hidden="true"]');
        if (titleElement) {
          data.title = titleElement.textContent.trim();
          if (DEBUG) console.log('Title extracted from experience:', data.title);
        }
        
        // Extract company
        const companyElement = roleElement.querySelector('span.t-14.t-normal');
        if (companyElement) {
          let companyText = companyElement.textContent;
          // Split by · and take first part
          companyText = companyText.split('·')[0].trim();
          
          // Handle duplicate company names
          const halfLength = Math.floor(companyText.length / 2);
          const firstHalf = companyText.substring(0, halfLength);
          const secondHalf = companyText.substring(halfLength);
          
          if (firstHalf === secondHalf) {
            data.company = firstHalf;
            if (DEBUG) console.log('Detected duplicate company name, fixed:', firstHalf);
          } else {
            data.company = companyText;
          }
          
          if (DEBUG) console.log('Company extracted from experience:', data.company);
        }
      }
    }
    
    // Fallback: Parse from headline (IMPROVED LOGIC)
    if (!data.company && data.headline) {
      if (DEBUG) console.log('Attempting to parse from headline...');
      
      // Method 1: Look for "Title at Company" pattern
      // Common patterns: "CPO at OpenAI", "CEO at Company, board member..."
      const atPattern = /^([^,]+?)\s+at\s+([^,]+?)(?:,|$)/;
      const atMatch = data.headline.match(atPattern);
      
      if (atMatch) {
        data.title = atMatch[1].trim();
        data.company = atMatch[2].trim();
        
        // Clean up company name - remove common suffixes that aren't part of company name
        const cleanupPatterns = [
          /\s*,?\s*board member.*$/i,
          /\s*,?\s*advisor.*$/i,
          /\s*,?\s*investor.*$/i,
          /\s*,?\s*mentor.*$/i,
          /\s*&.*$/,  // Remove "& something" at the end
          /\s*\|.*$/,  // Remove "| something" at the end
        ];
        
        for (const pattern of cleanupPatterns) {
          data.company = data.company.replace(pattern, '').trim();
        }
        
        if (DEBUG) console.log('Parsed with improved logic - Title:', data.title, 'Company:', data.company);
      } else {
        // Method 2: Simple split (fallback)
        const parts = data.headline.split(' at ');
        if (parts.length > 1) {
          data.title = parts[0].trim();
          // Take only the first part before any comma
          data.company = parts[1].split(',')[0].trim();
          if (DEBUG) console.log('Parsed with simple split - Title:', data.title, 'Company:', data.company);
        }
      }
    }
    
    // Additional cleanup for known patterns
    if (data.company) {
      // Remove common role indicators that might be attached to company name
      const roleIndicators = [
        'board member',
        'advisor',
        'investor',
        'consultant',
        'mentor',
        'volunteer'
      ];
      
      for (const indicator of roleIndicators) {
        const regex = new RegExp(`\\s*,?\\s*${indicator}.*$`, 'i');
        data.company = data.company.replace(regex, '').trim();
      }
      
      // Final cleanup: remove any trailing punctuation
      data.company = data.company.replace(/[,;:\s]+$/, '').trim();
      
      if (DEBUG) console.log('Final cleaned company name:', data.company);
    }
    
  } catch (e) {
    if (DEBUG) console.error('Error during extraction:', e);
  }

  // Handle duplicate patterns in company name (like "Lenskart.comLenskart.com")
  if (data.company) {
    const patterns = [
      /^(.+)\1$/,  // Exact duplicate
      /^(.+\.com)\1$/,  // .com duplicate
    ];
    
    for (const pattern of patterns) {
      const match = data.company.match(pattern);
      if (match) {
        data.company = match[1];
        if (DEBUG) console.log('Fixed duplicate pattern in company name:', data.company);
        break;
      }
    }
  }

  if (DEBUG) {
    console.log('=== FINAL EXTRACTED DATA ===');
    console.table(data);
  }

  return data;
}

  async enrichProfileWithAPIs(profileData) {
    if (DEBUG) console.log('=== STEP 2: ENRICHING PROFILE WITH APIs ===');
    
    const enrichedData = { ...profileData };

    // Step 1: Get company domain (try Hunter first, then extract from company name)
    let domain = null;
    if (profileData.company) {
      if (DEBUG) console.log('Getting domain for company:', profileData.company);
      
      // First try Hunter.io domain search
      domain = await this.apiClient.getDomainFromCompany(profileData.company);
      if (DEBUG) console.log('Hunter.io domain search result:', domain);
      
      // Fallback: extract domain from company name
      if (!domain) {
        domain = this.extractDomainFromCompany(profileData.company);
        if (DEBUG) console.log('Fallback domain extraction:', domain);
      }
      
      enrichedData.domain = domain;
    } else {
      if (DEBUG) console.log('No company found, skipping domain extraction');
    }

    // Step 2: Use Hunter.io as PRIMARY email finder
    if (domain && profileData.name) {
      if (DEBUG) console.log('=== CALLING HUNTER.IO FOR EMAIL ===');
      if (DEBUG) console.log('Input - Name:', profileData.name, 'Domain:', domain);
      
      const hunterData = await this.apiClient.findEmail(profileData.name, domain);
      if (DEBUG) console.log('Hunter.io response:', hunterData);
      
      if (hunterData && hunterData.email) {
        enrichedData.contactInfo = {
          email: hunterData.email,
          emailConfidence: hunterData.confidence,
          emailSource: 'Hunter.io',
          sources: hunterData.sources
        };
        if (DEBUG) console.log('Email found via Hunter.io:', enrichedData.contactInfo);
      } else {
        if (DEBUG) console.log('Hunter.io did not return an email');
      }
    } else {
      if (DEBUG) console.log('Skipping Hunter.io - missing domain or name');
    }

    // Step 3: Get comprehensive company data from Apollo
    if (profileData.company) {
      if (DEBUG) console.log('=== CALLING APOLLO.IO FOR COMPANY DATA ===');
      if (DEBUG) console.log('Company name:', profileData.company);
      
      const companyData = await this.apiClient.enrichCompany(profileData.company);
      if (DEBUG) console.log('Apollo.io response:', companyData);
      
      if (companyData) {
        enrichedData.companyData = companyData;
        // Update domain if Apollo has it and we don't
        if (!enrichedData.domain && companyData.domain) {
          enrichedData.domain = companyData.domain;
          if (DEBUG) console.log('Updated domain from Apollo:', companyData.domain);
        }
      } else {
        if (DEBUG) console.log('Apollo.io did not return company data');
      }
    } else {
      if (DEBUG) console.log('Skipping Apollo.io - no company name');
    }

    // Step 4: Get person details from Apollo (seniority, department, etc.)
    if (profileData.name) {
      if (DEBUG) console.log('=== CALLING APOLLO.IO FOR PERSON DETAILS ===');
      if (DEBUG) console.log('Person name:', profileData.name);
      
      const personDetails = await this.apiClient.getPersonDetails(
        profileData.name, 
        profileData.company
      );
      if (DEBUG) console.log('Apollo.io person details:', personDetails);
      
      if (personDetails) {
        enrichedData.personDetails = personDetails;
        
        // Update title if Apollo has better data
        if (personDetails.title && !profileData.title) {
          enrichedData.title = personDetails.title;
          if (DEBUG) console.log('Updated title from Apollo:', personDetails.title);
        }
        
        // Add location if available
        if (personDetails.city && personDetails.state) {
          enrichedData.location = `${personDetails.city}, ${personDetails.state}`;
          if (DEBUG) console.log('Added location from Apollo:', enrichedData.location);
        }
      }
    }

    // Step 5: Generate buying signals based on real data
    enrichedData.buyingSignals = this.generateRealBuyingSignals(enrichedData);
    if (DEBUG) console.log('Generated buying signals:', enrichedData.buyingSignals);

    // Fallback values if APIs fail
    if (!enrichedData.companyData) {
      if (DEBUG) console.log('No company data found, using fallback values');
      enrichedData.companyData = {
        revenue: 'Unknown',
        employees: 'Unknown',
        industry: 'Unknown',
        technologies: [],
        fundingTotal: 0
      };
    }

    if (!enrichedData.contactInfo?.email) {
      if (DEBUG) console.log('=== GENERATING FALLBACK EMAIL ===');
      const generatedEmail = this.generateEmail(profileData);
      if (DEBUG) console.log('Generated email:', generatedEmail);
      
      enrichedData.contactInfo = {
        email: generatedEmail,
        emailConfidence: 30,
        emailSource: 'Generated pattern'
      };
    }

    if (DEBUG) {
      console.log('=== FINAL ENRICHED DATA ===');
      console.log(JSON.stringify(enrichedData, null, 2));
    }

    return enrichedData;
  }

  extractDomainFromCompany(companyName) {
    if (DEBUG) console.log('=== EXTRACT DOMAIN FROM COMPANY ===');
    if (DEBUG) console.log('Input:', companyName);
    
    if (!companyName) return null;
    
    // Step-by-step transformation with logging
    const step1 = companyName.toLowerCase().trim();
    if (DEBUG) console.log('Step 1 - lowercase & trim:', step1);
    
    // Check if already has a valid domain
    if (step1.match(/\.(com|org|net|io|ai|co)$/)) {
      if (DEBUG) console.log('Already a valid domain, returning:', step1);
      return step1;
    }
    
    // Remove special characters except dots
    const step2 = step1.replace(/[^\w.]/g, '');
    if (DEBUG) console.log('Step 2 - remove special chars:', step2);
    
    // Remove spaces
    const step3 = step2.replace(/\s+/g, '');
    if (DEBUG) console.log('Step 3 - remove spaces:', step3);
    
    // Remove any existing TLD
    const step4 = step3.replace(/\.(com|org|net|io|ai|co)$/, '');
    if (DEBUG) console.log('Step 4 - remove existing TLD:', step4);
    
    // Remove company suffixes
    const step5 = step4.replace(/inc$|llc$|ltd$|corp$|corporation$|company$|co$/, '');
    if (DEBUG) console.log('Step 5 - remove company suffixes:', step5);
    
    const finalDomain = `${step5}.com`;
    if (DEBUG) console.log('Final domain:', finalDomain);
    
    return finalDomain;
  }

  calculateEnhancedScore(data) {
    if (DEBUG) console.log('=== CALCULATING ENHANCED SCORE ===');
    
    let score = 25; // Base score
    const breakdown = {
      title: 0,
      company: 0,
      industry: 0,
      technology: 0,
      engagement: 0,
      dataQuality: 0,
      financial: 0
    };

    // Title/Seniority scoring (up to 25 points)
    const titleScore = this.scoreTitleMatch(
      data.title, 
      data.personDetails?.seniority
    );
    breakdown.title = titleScore;
    score += titleScore;
    if (DEBUG) console.log('Title score:', titleScore, 'for title:', data.title);

    // Company scoring based on size and growth (up to 20 points)
    if (data.companyData) {
      // Company size scoring
      const employees = data.companyData.employeesCount || 0;
      if (employees > 1000) {
        breakdown.company += 10;
      } else if (employees > 100) {
        breakdown.company += 15; // Sweet spot for SaaS
      } else if (employees > 10) {
        breakdown.company += 8;
      }
      if (DEBUG) console.log('Company size score:', breakdown.company, 'for', employees, 'employees');

      // Growth rate bonus (if available)
      if (data.companyData.annual_growth_rate > 20) {
        breakdown.company += 5;
      }

      score += breakdown.company;
    }

    // Financial health scoring (up to 10 points)
    if (data.companyData) {
      if (data.companyData.fundingTotal > 10000000) {
        breakdown.financial += 5;
      }
      if (data.companyData.revenueNumber > 10000000) {
        breakdown.financial += 5;
      }
      score += breakdown.financial;
      if (DEBUG) console.log('Financial score:', breakdown.financial);
    }

    // Industry fit scoring (up to 10 points)
    const targetIndustries = ['software', 'technology', 'saas', 'internet', 'information technology', 'computer software'];
    if (data.companyData?.industry) {
      const industryLower = data.companyData.industry.toLowerCase();
      if (targetIndustries.some(ind => industryLower.includes(ind))) {
        breakdown.industry = 10;
      } else if (data.companyData.keywords?.some(kw => 
        ['software', 'saas', 'technology', 'digital'].includes(kw.toLowerCase())
      )) {
        breakdown.industry = 7;
      }
      score += breakdown.industry;
      if (DEBUG) console.log('Industry score:', breakdown.industry, 'for industry:', data.companyData.industry);
    }

    // Technology stack scoring (up to 10 points)
    if (data.companyData?.technologies && data.companyData.technologies.length > 0) {
      const relevantTech = ['Salesforce', 'HubSpot', 'AWS', 'Google Cloud', 'Azure', 'Slack', 'Microsoft 365', 'Zoom'];
      const matchingTech = data.companyData.technologies.filter(tech => 
        relevantTech.some(rt => tech.toLowerCase().includes(rt.toLowerCase()))
      );
      breakdown.technology = Math.min(matchingTech.length * 2, 10);
      score += breakdown.technology;
      if (DEBUG) console.log('Technology score:', breakdown.technology, 'for', matchingTech.length, 'matching technologies');
    }

    // Engagement/Connection scoring (up to 5 points)
    if (data.connectionDegree === '1st') {
      breakdown.engagement = 5;
      score += 5;
    } else if (data.connectionDegree === '2nd') {
      breakdown.engagement = 3;
      score += 3;
    }
    if (DEBUG) console.log('Engagement score:', breakdown.engagement, 'for connection:', data.connectionDegree);

    // Data quality bonus (up to 5 points)
    if (data.contactInfo?.email && data.contactInfo.emailConfidence > 90) {
      breakdown.dataQuality += 3;
    }
    if (data.contactInfo?.sources > 0) {
      breakdown.dataQuality += 2;
    }
    score += breakdown.dataQuality;
    if (DEBUG) console.log('Data quality score:', breakdown.dataQuality);

    // Log scoring breakdown
    if (DEBUG) {
      console.log('=== SCORING BREAKDOWN ===');
      console.table(breakdown);
      console.log('Total score:', Math.min(score, 100));
    }

    return Math.min(score, 100);
  }

  scoreTitleMatch(title, seniority) {
    if (DEBUG) console.log('Scoring title:', title, 'Seniority:', seniority);
    
    if (!title) return 0;
    
    const titleUpper = title.toUpperCase();
    let score = 0;

    // Use Apollo's seniority data if available
    if (seniority) {
      const seniorityScores = {
        'c_suite': 25,
        'vp': 22,
        'director': 20,
        'manager': 17,
        'senior': 12,
        'entry': 5
      };
      score = seniorityScores[seniority.toLowerCase()] || 10;
      if (DEBUG) console.log('Seniority-based score:', score);
    } else {
      // Fallback to title parsing
      // C-level executives (25 points)
      const cLevel = ['CEO', 'CTO', 'CFO', 'CMO', 'COO', 'CRO', 'CHIEF'];
      if (cLevel.some(t => titleUpper.includes(t))) {
        score = 25;
      }
      // VP level (22 points)
      else if (titleUpper.includes('VP') || titleUpper.includes('VICE PRESIDENT')) {
        score = 22;
      }
      // Director level (20 points)
      else if (titleUpper.includes('DIRECTOR')) {
        score = 20;
      }
      // Manager level (17 points)
      else if (titleUpper.includes('MANAGER') || titleUpper.includes('HEAD OF')) {
        score = 17;
      }
      if (DEBUG) console.log('Title-based score:', score);
    }

    // Department relevance bonus (up to 3 points)
    const relevantDepts = ['SALES', 'MARKETING', 'GROWTH', 'REVENUE', 'BUSINESS DEVELOPMENT', 'CUSTOMER SUCCESS'];
    if (relevantDepts.some(dept => titleUpper.includes(dept))) {
      score = Math.min(score + 3, 25);
      if (DEBUG) console.log('Added department bonus, new score:', score);
    }

    return score;
  }

  generateRealBuyingSignals(data) {
    if (DEBUG) console.log('=== GENERATING BUYING SIGNALS ===');
    const signals = [];

    // Keywords-based signals (since Apollo provides extensive keywords)
    if (data.companyData?.keywords && data.companyData.keywords.length > 0) {
      const keywords = data.companyData.keywords.map(k => k.toLowerCase());
      
      // AI/ML signal
      const hasAI = keywords.some(k => 
        k.includes('ai') || k.includes('artificial intelligence') || 
        k.includes('machine learning') || k.includes('gpt')
      );
      if (hasAI) {
        signals.push('🤖 AI/ML-powered company');
      }
      
      // SaaS signal
      const hasSaaS = keywords.some(k => 
        k.includes('saas') || k.includes('software as a service')
      );
      if (hasSaaS) {
        signals.push('☁️ SaaS business model');
      }
      
      // Look for sales/marketing tech keywords
      const salesKeywords = ['crm', 'sales', 'lead generation', 'marketing automation', 'customer engagement'];
      const hasSalesTech = keywords.some(k => 
        salesKeywords.some(sk => k.includes(sk))
      );
      if (hasSalesTech) {
        signals.push('🎯 Sales/Marketing tech company');
      }
    }

    // Company size and growth signals
    if (data.companyData?.employeesCount) {
      const employees = data.companyData.employeesCount;
      if (employees >= 100 && employees <= 500) {
        signals.push(`📈 Mid-market company (${employees} employees)`);
      } else if (employees > 500) {
        signals.push(`🏢 Enterprise scale (${employees}+ employees)`);
      } else if (employees >= 50 && employees < 100) {
        signals.push(`🚀 Growing startup (${employees} employees)`);
      }
    }

    // Industry signals from industries array
    if (data.companyData?.industries && data.companyData.industries.length > 0) {
      const industry = data.companyData.industries[0];
      if (industry.toLowerCase().includes('technology') || industry.toLowerCase().includes('software')) {
        signals.push(`💻 Tech industry: ${industry}`);
      } else {
        signals.push(`🏭 Industry: ${industry}`);
      }
    }

    // Company age signal
    if (data.companyData?.foundedYear) {
      const age = new Date().getFullYear() - data.companyData.foundedYear;
      if (age <= 3) {
        signals.push(`🆕 Early-stage startup (${age} years old)`);
      } else if (age >= 4 && age <= 8) {
        signals.push(`📊 Growth-stage company (${age} years old)`);
      } else if (age > 15) {
        signals.push(`🏛️ Established company (${age}+ years)`);
      }
    }

    // Email quality signal from Hunter.io
    if (data.contactInfo?.email && data.contactInfo.emailConfidence) {
      if (data.contactInfo.emailConfidence >= 90) {
        signals.push(`✅ Verified email (${data.contactInfo.emailConfidence}% confidence)`);
      } else if (data.contactInfo.emailConfidence >= 70) {
        signals.push(`📧 Probable email (${data.contactInfo.emailConfidence}% confidence)`);
      }
    }

    // Website presence
    if (data.companyData?.website) {
      signals.push('🌐 Active website presence');
    }

    // If no signals found, add generic ones
    if (signals.length === 0) {
      signals.push('👤 Active LinkedIn profile');
      if (data.title && data.company) {
        signals.push('✓ Complete profile information');
      }
    }

    if (DEBUG) console.log('Generated signals:', signals);

    // Return top 5 most relevant signals
    return signals.slice(0, 5);
  }

  generateEmail(profileData) {
    if (DEBUG) console.log('=== GENERATING EMAIL PATTERN ===');
    if (DEBUG) console.log('Input data:', { name: profileData.name, company: profileData.company });
    
    if (!profileData.name || !profileData.company) {
      return 'email@unknown.com';
    }
    
    const names = profileData.name.toLowerCase().split(' ');
    const firstName = names[0];
    const lastName = names[names.length - 1];
    if (DEBUG) console.log('Parsed name:', { firstName, lastName });
    
    const companyBase = profileData.company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/inc|corp|llc|ltd/g, '');
    if (DEBUG) console.log('Company base:', companyBase);
    
    // Common email patterns
    const patterns = [
      `${firstName}.${lastName}@${companyBase}.com`,
      `${firstName}@${companyBase}.com`,
      `${firstName[0]}${lastName}@${companyBase}.com`
    ];
    
    const selectedPattern = patterns[0];
    if (DEBUG) console.log('Selected pattern:', selectedPattern);
    
    return selectedPattern;
  }

  calculateBasicScore(data) {
    if (DEBUG) console.log('=== CALCULATING BASIC SCORE (FALLBACK) ===');
    
    // Fallback scoring when APIs are not available
    let score = 40;
    
    const buyerKeywords = ['VP', 'Director', 'Head of', 'Manager', 'Chief'];
    const title = (data.title + ' ' + data.headline).toUpperCase();
    
    if (buyerKeywords.some(keyword => title.includes(keyword.toUpperCase()))) {
      score += 25;
    }

    if (data.company) {
      score += 10;
    }

    score += Math.floor(Math.random() * 10);
    
    if (DEBUG) console.log('Basic score calculated:', score);
    
    return Math.min(score, 100);
  }

  injectLoadingWidget() {
    if (DEBUG) console.log('Injecting loading widget');
    
    const widget = document.createElement('div');
    widget.id = 'saasquatch-widget';
    widget.innerHTML = `
      <div class="sq-widget">
        <div class="sq-header">
          <h3>Lead Intelligence</h3>
          <div class="sq-loading">
            <div class="sq-spinner"></div>
          </div>
        </div>
        <div class="sq-loading-text">Analyzing profile...</div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  injectScoreWidget(data) {
    if (DEBUG) console.log('=== INJECTING SCORE WIDGET ===');
    if (DEBUG) console.log('Widget data:', data);
    
    const existingWidget = document.querySelector('#saasquatch-widget');
    if (existingWidget) existingWidget.remove();

    const widget = document.createElement('div');
    widget.id = 'saasquatch-widget';
    
    // Format company data
    const revenue = data.companyData?.revenueRange || data.companyData?.revenue || 'Unknown';
    const employees = data.companyData?.employeesRange || data.companyData?.employees || 'Unknown';
    const industry = data.companyData?.industry || 'Unknown';
    const fundingStage = data.companyData?.fundingStage || '';
    
    // Format email data
    const email = data.contactInfo?.email || 'Not found';
    const emailConfidence = data.contactInfo?.emailConfidence || 0;
    const emailSource = data.contactInfo?.emailSource || '';
    
    // Format seniority/department
    const seniority = data.personDetails?.seniority || '';
    const departments = data.personDetails?.departments || [];
    
    widget.innerHTML = `
      <div class="sq-widget">
        <div class="sq-header">
          <h3>Lead Intelligence</h3>
          <span class="sq-score ${this.getScoreClass(data.score)}">${data.score}/100</span>
        </div>
        
        <div class="sq-section">
          <h4>Company Intel</h4>
          <div class="sq-info">
            <span class="sq-label">Revenue:</span> ${revenue}<br>
            <span class="sq-label">Employees:</span> ${employees}<br>
            <span class="sq-label">Industry:</span> ${industry}
            ${fundingStage && fundingStage !== 'Unknown' ? 
              `<br><span class="sq-label">Funding:</span> ${fundingStage}` : ''}
            ${data.companyData?.technologies?.length > 0 ? 
              `<br><span class="sq-label">Tech Stack:</span><br>
              <div class="sq-tech-list">${data.companyData.technologies.slice(0, 5).map(tech => 
                `<span class="sq-tech">${tech}</span>`
              ).join('')}</div>` : ''}
          </div>
        </div>

        <div class="sq-section">
          <h4>Contact Info</h4>
          <div class="sq-info">
            ${email !== 'Not found' ? `
              <span class="sq-label">Email:</span> 
              <span class="sq-email" onclick="navigator.clipboard.writeText('${email}')" title="Click to copy">${email}</span>
              ${emailConfidence > 0 ? `
                <div class="sq-email-meta">
                  <span class="sq-confidence sq-confidence-${this.getConfidenceClass(emailConfidence)}">
                    ${emailConfidence}% confidence
                  </span>
                  ${emailSource ? `<span class="sq-source">via ${emailSource}</span>` : ''}
                </div>
              ` : ''}
            ` : '<span class="sq-not-found">Email not found - try manual search</span>'}
            ${seniority ? `<br><span class="sq-label">Level:</span> ${this.formatSeniority(seniority)}` : ''}
            ${departments.length > 0 ? `<br><span class="sq-label">Department:</span> ${departments.join(', ')}` : ''}
          </div>
        </div>

        <div class="sq-section">
          <h4>Buying Signals</h4>
          <ul class="sq-signals">
            ${data.buyingSignals.map(signal => `<li>${signal}</li>`).join('')}
          </ul>
        </div>

        <div class="sq-actions">
          <button class="sq-btn sq-btn-primary" id="sq-export-btn">
            Export to CRM
          </button>
          <button class="sq-btn" id="sq-save-btn">
            Save to List
          </button>
        </div>

        <div class="sq-powered">
         Powered by Hunter.io & Apollo.io
       </div>
     </div>
   `;

   document.body.appendChild(widget);

   // Add event listeners
   document.getElementById('sq-export-btn').addEventListener('click', () => {
     chrome.runtime.sendMessage({ action: 'export', data: data });
     this.showNotification('Lead exported!');
   });

   document.getElementById('sq-save-btn').addEventListener('click', () => {
     chrome.runtime.sendMessage({ action: 'save', data: data });
     this.showNotification('Lead saved!');
   });
 }

 getConfidenceClass(confidence) {
   if (confidence >= 90) return 'high';
   if (confidence >= 70) return 'medium';
   return 'low';
 }

 formatSeniority(seniority) {
   const formatted = {
     'c_suite': 'C-Level Executive',
     'vp': 'Vice President',
     'director': 'Director',
     'manager': 'Manager',
     'senior': 'Senior',
     'entry': 'Entry Level'
   };
   return formatted[seniority.toLowerCase()] || seniority;
 }

 showNotification(message) {
   if (DEBUG) console.log('Showing notification:', message);
   
   const notification = document.createElement('div');
   notification.className = 'sq-notification';
   notification.textContent = message;
   document.body.appendChild(notification);
   
   setTimeout(() => {
     notification.remove();
   }, 3000);
 }

 getScoreClass(score) {
   if (score >= 80) return 'sq-score-high';
   if (score >= 60) return 'sq-score-medium';
   return 'sq-score-low';
 }

 async enhanceSearchResults() {
   if (DEBUG) console.log('=== ENHANCING SEARCH RESULTS ===');
   
   const resultItems = document.querySelectorAll('.reusable-search__result-container');
   if (DEBUG) console.log('Found search result items:', resultItems.length);
   
   for (const item of resultItems) {
     if (item.querySelector('.sq-mini-score')) continue;
     
     const nameLink = item.querySelector('.entity-result__title-text a');
     if (nameLink) {
       // Extract basic info from search result
       const name = nameLink.textContent.trim();
       const headline = item.querySelector('.entity-result__primary-subtitle')?.textContent.trim();
       
       if (DEBUG) console.log('Processing search result:', { name, headline });
       
       // Quick score based on title only
       let quickScore = 50;
       if (headline) {
         quickScore = 40 + this.scoreTitleMatch(headline);
       }
       
       const badge = document.createElement('span');
       badge.className = 'sq-mini-score';
       badge.textContent = quickScore;
       badge.style.backgroundColor = this.getScoreColor(quickScore);
       badge.title = 'Click profile for full analysis';
       
       nameLink.parentElement.appendChild(badge);
     }
   }
 }

 getScoreColor(score) {
   if (score >= 80) return '#10b981';
   if (score >= 60) return '#f59e0b';
   return '#ef4444';
 }

 async updateStats(statName) {
   if (DEBUG) console.log('Updating stat:', statName);
   
   const stats = await chrome.storage.local.get([statName]);
   const currentValue = stats[statName] || 0;
   chrome.storage.local.set({ [statName]: currentValue + 1 });
 }
}

// Initialize when DOM is ready
console.log('SaaSquatch Intelligence: Script loaded');
if (DEBUG) console.log('DEBUG MODE IS ON - Check console for detailed logs');

if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', () => {
   if (DEBUG) console.log('DOM loaded, initializing LinkedInEnhancer');
   new LinkedInEnhancer();
 });
} else {
 if (DEBUG) console.log('DOM already loaded, initializing LinkedInEnhancer immediately');
 new LinkedInEnhancer();
}