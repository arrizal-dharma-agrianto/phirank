import type { ContentGeneratorInput } from "../schemas";

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const contentTypeInstructions: Record<ContentGeneratorInput["contentType"], string> =
  {
    blogArticle:
      "Tulis artikel blog panjang 1500-3000 kata dengan struktur H1, H2, H3, bullet points, contoh lokal Indonesia, dan FAQ.",
    landingPage:
      "Tulis landing page SEO-friendly dengan hero section, problem-solution, benefit, proof, FAQ, dan CTA yang natural untuk pembaca Indonesia.",
    faqPage:
      "Tulis halaman FAQ SEO-friendly dengan pengelompokan pertanyaan, jawaban jelas, dan internal link kontekstual.",
    productDescription:
      "Tulis deskripsi produk SEO-friendly dengan manfaat, spesifikasi, use case lokal Indonesia, FAQ, dan CTA.",
  };

const pronounInstructions: Record<ContentGeneratorInput["pronounStyle"], string> =
  {
    kamu:
      "Gunakan sapaan 'kamu' secara konsisten. Cocok untuk brand yang lebih santai, DTC, kreator, edukasi, dan audiens muda.",
    anda:
      "Gunakan sapaan 'Anda' secara konsisten. Cocok untuk B2B, layanan profesional, finansial, kesehatan, legal, dan audiens formal.",
    mixed:
      "Pilih antara 'kamu' atau 'Anda' berdasarkan audiens dan jelaskan pilihan sapaan di bagian Catatan Strategi. Jangan mencampur keduanya dalam body utama.",
  };

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
  error?: {
    message?: string;
  };
};

type GroqGeneratedContent = {
  content: string;
  model: string;
};

class GroqContentGenerationError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "GroqContentGenerationError";
    this.status = status;
  }
}

const generateGroqContent = async (
  input: ContentGeneratorInput,
): Promise<GroqGeneratedContent> => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new GroqContentGenerationError("GROQ_API_KEY is not configured.");
  }

  const model = process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  const {
    audience,
    brandContext,
    contentType,
    contentTags,
    internalLinks,
    pronounStyle,
    secondaryKeywords,
    targetKeyword,
    tone,
    topic,
    websiteUrl,
    wordCount,
  } = input;
  const resolvedInternalLinks = internalLinks || null;
  const prompt = [
    `Brief konten: ${topic}`,
    `Jenis konten: ${contentType}`,
    targetKeyword
      ? `Target keyword utama: ${targetKeyword}`
      : "Target keyword utama tidak diberikan. Tentukan fokus SEO utama dari brief konten, search intent, dan konteks brand tanpa memaksakan keyword tertentu.",
    secondaryKeywords ? `Keyword turunan: ${secondaryKeywords}` : null,
    contentTags
      ? `Tag konten yang bisa dipakai: ${contentTags}`
      : "Tag konten tidak diberikan. Rekomendasikan tag yang relevan berdasarkan brief, intent, dan konteks brand.",
    `Tone of voice: ${tone}`,
    `Gaya sapaan: ${pronounStyle}`,
    audience ? `Target audiens: ${audience}` : null,
    wordCount ? `Target panjang artikel: ${wordCount} kata` : null,
    websiteUrl ? `Website klien: ${websiteUrl}` : null,
    brandContext ? `Konteks brand/produk/layanan: ${brandContext}` : null,
    resolvedInternalLinks
      ? `Daftar halaman internal dari hasil crawl terbaru yang boleh disisipkan sebagai internal link:\n${resolvedInternalLinks}`
      : "Tidak ada crawled page yang tersedia untuk internal link. Jangan mengarang URL internal; beri catatan bahwa crawl perlu dijalankan agar rekomendasi internal link bisa lebih akurat.",
    [
      "Output wajib dalam bahasa Indonesia natural.",
      "Jangan terasa seperti terjemahan dari bahasa Inggris.",
      "Hindari anglisisme yang tidak umum dipakai pembaca Indonesia; jika istilah teknis lazim dipakai di Indonesia, boleh digunakan dengan penjelasan singkat.",
      "Gunakan referensi konteks Indonesia bila relevan: kebiasaan pembeli lokal, platform populer, marketplace, pembayaran, kota, UMKM, layanan lokal, atau kisaran harga rupiah bila aman sebagai contoh.",
    ].join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  const groqResponse = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "Kamu adalah senior SEO content strategist Indonesia.",
            "Spesialisasimu adalah membuat konten SEO-friendly berkualitas tinggi yang terasa natural untuk pembaca Indonesia, bukan hasil terjemahan literal.",
            contentTypeInstructions[contentType],
            pronounInstructions[pronounStyle],
            "Optimalkan untuk search intent, CTR, readability, topical authority, dan konversi tanpa keyword stuffing.",
            "Prioritaskan kejelasan, contoh lokal, dan istilah yang umum digunakan di Indonesia.",
            "Jika membuat klaim angka, beri konteks bahwa angka tersebut contoh/estimasi kecuali data diberikan user.",
            [
              "Format output wajib Markdown dengan urutan:",
              "1. Ringkasan Strategi",
              "2. Meta Title (maksimal 60 karakter, 3 opsi)",
              "3. Meta Description (maksimal 155 karakter, 3 opsi)",
              "4. URL Slug SEO-friendly dalam bahasa Indonesia (3 opsi)",
              "5. Konten Utama dengan heading hierarchy rapi",
              "6. Rekomendasi Internal Link dan anchor text",
              "7. Saran Image Alt Text dalam bahasa Indonesia",
              "8. FAQ Section",
              "9. Catatan Optimasi SEO",
              "10. Tag Konten yang bisa dipakai (8-12 tag, pisahkan sebagai list, gunakan lowercase kecuali nama brand/produk)",
            ].join(" "),
          ].join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 6000,
    }),
  });

  const data = (await groqResponse.json()) as GroqChatCompletionResponse;

  if (!groqResponse.ok) {
    throw new GroqContentGenerationError(
      data.error?.message ?? "Groq failed to generate content.",
      groqResponse.status,
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new GroqContentGenerationError("Groq returned an empty response.", 502);
  }

  return {
    content,
    model: data.model ?? model,
  };
};

export { generateGroqContent, GroqContentGenerationError };
