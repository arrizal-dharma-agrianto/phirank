import { Checkbox } from "@/components/ui/checkbox";
import type { PermissionGroup } from "../types";
import { Badge } from "@/components/ui/badge";

type Props = {
  group: PermissionGroup;
  checkedIds: Set<string>;
  disabled?: boolean;
  onToggle: (permissionId: string, checked: boolean) => void;
  onToggleGroup: (permissionIds: string[], checked: boolean) => void;
};

const PermissionMatrixRow = ({
  group,
  checkedIds,
  disabled,
  onToggle,
  onToggleGroup,
}: Props) => {
  const allChecked = group.permissions.every((p) => checkedIds.has(p.id));
  const someChecked = group.permissions.some((p) => checkedIds.has(p.id));
  const permissionIds = group.permissions.map((p) => p.id);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
        <Checkbox
          checked={allChecked}
          // indeterminate state saat sebagian tercentang
          ref={(el) => {
            if (el)
              (
                el as HTMLButtonElement & { indeterminate: boolean }
              ).indeterminate = someChecked && !allChecked;
          }}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onToggleGroup(permissionIds, checked as boolean)
          }
        />
        <span className="text-sm font-medium">{group.group}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {group.permissions.filter((p) => checkedIds.has(p.id)).length}/
          {group.permissions.length}
        </Badge>
      </div>

      {/* Permission rows */}
      <div className="divide-y">
        {group.permissions.map((permission) => (
          <label
            key={permission.id}
            className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
          >
            <Checkbox
              className="mt-0.5"
              checked={checkedIds.has(permission.id)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onToggle(permission.id, checked as boolean)
              }
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-foreground leading-tight">
                {permission.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {permission.key}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export { PermissionMatrixRow };
