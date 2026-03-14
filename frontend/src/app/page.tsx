'use client';

import { useAccount } from '@starknet-react/core';
import { useUserMeetups, useGetMeetup, useMeetupCount } from '@/hooks/useTrustMeet';
import { MeetupCard } from '@/components/MeetupCard';
import Link from 'next/link';
import { Plus, Shield, Zap, MapPin, ArrowRight, Lock } from 'lucide-react';

function MeetupCardLoader({ meetupId }: { meetupId: number }) {
  const { meetup, isLoading } = useGetMeetup(meetupId);
  if (isLoading) return <div className="card animate-pulse h-40 bg-ash" />;
  if (!meetup) return null;
  return <MeetupCard meetup={meetup} />;
}

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { meetupIds, isLoading } = useUserMeetups();
  const { count } = useMeetupCount();

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="section-title mb-2">MY MEETUPS</h1>
          <p className="font-mono text-xs text-fade tracking-wider">
            {count} total on-chain · {meetupIds.length} yours
          </p>
        </div>
        <Link href="/create" className="btn-primary flex items-center gap-2">
          <Plus size={14} />
          New Meetup
        </Link>
      </div>

      {/* Meetups list */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-40 bg-ash" />
          ))}
        </div>
      ) : meetupIds.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <MapPin size={20} className="text-amber-400" />
          </div>
          <h3 className="font-display text-2xl text-snow mb-2 tracking-wider">NO MEETUPS YET</h3>
          <p className="font-mono text-xs text-fade mb-6 max-w-sm mx-auto">
            Create your first staked meetup. Both parties commit, both parties show up.
          </p>
          <Link href="/create" className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} />
            Create First Meetup
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetupIds.map((id) => (
            <MeetupCardLoader key={id.toString()} meetupId={Number(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div className="animate-slide-up">
      {/* Hero */}
      <div className="mb-16 mt-4">
        <div className="inline-flex items-center gap-2 border border-amber-500/30 px-3 py-1 mb-6">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          <span className="font-mono text-xs text-amber-400 tracking-widest uppercase">Live on StarkNet Sepolia</span>
        </div>

        <h1 className="font-display text-7xl md:text-8xl text-snow tracking-wider leading-none mb-6">
          SHOW UP<br />
          <span className="text-amber-400">OR PAY UP.</span>
        </h1>

        <p className="font-mono text-sm text-fade max-w-lg leading-relaxed mb-8">
          Stake STRK. Meet in person. Both show up → full refund. One no-show → other gets both stakes.
          No trust required. Just math.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/create" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Create Meetup
          </Link>
          <a
            href="https://github.com/yourusername/trustmeet"
            target="_blank"
            className="btn-secondary flex items-center gap-2"
          >
            View Contracts
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-zinc-800 pt-12 mb-12">
        <h2 className="font-display text-3xl text-snow tracking-wider mb-8">HOW IT WORKS</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: Plus, label: '01. CREATE', desc: 'Set location, time, and stake amount. Invite your counterpart by address.' },
            { icon: Lock, label: '02. STAKE', desc: 'Both parties lock STRK in the smart contract. Commitment is financial.' },
            { icon: MapPin, label: '03. CHECK IN', desc: 'At meetup time, both verify physical presence via GPS.' },
            { icon: Zap, label: '04. SETTLE', desc: 'Contract auto-refunds if both attended. No-show? Other party wins the pot.' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card border-l-2 border-amber-500">
              <div className="w-8 h-8 bg-amber-500/10 flex items-center justify-center mb-3">
                <Icon size={16} className="text-amber-400" />
              </div>
              <p className="font-mono text-xs text-amber-400 tracking-widest mb-2">{label}</p>
              <p className="font-mono text-xs text-fade leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="border-t border-zinc-800 pt-12">
        <h2 className="font-display text-3xl text-snow tracking-wider mb-6">USE CASES</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            'P2P marketplace handovers (buy/sell items)',
            'Freelance job handover meetings',
            'Event attendance commitments',
            'Peer-to-peer service exchanges',
          ].map((use) => (
            <div key={use} className="flex items-center gap-3 py-3 border-b border-zinc-800/50">
              <div className="w-1 h-4 bg-amber-400" />
              <span className="font-mono text-xs text-chalk">{use}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isConnected } = useAccount();
  return isConnected ? <Dashboard /> : <Landing />;
}
