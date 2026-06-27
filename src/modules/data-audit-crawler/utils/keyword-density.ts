import type { KeywordDensityItem } from "../types";

const STOP_WORDS = new Set([
  "a",
  "about",
  "ada",
  "adalah",
  "agar",
  "akan",
  "an",
  "and",
  "atau",
  "bagi",
  "bahwa",
  "boolean",
  "by",
  "children",
  "chunk",
  "chunks",
  "dan",
  "dari",
  "dengan",
  "di",
  "false",
  "for",
  "from",
  "in",
  "ini",
  "into",
  "is",
  "itu",
  "javascript",
  "ke",
  "next",
  "null",
  "of",
  "on",
  "or",
  "pada",
  "props",
  "script",
  "static",
  "the",
  "to",
  "true",
  "undefined",
  "untuk",
  "webpack",
  "yang",
]);

const tokenizeWords = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
};

const isUsefulToken = (token: string) => {
  return token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token);
};

const getKeywordDensity = (text: string, limit = 8): KeywordDensityItem[] => {
  const words = tokenizeWords(text);
  const totalWords = words.length;

  if (!totalWords) return [];

  const counts = new Map<string, number>();
  const addCandidate = (candidate: string) => {
    counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  };

  words.forEach((word) => {
    if (isUsefulToken(word)) {
      addCandidate(word);
    }
  });

  for (const phraseLength of [2, 3]) {
    for (let index = 0; index <= words.length - phraseLength; index += 1) {
      const phraseWords = words.slice(index, index + phraseLength);

      if (phraseWords.every(isUsefulToken)) {
        addCandidate(phraseWords.join(" "));
      }
    }
  }

  return [...counts.entries()]
    .filter(([, occurrences]) => occurrences > 1)
    .map(([keyword, occurrences]) => ({
      keyword,
      occurrences,
      density: Number(((occurrences / totalWords) * 100).toFixed(2)),
    }))
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }

      return a.keyword.localeCompare(b.keyword);
    })
    .slice(0, limit);
};

export { getKeywordDensity };
