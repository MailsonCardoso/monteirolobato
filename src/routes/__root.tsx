import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AppLayout } from "../components/layout/AppLayout";
import { ThemeProvider } from "../lib/theme";
import { AuthProvider, useAuth } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";
import { canAccess, homeFor } from "../lib/access";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

const sitePaths = ["/transparencia", "/institucional", "/noticias", "/contato", "/ouvidoria"];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isSiteRoute = sitePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAssociadoRoute = pathname.startsWith("/associado");
  const isLoginRoute = pathname === "/login";
  const isPublicRoute = pathname === "/" || isLoginRoute || isSiteRoute || isAssociadoRoute;

  useEffect(() => {
    if (loading) return;

    if (user && isLoginRoute) {
      if (user.must_change_password) {
        navigate({ to: "/trocar-senha", replace: true });
      } else {
        navigate({ to: homeFor(user.role), replace: true });
      }
      return;
    }

    if (isPublicRoute) return;

    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (user.must_change_password && pathname !== "/trocar-senha") {
      navigate({ to: "/trocar-senha", replace: true });
      return;
    }

    if (!canAccess(user.role, pathname)) {
      navigate({ to: homeFor(user.role), replace: true });
    }
  }, [user, loading, pathname, isPublicRoute, isLoginRoute, navigate]);

  if (loading) return null;
  if (isPublicRoute) return <>{children}</>;
  if (!user) return null;
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSiteRoute = sitePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/trocar-senha" ||
    pathname.startsWith("/associado") ||
    isSiteRoute;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AuthGuard>
            {isAuthRoute ? (
              <Outlet />
            ) : (
              <AppLayout>
                <Outlet />
              </AppLayout>
            )}
          </AuthGuard>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
