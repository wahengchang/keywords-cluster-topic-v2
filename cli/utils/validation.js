// Input validation utilities

function validateProjectType(method, value) {
  if (!value || !value.trim()) {
    return `Please enter a valid ${method.toLowerCase()}`;
  }
  
  if (method === 'URL' && !value.includes('://')) {
    return 'Please enter a complete URL including protocol (http:// or https://)';
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