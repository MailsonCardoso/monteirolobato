import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginRedirect,
});

function LoginRedirect() {
  return <Navigate to="/" replace />;
}
