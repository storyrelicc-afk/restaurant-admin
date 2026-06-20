/**
 * i18n.js — Çok dilli UI metinleri ve dil yönetimi
 * Tüm sayfalar (index.html, menu.html) bu dosyayı paylaşır.
 */

const UI_TEXT = {
  tr: {
    nav_about: "Hikayemiz", nav_menu: "Menü", nav_gallery: "Galeri",
    nav_reviews: "Yorumlar", nav_contact: "İletişim", nav_reserve: "Rezervasyon",
    hero_scroll: "Kaydır",
    about_eyebrow: "Hikayemiz", about_title_1: "Tutku", about_title_2: "Ateşle", about_title_3: "Yaratıldı",
    menu_eyebrow: "Mutfak Yolculuğu", menu_title: "Menümüz",
    menu_view_all: "Tüm Menüyü Görüntüle →", menu_all_cat: "Tümü",
    menu_chef_pick: "Şef'in Seçimi",
    menu_back: "← Ana Sayfa",
    gallery_eyebrow: "Görsel Şölen", gallery_title: "Galerimiz",
    res_eyebrow: "Rezervasyon", res_title_1: "Unutulmaz Bir", res_title_2: "Akşam", res_title_3: "Ayırtın",
    res_subtitle: "Hafta sonu akşamları için en az 48 saat öncesinden rezervasyon öneriyoruz.",
    res_name: "Ad Soyad", res_phone: "Telefon", res_email: "E-Posta", res_guests: "Kişi Sayısı",
    res_date: "Tarih", res_time: "Saat", res_notes: "Özel İstek",
    res_notes_ph: "Alerji, özel gün, oturma tercihi...",
    res_select_guests: "Kişi seçin", res_select_time: "Saat seçin",
    res_submit: "Rezervasyonu Onayla",
    res_note: "2 saat içinde telefon veya e-posta ile onaylayacağız.",
    res_guest_opts: ["1 Kişi","2 Kişi","3 Kişi","4 Kişi","5 Kişi","6 Kişi","7–10 Kişi","10+ Kişi"],
    testi_eyebrow: "Misafir Yorumları", testi_title: "Misafirlerimiz Ne Diyor",
    contact_eyebrow: "Bizi Bulun", contact_title_1: "Restoranımıza", contact_title_2: "Bekleriz",
    contact_address: "Adres", contact_phone: "Telefon", contact_email: "E-Posta", contact_hours: "Çalışma Saatleri",
    contact_directions: "Yol Tarifi Al →",
    footer_nav: "Navigasyon", footer_exp: "Deneyim", footer_contact: "İletişim",
    footer_private: "Özel Yemek", footer_corp: "Kurumsal", footer_wine: "Şarap Mahzeni", footer_chef: "Şef Masası",
    footer_rights: "Tüm hakları saklıdır.",
    toast_required: "⚠ Ad ve tarih zorunludur.",
    toast_success: "✓ Rezervasyonunuz alındı! 2 saat içinde onaylayacağız.",
    whatsapp_tip: "WhatsApp'ta Yaz",
  },
  en: {
    nav_about: "Our Story", nav_menu: "Menu", nav_gallery: "Gallery",
    nav_reviews: "Reviews", nav_contact: "Contact", nav_reserve: "Reservation",
    hero_scroll: "Scroll",
    about_eyebrow: "Our Story", about_title_1: "Crafted with", about_title_2: "Passion", about_title_3: "& Fire",
    menu_eyebrow: "Culinary Journey", menu_title: "Our Menu",
    menu_view_all: "View Full Menu →", menu_all_cat: "All",
    menu_chef_pick: "Chef's Pick",
    menu_back: "← Back to Home",
    gallery_eyebrow: "Visual Feast", gallery_title: "Our Gallery",
    res_eyebrow: "Reservation", res_title_1: "Reserve a", res_title_2: "Memorable", res_title_3: "Evening",
    res_subtitle: "We recommend booking at least 48 hours in advance for weekend evenings.",
    res_name: "Full Name", res_phone: "Phone", res_email: "Email", res_guests: "Guests",
    res_date: "Date", res_time: "Time", res_notes: "Special Request",
    res_notes_ph: "Allergies, special occasion, seating preference...",
    res_select_guests: "Select guests", res_select_time: "Select time",
    res_submit: "Confirm Reservation",
    res_note: "We will confirm within 2 hours via phone or email.",
    res_guest_opts: ["1 Guest","2 Guests","3 Guests","4 Guests","5 Guests","6 Guests","7–10 Guests","10+ Guests"],
    testi_eyebrow: "Guest Reviews", testi_title: "What Our Guests Say",
    contact_eyebrow: "Find Us", contact_title_1: "Come & Visit", contact_title_2: "Our Restaurant",
    contact_address: "Address", contact_phone: "Phone", contact_email: "Email", contact_hours: "Opening Hours",
    contact_directions: "Get Directions →",
    footer_nav: "Navigation", footer_exp: "Experience", footer_contact: "Contact",
    footer_private: "Private Dining", footer_corp: "Corporate", footer_wine: "Wine Cellar", footer_chef: "Chef's Table",
    footer_rights: "All rights reserved.",
    toast_required: "⚠ Name and date are required.",
    toast_success: "✓ Reservation received! We'll confirm within 2 hours.",
    whatsapp_tip: "Chat on WhatsApp",
  },
  ja: {
    nav_about: "私たちの物語", nav_menu: "メニュー", nav_gallery: "ギャラリー",
    nav_reviews: "レビュー", nav_contact: "お問い合わせ", nav_reserve: "予約",
    hero_scroll: "スクロール",
    about_eyebrow: "私たちの物語", about_title_1: "情熱で", about_title_2: "つくられた", about_title_3: "炎の味",
    menu_eyebrow: "美食の旅", menu_title: "メニュー",
    menu_view_all: "全メニューを見る →", menu_all_cat: "すべて",
    menu_chef_pick: "シェフのおすすめ",
    menu_back: "← ホームへ戻る",
    gallery_eyebrow: "ビジュアルフィースト", gallery_title: "ギャラリー",
    res_eyebrow: "予約", res_title_1: "忘れられない", res_title_2: "夜を", res_title_3: "予約する",
    res_subtitle: "週末の夜は少なくとも48時間前のご予約をお勧めします。",
    res_name: "お名前", res_phone: "電話番号", res_email: "メール", res_guests: "人数",
    res_date: "日付", res_time: "時間", res_notes: "特別なリクエスト",
    res_notes_ph: "アレルギー、特別な日、席のご希望など...",
    res_select_guests: "人数を選択", res_select_time: "時間を選択",
    res_submit: "予約を確定する",
    res_note: "2時間以内に電話またはメールでご連絡いたします。",
    res_guest_opts: ["1名","2名","3名","4名","5名","6名","7〜10名","10名以上"],
    testi_eyebrow: "お客様の声", testi_title: "お客様からのレビュー",
    contact_eyebrow: "アクセス", contact_title_1: "ご来店を", contact_title_2: "お待ちしております",
    contact_address: "住所", contact_phone: "電話番号", contact_email: "メール", contact_hours: "営業時間",
    contact_directions: "道順を見る →",
    footer_nav: "ナビゲーション", footer_exp: "体験", footer_contact: "お問い合わせ",
    footer_private: "個室ダイニング", footer_corp: "法人利用", footer_wine: "ワインセラー", footer_chef: "シェフズテーブル",
    footer_rights: "全著作権所有。",
    toast_required: "⚠ お名前と日付は必須です。",
    toast_success: "✓ ご予約を受け付けました！2時間以内にご連絡いたします。",
    whatsapp_tip: "WhatsAppでチャット",
  },
  zh: {
    nav_about: "我们的故事", nav_menu: "菜单", nav_gallery: "画廊",
    nav_reviews: "评价", nav_contact: "联系我们", nav_reserve: "预订",
    hero_scroll: "向下滚动",
    about_eyebrow: "我们的故事", about_title_1: "用激情", about_title_2: "与火焰", about_title_3: "精心打造",
    menu_eyebrow: "美食之旅", menu_title: "我们的菜单",
    menu_view_all: "查看完整菜单 →", menu_all_cat: "全部",
    menu_chef_pick: "主厨推荐",
    menu_back: "← 返回首页",
    gallery_eyebrow: "视觉盛宴", gallery_title: "我们的画廊",
    res_eyebrow: "预订", res_title_1: "预订一个", res_title_2: "难忘的", res_title_3: "夜晚",
    res_subtitle: "周末晚上建议至少提前48小时预订。",
    res_name: "姓名", res_phone: "电话", res_email: "邮箱", res_guests: "人数",
    res_date: "日期", res_time: "时间", res_notes: "特殊要求",
    res_notes_ph: "过敏信息、特殊场合、座位偏好...",
    res_select_guests: "选择人数", res_select_time: "选择时间",
    res_submit: "确认预订",
    res_note: "我们将在2小时内通过电话或邮件确认。",
    res_guest_opts: ["1位","2位","3位","4位","5位","6位","7–10位","10位以上"],
    testi_eyebrow: "宾客评价", testi_title: "宾客评价",
    contact_eyebrow: "找到我们", contact_title_1: "欢迎光临", contact_title_2: "我们的餐厅",
    contact_address: "地址", contact_phone: "电话", contact_email: "邮箱", contact_hours: "营业时间",
    contact_directions: "获取路线 →",
    footer_nav: "导航", footer_exp: "体验", footer_contact: "联系方式",
    footer_private: "私人用餐", footer_corp: "企业预订", footer_wine: "酒窖", footer_chef: "主厨餐桌",
    footer_rights: "版权所有。",
    toast_required: "⚠ 姓名和日期为必填项。",
    toast_success: "✓ 已收到您的预订！我们将在2小时内确认。",
    whatsapp_tip: "在WhatsApp上聊天",
  },
  ru: {
    nav_about: "Наша история", nav_menu: "Меню", nav_gallery: "Галерея",
    nav_reviews: "Отзывы", nav_contact: "Контакты", nav_reserve: "Бронирование",
    hero_scroll: "Прокрутите",
    about_eyebrow: "Наша история", about_title_1: "Создано", about_title_2: "со страстью", about_title_3: "и огнём",
    menu_eyebrow: "Кулинарное путешествие", menu_title: "Наше меню",
    menu_view_all: "Посмотреть всё меню →", menu_all_cat: "Все",
    menu_chef_pick: "Выбор шефа",
    menu_back: "← На главную",
    gallery_eyebrow: "Визуальный праздник", gallery_title: "Наша галерея",
    res_eyebrow: "Бронирование", res_title_1: "Забронируйте", res_title_2: "незабываемый", res_title_3: "вечер",
    res_subtitle: "Рекомендуем бронировать минимум за 48 часов для вечеров выходного дня.",
    res_name: "Полное имя", res_phone: "Телефон", res_email: "Эл. почта", res_guests: "Гостей",
    res_date: "Дата", res_time: "Время", res_notes: "Особые пожелания",
    res_notes_ph: "Аллергии, особый случай, предпочтения по месту...",
    res_select_guests: "Выберите количество", res_select_time: "Выберите время",
    res_submit: "Подтвердить бронирование",
    res_note: "Мы подтвердим в течение 2 часов по телефону или email.",
    res_guest_opts: ["1 гость","2 гостя","3 гостя","4 гостя","5 гостей","6 гостей","7–10 гостей","10+ гостей"],
    testi_eyebrow: "Отзывы гостей", testi_title: "Что говорят наши гости",
    contact_eyebrow: "Найдите нас", contact_title_1: "Приходите в", contact_title_2: "наш ресторан",
    contact_address: "Адрес", contact_phone: "Телефон", contact_email: "Эл. почта", contact_hours: "Часы работы",
    contact_directions: "Построить маршрут →",
    footer_nav: "Навигация", footer_exp: "Опыт", footer_contact: "Контакты",
    footer_private: "Приватный ужин", footer_corp: "Корпоративные", footer_wine: "Винный погреб", footer_chef: "Стол шефа",
    footer_rights: "Все права защищены.",
    toast_required: "⚠ Имя и дата обязательны.",
    toast_success: "✓ Бронирование получено! Подтвердим в течение 2 часов.",
    whatsapp_tip: "Написать в WhatsApp",
  },
  de: {
    nav_about: "Unsere Geschichte", nav_menu: "Speisekarte", nav_gallery: "Galerie",
    nav_reviews: "Bewertungen", nav_contact: "Kontakt", nav_reserve: "Reservierung",
    hero_scroll: "Scrollen",
    about_eyebrow: "Unsere Geschichte", about_title_1: "Mit Leidenschaft", about_title_2: "und Feuer", about_title_3: "geschaffen",
    menu_eyebrow: "Kulinarische Reise", menu_title: "Unsere Speisekarte",
    menu_view_all: "Komplette Speisekarte ansehen →", menu_all_cat: "Alle",
    menu_chef_pick: "Empfehlung des Küchenchefs",
    menu_back: "← Zurück zur Startseite",
    gallery_eyebrow: "Visuelles Fest", gallery_title: "Unsere Galerie",
    res_eyebrow: "Reservierung", res_title_1: "Reservieren Sie einen", res_title_2: "unvergesslichen", res_title_3: "Abend",
    res_subtitle: "Wir empfehlen, an Wochenend-Abenden mindestens 48 Stunden im Voraus zu reservieren.",
    res_name: "Vollständiger Name", res_phone: "Telefon", res_email: "E-Mail", res_guests: "Gäste",
    res_date: "Datum", res_time: "Uhrzeit", res_notes: "Besondere Wünsche",
    res_notes_ph: "Allergien, besonderer Anlass, Sitzplatzwunsch...",
    res_select_guests: "Gäste auswählen", res_select_time: "Uhrzeit auswählen",
    res_submit: "Reservierung bestätigen",
    res_note: "Wir bestätigen innerhalb von 2 Stunden per Telefon oder E-Mail.",
    res_guest_opts: ["1 Gast","2 Gäste","3 Gäste","4 Gäste","5 Gäste","6 Gäste","7–10 Gäste","10+ Gäste"],
    testi_eyebrow: "Gästebewertungen", testi_title: "Was unsere Gäste sagen",
    contact_eyebrow: "Finden Sie uns", contact_title_1: "Besuchen Sie", contact_title_2: "unser Restaurant",
    contact_address: "Adresse", contact_phone: "Telefon", contact_email: "E-Mail", contact_hours: "Öffnungszeiten",
    contact_directions: "Route anzeigen →",
    footer_nav: "Navigation", footer_exp: "Erlebnis", footer_contact: "Kontakt",
    footer_private: "Privates Dining", footer_corp: "Firmenfeiern", footer_wine: "Weinkeller", footer_chef: "Chef's Table",
    footer_rights: "Alle Rechte vorbehalten.",
    toast_required: "⚠ Name und Datum sind erforderlich.",
    toast_success: "✓ Reservierung erhalten! Wir bestätigen innerhalb von 2 Stunden.",
    whatsapp_tip: "Auf WhatsApp chatten",
  }
};

const LANG_META = {
  tr: { label: "Türkçe",  flag: "🇹🇷" },
  en: { label: "English", flag: "🇬🇧" },
  ja: { label: "日本語",   flag: "🇯🇵" },
  zh: { label: "中文",     flag: "🇨🇳" },
  ru: { label: "Русский", flag: "🇷🇺" },
  de: { label: "Deutsch", flag: "🇩🇪" }
};

// ── Dil yönetimi ──────────────────────────────────────────────
function getCurrentLang() {
  try {
    const stored = localStorage.getItem('siteLang');
    if (stored && UI_TEXT[stored]) return stored;
  } catch {}
  // Tarayıcı dilini algıla, desteklenmiyorsa TR'ye dön
  const browserLang = (navigator.language || 'tr').slice(0,2).toLowerCase();
  return UI_TEXT[browserLang] ? browserLang : 'tr';
}

function setCurrentLang(lang) {
  if (!UI_TEXT[lang]) return;
  try { localStorage.setItem('siteLang', lang); } catch {}
}

// t(key) — geçerli dildeki UI metnini döner
function t(key) {
  const lang = getCurrentLang();
  return (UI_TEXT[lang] && UI_TEXT[lang][key]) || (UI_TEXT.tr[key]) || key;
}

// tf(obj) — çok dilli bir veri objesinden ({tr:"...",en:"...",...}) geçerli dile uygun metni çıkarır
// obj string ise direkt onu döner (eski tek-dilli veri ile uyumluluk için)
function tf(obj, fallbackLang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const lang = getCurrentLang();
  return obj[lang] || obj[fallbackLang||'tr'] || obj.tr || obj.en || Object.values(obj)[0] || '';
}

// Dil seçici dropdown'ı oluşturup verilen container'a ekler
function renderLangSwitcher(containerId, onChangeCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = getCurrentLang();
  container.innerHTML = `
    <div class="lang-switcher" id="lang-switcher-root">
      <button class="lang-btn" id="lang-btn-toggle" aria-label="Dil seçimi">
        <span>${LANG_META[current].flag}</span>
        <span class="lang-code">${current.toUpperCase()}</span>
        <span class="lang-arrow">▾</span>
      </button>
      <div class="lang-dropdown" id="lang-dropdown">
        ${Object.keys(LANG_META).map(code => `
          <div class="lang-opt ${code===current?'active':''}" data-lang="${code}">
            <span class="lang-flag">${LANG_META[code].flag}</span>
            <span>${LANG_META[code].label}</span>
            ${code===current?'<span class="lang-check">✓</span>':''}
          </div>
        `).join('')}
      </div>
    </div>`;

  const btn = document.getElementById('lang-btn-toggle');
  const dropdown = document.getElementById('lang-dropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
  dropdown.querySelectorAll('.lang-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newLang = opt.dataset.lang;
      setCurrentLang(newLang);
      dropdown.classList.remove('open');
      if (onChangeCallback) onChangeCallback(newLang);
      else window.location.reload();
    });
  });
}
