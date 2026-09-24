import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientApiKey = (formData.get("apiKey") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    const apiKey =
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Anahtarı bulunamadı. Lütfen modal üzerinden veya Ayarlar'dan Gemini API anahtarınızı girin.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `
Sen bir özel ders ve öğrenci takip sistemi asistanısın.
Sana bir ders çalışma veya haftalık ders programı görseli/PDF'i verildi.
Bu görseldeki veya belgedeki haftalık programı dikkatle incele.

GÖREVİN:
Tablodaki veya listedeki tüm ders/etüt/çalışma kayıtlarını aşağıdaki JSON formatında çıkar.

KURALLAR:
1. "day": Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar (yalnızca bu 7 günden biri olmalı).
2. "time": Dersin veya etkinliğin başlangıç saati. HH:MM formatında (örn: "17:00", "09:30", "14:15"). Eğer saat belirtilmemişse mantıklı bir varsayılan ver (örn: "16:00").
3. "durationMinutes": Ders süresi dakika cinsinden (örn: 40, 45, 60, 90). Belirtilmemişse 60 kabul et.
4. "subject": Ders adı (örn: Matematik, Fizik, Kimya, Biyoloji, Türkçe, Geometri, Tarih, İngilizce, Fen Bilimleri, vb.).
5. "topic": Varsa çalışılacak konu başlığı veya detay (örn: "Üslü Sayılar", "Paragraf", "Mekanik"). Yoksa boş bırak.
6. "targetQuestions": Varsa çözülecek soru sayısı hedefi (sayı olarak, örn: 40). Yoksa 0.
7. "note": Varsa ek not (örn: "Ödev kontrolü", "Deneme sınavı analizi"). Yoksa boş bırak.

Yalnızca ve yalnızca GEÇERLİ bir JSON çıktısı üret. Markdown formatında \`\`\`json veya düz JSON olarak ver. Başka hiçbir açıklama yazma.

ÖRNEK ÇIKTI FORMATI:
{
  "items": [
    {
      "day": "Pazartesi",
      "time": "17:00",
      "durationMinutes": 60,
      "subject": "Matematik",
      "topic": "Üslü Sayılar",
      "targetQuestions": 50,
      "note": "Konu tekrarı ve soru çözümü"
    },
    {
      "day": "Salı",
      "time": "18:30",
      "durationMinutes": 45,
      "subject": "Fizik",
      "topic": "Kuvvet ve Hareket",
      "targetQuestions": 30,
      "note": ""
    }
  ]
}
`;

    // Gemini 2.5 Flash veya 1.5 Flash çağrısı
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
      // Fallback to gemini-1.5-flash if 2.5 isn't available
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

    // JSON parse
    let parsedJson;
    try {
      // Markdown bloğu varsa temizle
      const cleaned = candidateText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI yanıtı JSON formatına dönüştürülemedi: " + candidateText },
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
