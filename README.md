<div align="center">

# 🎓 StudentDashboard (Öğrenci Takip & Koçluk Platformu)

**Özel ders öğretmenleri, öğrenciler ve veliler için yeni nesil, mobil öncelikli (PWA) takip, koçluk ve yönetim sistemi.**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-white?style=for-the-badge&logo=vercel&logoColor=black)](https://vercel.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

</div>

---

## 🌟 Proje Hakkında

**StudentDashboard**, özel ders veren öğretmenlerin öğrencilerini ve velilerini tek bir platform üzerinden koordine etmelerini sağlayan modern bir web uygulamasıdır. 

1'den 12'ye kadar MEB müfredatı ve LGS/YKS sınav hedefleriyle tam uyumlu çalışır. Öğretmenin ders takvimini, saatlik ders ücretlerini, haftalık ödevlendirmeyi ve soru bankasını yönetmesini sağlarken; velilerin şifresiz/güvenli token bağlantısıyla ders içeriklerini ve ödev ilerlemesini anlık takip etmesine imkan tanır.

---

## 🚀 Öne Çıkan Özellikler

### 👨‍🏫 Öğretmen Modülü
- **1-12. Sınıf MEB Müfredat Entegrasyonu:** İlkokul, ortaokul ve lise kademelerinde sınıf seçildiğinde ilgili dersler ve MEB ünite/konuları hiyerarşik olarak otomatik yüklenir.
- **Özel Ders & Konu Özelleştirme:** Her öğrencinin aldığı özel dersler (Matematik, Fizik, Türkçe vb.) belirlenebilir ve ders saatlik ücreti tanımlanabilir.
- **Ders Sonu Yapılanlar & Notlar:** Ders bitiminde işlenen konular, derste çözülen örnekler ve derste yapılanlar kaydedilir.
- **Google Drive / Harici Doküman Desteği:** Büyük boyutlu PDF'ler, kaynak kitaplar ve drive klasörleri için doğrudan Google Drive linki entegrasyonu.
- **PDF & Görsel Yükleme:** Çalışma kağıtları ve ders görselleri doğrudan eklenebilir, otomatik sıkıştırılır.
- **Kapsamlı Ödevlendirme Sistemi:**
  - Ders ve konu seçimi,
  - Ödev yönergesi / açıklaması (ör. *MEB test 3 ve 4 çözülecek*),
  - Hedef soru sayısı ve son teslim tarihi (`dueDate`),
  - Google Drive ödev linki entegrasyonu,
  - Öğrencinin ilerlemesini takip etme ve tek tıkla veliye yansıtma.
- **Ders Takvimi & Finansal Takip:** Derslerin durumu (`Bekliyor`, `Tamamlandı`, `İptal`), ödeme durumu (`Ödendi`, `Ödeme Bekliyor`, `Paket`) ve aylık gelir/alacak hesaplaması.
- **Soru Kumbarası:** Öğrencilerin yapamadığı sorular derste incelenip "Çözüldü" olarak işaretlenebilir.
- **Deneme Sınavı & Performans Analizi:** Doğru/Yanlış/Boş grafikleri, net eğrisi, anlaşılmayan konular ve müfredata göre hiç çalışılmayan konuların otomatik analizi.
- **Hızlı İletişim:** Öğrenci ve veli telefonları için tek tıkla doğrudan **Arama** ve **WhatsApp** butonları.

---

### 🎓 Öğrenci Modülü
- **Mobil Öncelikli PWA Deneyimi:** Mobil cihazlara "Ana Ekrana Ekle" özelliğiyle native uygulama hissi sunar.
- **Haftalık Hedef & Günlük Streak 🔥:** Günlük çalışma alışkanlığı kazandırmak için soru hedef barı ve streak sayacı.
- **Ödev & Görev Takibi:** Öğretmenin verdiği ödevleri görme, Drive linkini açma, çözülen soru sayısını girme ve zorluk geri bildirimiyle ödevi tamamlama.
- **Materyal İndirme:** Derse ait PDF ve görselleri tek tıkla cihaza indirme (`⬇️ İndir`).
- **Soru Kumbarası:** Yapılamayan soruları telefon kamerası veya galeriden anında yükleme (istemci tarafı görsel optimizasyonu ile).
- **Deneme Sonuçları Girişi:** Sınav netlerini, doğru-yanlış sayılarını ve eksik konuları kaydetme.
- **Ders Saati Teklifi:** Uygun olmayan dersler için öğretmene alternatif saat teklif etme.

---

### 👨‍👩‍👧 Veli Portalı (Şifresiz & Güvenli Erişim)
- **Kayıt ve Şifre Gerektirmez:** Veliye özel üretilen güvenli token bağlantısı (`/veli/[token]`) veya giriş sayfasındaki veli kodu ile anında erişim.
- **Ders İçerikleri & Yapılanlar:** Her ders sonrası öğretmenin girdiği konu özetini, Google Drive materyallerini ve ekli dosyaları inceleme.
- **Haftalık Ödev Durumu:** Çocuğun ödevlerini, teslim tarihlerini, soru hedefini ve tamamlanma oranını canlı takip etme.
- **Ders ve Ödeme Takibi:** Yapılan ders saatleri, yaklaşan dersler ve kalan/ödenen ders ücretleri.
- **Gelişim Raporu:** Deneme net grafikleri, haftalık soru çözümü ve zayıf kalınan konular.
- **Öğretmen Notları:** Öğretmenin sadece veliye özel bıraktığı bilgilendirme mesajları.

---

## 🛠 Teknoloji Yığını

| Alan | Teknoloji | Açıklama |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router mimarisi, React Server/Client Components |
| **Kütüphane** | [React 19](https://react.dev/) | En güncel React çekirdeği |
| **Dil** | [TypeScript](https://www.typescriptlang.org/) | Uçtan uca tip güvenliği |
| **Stil / Arayüz** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern ve esnek tasarım token'ları |
| **İkonlar** | [Lucide React](https://lucide.dev/) | Tutarlı ve hafif SVG ikon seti |
| **Grafikler** | [Recharts](https://recharts.org/) | İnteraktif performans ve analiz grafikleri |
| **Veritabanı & Auth** | [Firebase](https://firebase.google.com/) | Firebase Auth (Google + Email) & Cloud Firestore |
| **Sıkıştırma** | [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) | İstemci tarafı hızlı görsel küçültme |
| **Dağıtım** | [Vercel](https://vercel.com/) | Yüksek performanslı Serverless/Edge hosting |

---

## 🚀 Vercel Üzerinde Yayına Alma (Deploy to Vercel)

Projeyi Vercel'de çalıştırmak son derece kolaydır. Aşağıdaki adımları takip edebilirsiniz:

### 1. Repoyu Fork'layın veya Klonlayın
Projeyi kendi GitHub hesabınıza aktarın:
```bash
git clone https://github.com/frknian/studentdashboard.git
```

### 2. Vercel'e İçe Aktarın
1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin.
2. **"Add New Project"** butonuna tıklayın.
3. GitHub hesabınızı bağlayarak `studentdashboard` reposunu seçin.
4. **Framework Preset:** `Next.js` olarak otomatik algılanacaktır.

### 3. Ortam Değişkenlerini (Environment Variables) Tanımlayın
Vercel proje ayarlarındaki **Environment Variables** bölümüne Firebase konsolunuzdan aldığınız bilgileri ekleyin:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=proje-adi.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=proje-adi
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=proje-adi.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
```

### 4. Firebase Authentication Domain İznini Ekleyin (Önemli!)
Vercel size `proje-adi.vercel.app` şeklinde bir domain verecektir:
1. [Firebase Console](https://console.firebase.google.com/)'a gidin.
2. **Authentication** > **Settings** > **Authorized domains** sekmesini açın.
3. **Add domain** butonuna tıklayarak Vercel domaininizi (ve varsa özel alan adınızı) ekleyin.

### 5. Deploy Butonuna Basın
Vercel build işlemini tamamlayıp projenizi dünya çapında yayına alacaktır! 🎉

---

## 💻 Yerel Geliştirme (Local Setup)

Projeyi kendi bilgisayarınızda çalıştırmak için:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/frknian/studentdashboard.git
cd studentdashboard

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini oluşturun
cp .env.example .env.local

# 4. .env.local dosyasını Firebase bilgilerinizle doldurun

# 5. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

---

## 🔒 Firebase Firestore Güvenlik Kuralları (Security Rules)

Veritabanı güvenliği için projenin kök dizininde yer alan `firestore.rules` dosyasını Firebase Console'da yayınlayın:

1. Firebase Console > **Firestore Database** > **Rules** sekmesine gidin.
2. `firestore.rules` dosyasının içeriğini yapıştırın.
3. **Publish** butonuna tıklayın.

Bu kurallar:
- Öğretmenlerin sadece kendi öğrencilerini ve derslerini yönetmesini,
- Öğrencilerin yalnızca kendi ödev ve sorularına erişmesini,
- Velilerin yalnızca sahip oldukları gizli token üzerinden salt-okunur özet (`parentViews`) görmesini garanti eder.

---

## 📁 Firestore Veri Yapısı

| Koleksiyon | Açıklama |
|---|---|
| `users` | Öğretmen ve öğrenci profilleri, sınıf seviyesi (1-12), özel dersler, veli token'ı, streak |
| `lessons` | Ders randevuları, saatlik ücret, ders durumu ve tahsilat takibi |
| `tasks` | Haftalık ödevler, MEB müfredat ders/konu, hedef soru, teslim tarihi, Drive linki |
| `materials` | Derste yapılanlar, öğretmen özeti, PDF/görseller ve Google Drive linkleri |
| `plans` | Haftalık/aylık kutulu çalışma programı maddeleri |
| `questions` | Soru Kumbarası (yapılamayan soru fotoğrafları ve çözüm durumu) |
| `question_logs` | Günlük çözülen soru logları (grafik ve streak beslemesi) |
| `exam_results` | Deneme sınavı sonuçları (D/Y/B, netler, zayıf konular) |
| `notes` | Öğretmenden öğrenci veya veliye yönelik duyuru/mesajlar |
| `parentViews` | Veli portalı için şifresiz, optimize edilmiş salt-okunur özet dokümanları |

---

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır. Dilediğiniz gibi kullanabilir ve geliştirebilirsiniz.

---

<div align="center">
  Geliştirici: <b><a href="https://github.com/frknian">@frknian</a></b>
</div>
