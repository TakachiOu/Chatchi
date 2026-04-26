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
        confirmNoBtn: document.getElementById('confirm-no-btn')
    };

    // استرجاع الـ Tags واللغة التي اختارها المستخدم من الصفحة الرئيسية
    const searchTags = JSON.parse(sessionStorage.getItem('chatchi_tags') || '[]');
    let currentLang = sessionStorage.getItem('chatchi_lang') || 'ar';
    
    let currentRoom = '';
    let typingTimer;
    const typingTimeout = 1500;
    let dotAnimationInterval;
    let autoRematchTimer;

    const forbiddenWords = ['زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'موجب', 'سالب', 'كس', 'dick', 'fack', 'زك', 'ديوث','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' , 'nik', 'zbi' , '9hba','no9ch','sowa' ,'3atay' ,'bzoul' ,'zwayz','gay' ,'dyouth', 'zamal' ,'hatchoun','nhatchoun'];
    const forbiddenRegex = new RegExp(forbiddenWords.join('|'), 'gi');

    // 2. قاموس الترجمة (للدردشة فقط)
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
        requestAnimationFrame(() => DOM.messagesArea.scrollTo({ top: DOM.messagesArea.scrollHeight, behavior: 'smooth' }));
    }

    function sendMessage() {
        const raw = DOM.inputField.value.trim();
        if (raw && currentRoom) {
            socket.emit('chatMessage', { room: currentRoom, message: raw });
            displayMessage(filterLocalMessage(raw), 'my-message');
            DOM.inputField.value = '';
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
        DOM.leaveButton.disabled = false;
        DOM.chatStatus.dataset.keyStatus = 'statusSearching';
        DOM.chatStatus.dataset.matchType = '';
        startDotAnimation();
        socket.emit('findPartner', searchTags); // إرسال الـ tags المحفوظة
    }

    // 4. نظام الإعلانات الهجين (Hybrid Ads)
    async function setupHybridAds() {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

        if (isNativeApp) {
            // إزالة أكواد أدسنس لتجنب مخالفة سياسات التطبيقات
            const adSenseScripts = document.querySelectorAll('script[src*="adsbygoogle"]');
            adSenseScripts.forEach(script => script.remove());

            // تشغيل AdMob بدلاً منها
            try {
                const { AdMob } = Capacitor.Plugins;
                await AdMob.initialize();

                const bannerOptions = {
                    adId: 'ca-app-pub-4748269863410868/7009865744',
                    adSize: 'BANNER',
                    position: 'BOTTOM_CENTER',
                    margin: 0,
                    isTesting: false
                };

                await AdMob.showBanner(bannerOptions);
            } catch (error) {
                console.error('خطأ في تهيئة إعلانات AdMob:', error);
            }
        }
        // في المتصفح سيستمر AdSense بالعمل طبيعياً
    }

    // تطبيق الترجمة فوراً وبدء البحث التلقائي وإعداد الإعلانات عند دخول الصفحة
    applyTranslations();
    startSearching();
    setupHybridAds();

    // 5. أحداث المستخدم
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
        // العودة إلى الصفحة الرئيسية بدل إخفاء الشات باستخدام الرابط النظيف
        window.location.href = '/'; 
    };

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
        DOM.inputField.disabled = DOM.sendButton.disabled = false; 
        DOM.inputField.focus();
    });

    socket.on('partnerLeft', (d) => {
        stopDotAnimation(); currentRoom = '';
        const key = (d?.reason === 'sudden_disconnect') ? 'partnerSuddenLeft' : 'partnerLeft';
        displayMessage(translations[currentLang][key], 'system-message');
        DOM.inputField.disabled = DOM.sendButton.disabled = true;
        DOM.chatStatus.textContent = translations[currentLang][key];
        DOM.chatStatus.dataset.keyStatus = key;
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

    // 7. Capacitor (لأجهزة الموبايل)
    if (window.Capacitor) {
        const { App } = Capacitor.Plugins;
        App.addListener('backButton', () => {
            if (!DOM.confirmModal.classList.contains('hidden')) {
                DOM.confirmModal.classList.add('hidden');
            } else {
                DOM.confirmModal.classList.remove('hidden'); // إظهار تحذير الخروج
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