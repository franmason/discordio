import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";

const displayFont = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Sala",
  description: "Chat e voz com a galera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={displayFont.variable}>
      <body className="bg-base text-white antialiased">{children}</body>
    </html>
  );
}
