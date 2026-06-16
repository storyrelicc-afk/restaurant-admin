/**
 * Restaurant Admin Panel Server
 * Ana site: http://localhost:3000
 * Admin panel: http://localhost:3000/admin  (kurulum sihirbazından belirlenir)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;
// Kullanıcı adı & şifre artık db.json'dan okunuyor (kurulum sihirbazında belirlenir)
// Fallback: kurulum tamamlanmamışsa hiçbir şey çalışmaz

// ─── PERSISTENT STORAGE ───────────────────────────────────────
// Railway Volume: Mount Path = /app/data
// Variables'a ekle: DATA_DIR=/app/data  UPLOAD_DIR=/app/data/uploads
const DATA_DIR   = process.env.DATA_DIR   || path.join(__dirname, 'data');
const DATA_FILE  = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads');

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
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id||0))+1 : 1; }

function getDefaultDB() {
  return {
    settings: {
      // ── Kimlik ─────────────────────────────────────────────
      restaurantName: "",
      slogan:         "",
      // ── İletişim ───────────────────────────────────────────
      phone:    "",
      whatsapp: "",
      email:    "",
      address:  "",
      mapEmbed: "",
      // ── Görsel ─────────────────────────────────────────────
      logoUrl:    "",
      faviconUrl: "",
      heroImage:  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=80",
      heroOverlayOpacity: 0.5,
      aboutImage: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=800&q=80",
      // ── Hakkımızda ─────────────────────────────────────────
      aboutText:      "",
      aboutText2:     "",
      chefName:       "",
      chefTitle:      "",
      chefImage:      "",
      aboutBadgeNum:  "★",
      aboutBadgeText: "Ödüllü Restoran",
      // ── Saatler & İstatistikler ────────────────────────────
      hours: [
        {day:"Pazartesi – Cuma",  time:"12:00 – 23:00"},
        {day:"Cumartesi – Pazar", time:"12:00 – 00:00"}
      ],
      stats: [
        {num:"—", label:"Yıllık Deneyim"},
        {num:"—", label:"Mutlu Misafir"},
        {num:"—", label:"Ortalama Puan"},
        {num:"—", label:"Ödül"}
      ],
      // ── Sosyal Medya ───────────────────────────────────────
      socialInstagram:"#", socialFacebook:"#", socialTwitter:"#", socialTripadvisor:"#",
      // ── Tasarım ────────────────────────────────────────────
      primaryColor:"#c9a84c", accentColor:"#e4c97e", darkBg:"#0a0a0a",
      fontDisplay:"Cormorant Garamond", fontBody:"Inter",
      currency:"₺",
      footerText:"",
      // ── Bölüm görünürlüğü ──────────────────────────────────
      showHero:true, showStats:true, showAbout:true,
      showChef:true, showMenu:true, showGallery:true,
      showReservation:true, showTestimonials:true, showContact:true, showWhatsapp:true,
      // ── Hero içerik ────────────────────────────────────────
      heroEyebrow:      "",
      heroBtnPrimary:   "Rezervasyon Yap",
      heroBtnSecondary: "Menüyü İncele",
      // ── Rezervasyon ────────────────────────────────────────
      reservationBgImage:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
      // ── Kurulum durumu ─────────────────────────────────────
      setupDone: false
    },
    menuCategories: [],
    menuItems:      [],
    gallery:        [],
    reservations:   [],
    testimonials:   [],
    messages:       []
  };
}

// ─── INIT ─────────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR,  {recursive:true});
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR,{recursive:true});
if (!fs.existsSync(DATA_FILE))  writeDB(getDefaultDB());

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
  const [u,p] = Buffer.from(auth.slice(6),'base64').toString().split(':');
  // Kimlik bilgilerini db'den oku — kurulumda belirlendi
  try {
    const db = readDB();
    const adminUser = db.settings.adminUser || '';
    const adminPass = db.settings.adminPass || '';
    // Kurulum tamamlanmamışsa sadece setup endpoint'ine izin ver
    if (!db.settings.setupDone) return false;
    return u === adminUser && p === adminPass;
  } catch {
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
      // Kullanıcı adı ve şifre db'ye kaydedilir
      adminUser:      body.adminUser.trim(),
      adminPass:      body.adminPass,
      setupDone:      true
    };
    writeDB(db);
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
      return sendJSON(res, item, 201);
    }
    if (method==='PUT' && id) {
      const body = await parseBody(req);
      const i = db[resource].findIndex(x=>x.id===id);
      if (i===-1) return sendJSON(res,{error:'Not found'},404);
      db[resource][i] = {...db[resource][i], ...body};
      writeDB(db);
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

  // Public endpoint'ler - auth gerektirmez
  const isPublicAPI = pathname === '/api/setup-status'
    || pathname === '/api/setup'
    || (pathname === '/api/reservations' && req.method === 'POST');

  // Admin HTML her zaman yüklenir — içindeki JS kurulum/auth kontrolü yapar
  const isAdminHTML = (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html');

  // API koruması — WWW-Authenticate header'ı YOK (tarayıcı popup açmasın)
  const isWriteAPI  = pathname.startsWith('/api/') && !['GET','OPTIONS'].includes(req.method);
  const isReadAPI   = pathname.startsWith('/api/') && req.method === 'GET';
  const isUploadAPI = pathname.startsWith('/api/upload');
  const needsAuth   = !isPublicAPI && !isAdminHTML && (isWriteAPI || isReadAPI || isUploadAPI);
  if (needsAuth && !checkAdmin(req)) {
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
