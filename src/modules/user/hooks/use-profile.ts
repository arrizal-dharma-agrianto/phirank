import { useQuery } from "@tanstack/react-query";

import { getProfile } from "../services";

const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
}

export { useProfile };