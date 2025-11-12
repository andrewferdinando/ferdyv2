import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";
import DashboardAuthGate from "@/components/auth/DashboardAuthGate";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppLayout>
      <DashboardAuthGate />
      {children}
    </AppLayout>
  );
}

