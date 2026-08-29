import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunSync Garmin",
  description: "Envie treinos estruturados para o Garmin Connect",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
