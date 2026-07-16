import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/salons")({
  ssr: false,
  component: () => <Outlet />,
});