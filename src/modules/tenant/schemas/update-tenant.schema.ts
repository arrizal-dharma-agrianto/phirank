import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(3, "Name minimal 3 karakter").max(50),
});

type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export { updateTenantSchema, type UpdateTenantInput };