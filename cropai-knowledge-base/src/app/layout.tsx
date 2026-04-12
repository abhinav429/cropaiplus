import type { Metadata } from "next";
import { NavHeader } from "@/components/NavHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "CropAI Knowledge Base",
  description:
    "CropAIplus — ingest sources, query compiled wiki pages, and browse interlinked knowledge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NavHeader />
        {children}
      </body>
    </html>
  );
}
