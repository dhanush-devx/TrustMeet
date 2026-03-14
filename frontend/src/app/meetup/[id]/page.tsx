'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from '@starknet-react/core';
import { format } from 'date-fns';
import {
  useGetMeetup,
  useJoinMeetup,
  useCheckin,
  useFinalizeMeetup,
} from '@/hooks/useTrustMeet';
import {
  formatStrk,
  truncateAddress,
  getMeetupStatusColor,
  addressesEqual,
  type Meetup,
} from '@/lib/meetup';
import {
  MapPin, Clock, Coins, User, AlertCircle,
  Loader2, Navigation, CheckCircle, ArrowLeft,
  Zap, Shield, ExternalLink, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

// ─── Checkin Progress Bar ────────────────────────────────────────────────────
function AttendanceBar({ meetup, isCreator }: { meetup: Meetup; isCreator: boolean }) {
  const myCheckin = isCreator ? meetup.creatorCheckedIn : meetup.counterpartCheckedIn;
  const theirCheckin = isCreator ? meetup.counterpartCheckedIn : meetup.creatorCheckedIn;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-fade uppercase tracking-wider">You</span>
        <div className={`flex items-center gap-1.5 font-mono text-xs ${myCheckin ? 'text-safe' : 'text-wire'}`}>
          {myCheckin ? <><CheckCircle size={11} /> Checked in</> : '— Not yet'}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-fade uppercase tracking-wider">Counterpart</span>
        <div className={`flex items-center gap-1.5 font-mono text-xs ${theirCheckin ? 'text-safe' : 'text-wire'}`}>
          {theirCheckin ? <><CheckCircle size={11} /> Checked in</> : '— Not yet'}
        </div>
      </div>
      {/* visual bar */}
      <div className="h-1 bg-zinc-800 w-full">
        <div
          className="h-1 bg-amber-400 transition-all duration-700"
          style={{
            width: `${((myCheckin ? 1 : 0) + (theirCheckin ? 1 : 0)) * 50}%`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Outcome Panel (finalized) ────────────────────────────────────────────────
function OutcomePanel({ meetup }: { meetup: Meetup }) {
  const bothIn = meetup.creatorCheckedIn && meetup.counterpartCheckedIn;
  const neitherIn = !meetup.creatorCheckedIn && !meetup.counterpartCheckedIn;

  if (bothIn) {
    return (
      <div className="bg-safe/5 border border-safe/30 p-5 text-center">
        <div className="text-4xl mb-2">🤝</div>
        <p className="font-display text-2xl text-safe tracking-wider mb-1">BOTH SHOWED UP</p>
        <p className="font-mono text-xs text-fade">Stakes refunded. Trust established.</p>
      </div>
    );
  }

  if (neitherIn) {
    return (
      <div className="bg-zinc-800/30 border border-zinc-700 p-5 text-center">
        <div className="text-4xl mb-2">👻</div>
        <p className="font-display text-2xl text-fade tracking-wider mb-1">BOTH NO-SHOWED</p>
        <p className="font-mono text-xs text-wire">Stakes refunded to both. No penalty for mutual ghost.</p>
      </div>
    );
  }

  const winner = meetup.creatorCheckedIn ? 'CREATOR' : 'COUNTERPART';
  return (
    <div className="bg-danger/5 border border-danger/30 p-5 text-center">
      <div className="text-4xl mb-2">💸</div>
      <p className="font-display text-2xl text-danger tracking-wider mb-1">NO-SHOW PENALTY</p>
      <p className="font-mono text-xs text-fade">
        {winner} attended → collected {formatStrk(meetup.stakeAmount * 2n)}
      </p>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ meetup }: { meetup: Meetup }) {
  const now = new Date();
  const created = true; // always true if meetup exists
  const joined = meetup.status !== 'pending';
  const meetupPassed = meetup.meetupTime < now;
  const finalized = meetup.status === 'finalized';

  const steps = [
    { label: 'Created', done: created },
    { label: 'Counterpart joined', done: joined },
    { label: `Meetup @ ${format(meetup.meetupTime, 'HH:mm')}`, done: meetupPassed },
    { label: 'Finalized', done: finalized },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-3 h-3 rounded-full border-2 transition-colors ${
              step.done ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-zinc-600'
            }`} />
            <span className="font-mono text-xs text-wire text-center leading-tight w-16">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-12 mb-4 transition-colors ${step.done ? 'bg-amber-400' : 'bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MeetupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetupId = Number(params.id);

  const { address, isConnected } = useAccount();
  const { meetup, isLoading, error, refetch } = useGetMeetup(meetupId);
  const { joinMeetup } = useJoinMeetup();
  const { checkin } = useCheckin();
  const { finalize } = useFinalizeMeetup();

  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [actionError, setActionError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [lastAction, setLastAction] = useState('');

  const isCreator = addressesEqual(address, meetup?.creator);
  const isCounterpart = addressesEqual(address, meetup?.counterpart);
  const isParticipant = isCreator || isCounterpart;

  const now = new Date();
  const checkinWindowOpen = meetup
    ? now >= new Date(meetup.meetupTime.getTime() - 30 * 60000) &&
      now <= new Date(meetup.meetupTime.getTime() + 30 * 60000)
    : false;
  const canFinalize = meetup
    ? now > new Date(meetup.meetupTime.getTime() + 30 * 60000) && meetup.status === 'active'
    : false;

  const myCheckedIn = meetup
    ? isCreator ? meetup.creatorCheckedIn : meetup.counterpartCheckedIn
    : false;

  async function handleJoin() {
    if (!meetup) return;
    setActionStatus('loading');
    setActionError('');
    setLastAction('join');
    try {
      const result = await joinMeetup(meetupId, meetup.stakeAmount);
      setTxHash(result.transaction_hash);
      setActionStatus('success');
      setTimeout(() => { refetch(); setActionStatus('idle'); }, 4000);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to join');
      setActionStatus('error');
    }
  }

  async function handleCheckin() {
    setActionStatus('loading');
    setActionError('');
    setLastAction('checkin');
    try {
      const { txResult, position } = await checkin(meetupId, true); // mock GPS
      setTxHash(txResult.transaction_hash);
      setActionStatus('success');
      setTimeout(() => { refetch(); setActionStatus('idle'); }, 4000);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Check-in failed');
      setActionStatus('error');
    }
  }

  async function handleFinalize() {
    setActionStatus('loading');
    setActionError('');
    setLastAction('finalize');
    try {
      const result = await finalize(meetupId);
      setTxHash(result.transaction_hash);
      setActionStatus('success');
      setTimeout(() => { refetch(); setActionStatus('idle'); }, 4000);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Finalize failed');
      setActionStatus('error');
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <Loader2 size={24} className="animate-spin text-amber-400 mx-auto mb-4" />
        <p className="font-mono text-xs text-fade">Loading meetup from chain...</p>
      </div>
    );
  }

  if (error || !meetup) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <AlertCircle size={24} className="text-danger mx-auto mb-4" />
        <h2 className="font-display text-2xl text-snow mb-2 tracking-wider">MEETUP NOT FOUND</h2>
        <p className="font-mono text-xs text-fade mb-6">ID #{meetupId} doesn&apos;t exist on-chain.</p>
        <Link href="/" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const statusColor = getMeetupStatusColor(meetup.status);

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-fade hover:text-chalk mb-6 transition-colors">
        <ArrowLeft size={12} /> Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="font-mono text-xs text-wire tracking-widest">
            #{meetupId.toString().padStart(4, '0')}
          </span>
          <h1 className="font-display text-5xl text-snow tracking-wider mt-1">{meetup.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-zinc-700 hover:border-zinc-500 transition-colors text-fade hover:text-chalk"
          >
            <RefreshCw size={13} />
          </button>
          <div className={`status-badge border ${statusColor}`}>
            {meetup.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card mb-5 overflow-x-auto">
        <Timeline meetup={meetup} />
      </div>

      {/* Outcome (if finalized) */}
      {meetup.status === 'finalized' && (
        <div className="mb-5">
          <OutcomePanel meetup={meetup} />
        </div>
      )}

      {/* Details grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {/* Location */}
        <div className="card">
          <p className="label"><MapPin size={10} className="inline mr-1" />Location</p>
          <p className="font-mono text-sm text-snow">{meetup.coordsDisplay}</p>
          <a
            href={`https://www.google.com/maps?q=${meetup.lat},${meetup.lng}`}
            target="_blank"
            className="inline-flex items-center gap-1 font-mono text-xs text-amber-400 hover:underline mt-2"
          >
            Open in Maps <ExternalLink size={10} />
          </a>
        </div>

        {/* Time */}
        <div className="card">
          <p className="label"><Clock size={10} className="inline mr-1" />Meetup Time</p>
          <p className="font-mono text-sm text-snow">{format(meetup.meetupTime, 'MMM d, yyyy')}</p>
          <p className="font-mono text-xl text-amber-400 mt-1">{format(meetup.meetupTime, 'HH:mm')}</p>
          {checkinWindowOpen && (
            <span className="inline-block mt-2 font-mono text-xs text-safe bg-safe/10 border border-safe/30 px-2 py-0.5">
              CHECK-IN WINDOW OPEN
            </span>
          )}
        </div>

        {/* Stakes */}
        <div className="card">
          <p className="label"><Coins size={10} className="inline mr-1" />Stake per person</p>
          <p className="font-mono text-2xl text-snow">{formatStrk(meetup.stakeAmount)}</p>
          <p className="font-mono text-xs text-fade mt-1">
            Total locked: {formatStrk(meetup.stakeAmount * 2n)}
          </p>
        </div>

        {/* Participants */}
        <div className="card">
          <p className="label"><User size={10} className="inline mr-1" />Participants</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-wire uppercase tracking-wider">Creator</span>
                <p className="font-mono text-xs text-chalk">{truncateAddress(meetup.creator)}</p>
              </div>
              {meetup.creatorCheckedIn && (
                <CheckCircle size={14} className="text-safe" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-wire uppercase tracking-wider">Counterpart</span>
                <p className="font-mono text-xs text-chalk">{truncateAddress(meetup.counterpart)}</p>
              </div>
              {meetup.counterpartCheckedIn && (
                <CheckCircle size={14} className="text-safe" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance tracker (active only) */}
      {meetup.status === 'active' && isParticipant && (
        <div className="card mb-5">
          <p className="label mb-4">Check-in Status</p>
          <AttendanceBar meetup={meetup} isCreator={isCreator} />
        </div>
      )}

      {/* ── Action Panel ── */}
      {isConnected && isParticipant && meetup.status !== 'finalized' && (
        <div className="card border-amber-500/20 bg-amber-500/5">
          <p className="label text-amber-400 mb-4">
            <Zap size={10} className="inline mr-1" />
            Your Action
          </p>

          {/* Action: Join */}
          {meetup.status === 'pending' && isCounterpart && (
            <div>
              <p className="font-mono text-xs text-fade mb-4 leading-relaxed">
                You&apos;ve been invited to this meetup. Stake{' '}
                <span className="text-amber-400">{formatStrk(meetup.stakeAmount)}</span> to confirm.
                If you show up, you get it back. If you don&apos;t - creator keeps it.
              </p>
              <button
                onClick={handleJoin}
                disabled={actionStatus === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {actionStatus === 'loading' && lastAction === 'join' ? (
                  <><Loader2 size={14} className="animate-spin" /> Staking...</>
                ) : (
                  <><Shield size={14} /> Stake & Join Meetup</>
                )}
              </button>
            </div>
          )}

          {/* Waiting for counterpart */}
          {meetup.status === 'pending' && isCreator && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mt-1 flex-shrink-0" />
              <div>
                <p className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-1">Awaiting counterpart</p>
                <p className="font-mono text-xs text-fade">
                  Share this URL with <span className="text-chalk">{truncateAddress(meetup.counterpart)}</span>{' '}
                  so they can join and stake.
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="mt-3 font-mono text-xs text-amber-400 hover:underline"
                >
                  Copy meetup link ↗
                </button>
              </div>
            </div>
          )}

          {/* Check-in */}
          {meetup.status === 'active' && !myCheckedIn && (
            <div>
              {checkinWindowOpen ? (
                <>
                  <p className="font-mono text-xs text-fade mb-4 leading-relaxed">
                    Check-in window is open (±30 min). Your GPS location will be verified against the meetup location.
                    <span className="text-amber-400"> Mock GPS active for demo.</span>
                  </p>
                  <button
                    onClick={handleCheckin}
                    disabled={actionStatus === 'loading'}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {actionStatus === 'loading' && lastAction === 'checkin' ? (
                      <><Loader2 size={14} className="animate-spin" /> Verifying location...</>
                    ) : (
                      <><Navigation size={14} /> Check In Now</>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <Clock size={20} className="text-fade mx-auto mb-2" />
                  <p className="font-mono text-xs text-fade">
                    Check-in opens at{' '}
                    {format(new Date(meetup.meetupTime.getTime() - 30 * 60000), 'HH:mm')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Already checked in */}
          {meetup.status === 'active' && myCheckedIn && !canFinalize && (
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-safe flex-shrink-0" />
              <div>
                <p className="font-mono text-xs text-safe uppercase tracking-wider">You&apos;re checked in</p>
                <p className="font-mono text-xs text-fade mt-0.5">
                  Waiting for check-in window to close, then anyone can finalize.
                </p>
              </div>
            </div>
          )}

          {/* Finalize */}
          {canFinalize && (
            <div>
              <p className="font-mono text-xs text-fade mb-4 leading-relaxed">
                Check-in window has closed. Anyone can trigger settlement now.
                The contract will calculate the outcome and transfer stakes.
              </p>
              <button
                onClick={handleFinalize}
                disabled={actionStatus === 'loading'}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {actionStatus === 'loading' && lastAction === 'finalize' ? (
                  <><Loader2 size={14} className="animate-spin" /> Finalizing...</>
                ) : (
                  <><Zap size={14} /> Finalize & Settle Stakes</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Not a participant */}
      {isConnected && !isParticipant && meetup.status !== 'finalized' && (
        <div className="card border-zinc-700 text-center py-6">
          <Shield size={18} className="text-fade mx-auto mb-2" />
          <p className="font-mono text-xs text-fade">You are not a participant in this meetup.</p>
        </div>
      )}

      {/* Tx feedback */}
      {actionStatus === 'success' && txHash && (
        <div className="mt-4 flex items-start gap-2 bg-safe/5 border border-safe/30 p-3 animate-slide-up">
          <CheckCircle size={14} className="text-safe flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-xs text-safe uppercase tracking-wider mb-1">
              {lastAction === 'join' && 'Joined successfully'}
              {lastAction === 'checkin' && 'Checked in'}
              {lastAction === 'finalize' && 'Meetup finalized'}
            </p>
            <a
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              className="font-mono text-xs text-amber-400 hover:underline break-all"
            >
              {txHash.slice(0, 20)}...{txHash.slice(-6)} ↗
            </a>
          </div>
        </div>
      )}

      {/* Error feedback */}
      {actionStatus === 'error' && (
        <div className="mt-4 flex items-start gap-2 bg-danger/5 border border-danger/30 p-3 animate-slide-up">
          <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-danger">{actionError}</p>
        </div>
      )}
    </div>
  );
}
