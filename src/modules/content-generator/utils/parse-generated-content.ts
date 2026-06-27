type ContentSectionKey =
  | "strategySummary"
  | "metaTitle"
  | "metaDescription"
  | "urlSlug"
  | "mainContent"
  | "internalLinks"
  | "imageAltTexts"
  | "faq"
  | "seoNotes";

type ContentSectionDefinition = {
  key: ContentSectionKey;
  aliases: string[];
};

type ParsedInternalLink = {
  title: string;
  url: string | null;
  description: string | null;
  raw: string;
};

type ParsedFaqItem = {
  question: string;
  answer: string;
};

type StructuredGeneratedContent = {
  raw: string;
  title: string | null;
  titleOptions: string[];
  description: string | null;
  descriptionOptions: string[];
  slug: string | null;
  slugOptions: string[];
  strategySummary: string | null;
  mainContent: string | null;
  internalLinks: ParsedInternalLink[];
  imageAltTexts: string[];
  faq: ParsedFaqItem[];
  seoNotes: string[];
  sections: Record<ContentSectionKey, string | null>;
};

const contentSections: ContentSectionDefinition[] = [
  {
    key: "strategySummary",
    aliases: ["ringkasan strategi"],
  },
  {
    key: "metaTitle",
    aliases: ["meta title"],
  },
  {
    key: "metaDescription",
    aliases: ["meta description"],
  },
  {
    key: "urlSlug",
    aliases: ["url slug seo-friendly", "url slug", "slug seo-friendly"],
  },
  {
    key: "mainContent",
    aliases: ["konten utama"],
  },
  {
    key: "internalLinks",
    aliases: [
      "rekomendasi internal link",
      "rekomendasi internal link dan anchor text",
    ],
  },
  {
    key: "imageAltTexts",
    aliases: ["saran image alt text", "saran image alt text dalam bahasa indonesia"],
  },
  {
    key: "faq",
    aliases: ["faq section", "faq"],
  },
  {
    key: "seoNotes",
    aliases: ["catatan optimasi seo"],
  },
];

const normalizeHeading = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/:$/, "")
    .toLowerCase();

const findSectionByHeading = (heading: string) => {
  const normalizedHeading = normalizeHeading(heading);

  return contentSections.find((section) =>
    section.aliases.some(
      (alias) =>
        normalizedHeading === alias ||
        normalizedHeading.startsWith(`${alias} `) ||
        normalizedHeading.startsWith(`${alias} (`),
    ),
  );
};

const stripListMarker = (value: string) =>
  value.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim();

const parseListItems = (value: string | null) => {
  if (!value) return [];

  return value
    .split("\n")
    .map((line) => stripListMarker(line))
    .filter(Boolean);
};

const parseInternalLinks = (value: string | null): ParsedInternalLink[] =>
  parseListItems(value).map((item) => {
    const markdownLink = item.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const description = item
      .replace(/\[([^\]]+)\]\(([^)]+)\)/, "")
      .replace(/^\s*[-\u2013\u2014]\s*/, "")
      .trim();

    return {
      title: markdownLink?.[1]?.trim() ?? item,
      url: markdownLink?.[2]?.trim() ?? null,
      description: description || null,
      raw: item,
    };
  });

const parseFaq = (value: string | null): ParsedFaqItem[] => {
  if (!value) return [];

  const items: ParsedFaqItem[] = [];
  let currentQuestion: string | null = null;
  let currentAnswer: string[] = [];

  const pushCurrentItem = () => {
    if (!currentQuestion) return;

    items.push({
      question: currentQuestion,
      answer: currentAnswer.join(" ").trim(),
    });
  };

  for (const line of value.split("\n")) {
    const trimmedLine = stripListMarker(line);
    const questionMatch = trimmedLine.match(
      /^(?:q|question|pertanyaan)\s*:\s*(.+)$/i,
    );
    const answerMatch = trimmedLine.match(
      /^(?:a|answer|jawaban)\s*:\s*(.+)$/i,
    );

    if (questionMatch?.[1]) {
      pushCurrentItem();
      currentQuestion = questionMatch[1].trim();
      currentAnswer = [];
      continue;
    }

    if (answerMatch?.[1]) {
      currentAnswer.push(answerMatch[1].trim());
      continue;
    }

    if (currentQuestion && trimmedLine) {
      currentAnswer.push(trimmedLine);
    }
  }

  pushCurrentItem();

  return items;
};

const parseGeneratedContent = (rawContent: string): StructuredGeneratedContent => {
  const sections = Object.fromEntries(
    contentSections.map((section) => [section.key, null]),
  ) as Record<ContentSectionKey, string | null>;
  let currentSectionKey: ContentSectionKey | null = null;
  let currentSectionLines: string[] = [];

  const commitCurrentSection = () => {
    if (!currentSectionKey) return;

    sections[currentSectionKey] = currentSectionLines.join("\n").trim() || null;
  };

  for (const line of rawContent.split("\n")) {
    const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const section = headingMatch?.[1]
      ? findSectionByHeading(headingMatch[1])
      : undefined;

    if (section) {
      commitCurrentSection();
      currentSectionKey = section.key;
      currentSectionLines = [];
      continue;
    }

    if (currentSectionKey) {
      currentSectionLines.push(line);
    }
  }

  commitCurrentSection();

  const titleOptions = parseListItems(sections.metaTitle);
  const descriptionOptions = parseListItems(sections.metaDescription);
  const slugOptions = parseListItems(sections.urlSlug);

  return {
    raw: rawContent,
    title: titleOptions[0] ?? sections.metaTitle,
    titleOptions,
    description: descriptionOptions[0] ?? sections.metaDescription,
    descriptionOptions,
    slug: slugOptions[0] ?? sections.urlSlug,
    slugOptions,
    strategySummary: sections.strategySummary,
    mainContent: sections.mainContent,
    internalLinks: parseInternalLinks(sections.internalLinks),
    imageAltTexts: parseListItems(sections.imageAltTexts),
    faq: parseFaq(sections.faq),
    seoNotes: parseListItems(sections.seoNotes),
    sections,
  };
};

export {
  parseGeneratedContent,
  type ParsedFaqItem,
  type ParsedInternalLink,
  type StructuredGeneratedContent,
};
