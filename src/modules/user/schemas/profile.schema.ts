import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  image: z.string().optional().nullable(),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export { updateProfileSchema };
export type { UpdateProfileInput };