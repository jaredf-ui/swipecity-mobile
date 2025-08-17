"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupUserData = exports.trackUserInteraction = exports.moderateNewItem = exports.cleanupOldTokens = exports.unregisterPushToken = exports.registerPushToken = exports.detectMatch = exports.sendNotificationOnNewMessage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
// Push notification functions
exports.sendNotificationOnNewMessage = functions.firestore
    .document('chats/{chatId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if messages array length increased
    const beforeMessageCount = ((_a = beforeData === null || beforeData === void 0 ? void 0 : beforeData.messages) === null || _a === void 0 ? void 0 : _a.length) || 0;
    const afterMessageCount = ((_b = afterData === null || afterData === void 0 ? void 0 : afterData.messages) === null || _b === void 0 ? void 0 : _b.length) || 0;
    if (afterMessageCount > beforeMessageCount) {
        const latestMessage = afterData.messages[afterMessageCount - 1];
        const participants = afterData.participants || [];
        // Send notification to all participants except the sender
        const notificationPromises = participants
            .filter((participantId) => participantId !== latestMessage.sender_id)
            .map(async (participantId) => {
            // Get user's push tokens
            const tokensSnapshot = await db
                .collection('pushTokens')
                .where('userId', '==', participantId)
                .get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
            if (tokens.length > 0) {
                const payload = {
                    notification: {
                        title: `New message from ${latestMessage.sender_name}`,
                        body: latestMessage.text.length > 100
                            ? latestMessage.text.substring(0, 100) + '...'
                            : latestMessage.text,
                        icon: '/logo192.png'
                    },
                    data: {
                        type: 'new_message',
                        chatId: context.params.chatId,
                        senderId: latestMessage.sender_id
                    }
                };
                return messaging.sendToDevice(tokens, payload);
            }
            return Promise.resolve();
        });
        await Promise.all(notificationPromises.filter(Boolean));
    }
});
// Match detection function
exports.detectMatch = functions.firestore
    .document('interactions/{interactionId}')
    .onCreate(async (snap, context) => {
    const interaction = snap.data();
    if (interaction.type === 'like') {
        // Check if the item seller also liked this user
        const reciprocalLike = await db
            .collection('interactions')
            .where('userId', '==', interaction.itemSellerId)
            .where('targetUserId', '==', interaction.userId)
            .where('type', '==', 'like')
            .get();
        if (!reciprocalLike.empty) {
            // It's a match! Create a chat and send notifications
            const chatData = {
                participants: [interaction.userId, interaction.itemSellerId],
                item_id: interaction.itemId,
                item_title: interaction.itemTitle,
                item_image: interaction.itemImage,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
                messages: [{
                        id: 'system_match',
                        sender_id: 'system',
                        sender_name: 'SwipeCity',
                        text: '🎉 You matched! Start chatting now.',
                        timestamp: new Date().toLocaleTimeString()
                    }]
            };
            const chatRef = await db.collection('chats').add(chatData);
            // Send match notifications to both users
            const users = [interaction.userId, interaction.itemSellerId];
            const notificationPromises = users.map(async (userId) => {
                const tokensSnapshot = await db
                    .collection('pushTokens')
                    .where('userId', '==', userId)
                    .get();
                const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
                if (tokens.length > 0) {
                    const payload = {
                        notification: {
                            title: '🎉 New Match!',
                            body: `You matched on ${interaction.itemTitle}`,
                            icon: '/logo192.png'
                        },
                        data: {
                            type: 'new_match',
                            chatId: chatRef.id,
                            itemId: interaction.itemId
                        }
                    };
                    return messaging.sendToDevice(tokens, payload);
                }
                return Promise.resolve();
            });
            await Promise.all(notificationPromises.filter(Boolean));
        }
    }
});
// Push token management
exports.registerPushToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { token, platform } = data;
    const userId = context.auth.uid;
    // Store the push token
    await db.collection('pushTokens').doc(`${userId}_${platform}`).set({
        userId,
        token,
        platform,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
exports.unregisterPushToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { platform = 'web' } = data;
    const userId = context.auth.uid;
    // Remove the push token
    await db.collection('pushTokens').doc(`${userId}_${platform}`).delete();
    return { success: true };
});
// Clean up old tokens
exports.cleanupOldTokens = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldTokens = await db
        .collection('pushTokens')
        .where('lastUsed', '<', thirtyDaysAgo)
        .get();
    const deletePromises = oldTokens.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${oldTokens.size} old push tokens`);
});
// Content moderation
exports.moderateNewItem = functions.firestore
    .document('items/{itemId}')
    .onCreate(async (snap, context) => {
    const item = snap.data();
    // Basic content filtering
    const inappropriateWords = ['spam', 'scam', 'fake', 'illegal'];
    const title = item.title.toLowerCase();
    const description = item.description.toLowerCase();
    const containsInappropriate = inappropriateWords.some(word => title.includes(word) || description.includes(word));
    if (containsInappropriate) {
        // Flag for review
        await snap.ref.update({
            flagged: true,
            flagReason: 'Inappropriate content detected',
            moderationStatus: 'pending'
        });
        // Notify moderators (you'd implement this based on your needs)
        console.log(`Item ${context.params.itemId} flagged for review`);
    }
});
// Analytics functions
exports.trackUserInteraction = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { event, properties } = data;
    const userId = context.auth.uid;
    // Store analytics event
    await db.collection('analytics').add({
        userId,
        event,
        properties,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: context.rawRequest.headers['user-agent'] || '',
        ip: context.rawRequest.ip || ''
    });
    return { success: true };
});
// User cleanup on delete
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
    const userId = user.uid;
    // Clean up user's data when they delete their account
    const cleanupPromises = [
        // Delete user document
        db.collection('users').doc(userId).delete(),
        // Delete user's items
        db.collection('items').where('seller_id', '==', userId).get()
            .then(snapshot => {
            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
            return Promise.all(deletePromises);
        }),
        // Delete user's push tokens
        db.collection('pushTokens').where('userId', '==', userId).get()
            .then(snapshot => {
            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
            return Promise.all(deletePromises);
        }),
        // Delete user's interactions
        db.collection('interactions').where('userId', '==', userId).get()
            .then(snapshot => {
            const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
            return Promise.all(deletePromises);
        })
    ];
    await Promise.all(cleanupPromises);
    console.log(`Cleaned up data for deleted user: ${userId}`);
});
//# sourceMappingURL=index.js.map