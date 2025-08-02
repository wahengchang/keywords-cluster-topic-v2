// Input validation utilities

function validateProjectType(method, value) {
  if (!value || !value.trim()) {
    return `Please enter a valid ${method.toLowerCase()}`;
  }
  
  // For URL method, validate that it looks like a URL (with or without protocol)
  if (method === 'URL') {
    // Accept URLs with protocol or just domain/path
    const urlPattern = /^(https?:\/\/)?[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9](\/[^\s]*)?$/;
    if (!urlPattern.test(value)) {
      return 'Please enter a valid URL (e.g., example.com/path or https://example.com/path)';
    }
  }
  
  return true;
}

function validateLimit(input) {
  const num = parseInt(input);
  if (isNaN(num) || num <= 0 || num > 10000) {
    return 'Please enter a number between 1 and 10000';
  }
  return true;
}

function validateDomain(domain) {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain) || 'Please enter a valid domain name';
}

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
}

module.exports = {
  validateProjectType,
  validateLimit,
  validateDomain,
  validateUrl
};