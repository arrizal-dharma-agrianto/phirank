"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: Props) {
  const pathname = usePathname();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const showDevtools =
    process.env.NEXT_PUBLIC_TANSTACK_QUERY_DEVTOOLS === "true";

  useEffect(() => {
    const erroredActiveQueries = queryClient
      .getQueryCache()
      .findAll()
      .filter(
        (query) =>
          query.getObserversCount() > 0 && query.state.status === "error",
      );

    erroredActiveQueries.forEach((query) => {
      queryClient.refetchQueries({
        exact: true,
        queryKey: query.queryKey,
      });
    });
  }, [pathname, queryClient]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      queryClient.refetchQueries({ type: "active" });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
