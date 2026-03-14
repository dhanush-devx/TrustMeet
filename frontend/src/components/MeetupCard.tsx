'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Clock, Coins, ArrowRight, User } from 'lucide-react';
import { type Meetup, getMeetupStatusLabel, getMeetupStatusColor, formatStrk, truncateAddress, addressesEqual } from '@/lib/meetup';
import { useAccount } from '@starknet-react/core';

interface MeetupCardProps {
  meetup: Meetup;
}

export function MeetupCard({ meetup }: MeetupCardProps) {
  const { address } = useAccount();
  const statusColor = getMeetupStatusColor(meetup.status);
  const statusLabel = getMeetupStatusLabel(meetup, address);

  const isCreator = addressesEqual(address, meetup.creator);
  const role = isCreator ? 'CREATOR' : 'COUNTERPART';
  const otherParty = isCreator ? meetup.counterpart : meetup.creator;

  const checkedIn = isCreator ? meetup.creatorCheckedIn : meetup.counterpartCheckedIn;

  return (
    <Link href={`/meetup/${meetup.id}`}>
      <div className="card-hover group animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="font-mono text-xs text-wire tracking-widest uppercase">#{meetup.id.toString().padStart(4, '0')}</span>
            <h3 className="font-display text-2xl text-snow mt-1 tracking-wider group-hover:text-amber-400 transition-colors">
              {meetup.title}
            </h3>
          </div>
          <div className={`status-badge border ${statusColor}`}>
            {meetup.status.toUpperCase()}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-amber-400 flex-shrink-0" />
            <span className="font-mono text-xs text-chalk">
              {format(meetup.meetupTime, 'MMM d, HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-amber-400 flex-shrink-0" />
            <span className="font-mono text-xs text-chalk truncate">
              {meetup.coordsDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Coins size={12} className="text-amber-400 flex-shrink-0" />
            <span className="font-mono text-xs text-chalk">
              {formatStrk(meetup.stakeAmount)} each
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-amber-400 flex-shrink-0" />
            <span className="font-mono text-xs text-chalk">
              {truncateAddress(otherParty)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-wire uppercase tracking-wider">{role}</span>
            {checkedIn && (
              <span className="font-mono text-xs text-safe bg-safe/10 px-2 py-0.5 border border-safe/30">
                ✓ CHECKED IN
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-fade group-hover:text-amber-400 transition-colors">
            <span className="font-mono text-xs">{statusLabel}</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}
