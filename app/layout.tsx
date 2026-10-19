/**
 * PAWAN KALYAN SHOWCASE WEBSITE — root layout.
 *
 * One shell for the whole showcase: it imports the single stylesheet that
 * paints the cinematic theme (ink #11100f, paper #eeeae4, OG red #da271b) and
 * declares the document metadata used by browsers, previews and share cards.
 * Everything the showcase animates lives in app/page.tsx, which renders as
 * `children` here.
 */
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Shivam Photography — Stories in Motion",
  description: "Cinematic wedding, engagement and celebration films by Shivam Photography.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
