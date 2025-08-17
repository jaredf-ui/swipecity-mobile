export declare const SecurityUtils: {
    sanitizeInput: (input: unknown) => string;
    validateEmail: (email: string) => boolean;
    checkRateLimit: (lastAction: number, cooldown?: number) => boolean;
    validateMessage: (message: string) => boolean;
};
