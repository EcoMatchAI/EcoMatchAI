const socketIO = require('socket.io');
const jwtProvider = require('./util/jwtProvider');
const chatService = require('./services/chatService');

// In-memory store for connected users: Map<userId, socketId>
const connectedUsers = new Map();

function initSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: "*", // Adjust for production CORS
            methods: ["GET", "POST"]
        }
    });

    // 1. Socket Authentication Middleware (Verify JWT token from handshake)
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = jwtProvider.verifyjwt(token);
            socket.user = {
                id: decoded.userId || decoded.id,
                email: decoded.email
            };
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    // 2. Connection Event Handlers
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        connectedUsers.set(userId.toString(), socket.id);
        console.log(`⚡ User connected to WebSocket: ${userId} (Socket ID: ${socket.id})`);

        // Broadcast User Online Status
        io.emit('userStatusChange', { userId, status: 'ONLINE' });

        // Join Private User Room (for direct alerts)
        socket.join(`user:${userId}`);

        // Join Chat Room
        socket.on('joinChat', ({ chatId }) => {
            socket.join(`chat:${chatId}`);
            console.log(`👥 User ${userId} joined room chat:${chatId}`);
        });

        // Leave Chat Room
        socket.on('leaveChat', ({ chatId }) => {
            socket.leave(`chat:${chatId}`);
            console.log(`👋 User ${userId} left room chat:${chatId}`);
        });

        // Event: Send Real-Time Message
        socket.on('sendMessage', async (data) => {
            try {
                const { chatId, recipientId, text, attachments } = data;

                // Save message to MongoDB via Service
                const savedMessage = await chatService.saveMessage({
                    chatId,
                    senderId: userId,
                    recipientId,
                    text,
                    attachments
                });

                // Emit to all users in the specific chat room
                io.to(`chat:${chatId}`).emit('newMessage', savedMessage);

                // Notify recipient's personal room if they aren't actively viewing the chat room
                const recipientSocketId = connectedUsers.get(recipientId.toString());
                if (recipientSocketId) {
                    io.to(`user:${recipientId}`).emit('messageNotification', {
                        chatId,
                        senderId: userId,
                        text,
                        timestamp: savedMessage.createdAt
                    });
                }
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Event: Real-Time Typing Indicator
        socket.on('typing', ({ chatId, recipientId }) => {
            socket.to(`chat:${chatId}`).emit('userTyping', {
                chatId,
                userId
            });
        });

        // Event: Stop Typing Indicator
        socket.on('stopTyping', ({ chatId, recipientId }) => {
            socket.to(`chat:${chatId}`).emit('userStopTyping', {
                chatId,
                userId
            });
        });

        // Event: Read Receipts (Mark Messages as Read)
        socket.on('markAsRead', async ({ chatId }) => {
            try {
                await chatService.markMessagesAsRead(chatId, userId);
                socket.to(`chat:${chatId}`).emit('messagesReadStatus', {
                    chatId,
                    readBy: userId
                });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Disconnect Event
        socket.on('disconnect', () => {
            connectedUsers.delete(userId.toString());
            console.log(`🔴 User disconnected from WebSocket: ${userId}`);
            io.emit('userStatusChange', { userId, status: 'OFFLINE' });
        });
    });

    return io;
}

module.exports = { initSocket, connectedUsers };