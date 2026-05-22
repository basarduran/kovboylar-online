# Yankeeler vs Redneckler v18 - Socket.IO

Bu sürüm Playroom kullanmaz. Gerçek Node.js + Socket.IO sunucusu kullanır.

## Lokal test

```bash
npm install
npm start
```

Sonra tarayıcıdan:

```text
http://localhost:3000
```

## Kullanım

- Host: ODA OLUŞTUR butonuna basar.
- Ekrandaki 4 karakterli kodu arkadaşına gönderir.
- Guest: aynı linke girer, kodu yazar, KODLA KATIL der.
- Oyun fiziği sunucuda çalışır. Host başka sekmeye geçse bile oyun durmaz.

## Deploy

Render veya Railway üzerinde Node.js web service olarak yayınla.
Start command:

```bash
npm start
```

Port otomatik olarak `process.env.PORT` üzerinden alınır.

## v17 düzeltmesi

Oda kodu giriş kutusu aktifken global oyun klavye dinleyicileri devre dışı bırakıldı. Böylece input kutusuna yazarken canvas focus'u inputtan çalmaz.

## v18 değişiklikleri

- Final cutscene eski retro piksel ölüş animasyonuna döndürüldü.
- Host artık oda kodunu manuel belirleyebilir. Boş bırakırsa sunucu otomatik kod üretir.
- Oyun state yayını `volatile.emit` ile gönderilir; eski pozisyon paketleri birikmez.
- Client bağlantısı WebSocket'i önceliklendirir.
- Socket.IO ping ayarları daha kısa aralıkla bağlantı sağlığını kontrol edecek şekilde ayarlandı.
