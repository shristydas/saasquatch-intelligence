// api.js - Real API integration with Hunter.io (primary) and Apollo.io (company data) WITH DEBUG LOGGING
const DEBUG = true; // Toggle this to turn debugging on/off

class APIClient {
  constructor() {
    // We'll store API keys in Chrome storage for security
    this.keys = {};
    this.loadAPIKeys();
    if (DEBUG) console.log('APIClient initialized');
  }

  async loadAPIKeys() {
    if (DEBUG) console.log('=== LOADING API KEYS ===');
    
    const stored = await chrome.storage.sync.get(['apolloKey', 'hunterKey']);
    this.keys = {
      apollo: stored.apolloKey || '',
      hunter: stored.hunterKey || ''
    };
    
    if (DEBUG) {
      console.log('API Keys loaded from storage:');
      console.log('- Apollo key exists:', !!this.keys.apollo);
      console.log('- Hunter key exists:', !!this.keys.hunter);
      console.log('- Apollo key length:', this.keys.apollo.length);
      console.log('- Hunter key length:', this.keys.hunter.length);
      
      // Show first/last few characters of keys for verification (security: don't show full key)
      if (this.keys.apollo) {
        console.log('- Apollo key preview:', this.keys.apollo.substring(0, 4) + '...' + this.keys.apollo.substring(this.keys.apollo.length - 4));
      }
      if (this.keys.hunter) {
        console.log('- Hunter key preview:', this.keys.hunter.substring(0, 4) + '...' + this.keys.hunter.substring(this.keys.hunter.length - 4));
      }
    }
  }

  // Primary email finder using Hunter.io
  async findEmail(fullName, domain) {
    if (DEBUG) {
      console.log('=== HUNTER.IO findEmail CALLED ===');
      console.log('Input parameters:');
      console.log('- fullName:', fullName);
      console.log('- domain:', domain);
      console.log('- Hunter key exists:', !!this.keys.hunter);
    }

    if (!fullName || !domain || !this.keys.hunter) {
      if (DEBUG) {
        console.log('HUNTER.IO FAILED - Missing requirements:');
        console.log('- fullName:', fullName ? `"${fullName}"` : 'MISSING');
        console.log('- domain:', domain ? `"${domain}"` : 'MISSING');
        console.log('- API key:', this.keys.hunter ? 'EXISTS' : 'MISSING');
      }
      return null;
    }

    try {
      const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&full_name=${encodeURIComponent(fullName)}&api_key=${this.keys.hunter}`;
      
      if (DEBUG) {
        console.log('Making Hunter.io API request:');
        console.log('- URL:', url.replace(this.keys.hunter, 'API_KEY_HIDDEN'));
        console.log('- Encoded name:', encodeURIComponent(fullName));
      }
      
      const response = await fetch(url);
      
      if (DEBUG) {
        console.log('Hunter.io response received:');
        console.log('- Status:', response.status);
        console.log('- Status text:', response.statusText);
        console.log('- Headers:', Object.fromEntries(response.headers.entries()));
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG) {
          console.error('Hunter.io API error:');
          console.error('- Status:', response.status);
          console.error('- Error response:', errorText);
        }
        return null;
      }

      const data = await response.json();
      
      if (DEBUG) {
        console.log('Hunter.io successful response:');
        console.log('- Full response:', JSON.stringify(data, null, 2));
        if (data.data) {
          console.log('- Email found:', data.data.email);
          console.log('- Confidence:', data.data.score);
          console.log('- Sources count:', data.data.sources?.length || 0);
        }
      }
      
      const result = {
        email: data.data?.email || null,
        confidence: data.data?.score || 0,
        firstName: data.data?.first_name,
        lastName: data.data?.last_name,
        position: data.data?.position,
        sources: data.data?.sources?.length || 0,
        emailSource: 'Hunter.io'
      };
      
      if (DEBUG) console.log('Returning Hunter.io result:', result);
      
      return result;
    } catch (error) {
      if (DEBUG) {
        console.error('Hunter.io exception caught:');
        console.error('- Error type:', error.name);
        console.error('- Error message:', error.message);
        console.error('- Stack trace:', error.stack);
      }
      return null;
    }
  }

  // Get domain from company name using Hunter.io domain search
  async getDomainFromCompany(companyName) {
    if (DEBUG) {
      console.log('=== HUNTER.IO getDomainFromCompany CALLED ===');
      console.log('- Company name:', companyName);
      console.log('- Hunter key exists:', !!this.keys.hunter);
    }

    if (!companyName || !this.keys.hunter) {
      if (DEBUG) {
        console.log('Hunter.io domain search FAILED - Missing requirements:');
        console.log('- companyName:', companyName ? `"${companyName}"` : 'MISSING');
        console.log('- API key:', this.keys.hunter ? 'EXISTS' : 'MISSING');
      }
      return null;
    }

    try {
      const url = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(companyName)}&api_key=${this.keys.hunter}`;
      
      if (DEBUG) {
        console.log('Making Hunter.io domain search request:');
        console.log('- URL:', url.replace(this.keys.hunter, 'API_KEY_HIDDEN'));
      }
      
      const response = await fetch(url);
      
      if (DEBUG) console.log('Hunter.io domain search response status:', response.status);
      
      if (!response.ok) {
        if (DEBUG) console.log('Hunter.io domain search failed with status:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (DEBUG) {
        console.log('Hunter.io domain search response:', data);
        console.log('- Domain found:', data.data?.domain || 'NOT FOUND');
      }
      
      return data.data?.domain || null;
    } catch (error) {
      if (DEBUG) console.error('Hunter.io domain search exception:', error);
      return null;
    }
  }

  // Enrich company data using Apollo.io for comprehensive information
  async enrichCompany(companyName) {
    if (DEBUG) {
      console.log('=== APOLLO.IO enrichCompany CALLED ===');
      console.log('- Company name:', companyName);
      console.log('- Apollo key exists:', !!this.keys.apollo);
    }

    if (!companyName || !this.keys.apollo) {
      if (DEBUG) {
        console.log('APOLLO.IO FAILED - Missing requirements:');
        console.log('- companyName:', companyName ? `"${companyName}"` : 'MISSING');
        console.log('- API key:', this.keys.apollo ? 'EXISTS' : 'MISSING');
      }
      return null;
    }

    try {
      const requestBody = {
        q_organization_name: companyName,
        per_page: 1
      };
      
      if (DEBUG) {
        console.log('Making Apollo.io API request:');
        console.log('- URL: https://api.apollo.io/v1/organizations/search');
        console.log('- Request body:', JSON.stringify(requestBody, null, 2));
      }
      
      const response = await fetch('https://api.apollo.io/v1/organizations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.keys.apollo
        },
        body: JSON.stringify(requestBody)
      });

      if (DEBUG) {
        console.log('Apollo.io response received:');
        console.log('- Status:', response.status);
        console.log('- Status text:', response.statusText);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG) {
          console.error('Apollo.io API error:');
          console.error('- Status:', response.status);
          console.error('- Error response:', errorText);
        }
        return null;
      }

      const data = await response.json();
      
      if (DEBUG) {
        console.log('Apollo.io successful response:');
        console.log('- Total organizations found:', data.organizations?.length || 0);
        if (data.organizations && data.organizations.length > 0) {
          console.log('- First organization:', JSON.stringify(data.organizations[0], null, 2));
        }
      }
      
      if (data.organizations && data.organizations.length > 0) {
        const formatted = this.formatApolloCompany(data.organizations[0]);
        if (DEBUG) console.log('Formatted company data:', formatted);
        return formatted;
      }
      
      if (DEBUG) console.log('No organizations found in Apollo response');
      return null;
    } catch (error) {
      if (DEBUG) {
        console.error('Apollo.io exception caught:');
        console.error('- Error type:', error.name);
        console.error('- Error message:', error.message);
        console.error('- Stack trace:', error.stack);
      }
      return null;
    }
  }

  // Search for person details using Apollo.io (for title, seniority, department)
  async getPersonDetails(name, company) {
    if (DEBUG) {
      console.log('=== APOLLO.IO getPersonDetails CALLED ===');
      console.log('- Person name:', name);
      console.log('- Company:', company);
      console.log('- Apollo key exists:', !!this.keys.apollo);
    }

    if (!name || !this.keys.apollo) {
      if (DEBUG) {
        console.log('APOLLO.IO person search FAILED - Missing requirements:');
        console.log('- name:', name ? `"${name}"` : 'MISSING');
        console.log('- API key:', this.keys.apollo ? 'EXISTS' : 'MISSING');
      }
      return null;
    }

    try {
      const requestBody = {
        q_person_name: name,
        q_organization_name: company,
        per_page: 1
      };
      
      if (DEBUG) {
        console.log('Making Apollo.io person search request:');
        console.log('- URL: https://api.apollo.io/v1/people/search');
        console.log('- Request body:', JSON.stringify(requestBody, null, 2));
      }
      
      const response = await fetch('https://api.apollo.io/v1/people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.keys.apollo
        },
        body: JSON.stringify(requestBody)
      });

      if (DEBUG) {
        console.log('Apollo.io person search response:');
        console.log('- Status:', response.status);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (DEBUG) console.error('Apollo.io person search error:', errorText);
        return null;
      }

      const data = await response.json();
      
      if (DEBUG) {
        console.log('Apollo.io person search successful:');
        console.log('- Total people found:', data.people?.length || 0);
      }
      
      if (data.people && data.people.length > 0) {
        const person = data.people[0];
        
        if (DEBUG) {
          console.log('Person details found:');
          console.log('- Name:', person.name);
          console.log('- Title:', person.title);
          console.log('- Seniority:', person.seniority);
          console.log('- Departments:', person.departments);
          console.log('- Email (if available):', person.email);
        }
        
        const result = {
          title: person.title,
          seniority: person.seniority,
          departments: person.departments || [],
          linkedinUrl: person.linkedin_url,
          city: person.city,
          state: person.state,
          country: person.country
        };
        
        if (DEBUG) console.log('Returning person details:', result);
        return result;
      }
      
      if (DEBUG) console.log('No people found in Apollo response');
      return null;
    } catch (error) {
      if (DEBUG) console.error('Apollo.io person search exception:', error);
      return null;
    }
  }

  // Format Apollo company data
  formatApolloCompany(org) {
    if (DEBUG) console.log('=== FORMATTING APOLLO COMPANY DATA ===');
    
    if (!org) {
      if (DEBUG) console.log('No organization data to format');
      return null;
    }
    
    if (DEBUG) {
      console.log('Raw Apollo organization data:');
      console.log('- Name:', org.name);
      console.log('- Employees:', org.estimated_num_employees);
      console.log('- Industry:', org.industry);
      console.log('- Industries array:', org.industries);
      console.log('- Founded year:', org.founded_year);
      console.log('- Keywords count:', org.keywords?.length || 0);
    }
    
    const formatted = {
      name: org.name,
      domain: org.primary_domain,
      revenue: 'Unknown', // Not provided in Apollo response
      revenueRange: 'Unknown',
      revenueNumber: 0,
      employees: org.estimated_num_employees || 'Unknown',
      employeesRange: this.getEmployeeRange(org.estimated_num_employees),
      employeesCount: parseInt(org.estimated_num_employees) || 0,
      industry: org.industry || (org.industries && org.industries[0]) || 'Unknown',
      industries: org.industries || [],
      keywords: org.keywords || [],
      technologies: [], // Not in this response
      fundingStage: 'Unknown', // Not provided
      fundingTotal: 0, // Not provided
      description: org.short_description || '',
      location: org.city && org.state ? `${org.city}, ${org.state}` : org.country,
      foundedYear: org.founded_year,
      phone: org.phone || org.sanitized_phone,
      website: org.website_url,
      socials: {
        facebook: org.facebook_url,
        twitter: org.twitter_url,
        linkedin: org.linkedin_url
      },
      alexa_ranking: org.alexa_ranking,
      annual_growth_rate: 0 // Not provided
    };
    
    if (DEBUG) {
      console.log('Formatted company data:');
      console.log('- Domain:', formatted.domain);
      console.log('- Employees:', formatted.employees);
      console.log('- Employee range:', formatted.employeesRange);
      console.log('- Industry:', formatted.industry);
    }
    
    return formatted;
  }

  // Add this helper method to the APIClient class
  getEmployeeRange(count) {
    if (DEBUG) console.log('Getting employee range for count:', count);
    
    if (!count) return 'Unknown';
    const num = parseInt(count);
    
    let range;
    if (num <= 10) range = '1-10';
    else if (num <= 50) range = '11-50';
    else if (num <= 200) range = '51-200';
    else if (num <= 500) range = '201-500';
    else if (num <= 1000) range = '501-1000';
    else if (num <= 5000) range = '1001-5000';
    else range = '5000+';
    
    if (DEBUG) console.log('Employee range:', range);
    return range;
  }

  // Helper function to format revenue
  formatRevenue(revenue) {
    if (DEBUG) console.log('Formatting revenue:', revenue);
    
    if (!revenue || revenue === 'Unknown') return 'Unknown';
    
    // If it's already a string range, return it
    if (typeof revenue === 'string') return revenue;
    
    // If it's a number, format it
    let formatted;
    if (revenue >= 1000000000) {
      formatted = `$${(revenue / 1000000000).toFixed(1)}B`;
    } else if (revenue >= 1000000) {
      formatted = `$${(revenue / 1000000).toFixed(0)}M`;
    } else if (revenue >= 1000) {
      formatted = `$${(revenue / 1000).toFixed(0)}K`;
    } else {
      formatted = `$${revenue}`;
    }
    
    if (DEBUG) console.log('Formatted revenue:', formatted);
    return formatted;
  }
}

// Add usage tracker if it exists
if (typeof window.UsageTracker !== 'undefined') {
  const usageTracker = new window.UsageTracker();
  if (DEBUG) console.log('UsageTracker initialized');
}

// Export for use in content script
window.APIClient = APIClient;
if (DEBUG) console.log('APIClient exported to window');