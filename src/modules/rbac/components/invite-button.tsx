"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InviteMemberForm } from "@/modules/rbac";
import { useActiveTenant, useMyTenants } from "@/modules/tenant/hooks";
import { UserPlusIcon } from "@phosphor-icons/react";

const InviteButton = () => {
  const { activeTenantId } = useActiveTenant();
  const { data: tenants, isLoading: isLoadingTenants } = useMyTenants();
  const [open, setOpen] = useState(false);
  const hasActiveWorkspace =
    !isLoadingTenants && !!activeTenantId && !!tenants?.length;

  return (
    <>
      <Button
        size="sm"
        disabled={!hasActiveWorkspace}
        onClick={() => setOpen(true)}
      >
        <UserPlusIcon className="h-4 w-4 mr-1.5" />
        Invite Member
      </Button>
      {hasActiveWorkspace ? (
        <InviteMemberForm open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
};

export { InviteButton };
