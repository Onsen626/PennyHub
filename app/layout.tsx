import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";

// Inter with its optical-size axis: Fluid Functionalism animates a label's
// weight together with opsz, so it gets bolder without getting wider. Without
// the axis (or with a static Inter) weight changes shift the layout.
const inter = Inter({ subsets: ["latin"], axes: ["opsz"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "My app",
  description: "Built with Fluid Functionalism.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} font-sans antialiased`}
      // The accent (Blue): focus rings, the switch track and every other
      // accented detail read --fluid-accent. Change it here.
      style={{ "--fluid-accent": "#6B97FF" } as React.CSSProperties}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
