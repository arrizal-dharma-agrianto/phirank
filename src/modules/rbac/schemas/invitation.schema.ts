import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().email("Email tidak valid"),
  roleId: z.string().min(1, "Pilih role"),
});

export type CreateInvitationSchema = z.infer<typeof createInvitationSchema>;
