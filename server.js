/**
 * Restaurant Admin Panel Server
 * Ana site: http://localhost:3000
 * Admin panel: http://localhost:3000/admin  (kurulum sihirbazından belirlenir)
 */

const http = require('http');
const https = require('https');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;

// ─── STORAGE ──────────────────────────────────────────────────
// Railway'de Volume KULLANMIYORUZ (sorun çıkarıyor).
// Veriler /app/data'da tutulur — deploy'da sıfırlanır AMA
// tüm kritik ayarlar Railway Variables'dan okunur (kalıcı).
const DATA_DIR   = path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// ─── RAILWAY VARIABLES → KALICI AYARLAR ──────────────────────
// Railway Dashboard → Variables'a bunları ekle:
//   ADMIN_USER  = kullaniciadi
//   ADMIN_PASS  = sifre
//   DB_JSON     = (boş bırak, ilk kurulumda otomatik dolar)
// Deploy sonrası ADMIN_USER ve ADMIN_PASS Variables'dan okunur.
const ENV_ADMIN_USER = process.env.ADMIN_USER || null;
const ENV_ADMIN_PASS = process.env.ADMIN_PASS || null;

// ─── MIME TYPES ───────────────────────────────────────────────
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css',
  '.js':'application/javascript',     '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
};

// ─── DB HELPERS ───────────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return getDefaultDB(); }
}
function writeDB(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// ─── E-POSTA (RESEND) ─────────────────────────────────────────
// Railway Variables'a ekle: RESEND_API_KEY = re_xxxxx
const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
const RESEND_FROM    = process.env.RESEND_FROM || 'onboarding@resend.dev';

function sendEmail({to, subject, html}) {
  if (!RESEND_API_KEY) {
    console.log('⚠️  RESEND_API_KEY tanımlı değil, mail gönderilemedi:', subject);
    return Promise.resolve({skipped: true});
  }
  if (!to) {
    console.log('⚠️  Alıcı e-posta adresi yok, mail gönderilemedi.');
    return Promise.resolve({skipped: true});
  }
  const payload = JSON.stringify({ from: RESEND_FROM, to: [to], subject, html });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ Mail gönderildi:', to, '|', subject);
        } else {
          console.error('✗ Mail gönderilemedi:', res.statusCode, body);
        }
        resolve({statusCode: res.statusCode, body});
      });
    });
    req.on('error', (e) => {
      console.error('✗ Mail gönderim hatası:', e.message);
      resolve({error: e.message});
    });
    req.write(payload);
    req.end();
  });
}

function buildReservationEmail(r, db, status) {
  const name   = db.settings.restaurantName || 'Restoranımız';
  const color  = db.settings.primaryColor || '#c9a84c';
  const phone  = db.settings.phone || '';
  const isConfirmed = status === 'confirmed';
  const title  = isConfirmed ? 'Rezervasyonunuz Onaylandı ✓' : 'Rezervasyonunuz İptal Edildi';
  const msg    = isConfirmed
    ? `Merhaba ${r.name},<br><br><strong>${name}</strong>'daki rezervasyonunuz onaylanmıştır. Sizi ağırlamaktan mutluluk duyacağız.`
    : `Merhaba ${r.name},<br><br><strong>${name}</strong>'daki rezervasyon talebiniz iptal edilmiştir. Sorularınız için bizimle iletişime geçebilirsiniz.`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="color:${color};margin-bottom:4px">${title}</h2>
    <p style="color:#333;line-height:1.6">${msg}</p>
    <table style="width:100%;margin:20px 0;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#888">Tarih</td><td style="padding:6px 0;font-weight:600">${r.date}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Saat</td><td style="padding:6px 0;font-weight:600">${r.time||'-'}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Kişi Sayısı</td><td style="padding:6px 0;font-weight:600">${r.guests||'-'}</td></tr>
      ${r.notes?`<tr><td style="padding:6px 0;color:#888">Not</td><td style="padding:6px 0">${r.notes}</td></tr>`:''}
    </table>
    ${phone?`<p style="color:#888;font-size:13px">Sorularınız için: ${phone}</p>`:''}
    <p style="color:#aaa;font-size:12px;margin-top:24px">${name}</p>
  </div>`;

  return { subject: `${name} – ${title}`, html };
}
// ─── BASİT ÇEVİRİ SÖZLÜĞÜ (API'siz) ───────────────────────────
// Restoran/menü dünyasında en sık geçen kelime ve kalıpları kapsar.
// Sözlükte olmayan kelimeler olduğu gibi (TR) bırakılır; admin elle düzeltebilir.
const TRANSLATE_DICT = {
  // ── Yiyecek/içecek temel kelimeler ─────────────────────────
  "salata":{en:"salad",ja:"サラダ",zh:"沙拉",ru:"салат",de:"Salat"},
  "çorba":{en:"soup",ja:"スープ",zh:"汤",ru:"суп",de:"Suppe"},
  "tavuk":{en:"chicken",ja:"チキン",zh:"鸡肉",ru:"курица",de:"Hühnchen"},
  "balık":{en:"fish",ja:"魚",zh:"鱼",ru:"рыба",de:"Fisch"},
  "et":{en:"meat",ja:"肉",zh:"肉",ru:"мясо",de:"Fleisch"},
  "biftek":{en:"steak",ja:"ステーキ",zh:"牛排",ru:"стейк",de:"Steak"},
  "kuzu":{en:"lamb",ja:"ラム",zh:"羊肉",ru:"баранина",de:"Lamm"},
  "dana":{en:"beef",ja:"ビーフ",zh:"牛肉",ru:"говядина",de:"Rindfleisch"},
  "karides":{en:"shrimp",ja:"エビ",zh:"虾",ru:"креветка",de:"Garnele"},
  "mantar":{en:"mushroom",ja:"キノコ",zh:"蘑菇",ru:"грибы",de:"Pilz"},
  "pirinç":{en:"rice",ja:"米",zh:"米饭",ru:"рис",de:"Reis"},
  "patates":{en:"potato",ja:"ポテト",zh:"土豆",ru:"картофель",de:"Kartoffel"},
  "domates":{en:"tomato",ja:"トマト",zh:"番茄",ru:"помидор",de:"Tomate"},
  "soğan":{en:"onion",ja:"オニオン",zh:"洋葱",ru:"лук",de:"Zwiebel"},
  "sarımsak":{en:"garlic",ja:"ガーリック",zh:"大蒜",ru:"чеснок",de:"Knoblauch"},
  "biber":{en:"pepper",ja:"ピーマン",zh:"辣椒",ru:"перец",de:"Paprika"},
  "limon":{en:"lemon",ja:"レモン",zh:"柠檬",ru:"лимон",de:"Zitrone"},
  "zeytin":{en:"olive",ja:"オリーブ",zh:"橄榄",ru:"оливки",de:"Olive"},
  "peynir":{en:"cheese",ja:"チーズ",zh:"芝士",ru:"сыр",de:"Käse"},
  "yumurta":{en:"egg",ja:"卵",zh:"鸡蛋",ru:"яйцо",de:"Ei"},
  "ekmek":{en:"bread",ja:"パン",zh:"面包",ru:"хлеб",de:"Brot"},
  "çikolata":{en:"chocolate",ja:"チョコレート",zh:"巧克力",ru:"шоколад",de:"Schokolade"},
  "dondurma":{en:"ice cream",ja:"アイスクリーム",zh:"冰淇淋",ru:"мороженое",de:"Eis"},
  "kahve":{en:"coffee",ja:"コーヒー",zh:"咖啡",ru:"кофе",de:"Kaffee"},
  "çay":{en:"tea",ja:"お茶",zh:"茶",ru:"чай",de:"Tee"},
  "şarap":{en:"wine",ja:"ワイン",zh:"葡萄酒",ru:"вино",de:"Wein"},
  "bira":{en:"beer",ja:"ビール",zh:"啤酒",ru:"пиво",de:"Bier"},
  "su":{en:"water",ja:"水",zh:"水",ru:"вода",de:"Wasser"},
  "tatlı":{en:"dessert",ja:"デザート",zh:"甜点",ru:"десерт",de:"Dessert"},
  "başlangıç":{en:"starter",ja:"前菜",zh:"开胃菜",ru:"закуска",de:"Vorspeise"},
  "ana yemek":{en:"main course",ja:"メイン料理",zh:"主菜",ru:"основное блюдо",de:"Hauptgericht"},
  "içecek":{en:"drink",ja:"飲み物",zh:"饮品",ru:"напиток",de:"Getränk"},
  "ızgara":{en:"grilled",ja:"グリル",zh:"烤",ru:"гриль",de:"gegrillt"},
  "fırın":{en:"oven-baked",ja:"オーブン焼き",zh:"烤箱烤制",ru:"запечённый",de:"gebacken"},
  "taze":{en:"fresh",ja:"新鮮な",zh:"新鲜",ru:"свежий",de:"frisch"},
  "özel":{en:"special",ja:"特別な",zh:"特色",ru:"特殊",de:"besonders"},
  "geleneksel":{en:"traditional",ja:"伝統的な",zh:"传统",ru:"традиционный",de:"traditionell"},
  "ev yapımı":{en:"homemade",ja:"自家製",zh:"自制",ru:"домашний",de:"hausgemacht"},
  "mevsim":{en:"seasonal",ja:"季節の",zh:"季节性",ru:"сезонный",de:"saisonal"},
  "sos":{en:"sauce",ja:"ソース",zh:"酱汁",ru:"соус",de:"Sauce"},
  "garnitür":{en:"garnish",ja:"付け合わせ",zh:"配菜",ru:"гарнир",de:"Garnitur"},
  // ── Genel ifadeler / kategori isimleri ──────────────────────
  "başlangıçlar":{en:"Starters",ja:"前菜",zh:"开胃菜",ru:"Закуски",de:"Vorspeisen"},
  "ana yemekler":{en:"Main Courses",ja:"メイン料理",zh:"主菜",ru:"Основные блюда",de:"Hauptgerichte"},
  "izgaralar":{en:"Grills",ja:"グリル",zh:"烤类",ru:"Гриль",de:"Grillgerichte"},
  "tatlılar":{en:"Desserts",ja:"デザート",zh:"甜点",ru:"Десерты",de:"Desserts"},
  "içecekler":{en:"Drinks",ja:"飲み物",zh:"饮品",ru:"Напитки",de:"Getränke"},
  "salatalar":{en:"Salads",ja:"サラダ",zh:"沙拉",ru:"Салаты",de:"Salate"},
  "çorbalar":{en:"Soups",ja:"スープ",zh:"汤类",ru:"Супы",de:"Suppen"},
  "deniz ürünleri":{en:"Seafood",ja:"シーフード",zh:"海鲜",ru:"Морепродукты",de:"Meeresfrüchte"},
  "vejeteryan":{en:"Vegetarian",ja:"ベジタリアン",zh:"素食",ru:"Вегетарианское",de:"Vegetarisch"},
  "kebaplar":{en:"Kebabs",ja:"ケバブ",zh:"烤肉串",ru:"Кебабы",de:"Kebabs"},
  "pizzalar":{en:"Pizzas",ja:"ピザ",zh:"披萨",ru:"Пиццы",de:"Pizzen"},
  "makarnalar":{en:"Pastas",ja:"パスタ",zh:"意面",ru:"Паста",de:"Pasta"},
  "mezeler":{en:"Mezze",ja:"メゼ",zh:"开胃小菜",ru:"Мезе",de:"Mezze"},
  "suşiler":{en:"Sushi",ja:"寿司",zh:"寿司",ru:"Суши",de:"Sushi"},
  "noodle":{en:"Noodles",ja:"麺類",zh:"面条",ru:"Лапша",de:"Nudeln"},
  "dim sum":{en:"Dim Sum",ja:"点心",zh:"点心",ru:"Дим-сам",de:"Dim Sum"},
};

// Türkçe metni hedef dile çevirir (kelime/kalıp eşleştirme).
// Sözlükte tam eşleşme varsa direkt onu döner.
// Yoksa kelime kelime gezip bulduğu kısımları çevirir, kalanı olduğu gibi bırakır.
function trLower(s) {
  // JS'in toLowerCase() İ/I harflerini yanlış çevirir (İstanbul -> i̇stanbul gibi sorunlu)
  // Türkçe'ye özel düzgün lowercase:
  return s.replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase();
}
function translateText(text, lang) {
  if (!text) return '';
  const lower = trLower(text.trim());

  // 1. Tam eşleşme (kategori adı gibi kısa, net ifadeler)
  if (TRANSLATE_DICT[lower] && TRANSLATE_DICT[lower][lang]) {
    return TRANSLATE_DICT[lower][lang];
  }

  // 2. Kelime kelime değiştir — Türkçe ekleri (çorba+sı, biber+li gibi) tolere eder.
  let result = text;
  const sortedKeys = Object.keys(TRANSLATE_DICT).sort((a,b) => b.length - a.length);
  let changed = false;
  sortedKeys.forEach(key => {
    if (!TRANSLATE_DICT[key][lang]) return;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(^|[\\s,.!?;:()"'-])(${escaped})[a-zçğıöşü]{0,4}(?=[\\s,.!?;:()"'-]|$)`,
      'giu'
    );
    // Önce metni Türkçe-normalize edip eşleştir, sonra orijinal üzerinde replace yap
    const normResult = trLower(result);
    if (regex.test(normResult)) {
      // Case-insensitive eşleşmeyi orijinal result üzerinde yakalamak için
      // regex'i orijinal result'a da uygula (İ/I farkı dışında genelde tutarlı çalışır)
      const looseRegex = new RegExp(
        `(^|[\\s,.!?;:()"'-])(${escaped})([a-zçğıöşüA-ZÇĞİÖŞÜ]{0,4})(?=[\\s,.!?;:()"'-]|$)`,
        'giu'
      );
      if (looseRegex.test(result)) {
        result = result.replace(looseRegex, (m, pre) => pre + TRANSLATE_DICT[key][lang]);
        changed = true;
      }
    }
  });

  // 3. Hiçbir eşleşme bulunamadıysa, dil etiketi ile orijinali döndür
  if (!changed) {
    const langLabels = {en:'[EN] ', ja:'[JA] ', zh:'[ZH] ', ru:'[RU] ', de:'[DE] '};
    return (langLabels[lang]||'') + text;
  }
  return result.trim();
}

function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id||0))+1 : 1; }

function getDefaultDB() {
  return {
    settings: {
      restaurantName: "Restoran Adınız",
      // ── ÇOK DİLLİ ALANLAR (TR/EN/JA/ZH/RU/DE) ─────────────────
      slogan: {tr:"Eşsiz lezzetler, unutulmaz anlar.",en:"Unique flavors, unforgettable moments.",ja:"唯一の味、忘れられない瞬間。",zh:"独特风味，难忘时刻。",ru:"Уникальные вкусы, незабываемые моменты.",de:"Einzigartige Aromen, unvergessliche Momente."},
      heroEyebrowML: {tr:"Est. 2015 – İstanbul",en:"Est. 2015 – Istanbul",ja:"創業 2015年 – イスタンブール",zh:"创立于2015年 – 伊斯坦布尔",ru:"Основан в 2015 – Стамбул",de:"Gegründet 2015 – Istanbul"},
      heroBtnPrimaryML:   {tr:"Rezervasyon Yap",en:"Make a Reservation",ja:"予約する",zh:"立即预订",ru:"Забронировать",de:"Tisch reservieren"},
      heroBtnSecondaryML: {tr:"Menüyü İncele",en:"View Menu",ja:"メニューを見る",zh:"查看菜单",ru:"Посмотреть меню",de:"Speisekarte ansehen"},
      aboutTextML:  {tr:"Restoranımız, yılların deneyimi ve tutku ile hazırlanan özel tariflerimizle misafirlerine unutulmaz bir lezzet yolculuğu sunmaktadır.",en:"Our restaurant offers an unforgettable culinary journey with special recipes prepared with years of experience and passion.",ja:"当レストランは、長年の経験と情熱で作られた特別なレシピで、忘れられない美食の旅をお届けします。",zh:"我们的餐厅以多年的经验和热情打造的特色菜谱，为您呈现难忘的美食之旅。",ru:"Наш ресторан предлагает незабываемое гастрономическое путешествие с особыми рецептами, созданными с многолетним опытом и страстью.",de:"Unser Restaurant bietet eine unvergessliche kulinarische Reise mit besonderen Rezepten, die mit jahrelanger Erfahrung und Leidenschaft zubereitet werden."},
      aboutText2ML: {tr:"Her tabak, özenle seçilmiş malzemeler ve ustanın elinden çıkan bir sanat eseridir. Sizleri aramızda görmekten mutluluk duyarız.",en:"Every dish is a work of art, crafted from carefully selected ingredients by our master chef. We would be delighted to welcome you.",ja:"すべての料理は、丁寧に選ばれた食材とシェフの手による芸術作品です。皆様のご来店を心よりお待ちしております。",zh:"每一道菜都是精选食材与大厨匠心制作的艺术品。我们期待您的光临。",ru:"Каждое блюдо — это произведение искусства, созданное из тщательно отобранных ингредиентов руками мастера. Будем рады видеть вас у нас.",de:"Jedes Gericht ist ein Kunstwerk aus sorgfältig ausgewählten Zutaten, das von unserem Küchenchef zubereitet wird. Wir freuen uns, Sie bei uns willkommen zu heißen."},
      chefTitleML: {tr:"Executive Chef & Kurucu",en:"Executive Chef & Founder",ja:"エグゼクティブシェフ＆創業者",zh:"行政总厨兼创始人",ru:"Шеф-повар и основатель",de:"Küchenchef & Gründer"},
      aboutBadgeTextML: {tr:"Ödüllü Restoran",en:"Award-Winning Restaurant",ja:"受賞レストラン",zh:"获奖餐厅",ru:"Ресторан, удостоенный наград",de:"Preisgekröntes Restaurant"},
      footerTextML: {tr:"Eşsiz lezzet deneyimi için tasarlandı.",en:"Designed for a unique culinary experience.",ja:"唯一の美食体験のためにデザインされました。",zh:"为独特美食体验而设计。",ru:"Создан для уникального гастрономического опыта.",de:"Entwickelt für ein einzigartiges kulinarisches Erlebnis."},
      // ── Tek dilli alanlar (kişisel/sabit bilgi) ───────────────
      phone:          "+90 555 000 00 00",
      whatsapp:       "+905550000000",
      email:          "info@restoranim.com",
      address:        "Örnek Mah. Lezzet Cad. No:1, İstanbul",
      mapEmbed:       "",
      logoUrl:        "",
      faviconUrl:     "",
      heroImage:      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=80",
      heroOverlayOpacity: 0.5,
      aboutImage:     "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=800&q=80",
      chefName:       "Şef Adı Soyadı",
      chefImage:      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&q=80",
      aboutBadgeNum:  "3★",
      // ── Dil ayarları ───────────────────────────────────────
      enabledLanguages: ["tr","en","ja","zh","ru","de"],
      defaultLanguage:  "tr",
      hoursML: [
        {day:{tr:"Pazartesi – Perşembe",en:"Monday – Thursday",ja:"月曜日–木曜日",zh:"周一至周四",ru:"Понедельник – Четверг",de:"Montag – Donnerstag"}, time:"12:00 – 23:00"},
        {day:{tr:"Cuma – Cumartesi",en:"Friday – Saturday",ja:"金曜日–土曜日",zh:"周五至周六",ru:"Пятница – Субота",de:"Freitag – Samstag"}, time:"12:00 – 00:30"},
        {day:{tr:"Pazar",en:"Sunday",ja:"日曜日",zh:"周日",ru:"Воскресенье",de:"Sonntag"}, time:"12:00 – 22:00"}
      ],
      statsML: [
        {num:"10+", label:{tr:"Yıllık Deneyim",en:"Years of Experience",ja:"年の経験",zh:"年经验",ru:"Лет опыта",de:"Jahre Erfahrung"}},
        {num:"50k", label:{tr:"Mutlu Misafir",en:"Happy Guests",ja:"満足したお客様",zh:"满意客户",ru:"Довольных гостей",de:"Zufriedene Gäste"}},
        {num:"4.9", label:{tr:"Ortalama Puan",en:"Average Rating",ja:"平均評価",zh:"平均评分",ru:"Средний рейтинг",de:"Durchschnittsbewertung"}},
        {num:"3",   label:{tr:"Ödül",en:"Awards",ja:"受賞",zh:"奖项",ru:"Награды",de:"Auszeichnungen"}}
      ],
      socialInstagram:"#", socialFacebook:"#", socialTwitter:"#", socialTripadvisor:"#",
      primaryColor:"#c9a84c", accentColor:"#e4c97e", darkBg:"#0a0a0a",
      fontDisplay:"Cormorant Garamond", fontBody:"Inter",
      currency:"₺",
      showHero:true, showStats:true, showAbout:true,
      showChef:true, showMenu:true, showGallery:true,
      showReservation:true, showTestimonials:true, showContact:true, showWhatsapp:true,
      reservationBgImage:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
      setupDone: false
    },
    // ─── ÇOK DİLLİ MENÜ ─────────────────────────────────────────
    // name/desc artık {tr,en,ja,zh,ru,de} objesi.
    // Admin panelinden her dil ayrı girilebilir veya "Otomatik Çevir" ile doldurulur.
    menuCategories: [
      {id:1, name:{tr:"Başlangıçlar",en:"Starters",ja:"前菜",zh:"开胃菜",ru:"Закуски",de:"Vorspeisen"}, slug:"starters", icon:"🥗", active:true, order:1},
      {id:2, name:{tr:"Ana Yemekler",en:"Main Courses",ja:"メイン料理",zh:"主菜",ru:"Основные блюда",de:"Hauptgerichte"}, slug:"mains", icon:"🍽️", active:true, order:2},
      {id:3, name:{tr:"Izgaralar",en:"Grills",ja:"グリル",zh:"烤类",ru:"Гриль",de:"Grillgerichte"}, slug:"grills", icon:"🔥", active:true, order:3},
      {id:4, name:{tr:"Tatlılar",en:"Desserts",ja:"デザート",zh:"甜点",ru:"Десерты",de:"Desserts"}, slug:"desserts", icon:"🍮", active:true, order:4},
      {id:5, name:{tr:"İçecekler",en:"Drinks",ja:"飲み物",zh:"饮品",ru:"Напитки",de:"Getränke"}, slug:"drinks", icon:"🍷", active:true, order:5}
    ],
    menuItems: [
      {id:1, name:{tr:"Mevsim Salatası",en:"Seasonal Salad",ja:"季節のサラダ",zh:"季节沙拉",ru:"Сезонный салат",de:"Saisonsalat"}, desc:{tr:"Taze mevsim yeşillikleri, kiraz domates, zeytin, balsamik sos",en:"Fresh seasonal greens, cherry tomatoes, olives, balsamic dressing",ja:"新鮮な季節の野菜、チェリートマト、オリーブ、バルサミコソース",zh:"新鲜时蔬，樱桃番茄，橄榄，意大利香醋",ru:"Свежая сезонная зелень, помидоры черри, оливки, бальзамическая заправка",de:"Frisches Saisongemüse, Kirschtomaten, Oliven, Balsamico-Dressing"}, price:180, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80", images:["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80"], order:1},
      {id:2, name:{tr:"Mantar Çorbası",en:"Mushroom Soup",ja:"マッシュルームスープ",zh:"蘑菇汤",ru:"Грибной суп",de:"Pilzsuppe"}, desc:{tr:"Kremalı orman mantarı çorbası, trüf yağı, kruton",en:"Creamy forest mushroom soup, truffle oil, croutons",ja:"クリーミーな森のキノコスープ、トリュフオイル、クルトン添え",zh:"奶油森林蘑菇汤，松露油，面包丁",ru:"Сливочный суп из лесных грибов, трюфельное масло, крутоны",de:"Cremige Waldpilzsuppe, Trüffelöl, Croutons"}, price:145, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80", images:["https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80"], order:2},
      {id:3, name:{tr:"Karides Kokteyl",en:"Shrimp Cocktail",ja:"シュリンプカクテル",zh:"虾仁鸡尾酒",ru:"Креветочный коктейль",de:"Shrimps-Cocktail"}, desc:{tr:"İskandinav usulü karides, avokado, limon mayonezi",en:"Scandinavian-style shrimp, avocado, lemon mayonnaise",ja:"北欧風シュリンプ、アボカド、レモンマヨネーズ",zh:"北欧风味虾仁，牛油果，柠檬蛋黄酱",ru:"Креветки по-скандинавски, авокадо, лимонный майонез",de:"Garnelen nach skandinavischer Art, Avocado, Zitronenmayonnaise"}, price:245, cat:"starters", featured:true, active:true, img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", images:["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80"], order:3},
      {id:4, name:{tr:"Levrek Fileto",en:"Sea Bass Fillet",ja:"スズキのフィレ",zh:"鲈鱼柳",ru:"Филе сибаса",de:"Wolfsbarschfilet"}, desc:{tr:"Fırında levrek, limon tereyağı sosu, sebze garnitürü",en:"Oven-baked sea bass, lemon butter sauce, vegetable garnish",ja:"窯焼きスズキ、レモンバターソース、野菜の付け合わせ",zh:"烤箱鲈鱼，柠檬黄油汁，蔬菜配菜",ru:"Сибас в духовке, лимонно-сливочный соус, овощной гарнир",de:"Im Ofen gebackener Wolfsbarsch, Zitronenbuttersauce, Gemüsegarnitur"}, price:520, cat:"mains", featured:true, active:true, img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80", images:["https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80"], order:1},
      {id:5, name:{tr:"Mantarlı Risotto",en:"Mushroom Risotto",ja:"マッシュルームリゾット",zh:"蘑菇烩饭",ru:"Ризотто с грибами",de:"Pilzrisotto"}, desc:{tr:"Arborio pirinci, porcini mantar, parmesan, taze kekik",en:"Arborio rice, porcini mushrooms, parmesan, fresh thyme",ja:"アルボリオ米、ポルチーニ茸、パルメザンチーズ、新鮮なタイム",zh:"阿博里奥米，牛肝菌，帕玛森芝士，新鲜百里香",ru:"Рис арборио, грибы порчини, пармезан, свежий тимьян",de:"Arborio-Reis, Steinpilze, Parmesan, frischer Thymian"}, price:380, cat:"mains", featured:false, active:true, img:"https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80", images:["https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80"], order:2},
      {id:6, name:{tr:"Izgara Bonfile",en:"Grilled Filet Mignon",ja:"グリルフィレミニョン",zh:"烤菲力牛排",ru:"Стейк филе-миньон на гриле",de:"Gegrilltes Filet Mignon"}, desc:{tr:"250g dana bonfile, mantar sos, patates garnitürü",en:"250g beef filet, mushroom sauce, potato garnish",ja:"250gビーフフィレ、マッシュルームソース、ポテトの付け合わせ",zh:"250克牛菲力，蘑菇汁，土豆配菜",ru:"250г говяжьего филе, грибной соус, картофельный гарнир",de:"250g Rinderfilet, Pilzsauce, Kartoffelgarnitur"}, price:680, cat:"grills", featured:true, active:true, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80", images:["https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80"], order:1},
      {id:7, name:{tr:"Kuzu Pirzola",en:"Lamb Chops",ja:"ラムチョップ",zh:"羊排",ru:"Бараньи отбивные",de:"Lammkoteletts"}, desc:{tr:"Frenk üzümü sosu, ızgara sebze, nane jölesi",en:"Redcurrant sauce, grilled vegetables, mint jelly",ja:"レッドカラントソース、グリル野菜、ミントジェリー",zh:"红醋栗汁，烤蔬菜，薄荷果冻",ru:"Соус из красной смородины, овощи на гриле, мятное желе",de:"Johannisbeersauce, gegrilltes Gemüse, Minzgelee"}, price:590, cat:"grills", featured:false, active:true, img:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80", images:["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80"], order:2},
      {id:8, name:{tr:"Tavuk Şiş",en:"Chicken Skewers",ja:"チキンスキュワー",zh:"鸡肉串",ru:"Куриные шашлычки",de:"Hähnchenspieße"}, desc:{tr:"Marine edilmiş tavuk, közlenmiş biber, pilav, cacık",en:"Marinated chicken, charred peppers, rice, yogurt sauce",ja:"マリネしたチキン、焼きピーマン、ライス、ヨーグルトソース",zh:"腌制鸡肉，烤辣椒，米饭，酸奶酱",ru:"Маринованная курица, печёный перец, рис, соус из йогурта",de:"Mariniertes Hähnchen, gegrillte Paprika, Reis, Joghurtsauce"}, price:320, cat:"grills", featured:false, active:true, img:"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80", images:["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80"], order:3},
      {id:9, name:{tr:"Çikolatalı Sufle",en:"Chocolate Soufflé",ja:"チョコレートスフレ",zh:"巧克力舒芙蕾",ru:"Шоколадное суфле",de:"Schokoladensoufflé"}, desc:{tr:"Sıcak çikolata sufle, vanilyalı dondurma, çilek",en:"Warm chocolate soufflé, vanilla ice cream, strawberries",ja:"温かいチョコレートスフレ、バニラアイスクリーム、ストロベリー",zh:"热巧克力舒芙蕾，香草冰淇淋，草莓",ru:"Тёплое шоколадное суфле, ванильное мороженое, клубника",de:"Warmes Schokoladensoufflé, Vanilleeis, Erdbeeren"}, price:165, cat:"desserts", featured:true, active:true, img:"https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80", images:["https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80"], order:1},
      {id:10, name:{tr:"Crème Brûlée",en:"Crème Brûlée",ja:"クレームブリュレ",zh:"焦糖布丁",ru:"Крем-брюле",de:"Crème brûlée"}, desc:{tr:"Geleneksel Fransız tatlısı, karamelize şeker, mevsim meyvesi",en:"Traditional French dessert, caramelized sugar, seasonal fruit",ja:"伝統的なフランスのデザート、カラメリゼした砂糖、季節のフルーツ",zh:"传统法式甜点，焦糖，季节水果",ru:"Традиционный французский десерт, карамелизированный сахар, сезонные фрукты",de:"Traditionelles französisches Dessert, karamellisierter Zucker, Saisonfrüchte"}, price:145, cat:"desserts", featured:false, active:true, img:"https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=600&q=80", images:["https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=600&q=80"], order:2},
      {id:11, name:{tr:"Limonata",en:"Lemonade",ja:"レモネード",zh:"柠檬水",ru:"Лимонад",de:"Limonade"}, desc:{tr:"Taze sıkılmış limon, nane, şurup — soğuk veya soda ile",en:"Freshly squeezed lemon, mint, syrup — chilled or with soda",ja:"フレッシュレモン、ミント、シロップ — 冷やしてまたはソーダ入り",zh:"新鲜柠檬汁，薄荷，糖浆 — 冰镇或苏打水",ru:"Свежевыжатый лимон, мята, сироп — холодный или с содовой",de:"Frisch gepresste Zitrone, Minze, Sirup — gekühlt oder mit Soda"}, price:75, cat:"drinks", featured:false, active:true, img:"https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80", images:["https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80"], order:1},
      {id:12, name:{tr:"Türk Kahvesi",en:"Turkish Coffee",ja:"トルココーヒー",zh:"土耳其咖啡",ru:"Турецкий кофе",de:"Türkischer Kaffee"}, desc:{tr:"Geleneksel pişirme, lokum ikramı ile",en:"Traditionally brewed, served with Turkish delight",ja:"伝統的な製法、ロクム(トルコの菓子)付き",zh:"传统煮法，配土耳其软糖",ru:"Традиционное приготовление, подаётся с рахат-лукумом",de:"Traditionell gebrüht, serviert mit türkischem Honig"}, price:65, cat:"drinks", featured:false, active:true, img:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80", images:["https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80"], order:2}
    ],
    gallery: [
      {id:1, img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",  alt:{tr:"Restoran iç mekan",en:"Restaurant interior",ja:"レストラン内装",zh:"餐厅内部",ru:"Интерьер ресторана",de:"Restaurant-Interieur"}, cls:"tall", active:true, order:1},
      {id:2, img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",  alt:{tr:"Özel tabak sunumu",en:"Special dish presentation",ja:"特別な料理の盛り付け",zh:"特色菜品摆盘",ru:"Подача особого блюда",de:"Besondere Tellerpräsentation"}, cls:"", active:true, order:2},
      {id:3, img:"https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=600&q=80",  alt:{tr:"Şef mutfakta",en:"Chef in kitchen",ja:"厨房のシェフ",zh:"厨师在厨房",ru:"Шеф-повар на кухне",de:"Küchenchef in der Küche"}, cls:"", active:true, order:3},
      {id:4, img:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80",   alt:{tr:"Akşam yemeği ortamı",en:"Dinner ambiance",ja:"夕食の雰囲気",zh:"晚餐氛围",ru:"Атмосфера ужина",de:"Abendessen-Ambiente"}, cls:"wide", active:true, order:4},
      {id:5, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",     alt:{tr:"Izgara biftek sunumu",en:"Grilled steak presentation",ja:"グリルステーキの盛り付け",zh:"烤牛排展示",ru:"Подача стейка на гриле",de:"Präsentation von gegrilltem Steak"}, cls:"", active:true, order:5},
      {id:6, img:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80",  alt:{tr:"Şarap servisi",en:"Wine service",ja:"ワインサービス",zh:"葡萄酒服务",ru:"Винное обслуживание",de:"Weinservice"}, cls:"", active:true, order:6},
      {id:7, img:"https://images.unsplash.com/photo-1486297678162-eb2a19b0a318?w=600&q=80",  alt:{tr:"Tatlı sunumu",en:"Dessert presentation",ja:"デザートの盛り付け",zh:"甜点展示",ru:"Подача десерта",de:"Dessertpräsentation"}, cls:"tall", active:true, order:7},
      {id:8, img:"https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80",  alt:{tr:"Özel yemek odası",en:"Private dining room",ja:"プライベートダイニングルーム",zh:"私人用餐室",ru:"Отдельный зал для ужина",de:"Privates Speisezimmer"}, cls:"", active:true, order:8},
      {id:9, img:"https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80",  alt:{tr:"Restoran girişi",en:"Restaurant entrance",ja:"レストランの入り口",zh:"餐厅入口",ru:"Вход в ресторан",de:"Restauranteingang"}, cls:"", active:true, order:9}
    ],
    reservations: [],
    testimonials: [
      {id:1, text:'"Yıllar içinde gittiğim en iyi restoran. Her tabak bir sanat eseri, servis mükemmeldi."',           name:"Ahmet Y.",      via:"Google Reviews",  stars:5, active:true, featured:true},
      {id:2, text:'"Özel günümüzü burada kutladık. Atmosfer, yemekler ve ilgi — hepsi harikaydı. Kesinlikle tavsiye!"', name:"Selin K.",      via:"TripAdvisor",     stars:5, active:true, featured:true},
      {id:3, text:'"Izgara bonfile hayatımda yediğim en iyi biftek. Şefe selam olsun!"',                               name:"Mehmet D.",     via:"Google Reviews",  stars:5, active:true, featured:false},
      {id:4, text:'"Her detay düşünülmüş. Masa örtüsünden müziğe, yemekten servise — kusursuz bir deneyim."',          name:"Ayşe & Can T.", via:"Google Reviews",  stars:5, active:true, featured:false},
      {id:5, text:'"İş yemeği için mükemmel bir mekan. Profesyonel servis, sessiz ortam ve harika mutfak."',            name:"Kemal B.",      via:"OpenTable",       stars:5, active:true, featured:true},
      {id:6, text:'"Şehrin en iyi restoranlarından biri. Fiyat performans açısından da çok başarılı."',                 name:"Zeynep A.",     via:"Yelp",            stars:5, active:true, featured:false}
    ],
    messages: []
  };
}

// ─── INIT ─────────────────────────────────────────────────────
try {
  if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR,  {recursive:true});
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true});
  if (!fs.existsSync(DATA_FILE))  writeDB(getDefaultDB());
} catch(e) {
  console.error('Data dizini hazirlanamadi:', e.message, '| DATA_DIR:', DATA_DIR);
}

// ─── BODY PARSER ──────────────────────────────────────────────
function parseBody(req, maxSize = 20*1024*1024) {
  return new Promise((res, rej) => {
    let body = [], size = 0;
    req.on('data', c => { size += c.length; if(size > maxSize){ rej(new Error('Too large')); } else body.push(c); });
    req.on('end', () => {
      const buf = Buffer.concat(body);
      const ct = req.headers['content-type']||'';
      if (ct.includes('application/json')) {
        try { res(JSON.parse(buf.toString())); } catch { res({}); }
      } else {
        res(buf); // raw buffer for uploads
      }
    });
    req.on('error', rej);
  });
}

// ─── MULTIPART PARSER ─────────────────────────────────────────
function parseMultipart(buffer, boundary) {
  const files = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let pos = 0;
  while (pos < buffer.length) {
    const start = buffer.indexOf(boundaryBuf, pos);
    if (start === -1) break;
    pos = start + boundaryBuf.length;
    if (buffer[pos] === 45 && buffer[pos+1] === 45) break; // --
    if (buffer[pos] === 13) pos += 2; // \r\n
    // Parse headers
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), pos);
    if (headerEnd === -1) break;
    const headers = buffer.slice(pos, headerEnd).toString();
    pos = headerEnd + 4;
    // Find next boundary
    const nextBound = buffer.indexOf(boundaryBuf, pos);
    const dataEnd = nextBound === -1 ? buffer.length : nextBound - 2;
    const fileData = buffer.slice(pos, dataEnd);
    pos = nextBound;
    // Extract filename and field name
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*(.+)/i);
    if (filenameMatch) {
      files.push({
        fieldname: nameMatch ? nameMatch[1] : 'file',
        filename: filenameMatch[1],
        mimetype: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
        data: fileData
      });
    }
  }
  return files;
}

// ─── HELPERS ──────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
}
function sendJSON(res, data, status=200) {
  res.writeHead(status, {'Content-Type':'application/json'});
  res.end(JSON.stringify(data));
}
function checkAdmin(req) {
  const auth = req.headers.authorization||'';
  if (!auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6),'base64').toString();
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return false;
  const u = decoded.slice(0, colonIdx);
  const p = decoded.slice(colonIdx + 1);

  try {
    const db = readDB();
    // db'de adminUser/Pass kaydedilmişse onu kullan (kurulum sihirbazından)
    if (db.settings.adminUser && db.settings.adminPass) {
      return u === db.settings.adminUser && p === db.settings.adminPass;
    }
    // Yoksa ENV Variables'a bak (Railway'de elle eklendiyse)
    if (ENV_ADMIN_USER && ENV_ADMIN_PASS) {
      return u === ENV_ADMIN_USER && p === ENV_ADMIN_PASS;
    }
    return false;
  } catch {
    // db okunamazsa ENV'e bak
    if (ENV_ADMIN_USER && ENV_ADMIN_PASS) {
      return u === ENV_ADMIN_USER && p === ENV_ADMIN_PASS;
    }
    return false;
  }
}

// ─── API ROUTER ───────────────────────────────────────────────
async function handleAPI(req, res, pathname) {
  const method = req.method;
  const parts  = pathname.replace('/api/','').split('/');
  const resource = parts[0];
  const id = parts[1] ? parseInt(parts[1]) : null;
  const db = readDB();

  // ── UPLOAD (multipart) ──────────────────────────────────────
  if (resource === 'upload' && method === 'POST') {
    const ct = req.headers['content-type']||'';
    const boundaryMatch = ct.match(/boundary=(.+)/);
    if (!boundaryMatch) return sendJSON(res,{error:'No boundary'},400);
    const raw = await parseBody(req);
    const files = parseMultipart(raw, boundaryMatch[1]);
    if (!files.length) return sendJSON(res,{error:'No file'},400);
    const file = files[0];
    const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return sendJSON(res,{error:'Geçersiz dosya tipi'},400);
    const ext = path.extname(file.filename).toLowerCase() || '.jpg';
    const fname = `upload_${Date.now()}_${Math.random().toString(36).slice(2,7)}${ext}`;
    const fpath = path.join(UPLOAD_DIR, fname);
    fs.writeFileSync(fpath, file.data);
    return sendJSON(res,{ url: `/uploads/${fname}`, filename: fname });
  }

  // ── UPLOAD LIST ─────────────────────────────────────────────
  if (resource === 'uploads' && method === 'GET') {
    const files = fs.existsSync(UPLOAD_DIR)
      ? fs.readdirSync(UPLOAD_DIR).filter(f=>/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
          .map(f=>({ filename:f, url:`/uploads/${f}`, size: fs.statSync(path.join(UPLOAD_DIR,f)).size }))
          .sort((a,b)=>b.filename.localeCompare(a.filename))
      : [];
    return sendJSON(res, files);
  }

  // ── UPLOAD DELETE ───────────────────────────────────────────
  if (resource === 'uploads' && method === 'DELETE' && parts[1]) {
    const fname = decodeURIComponent(parts[1]);
    const fpath = path.join(UPLOAD_DIR, path.basename(fname));
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
    return sendJSON(res,{ok:true});
  }

  // ── SETUP CHECK ─────────────────────────────────────────────
  // Kurulum tamamlanmış mı? (public endpoint - auth gerekmez)
  if (resource === 'setup-status' && method === 'GET') {
    return sendJSON(res, { setupDone: db.settings.setupDone === true });
  }

  // ── SETUP COMPLETE ───────────────────────────────────────────
  if (resource === 'setup' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.restaurantName || !body.restaurantName.trim())
      return sendJSON(res, {error: 'Restoran adı zorunlu'}, 400);
    if (!body.adminUser || !body.adminUser.trim())
      return sendJSON(res, {error: 'Kullanıcı adı zorunlu'}, 400);
    if (!body.adminPass || body.adminPass.length < 6)
      return sendJSON(res, {error: 'Şifre en az 6 karakter olmalı'}, 400);

    const lang = db.settings.defaultLanguage || 'tr';
    db.settings = {
      ...db.settings,
      restaurantName: body.restaurantName.trim(),
      phone:          body.phone         || '',
      whatsapp:       body.whatsapp      || '',
      email:          body.email         || '',
      address:        body.address       || '',
      primaryColor:   body.primaryColor  || '#c9a84c',
      currency:       body.currency      || '₺',
      adminUser:      body.adminUser.trim(),
      adminPass:      body.adminPass,
      setupDone:      true
    };
    // Slogan ve eyebrow girilmişse varsayılan dile yaz
    if (body.slogan) {
      db.settings.slogan = {...(db.settings.slogan||{}), [lang]: body.slogan};
    }
    if (body.heroEyebrow) {
      db.settings.heroEyebrowML = {...(db.settings.heroEyebrowML||{}), [lang]: body.heroEyebrow};
    }
    writeDB(db);
    // Railway Variables yoksa console'a yaz — kullanıcı manuel ekleyebilir
    if (!ENV_ADMIN_USER) {
      console.log('\n⚠️  Kalıcı giriş için Railway Variables ekle:');
      console.log(`   ADMIN_USER = ${body.adminUser.trim()}`);
      console.log(`   ADMIN_PASS = ${body.adminPass}\n`);
    }
    return sendJSON(res, {ok: true});
  }

  // ── CHANGE PASSWORD ──────────────────────────────────────────
  // Admin panelinden şifre değiştirme
  if (resource === 'change-password' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.newUser || !body.newUser.trim())
      return sendJSON(res, {error: 'Kullanıcı adı boş olamaz'}, 400);
    if (!body.newPass || body.newPass.length < 6)
      return sendJSON(res, {error: 'Şifre en az 6 karakter olmalı'}, 400);
    db.settings.adminUser = body.newUser.trim();
    db.settings.adminPass = body.newPass;
    writeDB(db);
    return sendJSON(res, {ok: true});
  }

  // ── ÇEVİRİ (sözlük tabanlı, API'siz) ──────────────────────────
  if (resource === 'translate' && method === 'POST') {
    const body = await parseBody(req);
    const { text, targetLangs } = body; // text: string, targetLangs: ["en","ja",...]
    if (!text || !text.trim()) return sendJSON(res, {error:'Metin boş'}, 400);
    const result = {};
    (targetLangs || ['en','ja','zh','ru','de']).forEach(lang => {
      result[lang] = translateText(text, lang);
    });
    return sendJSON(res, {translations: result});
  }

  // ── STATS ───────────────────────────────────────────────────
  if (resource === 'stats' && method === 'GET') {
    const r = db.reservations;
    const today = new Date().toISOString().split('T')[0];
    return sendJSON(res,{
      totalReservations: r.length,
      pendingReservations: r.filter(x=>x.status==='pending').length,
      confirmedToday: r.filter(x=>x.status==='confirmed'&&x.date===today).length,
      totalMenuItems: db.menuItems.filter(x=>x.active).length,
      totalGallery: db.gallery.filter(x=>x.active).length,
      unreadMessages: db.messages.filter(x=>!x.read).length,
      totalTestimonials: db.testimonials.filter(x=>x.active).length,
      recentReservations: [...r].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5)
    });
  }

  // ── SETTINGS ────────────────────────────────────────────────
  if (resource === 'settings') {
    if (method==='GET') return sendJSON(res, db.settings);
    if (method==='PUT') {
      const body = await parseBody(req);
      db.settings = {...db.settings, ...body};
      writeDB(db);
      return sendJSON(res,{ok:true, settings:db.settings});
    }
  }

  // ── GENERIC CRUD ─────────────────────────────────────────────
  const collections = ['menuCategories','menuItems','gallery','reservations','testimonials','messages'];
  if (collections.includes(resource)) {
    if (method==='GET') {
      let data = db[resource];
      if (resource==='reservations'||resource==='messages')
        data = [...data].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const cat = new url.URL(req.url,`http://localhost`).searchParams.get('cat');
      if (cat && resource==='menuItems') data = data.filter(x=>x.cat===cat);
      return sendJSON(res, data);
    }
    if (method==='POST') {
      const body = await parseBody(req);
      const extra = resource==='reservations'
        ? {status:'pending',createdAt:new Date().toISOString()}
        : resource==='messages'
        ? {read:false,createdAt:new Date().toISOString()}
        : {};
      const item = {...body, id:nextId(db[resource]), ...extra};
      db[resource].push(item);
      writeDB(db);
      // Yeni rezervasyon geldiğinde restoran sahibine bildirim
      if (resource === 'reservations' && db.settings.email) {
        const name = db.settings.restaurantName || 'Restoranınız';
        sendEmail({
          to: db.settings.email,
          subject: `🔔 Yeni Rezervasyon Talebi – ${item.name}`,
          html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:${db.settings.primaryColor||'#c9a84c'}">Yeni Rezervasyon Talebi</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#888">Ad Soyad</td><td style="font-weight:600">${item.name}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Telefon</td><td style="font-weight:600">${item.phone||'-'}</td></tr>
              <tr><td style="padding:6px 0;color:#888">E-posta</td><td style="font-weight:600">${item.email||'-'}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Tarih</td><td style="font-weight:600">${item.date}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Saat</td><td style="font-weight:600">${item.time||'-'}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Kişi Sayısı</td><td style="font-weight:600">${item.guests||'-'}</td></tr>
              ${item.notes?`<tr><td style="padding:6px 0;color:#888">Not</td><td>${item.notes}</td></tr>`:''}
            </table>
            <p style="color:#aaa;font-size:12px;margin-top:20px">Admin panelinden onaylayabilirsiniz: /admin</p>
          </div>`
        });
      }
      return sendJSON(res, item, 201);
    }
    if (method==='PUT' && id) {
      const body = await parseBody(req);
      const i = db[resource].findIndex(x=>x.id===id);
      if (i===-1) return sendJSON(res,{error:'Not found'},404);
      const before = db[resource][i];
      db[resource][i] = {...before, ...body};
      writeDB(db);
      // Rezervasyon durumu değiştiyse müşteriye mail gönder
      if (resource === 'reservations' && body.status && body.status !== before.status
          && (body.status === 'confirmed' || body.status === 'cancelled')) {
        const updated = db[resource][i];
        if (updated.email) {
          const {subject, html} = buildReservationEmail(updated, db, body.status);
          sendEmail({to: updated.email, subject, html});
        }
      }
      return sendJSON(res, db[resource][i]);
    }
    if (method==='DELETE' && id) {
      db[resource] = db[resource].filter(x=>x.id!==id);
      writeDB(db);
      return sendJSON(res,{ok:true});
    }
  }

  sendJSON(res,{error:'Not found'},404);
}

// ─── MAIN SERVER ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCORS(res);
  if (req.method==='OPTIONS') { res.writeHead(204); return res.end(); }

  const parsed   = url.parse(req.url);
  const pathname = parsed.pathname;

  // Public GET endpoint'ler — ana site bunları okur, auth gerekmez
  const publicGETs = [
    '/api/settings', '/api/menuItems', '/api/menuCategories',
    '/api/gallery', '/api/testimonials', '/api/setup-status'
  ];
  const isPublicGET = req.method === 'GET' && publicGETs.includes(pathname);

  // Public POST endpoint'ler
  const isPublicPOST = pathname === '/api/setup'
    || pathname === '/api/reservations'   // ziyaretçi rezervasyon yapabilir
    || pathname === '/api/messages';       // ziyaretçi mesaj gönderebilir

  const isPublicAPI = isPublicGET || isPublicPOST;

  // Admin HTML her zaman yüklenir — içindeki JS auth kontrolü yapar
  const isAdminHTML = (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html');

  // Sadece admin işlemleri korumalı (yazma, silme, upload, stats)
  const isProtected = !isPublicAPI && !isAdminHTML && pathname.startsWith('/api/');
  if (isProtected && !checkAdmin(req)) {
    res.writeHead(401, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({error:'Yetkisiz',code:401}));
  }

  // API
  if (pathname.startsWith('/api/')) {
    return handleAPI(req,res,pathname).catch(err=>{
      console.error(err);
      sendJSON(res,{error:'Server error'},500);
    });
  }

  // Serve uploaded files
  if (pathname.startsWith('/uploads/')) {
    const fname = path.basename(pathname);
    const fpath = path.join(UPLOAD_DIR, fname);
    if (!fs.existsSync(fpath)) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(fpath).toLowerCase();
    res.writeHead(200,{'Content-Type': MIME[ext]||'application/octet-stream'});
    return res.end(fs.readFileSync(fpath));
  }

  // Health check — Railway ve uptime monitor'lar için
  if (pathname === '/health' || pathname === '/ping') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({status:'ok', ts: Date.now()}));
  }

  // Static files
  let filePath;
  if (pathname==='/'||pathname==='/index.html') filePath = path.join(__dirname,'public','index.html');
  else if (pathname==='/admin'||pathname==='/admin/'||pathname==='/admin/index.html') filePath = path.join(__dirname,'public','admin.html');
  else if (pathname==='/menu'||pathname==='/menu/'||pathname==='/menu/index.html') filePath = path.join(__dirname,'public','menu.html');
  else filePath = path.join(__dirname,'public',pathname);

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath,(err,data)=>{
    if (err) { res.writeHead(404,{'Content-Type':'text/html'}); return res.end('<h1>404</h1>'); }
    res.writeHead(200,{'Content-Type': MIME[ext]||'text/plain'});
    res.end(data);
  });
});

server.listen(PORT,'0.0.0.0',()=>{
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     🔥 Restaurant Panel – Server Başlatıldı  ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🌐 Ana Site:   http://localhost:${PORT}          ║`);
  console.log(`║  ⚙️  Admin:     http://localhost:${PORT}/admin     ║`);
  console.log('║  🔑 Kullanıcı: Kurulum sihirbazından belirlenir    ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => { process.exit(0); });
  setTimeout(() => process.exit(0), 5000);
});
process.on('SIGINT', () => process.exit(0));
