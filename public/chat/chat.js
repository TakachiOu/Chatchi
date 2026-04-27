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
        leaveButton: document.getElementById('leave-button'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        // محددات الإيموجي الجديدة
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
            confirmNo: 'لا، ابقَ'
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
            confirmNo: 'No, Stay'
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

    function sendMessage() {
        const raw = DOM.inputField.value.trim();
        if (raw && currentRoom) {
            socket.emit('chatMessage', { room: currentRoom, message: raw });
            displayMessage(filterLocalMessage(raw), 'my-message');
            DOM.inputField.value = '';
            // إخفاء الإيموجي عند الإرسال
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
        DOM.emojiButton.disabled = true; // تعطيل الإيموجي أثناء البحث
        DOM.leaveButton.disabled = false;
        DOM.chatStatus.dataset.keyStatus = 'statusSearching';
        DOM.chatStatus.dataset.matchType = '';
        closeEmojiPicker();
        startDotAnimation();
        socket.emit('findPartner', searchTags); 
    }

    // =========================================
    // نظام الإيموجي الجديد
    // =========================================
    function toggleEmojiPicker(e) {
        if(e) e.stopPropagation();
        DOM.emojiContainer.classList.toggle('hidden-emoji');
        DOM.emojiButton.classList.toggle('active');
        // إذا فتحنا الإيموجي، نخفي الكيبورد ونمنع الشاشة من الارتفاع الزائد
        if (!DOM.emojiContainer.classList.contains('hidden-emoji')) {
            DOM.inputField.blur(); 
        }
    }

    function closeEmojiPicker() {
        DOM.emojiContainer.classList.add('hidden-emoji');
        DOM.emojiButton.classList.remove('active');
    }

    // إضافة الإيموجي المختار لمربع النص
    DOM.emojiPicker.addEventListener('emoji-click', event => {
        const input = DOM.inputField;
        const emoji = event.detail.unicode;
        
        // إدراج الإيموجي في مكان المؤشر (Cursor Position)
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        input.value = text.slice(0, start) + emoji + text.slice(end);
        
        // نقل المؤشر بعد الإيموجي
        input.selectionStart = input.selectionEnd = start + emoji.length;
        
        // إعادة التركيز للحقل بعد وضع الإيموجي
        input.focus();
    });

    // أحداث فتح وإغلاق لوحة الإيموجي
    DOM.emojiButton.addEventListener('click', toggleEmojiPicker);

    // إغلاق اللوحة عند النقر في أي مكان آخر (منطقة الرسائل)
    DOM.messagesArea.addEventListener('click', closeEmojiPicker);
    
    // إغلاق اللوحة عند بدء الكتابة بالكيبورد الحقيقي
    DOM.inputField.addEventListener('focus', closeEmojiPicker);

    applyTranslations();
    startSearching();

    // 4. أحداث المستخدم
    DOM.sendButton.onclick = sendMessage;
    DOM.inputField.onkeyup = (e) => { if (e.key === 'Enter') sendMessage(); };

    DOM.inputField.oninput = () => {
        clearTimeout(typingTimer);
        if (DOM.inputField.value.trim()) {
            socket.emit('userTyping', { room: currentRoom });
            typingTimer = setTimeout(() => socket.emit('userStoppedTyping', { room: currentRoom }), typingTimeout);
        } else socket.emit('userStoppedTyping', { room: currentRoom });
    };

    DOM.leaveButton.onclick = () => DOM.confirmModal.classList.remove('hidden');
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
        // تفعيل الإدخال والأزرار بعد إيجاد الشريك
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = false; 
        DOM.inputField.focus();
    });

    socket.on('partnerLeft', (d) => {
        stopDotAnimation(); currentRoom = '';
        const key = (d?.reason === 'sudden_disconnect') ? 'partnerSuddenLeft' : 'partnerLeft';
        displayMessage(translations[currentLang][key], 'system-message');
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = true;
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

    // 7. Capacitor
    if (window.Capacitor) {
        const { App } = Capacitor.Plugins;
        App.addListener('backButton', () => {
            if (!DOM.emojiContainer.classList.contains('hidden-emoji')) {
                closeEmojiPicker(); // إغلاق الإيموجي إذا كان مفتوحاً بدلاً من نافذة الخروج
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