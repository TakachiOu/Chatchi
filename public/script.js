document.addEventListener('DOMContentLoaded', () => {

    const APP_VERSION = "1.0.0";
    
    // ==========================================
    // 1. إدارة التنقل بين الواجهات (SPA Router)
    // ==========================================
    function switchView(viewId) {
        document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
        document.getElementById('view-' + viewId).classList.add('active');
        window.scrollTo(0, 0);

        // إذا دخل لغرفة الشات
        if (viewId === 'chat') {
            document.body.classList.add('in-chat');
            startSearching(); 
        } else {
            document.body.classList.remove('in-chat');
            // إذا خرج من الشات، يجب قطع الاتصال أو إلغاء البحث
            if (currentRoom) {
                socket.emit('leaveRoom', currentRoom);
                currentRoom = '';
            } else {
                socket.emit('cancelSearch');
            }
            stopDotAnimation();
            clearTimeout(autoRematchTimer);
        }
    }

    // ==========================================
    // 2. إعدادات السوكيت والمحددات (DOM)
    // ==========================================
    const socket = io("https://chatchi-ik3p.onrender.com", {
        transports: ['websocket'], 
        upgrade: false
    });

    const DOM = {
        // عام
        langToggleBtns: document.querySelectorAll('.lang-toggle'),
        shareBtn: document.getElementById('share-btn'),
        updateOverlay: document.getElementById('force-update-overlay'),
        updateLink: document.getElementById('update-link'),
        linkToPrivacy: document.getElementById('link-to-privacy'),
        linkToHome: document.getElementById('link-to-home'),
        
        // الرئيسية
        tagsInput: document.getElementById('tags-input'),
        tagsArea: document.getElementById('tags-area'),
        startChatBtn: document.getElementById('start-chat-btn'),
        
        // الشات
        chatStatus: document.querySelector('.chat-status'),
        messagesArea: document.querySelector('.messages-area'),
        inputField: document.getElementById('chat-input-field'),
        sendButton: document.getElementById('send-button'),
        skipButton: document.getElementById('skip-button'), 
        leaveHomeButton: document.getElementById('leave-home-button'), 
        confirmModal: document.getElementById('confirm-modal'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        emojiButton: document.getElementById('emoji-button'),
        emojiContainer: document.getElementById('emoji-picker-container'),
        emojiPicker: document.querySelector('emoji-picker')
    };

    const tags = new Set();
    let searchTags = [];
    let currentLang = sessionStorage.getItem('chatchi_lang') || 'ar';
    
    let currentRoom = '';
    let typingTimer;
    const typingTimeout = 1500;
    let dotAnimationInterval;
    let autoRematchTimer;

    let lastSentMessage = '';
    let lastSentTime = 0;

    const forbiddenWords = ['زب', 'نيك', 'حتشون', 'قحب', 'نقش', 'ترمة', 'سوة','قحبة','بنوتي', 'موجب', 'سالب', 'كس', 'dick', 'fack', 'زك', 'ديوث','شرموطة', 'عطاي', 'منيوك', 'شرموط', 'fuck' , 'nik', 'zbi' , '9hba','no9ch','sowa' ,'3atay' ,'bzoul' ,'zwayz','gay' ,'dyouth', 'zamal' ,'hatchoun','nhatchoun'];
    const forbiddenRegex = new RegExp(forbiddenWords.join('|'), 'gi');

    // ==========================================
    // 3. قاموس الترجمة الشامل
    // ==========================================
    const translations = {
        ar: {
            langToggle: 'English',
            mainTitle: 'ادخل الفراغ و تحدث مع المجهول',
            subtitle: 'مرحباً بك في Chatchi.. مساحة للبوح وتبادل الأسرار بقلبٍ مطمئن. صُمم هذا الموقع ليكون متنفساً لكل من أثقلته الهموم، لكي يحكي مشاكله لمن لا يعرفه فيرتاح قلبه',
            tagsPlaceholder: 'اكتب tag للدخول إلى دردشة مع من كتب نفس الـtag',
            ctaButton: 'ابحث عن شخص',
            aboutTitle: 'ما هو Chatchi؟',
            aboutText: 'هي منصة بسيطة ومساحة آمنة تتيح لك فرصة الدخول في محادثات نصية، عشوائية، ومجهولة الهوية تماماً.',
            featuresTitle: 'أبرز مميزاتنا',
            feature1: '<strong>هوية مجهولة بالكامل:</strong> لا نطلب أي معلومات شخصية.',
            feature2: '<strong>محادثات سرية:</strong> كل الرسائل تُحذف للأبد بمجرد إنهاء المحادثة.',
            feature3: '<strong>مطابقة ذكية:</strong>استعمل Tag إذا أحببت، وإن لم تجد أحدًا، يمكنك تغييره أو الدخول بدونه.',
            rulesTitle: 'قواعد المنصة',
            rule1: 'لضمان تواصلٍ ممتع ومستمر، يُرجى البقاء في غرفة الدردشة وعدم مغادرتها حتى لا تنقطع المحادثة بين الطرفين.',
            rule2: 'لتبقى هذه المساحة نقية، يُمنع منعاً باتاً السب، الشتم، أو استغلال المنصة فيما حرمه الله. اتقِ الله في قولك، فما تكتبه مسجلٌ في صحيفتك.',
            rule3: 'استمتع بتجربتك وكن سبباً في جعل تجربة الآخرين ممتعة.',
            privacyLink: 'سياسة الخصوصية',
            copyright: '© 2026 Chatchi. جميع الحقوق محفوظة.',
            credit: 'صُنع بكل ❤️ بواسطة <a href="#" class="credit-link">TaKaChi</a>',
            updateTitle: 'تحديث جديد متوفر!',
            updateText: 'أنت تستخدم نسخة قديمة من التطبيق. يرجى التحديث الآن من متجر بلاي للحصول على آخر التحسينات الأمنية والميزات الجديدة.',
            updateBtn: 'تحديث الآن',
            backHome: 'العودة إلى الصفحة الرئيسية',
            pageTitle: 'سياسة الخصوصية',
            lastUpdated: 'آخر تحديث: أبريل 2026',
            introTitle: 'مقدمة',
            introText: 'مرحباً بك في Chatchi. نحن نؤمن بأن الخصوصية حق أساسي، ولذلك قمنا ببناء هذه المنصة لتكون مساحة آمنة ومجهولة تماماً للتواصل. تشرح هذه السياسة كيف نتعامل مع المعلومات عند استخدامك لموقعنا.',
            dataTitle: 'جمع البيانات والمعلومات الشخصية',
            dataText: 'نحن لا نطلب، ولا نجمع، ولا نخزن أي معلومات شخصية عنك. لست بحاجة إلى إنشاء حساب، أو تقديم بريد إلكتروني، أو رقم هاتف لاستخدام Chatchi. هويتك تبقى مجهولة بالكامل.',
            chatTitle: 'محتوى المحادثات (الدردشة)',
            chatText: 'تعمل منصتنا بنظام المراسلة اللحظية. بمجرد انتهاء المحادثة ومغادرتك للغرفة، يتم مسح جميع الرسائل فوراً وبشكل نهائي من خوادمنا. لا يوجد أي سجل (History) للمحادثات، ولا يمكن لأي طرف استرجاعها.',
            cookiesTitle: 'ملفات تعريف الارتباط (Cookies) والإعلانات',
            cookiesText: 'نحن نستخدم خدمات جهات خارجية (مثل Google AdMob و Google AdSense) لعرض الإعلانات. قد تستخدم هذه الجهات ملفات تعريف الارتباط (Cookies) أو معرفات الأجهزة لتقديم إعلانات مخصصة بناءً على اهتماماتك. يمكنك إدارة تفضيلات الإعلانات الخاصة بك من خلال إعدادات حساب Google أو إعدادات هاتفك.',
            consentTitle: 'موافقتك',
            consentText: 'باستخدامك لموقع أو تطبيق Chatchi، فإنك توافق على سياسة الخصوصية الخاصة بنا الموضحة في هذه الصفحة.',
            chatPlaceholder: 'اكتب رسالتك...',
            chatSendBtn: 'إرسال',
            statusSearching: 'جارٍ البحث عن غريب',
            statusMatchFoundTag: 'تم الاتصال بشريك يشاركك الـ Tag: ',
            statusMatchFoundRandom: 'تم الاتصال بغريب (لم نجد نفس الـ Tag)',
            statusInit: 'جارٍ تهيئة الاتصال...',
            partnerTyping: 'شريكك يكتب الآن...',
            partnerLeft: 'لقد غادر الغريب المحادثة، جاري البحث عن بديل...',
            partnerSuddenLeft: 'انقطع الاتصال مع الغريب فجأة، جاري البحث عن بديل...',
            partnerAway: 'الشريك في الخلفية (Away)',
            confirmLeaveTitle: 'هل أنت متأكد؟',
            confirmLeaveText: 'هل تريد حقاً مغادرة المحادثة للعودة للرئيسية؟',
            confirmYes: 'نعم، غادر',
            confirmNo: 'لا، ابقَ',
            spamDuplicate: '🚫 عذراً، لا يمكنك إرسال نفس الرسالة مرتين متتاليتين!',
            spamFast: '⏳ الرجاء الانتظار قليلاً قبل إرسال رسالة جديدة.'
        },
        en: {
            langToggle: 'العربية',
            mainTitle: 'Enter the Void & Talk with the Unknown',
            subtitle: 'Welcome to Chatchi.. A sanctuary for opening up and sharing secrets. Designed as a breathing space for the heavy-hearted to speak anonymously.',
            tagsPlaceholder: 'Enter a tag to chat with someone with the same tag',
            ctaButton: 'Find a Stranger',
            aboutTitle: 'What is Chatchi?',
            aboutText: 'It is a simple platform and a safe space offering completely anonymous text conversations.',
            featuresTitle: 'Our Top Features',
            feature1: '<strong>Completely Anonymous:</strong> No personal info required.',
            feature2: '<strong>Ephemeral Chats:</strong> Messages are deleted forever.',
            feature3: '<strong>Smart Matching:</strong> Use tags if you like, or go random.',
            rulesTitle: 'Platform Rules',
            rule1: 'To ensure an enjoyable and continuous conversation, please remain in the chat room.',
            rule2: 'No profanity allowed. Every word is recorded in your deeds.',
            rule3: 'Enjoy and be kind.',
            privacyLink: 'Privacy Policy',
            copyright: '© 2026 Chatchi. All rights reserved.',
            credit: 'Made with ❤️ by <a href="#" class="credit-link">TaKaChi</a>',
            updateTitle: 'Update Available!',
            updateText: 'You are using an outdated version. Please update from the Play Store to get the latest security improvements and features.',
            updateBtn: 'Update Now',
            backHome: 'Back to Home Page',
            pageTitle: 'Privacy Policy',
            lastUpdated: 'Last Updated: April 2026',
            introTitle: 'Introduction',
            introText: 'Welcome to Chatchi. We believe privacy is a fundamental right, which is why we built this platform to be a safe and completely anonymous space for communication. This policy explains how we handle information when you use our site.',
            dataTitle: 'Data Collection & Personal Info',
            dataText: 'We do not ask for, collect, or store any personal information about you. You do not need to create an account, provide an email, or phone number to use Chatchi. Your identity remains completely anonymous.',
            chatTitle: 'Chat Content',
            chatText: 'Our platform uses real-time messaging. Once a chat ends and you leave the room, all messages are immediately and permanently deleted from our servers. There is no chat history, and no party can retrieve them.',
            cookiesTitle: 'Cookies and Advertisements',
            cookiesText: 'We use third-party services (like Google AdMob and Google AdSense) to display ads. These parties may use cookies or device identifiers to serve personalized ads based on your interests. You can manage your ad preferences through your Google account settings or device settings.',
            consentTitle: 'Your Consent',
            consentText: 'By using the Chatchi website or app, you consent to our Privacy Policy outlined on this page.',
            chatPlaceholder: 'Type your message...',
            chatSendBtn: 'Send',
            statusSearching: 'Searching for a stranger',
            statusMatchFoundTag: 'Connected with a partner sharing Tag: ',
            statusMatchFoundRandom: 'Connected with a stranger',
            statusInit: 'Initializing connection...',
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

    function applyTranslations() {
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        sessionStorage.setItem('chatchi_lang', currentLang); 

        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[currentLang] && translations[currentLang][key]) {
                if (el.tagName === 'INPUT') el.placeholder = translations[currentLang][key];
                else el.innerHTML = translations[currentLang][key];
            }
        });
        updateChatStatusUI();
    }

    function updateChatStatusUI() {
        if(!DOM.chatStatus) return;
        const { matchType, matchedTag, keyStatus } = DOM.chatStatus.dataset;
        if (matchType === 'tag') DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundTag + matchedTag;
        else if (matchType === 'random') DOM.chatStatus.textContent = translations[currentLang].statusMatchFoundRandom;
        else if (keyStatus && translations[currentLang][keyStatus]) DOM.chatStatus.textContent = translations[currentLang][keyStatus];
    }

    // ==========================================
    // 4. وظائف الرئيسية (Home)
    // ==========================================
    function renderTags() {
        const fragment = document.createDocumentFragment();
        tags.forEach(tag => {
            const el = document.createElement('div');
            el.className = 'tag-item';
            el.innerHTML = `${tag}<span class="close-btn" data-tag-value="${tag}">&times;</span>`;
            fragment.appendChild(el);
        });
        DOM.tagsArea.innerHTML = '';
        DOM.tagsArea.appendChild(fragment);
    }

    DOM.langToggleBtns.forEach(btn => {
        btn.onclick = () => { 
            currentLang = currentLang === 'ar' ? 'en' : 'ar'; 
            applyTranslations(); 
        };
    });

    if (DOM.tagsInput) {
        DOM.tagsInput.onkeyup = (e) => {
            if (e.key === 'Enter') {
                const val = DOM.tagsInput.value.trim().toLowerCase();
                if (val && !tags.has(val)) { tags.add(val); renderTags(); }
                DOM.tagsInput.value = '';
            }
        };
    }

    if (DOM.tagsArea) {
        DOM.tagsArea.onclick = (e) => { 
            if (e.target.classList.contains('close-btn')) { 
                tags.delete(e.target.dataset.tagValue); renderTags(); 
            } 
        };
    }

    DOM.startChatBtn.onclick = () => {
        searchTags = Array.from(tags);
        switchView('chat');
    };

    DOM.linkToPrivacy.onclick = (e) => { e.preventDefault(); switchView('privacy'); };
    DOM.linkToHome.onclick = (e) => { e.preventDefault(); switchView('home'); };
    
    DOM.leaveHomeButton.onclick = () => DOM.confirmModal.classList.remove('hidden');
    DOM.confirmNoBtn.onclick = () => DOM.confirmModal.classList.add('hidden');
    DOM.confirmYesBtn.onclick = () => {
        DOM.confirmModal.classList.add('hidden');
        switchView('home'); 
    };

    // مشاركة
    if (DOM.shareBtn) {
        DOM.shareBtn.onclick = async () => {
            const shareTitle = currentLang === 'ar' ? 'دردش مع المجهول في Chatchi' : 'Chat anonymously on Chatchi';
            const shareText = currentLang === 'ar' ? 'جرب تطبيق Chatchi! أفضل مساحة آمنة للدردشة. ادخل الآن:' : 'Try Chatchi! The best safe space for anonymous chats. Check it out:';
            const shareUrl = 'https://chatchi-ik3p.onrender.com';
            const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

            if (isNativeApp && window.Capacitor.Plugins.Share) {
                try { await window.Capacitor.Plugins.Share.share({ title: shareTitle, text: shareText, url: shareUrl }); } catch (e) { console.error(e); }
            } else if (navigator.share) {
                try { await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }); } catch (e) { console.error(e); }
            } else {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => { alert(currentLang === 'ar' ? 'تم النسخ!' : 'Copied!'); });
            }
        };
    }

    // ==========================================
    // 5. وظائف الدردشة (Chat)
    // ==========================================
    function filterLocalMessage(text) { return text.replace(forbiddenRegex, m => '*'.repeat(m.length)); }

    function displayMessage(msg, type) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}`;
        bubble.textContent = msg;
        DOM.messagesArea.appendChild(bubble);
        setTimeout(() => DOM.messagesArea.scrollTo({ top: DOM.messagesArea.scrollHeight, behavior: 'smooth' }), 50);
    }

    function sendMessage() {
        const raw = DOM.inputField.value.trim();
        if (raw && currentRoom) {
            const now = Date.now();
            if (raw === lastSentMessage) { displayMessage(translations[currentLang].spamDuplicate, 'system-message'); return; }
            if (now - lastSentTime < 500) { displayMessage(translations[currentLang].spamFast, 'system-message'); return; }

            DOM.skipButton.classList.remove('confirm-skip');
            lastSentMessage = raw; lastSentTime = now;

            socket.emit('chatMessage', { room: currentRoom, message: raw });
            displayMessage(filterLocalMessage(raw), 'my-message');
            DOM.inputField.value = ''; closeEmojiPicker(); DOM.inputField.focus(); 
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
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = DOM.skipButton.disabled = true; 
        DOM.skipButton.classList.remove('confirm-skip');
        DOM.leaveHomeButton.disabled = false; 
        DOM.chatStatus.dataset.keyStatus = 'statusSearching';
        DOM.chatStatus.dataset.matchType = '';
        
        lastSentMessage = ''; lastSentTime = 0;
        closeEmojiPicker(); startDotAnimation();
        socket.emit('findPartner', searchTags); 
    }

    function handleSkip() {
        if (!DOM.skipButton.classList.contains('confirm-skip')) {
            DOM.skipButton.classList.add('confirm-skip');
            return; 
        }
        DOM.skipButton.classList.remove('confirm-skip');
        if (currentRoom) { socket.emit('leaveRoom', currentRoom); currentRoom = ''; } 
        else { socket.emit('cancelSearch'); }
        startSearching();
    }

    function toggleEmojiPicker(e) {
        if(e) e.stopPropagation();
        DOM.emojiContainer.classList.toggle('hidden-emoji');
        DOM.emojiButton.classList.toggle('active');
        if (!DOM.emojiContainer.classList.contains('hidden-emoji')) DOM.inputField.blur(); 
    }

    function closeEmojiPicker() { DOM.emojiContainer.classList.add('hidden-emoji'); DOM.emojiButton.classList.remove('active'); }

    DOM.emojiPicker.addEventListener('emoji-click', event => {
        const input = DOM.inputField; const emoji = event.detail.unicode;
        const start = input.selectionStart; const end = input.selectionEnd; const text = input.value;
        input.value = text.slice(0, start) + emoji + text.slice(end);
        input.selectionStart = input.selectionEnd = start + emoji.length; input.focus();
    });

    DOM.emojiButton.addEventListener('click', toggleEmojiPicker);
    DOM.messagesArea.addEventListener('click', closeEmojiPicker);
    DOM.inputField.addEventListener('focus', closeEmojiPicker);

    DOM.sendButton.onclick = sendMessage;
    DOM.skipButton.onclick = handleSkip; 
    DOM.inputField.onkeyup = (e) => { if (e.key === 'Enter') sendMessage(); };
    DOM.inputField.oninput = () => {
        clearTimeout(typingTimer);
        if (DOM.inputField.value.trim()) {
            socket.emit('userTyping', { room: currentRoom });
            typingTimer = setTimeout(() => socket.emit('userStoppedTyping', { room: currentRoom }), typingTimeout);
        } else socket.emit('userStoppedTyping', { room: currentRoom });
    };

    DOM.inputField.addEventListener('focus', () => setTimeout(() => DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight, 300));
    window.addEventListener('resize', () => { if (document.activeElement === DOM.inputField) setTimeout(() => DOM.messagesArea.scrollTop = DOM.messagesArea.scrollHeight, 100); });

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
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = DOM.skipButton.disabled = false; 
        DOM.inputField.focus();
    });

    socket.on('partnerLeft', (d) => {
        stopDotAnimation(); currentRoom = '';
        const key = (d?.reason === 'sudden_disconnect') ? 'partnerSuddenLeft' : 'partnerLeft';
        displayMessage(translations[currentLang][key], 'system-message');
        DOM.inputField.disabled = DOM.sendButton.disabled = DOM.emojiButton.disabled = true;
        DOM.skipButton.disabled = false; DOM.skipButton.classList.remove('confirm-skip'); 
        DOM.chatStatus.textContent = translations[currentLang][key]; DOM.chatStatus.dataset.keyStatus = key;
        closeEmojiPicker(); autoRematchTimer = setTimeout(startSearching, 2000); 
    });

    socket.on('partnerAppStateChanged', (s) => {
        DOM.chatStatus.textContent = (s === 'inactive') ? translations[currentLang].partnerAway : translations[currentLang].statusMatchFoundRandom;
        if (s !== 'inactive') updateChatStatusUI();
    });

    socket.on('partnerTyping', () => DOM.chatStatus.textContent = translations[currentLang].partnerTyping);
    socket.on('partnerStoppedTyping', updateChatStatusUI);
    socket.on('chatMessage', (m) => displayMessage(filterLocalMessage(m), 'stranger-message'));
    socket.on('syncMessages', (msgs) => msgs.forEach(m => displayMessage(filterLocalMessage(m.message), 'stranger-message')));
    socket.on('spamWarning', (type) => displayMessage(type === 'duplicate' ? translations[currentLang].spamDuplicate : translations[currentLang].spamFast, 'system-message'));

    // ==========================================
    // 6. نظام الإعلانات والتحديث الإجباري
    // ==========================================
    async function checkUpdate() {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (isNativeApp) {
            try {
                const response = await fetch('https://chatchi-ik3p.onrender.com/api/app-version');
                const data = await response.json();
                if (data.forceUpdate && data.latestVersion !== APP_VERSION && DOM.updateOverlay) {
                    DOM.updateOverlay.classList.remove('hidden'); 
                    DOM.updateLink.href = data.playStoreUrl; 
                    DOM.updateLink.onclick = (e) => { e.preventDefault(); window.Capacitor.Plugins.App.openUrl({ url: data.playStoreUrl }); };
                }
            } catch (error) { console.error("خطأ التحديث:", error); }
        }
    }

    async function setupHybridAds() {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (isNativeApp) {
            document.querySelectorAll('script[src*="adsbygoogle"]').forEach(script => script.remove());
            try {
                const { AdMob } = Capacitor.Plugins;
                await AdMob.initialize();
                await AdMob.showBanner({ adId: 'ca-app-pub-4748269863410868/7009865744', adSize: 'BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: false });
            } catch (error) { console.error('خطأ AdMob:', error); }
        }
    }

    if (window.Capacitor) {
        const { App } = Capacitor.Plugins;
        App.addListener('backButton', () => {
            if (!DOM.emojiContainer.classList.contains('hidden-emoji')) closeEmojiPicker(); 
            else if (!DOM.confirmModal.classList.contains('hidden')) DOM.confirmModal.classList.add('hidden');
            else if (document.getElementById('view-chat').classList.contains('active')) DOM.confirmModal.classList.remove('hidden');
            else if (document.getElementById('view-privacy').classList.contains('active')) switchView('home');
            else App.exitApp();
        });
        App.addListener('appStateChange', ({ isActive }) => {
            if (currentRoom) {
                socket.emit('updateAppState', { state: isActive ? 'active' : 'inactive' });
                if (isActive) socket.emit('requestSync');
            } 
        }); 
    }

    // التشغيل الأولي
    applyTranslations();
    setupHybridAds();
    checkUpdate();
});