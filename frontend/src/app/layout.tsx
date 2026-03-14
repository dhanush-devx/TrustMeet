import type { Metadata } from 'next';
import './globals.css';
import { StarknetProvider } from '@/providers/StarknetProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TrustMeet — Trustless Real-World Meetups',
  description: 'Web3 meetup coordination with STRK staking on StarkNet. Show up or pay up.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StarknetProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
        </StarknetProvider>
      </body>
    </html>
  );
}
