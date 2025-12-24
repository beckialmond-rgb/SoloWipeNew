import { useMemo } from 'react';

export interface EmailValidation {
  isValid: boolean;
  isEmpty: boolean;
  error: string | null;
}

export const validateEmail = (email: string): EmailValidation => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, isEmpty: true, error: null };
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());
  
  return {
    isValid,
    isEmpty: false,
    error: isValid ? null : 'Please enter a valid email address',
  };
};

export const useEmailValidation = (email: string): EmailValidation => {
  return useMemo(() => validateEmail(email), [email]);
};
