import { User } from '@swipecity/shared';
export declare class AuthService {
    private auth;
    private db;
    constructor();
    sendSignInLink(email: string): Promise<void>;
    completeSignInWithEmailLink(url: string): Promise<User>;
    createOrUpdateUser(userData: User): Promise<void>;
    getCurrentUser(): Promise<User | null>;
    signOut(): Promise<void>;
    onAuthStateChanged(callback: (user: User | null) => void): () => void;
    updateUserPreferences(userId: string, preferences: User['preferences']): Promise<void>;
}
