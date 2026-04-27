// --- public/chat/chat.js ---

document.addEventListener('DOMContentLoaded', () => {

    // 1. الاتصال والمحددات
    const socket = io("https://chatchi.onrender.com", {
        transports: ['websocket'], 
        upgrade: false
    });

    const DOM = {
        chatStatus: document.querySelector('.chat-status'),
        messagesArea: document.querySelector('.messages-area'),
        inputField: document.getElementById('chat-input-field'),
        sendButton: document.getElementById('send-button'),
        skipButton: document.getElementById('skip-button'), // إضافة زر التخطي
        leaveHomeButton: document.getElementById('leave-home-button'), // تعديل زر الخروج ليطابق الهيدر
        confirmModal: document.getElementById('confirm-modal'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        emojiButton: document.getElementById('emoji-button'),
        emojiContainer: document.getElementById('emoji-picker-container'),
        emojiPicker: document.querySelector('emoji-picker')
    };

    const searchTags = JSON.parse(sessionStorage.getItem('chatchi_tags') || '[]');
    let currentLang = sessionStorage.getItem('chatchi_lang') || 'ar';
    
    let currentRoom = '';
    let typingTimer;
    const typingTimeout = 1500;
    let dotAnimationInterval;
    let autoRematchTimer;

    // متغيرات نظام الحماية (Anti-Spam) في هاتف المستخدم
    let lastSentMessage = '';
    let lastSentTime = 0;

    const forbiddenWords = ['زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'موجب', 'سالب', 'كس', 'dick', 'fack', 'زك', 'ديوث','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' , 'nik', 'zbi' , '9hba','no9ch','sowa' ,'3atay' ,'bzoul' ,'zwayz','gay' ,'dyouth', 'zamal' ,'hatchoun','nhatchoun'];
    const forbiddenRegex = new RegExp(forbiddenWords.join('|'), 'gi');

    // 2. قاموس الترجمة
    const translations = {
        ar: {
            chatPlaceholder: 'اكتب رسالتك...',
            chatSendBtn: 'إرسال',
            statusSearching: 'جارٍ البحث عن غريب',
            statusMatchFoundTag: 'تم الاتصال بشريك يشاركك الـ Tag: ',
            statusMatchFoundRandom: 'تم الاتصال بغريب (لم نجد نفس الـ Tag)',
            partnerTyping: 'شريكك يكتب الآن...',
            partnerLeft: 'لقد غادر الغريب المحادثة، جاري البحث عن بديل...',
            partnerSuddenLeft: 'انقطع الاتصال مع الغريب فجأة، جاري البحث عن بديل...',
            partnerAway: 'الشريك في الخلفية (Away)',
            confirmLeaveTitle: 'هل أنت متأكد؟',
            confirmLeaveText: 'هل تريد حقاً مغادرة المحادثة للعودة للرئيسية؟',
            confirmYes: 'نعم، غادر',
            confirmNo: 'لا، ابقَ',
            // رسائل نظام الحماية (Anti-Spam)
            spamDuplicate: '🚫 عذراً، لا يمكنك إرسال نفس الرسالة مرتين متتاليتين!',
            spamFast: '⏳ الرجاء الانتظار قليلاً قبل إرسال رسالة جديدة.'
        },
        en: {
            chatPlaceholder: 'Type your message...',
            chatSendBtn: 'Send',
            statusSearching: 'Searching for a stranger',
            statusMatchFoundTag: 'Connected with a partner sharing Tag: ',
            statusMatchFoundRandom: 'Connected with a stranger',
            partnerTyping: 'Partner is typing...',
            partnerLeft: 'The stranger has left. Finding a new partner...',
            partnerSuddenLeft: 'Stranger lost connection. Finding a new partner...',
            partnerAway: 'Partner is away (Background)',
            confirmLeaveTitle: 'Are you sure?',
            confirmLeaveText: 'Do you really want to leave and return to home?',
            confirmYes: 'Yes, Leave',
            confirmNo: 'No, Stay',
            spamDuplicate: '🚫 You cannot send the exact same message twice!',
            spamFast: '⏳ Please wait a moment before sending another message.'
        }
    };

    // 3. الوظائف المساعدة
    function applyTranslations() {
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[currentLang][key]) {
                if (el.tagName === 'INPUT') el.placeholder = translations[currentLang][key];
                else el.innerHTML = translations[currentLang][key];
            }
        });
        updateChatStatusUI();
    }

    function updateChatStatusUI() {
        const { matchType, matchedTag, keyStatus } = DOM.chatStatus.dataset;
        if (matchType === 'tag') DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundTag + matchedTag;
        else if (matchType === 'random') DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundRandom;
        else if (keyStatus) DOM.chatStatus.textContent = translations[currentLang][keyStatus];
    }

    function filterLocalMessage(text) { return text.replace(forbiddenRegex, m => '*'.repeat(m.length)); }

    function displayMessage(msg, type) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}`;
        bubble.textContent = msg;
        DOM.messagesArea.appendChild(bubble);
        setTimeout(() => {
            DOM.messagesArea.scrollTo({ top: DOM.messagesArea.scrollHeight, behavior: 'smooth' });
        }, 50);
    }

    // =========================================
    // نظام إرسال الرسائل مع الحماية (Anti-Spam)
    // =========================================
    function sendMessage() {
        const raw = DOM.inputField.value.trim();
        
        if (raw && currentRoom) {
            const now = Date.now();

            // 1. منع التكرار (Duplicate Check)
            if (raw === lastSentMessage) {
                displayMessage(translations[currentLang].spamDuplicate, 'system-message');
                return; // توقيف العملية هنا، لن تُرسل الرسالة
            }

            // 2. منع الإرسال السريع جداً (Flood Control)
            if (now - lastSentTime < 500) {
                displayMessage(translations[currentLang].spamFast, 'system-message');
                return; // توقيف العملية هنا
            }

            // تحديث البيانات المحلية للمرسل
            lastSentMessage = raw;
            lastSentTime = now;

            // إذا تخطى الفحص، يتم الإرسال العادي
            socket.emit('chatMessage', { room: currentRoom, message: raw });
            displayMessage(filterLocalMessage(raw), 'my-message');
            DOM.inputField.value = '';
            closeEmojiPicker();
            DOM.inputField.focus(); 
        }
    }

    function startDotAnimation() {
        let count = 0; stopDotAnimation();
        dotAnimationInterval = setInterval(() => {
            count = (count + 1) % 4;
            DOM.chatStatus.textContent = translations[currentLang].statusSearching + '.'.repeat(count);
        }, 500);
    }

    function stopDotAnimation() { clearInterval(dotAnimationInterval); dotAnimationInterval = null; }

    function startSearching() {
        clearTimeout(autoRematchTimer);
        DOM.messagesArea.innerHTML = '';
        DOM.inputField.disabled = true;
        DOM.sendButton.disabled = true;
        DOM.emojiButton.disabled = true; 
        DOM.skipButton.disabled = true; // تعطيل زر التخطي أثناء البحث
        DOM.leaveHomeButton.disabled = false; // تفعيل زر الخروج للرئيسية
        DOM.chatStatus.dataset.keyStatus = 'statusSearching';
        DOM.chatStatus.dataset.matchType = '';
        
        // إعادة تصفير نظام الحماية عند البحث عن شخص جديد
        lastSentMessage = '';
        lastSentTime = 0;

        closeEmojiPicker();
        startDotAnimation();
        socket.emit('findPartner', searchTags); 
    }

    // =========================================
    // وظيفة التخطي السريع (Skip)
    // =========================================
    function handleSkip() {
        if (currentRoom) {
            socket.emit('leaveRoom', currentRoom);
            currentRoom = '';
        } else {
            socket.emit('cancelSearch');
        }
        startSearching();
    }

    // =========================================
    // نظام الإيموجي
    // =========================================
    function toggleEmojiPicker(e) {
        if(e) e.stopPropagation();
        DOM.emojiContainer.classList.toggle('hidden-emoji');
        DOM.emojiButton.classList.toggle('active');
        if (!DOM.emojiContainer.classList.contains('hidden-emoji')) {
            DOM.inputField.blur(); 
        }
    }

    function closeEmojiPicker() {
        DOM.emojiContainer.classList.add('hidden-emoji');
        DOM.emojiButton.classList.remove('active');
    }

    DOM.emojiPicker.addEventListener('emoji-click', event => {
        const input = DOM.inputField;
        const emoji = event.detail.unicode;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.slice(0, start) + emoji + text.slice(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
    });

    DOM.emojiButton.addEventListener('click', toggleEmojiPicker);
    DOM.messagesArea.addEventListener('click', closeEmojiPicker);
    DOM.inputField.addEventListener('focus', closeEmojiPicker);

    applyTranslations();
    startSearching();

    // 4. أحداث المستخدم
    DOM.sendButton.onclick = sendMessage;
    DOM.skipButton.onclick = handleSkip; // ربط زر التخطي بالوظيفة
    DOM.inputField.onkeyup = (e) => { if (e.key === 'Enter') sendMessage(); };

    DOM.inputField.oninput = () => {
        clearTimeout(typingTimer);
        if (DOM.inputField.value.trim()) {
            socket.emit('userTyping', { room: currentRoom });
            typingTimer = setTimeout(() => socket.emit('userStoppedTyping', { room: currentRoom }), typingTimeout);
        } else socket.emit('userStoppedTyping', { room: currentRoom });
    };

    // ربط زر العودة للرئيسية العلوي بنافذة التأكيد
    DOM.leaveHomeButton.onclick = () => DOM.confirmModal.classList.remove('hidden');
    DOM.confirmNoBtn.onclick = () => DOM.confirmModal.classList.add('hidden');
    
    DOM.confirmYesBtn.onclick = () => {
        stopDotAnimation(); clearTimeout(autoRematchTimer);
        if (currentRoom) socket.emit('leaveRoom', currentRoom);
        else socket.emit('cancelSearch');
        window.location.href = '/'; 
    };

    // 5. إصلاح مشكلة الكيبورد
    DOM.inputField.addEventListener('focus', () => {
        setTimeout(() => {
            DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight;
        }, 300);
    });

    window.addEventListener('resize', () => {
        if (document.activeElement === DOM.inputField) {
            setTimeout(() => {
                DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight;
            }, 100);
        }
    });

    // 6. أحداث السيرفر (Socket)
    socket.on('matchFound', (d) => {
        stopDotAnimation(); clearTimeout(autoRematchTimer);
        currentRoom = d.room; 
        if (d.matchedTag) {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundTag + d.matchedTag;
            DOM.chatStatus.dataset.matchType = 'tag'; DOM.chatStatus.dataset.matchedTag = d.matchedTag;
        } else {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundRandom;
            DOM.chatStatus.dataset.matchType = 'random';
        }
        // تفعيل زر التخطي عند إيجاد الشريك
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = DOM.skipButton.disabled = false; 
        DOM.inputField.focus();
    });

    socket.on('partnerLeft', (d) => {
        stopDotAnimation(); currentRoom = '';
        const key = (d?.reason === 'sudden_disconnect') ? 'partnerSuddenLeft' : 'partnerLeft';
        displayMessage(translations[currentLang][key], 'system-message');
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = true;
        DOM.skipButton.disabled = false; // السماح بعمل تخطي يدوي إذا أراد المستخدم عدم الانتظار
        DOM.chatStatus.textContent = translations[currentLang][key];
        DOM.chatStatus.dataset.keyStatus = key;
        closeEmojiPicker();
        autoRematchTimer = setTimeout(startSearching, 2000); 
    });

    socket.on('partnerAppStateChanged', (s) => {
        DOM.chatStatus.textContent = (s === 'inactive') ? translations[currentLang].partnerAway : translations[currentLang].statusMatchFoundRandom;
        if (s !== 'inactive') updateChatStatusUI();
    });

    socket.on('partnerTyping', () => DOM.chatStatus.textContent = translations[currentLang].partnerTyping);
    socket.on('partnerStoppedTyping', updateChatStatusUI);
    socket.on('chatMessage', (m) => displayMessage(filterLocalMessage(m), 'stranger-message'));
    socket.on('syncMessages', (msgs) => msgs.forEach(m => displayMessage(filterLocalMessage(m.message), 'stranger-message')));

    // استقبال تحذير من السيرفر كطبقة حماية إضافية
    socket.on('spamWarning', (type) => {
        const msg = type === 'duplicate' ? translations[currentLang].spamDuplicate : translations[currentLang].spamFast;
        displayMessage(msg, 'system-message');
    });

    // 7. Capacitor
    if (window.Capacitor) {
        const { App } = Capacitor.Plugins;
        App.addListener('backButton', () => {
            if (!DOM.emojiContainer.classList.contains('hidden-emoji')) {
                closeEmojiPicker(); 
            }
            else if (!DOM.confirmModal.classList.contains('hidden')) {
                DOM.confirmModal.classList.add('hidden');
            } else {
                DOM.confirmModal.classList.remove('hidden'); 
            }
        });
        App.addListener('appStateChange', ({ isActive }) => {
            if (currentRoom) {
                socket.emit('updateAppState', { state: isActive ? 'active' : 'inactive' });
                if (isActive) socket.emit('requestSync');
            } 
        }); 
    }
});