export const SecurityUtils = {
    sanitizeInput: (input) => {
        if (typeof input !== 'string')
            return '';
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    },
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    },
    checkRateLimit: (lastAction, cooldown = 300) => {
        return Date.now() - lastAction >= cooldown;
    },
    validateMessage: (message) => {
        if (!message || typeof message !== 'string')
            return false;
        return message.trim().length > 0 && message.length <= 1000;
    }
};
