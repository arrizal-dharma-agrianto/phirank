import { z } from "zod";

const websiteCrawlerSchema = z.object({
  name: z.string().trim().min(2, "Website name is required."),
  websiteUrl: z.string().trim().url("Enter a valid website URL."),
  industry: z.string().trim().optional(),
  targetCountry: z.string().trim().default("Indonesia"),
  targetLanguage: z.string().trim().default("id"),
  maxCrawlPages: z.coerce
    .number()
    .int()
    .min(1, "Minimum crawl limit is 1 page.")
    .max(1000, "Maximum crawl limit is 1000 pages.")
    .default(100),
});

type WebsiteCrawlerInput = z.infer<typeof websiteCrawlerSchema>;
type WebsiteCrawlerFormInput = z.input<typeof websiteCrawlerSchema>;

export {
  websiteCrawlerSchema,
  type WebsiteCrawlerFormInput,
  type WebsiteCrawlerInput,
};
