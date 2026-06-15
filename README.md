# 🔥 Ember & Oak – Restaurant Website + Admin Panel

Profesyonel restoran websitesi ve tam kapsamlı yönetim paneli.
**Sıfır bağımlılık** – sadece Node.js gerekli, başka hiçbir şey kurmana gerek yok.

---

## 🚀 Kurulum (3 adım)

### 1. Node.js Kur
https://nodejs.org → "LTS" sürümünü indir ve kur

### 2. Terminali Aç
Proje klasörüne sağ tıkla → "Terminal'de Aç"
- **Windows:** PowerShell veya CMD
- **Mac:** Terminal
- **Linux:** Bash

### 3. Sunucuyu Başlat

**Windows için:** `BASLAT.bat` dosyasına çift tıkla
**Mac/Linux için:** Terminalde `bash baslat.sh` yaz

**Ya da direkt:**
```bash
node server.js
```

Terminalde şunu göreceksin:
```
╔══════════════════════════════════════════════╗
║     🔥 Ember & Oak – Server Başlatıldı       ║
╠══════════════════════════════════════════════╣
║  🌐 Ana Site:   http://localhost:3000          ║
║  ⚙️  Admin:     http://localhost:3000/admin     ║
╚══════════════════════════════════════════════╝
```

Tarayıcında aç:
- **Ana Site:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## 📁 Dosya Yapısı

```
restaurant-admin/
├── server.js              ← Node.js sunucu (tüm API burda)
├── package.json
├── BASLAT.bat             ← Windows başlatma
├── baslat.sh              ← Mac/Linux başlatma
├── README.md
├── data/
│   └── db.json            ← Tüm veriler (otomatik oluşur)
└── public/
    ├── index.html         ← Ana restoran sitesi
    └── admin.html         ← Admin paneli
```

---

## ⚙️ Admin Panel Bölümleri

| Bölüm | Açıklama |
|-------|----------|
| 📊 Dashboard | Canlı istatistikler, son rezervasyonlar, okunmamış mesajlar |
| 🍽️ Menü Yönetimi | Ürün & kategori ekle/düzenle/sil, Chef's Pick, aktif/pasif |
| 🖼️ Galeri | Fotoğraf ekle/sil, normal/tall/wide boyut seçimi |
| 📅 Rezervasyonlar | Listele, onayla, iptal et, filtrele, detay görüntüle |
| 💬 Yorumlar | Müşteri yorumu ekle/düzenle/sil, öne çıkan yorum |
| ✉️ Mesajlar | Okunmamış mesajlar, e-posta ile yanıtla |
| 🏠 Genel Bilgiler | Restoran adı, slogan, telefon, adres, şef bilgisi |
| 🕐 Çalışma Saatleri | Günlere göre saat ayarla, satır ekle/sil |
| 📈 İstatistik Kartları | Ana sayfadaki rakamları düzenle |
| 🎨 Tasarım & Renkler | Marka rengi, hazır palet seçimi |
| 🖼️ Hero & Görsel | Arka plan görseli, anlık önizleme |
| 🔗 Sosyal Medya | Instagram, Facebook, Twitter linkleri |

---

## 🎨 Farklı Restoran Tipine Uyarlama

Admin paneli üzerinden dakikalar içinde:
1. **Genel Bilgiler** → Restoran adı, iletişim bilgileri
2. **Tasarım & Renkler** → Marka rengi seç
3. **Hero & Görsel** → Arka plan fotoğrafı değiştir
4. **Menü** → Ürünleri güncelle
5. **Galeri** → Fotoğrafları güncelle

### Renk Önerileri:
- 🟡 `#c9a84c` Altın → Steakhouse, Fine Dining
- 🟢 `#2a9d8f` Deniz → Balık & deniz ürünleri
- 🌸 `#c1666b` Gül → Romantik restoran
- 🫒 `#6b9e5e` Zeytin → Akdeniz, meze restoranı
- ☕ `#8b5e3c` Kahve → Kafe, kahve dükkanı

---

## 🌍 Yayına Alma

### VPS Sunucu (Önerilen)
```bash
# PM2 ile arka planda çalıştır
npm install -g pm2
pm2 start server.js --name "restaurant"
pm2 startup && pm2 save
```

### Ücretsiz Hosting
- **Railway.app** → GitHub'a yükle, otomatik deploy
- **Render.com** → Start command: `node server.js`

### Nginx Reverse Proxy
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

---

## 🔒 Admin Şifre Koruması (Production)

`server.js` dosyasının en üstüne ekle:
```javascript
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'guclu_sifren';
```

Sonra admin rotasına ekle:
```javascript
if (pathname.startsWith('/admin')) {
  const auth = req.headers['authorization'];
  if (!auth) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Admin"' });
    return res.end('Giriş gerekli');
  }
  const [u, p] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  if (u !== ADMIN_USER || p !== ADMIN_PASS) {
    res.writeHead(401); return res.end('Hatalı şifre');
  }
}
```

---

## ❓ Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| "node bulunamadı" | nodejs.org'dan Node.js kur |
| "Port 3000 meşgul" | server.js içinde PORT=3001 yap |
| Admin paneli boş | Tarayıcı konsoluna bak (F12) |
| db.json bozuldu | Sil, sunucuyu yeniden başlat |

