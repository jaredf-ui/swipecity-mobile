import { Item, Chat, ApiResponse } from '@swipecity/shared';
export declare class FirestoreService {
    private db;
    constructor();
    getItems(categoryFilter?: number[], maxItems?: number): Promise<ApiResponse<Item[]>>;
    addItem(item: Omit<Item, 'id'>): Promise<ApiResponse<string>>;
    updateItem(itemId: string, updates: Partial<Item>): Promise<ApiResponse<void>>;
    deleteItem(itemId: string): Promise<ApiResponse<void>>;
    getUserChats(userId: string): Promise<ApiResponse<Chat[]>>;
    createChat(chat: Omit<Chat, 'id'>): Promise<ApiResponse<string>>;
    addMessageToChat(chatId: string, message: Chat['messages'][0]): Promise<ApiResponse<void>>;
    reportItem(itemId: string, userId: string, reason: string): Promise<ApiResponse<void>>;
    query<T>(collectionName: string, conditions?: any[], orderByField?: string, limitCount?: number): Promise<ApiResponse<T[]>>;
}
