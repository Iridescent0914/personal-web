import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "山窗夜话 · 互动原型",
  description: "窗外山雨，屋内暖灯。点击房间中的物件，探索一间江湖书房。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
