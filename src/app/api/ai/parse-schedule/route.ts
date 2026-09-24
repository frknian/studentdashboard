import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientApiKey = (formData.get("apiKey") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    const apiKey = (
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ""
    ).replace(/['"\s]/g, "");

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Anahtarı bulunamadı. Lütfen modaldeki kutucuğa Google AI Studio'dan (aistudio.google.com) aldığınız ücretsiz API anahtarınızı girin.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `
Sen Türkiye müfredatına ve sınav hazırlık sistemine (LGS, YKS, TYT, AYT, KPSS, Koçluk) tam hakim uzman bir eğitim asistanısın.
Sana bir ders çalışma veya kamp programı görseli (ekran görüntüsü, fotoğraf) veya PDF belgesi verildi.
Bu görseldeki veya belgedeki programı çok dikkatli bir şekilde satır satır ve blok blok incele.

ÖNEMLİ KURAL:
Program yalnızca 1 haftalık (7 günlük) olmak zorunda DEĞİLDİR!
10 günlük, 15 günlük, 2-3 haftalık veya 1 aylık uzun periyotlu kamp veya çalışma programları olabilir.
Tabloda kaç gün veya satır varsa HEPSİNİ baştan sona, hiçbir günü atlamadan eksiksiz çıkar.

GÖREVİN:
Tablodaki her bir günü, her bir tarihi ve her bir bloktaki dersi/etüdü ayrıştırarak aşağıdaki JSON formatında çıkar.

DİKKAT EDİLECEK HUSUSLAR:
1. "date": Tablodaki veya metindeki kesin tarihi "YYYY-MM-DD" formatında yaz (örn: "2026-09-24", "2026-10-02"). Görselde yıl yazmıyorsa geçerli yılı (2026) kabul et. Tarih sütunu veya metni varsa bunu ASLA atlama.
2. "day": Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar (tarihe veya satıra karşılık gelen gün adı).
3. Bir günde birden fazla blok (örn: "Blok 1: 20 Paragraf", "Blok 2: Fen Bilimleri Okul Konusu Tekrarı + 30 Soru", "Blok 3: Din Kültürü + 20 Soru") varsa, BUNLARIN HER BİRİNİ AYRI BİRER DERS/GÖREV NESNESİ OLARAK EKLE!
4. "time": Belirtilmişse başlangıç saati (örn: "17:00"). Belirtilmemişse günün blok sırasına göre mantıklı bir saat ver (Blok 1 için "16:00", Blok 2 için "17:30", Blok 3 için "19:00", Blok 4 için "20:30" gibi).
5. "durationMinutes": Belirtilmişse o süre, belirtilmemişse 45 veya 60 dk.
6. "subject": Ders adı (Matematik, Fen Bilimleri, Türkçe, Paragraf, Fizik, Kimya, Biyoloji, Geometri, Din Kültürü, T.C. İnkılap Tarihi, İngilizce, Hata Analizi, vb.).
7. "topic": Konu başlığı, detay veya ödev açıklaması (örn: "Okul Konusu Tekrarı", "Okul Konusu & Haftalık Tarama", "Yeni Nesile Geçiş").
8. "targetQuestions": Metinde geçen soru hedefi sayısı (örn: "30 Soru" -> 30, "20 Paragraf" -> 20, "50 Soru" -> 50). Yoksa 0.
9. "note": Ek not veya açıklama.

Yalnızca ve yalnızca GEÇERLİ bir JSON çıktısı üret. Markdown formatında \`\`\`json veya düz JSON olarak ver. Başka hiçbir açıklama yazma.

ÖRNEK ÇIKTI FORMATI:
{
  "items": [
    {
      "date": "2026-09-24",
      "day": "Perşembe",
      "time": "16:00",
      "durationMinutes": 45,
      "subject": "Türkçe",
      "topic": "Paragraf Rutini",
      "targetQuestions": 20,
      "note": "20 Paragraf"
    },
    {
      "date": "2026-09-24",
      "day": "Perşembe",
      "time": "17:30",
      "durationMinutes": 60,
      "subject": "Fen Bilimleri",
      "topic": "Okul Konusu Tekrarı",
      "targetQuestions": 30,
      "note": "30 Soru"
    },
    {
      "date": "2026-09-25",
      "day": "Cuma",
      "time": "16:00",
      "durationMinutes": 45,
      "subject": "Türkçe",
      "topic": "Paragraf Rutini",
      "targetQuestions": 20,
      "note": "20 Paragraf"
    }
  ]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API Hatası (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const geminiResult = await response.json();
    const candidateText =
      geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return NextResponse.json(
        { error: "Yapay zeka görselden ders programı içeriği çıkaramadı." },
        { status: 422 }
      );
    }

    let parsedJson;
    try {
      const cleaned = candidateText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI yanıtı JSON formatına dönüştürülemedi." },
        { status: 422 }
      );
    }

    const items = Array.isArray(parsedJson?.items) ? parsedJson.items : [];
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
