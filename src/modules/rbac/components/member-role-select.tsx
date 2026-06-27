"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignableRoles } from "../hooks/use-roles";
import { useAssignRole } from "../hooks/use-assign-role";

type Props = {
  memberId: string;
  currentRoleId: string;
  // tidak bisa ganti role diri sendiri atau member yang isSystem-locked
  disabled?: boolean;
};

const MemberRoleSelect = ({ memberId, currentRoleId, disabled }: Props) => {
  const { data: roles, isLoading } = useAssignableRoles();
  const { mutate: assignRole, isPending } = useAssignRole();

  const handleChange = (roleId: string) => {
    if (roleId === currentRoleId) return;
    assignRole({ memberId, roleId });
  };

  return (
    <Select
      value={currentRoleId}
      onValueChange={handleChange}
      disabled={disabled || isLoading || isPending}
    >
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue placeholder="Pilih role..." />
      </SelectTrigger>
      <SelectContent>
        {roles?.map((role) => (
          <SelectItem key={role.id} value={role.id} className="text-xs">
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export { MemberRoleSelect };
