import { z } from "zod";

const createTenantSchema = z.object({
  name: z
    .string()
    .min(3, "at least 3 characters")
    .max(50),
});

type CreateTenantInput =
  z.infer<typeof createTenantSchema>;

export {
  createTenantSchema,
  type CreateTenantInput,
};