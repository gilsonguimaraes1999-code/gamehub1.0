import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Login from "@/components/sghub/Login";
import { StarfieldBackground } from "@/components/brand/StarfieldBackground";
import { useAuthSession } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginRoute,
});

function LoginRoute() {
  const { session, hydrated } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && session) {
      navigate({ to: "/hub", replace: true });
    }
  }, [hydrated, session, navigate]);

  if (!hydrated || session) return null;

  return (
    <>
      <StarfieldBackground withVignette={false} />
      <Login />
    </>
  );
}
