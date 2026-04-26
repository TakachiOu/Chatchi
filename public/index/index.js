// --- public/index/index.js ---

document.addEventListener('DOMContentLoaded', () => {

    // 1. محددات العناصر
    const DOM = {
        tagsInput: document.getElementById('tags-input'),
        tagsArea: document.getElementById('tags-area'),
        startChatBtn: document.getElementById('start-chat-btn'),
        langToggleButton: document.getElementById('lang-toggle')
    };

    const tags = new Set();
    // استرجاع اللغة المحفوظة أو استخدام العربية كافتراضي
    let currentLang = sessionStorage.getItem('chatchi_lang') || 'ar'; 

    // 2. قاموس الترجمة (للصفحة الرئيسية فقط)
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
            feature3: '<strong>مطابقة ذكية:</strong> استعمل tag إن أحببت، وإن لم تجد أحدًا، غيّره أو ادخل بدون tag.',
            rulesTitle: 'قواعد المنصة',
            rule1: 'لضمان تواصلٍ ممتع ومستمر، يُرجى البقاء في غرفة الدردشة وعدم مغادرتها حتى لا تنقطع المحادثة بين الطرفين.',
            rule2: 'لتبقى هذه المساحة نقية، يُمنع منعاً باتاً السب، الشتم، أو استغلال المنصة فيما حرمه الله. اتقِ الله في قولك، فما تكتبه مسجلٌ في صحيفتك.',
            rule3: 'استمتع بتجربتك وكن سبباً في جعل تجربة الآخرين ممتعة.',
            privacyLink: 'سياسة الخصوصية',
            copyright: '© 2026 Chatchi. جميع الحقوق محفوظة.',
            credit: 'صُنع بكل ❤️ بواسطة <a href="#" class="credit-link">TaKaChi</a>'
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
            feature3: '<strong>Smart Matching:</strong> Use tags or go random.',
            rulesTitle: 'Platform Rules',
            rule1: 'To ensure an enjoyable and continuous conversation, please remain in the chat room.',
            rule2: 'No profanity allowed. Every word is recorded in your deeds.',
            rule3: 'Enjoy and be kind.',
            privacyLink: 'Privacy Policy',
            copyright: '© 2026 Chatchi. All rights reserved.',
            credit: 'Made with ❤️ by <a href="#" class="credit-link">TaKaChi</a>'
        }
    };

    // 3. وظيفة تطبيق الترجمة
    function applyTranslations() {
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        
        // حفظ اللغة المحددة لكي تتذكرها صفحة الدردشة وصفحة الخصوصية
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

    // 5. الأحداث (Events)
    
    // زر تغيير اللغة
    if (DOM.langToggleButton) {
        DOM.langToggleButton.onclick = () => { 
            currentLang = currentLang === 'ar' ? 'en' : 'ar'; 
            applyTranslations(); 
        };
    }

    // إدخال الـ Tags
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

    // حذف الـ Tags
    if (DOM.tagsArea) {
        DOM.tagsArea.onclick = (e) => { 
            if (e.target.classList.contains('close-btn')) { 
                tags.delete(e.target.dataset.tagValue); 
                renderTags(); 
            } 
        };
    }

    // زر "ابحث عن شخص" (الحدث الأهم)
    if (DOM.startChatBtn) {
        DOM.startChatBtn.onclick = () => {
            // 1. نحفظ الـ Tags في الذاكرة المؤقتة لتقرأها صفحة الدردشة
            sessionStorage.setItem('chatchi_tags', JSON.stringify(Array.from(tags)));
            // 2. الانتقال إلى صفحة الدردشة باستخدام الرابط النظيف
            window.location.href = '/chat';
        };
    }

    // 6. نظام الإعلانات الهجين (Hybrid Ads)
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
        // في حال كان المستخدم في المتصفح، سيعمل AdSense طبيعياً ولا نحتاج لأي تدخل برمجي هنا
    }

    // 7. تهيئة الصفحة عند التحميل
    applyTranslations();
    setupHybridAds();
});