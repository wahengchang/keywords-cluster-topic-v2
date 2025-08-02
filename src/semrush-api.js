const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Fetch SEMrush keywords data (generic for url or domain)
 * @param {Object} options
 * @param {string} options.apiKey - SEMrush API key
 * @param {string} options.type - 'url_organic' or 'domain_organic'
 * @param {string} options.target - URL or domain to analyze
 * @param {string} options.database - SEMrush database (e.g., 'us')
 * @param {number} options.limit - Max results
 * @returns {Promise<string>} CSV data
 */
async function fetchSemrushKeywordsDomain({ target, database, limit }) {
  if (process.env.NODE_ENV === 'development') {
    try {
      const samplePath = path.join(__dirname, '..', 'output', 'semrush_lbank_com_2025-07-28.csv');
      const sampleData = fs.readFileSync(samplePath, 'utf8');
      console.log('Using sample data from:', samplePath);
      return sampleData;
    } catch (err) {
      console.error('Error reading sample file:', err.message);
      throw new Error('Sample file not found. Please ensure sample/output.csv exists.');
    }
  }

  const apiKey = process.env.SEMRUSH_API_KEY;
  const endpoint = 'https://api.semrush.com/';
  const params = {
    type: 'domain_organic',
    key: apiKey,
    database,
    display_limit: limit,
    export_columns: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td',
    display_sort: 'tr_desc',
    domain: target,
  };
  const fullUrl = endpoint + '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  console.log('Request URL:', fullUrl);

  let progressInterval;
  
  try {
    console.log('📡 Sending request to SEMrush API...');
    console.log(`🎯 Target: ${target} | Database: ${database} | Limit: ${limit}`);
    
    // Add timeout and progress logging
    const startTime = Date.now();
    
    // Show progress every 10 seconds
    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`⏳ Still waiting for SEMrush response... (${elapsed}s elapsed)`);
    }, 10000);
    
    const response = await axios.get(endpoint, { 
      params,
      timeout: 300000, // 5 minute timeout
      headers: {
        'User-Agent': 'Keywords-Cluster-Tool/1.0'
      }
    });
    
    clearInterval(progressInterval);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`✅ SEMrush API response received (${elapsed}s)`);
    console.log(`📊 Response size: ${response.data.length} characters`);
    
    return response.data;
  } catch (err) {
    if (progressInterval) clearInterval(progressInterval);
    
    if (err.code === 'ECONNABORTED') {
      console.error('❌ SEMrush API request timed out (5+ minutes)');
    } else if (err.response?.status) {
      console.error(`❌ SEMrush API error (${err.response.status}):`, err.response?.data || err.message);
    } else {
      console.error('❌ Network error:', err.message);
    }
    throw err;
  }
}



/**
 * Fetch SEMrush keywords for a subfolder
 * @param {Object} options
 * @param {string} options.apiKey - SEMrush API key
 * @param {string} options.subfolder - Subfolder path (e.g., "/blog/")
 * @param {string} options.database - SEMrush database (e.g., 'us')
 * @param {number} options.limit - Max results
 * @returns {Promise<string>} CSV data
 */
async function fetchSemrushKeywordsSubfolder({ apiKey, subfolder, database, limit }) {
  if (process.env.NODE_ENV === 'development') {
    try {
      const samplePath = path.join(__dirname, '..', '..', 'sample', 'output.csv');
      const sampleData = fs.readFileSync(samplePath, 'utf8');
      console.log('Using sample data from:', samplePath);
      return sampleData;
    } catch (err) {
      console.error('Error reading sample file:', err.message);
      throw new Error('Sample file not found. Please ensure sample/output.csv exists.');
    }
  }

  const endpoint = 'https://api.semrush.com/';
  const params = {
    type: 'subfolder_organic',
    key: apiKey,
    subfolder,
    database,
    display_limit: limit,
    export_columns: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td',
    display_sort: 'tr_desc',
  };
  const fullUrl = endpoint + '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  console.log('Request URL:', fullUrl);

  let progressInterval;
  
  try {
    console.log('📡 Sending request to SEMrush API...');
    console.log(`🎯 Subfolder: ${subfolder} | Database: ${database} | Limit: ${limit}`);
    
    // Add timeout and progress logging
    const startTime = Date.now();
    
    // Show progress every 10 seconds
    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`⏳ Still waiting for SEMrush response... (${elapsed}s elapsed)`);
    }, 10000);
    
    const response = await axios.get(endpoint, { 
      params,
      timeout: 300000, // 5 minute timeout
      headers: {
        'User-Agent': 'Keywords-Cluster-Tool/1.0'
      }
    });
    
    clearInterval(progressInterval);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`✅ SEMrush API response received (${elapsed}s)`);
    console.log(`📊 Response size: ${response.data.length} characters`);
    
    return response.data;
  } catch (err) {
    if (progressInterval) clearInterval(progressInterval);
    
    if (err.code === 'ECONNABORTED') {
      console.error('❌ SEMrush API request timed out (5+ minutes)');
    } else if (err.response?.status) {
      console.error(`❌ SEMrush API error (${err.response.status}):`, err.response?.data || err.message);
    } else {
      console.error('❌ Network error:', err.message);
    }
    throw err;
  }
}

module.exports = {
  fetchSemrushKeywordsDomain,
  fetchSemrushKeywordsSubfolder,
};