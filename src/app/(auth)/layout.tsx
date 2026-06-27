import { ReactNode, Suspense } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: Readonly<AuthLayoutProps>) => {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Suspense
        fallback={
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        }
      >
        {children}
      </Suspense>
    </main>
  );
};

export default AuthLayout;
