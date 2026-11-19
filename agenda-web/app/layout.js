import { Geist, Geist_Mono } from "next/font/google";
import business from "../config/business.json";
import "./globals.css";

const { brand, colors } = business;
const theme = {
  "--brand-primary": colors.primary,
  "--brand-on-primary": colors.onPrimary,
  "--brand-accent": colors.accent,
  "--brand-background": colors.background,
  "--brand-surface": colors.surface,
  "--brand-text": colors.text,
  "--brand-muted": colors.mutedText,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: brand.name + " · Reservas",
  description: brand.heroSubtitle,
  icons: brand.logo ? { icon: brand.logo } : undefined,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" style={theme}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}