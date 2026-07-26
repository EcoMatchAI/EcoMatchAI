# Real-Time Chat System Guide (WebSocket / Socket.IO)

This guide implements the messaging system behind `MessagesPage.jsx`: persistent conversations,
real-time delivery over WebSocket, typing indicators, read receipts, unread counts, and online
presence.

Prerequisites: guides `01` (the `http.Server` wrapper is required), `02` (JWT verification),
`06`, `07`.

---

## 📌 What the Frontend Has Today

`MessagesPage.jsx` is a complete UI on top of hardcoded state:

```javascript
const [chatHistories, setChatHistories] = useState({ biopack_1: [ … ], greenbrew_1: [ … ] });
const conversationItems = [ { id: 'greenbrew_1', name: 'GreenBrew Co.', … } ];
```

Sending fakes a reply after 2 seconds:

```javascript
setTimeout(() => {
  const responseMsg = { text: `Thanks for the update: "${sentMsgText…}"…` };
  …
  triggerToast('New message received from ' + …);
}, 2000);
```

Message shape the UI renders: `{ id, sender: 'me' | 'them', text, time, status }`.
Conversation shape: `{ id, name, type, time, snippet, avatarType }`.

Everything we build must map onto those two shapes so the existing markup survives.

---

## 🏛️ Why Socket.IO (not raw `ws`)

| Need | Raw `ws` | Socket.IO |
|------|----------|-----------|
| Auto-reconnect with backoff | ❌ hand-rolled | ✅ built in |
| Rooms (per-conversation fan-out) | ❌ hand-rolled | ✅ built in |
| Fallback to HTTP long-polling behind corporate proxies | ❌ | ✅ **critical for B2B** |
| Acknowledgement callbacks | ❌ | ✅ |
| Multi-server scaling | ❌ | ✅ via Redis adapter |

The proxy-fallback row decides it. Our users are businesses; many sit behind firewalls that block
raw WebSocket upgrades. Socket.IO degrades to polling automatically instead of appearing broken.

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────────┐
   Browser ◄────────┤  Socket.IO server (same port)     │
   (socket.io-client)   │  • JWT handshake auth          │
        │               │  • room per conversation       │
        │               │  • room per user (multi-tab)   │
        │               └──────────┬───────────────────┘
        │                          │
        │  REST for history        │ persist + fan out
        ▼                          ▼
   GET /api/chat/conversations   MongoDB
   GET /api/chat/:id/messages    (Conversation, Message)
```

**Persist first, then emit.** If the DB write fails, the message must not appear delivered — a
"sent" message that no longer exists after refresh destroys trust in the channel.

**REST for history, sockets for live.** Loading 200 messages over a socket is slower and harder to
paginate than a plain paginated GET.

---

## 🗄️ Step 1: Models

### `src/model/conversation.js`

```javascript
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    /**
     * Exactly two participants for now (1:1 per deal). Kept as an array so
     * group threads (buyer + seller + logistics partner) need no migration.
     */
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    }],

    /**
     * Deterministic key that makes "one thread per pair per listing" enforceable
     * with a unique index: sorted user ids + listing id.
     * e.g. "64a1..._64b2..._64c3..."
     */
    pairKey: { type: String, required: true, unique: true },

    // Chats almost always start from a listing — that context is what makes the
    // thread useful ("which material are we talking about?").
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    sourcingRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'SourcingRequest', default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },

    /* ---- Denormalised for the conversation list ---- */
    lastMessage: {
        text:     { type: String, default: '' },
        sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
        sentAt:   { type: Date, default: null },
        type:     { type: String, default: 'text' },
    },
    // Map<userId, unreadCount> — avoids a countDocuments per conversation
    // per page load, which is what makes an inbox slow.
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map(),
    },

    // Per-user archive/mute, so one side hiding a thread doesn't hide it for both.
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    mutedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],

    isBlocked:  { type: Boolean, default: false },
    blockedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },

}, { timestamps: true });

conversationSchema.index({ participants: 1, updatedAt: -1 });   // inbox query
conversationSchema.index({ listing: 1 });

/** Build the deterministic pair key. Sorting makes it order-independent. */
conversationSchema.statics.buildPairKey = function (userIdA, userIdB, listingId = null) {
    const ids = [String(userIdA), String(userIdB)].sort();
    return `${ids[0]}_${ids[1]}_${listingId || 'general'}`;
};

module.exports = mongoose.model('Conversation', conversationSchema);
```

### `src/model/message.js`

```javascript
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    text: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: '',
    },
    type: {
        type: String,
        // 'system' powers structured events in the thread — "Pickup scheduled
        // for Mon 19 Aug", "Request accepted" — which changes.md §3 calls for.
        enum: ['text', 'image', 'file', 'system', 'listing_share', 'pickup_proposal'],
        default: 'text',
    },
    attachments: [{
        url: String,
        publicId: String,
        name: String,
        mimeType: String,
        bytes: Number,
    }],
    // Payload for structured types (a shared listing, a proposed pickup slot).
    meta: { type: mongoose.Schema.Types.Mixed, default: null },

    /* ---- Delivery state ---- */
    // Read receipts per user, so this still works if threads become groups.
    readBy: [{
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        readAt: { type: Date, default: Date.now },
    }],
    deliveredAt: { type: Date, default: null },

    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },   // soft delete: "message removed"

}, { timestamps: true });

// The message-history query: newest-first within a conversation.
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
```

---

## 🔌 Step 2: Socket Server (`src/config/socket.js`)

```javascript
const { Server } = require('socket.io');
const jwtProvider = require('../util/jwtProvider');
const User = require('../model/user');
const env = require('./env');
const registerChatHandlers = require('../socket/chatHandlers');

let io = null;

/**
 * Tracks live sockets per user: Map<userId, Set<socketId>>.
 *
 * A Set, not a single id, because one user legitimately has several tabs open.
 * NOTE: this is in-process memory. With more than one server instance you MUST
 * add the Redis adapter (see "Scaling" below) or users on different instances
 * will not see each other's messages.
 */
const onlineUsers = new Map();

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [env.clientUrl, 'http://localhost:5173'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Allow the polling fallback — many corporate networks block raw
        // WebSocket upgrades, and B2B users sit behind exactly those networks.
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6,       // 1 MB — files go through the REST upload route
    });

    /* ---------- Handshake authentication ----------
       Runs once per connection. An unauthenticated socket never reaches a
       handler, so individual handlers don't each re-check identity.        */
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token
                || socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) return next(new Error('UNAUTHORIZED: no token provided'));

            const decoded = jwtProvider.verifyJwt(token);
            if (decoded.type === 'refresh' || decoded.type === 'temp') {
                return next(new Error('UNAUTHORIZED: wrong token type'));
            }

            const user = decoded.id
                ? await User.findById(decoded.id).select('name businessName avatarUrl accountStatus')
                : await User.findOne({ email: decoded.email }).select('name businessName avatarUrl accountStatus');

            if (!user) return next(new Error('UNAUTHORIZED: account not found'));
            if (['BANNED', 'CLOSED'].includes(user.accountStatus)) {
                return next(new Error('FORBIDDEN: account is not active'));
            }

            // Attach identity to the socket — every handler trusts this and
            // must NEVER trust a userId sent in an event payload.
            socket.userId = user._id.toString();
            socket.user = { id: user._id.toString(), name: user.name, avatarUrl: user.avatarUrl };
            next();
        } catch (err) {
            next(new Error('UNAUTHORIZED: invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        const { userId } = socket;
        console.log(`🔌 socket connected: ${socket.user.name} (${socket.id})`);

        /* Personal room: lets us push to every tab a user has open with one
           emit — io.to(`user:${id}`).emit(...) */
        socket.join(`user:${userId}`);

        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);

        // Announce presence only on the FIRST socket for this user, so opening
        // a second tab doesn't emit a spurious "came online".
        if (onlineUsers.get(userId).size === 1) {
            socket.broadcast.emit('presence:online', { userId });
        }

        registerChatHandlers(io, socket, onlineUsers);

        socket.on('disconnect', (reason) => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    socket.broadcast.emit('presence:offline', {
                        userId, lastSeen: new Date(),
                    });
                }
            }
            console.log(`🔌 socket disconnected: ${socket.user.name} (${reason})`);
        });

        socket.on('error', (err) => console.error(`socket error ${socket.id}:`, err.message));
    });

    console.log('✅ Socket.IO initialised');
    return io;
};

/** Accessor so REST controllers can push real-time events too. */
const getIo = () => {
    if (!io) throw new Error('Socket.IO not initialised — call initSocket(server) first.');
    return io;
};

const isUserOnline = (userId) => onlineUsers.has(String(userId));

/** Used by notifications (guide 11) and deal events (guide 10). */
const emitToUser = (userId, event, payload) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
};

module.exports = initSocket;
module.exports.getIo = getIo;
module.exports.isUserOnline = isUserOnline;
module.exports.emitToUser = emitToUser;
```

---

## 💬 Step 3: Chat Handlers (`src/socket/chatHandlers.js`)

```javascript
const chatServices = require('../services/chatServices');

/** Simple per-socket token bucket: 20 messages / 10 seconds. */
const makeRateLimiter = (max, windowMs) => {
    let count = 0;
    let resetAt = Date.now() + windowMs;
    return () => {
        const now = Date.now();
        if (now > resetAt) { count = 0; resetAt = now + windowMs; }
        count += 1;
        return count <= max;
    };
};

const registerChatHandlers = (io, socket, onlineUsers) => {
    const { userId } = socket;
    const allowMessage = makeRateLimiter(20, 10000);
    const typingTimers = new Map();

    /* ---------- Join a conversation room ---------- */
    socket.on('conversation:join', async ({ conversationId }, ack) => {
        try {
            // Authorisation on every join — a client could send any id.
            await chatServices.assertParticipant(conversationId, userId);
            socket.join(`conversation:${conversationId}`);
            ack?.({ success: true });
        } catch (err) {
            ack?.({ success: false, message: err.message });
        }
    });

    socket.on('conversation:leave', ({ conversationId }) => {
        socket.leave(`conversation:${conversationId}`);
    });

    /* ---------- Send a message ---------- */
    socket.on('message:send', async (payload, ack) => {
        try {
            if (!allowMessage()) {
                return ack?.({ success: false, message: 'You are sending messages too quickly.' });
            }

            const { conversationId, text, type = 'text', attachments, meta, clientId } = payload || {};

            // Persist FIRST. Only a saved message may be reported as sent.
            const { message, conversation } = await chatServices.sendMessage({
                conversationId,
                senderId: userId,          // from the socket, never from the payload
                text, type, attachments, meta,
            });

            const wire = chatServices.toWireMessage(message, userId);

            // Acknowledge to the sender with the server id, so the client can
            // reconcile its optimistic bubble via clientId.
            ack?.({ success: true, message: wire, clientId });

            // Fan out to everyone in the room except the sender.
            socket.to(`conversation:${conversationId}`).emit('message:new', {
                conversationId,
                message: chatServices.toWireMessage(message, null),
            });

            // Push an inbox-list update to every participant's personal room,
            // so a user with the Messages page closed still sees the badge move.
            conversation.participants.forEach((pid) => {
                io.to(`user:${pid}`).emit('conversation:updated', {
                    conversationId,
                    lastMessage: conversation.lastMessage,
                    unreadCount: conversation.unreadCounts.get(String(pid)) || 0,
                });
            });
        } catch (err) {
            ack?.({ success: false, message: err.message });
        }
    });

    /* ---------- Typing indicator ---------- */
    socket.on('typing:start', async ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:start', {
            conversationId, userId, name: socket.user.name,
        });

        // Auto-stop after 3s. Without this, a user who types and then closes
        // the tab leaves a permanent "typing…" for the other side.
        clearTimeout(typingTimers.get(conversationId));
        typingTimers.set(conversationId, setTimeout(() => {
            socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId });
        }, 3000));
    });

    socket.on('typing:stop', ({ conversationId }) => {
        clearTimeout(typingTimers.get(conversationId));
        socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId });
    });

    /* ---------- Read receipts ---------- */
    socket.on('message:read', async ({ conversationId }, ack) => {
        try {
            await chatServices.markConversationRead(conversationId, userId);
            socket.to(`conversation:${conversationId}`).emit('message:read', {
                conversationId, readBy: userId, readAt: new Date(),
            });
            io.to(`user:${userId}`).emit('conversation:updated', { conversationId, unreadCount: 0 });
            ack?.({ success: true });
        } catch (err) {
            ack?.({ success: false, message: err.message });
        }
    });

    /* ---------- Presence query ---------- */
    socket.on('presence:check', ({ userIds = [] }, ack) => {
        const statuses = {};
        userIds.forEach((id) => { statuses[id] = onlineUsers.has(String(id)); });
        ack?.({ success: true, statuses });
    });

    socket.on('disconnect', () => {
        typingTimers.forEach((t) => clearTimeout(t));
        typingTimers.clear();
    });
};

module.exports = registerChatHandlers;
```

---

## ⚡ Step 4: Chat Service (`src/services/chatServices.js`)

```javascript
const mongoose = require('mongoose');
const Conversation = require('../model/conversation');
const Message = require('../model/message');
const Listing = require('../model/listing');
const AppError = require('../util/AppError');

class ChatServices {

    /** Throws unless the user is a participant. Called on every socket join. */
    async assertParticipant(conversationId, userId) {
        if (!mongoose.isValidObjectId(conversationId)) {
            throw AppError.badRequest('Invalid conversation id.');
        }
        const convo = await Conversation.findById(conversationId);
        if (!convo) throw AppError.notFound('Conversation not found.');
        if (!convo.participants.some((p) => p.toString() === String(userId))) {
            throw AppError.forbidden('You are not a participant in this conversation.');
        }
        return convo;
    }

    /**
     * Find-or-create a thread. Idempotent via the unique pairKey, so two
     * simultaneous "Message Seller" clicks cannot produce duplicate threads.
     */
    async getOrCreateConversation(userId, otherUserId, listingId = null) {
        if (String(userId) === String(otherUserId)) {
            throw AppError.badRequest('You cannot start a conversation with yourself.');
        }

        const pairKey = Conversation.buildPairKey(userId, otherUserId, listingId);

        let convo = await Conversation.findOne({ pairKey });
        if (convo) return convo;

        try {
            convo = await Conversation.create({
                participants: [userId, otherUserId],
                pairKey,
                listing: listingId || null,
                unreadCounts: new Map([[String(userId), 0], [String(otherUserId), 0]]),
            });

            // Seed the thread with context so the recipient knows why they were
            // contacted — a cold "Hi" with no reference converts badly.
            if (listingId) {
                const listing = await Listing.findById(listingId).select('title');
                if (listing) {
                    await Message.create({
                        conversation: convo._id,
                        sender: userId,
                        type: 'system',
                        text: `Conversation started about "${listing.title}".`,
                        meta: { listingId },
                    });
                }
            }
            return convo;
        } catch (err) {
            // Duplicate key = another request won the race. Return theirs.
            if (err.code === 11000) return Conversation.findOne({ pairKey });
            throw err;
        }
    }

    /** The inbox list for MessagesPage's left column. */
    async getConversations(userId, { page = 1, limit = 30, archived = false } = {}) {
        const query = {
            participants: userId,
            ...(archived ? { archivedBy: userId } : { archivedBy: { $ne: userId } }),
        };

        const convos = await Conversation.find(query)
            .populate('participants', 'name businessName avatarUrl')
            .populate('listing', 'title category')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(Math.min(Number(limit), 50))
            .lean();

        // Reshape to what the UI expects: "the other person", not an array.
        return convos.map((c) => {
            const other = c.participants.find((p) => p._id.toString() !== String(userId));
            return {
                id: c._id,
                name: other?.name || other?.businessName || 'Unknown business',
                otherUserId: other?._id,
                avatarUrl: other?.avatarUrl || null,
                listing: c.listing ? { id: c.listing._id, title: c.listing.title } : null,
                snippet: c.lastMessage?.text?.slice(0, 60) || 'No messages yet',
                time: c.lastMessage?.sentAt || c.createdAt,
                unreadCount: c.unreadCounts?.[String(userId)] || 0,
                isMuted: (c.mutedBy || []).some((id) => id.toString() === String(userId)),
            };
        });
    }

    /**
     * Paginated history, newest-first (then reversed for display).
     * Cursor pagination via `before` — offset pagination breaks when new
     * messages arrive mid-scroll and shift every page boundary.
     */
    async getMessages(conversationId, userId, { limit = 50, before } = {}) {
        await this.assertParticipant(conversationId, userId);

        const query = { conversation: conversationId };
        if (before) query.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(query)
            .populate('sender', 'name avatarUrl')
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit), 100))
            .lean();

        return {
            messages: messages.reverse().map((m) => this.toWireMessage(m, userId)),
            hasMore: messages.length === Number(limit),
            oldestAt: messages[0]?.createdAt || null,
        };
    }

    /** Persist a message and update the conversation's denormalised state. */
    async sendMessage({ conversationId, senderId, text, type = 'text', attachments = [], meta = null }) {
        const convo = await this.assertParticipant(conversationId, senderId);

        if (convo.isBlocked) {
            throw AppError.forbidden('This conversation is blocked.');
        }
        if (type === 'text' && !text?.trim()) {
            throw AppError.badRequest('Message cannot be empty.');
        }
        if (text && text.length > 5000) {
            throw AppError.badRequest('Message is too long (max 5000 characters).');
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: senderId,
            text: text?.trim() || '',
            type,
            attachments,
            meta,
            // Sender has trivially read their own message.
            readBy: [{ user: senderId, readAt: new Date() }],
            deliveredAt: new Date(),
        });

        // Increment unread for everyone except the sender, atomically.
        const inc = {};
        convo.participants.forEach((p) => {
            if (p.toString() !== String(senderId)) inc[`unreadCounts.${p.toString()}`] = 1;
        });

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            {
                $set: {
                    lastMessage: {
                        text: type === 'text' ? text.trim().slice(0, 200) : `[${type}]`,
                        sender: senderId,
                        sentAt: message.createdAt,
                        type,
                    },
                    // A new message un-archives the thread for both sides.
                    archivedBy: [],
                },
                $inc: inc,
            },
            { new: true }
        );

        await message.populate('sender', 'name avatarUrl');
        return { message, conversation: updated };
    }

    async markConversationRead(conversationId, userId) {
        await this.assertParticipant(conversationId, userId);

        await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCounts.${userId}`]: 0 },
        });

        // Stamp receipts on messages this user hadn't read yet.
        await Message.updateMany(
            { conversation: conversationId, 'readBy.user': { $ne: userId } },
            { $push: { readBy: { user: userId, readAt: new Date() } } }
        );

        return { message: 'Conversation marked as read.' };
    }

    /** Badge count for the Topnav across all threads. */
    async getTotalUnread(userId) {
        const convos = await Conversation.find({ participants: userId }).select('unreadCounts').lean();
        return convos.reduce((sum, c) => sum + (c.unreadCounts?.[String(userId)] || 0), 0);
    }

    async setArchived(conversationId, userId, archived) {
        await this.assertParticipant(conversationId, userId);
        await Conversation.findByIdAndUpdate(conversationId,
            archived ? { $addToSet: { archivedBy: userId } } : { $pull: { archivedBy: userId } });
        return { message: archived ? 'Conversation archived.' : 'Conversation restored.' };
    }

    /**
     * Shapes a message into what MessagesPage.jsx renders:
     * { id, sender: 'me'|'them', text, time, status }.
     * Keeping this mapping server-side means one place to change if the UI does.
     */
    toWireMessage(msg, viewerId) {
        const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
        const isMine = viewerId && senderId === String(viewerId);
        return {
            id: msg._id,
            senderId,
            senderName: msg.sender?.name || null,
            sender: isMine ? 'me' : 'them',
            text: msg.isDeleted ? 'This message was removed' : msg.text,
            type: msg.type,
            attachments: msg.attachments || [],
            meta: msg.meta || null,
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: msg.createdAt,
            status: isMine
                ? ((msg.readBy || []).length > 1 ? 'Read' : 'Sent')
                : 'Received',
            isDeleted: !!msg.isDeleted,
            isEdited: !!msg.isEdited,
        };
    }
}

module.exports = new ChatServices();
```

---

## 🛣️ Step 5: REST Routes (`src/routes/chatRoutes.js`)

History and inbox over REST; live delivery over sockets.

```javascript
const express = require('express');
const router = express.Router();

const ChatController = require('../controller/chatController');
const { authenticate, requireVerifiedEmail } = require('../middleware/auth');

router.use(authenticate, requireVerifiedEmail);

router.get('/conversations', ChatController.listConversations);
router.post('/conversations', ChatController.startConversation);   // { otherUserId, listingId }
router.get('/conversations/:id/messages', ChatController.getMessages);
router.post('/conversations/:id/messages', ChatController.sendMessage);  // REST fallback
router.patch('/conversations/:id/read', ChatController.markRead);
router.patch('/conversations/:id/archive', ChatController.archive);
router.get('/unread-count', ChatController.unreadCount);

module.exports = router;
```

`src/controller/chatController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const chatServices = require('../services/chatServices');
const { getIo } = require('../config/socket');

class ChatController {
    listConversations = asyncHandler(async (req, res) => {
        const conversations = await chatServices.getConversations(req.user._id, req.query);
        res.status(200).json({ success: true, conversations });
    });

    startConversation = asyncHandler(async (req, res) => {
        const convo = await chatServices.getOrCreateConversation(
            req.user._id, req.body.otherUserId, req.body.listingId
        );
        res.status(201).json({ success: true, conversationId: convo._id });
    });

    getMessages = asyncHandler(async (req, res) => {
        const result = await chatServices.getMessages(req.params.id, req.user._id, req.query);
        res.status(200).json({ success: true, ...result });
    });

    /**
     * REST send — a fallback for when the socket is down. It emits the same
     * events so socket-connected clients stay in sync either way.
     */
    sendMessage = asyncHandler(async (req, res) => {
        const { message, conversation } = await chatServices.sendMessage({
            conversationId: req.params.id,
            senderId: req.user._id,
            ...req.body,
        });

        const io = getIo();
        io.to(`conversation:${req.params.id}`).emit('message:new', {
            conversationId: req.params.id,
            message: chatServices.toWireMessage(message, null),
        });
        conversation.participants.forEach((pid) => {
            io.to(`user:${pid}`).emit('conversation:updated', {
                conversationId: req.params.id,
                lastMessage: conversation.lastMessage,
            });
        });

        res.status(201).json({
            success: true,
            message: chatServices.toWireMessage(message, req.user._id),
        });
    });

    markRead = asyncHandler(async (req, res) => {
        const result = await chatServices.markConversationRead(req.params.id, req.user._id);
        res.status(200).json({ success: true, ...result });
    });

    archive = asyncHandler(async (req, res) => {
        const result = await chatServices.setArchived(req.params.id, req.user._id, !!req.body.archived);
        res.status(200).json({ success: true, ...result });
    });

    unreadCount = asyncHandler(async (req, res) => {
        const count = await chatServices.getTotalUnread(req.user._id);
        res.status(200).json({ success: true, count });
    });
}
module.exports = new ChatController();
```

---

## 🖥️ Step 6: Frontend Integration

### 6a. Install

```bash
cd frontend
npm install socket.io-client
```

### 6b. Socket singleton — `frontend/src/lib/socket.js`

```javascript
import { io } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * One shared socket for the whole app. Creating a socket per component leaks
 * connections and produces duplicate message events.
 */
export const getSocket = () => {
  if (socket?.connected || socket?.connecting) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getToken() },      // read lazily so a fresh login is picked up
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect_error', (err) => {
    // An auth failure is terminal — retrying with the same bad token is futile.
    if (err.message?.startsWith('UNAUTHORIZED')) {
      console.warn('Socket auth failed:', err.message);
      socket.disconnect();
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
```

Call `disconnectSocket()` inside `logout()` in `lib/api.js` — otherwise the previous user's socket
keeps receiving their messages after a user switch on a shared device.

### 6c. Rewrite `MessagesPage.jsx`

```javascript
import { getSocket } from '../../lib/socket';
import { apiGetConversations, apiGetMessages, apiMarkRead } from '../../lib/api';

const [conversations, setConversations] = useState([]);
const [messages, setMessages] = useState([]);
const [activeConvId, setActiveConvId] = useState(null);
const [typingUser, setTypingUser] = useState(null);
const [onlineMap, setOnlineMap] = useState({});
const socketRef = useRef(null);

/* ---- 1. Load the inbox ---- */
useEffect(() => {
  apiGetConversations()
    .then((d) => {
      setConversations(d.conversations);
      if (d.conversations.length && !activeConvId) setActiveConvId(d.conversations[0].id);
    })
    .catch((e) => triggerToast(e.message, 'error'));
}, []);

/* ---- 2. Wire the socket ONCE ---- */
useEffect(() => {
  const socket = getSocket();
  socketRef.current = socket;

  const onNew = ({ conversationId, message }) => {
    // Only append to the open thread; otherwise just bump the list.
    setMessages((prev) =>
      conversationId === activeConvId ? [...prev, { ...message, sender: 'them' }] : prev);
    setConversations((prev) => prev.map((c) =>
      c.id === conversationId
        ? { ...c, snippet: message.text.slice(0, 60), time: message.createdAt,
            unreadCount: conversationId === activeConvId ? 0 : (c.unreadCount || 0) + 1 }
        : c));
  };

  const onTypingStart = ({ conversationId, name }) => {
    if (conversationId === activeConvId) setTypingUser(name);
  };
  const onTypingStop = () => setTypingUser(null);
  const onOnline  = ({ userId }) => setOnlineMap((m) => ({ ...m, [userId]: true }));
  const onOffline = ({ userId }) => setOnlineMap((m) => ({ ...m, [userId]: false }));

  socket.on('message:new', onNew);
  socket.on('typing:start', onTypingStart);
  socket.on('typing:stop', onTypingStop);
  socket.on('presence:online', onOnline);
  socket.on('presence:offline', onOffline);

  // Always remove listeners on cleanup, or every remount doubles the handlers
  // and messages appear two, three, four times.
  return () => {
    socket.off('message:new', onNew);
    socket.off('typing:start', onTypingStart);
    socket.off('typing:stop', onTypingStop);
    socket.off('presence:online', onOnline);
    socket.off('presence:offline', onOffline);
  };
}, [activeConvId]);

/* ---- 3. Join room + load history when the thread changes ---- */
useEffect(() => {
  if (!activeConvId) return;
  const socket = socketRef.current;

  socket.emit('conversation:join', { conversationId: activeConvId });
  apiGetMessages(activeConvId)
    .then((d) => setMessages(d.messages))
    .catch((e) => triggerToast(e.message, 'error'));

  socket.emit('message:read', { conversationId: activeConvId });
  setConversations((prev) => prev.map((c) =>
    c.id === activeConvId ? { ...c, unreadCount: 0 } : c));

  return () => socket.emit('conversation:leave', { conversationId: activeConvId });
}, [activeConvId]);

/* ---- 4. Send, with an optimistic bubble ---- */
const handleSendMessage = (e) => {
  e.preventDefault();
  const text = typedMessage.trim();
  if (!text || !activeConvId) return;

  const clientId = `tmp_${Date.now()}`;
  // Show it immediately — waiting for the round trip feels broken.
  setMessages((prev) => [...prev, {
    id: clientId, sender: 'me', text, status: 'Sending',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  setTypedMessage('');

  socketRef.current.emit('message:send',
    { conversationId: activeConvId, text, clientId },
    (res) => {
      if (res?.success) {
        // Swap the temporary bubble for the server's canonical message.
        setMessages((prev) => prev.map((m) =>
          m.id === clientId ? { ...res.message, sender: 'me' } : m));
      } else {
        setMessages((prev) => prev.map((m) =>
          m.id === clientId ? { ...m, status: 'Failed' } : m));
        triggerToast(res?.message || 'Message failed to send.', 'error');
      }
    });
};

/* ---- 5. Typing indicator (throttled) ---- */
const typingSentRef = useRef(0);
const handleTyping = (value) => {
  setTypedMessage(value);
  const now = Date.now();
  if (now - typingSentRef.current > 1500) {     // don't emit per keystroke
    typingSentRef.current = now;
    socketRef.current?.emit('typing:start', { conversationId: activeConvId });
  }
};
```

Delete the `setTimeout` fake-reply block entirely. Also render:
- a **"Failed — retry"** affordance on `status: 'Failed'` bubbles,
- the `typingUser` indicator above the input,
- an online dot from `onlineMap[conv.otherUserId]`,
- an **empty state** for zero conversations (the UI currently assumes seven exist).

### 6d. Entry points into chat

`MarketplacePage.jsx` has a "Message Seller" button that currently just navigates:

```javascript
// CURRENT
onClick={() => { closeProduct(); setCurrentPage('messages'); }}

// FIXED — create/find the thread, then open it
onClick={async () => {
  try {
    const { conversationId } = await apiStartConversation({
      otherUserId: selectedProduct.owner._id,
      listingId: selectedProduct._id,
    });
    closeProduct();
    setCurrentPage('messages');           // pass conversationId via state/query
  } catch (e) { triggerToast(e.message, 'error'); }
}}
```

---

## 🧪 Step 7: Test

```bash
# Quick socket smoke test
node -e "
const io = require('socket.io-client');
const s = io('http://localhost:5000', { auth: { token: process.env.TOKEN } });
s.on('connect', () => console.log('connected', s.id));
s.on('connect_error', (e) => console.log('error:', e.message));
"
```

Checklist:
- [ ] No token → `connect_error: UNAUTHORIZED`
- [ ] Expired token → `connect_error`, and the client stops retrying
- [ ] Two browsers, two accounts: a message appears on the other side in under 200 ms
- [ ] Message survives a page refresh (it was persisted, not just emitted)
- [ ] `conversation:join` with someone else's conversation id → `{ success: false }`
- [ ] Unread count increments for the recipient and resets when they open the thread
- [ ] Typing indicator appears, then clears itself after ~3 s of inactivity
- [ ] Killing the network and restoring it reconnects automatically
- [ ] Two tabs of the same user both receive messages; closing one does **not** mark them offline
- [ ] 25 messages in 10 s → rate-limited with a clear message
- [ ] Empty message → rejected
- [ ] A 6000-character message → rejected
- [ ] Duplicate `POST /chat/conversations` for the same pair+listing returns the **same** id
- [ ] Log out and log in as another user: no messages from the previous session leak through

---

## 📈 Scaling Note (read before deploying more than one instance)

`onlineUsers` and Socket.IO rooms live in **process memory**. With two instances behind a load
balancer, a user on instance A cannot receive an event emitted on instance B. Fix with the Redis
adapter:

```bash
npm install @socket.io/redis-adapter redis
```

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

You will also need **sticky sessions** on the load balancer for the polling transport. Single
instance is fine for the pilot — just don't scale horizontally without this.

---

## 🔒 Security Summary

1. **Authenticate in the handshake**, once, before any handler runs. An unauthenticated socket never
   receives an event.
2. **`socket.userId` is the only identity source.** Never read a `senderId` or `userId` from an event
   payload — that is spoofing by design.
3. **Re-authorise on every `conversation:join`.** Room membership is the access-control boundary;
   ids in a payload are attacker-controlled.
4. **Rate limit per socket** (20 msg / 10 s) on top of the REST limiter. Sockets bypass Express
   middleware entirely, so they need their own limit.
5. **`maxHttpBufferSize: 1 MB`.** Files go through the REST upload route (guide `08`); an unbounded
   socket payload is a memory-exhaustion vector.
6. **`maxlength: 5000` on message text.** Enforced in the schema *and* the service.
7. **Persist before emitting.** A message reported as delivered must exist in the database.
8. **Escape on render.** React escapes by default — never introduce `dangerouslySetInnerHTML` for
   message text. Chat is the most likely XSS entry point in the whole product.
9. **Soft-delete messages.** In a B2B dispute, the thread is evidence. Show "message removed",
   keep the row.
10. **Rejected tokens must not retry forever.** The client disconnects on `UNAUTHORIZED` rather than
    hammering the server with a dead token.

---

## 💼 CEO Review Notes

- **Chat is where deals are won, and it is our only record of what was agreed.** Message retention
  is therefore a business requirement, not a technical detail. Never hard-delete. When two
  businesses dispute a 500 kg delivery, this thread is the evidence, and being able to produce it is
  a genuine reason to trust us over a WhatsApp group.
- **Our real competitor here is WhatsApp**, and we will not beat it on chat quality. We beat it on
  *context*: the listing, the quantity, the agreed pickup slot, and the deal status all live in the
  thread. That is why `type: 'system'` and `pickup_proposal` messages matter more than typing
  indicators. Prioritise structured in-thread actions ("Propose Pickup", "Accept Quantity") over
  chat polish.
- **Expect users to move to WhatsApp anyway, and instrument it.** If a phone number appears in the
  first three messages of most threads, that is not a failure to punish — it is a signal we should
  offer WhatsApp handoff *and* keep the structured record. Fighting user behaviour loses; capturing
  it wins.
- **Email fallback for offline recipients is required, not optional.** A message that sits unread
  for two days because the recipient wasn't logged in is a lost deal. Wire chat into the
  notification system (guide `11`) with a digest: "You have 3 unread messages about your Coffee
  Grounds listing."
- **Response time is a marketplace health metric.** `ProfilePage` already displays "Avg. Response" —
  make it real, show it publicly, and it becomes a self-enforcing quality standard. Buyers will
  favour fast responders, and sellers will notice.
- **Do not build group chat, voice notes, or video calls.** Zero of those move a deal forward at our
  stage. The one addition worth considering is file sharing in-thread (a spec sheet, a lab report),
  which reuses guide `08` and does real work.
- **Budget reality:** a single instance with the in-memory adapter handles a few thousand concurrent
  sockets comfortably. We will not need Redis for the Pune pilot. Write the code so adding it later
  is one config change — which the guide does — and then don't spend money on it yet.
