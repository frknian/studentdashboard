"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionTitle } from "@/components/ui";

const TEACHER_GUIDE = [
  {
    title: "1. Öğrenci Eklemek",
    body: "Öğrenciler sekmesindeki öğretmen kodunuzu öğrencinizle paylaşın. Öğrenci kayıt olurken bu kodu girdiğinde listenize otomatik eklenir. Kart üzerinden haftalık soru hedefi ve hedef grubunu düzenleyebilirsiniz.",
  },
  {
    title: "2. Program Oluşturmak",
    body: "Program sekmesinde öğrenci seçin. Günlük / Haftalık / Aylık görünümler arasında geçiş yapın. Haftalık görünümde 7 gün kutucuk halinde listelenir; her kutudaki '+ Ders Ekle' ile o güne birden fazla ders/konu ekleyebilirsiniz. PDF butonuyla haftalık programın çıktısını alabilirsiniz.",
  },
  {
    title: "3. Ders Takvimi ve Ücret Takibi",
    body: "Takvim sekmesinden ders ekleyin (tarih, süre, ücret, ödeme durumu). Ders sonrası 'Tamamlandı' işaretleyin, 'Ödendi İşaretle' ile tahsilatı takip edin. Paneldeki 'Bekleyen Ödeme' kartına dokunarak Finans ekranından aylık tahsilat özetinizi görün. Her derse görsel ve PDF içerik (çalışma kağıdı, not) ekleyebilirsiniz.",
  },
  {
    title: "4. Görev ve Takip",
    body: "Paneldeki 'Hızlı Görev Ata' ile haftalık görev tanımlayın. Öğrenci ilerleme girdikçe ve programda tik attıkça veriler Analiz ekranına düşer. Soru Kumbarası'nda öğrencinin yüklediği soruları derste 'Çözüldü' işaretleyin.",
  },
  {
    title: "5. Veli Bilgilendirme",
    body: "Öğrenci kartındaki 'Not Yaz' ile öğrenciye ve/veya veliye mesaj gönderin. 'Veli Özetini Yenile' butonu veli ekranını günceller; 'Veli Bağlantısı' ile veliye özel salt-okunur bağlantıyı iletin. Veli hesap açmadan giriş sayfasındaki Veli Portalı'ndan girer.",
  },
];

const STUDENT_GUIDE = [
  {
    title: "1. Günlük Akış",
    body: "Panelde haftalık soru hedef barını ve serini (streak 🔥) görürsün. Her gün en az bir işlem (soru girişi, görev tamamlama) serini sürdürür.",
  },
  {
    title: "2. Program",
    body: "Program sekmesinde öğretmeninin hazırladığı günlük/haftalık/aylık planı görürsün. Bitirdiğin maddenin yanındaki daireye dokun; kaç soru çözdüğünü ve çalıştığın konuyu yazıp 'Tamamla' de.",
  },
  {
    title: "3. Soru Kumbarası",
    body: "Çözemediğin sorunun fotoğrafını çek, konu etiketini seç ve yükle. Öğretmenin derste bu soruları açıp çözer.",
  },
  {
    title: "4. Analiz",
    body: "Analiz sekmesine her gün kaç soru çözdüğünü gir; haftalık grafiğin oluşsun. Deneme sonuçlarını doğru/yanlış/boş olarak kaydet, anlamadığın konuları yaz — net grafiğin ve konu analizin otomatik oluşur.",
  },
  {
    title: "5. Takvim ve İçerikler",
    body: "Takvimde derslerini görürsün; 'Onay Bekliyor' derslerini onaylayabilir veya saat teklif edebilirsin. Ders kartlarındaki 'Ders İçerikleri' bölümünden öğretmeninin paylaştığı not, görsel ve PDF'lere ulaşırsın.",
  },
];

const PARENT_GUIDE = [
  {
    title: "Veli Portalı",
    body: "Veliler hesap açmaz. Öğretmenin paylaştığı veli bağlantısındaki kodu, giriş sayfasındaki 'Veli Portalı' sekmesine yapıştırarak girer. Kod cihazda hatırlanır. Veli ekranında ders saatleri, ödeme durumları, çalışma programı, analiz grafikleri ve öğretmen mesajları salt-okunur olarak görünür.",
  },
];

export default function GuidePage() {
  const { profile } = useAuth();
  if (!profile) return null;

  const sections =
    profile.role === "TEACHER"
      ? [...TEACHER_GUIDE, ...PARENT_GUIDE]
      : [...STUDENT_GUIDE, ...PARENT_GUIDE];

  return (
    <div>
      <h1 className="text-xl font-bold">Kullanım Kılavuzu</h1>
      <p className="mt-1 text-sm text-slate-500">
        {profile.role === "TEACHER" ? "Öğretmen" : "Öğrenci"} hesabı için adım adım
        rehber.
      </p>

      {sections.map((s) => (
        <div key={s.title}>
          <SectionTitle title={s.title} />
          <Card>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {s.body}
            </p>
          </Card>
        </div>
      ))}
    </div>
  );
}
