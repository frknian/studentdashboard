import type { TargetGroup } from "./types";

export interface GradeSubjectConfig {
  grade: number;
  gradeLabel: string;
  category: "İlkokul" | "Ortaokul" | "Lise";
  defaultSubjects: string[];
}

export const GRADE_CONFIGS: Record<number, GradeSubjectConfig> = {
  1: {
    grade: 1,
    gradeLabel: "1. Sınıf",
    category: "İlkokul",
    defaultSubjects: ["Türkçe", "Matematik", "Hayat Bilgisi"],
  },
  2: {
    grade: 2,
    gradeLabel: "2. Sınıf",
    category: "İlkokul",
    defaultSubjects: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce"],
  },
  3: {
    grade: 3,
    gradeLabel: "3. Sınıf",
    category: "İlkokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "Hayat Bilgisi", "İngilizce"],
  },
  4: {
    grade: 4,
    gradeLabel: "4. Sınıf",
    category: "İlkokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü"],
  },
  5: {
    grade: 5,
    gradeLabel: "5. Sınıf",
    category: "Ortaokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü"],
  },
  6: {
    grade: 6,
    gradeLabel: "6. Sınıf",
    category: "Ortaokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü"],
  },
  7: {
    grade: 7,
    gradeLabel: "7. Sınıf",
    category: "Ortaokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü"],
  },
  8: {
    grade: 8,
    gradeLabel: "8. Sınıf (LGS)",
    category: "Ortaokul",
    defaultSubjects: ["Türkçe", "Matematik", "Fen Bilimleri", "T.C. İnkılap Tarihi", "Din Kültürü", "İngilizce"],
  },
  9: {
    grade: 9,
    gradeLabel: "9. Sınıf",
    category: "Lise",
    defaultSubjects: ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "İngilizce"],
  },
  10: {
    grade: 10,
    gradeLabel: "10. Sınıf",
    category: "Lise",
    defaultSubjects: ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "İngilizce"],
  },
  11: {
    grade: 11,
    gradeLabel: "11. Sınıf",
    category: "Lise",
    defaultSubjects: ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "İngilizce"],
  },
  12: {
    grade: 12,
    gradeLabel: "12. Sınıf (YKS)",
    category: "Lise",
    defaultSubjects: ["TYT Türkçe", "TYT Temel Matematik", "TYT Fen Bilimleri", "TYT Sosyal Bilimler", "AYT Matematik", "AYT Fizik", "AYT Kimya", "AYT Biyoloji"],
  },
};

export const GROUP_SUBJECTS: Record<TargetGroup, string[]> = {
  LGS: [
    "Türkçe",
    "Matematik",
    "Fen Bilimleri",
    "T.C. İnkılap Tarihi",
    "Din Kültürü",
    "İngilizce",
  ],
  YKS_SAY: [
    "TYT Türkçe",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "TYT Sosyal Bilimler",
    "AYT Matematik",
    "AYT Fizik",
    "AYT Kimya",
    "AYT Biyoloji",
  ],
  YKS_EA: [
    "TYT Türkçe",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "TYT Sosyal Bilimler",
    "AYT Matematik",
    "AYT Türk Dili ve Edebiyatı",
    "AYT Tarih-1",
    "AYT Coğrafya-1",
  ],
  YKS_SOZ: [
    "TYT Türkçe",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "TYT Sosyal Bilimler",
    "AYT Türk Dili ve Edebiyatı",
    "AYT Tarih-1",
    "AYT Coğrafya-1",
    "AYT Tarih-2",
    "AYT Coğrafya-2",
    "AYT Felsefe Grubu",
    "AYT Din Kültürü",
  ],
  ARA_SINIF: [
    "Türkçe",
    "Matematik",
    "Fen Bilimleri",
    "Sosyal Bilgiler",
    "İngilizce",
  ],
};

export function getSubjects(grade?: number, group?: TargetGroup): string[] {
  if (grade !== undefined && grade >= 1 && grade <= 12) {
    if (grade === 12 && group && GROUP_SUBJECTS[group]) {
      return GROUP_SUBJECTS[group];
    }
    if (grade === 11 && group && group !== "ARA_SINIF") {
      return GROUP_SUBJECTS[group];
    }
    if (GRADE_CONFIGS[grade]) {
      return GRADE_CONFIGS[grade].defaultSubjects;
    }
  }

  if (group && GROUP_SUBJECTS[group]) {
    return GROUP_SUBJECTS[group];
  }

  return GRADE_CONFIGS[8].defaultSubjects;
}

export function suggestGroup(grade: number): TargetGroup {
  if (grade === 8) return "LGS";
  if (grade === 11 || grade === 12) return "YKS_SAY";
  return "ARA_SINIF";
}

export function getGradeLabel(grade?: number): string {
  if (!grade || !GRADE_CONFIGS[grade]) return "—";
  const cfg = GRADE_CONFIGS[grade];
  return `${cfg.gradeLabel} (${cfg.category})`;
}

const TURKCE = [
  "Sözcükte Anlam",
  "Cümlede Anlam",
  "Paragraf",
  "Ses Bilgisi ve Yazım",
  "Noktalama",
  "Dil Bilgisi",
  "Metin Türleri",
  "Anlatım Bozukluğu",
];

const MAT_ILK_ORTA = [
  "Doğal Sayılar ve İşlemler",
  "Kesirler",
  "Ondalık Gösterim",
  "Oran-Orantı",
  "Yüzdeler",
  "Üslü ve Köklü Sayılar",
  "Cebirsel İfadeler",
  "Denklemler",
  "Geometri",
  "Veri Analizi ve Olasılık",
  "Problemler",
];

const MAT_LISE = [
  "Mantık ve Kümeler",
  "Fonksiyonlar",
  "Polinomlar",
  "İkinci Dereceden Denklemler",
  "Trigonometri",
  "Logaritma",
  "Diziler",
  "Limit ve Süreklilik",
  "Türev",
  "İntegral",
  "Olasılık",
  "Analitik Geometri",
];

const FEN = [
  "Madde ve Özellikleri",
  "Kuvvet ve Hareket",
  "Enerji",
  "Elektrik",
  "Işık ve Ses",
  "Canlılar ve Yaşam",
  "Hücre",
  "İnsan ve Çevre",
  "Dünya ve Evren",
];

const SOSYAL = [
  "İletişim ve İnsan İlişkileri",
  "Türk Tarihinde Yolculuk",
  "Ülkemizin Coğrafyası",
  "Vatandaşlık",
  "Ekonomi ve Üretim",
  "Kültür ve Miras",
  "Küresel Bağlantılar",
];

const HAYAT_BILGISI = [
  "Ben ve Çevrem",
  "Doğa ve Olaylar",
  "Toplum Kuralları",
  "Ülkem ve Dünya",
  "Sağlık ve Güvenlik",
];

const INGILIZCE = ["Vocabulary", "Grammar", "Reading", "Listening", "Writing", "Speaking"];

const DIN = [
  "İman Esasları",
  "İbadetler",
  "Peygamberimiz'in Hayatı",
  "Ahlak ve Değerler",
  "Kur'an ve Yorumu",
  "İslam Tarihi",
];

const INKILAP = [
  "Milli Mücadele'ye Hazırlık",
  "Kurtuluş Savaşı",
  "Cumhuriyet'in İlanı",
  "Atatürk İlkeleri ve İnkılaplar",
  "Türk Dış Politikası",
  "Atatürk'ün Hayatı",
];

const EDEBIYAT = [
  "Güzel Sanatlar ve Edebiyat",
  "Halk Edebiyatı",
  "Divan Edebiyatı",
  "Tanzimat Edebiyatı",
  "Servet-i Fünun ve Fecr-i Ati",
  "Milli Edebiyat",
  "Cumhuriyet Dönemi Şiir",
  "Cumhuriyet Dönemi Roman ve Hikaye",
  "Garip ve İkinci Yeni",
  "Dil Bilgisi",
];

const FIZIK = [
  "Madde ve Özellikleri",
  "Hareket ve Kuvvet",
  "İş, Güç ve Enerji",
  "Isı ve Sıcaklık",
  "Elektrik ve Manyetizma",
  "Basınç ve Kaldırma Kuvveti",
  "Optik",
  "Dalgalar",
  "Modern Fizik",
];

const KIMYA = [
  "Kimya Bilimi",
  "Atom ve Periyodik Sistem",
  "Kimyasal Türler Arası Etkileşimler",
  "Maddenin Halleri",
  "Karışımlar",
  "Asitler, Bazlar ve Tuzlar",
  "Mol Kavramı ve Kimya Yasaları",
  "Kimyasal Tepkimeler",
  "Organik Kimya",
];

const BIYOLOJI = [
  "Canlıların Ortak Özellikleri",
  "Hücre ve Organelleri",
  "Sınıflandırma",
  "Hücre Bölünmeleri",
  "Kalıtım",
  "Ekosistem Ekolojisi",
  "İnsan Fizyolojisi",
  "Bitkiler Biyolojisi",
  "Canlılık ve Enerji Dönüşümleri",
];

const TARIH = [
  "İlk ve Orta Çağ Uygarlıkları",
  "Türk-İslam Devletleri",
  "Osmanlı Kuruluş ve Yükselme",
  "Osmanlı Dağılma Dönemi",
  "Milli Mücadele",
  "Atatürk Dönemi",
  "Çağdaş Türk ve Dünya Tarihi",
];

const COGRAFYA = [
  "Doğa ve İnsan Etkileşimi",
  "Türkiye'nin Coğrafi Konumu",
  "İklim Bilgisi",
  "Yer Şekilleri",
  "Nüfus ve Yerleşme",
  "Ekonomik Faaliyetler",
  "Türkiye'nin Bölgeleri",
  "Küresel Ortam ve Sorunlar",
];

const TYT_TURKCE = ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi", "Yazım ve Noktalama"];

const TYT_MAT = [
  "Temel Kavramlar ve Sayılar",
  "Bölme ve Bölünebilme",
  "Rasyonel ve Ondalık Sayılar",
  "Basit Eşitsizlikler ve Mutlak Değer",
  "Üslü ve Köklü Sayılar",
  "Problemler",
  "Kümeler ve Fonksiyon",
  "Permütasyon, Kombinasyon, Olasılık",
  "Veri ve İstatistik",
  "Geometri",
];

const TYT_FEN = [
  "Fizik Bilimine Giriş",
  "Madde ve Özellikleri",
  "Hareket ve Kuvvet",
  "Isı ve Sıcaklık",
  "Elektrik",
  "Canlıların Yapısı ve Hücre",
  "Kalıtım ve Madde Döngüleri",
  "Kimya Bilimi ve Karışımlar",
];

const TYT_SOYAL = [
  "Tarih Öncesi ve İlkçağ",
  "Milli Mücadele ve Atatürk Dönemi",
  "Temel Coğrafya",
  "Türkiye'nin Coğrafi Özellikleri",
  "Vatandaşlık Bilgisi",
];

const AYT_MAT = [
  "Limit ve Süreklilik",
  "Türev",
  "İntegral",
  "Trigonometri",
  "Logaritma",
  "Diziler",
  "Fonksiyonlarda İşlemler",
  "Analitik Geometri",
];

const AYT_FIZIK = [
  "Vektörler ve Bağıl Hareket",
  "Atışlar",
  "İtme ve Momentum",
  "Tork ve Denge",
  "Elektrik Alan ve Potansiyel",
  "Manyetizma ve İndüksiyon",
  "Çembersel Hareket ve Açısal Momentum",
  "Kütle Çekimi",
  "Basit Harmonik Hareket",
  "Dalga Mekaniği",
  "Atom Fiziği ve Radyoaktivite",
  "Modern Fizik ve Görelilik",
];

const AYT_KIMYA = [
  "Modern Atom Teorisi",
  "Gazlar",
  "Sıvı Çözeltiler",
  "Kimyasal Tepkimelerde Enerji",
  "Tepkime Hızı",
  "Kimyasal Denge",
  "Asit-Baz Dengesi",
  "Çözünürlük Dengesi",
  "Elektrokimya",
  "Karbon Kimyası ve Organik Bileşikler",
  "Enerji Kaynakları",
];

const AYT_BIYOLOJI = [
  "Sinir Sistemi ve Endokrin Sistem",
  "Duyu Organları",
  "Destek ve Hareket Sistemi",
  "Sindirim Sistemi",
  "Dolaşım ve Bağışıklık Sistemi",
  "Solunum Sistemi",
  "Boşaltım ve Üreme Sistemleri",
  "Komünite ve Popülasyon Ekolojisi",
  "Genden Proteine",
  "Biyoteknoloji",
  "Fotosentez, Kemosentez ve Hücresel Solunum",
];

const FELSEFE = [
  "Felsefeye Giriş",
  "Bilgi Felsefesi",
  "Varlık Felsefesi",
  "Ahlak Felsefesi",
  "Sanat Felsefesi",
  "Din Felsefesi",
  "Siyaset Felsefesi",
  "Bilim Felsefesi",
  "Psikoloji",
  "Sosyoloji",
  "Mantık",
];

export const SUBJECT_TOPICS: Record<string, string[]> = {
  "Türkçe": TURKCE,
  "Matematik": [...MAT_ILK_ORTA, ...MAT_LISE],
  "Hayat Bilgisi": HAYAT_BILGISI,
  "Fen Bilimleri": FEN,
  "Sosyal Bilgiler": SOSYAL,
  "İngilizce": INGILIZCE,
  "Din Kültürü": DIN,
  "T.C. İnkılap Tarihi": INKILAP,
  "Türk Dili ve Edebiyatı": EDEBIYAT,
  "Fizik": FIZIK,
  "Kimya": KIMYA,
  "Biyoloji": BIYOLOJI,
  "Tarih": TARIH,
  "Coğrafya": COGRAFYA,
  "TYT Türkçe": TYT_TURKCE,
  "TYT Sosyal Bilimler": TYT_SOYAL,
  "TYT Temel Matematik": TYT_MAT,
  "TYT Fen Bilimleri": TYT_FEN,
  "AYT Matematik": AYT_MAT,
  "AYT Fizik": AYT_FIZIK,
  "AYT Kimya": AYT_KIMYA,
  "AYT Biyoloji": AYT_BIYOLOJI,
  "AYT Türk Dili ve Edebiyatı": EDEBIYAT,
  "AYT Tarih-1": TARIH,
  "AYT Coğrafya-1": COGRAFYA,
  "AYT Tarih-2": TARIH,
  "AYT Coğrafya-2": COGRAFYA,
  "AYT Felsefe Grubu": FELSEFE,
  "AYT Din Kültürü": DIN,
};

export const GRADE_SUBJECT_TOPICS: Record<string, string[]> = {
  // 1. SINIF
  "1-Türkçe": [
    "Okuma-Yazmaya Hazırlık",
    "Sesler ve Harfler",
    "Hece Bilgisi",
    "Kelime (Sözcük) Bilgisi",
    "Cümle Bilgisi",
    "Okuduğunu Anlama ve Görsel Okuma",
    "Yazım ve Noktalama Temelleri",
  ],
  "1-Matematik": [
    "Doğal Sayılar (1-20)",
    "Ritmik Saymalar",
    "Doğal Sayılarla Toplama İşlemi",
    "Doğal Sayılarla Çıkarma İşlemi",
    "Paralarımız",
    "Geometrik Şekiller ve Örüntüler",
    "Uzamsal İlişkiler",
    "Zaman Ölçme (Saat, Gün, Hafta)",
    "Uzunluk ve Sıvı Ölçme Temelleri",
  ],
  "1-Hayat Bilgisi": [
    "Okulumuzda Hayat",
    "Evimizde Hayat",
    "Sağlıklı Hayat",
    "Güvenli Hayat",
    "Ülkemizde Hayat",
    "Doğada Hayat",
  ],

  // 2. SINIF
  "2-Türkçe": [
    "Harf ve Hece Bilgisi",
    "Sözlük Sırası ve Kelime Bilgisi",
    "Eş ve Zıt Anlamlı Kelimeler",
    "Eş Sesli Kelimeler",
    "Cümle Bilgisi ve Kurallı Cümle",
    "Noktalama İşaretleri",
    "Yazım Kuralları ve Büyük Harfler",
    "Metin Anlama ve 5N1K",
  ],
  "2-Matematik": [
    "Doğal Sayılar (1-100 ve Basamak Değeri)",
    "Eldeli ve Eldesiz Toplama İşlemi",
    "Onluk Bozarak Çıkarma İşlemi",
    "Geometrik Cisimler ve Şekiller",
    "Çarpma İşlemine Giriş ve Çarpım Tablosu",
    "Bölme İşlemi Temelleri",
    "Kesirler (Bütün, Yarım, Çeyrek)",
    "Zaman Ölçme ve Paralarımız",
    "Uzunluk ve Sıvı Ölçme",
  ],
  "2-Hayat Bilgisi": [
    "Okulumuzda Hayat",
    "Evimizde Hayat",
    "Sağlıklı Hayat",
    "Güvenli Hayat",
    "Ülkemizde Hayat",
    "Doğada Hayat",
  ],
  "2-İngilizce": [
    "Words & Greetings",
    "Friends & Numbers (1-20)",
    "In the Classroom",
    "Colors & Shapes",
    "At the Playground",
    "Body Parts",
    "Pets & Animals",
  ],

  // 3. SINIF
  "3-Türkçe": [
    "Sözcükte Anlam ve Gerçek-Mecaz Anlam",
    "Eş, Zıt ve Eş Sesli Sözcükler",
    "Cümlede Anlam ve Cümle Tamamlama",
    "Noktalama İşaretleri",
    "Büyük Harflerin Kullanımı ve Yazım Kuralları",
    "Paragrafta Ana Fikir ve Başlık",
    "Hikaye Unsurları",
    "Atasözleri ve Deyimler",
  ],
  "3-Matematik": [
    "3 Basamaklı Doğal Sayılar ve Basamak Değeri",
    "Toplama ve Çıkarma İşlemleri (Problemler)",
    "Çarpma İşlemi ve Kat Problemleri",
    "Bölme İşlemi ve Kalan İlişkisi",
    "Kesirler (Pay-Payda, Birim Kesir)",
    "Zaman Ölçme ve Paralarımız",
    "Uzunluk ve Çevre Ölçme",
    "Alan ve Sıvı Ölçme",
    "Tartma ve Grafik Okuma",
  ],
  "3-Fen Bilimleri": [
    "Gezegenimizi Tanıyalım (Dünya'nın Katmanları)",
    "Beş Duyumuz ve Organlarımız",
    "Kuvveti Tanıyalım (İtme, Çekme, Hızlanma)",
    "Maddeyi Tanıyalım (Katı, Sıvı, Gaz, Özellikler)",
    "Çevremizdeki Işık ve Sesler",
    "Canlılar Dünyasına Yolculuk",
    "Yaşamımızdaki Elektrikli Araçlar",
  ],
  "3-Hayat Bilgisi": [
    "Okulumuzda Hayat",
    "Evimizde Hayat",
    "Sağlıklı Hayat",
    "Güvenli Hayat",
    "Ülkemizde Hayat",
    "Doğada Hayat",
  ],
  "3-İngilizce": [
    "Greeting & Feelings",
    "My Family & People I Love",
    "Toys and Games",
    "Houses & Rooms",
    "My Town & Places",
    "Transportation",
    "Weather & Seasons",
  ],

  // 4. SINIF
  "4-Türkçe": [
    "Sözcükte Anlam (Gerçek, Mecaz, Terim)",
    "Eş-Zıt Anlam ve Deyimler-Atasözleri",
    "Cümlede Anlam (Neden-Sonuç, Karşılaştırma)",
    "Paragrafta Konu, Ana Düşünce, Yardımcı Düşünceler",
    "Metin Türleri (Hikaye, Masal, Şiir, Bilgilendirici)",
    "Yazım Kuralları (de, ki, mi yazımı)",
    "Noktalama İşaretleri",
  ],
  "4-Matematik": [
    "4, 5 ve 6 Basamaklı Doğal Sayılar",
    "Doğal Sayılarla Dört İşlem ve Problemler",
    "Kesir Çeşitleri ve Kesirlerle İşlemler",
    "Zaman ve Uzunluk Ölçme",
    "Açılar ve Üçgen-Dörtgen Çeşitleri",
    "Çevre ve Alan Hesaplama",
    "Tartma ve Sıvı Ölçme",
    "Sütun Grafiği ve Veri Analizi",
  ],
  "4-Fen Bilimleri": [
    "Yer Kabuğu ve Dünya'mızın Hareketleri",
    "Besinlerimiz ve Sağlıklı Beslenme",
    "Kuvvetin Etkileri (Mıknatıs ve Yerçekimi)",
    "Maddenin Özellikleri ve Maddenin Halleri",
    "Aydınlatma ve Ses Teknolojileri",
    "İnsan ve Çevre İlişkisi",
    "Basit Elektrik Devreleri",
  ],
  "4-Sosyal Bilgiler": [
    "Birey ve Toplum (Kimlik, Yetenekler)",
    "Kültür ve Miras (Milli Kültürümüz, Kurtuluş Savaşı)",
    "İnsanlar, Yerler ve Çevreler (Yönler, Harita, Hava)",
    "Bilim, Teknoloji ve Toplum",
    "Üretim, Dağıtım ve Tüketim (Bilinçli Tüketici)",
    "Etkin Vatandaşlık (Hak ve Sorumluluklar)",
    "Küresel Bağlantılar",
  ],
  "4-İngilizce": [
    "Classroom Rules",
    "Nationality & Countries",
    "Free Time Activities",
    "Cartoon Characters & Abilities",
    "My Day & Daily Routine",
    "Fun with Science",
    "Jobs & Occupations",
  ],
  "4-Din Kültürü": [
    "Günlük Konuşmalarda Dini İfadeler",
    "İslam'ı Tanıyalım",
    "Güzel Ahlak ve Nezaket",
    "Hz. Muhammed'i Tanıyalım",
  ],

  // 5. SINIF
  "5-Türkçe": [
    "Sözcükte Anlam (Gerçek, Mecaz, Terim, Söz Sanatları)",
    "Cümlede Anlam (Öznel-Nesnel, Neden-Sonuç, Amaç-Sonuç)",
    "Paragrafta Anlam ve Yapı",
    "Metin Türleri (Hikaye, Fabl, Masal, Mektup)",
    "Ses Olayları (Düşme, Yumuşama, Benzeşme)",
    "Yazım Kuralları ve Noktalama İşaretleri",
  ],
  "5-Matematik": [
    "Doğal Sayılar ve Milyonlar",
    "Doğal Sayılarla Dört İşlem ve Problemler",
    "Kesirler (Sıralama, Genişletme, Sadeleştirme, İşlemler)",
    "Ondalık Gösterim ve Basamak Değerleri",
    "Yüzdeler",
    "Temel Geometrik Kavramlar ve Açılar",
    "Üçgen ve Dörtgen Çeşitleri / İç Açılar",
    "Veri İşleme (Sıklık Tablosu ve Sütun Grafiği)",
    "Uzunluk, Zaman ve Alan Ölçme",
    "Geometrik Cisimler (Prizmalar)",
  ],
  "5-Fen Bilimleri": [
    "Güneş, Dünya ve Ay'ın Yapısı ve Hareketleri",
    "Ay'ın Evreleri",
    "Canlılar Dünyası (Mikroskobik, Mantarlar, Bitkiler, Hayvanlar)",
    "Kuvvetin Ölçülmesi ve Sürtünme Kuvveti",
    "Madde ve Değişim (Hal Değişimi, Isı-Sıcaklık, Genleşme)",
    "Işığın Yayılması, Yansıması ve Tam Gölge",
    "İnsan ve Çevre",
    "Elektrik Devre Elemanları",
  ],
  "5-Sosyal Bilgiler": [
    "Birey ve Toplum (Hak, Sorumluluk, Roller)",
    "Tarihe Yolculuk (İlk Uygarlıklar, Doğal Varlıklar)",
    "Yeryüzünde Yaşam (İklim, Harita, Yer Şekilleri)",
    "Bilim, Teknoloji ve Toplum",
    "Üretim, Dağıtım ve Tüketim (Bölgelerimizin Ekonomisi)",
    "Etkin Vatandaşlık (Yönetim Birimleri)",
    "Küresel Bağlantılar",
  ],
  "5-İngilizce": [
    "Hello & Countries",
    "My Town & Directions",
    "Games and Hobbies",
    "My Daily Routine",
    "Health & Illnesses",
    "Movies & Expressing Opinions",
    "Party Time & Months",
    "Fitness & Sports",
  ],
  "5-Din Kültürü": [
    "Allah İnancı",
    "Ramazan ve Oruç İbadeti",
    "Adap ve Nezaket Kuralları",
    "Hz. Muhammed ve Aile Hayatı",
    "Çevremizde Dinin İzleri",
  ],

  // 6. SINIF
  "6-Türkçe": [
    "Sözcükte Anlam ve Söz Sanatları",
    "Cümlede Anlam ve Cümle Yorumu",
    "Paragrafta Anlam ve Yapı",
    "İsimler ve İsim Tamlamaları",
    "Sıfatlar ve Sıfat Tamlamaları",
    "Zamirler (Adıllar)",
    "Edat, Bağlaç, Ünlem",
    "Ekler (Yapım ve Çekim Ekleri)",
    "Yazım Kuralları ve Noktalama",
  ],
  "6-Matematik": [
    "Doğal Sayılarla İşlemler (Üslü İfadeler, İşlem Önceliği)",
    "Çarpanlar ve Katlar (Asal Sayılar, Bölünebilme)",
    "Kümeler",
    "Tam Sayılar ve Mutlak Değer",
    "Kesirlerle İşlemler",
    "Ondalık Gösterimle Çarpma ve Bölme",
    "Oran Kavramı",
    "Cebirsel İfadeler",
    "Veri Analizi (Aritmetik Ortalama ve Açıklık)",
    "Açılar (Komşu, Tümler, Bütünler, Ters)",
    "Alan Ölçme (Paralelkenar ve Üçgen)",
    "Çember ve Geometrik Cisimler (Hacim)",
  ],
  "6-Fen Bilimleri": [
    "Güneş Sistemi ve Tutulmalar",
    "Vücudumuzdaki Sistemler (Destek-Hareket, Sindirim, Dolaşım, Solunum, Boşaltım)",
    "Kuvvet ve Hareket (Bileşke Kuvvet, Sabit Sürat)",
    "Madde ve Isı (Yoğunluk, Isı Yalıtımı)",
    "Ses ve Özellikleri",
    "Denetleyici ve Düzenleyici Sistemler, Duyu Organları",
    "Elektriğin İletimi ve Direnç",
  ],
  "6-Sosyal Bilgiler": [
    "Biz ve Değerlerimiz",
    "İlk Türk Devletleri ve İslam Medeniyeti",
    "Yeryüzünde Yaşam (Kıtalar, İklim Tipleri)",
    "Bilim ve Teknoloji Hayatımızda",
    "Kaynaklarımız ve Ekonomimiz",
    "Demokrasi ve Haklar",
    "Uluslararası İlişkilerimiz",
  ],
  "6-İngilizce": [
    "Life & After-School Activities",
    "Yummy Breakfast",
    "Downtown & Comparisons",
    "Weather and Emotions",
    "At the Fair",
    "Occupations & Past Events",
    "Holidays & Simple Past",
    "Saving the Planet",
  ],
  "6-Din Kültürü": [
    "Peygamber ve İlahi Kitap İnancı",
    "Namaz İbadeti",
    "Zararlı Alışkanlıklar",
    "Hz. Muhammed'in Hayatı",
    "Temel Değerlerimiz",
  ],

  // 7. SINIF
  "7-Türkçe": [
    "Sözcükte ve Cümlede Anlam",
    "Paragrafta Anlam ve Yapı",
    "Fiiller (Anlam, Kip ve Kişi Ekleri)",
    "Fiillerde Anlam (Zaman) Kayması",
    "Ek Fiil ve Görevleri",
    "Fiilde Yapı (Basit, Türemiş, Birleşik)",
    "Zarflar (Belirteçler)",
    "Anlatım Bozuklukları",
    "Yazım ve Noktalama Kuralları",
  ],
  "7-Matematik": [
    "Tam Sayılarla Dört İşlem ve Problemler",
    "Rasyonel Sayılar ve Sayı Doğrusu",
    "Rasyonel Sayılarla İşlemler",
    "Cebirsel İfadeler ve Örüntüler",
    "Birinci Dereceden Bir Bilinmeyenli Denklemler",
    "Oran ve Orantı (Doğru ve Ters Orantı)",
    "Yüzdeler (Kâr-Zarar, İndirim)",
    "Doğrular ve Açılar",
    "Çokgenler ve Alan",
    "Çember ve Daire (Daire Dilim Alanı)",
    "Veri Analizi (Çizgi ve Daire Grafiği)",
  ],
  "7-Fen Bilimleri": [
    "Güneş Sistemi ve Ötesi (Uzay, Yıldızlar)",
    "Hücre ve Bölünmeler (Mitoz ve Mayoz)",
    "Kuvvet ve Enerji (Kinetik ve Potansiyel Enerji)",
    "Saf Madde ve Karışımlar",
    "Işığın Madde ile Etkileşimi (Aynalar, Kırılma, Mercekler)",
    "Canlılarda Üreme, Büyüme ve Gelişme",
    "Elektrik Devreleri (Seri ve Paralel)",
  ],
  "7-Sosyal Bilgiler": [
    "İletişim ve İnsan İlişkileri",
    "Osmanlı Devleti Kuruluş ve Yükselme",
    "Ülkemizde Nüfus ve Yerleşme",
    "Zaman İçinde Bilim",
    "Ekonomi ve Sosyal Hayat",
    "Yaşayan Demokrasi",
    "Küresel Sorunlar",
  ],
  "7-İngilizce": [
    "Appearance and Personality",
    "Biographies & Simple Past",
    "Wild Animals & Giving Advice",
    "Television & Expressing Preferences",
    "Celebrations & Suggestions",
    "Dreams & Future (Will)",
    "Public Buildings & Environment",
  ],
  "7-Din Kültürü": [
    "Melek ve Ahiret İnancı",
    "Hac ve Kurban İbadeti",
    "Ahlaki Davranışlar",
    "İslam Düşüncesinde Yorumlar",
    "Din ve Güzel Ahlak",
  ],

  // 8. SINIF (LGS)
  "8-Türkçe": [
    "Sözcükte ve Cümlede Anlam",
    "Paragrafta Anlam ve Yapı",
    "Fiilimsiler (İsim-fiil, Sıfat-fiil, Zarf-fiil)",
    "Cümlenin Ögeleri ve Vurgu",
    "Fiilde Çatı (Öznesine ve Nesnesine Göre)",
    "Cümle Türleri",
    "Anlatım Bozuklukları",
    "Yazım Kuralları ve Noktalama İşaretleri",
    "Metin Türleri ve Söz Sanatları",
    "Görsel Okuma ve Grafik Yorumlama",
    "Sözel Mantık ve Muhakeme",
  ],
  "8-Matematik": [
    "Çarpanlar ve Katlar (EBOB - EKOK Problemleri)",
    "Üslü İfadeler ve Bilimsel Gösterim",
    "Kareköklü İfadeler ve Gerçek Sayılar",
    "Veri Analizi (Daire ve Sütun Grafikleri)",
    "Basit Olayların Olma Olasılığı",
    "Cebirsel İfadeler ve Özdeşlikler",
    "Doğrusal Denklemler ve Koordinat Sistemi (Eğim)",
    "Eşitsizlikler ve Sayı Doğrusu",
    "Üçgenler (Açı-Kenar Bağıntıları, Pisagor, Yardımcı Elemanlar)",
    "Eşlik ve Benzerlik",
    "Dönüşüm Geometrisi",
    "Geometrik Cisimler (Prizma, Silindir, Piramit, Koni)",
  ],
  "8-Fen Bilimleri": [
    "Mevsimler ve İklim",
    "DNA ve Genetik Kod (Mutasyon, Modifikasyon, Biyoteknoloji)",
    "Basınç (Katı, Sıvı ve Gaz Basıncı)",
    "Madde ve Endüstri (Periyodik Sistem, Kimyasal Tepkimeler, Asit-Baz, Isı)",
    "Basit Makineler (Kaldıraç, Makara, Eğik Düzlem, Çıkrık, Dişli)",
    "Enerji Dönüşümleri (Besin Zinciri, Fotosentez, Solunum)",
    "Elektrik Yükleri ve Elektrik Enerjisi",
  ],
  "8-T.C. İnkılap Tarihi": [
    "Bir Kahraman Doğuyor (Atatürk'ün Hayatı)",
    "Milli Uyanış: Bağımsızlık Yolunda Atılan Adımlar",
    "Milli Bir Destan: Ya İstiklal Ya Ölüm (Cepheler, Lozan)",
    "Atatürkçülük ve Çağdaşlaşan Türkiye (İlkeler ve İnkılaplar)",
    "Demokratikleşme Çabaları",
    "Atatürk Dönemi Türk Dış Politikası",
    "Atatürk'ün Ölümü ve Sonrası",
  ],
  "8-Din Kültürü": [
    "Kader İnancı (Kaza ve Kader, Evrenin Yasaları)",
    "Zekat ve Sadaka İbadeti",
    "Din ve Hayat",
    "Hz. Muhammed'in Örnekliği",
    "Kur'an-ı Kerim ve Özellikleri",
  ],
  "8-İngilizce": [
    "Friendship",
    "Teen Life",
    "In the Kitchen",
    "On the Phone",
    "The Internet",
    "Adventures",
    "Tourism",
    "Chores",
    "Science",
    "Natural Hazards",
  ],

  // 9. SINIF
  "9-Türk Dili ve Edebiyatı": [
    "Edebiyata Giriş ve Metinlerin Sınıflandırılması",
    "Hikaye (Olay ve Durum Hikayesi)",
    "Şiir (Nazım Birimi, Ölçü, Kafiye, Redif, Söz Sanatları)",
    "Masal ve Fabl",
    "Roman",
    "Tiyatro",
    "Biyografi, Otobiyografi, Mektup, Günlük",
    "Dil Bilgisi (Sözcük Türleri, İmla, Noktalama)",
  ],
  "9-Matematik": [
    "Mantık (Önermeler, Bağlaçlar, Niceleyiciler)",
    "Kümeler ve Kümelerde İşlemler",
    "Bölünebilme Kuralları, EBOB ve EKOK",
    "Birinci Dereceden Denklemler ve Eşitsizlikler",
    "Mutlak Değer",
    "Üslü ve Köklü İfadeler",
    "Oran ve Orantı",
    "Problemler (Sayı, Kesir, Yaş, Yüzde, Hız)",
    "Üçgenlerde Temel Kavramlar ve Açılar",
    "Üçgenlerde Eşlik ve Benzerlik",
    "Üçgenin Yardımcı Elemanları",
    "Dik Üçgen ve Trigonometrik Oranlar",
    "Üçgenin Alanı",
    "Veri (Merkezi Eğilim ve Yayılım Ölçüleri)",
  ],
  "9-Fizik": [
    "Fizik Bilimine Giriş",
    "Madde ve Özellikleri (Özkütle, Dayanıklılık, Adezyon-Kohezyon)",
    "Hareket ve Kuvvet (Düzgün Doğrusal Hareket, Newton Yasaları)",
    "İş, Güç ve Enerji (Mekanik Enerji Korunumu)",
    "Isı ve Sıcaklık (Termometreler, Hal Değişimi, Isıl Denge)",
    "Elektrostatik (Yükler, Coulomb Kanunu, Elektrik Alan)",
  ],
  "9-Kimya": [
    "Kimya Bilimi ve Güvenlik Uyarıları",
    "Atom ve Periyodik Sistem",
    "Kimyasal Türler Arası Etkileşimler (Güçlü ve Zayıf)",
    "Maddenin Halleri (Katı, Sıvı, Gaz, Plazma)",
    "Çevre Kimyası",
  ],
  "9-Biyoloji": [
    "Yaşam Bilimi Biyoloji ve Canlıların Ortak Özellikleri",
    "Canlıların Temel Bileşikleri (İnorganik ve Organik)",
    "Hücre (Zar Geçişleri, Organeller)",
    "Canlılar Dünyası ve Sınıflandırma",
  ],
  "9-Tarih": [
    "Tarih ve Zaman",
    "İnsanlığın İlk Dönemleri",
    "Orta Çağ'da Dünya",
    "İlk ve Orta Çağlarda Türk Dünyası",
    "İslam Medeniyetinin Doğuşu",
    "Türklerin İslamiyet'i Kabulü",
  ],
  "9-Coğrafya": [
    "Doğa ve İnsan / Coğrafi Konum",
    "Harita Bilgisi ve Ölçekler",
    "İklim Bilgisi (Sıcaklık, Basınç, Rüzgarlar, Nem)",
    "Türkiye'nin İklimi",
  ],
  "9-İngilizce": [
    "Studying Abroad",
    "My Environment",
    "Movies",
    "Human in Nature",
    "Inspirational People",
    "Bridging Cultures",
    "World Heritage",
  ],

  // 10. SINIF
  "10-Türk Dili ve Edebiyatı": [
    "Giriş: Türkçenin Gelişimi",
    "Hikaye (Dede Korkut, Tanzimat ve Milli Edebiyat)",
    "Şiir (Halk Şiiri, Divan Şiiri)",
    "Destan ve Efsane",
    "Roman",
    "Geleneksel Türk Tiyatrosu",
    "Anı, Haber Metni, Gezi Yazısı",
    "Dil Bilgisi (Cümle Ögeleri, Fiilimsi, Cümle Türleri)",
  ],
  "10-Matematik": [
    "Sayma Yöntemleri (Permütasyon, Kombinasyon)",
    "Binom Açılımı ve Olasılık",
    "Fonksiyonlar (Tanım, Grafikler, Bileşke, Ters)",
    "Polinomlar ve Polinomlarda İşlemler",
    "Polinomların Çarpanlara Ayrılması",
    "İkinci Dereceden Bir Bilinmeyenli Denklemler",
    "Çokgenler ve Özel Dörtgenler (Yamuk, Paralelkenar, Eşkenar, Dikdörtgen, Kare)",
    "Katı Cisimler (Prizma ve Piramitler)",
  ],
  "10-Fizik": [
    "Elektrik ve Manyetizma (Ohm Yasası, Devreler, Mıknatıs)",
    "Basınç ve Sıvıların Kaldırma Kuvveti",
    "Dalgalar (Yay, Su, Ses, Deprem)",
    "Optik (Aydınlanma, Aynalar, Kırılma, Mercekler, Renk)",
  ],
  "10-Kimya": [
    "Kimyanın Temel Kanunları ve Mol Kavramı",
    "Kimyasal Tepkimeler ve Hesaplamalar",
    "Karışımlar ve Ayırma Yöntemleri",
    "Asitler, Bazlar ve Tuzlar",
    "Kimya Her Yerde",
  ],
  "10-Biyoloji": [
    "Hücre Bölünmeleri (Mitoz ve Mayoz Bölünme)",
    "Kalıtımın Genel Esasları (Mendel, Çaprazlamalar, Soyağaçları)",
    "Ekosistem Ekolojisi ve Çevre Sorunları",
  ],
  "10-Tarih": [
    "Selçuklu Türkiyesi",
    "Beylikten Devlete Osmanlı",
    "Dünya Gücü Osmanlı (1453-1595)",
    "Klasik Çağda Osmanlı Toplum Düzeni",
  ],
  "10-Coğrafya": [
    "Dünya'nın Tektonik Oluşumu, İç ve Dış Kuvvetler",
    "Türkiye'nin Yer Şekilleri",
    "Nüfus, Yerleşme ve Göçler",
    "Afetler",
  ],
  "10-Felsefe": [
    "Felsefeyi Tanıma ve Akıl Yürütme",
    "Varlık, Bilgi, Ahlak Felsefesi",
    "Din, Siyaset, Sanat ve Bilim Felsefesi",
  ],
  "10-İngilizce": [
    "School Life & Plans",
    "Legendary Figures",
    "Traditions & Customs",
    "Travel & Food",
    "Digital Era",
  ],

  // 11. SINIF
  "11-Matematik": [
    "Trigonometri (Birim Çember, Fonksiyonlar, Grafikler, Teoremler)",
    "Analitik Geometri (Nokta ve Doğrunun Analitiği)",
    "Fonksiyonlarda Uygulamalar (Artan-Azalanlık, Maks-Min, Ötelemeler)",
    "İkinci Dereceden Denklem ve Eşitsizlik Sistemleri",
    "Çember ve Daire (Açılar, Teğet, Çevre ve Alan)",
    "Uzay Geometri (Katı Cisimlerin Alan ve Hacmi)",
    "Koşullu Olasılık",
  ],
  "11-Fizik": [
    "Vektörler ve Bağıl Hareket",
    "Newton'ın Hareket Yasaları (Dinamik)",
    "Bir ve İki Boyutta Sabit İvmeli Hareket (Atışlar)",
    "İş, Güç ve Mekanik Enerji Korunumu",
    "İtme ve Çizgisel Momentum",
    "Tork, Denge ve Kütle Merkezi",
    "Basit Makineler",
    "Elektriksel Kuvvet, Potansiyel ve Sığaçlar",
    "Manyetizma, İndüksiyon ve Alternatif Akım",
  ],
  "11-Kimya": [
    "Modern Atom Teorisi ve Kuantum Sayıları",
    "Gazlar ve Gaz Yasaları",
    "Sıvı Çözeltiler ve Koligatif Özellikler",
    "Kimyasal Tepkimelerde Enerji (Entalpi)",
    "Kimyasal Tepkimelerde Hız",
    "Kimyasal Denge ve Sulu Çözelti Dengeleri (Asit-Baz, Kçç)",
  ],
  "11-Biyoloji": [
    "İnsan Fizyolojisi (Sinir, Endokrin, Duyu Organları)",
    "Destek ve Hareket Sistemi",
    "Sindirim Sistemi",
    "Dolaşım ve Bağışıklık Sistemi",
    "Solunum Sistemi",
    "Boşaltım (Üriner) Sistemi",
    "Üreme Sistemi",
    "Komünite ve Popülasyon Ekolojisi",
  ],
  "11-Türk Dili ve Edebiyatı": [
    "Tanzimat Edebiyatı",
    "Servet-i Fünun ve Fecr-i Ati Edebiyatı",
    "Milli Edebiyat Dönemi",
    "Cumhuriyet İlk Yılları",
    "Makale, Fıkra, Sohbet, Eleştiri, Mülakat",
  ],
  "11-Tarih": [
    "Değişen Dünya Dengelerinde Osmanlı Siyaseti",
    "Avrupa ve Osmanlı'da Değişim",
    "Uluslararası İlişkilerde Denge Stratejisi (1774-1914)",
    "Devrimler Çağında Devlet-Toplum",
  ],
  "11-Coğrafya": [
    "Ekosistem ve Madde Döngüleri",
    "Nüfus Politikaları ve Şehirler",
    "Türkiye Ekonomisi (Tarım, Sanayi, Enerji)",
    "Bölgesel Kalkınma Projeleri",
  ],

  // 12. SINIF / YKS
  "12-Matematik": [
    "Logaritma Fonksiyonu ve Özellikleri",
    "Diziler (Aritmetik ve Geometrik Dizi)",
    "Trigonometrik Denklemler ve Toplam-Fark Formülleri",
    "Limit ve Süreklilik",
    "Türev ve Türev Alma Kuralları",
    "Türevin Uygulamaları (Teğet, Ekstremum, Maks-Min)",
    "Belirsiz ve Belirli İntegral",
    "İntegralle Alan Hesabı",
    "Analitik Geometride Dönüşümler",
    "Çemberin Analitik İncelenmesi",
  ],
  "12-Fizik": [
    "Düzgün Çembersel Hareket ve Dönme Kinetik Enerjisi",
    "Açısal Momentum Korunumu ve Kütle Çekimi / Kepler",
    "Basit Harmonik Hareket",
    "Dalga Mekaniği (Girişim, Kırınım, Doppler)",
    "Atom Fiziğine Giriş ve Radyoaktivite",
    "Özel Görelilik ve Kuantum Fiziği",
    "Fotoelektrik Olay ve Modern Fiziğin Uygulamaları",
  ],
  "12-Kimya": [
    "Kimya ve Elektrik (Redoks, Piller, Elektroliz)",
    "Karbon Kimyasına Giriş ve Hibritleşme",
    "Organik Bileşikler: Hidrokarbonlar",
    "Fonksiyonel Gruplar: Alkoller, Eterler, Karbonil, Asitler, Esterler",
    "Enerji Kaynakları",
  ],
  "12-Biyoloji": [
    "Genden Proteine (DNA, RNA, Protein Sentezi)",
    "Biyoteknoloji ve Gen Mühendisliği",
    "Canlılarda Enerji Dönüşümleri (Solunum, Fotosentez, Kemosentez)",
    "Bitki Biyolojisi (Dokular, Madde Taşınması, Üreme)",
    "Canlılar ve Çevre",
  ],
  "12-Türk Dili ve Edebiyatı": [
    "Cumhuriyet Dönemi Türk Şiiri",
    "Cumhuriyet Dönemi Roman ve Hikayesi",
    "Cumhuriyet Dönemi Tiyatrosu",
    "Dünya Edebiyatı",
  ],
};

export function getTopics(
  subject: string,
  grade?: number,
  group?: TargetGroup
): string[] {
  if (!subject) return [];

  // 1) Sınıf bilgisi varsa öncelikle o sınıfın dersine bak
  if (grade !== undefined && grade >= 1 && grade <= 12) {
    const gradeKey = `${grade}-${subject}`;
    if (GRADE_SUBJECT_TOPICS[gradeKey] && GRADE_SUBJECT_TOPICS[gradeKey].length > 0) {
      return GRADE_SUBJECT_TOPICS[gradeKey];
    }
  }

  // 2) Sınav grubu YKS veya LGS ise
  if (group === "LGS") {
    const lgsKey = `8-${subject}`;
    if (GRADE_SUBJECT_TOPICS[lgsKey]) return GRADE_SUBJECT_TOPICS[lgsKey];
  }

  // 3) Doğrudan SUBJECT_TOPICS havuzunda varsa
  if (SUBJECT_TOPICS[subject] && SUBJECT_TOPICS[subject].length > 0) {
    return SUBJECT_TOPICS[subject];
  }

  // 4) Herhangi bir sınıfta bu ders var mı tara
  for (let g = 12; g >= 1; g--) {
    const k = `${g}-${subject}`;
    if (GRADE_SUBJECT_TOPICS[k]) return GRADE_SUBJECT_TOPICS[k];
  }

  return [];
}

