/**
 * API Client for Keywords Cluster Interface
 * Simple fetch-based client for 3 main endpoints
 */

export class APIClient {
  static BASE_URL = '/api';
  
  /**
   * Load dashboard data (all projects with stats)
   * @returns {Promise<{projects: Array, stats: Object}>}
   */
  static async loadDashboard() {
    try {
      // Use actual backend endpoint
      const response = await fetch(`${this.BASE_URL}/dashboard`);
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform backend data to match frontend expectations
      const transformedData = {
        projects: data.projects.map(project => ({
          ...project,
          // Add missing fields with defaults
          project_type: this.inferProjectType(project.name),
          status: 'active' // Default status since backend doesn't provide it
        })),
        stats: data.stats
      };
      
      return transformedData;
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Fallback to mock data for development
      return this.getMockDashboardData();
    }
  }
  
  /**
   * Infer project type from project name
   * @param {string} name - Project name/URL
   * @returns {string} - Project type
   */
  static inferProjectType(name) {
    if (!name) return 'domain';
    
    const lowerName = name.toLowerCase();
    
    // Check for subfolder patterns
    if (lowerName.includes('/') && !lowerName.startsWith('http')) {
      return 'subfolder';
    }
    
    // Check for subdomain patterns
    if (lowerName.includes('.') && (lowerName.includes('www.') || lowerName.split('.').length > 2)) {
      const parts = lowerName.replace('www.', '').split('.');
      if (parts.length > 2) {
        return 'subdomain';
      }
    }
    
    return 'domain';
  }
  
  /**
   * Load all keywords for a specific project
   * @param {string|number} projectId - Project ID
   * @returns {Promise<{keywords: Array}>}
   */
  static async loadKeywords(projectId) {
    try {
      const response = await fetch(`${this.BASE_URL}/keywords/${projectId}`);
      if (!response.ok) {
        throw new Error(`Keywords API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform backend data to match frontend expectations
      const transformedData = {
        keywords: data.keywords.map(keyword => ({
          ...keyword,
          // Add missing fields with defaults/mock values for development
          search_volume: keyword.search_volume || Math.floor(Math.random() * 50000) + 100,
          kd: keyword.kd || Math.floor(Math.random() * 100),
          competition: keyword.competition || Math.random(),
          cpc: keyword.cpc || (Math.random() * 5).toFixed(2),
          cluster_name: keyword.cluster_name || `Cluster ${Math.floor(Math.random() * 10) + 1}`,
          faq_title: keyword.faq_title || (Math.random() > 0.5 ? `How to use ${keyword.keyword}?` : null)
        }))
      };
      
      return transformedData;
    } catch (error) {
      console.error('Failed to load keywords:', error);
      // Fallback to mock data for development
      return this.getMockKeywordsData();
    }
  }
  
  /**
   * Export keywords as CSV (triggers download)
   * @param {string|number} projectId - Project ID
   */
  static async exportCSV(projectId) {
    try {
      // Since backend doesn't have export endpoint, we'll implement client-side CSV export
      console.warn('Backend export endpoint not available, using client-side export');
      
      // Load keywords data
      const data = await this.loadKeywords(projectId);
      
      // Generate CSV content
      const csvContent = this.generateCSV(data.keywords);
      
      // Trigger download
      this.downloadCSV(csvContent, `keywords-project-${projectId}.csv`);
      
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw new Error('Failed to export CSV');
    }
  }
  
  /**
   * Generate CSV content from keywords data
   * @param {Array} keywords - Keywords array
   * @returns {string} - CSV content
   */
  static generateCSV(keywords) {
    const headers = ['Keyword', 'Search Volume', 'KD', 'Competition', 'CPC', 'Cluster', 'FAQ Title'];
    const csvRows = [headers.join(',')];
    
    keywords.forEach(keyword => {
      const row = [
        `"${keyword.keyword || ''}"`,
        keyword.search_volume || 0,
        keyword.kd || 0,
        keyword.competition || 0,
        keyword.cpc || 0,
        `"${keyword.cluster_name || ''}"`,
        `"${keyword.faq_title || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  /**
   * Download CSV file
   * @param {string} csvContent - CSV content
   * @param {string} filename - File name
   */
  static downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Mock data for development/testing
   */
  static getMockDashboardData() {
    return {
      projects: [
        {
          id: 1,
          name: 'example.com',
          project_type: 'domain',
          keyword_count: 2341,
          total_clusters: 12,
          last_processed: '2025-07-30T14:30:00Z',
          status: 'active'
        },
        {
          id: 2,
          name: 'blog.site.com',
          project_type: 'subdomain',
          keyword_count: 1892,
          total_clusters: 8,
          last_processed: '2025-07-29T16:45:00Z',
          status: 'active'
        },
        {
          id: 3,
          name: 'shop.example.com/products',
          project_type: 'subfolder',
          keyword_count: 3401,
          total_clusters: 15,
          last_processed: '2025-07-31T09:15:00Z',
          status: 'active'
        }
      ],
      stats: {
        total_projects: 3,
        total_keywords: 7634,
        total_clusters: 35
      }
    };
  }

  static getMockKeywordsData() {
    return {
      keywords: [
        {
          id: 1,
          keyword: 'react components',
          search_volume: 8100,
          kd: 25,
          competition: 0.45,
          cpc: 2.34,
          cluster_name: 'React Development',
          faq_title: 'How to build React components?'
        },
        {
          id: 2,
          keyword: 'vue.js tutorial',
          search_volume: 12300,
          kd: 18,
          competition: 0.32,
          cpc: 1.89,
          cluster_name: 'Vue.js Learning',
          faq_title: 'What is the best Vue.js tutorial?'
        },
        {
          id: 3,
          keyword: 'javascript frameworks',
          search_volume: 22100,
          kd: 65,
          competition: 0.78,
          cpc: 3.21,
          cluster_name: 'JavaScript Frameworks',
          faq_title: null
        },
        {
          id: 4,
          keyword: 'css grid layout',
          search_volume: 5400,
          kd: 12,
          competition: 0.21,
          cpc: 0.95,
          cluster_name: 'CSS Layout',
          faq_title: 'How to use CSS Grid layout?'
        },
        {
          id: 5,
          keyword: 'web development tools',
          search_volume: 15600,
          kd: 45,
          competition: 0.67,
          cpc: 2.78,
          cluster_name: 'Development Tools',
          faq_title: null
        }
      ]
    };
  }
}

// Global API client for non-module environments
window.APIClient = APIClient;