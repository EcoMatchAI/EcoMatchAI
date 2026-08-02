const chatService = require('../services/chatService');

class ChatController {

    async initiateChat(req, res) {
        try {
            const { recipientId, productId } = req.body;
            const chat = await chatService.findOrCreateChat(req.user._id, recipientId, productId);
            res.status(200).json({ success: true, chat });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }


    async getMyChats(req, res) {
        try {
            const chats = await chatService.getUserChats(req.user._id);
            res.status(200).json({ success: true, count: chats.length, chats });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    async getChatMessages(req, res) {
        try {
            const { page, limit } = req.query;
            const messages = await chatService.getChatMessages(req.params.chatId, req.user._id, page, limit);
            res.status(200).json({ success: true, count: messages.length, messages });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ChatController();