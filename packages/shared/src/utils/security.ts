export const SecurityUtils = {
  sanitizeInput: (input: unknown): string => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },
  
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  checkRateLimit: (lastAction: number, cooldown: number = 300): boolean => {
    return Date.now() - lastAction >= cooldown;
  },
  
  validateMessage: (message: string): boolean => {
    if (!message || typeof message !== 'string') return false;
    return message.trim().length > 0 && message.length <= 1000;
  }
};