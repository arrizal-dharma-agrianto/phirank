import { useQuery } from "@tanstack/react-query";

import { getMyTenants } from "../services";

export function useMyTenants() {
  return useQuery({
    queryKey: ["my-tenants"],
    queryFn: getMyTenants,
  });
}