document.addEventListener('DOMContentLoaded', () => {

    // =================================
    // 1. التهيئة والمحددات (خفيفة وحديثة)
    // =================================
    const socket = io("https://chatchi.onrender.com", {
        transports: ['websocket'], // تسريع الاتصال بإجبار استخدام WebSockets
        upgrade: false
    });

    // عناصر الـ DOM مخزنة مسبقاً لتسريع الوصول إليها
    const DOM = {
        onlineCount: document.getElementById('onlineCount'),
        mainView: document.getElementById('main-view'),
        chatView: document.getElementById('chat-view'),
        tagsInput: document.getElementById('tags-input'),
        tagsArea: document.getElementById('tags-area'),
        ctaButton: document.querySelector('.cta-button'),
        ctaButtonText: document.querySelector('.cta-button span'),
        chatStatus: document.querySelector('.chat-status'),
        messagesArea: document.querySelector('.messages-area'),
        inputField: document.getElementById('chat-input-field'),
        sendButton: document.getElementById('send-button'),
        leaveButton: document.getElementById('leave-button'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        langToggleButton: document.getElementById('lang-toggle')
    };

    let currentRoom = '';
    let typingTimer;
    const typingTimeout = 1500;
    const tags = new Set();
    let currentLang = 'ar';
    let dotAnimationInterval;
    let autoRematchTimer; // مؤقت البحث التلقائي الجديد

    // --- قائمة الكلمات الممنوعة ---
    const forbiddenWords = [
        'زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'موجب', 'سالب', 'كس', 
        'dick', 'fack', 'زك', 'ديوث','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' 
    ];
    // إنشاء تعبير نمطي (Regex) مسبقاً لتسريع عملية الفلترة
    const forbiddenRegex = new RegExp(forbiddenWords.join('|'), 'gi');

    // =================================
    // 2. قاموس الترجمة
    // =================================
    const translations = {
        ar: {
            langToggle: 'English',
            siteTitle: 'Chatchi - تحدث مع المجهول',
            mainTitle: 'ادخل الفراغ و تحدث مع المجهول',
            subtitle: 'مرحباً بك في Chatchi.. مساحة للبوح وتبادل الأسرار بقلبٍ مطمئن.',
            tagsPlaceholder: 'اكتب tag للدخول إلى دردشة مع من كتب نفس الـtag',
            ctaButton: 'ابحث عن شخص',
            searchingButton: 'جارٍ البحث...',
            aboutTitle: 'ما هو Chatchi؟',
            aboutText: 'هي منصة بسيطة ومساحة آمنة تتيح لك فرصة الدخول في محادثات نصية، عشوائية، ومجهولة الهوية تماماً .',
            featuresTitle: 'أبرز مميزاتنا',
            feature1: '<strong>هوية مجهولة بالكامل:</strong> لا نطلب أي معلومات شخصية.',
            feature2: '<strong>محادثات سرية:</strong> كل الرسائل تُحذف للأبد بمجرد إنهاء المحادثة.',
            feature3: '<strong>مطابقة ذكية:</strong> استعمل tag إن أحببت.',
            rulesTitle: 'قواعد المنصة',
            rule1: 'لضمان تواصلٍ ممتع ومستمر، يُرجى البقاء في غرفة الدردشة وعدم مغادرتها حتى لا تنقطع المحادثة بين الطرفين.',
            rule2: 'اتقِ الله في قولك، فما تكتبه مسجلٌ في صحيفتك',
            rule3: 'استمتع بتجربتك وكن سبباً في جعل تجربة الآخرين ممتعة.',
            copyright: '© 2026 Chatchi. جميع الحقوق محفوظة.',
            credit: 'صُنع بكل ❤️ بواسطة <a href="" target="_blank" class="credit-link">TaKaChi</a>',
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
            confirmLeaveText: 'هل تريد حقاً مغادرة المحادثة؟',
            confirmYes: 'نعم، غادر',
            confirmNo: 'لا، ابقَ'
        },
        en: {
            langToggle: 'العربية',
            siteTitle: 'Chatchi - Talk with a Stranger',
            mainTitle: 'Enter the Void & Talk with the Unknown',
            subtitle: 'Welcome to Chatchi.. A sanctuary for opening up and sharing secrets.',
            tagsPlaceholder: 'Enter a tag to chat with someone with the same tag',
            ctaButton: 'Find a Stranger',
            searchingButton: 'Searching...',
            aboutTitle: 'What is Chatchi?',
            aboutText: 'It is a simple platform and a safe space for anonymous conversations.',
            featuresTitle: 'Our Top Features',
            feature1: '<strong>Completely Anonymous:</strong> No personal info required.',
            feature2: '<strong>Ephemeral Chats:</strong> Messages are deleted forever.',
            feature3: '<strong>Smart Matching:</strong> Use tags or go random.',
            rulesTitle: 'Platform Rules',
            rule1: 'To ensure an enjoyable and continuous conversation, please remain in the chat room and do not leave, so the conversation does not get interrupted between both parties.',
            rule2: 'No profanity allowed. Every word is recorded in your deeds.',
            rule3: 'Enjoy and be kind.',
            copyright: '© 2026 Chatchi. All rights reserved.',
            credit: 'Made with ❤️ by <a href="" target="_blank" class="credit-link">TaKaChi</a>',
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
            confirmLeaveText: 'Do you really want to leave the conversation?',
            confirmYes: 'Yes, Leave',
            confirmNo: 'No, Stay'
        }
    };

    // =================================
    // 3. الوظائف المساعدة وتحديث واجهة المستخدم (مُحسّنة)
    // =================================

    function applyTranslations() {
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

        const elementsToTranslate = document.querySelectorAll('[data-key]');
        elementsToTranslate.forEach(element => {
            const key = element.getAttribute('data-key');
            if (translations[currentLang][key]) {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = translations[currentLang][key];
                } else {
                    element.innerHTML = translations[currentLang][key];
                }
            }
        });
        updateChatStatusUI();
    }

    function updateChatStatusUI() {
        const matchType = DOM.chatStatus.dataset.matchType;
        if (matchType === 'tag') {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundTag + DOM.chatStatus.dataset.matchedTag;
        } else if (matchType === 'random') {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundRandom;
        } else {
            const currentStatusKey = DOM.chatStatus.dataset.keyStatus;
            if (currentStatusKey && translations[currentLang][currentStatusKey]) {
                DOM.chatStatus.textContent = translations[currentLang][currentStatusKey];
            }
        }
    }

    // فلترة سريعة للكلمات
    function filterLocalMessage(text) {
        return text.replace(forbiddenRegex, match => '*'.repeat(match.length));
    }

    // عرض الـ Tags بكفاءة عبر DocumentFragment
    function renderTags() {
        const fragment = document.createDocumentFragment();
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `${tag}<span class="close-btn" data-tag-value="${tag}">&times;</span>`;
            fragment.appendChild(tagElement);
        });
        DOM.tagsArea.innerHTML = '';
        DOM.tagsArea.appendChild(fragment);
    }

    // عرض الرسائل بتمرير سلس (Smooth Scroll)
    function displayMessage(message, type) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}`;
        bubble.textContent = message;
        DOM.messagesArea.appendChild(bubble);
        
        // التمرير السلس للأسفل
        requestAnimationFrame(() => {
            DOM.messagesArea.scrollTo({
                top: DOM.messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    function sendMessage() {
        const rawMessage = DOM.inputField.value.trim();
        if (rawMessage && currentRoom) {
            socket.emit('chatMessage', { room: currentRoom, message: rawMessage });
            displayMessage(filterLocalMessage(rawMessage), 'my-message');
            DOM.inputField.value = '';
            DOM.inputField.focus();
        }
    }

    function resetChatState() {
        clearTimeout(autoRematchTimer);
        DOM.chatView.classList.add('hidden');
        DOM.mainView.classList.remove('hidden');
        DOM.ctaButtonText.textContent = translations[currentLang].ctaButton;
        DOM.ctaButton.disabled = false;
        DOM.messagesArea.innerHTML = '';
        DOM.inputField.disabled = true;
        DOM.sendButton.disabled = true;
        DOM.leaveButton.disabled = true;
        currentRoom = '';
        DOM.chatStatus.textContent = '';
        DOM.chatStatus.dataset.keyStatus = '';
        DOM.chatStatus.dataset.matchType = '';
        DOM.chatStatus.dataset.matchedTag = '';
    }

    function startDotAnimation() {
        let dotCount = 0;
        stopDotAnimation();
        dotAnimationInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            DOM.chatStatus.textContent = translations[currentLang].statusSearching + '.'.repeat(dotCount);
        }, 500);
    }

    function stopDotAnimation() {
        if (dotAnimationInterval) {
            clearInterval(dotAnimationInterval);
            dotAnimationInterval = null;
        }
    }

    // =================================
    // 4. مستمعو الأحداث (User Actions)
    // =================================

    DOM.langToggleButton.addEventListener('click', () => {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        applyTranslations();
    });

    DOM.tagsInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const newTag = DOM.tagsInput.value.trim().toLowerCase();
            if (newTag && !tags.has(newTag)) {
                tags.add(newTag);
                renderTags();
            }
            DOM.tagsInput.value = '';
        }
    });

    DOM.tagsArea.addEventListener('click', (event) => {
        if (event.target.classList.contains('close-btn')) {
            tags.delete(event.target.getAttribute('data-tag-value'));
            renderTags();
        }
    });

    // دالة بدء البحث مجمعة لسهولة إعادة الاستخدام
    function startSearching() {
        clearTimeout(autoRematchTimer);
        DOM.messagesArea.innerHTML = ''; // تنظيف الشات القديم
        DOM.ctaButtonText.textContent = translations[currentLang].searchingButton;
        DOM.ctaButton.disabled = true;
        socket.emit('findPartner', Array.from(tags));
    }

    DOM.ctaButton.addEventListener('click', startSearching);

    DOM.sendButton.addEventListener('click', sendMessage);
    DOM.inputField.addEventListener('keyup', (event) => { if (event.key === 'Enter') sendMessage(); });

    DOM.inputField.addEventListener('input', () => {
        clearTimeout(typingTimer);
        if (DOM.inputField.value.trim() !== '') {
            socket.emit('userTyping', { room: currentRoom });
            typingTimer = setTimeout(() => {
                socket.emit('userStoppedTyping', { room: currentRoom });
            }, typingTimeout);
        } else {
            socket.emit('userStoppedTyping', { room: currentRoom });
        }
    });

    DOM.leaveButton.addEventListener('click', () => DOM.confirmModal.classList.remove('hidden'));
    DOM.confirmNoBtn.addEventListener('click', () => DOM.confirmModal.classList.add('hidden'));

    DOM.confirmYesBtn.addEventListener('click', () => {
        stopDotAnimation();
        clearTimeout(autoRematchTimer);
        if (currentRoom) {
            socket.emit('leaveRoom', currentRoom);
        } else {
            socket.emit('cancelSearch');
        }
        resetChatState();
        DOM.confirmModal.classList.add('hidden');
    });

    // =================================
    // 5. مستمعو أحداث الخادم (Socket Events)
    // =================================

    socket.on('updateOnlineUsers', (count) => {
        if (DOM.onlineCount) DOM.onlineCount.textContent = count;
    });

    socket.on('waitingForPartner', () => {
        DOM.mainView.classList.add('hidden');
        DOM.chatView.classList.remove('hidden');
        DOM.chatStatus.textContent = translations[currentLang].statusSearching;
        DOM.chatStatus.dataset.keyStatus = 'statusSearching';
        DOM.chatStatus.dataset.matchType = '';
        DOM.leaveButton.disabled = false;
        startDotAnimation();
    });

    socket.on('matchFound', (data) => {
        stopDotAnimation();
        clearTimeout(autoRematchTimer);
        currentRoom = data.room;
        DOM.mainView.classList.add('hidden');
        DOM.chatView.classList.remove('hidden');
        
        if (data.matchedTag) {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundTag + data.matchedTag;
            DOM.chatStatus.dataset.matchType = 'tag';
            DOM.chatStatus.dataset.matchedTag = data.matchedTag;
        } else {
            DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundRandom;
            DOM.chatStatus.dataset.matchType = 'random';
            DOM.chatStatus.dataset.matchedTag = '';
        }

        DOM.inputField.disabled = false;
        DOM.sendButton.disabled = false;
        DOM.leaveButton.disabled = false;
        DOM.inputField.focus();
    });

    // التعديل الأهم: الانتقال التلقائي عند مغادرة الشريك
    socket.on('partnerLeft', (data) => {
        stopDotAnimation();
        currentRoom = ''; // تفريغ الغرفة الحالية
        
        const reasonKey = (data && data.reason === 'sudden_disconnect') ? 'partnerSuddenLeft' : 'partnerLeft';
        displayMessage(translations[currentLang][reasonKey], 'system-message');
        
        DOM.inputField.disabled = true;
        DOM.sendButton.disabled = true;
        DOM.chatStatus.textContent = translations[currentLang][reasonKey];
        DOM.chatStatus.dataset.keyStatus = reasonKey;
        DOM.chatStatus.dataset.matchType = '';

        // الانتظار ثانيتين ثم بدء البحث عن شريك جديد تلقائياً
        autoRematchTimer = setTimeout(() => {
            startSearching();
        }, 2000); 
    });

    socket.on('partnerAppStateChanged', (state) => {
        if (state === 'inactive') {
            DOM.chatStatus.textContent = translations[currentLang].partnerAway;
        } else {
            updateChatStatusUI();
        }
    });

    socket.on('partnerTyping', () => DOM.chatStatus.textContent = translations[currentLang].partnerTyping);
    socket.on('partnerStoppedTyping', updateChatStatusUI);

    socket.on('chatMessage', (message) => displayMessage(filterLocalMessage(message), 'stranger-message'));

    socket.on('syncMessages', (messages) => {
        messages.forEach(msg => displayMessage(filterLocalMessage(msg.message), 'stranger-message'));
    });

    // =================================
    // 6. تكامل Capacitor 
    // =================================
    if (window.Capacitor) {
        const { App } = Capacitor.Plugins;

        App.addListener('backButton', () => {
            const isModalVisible = !DOM.confirmModal.classList.contains('hidden');
            const isChatViewVisible = !DOM.chatView.classList.contains('hidden');
            if (isModalVisible) {
                DOM.confirmModal.classList.add('hidden');
            } else if (isChatViewVisible) {
                DOM.confirmModal.classList.remove('hidden');
            } else {
                App.exitApp();
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