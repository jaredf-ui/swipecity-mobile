import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirebaseInstances } from '../config';
import { FIREBASE_COLLECTIONS } from '@swipecity/shared';
export class FirestoreService {
    constructor() {
        const { db } = getFirebaseInstances();
        this.db = db;
    }
    // Items methods
    async getItems(categoryFilter, maxItems = 50) {
        try {
            const itemsRef = collection(this.db, FIREBASE_COLLECTIONS.ITEMS);
            let itemsQuery = query(itemsRef, orderBy('created_at', 'desc'), limit(maxItems));
            if (categoryFilter && categoryFilter.length > 0) {
                itemsQuery = query(itemsRef, where('categoryIndex', 'in', categoryFilter), orderBy('created_at', 'desc'), limit(maxItems));
            }
            const snapshot = await getDocs(itemsQuery);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return { success: true, data: items };
        }
        catch (error) {
            console.error('Error fetching items:', error);
            return { success: false, error: error.message || 'Failed to fetch items' };
        }
    }
    async addItem(item) {
        try {
            const itemsRef = collection(this.db, FIREBASE_COLLECTIONS.ITEMS);
            const docRef = await addDoc(itemsRef, {
                ...item,
                created_at: Date.now()
            });
            return { success: true, data: docRef.id };
        }
        catch (error) {
            console.error('Error adding item:', error);
            return { success: false, error: error.message || 'Failed to add item' };
        }
    }
    async updateItem(itemId, updates) {
        try {
            const itemRef = doc(this.db, FIREBASE_COLLECTIONS.ITEMS, itemId);
            await updateDoc(itemRef, updates);
            return { success: true };
        }
        catch (error) {
            console.error('Error updating item:', error);
            return { success: false, error: error.message || 'Failed to update item' };
        }
    }
    async deleteItem(itemId) {
        try {
            const itemRef = doc(this.db, FIREBASE_COLLECTIONS.ITEMS, itemId);
            await deleteDoc(itemRef);
            return { success: true };
        }
        catch (error) {
            console.error('Error deleting item:', error);
            return { success: false, error: error.message || 'Failed to delete item' };
        }
    }
    // Chat methods
    async getUserChats(userId) {
        try {
            const chatsRef = collection(this.db, FIREBASE_COLLECTIONS.CHATS);
            const chatsQuery = query(chatsRef, where('participants', 'array-contains', userId), orderBy('lastMessageTime', 'desc'));
            const snapshot = await getDocs(chatsQuery);
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return { success: true, data: chats };
        }
        catch (error) {
            console.error('Error fetching chats:', error);
            return { success: false, error: error.message || 'Failed to fetch chats' };
        }
    }
    async createChat(chat) {
        try {
            const chatsRef = collection(this.db, FIREBASE_COLLECTIONS.CHATS);
            const docRef = await addDoc(chatsRef, {
                ...chat,
                created_at: Date.now(),
                lastMessageTime: Date.now()
            });
            return { success: true, data: docRef.id };
        }
        catch (error) {
            console.error('Error creating chat:', error);
            return { success: false, error: error.message || 'Failed to create chat' };
        }
    }
    async addMessageToChat(chatId, message) {
        try {
            const chatRef = doc(this.db, FIREBASE_COLLECTIONS.CHATS, chatId);
            const chatDoc = await getDoc(chatRef);
            if (!chatDoc.exists()) {
                throw new Error('Chat not found');
            }
            const chatData = chatDoc.data();
            const updatedMessages = [...(chatData.messages || []), message];
            await updateDoc(chatRef, {
                messages: updatedMessages,
                lastMessageTime: Date.now()
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error adding message to chat:', error);
            return { success: false, error: error.message || 'Failed to send message' };
        }
    }
    // Report methods
    async reportItem(itemId, userId, reason) {
        try {
            const reportsRef = collection(this.db, FIREBASE_COLLECTIONS.REPORTS);
            await addDoc(reportsRef, {
                itemId,
                userId,
                reason,
                created_at: Date.now()
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error reporting item:', error);
            return { success: false, error: error.message || 'Failed to report item' };
        }
    }
    // Generic query method
    async query(collectionName, conditions = [], orderByField, limitCount) {
        try {
            const collectionRef = collection(this.db, collectionName);
            let q = collectionRef;
            // Apply where conditions
            conditions.forEach(condition => {
                q = query(q, where(condition.field, condition.operator, condition.value));
            });
            // Apply ordering
            if (orderByField) {
                q = query(q, orderBy(orderByField, 'desc'));
            }
            // Apply limit
            if (limitCount) {
                q = query(q, limit(limitCount));
            }
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return { success: true, data };
        }
        catch (error) {
            console.error(`Error querying ${collectionName}:`, error);
            return { success: false, error: error.message || `Failed to query ${collectionName}` };
        }
    }
}
