# Yankeeler vs Redneckler v22 - Socket.IO

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

## v19 değişiklikleri

- Client-side prediction eklendi: oyuncu kendi ekranında yönlendirmeyi anında görür.
- Lokal görsel mermi efekti eklendi: ateş tuşuna basınca ışın hemen görünür, sunucu sonucu arkadan doğrular.
- Input gönderimi 33ms yerine 16ms aralığa çekildi ve keydown/keyup anında input gönderiliyor.
- Socket.IO yalnızca WebSocket transport ile çalışacak şekilde ayarlandı.
- Sunucu tick oranı 60 FPS'ten 90 FPS'e çıkarıldı.
- Oyun state yayınında volatile + compress(false) kullanılıyor.

## v20 değişiklikleri

- Her isabet anında vurulan oyuncunun üzerinde basit kan efekti çıkar.
- Vurulan oyuncu 0,5 saniye kırmızı flaş gibi yanıp söner.
- Bu 0,5 saniyelik sürede oyuncu tekrar vurulamaz.
- Hit event güvenilir Socket.IO eventi olarak ayrıca gönderilir; efekt/ses state paketinden bağımsız çalışır.
- Vurulma sesi Web Audio API ile tarayıcıda sentezlenir; harici ses dosyası gerekmez.

## v21 değişiklikleri

- Kodla Katıl hatası düzeltildi.
- Önceki sürümde host manuel kodu 3-8 karakter gibi görünse de istemci `cleanCode()` kodu 4 karaktere kesiyordu.
- Guest tarafındaki `KODLA KATIL` kontrolü 4 karakter şartından 3-8 karakter aralığına alındı.
- Host ve guest artık aynı 3-8 karakterli kodu kullanabilir.
- Konsola `joinRoom` ve `joined` debug kayıtları eklendi.

## v22 değişiklikleri

- Kodla Katıl butonu ACK callback ile güvenceye alındı.
- Butona basınca ekranda anında durum mesajı görünür.
- Sunucudan 5 saniye içinde cevap gelmezse kullanıcıya timeout mesajı gösterilir.
- Socket.IO transport kısıtlaması kaldırıldı; varsayılan polling + WebSocket upgrade fallback çalışır.
- Server createRoom/joinRoom eventleri callback cevabı döndürür.
