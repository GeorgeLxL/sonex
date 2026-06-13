import type { Metadata } from "next";
import { Inter, Sora, Playfair_Display, DM_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
// Luxury public theme: serif display + mono kickers (ERP keeps Sora).
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dmmono",
  display: "swap",
});

// The whole app is session/DB driven — never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sonex-digital.com"),
  title: { default: "Sonex-Digital", template: "%s — Sonex-Digital" },
  description:
    "We design and build software that moves businesses forward — web, mobile, ERP and AI systems.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Sonex-Digital",
    description:
      "We design and build software that moves businesses forward — web, mobile, ERP and AI systems.",
    images: ["/og.jpg"],
  },
};

// Dark is the default — only an explicit 'light' choice opts out.
const themeScript = `(function(){try{if(localStorage.getItem('theme')!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${sora.variable} ${playfair.variable} ${dmMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
