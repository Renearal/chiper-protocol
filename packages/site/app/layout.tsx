import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Private Vault - FHE Encrypted ETH",
  description: "Private ETH storage powered by Zama fhEVM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <div className="max-w-lg mx-auto">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

