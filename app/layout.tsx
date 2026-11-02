import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Figtree, Syne } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { EnsureUser } from "@/components/EnsureUser";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LendLoop — neighborhood tool lending",
  description: "Borrow what you need. Lend what you don't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${syne.variable} ${figtree.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <ConvexClientProvider>
            <EnsureUser>
              <SiteHeader />
              <main className="flex-1">{children}</main>
            </EnsureUser>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
