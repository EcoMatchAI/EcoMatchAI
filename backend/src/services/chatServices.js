 const Chat = require('../model/chat');
const Message = require('../model/message');

class ChatService {
    /**
     * Create or retrieve an existing chat room between two users
     */
    async findOrCreateChat(userId1, userId2, productId = null) {
        if (!userId1 || !userId2) {
            throw new Error('Both participant user IDs are required.');
        }

        const query = {
            participants: { $all: [userId1, userId2] }
        };
        if (productId) {
            query.product = productId;
        }

        let chat = await Chat.findOne(query)
            .populate('participants', 'businessName email phoneNumber role')
            .populate('product', 'title category price photos');

        if (!chat) {
            const initialUnread = new Map();
            initialUnread.set(userId1.toString(), 0);
            initialUnread.set(userId2.toString(), 0);

            chat = await Chat.create({
                participants: [userId1, userId2],
                product: productId || null,
                unreadCounts: initialUnread
            });

            chat = await chat.populate([
                { path: 'participants', select: 'businessName email phoneNumber role' },
                { path: 'product', select: 'title category price photos' }
            ]);
        }

        return chat;
    }

    /**
     * Save a new message and update chat lastMessage metadata
     */
    async saveMessage({ chatId, senderId, recipientId, text, attachments = [] }) {
        const chat = await Chat.findById(chatId);
        if (!chat) throw new Error('Chat room not found.');

        // Save Message in DB
        const message = await Message.create({
            chat: chatId,
            sender: senderId,
            recipient: recipientId,
            text,
            attachments
        });

        // Update Chat metadata
        chat.lastMessage = {
            text,
            sender: senderId,
            timestamp: new Date()
        };

        // Increment unread count for recipient
        const recipientStr = recipientId.toString();
        const currentUnread = chat.unreadCounts.get(recipientStr) || 0;
        chat.unreadCounts.set(recipientStr, currentUnread + 1);

        await chat.save();

        return await message.populate([
            { path: 'sender', select: 'businessName email' },
            { path: 'recipient', select: 'businessName email' }
        ]);
    }

    /**
     * Fetch all chat conversations for a specific user
     */
    async getUserChats(userId) {
        return await Chat.find({ participants: userId })
            .populate('participants', 'businessName email phoneNumber role')
            .populate('product', 'title category price photos')
            .sort({ 'lastMessage.timestamp': -1 });
    }

    /**
     * Fetch message history for a chat room with pagination
     */
    async getChatMessages(chatId, userId, page = 1, limit = 50) {
        const chat = await Chat.findById(chatId);
        if (!chat) throw new Error('Chat room not found.');

        // Ensure requesting user is a participant
        const isParticipant = chat.participants.some(p => p._id.toString() === userId.toString());
        if (!isParticipant) {
            throw new Error('Unauthorized. You are not a participant in this chat.');
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'businessName email')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        return messages;
    }

    /**
     * Mark all unread messages in a chat as read
     */
    async markMessagesAsRead(chatId, userId) {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        // Reset unread count for user
        chat.unreadCounts.set(userId.toString(), 0);
        await chat.save();

        // Mark messages as read
        await Message.updateMany(
            { chat: chatId, recipient: userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        return { success: true };
    }
}

module.exports = new ChatService();