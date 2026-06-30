// server.js - Chatchi Server: Secure, Fast, and Personalized (SPA Architecture - Fixed Routing)
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const cors = require('cors');
const nodemailer = require('nodemailer');
const geoip = require('geoip-lite'); // مكتبة تحديد المواقع

const app = express();
app.use(cors());

// ==========================================
// 1. السماح بقراءة الملفات الثابتة من مجلد public
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ==========================================
// 2. واجهة برمجة التطبيقات (API)
// ==========================================
app.get('/api/app-version', (req, res) => {
    res.json({
        latestVersion: "1.0.0",
        forceUpdate: true,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.takachi.chatchiandroid"
    });
});

// ==========================================
// 3. نظام توجيه الصفحة الواحدة (SPA Routing)
// ==========================================
// توجيه المسارات الأساسية مباشرة لملف index.html لتجنب أخطاء path-to-regexp في خوادم Render
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = http.createServer(app);

// ==========================================
// 4. إعدادات Socket.io
// ==========================================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 15000,
  pingInterval: 10000,
  perMessageDeflate: false
});

const PORT = process.env.PORT || 3000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const forbiddenWords = [
    'زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'كس',
    'fack', 'زك','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' , 'nik', 'zbi' ,
    '9hba','no9ch','sowa' ,'3atay','zwayz','zamal' ,'nhatchoun'
];

function filterAndSanitize(text) {
    if (typeof text !== 'string') return '';
    let sanitized = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    forbiddenWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        sanitized = sanitized.replace(regex, '*'.repeat(word.length));
    });
    return sanitized;
}

// ==========================================
// نظام تحويل كود الدولة إلى علم إيموجي
// ==========================================
function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

const messageLimiter = new Map();
const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_PERIOD = 60 * 1000;
const roomMessages = new Map();
const messageHistory = new Map();
const waitingUsers = new Map();
const activeRooms = new Map();

// 🛑 دالة للحذف من كل قوائم الانتظار 🛑
function removeUserFromAllQueues(socketId) {
    for (const [tag, queue] of waitingUsers.entries()) {
        const index = queue.indexOf(socketId);
        if (index > -1) {
            queue.splice(index, 1);
        }
    }
}

io.on('connection', (socket) => {
    io.emit('updateOnlineUsers', io.engine.clientsCount);

    // جلب الـ IP وتحويله إلى علم
    let clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.split('::ffff:')[1];
    }
    const geo = geoip.lookup(clientIp);
    const countryCode = geo ? geo.country : null;
    socket.flag = getFlagEmoji(countryCode);

    // --- منطق البحث (Multi-Tag) ---
    socket.on('findPartner', (tags) => {
        const searchTags = Array.isArray(tags)
            ? tags.map(t => typeof t === 'string' ? t.toLowerCase().trim() : t).filter(t => t !== "")
            : [];

        let partnerSocketId = null;
        let matchedTag = null;

        for (const tag of searchTags) {
            const queue = waitingUsers.get(tag);
            if (queue && queue.length > 0) {
                const index = queue.findIndex(id => id !== socket.id && io.sockets.sockets.get(id));
                if (index !== -1) {
                    partnerSocketId = queue[index];
                    matchedTag = tag;
                    break;
                }
            }
        }

        if (!partnerSocketId) {
            for (const [tag, queue] of waitingUsers.entries()) {
                const index = queue.findIndex(id => id !== socket.id && io.sockets.sockets.get(id));
                if (index !== -1) {
                    partnerSocketId = queue[index];
                    matchedTag = null;
                    break;
                }
            }
        }

        if (partnerSocketId) {
            removeUserFromAllQueues(socket.id);
            removeUserFromAllQueues(partnerSocketId);

            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            const room = `room-${socket.id}-${partnerSocketId}`;

            partnerSocket.join(room);
            socket.join(room);

            activeRooms.set(socket.id, room);
            activeRooms.set(partnerSocketId, room);

            io.to(socket.id).emit('matchFound', { room: room, matchedTag: matchedTag, partnerFlag: partnerSocket.flag });
            io.to(partnerSocketId).emit('matchFound', { room: room, matchedTag: matchedTag, partnerFlag: socket.flag });
        } else {
            if (searchTags.length > 0) {
                for (const tag of searchTags) {
                    if (!waitingUsers.has(tag)) waitingUsers.set(tag, []);
                    const queue = waitingUsers.get(tag);
                    if (!queue.includes(socket.id)) queue.push(socket.id);
                }
            } else {
                if (!waitingUsers.has('#random')) waitingUsers.set('#random', []);
                const queue = waitingUsers.get('#random');
                if (!queue.includes(socket.id)) queue.push(socket.id);
            }
            socket.emit('waitingForPartner');
        }
    });

    socket.on('chatMessage', (data) => {
        if (!data.message || !data.room) return;
        if (activeRooms.get(socket.id) !== data.room) return;

        const cleanMessage = filterAndSanitize(data.message);
        if (!cleanMessage) return;

        const lastMessage = messageHistory.get(socket.id);
        if (cleanMessage === lastMessage) {
            socket.emit('spamWarning', 'duplicate');
            return;
        }

        const now = Date.now();
        const userTimestamps = messageLimiter.get(socket.id) || [];

        if (userTimestamps.length > 0 && (now - userTimestamps[userTimestamps.length - 1] < 500)) {
            socket.emit('spamWarning', 'fast');
            return;
        }

        if (!roomMessages.has(data.room)) roomMessages.set(data.room, []);
        const msgs = roomMessages.get(data.room);
        msgs.push({ senderId: socket.id, message: cleanMessage, timestamp: Date.now() });

        if (msgs.length > 20) msgs.shift();

        const recentTimestamps = userTimestamps.filter(t => now - t < MESSAGE_RATE_PERIOD);
        if (recentTimestamps.length >= MESSAGE_RATE_LIMIT) return;

        recentTimestamps.push(now);
        messageLimiter.set(socket.id, recentTimestamps);

        messageHistory.set(socket.id, cleanMessage);

        socket.to(data.room).emit('chatMessage', cleanMessage);
    });

    socket.on('requestSync', () => {
        const room = activeRooms.get(socket.id);
        if (room && roomMessages.has(room)) {
            const allMessages = roomMessages.get(room);
            const missedMessages = allMessages.filter(m => m.senderId !== socket.id);
            socket.emit('syncMessages', missedMessages);
        }
    });

    socket.on('userTyping', (data) => socket.to(data.room).emit('partnerTyping'));
    socket.on('userStoppedTyping', (data) => socket.to(data.room).emit('partnerStoppedTyping'));

    socket.on('leaveRoom', (room) => {
        socket.leave(room);
        socket.to(room).emit('partnerLeft', { reason: 'manual_leave' });
        activeRooms.delete(socket.id);
        roomMessages.delete(room);
    });

    socket.on('cancelSearch', () => {
        removeUserFromAllQueues(socket.id);
    });

    socket.on('updateAppState', (data) => {
        const room = activeRooms.get(socket.id);
        if (room) socket.to(room).emit('partnerAppStateChanged', data.state);
    });

    socket.on('submitSuggestion', (suggestion) => {
        const sanitized = suggestion.replace(/\s+/g, ' ').trim();
        if (sanitized && sanitized.length < 500) {
            const mailOptions = {
                from: `"Chatchi Feedback" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: '🚀 اقتراح جديد من Chatchi',
                text: `يا تاكاشي، وصلك اقتراح جديد:\n\n"${sanitized}"\n\nالوقت: ${new Date().toLocaleString('ar-DZ')}`
            };
            transporter.sendMail(mailOptions, (err) => { if (err) console.error('Email Error:', err); });
        }
    });

    socket.on('disconnect', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room).emit('partnerLeft', { reason: 'sudden_disconnect' });
            roomMessages.delete(room);
        }
        activeRooms.delete(socket.id);

        removeUserFromAllQueues(socket.id);

        messageLimiter.delete(socket.id);
        messageHistory.delete(socket.id);
        io.emit('updateOnlineUsers', io.engine.clientsCount);
    });
});

server.listen(PORT, () => {
    console.log(`Chatchi Server is live on port ${PORT}`);
});