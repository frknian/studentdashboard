import type { TargetGroup } from "./types";

export const EXAM_SUBJECTS: Record<TargetGroup, string[]> = {
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
    "TYT Sosyal Bilimler",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "AYT Matematik",
    "AYT Fizik",
    "AYT Kimya",
    "AYT Biyoloji",
  ],
  YKS_EA: [
    "TYT Türkçe",
    "TYT Sosyal Bilimler",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "AYT Matematik",
    "AYT Türk Dili ve Edebiyatı",
    "AYT Tarih-1",
    "AYT Coğrafya-1",
  ],
  YKS_SOZ: [
    "TYT Türkçe",
    "TYT Sosyal Bilimler",
    "TYT Temel Matematik",
    "TYT Fen Bilimleri",
    "AYT Türk Dili ve Edebiyatı",
    "AYT Tarih-1",
    "AYT Coğrafya-1",
    "AYT Tarih-2",
    "AYT Coğrafya-2",
    "AYT Felsefe Grubu",
    "AYT Din Kültürü",
  ],
  ARA_SINIF: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce"],
};

export const QUESTION_TOPICS: Record<TargetGroup, string[]> = {
  LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "İnkılap Tarihi", "Din Kültürü", "İngilizce", "Diğer"],
  YKS_SAY: ["TYT Matematik", "TYT Türkçe", "TYT Fen", "AYT Matematik", "Fizik", "Kimya", "Biyoloji", "Diğer"],
  YKS_EA: ["TYT Matematik", "TYT Türkçe", "AYT Matematik", "Edebiyat", "Tarih", "Coğrafya", "Diğer"],
  YKS_SOZ: ["TYT Türkçe", "Edebiyat", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Diğer"],
  ARA_SINIF: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Diğer"],
};
