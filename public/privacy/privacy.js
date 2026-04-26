document.addEventListener('DOMContentLoaded', () => {

    // محددات العناصر
    const langToggleButton = document.getElementById('lang-toggle');
    let currentLang = 'ar'; // اللغة الافتراضية

    // =================================
    // قاموس الترجمة لصفحة الخصوصية
    // =================================
    const translations = {
        ar: {
            langToggle: 'English',
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
            cookiesText: 'نحن نستخدم خدمات جهات خارجية (مثل Google AdSense) لعرض الإعلانات. قد تستخدم هذه الجهات ملفات تعريف الارتباط (Cookies) لتقديم إعلانات مخصصة بناءً على زياراتك السابقة لهذا الموقع أو مواقع أخرى على الإنترنت. يمكنك إدارة تفضيلات الإعلانات الخاصة بك من خلال إعدادات حساب Google الخاص بك.',
            
            consentTitle: 'موافقتك',
            consentText: 'باستخدامك لموقع Chatchi، فإنك توافق على سياسة الخصوصية الخاصة بنا الموضحة في هذه الصفحة.',
            
            copyright: '© 2026 Chatchi. جميع الحقوق محفوظة.'
        },
        en: {
            langToggle: 'العربية',
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
            cookiesText: 'We use third-party services (like Google AdSense) to display ads. These parties may use cookies to serve personalized ads based on your previous visits to this or other websites. You can manage your ad preferences through your Google account settings.',
            
            consentTitle: 'Your Consent',
            consentText: 'By using Chatchi, you consent to our Privacy Policy outlined on this page.',
            
            copyright: '© 2026 Chatchi. All rights reserved.'
        }
    };

    // =================================
    // وظيفة تطبيق الترجمة (نسخة مطورة ومضمونة)
    // =================================
    function applyTranslations() {
        // 1. تحديث لغة واتجاه المستند
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

        // 2. البحث عن كل العناصر التي تحمل data-key وتحديثها
        const elements = document.querySelectorAll('[data-key]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-key');
            if (translations[currentLang] && translations[currentLang][key]) {
                // تحديث النص الداخلي للعنصر
                element.innerText = translations[currentLang][key];
            }
        });

        // 3. تحديث عنوان التبويب في المتصفح (Browser Tab Title)
        document.title = translations[currentLang].pageTitle + " - Chatchi";
    }

    // =================================
    // مستمع حدث زر تغيير اللغة
    // =================================
    if (langToggleButton) {
        langToggleButton.addEventListener('click', (e) => {
            e.preventDefault(); // منع أي سلوك افتراضي
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            applyTranslations();
        });
    }

    // تشغيل الترجمة لأول مرة عند تحميل الصفحة لضمان المزامنة
    applyTranslations();

});