// --- public/index/index.js ---

document.addEventListener('DOMContentLoaded', () => {

    const APP_VERSION = "1.0.0"; // الإصدار كما طلبته

    // 1. محددات العناصر
    const DOM = {
        tagsInput: document.getElementById('tags-input'),
        tagsArea: document.getElementById('tags-area'),
        startChatBtn: document.getElementById('start-chat-btn'),
        langToggleButton: document.getElementById('lang-toggle'),
        shareBtn: document.getElementById('share-btn'),
        updateOverlay: document.getElementById('force-update-overlay'),
        updateLink: document.getElementById('update-link')
    };

    const tags = new Set();
    let currentLang = sessionStorage.getItem('chatchi_lang') || 'ar'; 

    // 2. قاموس الترجمة
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
            updateBtn: 'تحديث الآن'
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
            updateBtn: 'Update Now'
        }
    };

    // 3. وظيفة تطبيق الترجمة
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
    }

    // 4. وظيفة عرض الـ Tags
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

    // 5. نظام التحديث الإجباري
    async function checkUpdate() {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (isNativeApp) {
            try {
                const response = await fetch('https://chatchi-ik3p.onrender.com/api/app-version');
                const data = await response.json();
                if (data.forceUpdate && data.latestVersion !== APP_VERSION) {
                    showUpdateModal(data.playStoreUrl);
                }
            } catch (error) {
                console.error("خطأ في التحقق من التحديث:", error);
            }
        }
    }

    function showUpdateModal(url) {
        if (DOM.updateOverlay) {
            DOM.updateOverlay.classList.remove('hidden'); 
            DOM.updateLink.href = url; 
            DOM.startChatBtn.disabled = true; 
            DOM.updateLink.onclick = (e) => {
                if (window.Capacitor && window.Capacitor.Plugins.App) {
                    e.preventDefault();
                    window.Capacitor.Plugins.App.openUrl({ url: url });
                }
            };
        }
    }

    // 6. الأحداث (Events)
    if (DOM.langToggleButton) {
        DOM.langToggleButton.onclick = () => { 
            currentLang = currentLang === 'ar' ? 'en' : 'ar'; 
            applyTranslations(); 
        };
    }

    // نظام المشاركة الاحترافي
    if (DOM.shareBtn) {
        DOM.shareBtn.onclick = async () => {
            const shareTitle = currentLang === 'ar' ? 'دردش مع المجهول في Chatchi' : 'Chat anonymously on Chatchi';
            const shareText = currentLang === 'ar' 
                ? 'جرب تطبيق Chatchi! أفضل مساحة آمنة للدردشة المجهولة والعشوائية. ادخل الآن:' 
                : 'Try Chatchi! The best safe space for anonymous and random chats. Check it out:';
            const shareUrl = 'https://chatchi-ik3p.onrender.com';

            const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

            // استخدام مكتبة Share للهاتف إذا كانت متاحة
            if (isNativeApp && window.Capacitor.Plugins.Share) {
                try {
                    await window.Capacitor.Plugins.Share.share({
                        title: shareTitle,
                        text: shareText,
                        url: shareUrl,
                        dialogTitle: shareTitle
                    });
                } catch (e) {
                    console.error("Share API error:", e);
                }
            } 
            // استخدام Web Share API للمتصفحات
            else if (navigator.share) {
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: shareUrl
                    });
                } catch (e) {
                    console.error("Web Share API error:", e);
                }
            } 
            // بديل في حال عدم الدعم (نسخ الرابط)
            else {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
                    alert(currentLang === 'ar' ? 'تم نسخ الرابط للحافظة!' : 'Link copied to clipboard!');
                });
            }
        };
    }

    if (DOM.tagsInput) {
        DOM.tagsInput.onkeyup = (e) => {
            if (e.key === 'Enter') {
                const val = DOM.tagsInput.value.trim().toLowerCase();
                if (val && !tags.has(val)) { 
                    tags.add(val); 
                    renderTags(); 
                }
                DOM.tagsInput.value = '';
            }
        };
    }

    if (DOM.tagsArea) {
        DOM.tagsArea.onclick = (e) => { 
            if (e.target.classList.contains('close-btn')) { 
                tags.delete(e.target.dataset.tagValue); 
                renderTags(); 
            } 
        };
    }

    if (DOM.startChatBtn) {
        DOM.startChatBtn.onclick = () => {
            sessionStorage.setItem('chatchi_tags', JSON.stringify(Array.from(tags)));
            window.location.href = '/chat';
        };
    }

    // 7. نظام الإعلانات الهجين 
    async function setupHybridAds() {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

        if (isNativeApp) {
            const adSenseScripts = document.querySelectorAll('script[src*="adsbygoogle"]');
            adSenseScripts.forEach(script => script.remove());

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
    }

    
    applyTranslations();
    setupHybridAds();
    checkUpdate(); 
});