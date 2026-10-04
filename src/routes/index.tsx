import { createFileRoute } from "@tanstack/react-router";
import { MeshApp } from "@/components/mesh/mesh-app";
import { Wordmark } from "@/components/mesh/logo";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg">
        <Wordmark />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <MeshApp />;
}
