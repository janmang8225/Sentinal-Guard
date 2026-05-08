import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'SentinelGuard | Real-Time Solana Security',
  description: 'SentinelGuard watches Solana DeFi protocols in real time, detecting exploits and autonomously pausing protocols.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-body bg-base text-primary antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
