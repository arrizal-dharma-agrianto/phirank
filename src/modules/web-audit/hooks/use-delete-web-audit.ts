import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useActiveTenant } from "@/modules/tenant/hooks";

import { deleteWebAudit } from "../services";

const useDeleteWebAudit = () => {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: deleteWebAudit,
    onSuccess: (_data, auditId) => {
      toast.success("Audit history deleted");
      queryClient.removeQueries({
        queryKey: ["web-audits", activeTenantId, auditId],
      });
      queryClient.invalidateQueries({
        queryKey: ["web-audits", activeTenantId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete audit history",
      );
    },
  });
};

export { useDeleteWebAudit };
