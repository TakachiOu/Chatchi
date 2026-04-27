// server.js - Chatchi Server: Secure, Fast, and Personalized
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const cors = require('cors');
const nodemailer = require('nodemailer'); 

const app = express();
app.use(cors());

// ==========================================
// 1. السماح بقراءة الملفات الثابتة (CSS / JS / Images / SEO)
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets'))); 

// ==========================================
// 2. الروابط الاحترافية النظيفة (Clean URLs)
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat', 'chat.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy', 'privacy.html'));
});

// ==========================================
// 3. نظام الإجبار على التحديث (Force Update)
// ==========================================
app.get('/api/app-version', (req, res) => {
    res.json({
        latestVersion: "1.0.0", 
        forceUpdate: true, 
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.chatchi.app" 
    });
});

const server = http.createServer(app);

// ==========================================
// 4. إعدادات Socket.io (محسنة للسرعة القصوى)
// ==========================================
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  pingTimeout: 15000,  
  pingInterval: 10000, 
  perMessageDeflate: false 
});

const PORT = process.env.PORT || 3000;

// --- إعداد Nodemailer ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

// --- إعدادات الفلترة والحماية ---
const forbiddenWords = [
    'زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'موجب', 'سالب', 'كس', 
    'dick', 'fack', 'زك', 'ديوث','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' , 'nik', 'zbi' , 
    '9hba','no9ch','sowa' ,'3atay' ,'bzoul' ,'zwayz','gay' ,'dyouth', 'zamal' ,'nhatchoun'
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

// قواعد البيانات المؤقتة السريعة (RAM Cache)
const messageLimiter = new Map();
const MESSAGE_RATE_LIMIT = 20; 
const MESSAGE_RATE_PERIOD = 60 * 1000; 
const roomMessages = new Map(); 
const messageHistory = new Map(); 
const waitingUsers = new Map();  
const activeRooms = new Map();   

// --- Main Connection Handler ---
io.on('connection', (socket) => {
    io.emit('updateOnlineUsers', io.engine.clientsCount);

    // --- منطق البحث عن شريك (Ultra-Fast Matching System) ---
    socket.on('findPartner', (tags) => {
        const searchTags = Array.isArray(tags) 
            ? tags.map(t => typeof t === 'string' ? t.toLowerCase().trim() : t).filter(t => t !== "")
            : [];
            
        let partnerSocketId = null;
        let matchedTag = null;

        // 1. المطابقة الدقيقة الفورية (O(1) Time Complexity)
        for (const tag of searchTags) {
            const queue = waitingUsers.get(tag);
            if (queue && queue.length > 0) {
                const index = queue.findIndex(id => id !== socket.id && io.sockets.sockets.get(id));
                if (index !== -1) {
                    partnerSocketId = queue[index];
                    matchedTag = tag;
                    queue.splice(index, 1); // سحب فوري من الطابور
                    break;
                }
            }
        }

        // 2. المطابقة العشوائية الفورية (Fallback)
        if (!partnerSocketId) {
            for (const [tag, queue] of waitingUsers.entries()) {
                const index = queue.findIndex(id => id !== socket.id && io.sockets.sockets.get(id));
                if (index !== -1) {
                    partnerSocketId = queue[index];
                    matchedTag = null; 
                    queue.splice(index, 1); // سحب فوري من الطابور
                    break;
                }
            }
        }

        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            const room = `room-${socket.id}-${partnerSocketId}`;
            
            partnerSocket.join(room);
            socket.join(room);

            activeRooms.set(socket.id, room);
            activeRooms.set(partnerSocketId, room);

            // إرسال الإشعار للطرفين في نفس اللحظة بالضبط
            io.to(socket.id).emit('matchFound', { room: room, matchedTag: matchedTag });
            io.to(partnerSocketId).emit('matchFound', { room: room, matchedTag: matchedTag });
        } else {
            // تسجيل الدخول في الطابور بسرعة
            const waitTag = searchTags.length > 0 ? searchTags[0] : '#random';
            if (!waitingUsers.has(waitTag)) waitingUsers.set(waitTag, []);
            const queue = waitingUsers.get(waitTag);
            if (!queue.includes(socket.id)) queue.push(socket.id);
            
            socket.emit('waitingForPartner');
        }
    });

    // --- منطق الرسائل ---
    socket.on('chatMessage', (data) => {
        if (!data.message || !data.room) return;
        if (activeRooms.get(socket.id) !== data.room) return;

        const cleanMessage = filterAndSanitize(data.message);
        if (!cleanMessage) return;

        if (!roomMessages.has(data.room)) roomMessages.set(data.room, []);
        const msgs = roomMessages.get(data.room);
        msgs.push({ senderId: socket.id, message: cleanMessage, timestamp: Date.now() });
        
        if (msgs.length > 20) msgs.shift(); 

        const history = messageHistory.get(socket.id) || [];
        if (cleanMessage === history[0] && cleanMessage === history[1]) return;

        const now = Date.now();
        const userTimestamps = messageLimiter.get(socket.id) || [];
        const recentTimestamps = userTimestamps.filter(t => now - t < MESSAGE_RATE_PERIOD);
        
        if (recentTimestamps.length >= MESSAGE_RATE_LIMIT) return;

        recentTimestamps.push(now);
        messageLimiter.set(socket.id, recentTimestamps);
        messageHistory.set(socket.id, [cleanMessage, ...history].slice(0, 2));

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
        for (const queue of waitingUsers.values()) {
            const index = queue.indexOf(socket.id);
            if (index > -1) queue.splice(index, 1);
        }
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

        for (const queue of waitingUsers.values()) {
            const index = queue.indexOf(socket.id);
            if (index > -1) queue.splice(index, 1);
        }
        
        messageLimiter.delete(socket.id);
        messageHistory.delete(socket.id);
        io.emit('updateOnlineUsers', io.engine.clientsCount);
    });
});

server.listen(PORT, () => {
    console.log(`Chatchi Server is live on port ${PORT}`);
});