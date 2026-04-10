import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCA 索引検索",
  description: "Google Cloud 索引のキーワード検索",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-sky-50 min-h-screen">{children}</body>
    </html>
  );
}
