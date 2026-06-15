/**
 * Ember & Oak – Restaurant + Admin Panel Server
 * Çalıştırmak için: node server.js
 * Ana site: http://localhost:3000
 * Admin panel: http://localhost:3000/admin
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

// ─── MIME TYPES ──────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── DATABASE HELPERS ─────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return getDefaultDB(); }
}
function writeDB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
}

function getDefaultDB() {
  return {
    settings: {
      restaurantName: "Ember & Oak",
      slogan: "Where fire meets finesse, and every plate tells a story.",
      phone: "+90 212 219 12 34",
      whatsapp: "+902122191234",
      email: "hello@emberandoak.com",
      address: "Nişantaşı, Abdi İpekçi Cad. No:28, Şişli, Istanbul 34367",
      mapEmbed: "",
      heroImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=80",
      aboutImage: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=800&q=80",
      aboutText: "Born from a love of open-flame cooking and heirloom recipes, Ember & Oak was founded to honor the ancient art of charcoal fire.",
      aboutText2: "Every dish is a testament to our belief that exceptional food starts long before it reaches your plate.",
      chefName: "Chef Mehmet Arslan",
      chefTitle: "Executive Chef & Co-Founder",
      chefImage: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&q=80",
      hours: [
        { day: "Pazartesi – Perşembe", time: "12:00 – 23:00" },
        { day: "Cuma – Cumartesi",     time: "12:00 – 00:30" },
        { day: "Pazar",                time: "12:00 – 22:00" },
        { day: "Özel Etkinlikler",     time: "Randevu ile" }
      ],
      stats: [
        { num: "10+", label: "Yıllık Deneyim" },
        { num: "38k", label: "Mutlu Misafir"  },
        { num: "4.9", label: "Ortalama Puan"  },
        { num: "3",   label: "Ödül"           }
      ],
      socialInstagram: "#",
      socialFacebook: "#",
      socialTwitter: "#",
      primaryColor: "#c9a84c",
      accentColor: "#e4c97e",
      currency: "₺"
    },
    menuCategories: [
      { id:1, name:"Başlangıçlar", slug:"starters",  icon:"🥗", active:true },
      { id:2, name:"Ana Yemekler", slug:"mains",     icon:"🍽️", active:true },
      { id:3, name:"Izgaralar",    slug:"grills",    icon:"🔥", active:true },
      { id:4, name:"Tatlılar",     slug:"desserts",  icon:"🍮", active:true },
      { id:5, name:"İçecekler",    slug:"drinks",    icon:"🍷", active:true }
    ],
    menuItems: [
      { id:1, name:"Alev Kavrulmuş Beef Tartare", desc:"El çekilmiş bonfile, bıldırcın yumurtası, turşu arpacık soğanı, gevrek kapariler", price:285, cat:"starters", featured:true,  active:true, img:"https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80", order:1 },
      { id:2, name:"Trüf & Parmesan Arancini",    desc:"Arborio pirinci, siyah trüf, parmesan, safranli aioli",                            price:240, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1582456891045-de70e4f0b8e6?w=600&q=80", order:2 },
      { id:3, name:"Burrata & Heirloom Domates",  desc:"Buffalo burrata, közlenmiş domates, fesleğen yağı, Maldon deniz tuzu",             price:220, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80", order:3 },
      { id:4, name:"45 Günlük Dry-Aged T-Bone",   desc:"Prime bonfile, kemik iliği tereyağı, chimichurri, közlenmiş sarımsak",            price:890, cat:"grills",   featured:true,  active:true, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80", order:1 },
      { id:5, name:"Tomahawk Biftek (1.2kg)",      desc:"Prime USDA tomahawk, meşe odunu ızgarası, tütsülenmiş tuz, trüf patates",         price:1650,cat:"grills",   featured:false, active:true, img:"https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&q=80", order:2 },
      { id:6, name:"Kuzu Pirzolası",               desc:"Yeni Zelanda kuzu, harissa kabuğu, nar sosu, tabbouleh",                          price:720, cat:"grills",   featured:false, active:true, img:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80", order:3 },
      { id:7, name:"Levrek Fileto",                desc:"Bütün Akdeniz levreği, rezene, zeytinyağı, limon konfiti",                         price:580, cat:"mains",    featured:true,  active:true, img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80", order:1 },
      { id:8, name:"Mantar Risotto",               desc:"Porcini, chanterelle, trüf, yaşlı parmigiano reggiano",                           price:420, cat:"mains",    featured:false, active:true, img:"https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80", order:2 },
      { id:9, name:"Sıcak Valrhona Çikolata",     desc:"%70 Valrhona fondant, tuzlu karamel, vanilyalı dondurma",                         price:180, cat:"desserts", featured:false, active:true, img:"https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80", order:1 },
      { id:10,name:"Crème Brûlée",                desc:"Fransız vanilyalı muhallebi, karamelize kabuk, mevsim meyveleri",                 price:145, cat:"desserts", featured:false, active:true, img:"https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=600&q=80", order:2 },
      { id:11,name:"Ember Signature Kokteyl",      desc:"Mezcal, kan portakalı, aktif kömür, Himalaya tuzu",                               price:195, cat:"drinks",   featured:false, active:true, img:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80", order:1 },
      { id:12,name:"Reserve Bordeaux",             desc:"Château Léoville, Saint-Julien, 2018 – mahzen seçkisi",                          price:380, cat:"drinks",   featured:false, active:true, img:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80", order:2 }
    ],
    gallery: [
      { id:1, img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",  alt:"Restoran iç mekan",         cls:"tall",  active:true, order:1 },
      { id:2, img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",  alt:"Tabak sunum",               cls:"",      active:true, order:2 },
      { id:3, img:"https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",     alt:"Şef mutfakta",              cls:"",      active:true, order:3 },
      { id:4, img:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80",    alt:"Akşam yemeği ortamı",       cls:"wide",  active:true, order:4 },
      { id:5, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",     alt:"Biftek sunumu",             cls:"",      active:true, order:5 },
      { id:6, img:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80",  alt:"Şarap servisi",             cls:"",      active:true, order:6 },
      { id:7, img:"https://images.unsplash.com/photo-1486297678162-eb2a19b0a318?w=600&q=80",  alt:"Tatlı sunumu",              cls:"tall",  active:true, order:7 },
      { id:8, img:"https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=600&q=80",  alt:"Açık mutfak",               cls:"",      active:true, order:8 },
      { id:9, img:"https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80",  alt:"Özel yemek odası",          cls:"",      active:true, order:9 }
    ],
    reservations: [
      { id:1, name:"Ahmet Yılmaz",    phone:"+90 532 111 22 33", email:"ahmet@mail.com", date:"2025-06-20", time:"20:00", guests:2, notes:"Yıldönümü",          status:"confirmed", createdAt:"2025-06-14T10:00:00Z" },
      { id:2, name:"Sarah Johnson",   phone:"+44 7700 900123",   email:"sarah@mail.com", date:"2025-06-21", time:"19:30", guests:4, notes:"Laktoz intoleransı", status:"pending",   createdAt:"2025-06-14T11:30:00Z" },
      { id:3, name:"Marco Ferrari",   phone:"+39 340 111 2222",  email:"marco@mail.com", date:"2025-06-21", time:"21:00", guests:6, notes:"VIP masa",           status:"confirmed", createdAt:"2025-06-14T12:00:00Z" },
      { id:4, name:"Elif Kaya",       phone:"+90 541 333 44 55", email:"elif@mail.com",  date:"2025-06-22", time:"20:30", guests:3, notes:"",                    status:"pending",   createdAt:"2025-06-14T13:00:00Z" },
      { id:5, name:"David Chen",      phone:"+1 415 555 0100",   email:"david@mail.com", date:"2025-06-22", time:"19:00", guests:2, notes:"Pencere kenarı",     status:"cancelled", createdAt:"2025-06-14T14:00:00Z" },
      { id:6, name:"Fatma Demir",     phone:"+90 555 666 77 88", email:"fatma@mail.com", date:"2025-06-23", time:"13:00", guests:5, notes:"İş yemeği",          status:"confirmed", createdAt:"2025-06-14T15:00:00Z" }
    ],
    testimonials: [
      { id:1, text:"İstanbul'da yediğim en iyi biftek buydu. 45 günlük dry-aged T-bone olağanüstüydü.", name:"James Whitmore",  via:"Google Reviews", stars:5, active:true, featured:true  },
      { id:2, text:"Tadım menüsü bizi unutulmaz bir yolculuğa çıkardı. Sommelier'in şarap eşleşmesi harikaydı.", name:"Lena Hoffmann", via:"TripAdvisor",    stars:5, active:true, featured:true  },
      { id:3, text:"Yıldönümümüzü burada kutladık, sihir gibiydi. Özel yemek odası, kişiselleştirilmiş menü mükemmeldi.", name:"Ali & Defne Kaya", via:"Google Reviews", stars:5, active:true, featured:false },
      { id:4, text:"Tomahawk biftek inanılmazdı. Personelin ilgisi ve özeni her şeyi çok daha özel yaptı.", name:"Marcus Reynolds", via:"Google Reviews", stars:5, active:true, featured:false },
      { id:5, text:"Bir şef olarak nadiren etkilenirim ama Ember & Oak beni gerçekten şaşırttı.", name:"Sophie Laurent",    via:"OpenTable",      stars:5, active:true, featured:true  },
      { id:6, text:"Beş yıldır geliyoruz ve kalite hiç düşmüyor. Mevsim menüsü her zaman yeni bir şeyler sunuyor.", name:"Burak Yıldız",     via:"Yelp",           stars:5, active:true, featured:false }
    ],
    messages: [
      { id:1, name:"Deniz Acar",    email:"deniz@mail.com", subject:"Kurumsal etkinlik",  message:"50 kişilik kurumsal yemek organizasyonu için bilgi almak istiyorum.", read:false, createdAt:"2025-06-14T09:00:00Z" },
      { id:2, name:"Tom Williams",  email:"tom@mail.com",   subject:"Private dining",      message:"I would like to book the private dining room for a birthday surprise.", read:true,  createdAt:"2025-06-13T16:00:00Z" },
      { id:3, name:"Zeynep Arslan", email:"zeynep@ml.com",  subject:"Gluten-free menü",   message:"Glutene duyarlıyım, menünüzde uygun seçenekler var mı?",              read:false, createdAt:"2025-06-13T10:00:00Z" }
    ]
  };
}

// ─── INITIALIZE DB ────────────────────────────────────────────
if (!fs.existsSync(path.join(__dirname,'data'))) fs.mkdirSync(path.join(__dirname,'data'));
if (!fs.existsSync(DATA_FILE)) writeDB(getDefaultDB());

// ─── BODY PARSER ─────────────────────────────────────────────
function parseBody(req) {
  return new Promise((res, rej) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { res(body ? JSON.parse(body) : {}); }
      catch { res({}); }
    });
    req.on('error', rej);
  });
}

// ─── CORS & JSON HELPERS ─────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ─── API ROUTER ───────────────────────────────────────────────
async function handleAPI(req, res, pathname) {
  const method = req.method;
  const parts  = pathname.replace('/api/', '').split('/');
  const resource = parts[0];
  const id = parts[1] ? parseInt(parts[1]) : null;
  const db = readDB();

  // Dashboard stats
  if (resource === 'stats' && method === 'GET') {
    const r = db.reservations;
    return sendJSON(res, {
      totalReservations: r.length,
      pendingReservations: r.filter(x => x.status === 'pending').length,
      confirmedToday: r.filter(x => x.status === 'confirmed' && x.date === new Date().toISOString().split('T')[0]).length,
      totalMenuItems: db.menuItems.filter(x => x.active).length,
      totalGallery: db.gallery.filter(x => x.active).length,
      unreadMessages: db.messages.filter(x => !x.read).length,
      totalTestimonials: db.testimonials.filter(x => x.active).length,
      recentReservations: r.slice(-5).reverse()
    });
  }

  // SETTINGS
  if (resource === 'settings') {
    if (method === 'GET') return sendJSON(res, db.settings);
    if (method === 'PUT') {
      const body = await parseBody(req);
      db.settings = { ...db.settings, ...body };
      writeDB(db);
      return sendJSON(res, { ok: true, settings: db.settings });
    }
  }

  // MENU CATEGORIES
  if (resource === 'menuCategories') {
    if (method === 'GET') return sendJSON(res, db.menuCategories);
    if (method === 'POST') {
      const body = await parseBody(req);
      const cat = { ...body, id: nextId(db.menuCategories) };
      db.menuCategories.push(cat);
      writeDB(db);
      return sendJSON(res, cat, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.menuCategories.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.menuCategories[i] = { ...db.menuCategories[i], ...body };
      writeDB(db);
      return sendJSON(res, db.menuCategories[i]);
    }
    if (method === 'DELETE' && id) {
      db.menuCategories = db.menuCategories.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  // MENU ITEMS
  if (resource === 'menuItems') {
    if (method === 'GET') {
      const cat = new url.URL(req.url, `http://localhost`).searchParams.get('cat');
      const items = cat ? db.menuItems.filter(x => x.cat === cat) : db.menuItems;
      return sendJSON(res, items);
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      const item = { ...body, id: nextId(db.menuItems), active: true };
      db.menuItems.push(item);
      writeDB(db);
      return sendJSON(res, item, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.menuItems.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.menuItems[i] = { ...db.menuItems[i], ...body };
      writeDB(db);
      return sendJSON(res, db.menuItems[i]);
    }
    if (method === 'DELETE' && id) {
      db.menuItems = db.menuItems.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  // GALLERY
  if (resource === 'gallery') {
    if (method === 'GET') return sendJSON(res, db.gallery);
    if (method === 'POST') {
      const body = await parseBody(req);
      const item = { ...body, id: nextId(db.gallery), active: true, order: db.gallery.length + 1 };
      db.gallery.push(item);
      writeDB(db);
      return sendJSON(res, item, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.gallery.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.gallery[i] = { ...db.gallery[i], ...body };
      writeDB(db);
      return sendJSON(res, db.gallery[i]);
    }
    if (method === 'DELETE' && id) {
      db.gallery = db.gallery.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  // RESERVATIONS
  if (resource === 'reservations') {
    if (method === 'GET') return sendJSON(res, db.reservations.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)));
    if (method === 'POST') {
      const body = await parseBody(req);
      const item = { ...body, id: nextId(db.reservations), status: 'pending', createdAt: new Date().toISOString() };
      db.reservations.push(item);
      writeDB(db);
      return sendJSON(res, item, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.reservations.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.reservations[i] = { ...db.reservations[i], ...body };
      writeDB(db);
      return sendJSON(res, db.reservations[i]);
    }
    if (method === 'DELETE' && id) {
      db.reservations = db.reservations.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  // TESTIMONIALS
  if (resource === 'testimonials') {
    if (method === 'GET') return sendJSON(res, db.testimonials);
    if (method === 'POST') {
      const body = await parseBody(req);
      const item = { ...body, id: nextId(db.testimonials), active: true };
      db.testimonials.push(item);
      writeDB(db);
      return sendJSON(res, item, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.testimonials.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.testimonials[i] = { ...db.testimonials[i], ...body };
      writeDB(db);
      return sendJSON(res, db.testimonials[i]);
    }
    if (method === 'DELETE' && id) {
      db.testimonials = db.testimonials.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  // MESSAGES
  if (resource === 'messages') {
    if (method === 'GET') return sendJSON(res, db.messages.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)));
    if (method === 'POST') {
      const body = await parseBody(req);
      const item = { ...body, id: nextId(db.messages), read: false, createdAt: new Date().toISOString() };
      db.messages.push(item);
      writeDB(db);
      return sendJSON(res, item, 201);
    }
    if (method === 'PUT' && id) {
      const body = await parseBody(req);
      const i = db.messages.findIndex(x => x.id === id);
      if (i === -1) return sendJSON(res, { error: 'Not found' }, 404);
      db.messages[i] = { ...db.messages[i], ...body };
      writeDB(db);
      return sendJSON(res, db.messages[i]);
    }
    if (method === 'DELETE' && id) {
      db.messages = db.messages.filter(x => x.id !== id);
      writeDB(db);
      return sendJSON(res, { ok: true });
    }
  }

  sendJSON(res, { error: 'Not found' }, 404);
}

// ─── MAIN SERVER ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const parsed   = url.parse(req.url);
  const pathname = parsed.pathname;

  // API routes
  if (pathname.startsWith('/api/')) {
    return handleAPI(req, res, pathname).catch(err => {
      console.error(err);
      sendJSON(res, { error: 'Server error' }, 500);
    });
  }

  // Static file serving
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html') {
    filePath = path.join(__dirname, 'public', 'admin.html');
  } else {
    filePath = path.join(__dirname, 'public', pathname);
  }

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 – Sayfa bulunamadı</h1>');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     🔥 Ember & Oak – Server Başlatıldı       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🌐 Ana Site:   http://localhost:${PORT}          ║`);
  console.log(`║  ⚙️  Admin:     http://localhost:${PORT}/admin     ║`);
  console.log(`║  📡 API:       http://localhost:${PORT}/api/       ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
});
