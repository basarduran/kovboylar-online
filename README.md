# Yankeeler vs Redneckler v16 - Socket.IO

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
