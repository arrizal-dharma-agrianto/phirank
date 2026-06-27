import { z } from "zod";

const webAuditSchema = z.object({
  websiteId: z.string().trim().min(1, "Website is required").optional(),
  url: z
    .string()
    .trim()
    .min(1, "Website URL is required")
    .url("Enter a valid URL, for example https://example.com")
    .refine(
      (value) => {
        try {
          return ["http:", "https:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      },
      {
        message: "URL must use http or https",
      },
    )
    .optional(),
});

type WebAuditInput = z.infer<typeof webAuditSchema>;

export { webAuditSchema, type WebAuditInput };
