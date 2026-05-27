import { ProtectedGate } from "@/components/protected-gate";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedGate>{children}</ProtectedGate>;
}
