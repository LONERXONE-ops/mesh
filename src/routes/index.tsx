import { createFileRoute } from "@tanstack/react-router";
import { MeshApp } from "@/components/mesh/mesh-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <MeshApp />;
}
