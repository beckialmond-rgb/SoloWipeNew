/**
 * Enhanced email validation with typo detection and suggestions
 */

export interface EmailValidationResult {
  isValid: boolean;
  isEmpty: boolean;
  suggestions?: string[];
  commonTypos?: { original: string; suggestion: string };
}

const COMMON_EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outllok.com': 'outlook.com',
};

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

export function validateEmailWithSuggestions(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { isValid: false, isEmpty: true };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(trimmed);

  if (!isValid) {
    return { isValid: false, isEmpty: false };
  }

  // Check for common typos in domain
  const domain = trimmed.split('@')[1];
  const suggestions: string[] = [];
  let commonTypo: { original: string; suggestion: string } | undefined;

  // Check for exact typo match
  if (COMMON_EMAIL_TYPOS[domain]) {
    const corrected = trimmed.replace(domain, COMMON_EMAIL_TYPOS[domain]);
    suggestions.push(corrected);
    commonTypo = { original: domain, suggestion: COMMON_EMAIL_TYPOS[domain] };
  } else {
    // Check for similar domains (Levenshtein distance)
    for (const [typo, correct] of Object.entries(COMMON_EMAIL_TYPOS)) {
      if (domain.includes(typo) || typo.includes(domain)) {
        const corrected = trimmed.replace(domain, correct);
        if (!suggestions.includes(corrected)) {
          suggestions.push(corrected);
        }
      }
    }
  }

  return {
    isValid: true,
    isEmpty: false,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    commonTypos: commonTypo,
  };
}




