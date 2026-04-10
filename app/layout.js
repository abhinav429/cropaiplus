import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from "./marketplace/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LeafCursor from "@/components/LeafCursor";

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Crop AI - Intelligent Agricultural Assistant",
  description: "AI-powered agricultural assistant to help farmers improve crop yield",
    generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-background to-muted/40`}>
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
                <Toaster />
                <LeafCursor />
              </div>
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
