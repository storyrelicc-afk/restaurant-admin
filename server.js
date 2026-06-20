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
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id||0))+1 : 1; }

function getDefaultDB() {
  return {
    settings: {
      restaurantName: "Restoran Adınız",
      slogan:         "Eşsiz lezzetler, unutulmaz anlar.",
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
      aboutText:      "Restoranımız, yılların deneyimi ve tutku ile hazırlanan özel tariflerimizle misafirlerine unutulmaz bir lezzet yolculuğu sunmaktadır.",
      aboutText2:     "Her tabak, özenle seçilmiş malzemeler ve ustanın elinden çıkan bir sanat eseridir. Sizleri aramızda görmekten mutluluk duyarız.",
      chefName:       "Şef Adı Soyadı",
      chefTitle:      "Executive Chef & Kurucu",
      chefImage:      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&q=80",
      aboutBadgeNum:  "3★",
      aboutBadgeText: "Ödüllü Restoran",
      hours: [
        {day:"Pazartesi – Perşembe", time:"12:00 – 23:00"},
        {day:"Cuma – Cumartesi",     time:"12:00 – 00:30"},
        {day:"Pazar",                time:"12:00 – 22:00"}
      ],
      stats: [
        {num:"10+", label:"Yıllık Deneyim"},
        {num:"50k", label:"Mutlu Misafir"},
        {num:"4.9", label:"Ortalama Puan"},
        {num:"3",   label:"Ödül"}
      ],
      socialInstagram:"#", socialFacebook:"#", socialTwitter:"#", socialTripadvisor:"#",
      primaryColor:"#c9a84c", accentColor:"#e4c97e", darkBg:"#0a0a0a",
      fontDisplay:"Cormorant Garamond", fontBody:"Inter",
      currency:"₺",
      footerText:"Eşsiz lezzet deneyimi için tasarlandı.",
      showHero:true, showStats:true, showAbout:true,
      showChef:true, showMenu:true, showGallery:true,
      showReservation:true, showTestimonials:true, showContact:true, showWhatsapp:true,
      heroEyebrow:      "Est. 2015 – İstanbul",
      heroBtnPrimary:   "Rezervasyon Yap",
      heroBtnSecondary: "Menüyü İncele",
      reservationBgImage:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
      setupDone: false
    },
    menuCategories: [
      {id:1, name:"Başlangıçlar", slug:"starters", icon:"🥗", active:true},
      {id:2, name:"Ana Yemekler", slug:"mains",    icon:"🍽️", active:true},
      {id:3, name:"Izgaralar",    slug:"grills",   icon:"🔥", active:true},
      {id:4, name:"Tatlılar",     slug:"desserts", icon:"🍮", active:true},
      {id:5, name:"İçecekler",    slug:"drinks",   icon:"🍷", active:true}
    ],
    menuItems: [
      {id:1,  name:"Mevsim Salatası",        desc:"Taze mevsim yeşillikleri, kiraz domates, zeytin, balsamik sos",          price:180, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",  order:1},
      {id:2,  name:"Mantar Çorbası",         desc:"Kremalı orman mantarı çorbası, trüf yağı, kruton",                       price:145, cat:"starters", featured:false, active:true, img:"https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80", order:2},
      {id:3,  name:"Karides Kokteyl",        desc:"İskandinav usulü karides, avokado, limon mayonezi",                      price:245, cat:"starters", featured:true,  active:true, img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", order:3},
      {id:4,  name:"Levrek Fileto",          desc:"Fırında levrek, limon tereyağı sosu, sebze garnitürü",                   price:520, cat:"mains",    featured:true,  active:true, img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80", order:1},
      {id:5,  name:"Mantarlı Risotto",       desc:"Arborio pirinci, porcini mantar, parmesan, taze kekik",                  price:380, cat:"mains",    featured:false, active:true, img:"https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80", order:2},
      {id:6,  name:"Izgara Bonfile",         desc:"250g dana bonfile, mantar sos, patates garnitürü",                       price:680, cat:"grills",   featured:true,  active:true, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",  order:1},
      {id:7,  name:"Kuzu Pirzola",           desc:"Frenk üzümü sosu, ızgara sebze, nane jölesi",                            price:590, cat:"grills",   featured:false, active:true, img:"https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",  order:2},
      {id:8,  name:"Tavuk Şiş",              desc:"Marine edilmiş tavuk, közlenmiş biber, pilav, cacık",                    price:320, cat:"grills",   featured:false, active:true, img:"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80", order:3},
      {id:9,  name:"Çikolatalı Sufle",       desc:"Sıcak çikolata sufle, vanilyalı dondurma, çilek",                        price:165, cat:"desserts", featured:true,  active:true, img:"https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80", order:1},
      {id:10, name:"Crème Brûlée",           desc:"Geleneksel Fransız tatlısı, karamelize şeker, mevsim meyvesi",           price:145, cat:"desserts", featured:false, active:true, img:"https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=600&q=80", order:2},
      {id:11, name:"Limonata",               desc:"Taze sıkılmış limon, nane, şurup — soğuk veya soda ile",                 price:75,  cat:"drinks",   featured:false, active:true, img:"https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80", order:1},
      {id:12, name:"Türk Kahvesi",           desc:"Geleneksel pişirme, lokum ikramı ile",                                   price:65,  cat:"drinks",   featured:false, active:true, img:"https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80", order:2}
    ],
    gallery: [
      {id:1, img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",  alt:"Restoran iç mekan",      cls:"tall", active:true, order:1},
      {id:2, img:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",  alt:"Özel tabak sunumu",      cls:"",     active:true, order:2},
      {id:3, img:"https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=600&q=80",  alt:"Şef mutfakta",           cls:"",     active:true, order:3},
      {id:4, img:"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80",   alt:"Akşam yemeği ortamı",    cls:"wide", active:true, order:4},
      {id:5, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",     alt:"Izgara biftek sunumu",   cls:"",     active:true, order:5},
      {id:6, img:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80",  alt:"Şarap servisi",          cls:"",     active:true, order:6},
      {id:7, img:"https://images.unsplash.com/photo-1486297678162-eb2a19b0a318?w=600&q=80",  alt:"Tatlı sunumu",           cls:"tall", active:true, order:7},
      {id:8, img:"https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80",  alt:"Özel yemek odası",       cls:"",     active:true, order:8},
      {id:9, img:"https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80",  alt:"Restoran girişi",        cls:"",     active:true, order:9}
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

    db.settings = {
      ...db.settings,
      restaurantName: body.restaurantName.trim(),
      slogan:         body.slogan        || '',
      phone:          body.phone         || '',
      whatsapp:       body.whatsapp      || '',
      email:          body.email         || '',
      address:        body.address       || '',
      primaryColor:   body.primaryColor  || '#c9a84c',
      currency:       body.currency      || '₺',
      heroEyebrow:    body.heroEyebrow   || '',
      adminUser:      body.adminUser.trim(),
      adminPass:      body.adminPass,
      setupDone:      true
    };
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
