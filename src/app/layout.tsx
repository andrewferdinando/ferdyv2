import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import InviteHashRedirect from "@/components/auth/InviteHashRedirect";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ferdy - Social Media Marketing Automation",
  description: "Create, schedule, and publish social media posts automatically with Ferdy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <InviteHashRedirect />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
