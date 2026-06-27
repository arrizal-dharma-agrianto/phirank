import { z } from "zod";

const localWebhookHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const hasUrlProtocol = (value: string) => /^[a-z][a-z\d+.-]*:/i.test(value);

const normalizeWebhookUrl = (value: string) => {
  if (hasUrlProtocol(value)) {
    if (value.toLowerCase().startsWith("localhost:")) {
      return `http://${value}`;
    }

    return value;
  }

  const hostname = value.split(/[/:?#]/, 1)[0]?.replace(/^\[|\]$/g, "");

  if (hostname && localWebhookHosts.has(hostname)) {
    return `http://${value}`;
  }

  return `https://${value}`;
};

const contentGeneratorSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(5, "Content brief must be at least 5 characters")
    .max(500, "Content brief must be 500 characters or fewer"),
  contentType: z.enum([
    "blogArticle",
    "landingPage",
    "faqPage",
    "productDescription",
  ]),
  tone: z.enum([
    "conversational",
    "trustworthy",
    "expert",
    "friendly",
    "persuasive",
  ]),
  pronounStyle: z.enum(["kamu", "anda", "mixed"]),
  targetKeyword: z
    .string()
    .trim()
    .max(120, "Target keyword must be 120 characters or fewer"),
  websiteUrl: z
    .string()
    .trim()
    .url("Enter a valid website URL, for example https://example.com")
    .optional()
    .or(z.literal("")),
  wordCount: z
    .number()
    .int()
    .min(1500, "Word count must be at least 1500")
    .max(3000, "Word count must be 3000 or fewer")
    .optional(),
  audience: z
    .string()
    .trim()
    .max(180, "Audience must be 180 characters or fewer")
    .optional(),
  secondaryKeywords: z
    .string()
    .trim()
    .max(300, "Secondary keywords must be 300 characters or fewer")
    .optional(),
  brandContext: z
    .string()
    .trim()
    .max(800, "Brand context must be 800 characters or fewer")
    .optional(),
  internalLinks: z
    .string()
    .trim()
    .max(1200, "Internal links must be 1200 characters or fewer")
    .optional(),
});

const contentGeneratorIntegrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Integration name must be at least 2 characters")
    .max(80, "Integration name must be 80 characters or fewer"),
  webhookUrl: z
    .string()
    .trim()
    .min(1, "Webhook URL is required")
    .transform((value, context) => {
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(normalizeWebhookUrl(value));
      } catch {
        context.addIssue({
          code: "custom",
          message:
            "Enter a valid webhook URL, for example localhost:3001/api/webhooks/content",
        });

        return z.NEVER;
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        context.addIssue({
          code: "custom",
          message: "Webhook URL must use http or https",
        });

        return z.NEVER;
      }

      return parsedUrl.toString();
    }),
});

const contentGeneratorPublishSchema = z.object({
  integrationId: z.string().trim().min(1, "Choose a webhook integration"),
  contentId: z.string().trim().optional(),
  content: z.string().trim().min(1, "Generated content is required"),
  model: z.string().trim().optional(),
  source: contentGeneratorSchema,
  submitToIndexNow: z.boolean().optional().default(true),
});

type ContentGeneratorInput = z.infer<typeof contentGeneratorSchema>;
type ContentGeneratorIntegrationInput = z.input<
  typeof contentGeneratorIntegrationSchema
>;
type ContentGeneratorIntegrationPayload = z.output<
  typeof contentGeneratorIntegrationSchema
>;
type ContentGeneratorPublishInput = z.infer<
  typeof contentGeneratorPublishSchema
>;

export {
  contentGeneratorIntegrationSchema,
  contentGeneratorPublishSchema,
  contentGeneratorSchema,
  type ContentGeneratorInput,
  type ContentGeneratorIntegrationInput,
  type ContentGeneratorIntegrationPayload,
  type ContentGeneratorPublishInput,
};
