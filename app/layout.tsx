import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentPay - Property Management",
  description: "Modern property management for landlords and tenants",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
