import type { Metadata } from "next";
import "./globals.css";

// The whole app is session/DB driven — never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
    images: ["/og.png"],
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
