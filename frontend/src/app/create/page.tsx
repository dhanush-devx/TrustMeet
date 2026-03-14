'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@starknet-react/core';
import { useCreateMeetup, useMeetupCount } from '@/hooks/useTrustMeet';
import { formatCoords, getCurrentPosition } from '@/lib/gps';
import { MapPin, Clock, Coins, User, AlertCircle, Loader2, Navigation } from 'lucide-react';

export default function CreateMeetupPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createMeetup } = useCreateMeetup();
  const { count } = useMeetupCount();

  const [form, setForm] = useState({
    title: '',
    lat: '',
    lng: '',
    meetupDate: '',
    meetupTime: '',
    stakeAmount: '1',
    counterpart: '',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [createdMeetupId, setCreatedMeetupId] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const loadCurrentLocation = useCallback(async (mock = true) => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentPosition(mock);
      setForm((f) => ({
        ...f,
        lat: pos.lat.toFixed(6),
        lng: pos.lng.toFixed(6),
      }));
    } catch (err) {
      setError('Could not get location. Enter manually.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!isConnected) { setError('Connect wallet first'); return; }
    if (!form.title || !form.lat || !form.lng || !form.meetupDate || !form.meetupTime || !form.counterpart) {
      setError('Fill all fields'); return;
    }

    setStatus('loading');
    setError('');

    try {
      const meetupTime = new Date(`${form.meetupDate}T${form.meetupTime}`);
      if (meetupTime <= new Date()) { setError('Meetup must be in the future'); setStatus('idle'); return; }
      const predictedMeetupId = count + 1;

      const result = await createMeetup({
        title: form.title,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        meetupTime,
        stakeAmountStrk: form.stakeAmount,
        counterpart: form.counterpart,
      });

      setTxHash(result.transaction_hash);
      setCreatedMeetupId(predictedMeetupId);
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStatus('error');
    }
  };

  const createdMeetupUrl = createdMeetupId
    ? `/meetup/${createdMeetupId}`
    : null;

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 animate-slide-up">
        <div className="w-12 h-12 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <MapPin size={20} className="text-fade" />
        </div>
        <h2 className="font-display text-3xl text-snow mb-2 tracking-wider">CONNECT WALLET</h2>
        <p className="font-mono text-xs text-fade">Connect your StarkNet wallet to create a meetup.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto text-center py-24 animate-slide-up">
        <div className="w-16 h-16 bg-safe/10 border border-safe/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="font-display text-4xl text-snow mb-3 tracking-wider">MEETUP CREATED</h2>
        <p className="font-mono text-xs text-fade mb-6">
          Stake locked. Share the meetup link with your counterpart so they can open the invite and stake.
        </p>
        {txHash && (
          <a
            href={`https://sepolia.voyager.online/tx/${txHash}`}
            target="_blank"
            className="font-mono text-xs text-amber-400 hover:underline block mb-6 break-all"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-8)} ↗
          </a>
        )}
        {createdMeetupUrl && (
          <div className="space-y-3">
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}${createdMeetupUrl}`)}
              className="btn-primary w-full"
            >
              Copy Invite Link
            </button>
            <button
              onClick={() => router.push(createdMeetupUrl)}
              className="btn-secondary w-full"
            >
              Open Meetup Page
            </button>
          </div>
        )}
      </div>
    );
  }

  const coordsDisplay = form.lat && form.lng
    ? formatCoords(parseFloat(form.lat), parseFloat(form.lng))
    : null;

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="section-title mb-2">CREATE MEETUP</h1>
        <p className="font-mono text-xs text-fade tracking-wider">
          You stake first. Counterpart joins. Contract holds both stakes.
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="label">Meetup Title</label>
          <input
            name="title"
            className="input-field"
            placeholder="Buy iPhone 14 from OLX"
            value={form.title}
            onChange={handleChange}
            maxLength={31}
          />
          <p className="font-mono text-xs text-wire mt-1">{form.title.length}/31 chars (on-chain limit)</p>
        </div>

        {/* Location */}
        <div>
          <label className="label">Meetup Location</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              name="lat"
              className="input-field"
              placeholder="Latitude (19.0760)"
              value={form.lat}
              onChange={handleChange}
              type="number"
              step="0.000001"
            />
            <input
              name="lng"
              className="input-field"
              placeholder="Longitude (72.8777)"
              value={form.lng}
              onChange={handleChange}
              type="number"
              step="0.000001"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadCurrentLocation(true)}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
            >
              {gpsLoading ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
              Use mock GPS (demo)
            </button>
            <span className="text-wire font-mono text-xs">·</span>
            <button
              onClick={() => loadCurrentLocation(false)}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 font-mono text-xs text-fade hover:text-chalk transition-colors disabled:opacity-50"
            >
              <Navigation size={11} />
              Use real GPS
            </button>
          </div>
          {coordsDisplay && (
            <p className="font-mono text-xs text-safe mt-1.5 flex items-center gap-1">
              <MapPin size={10} />
              {coordsDisplay}
            </p>
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">
              <Clock size={10} className="inline mr-1" />
              Date
            </label>
            <input
              name="meetupDate"
              type="date"
              className="input-field"
              value={form.meetupDate}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">Time</label>
            <input
              name="meetupTime"
              type="time"
              className="input-field"
              value={form.meetupTime}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="label">
            <Coins size={10} className="inline mr-1" />
            Stake Amount (STRK each)
          </label>
          <input
            name="stakeAmount"
            type="number"
            className="input-field"
            placeholder="1"
            value={form.stakeAmount}
            onChange={handleChange}
            step="0.1"
            min="0.1"
          />
          <p className="font-mono text-xs text-wire mt-1">
            Total locked: {(parseFloat(form.stakeAmount || '0') * 2).toFixed(2)} STRK
          </p>
        </div>

        {/* Counterpart */}
        <div>
          <label className="label">
            <User size={10} className="inline mr-1" />
            Counterpart Address
          </label>
          <input
            name="counterpart"
            className="input-field"
            placeholder="0x04..."
            value={form.counterpart}
            onChange={handleChange}
          />
          <p className="font-mono text-xs text-wire mt-1">
            No push notification is sent yet. You will share the meetup link manually after creation.
          </p>
        </div>

        {/* Summary box */}
        {form.title && form.lat && form.stakeAmount && (
          <div className="bg-amber-500/5 border border-amber-500/20 p-4">
            <p className="font-mono text-xs text-amber-400 tracking-wider uppercase mb-3">Summary</p>
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-fade">You stake now</span>
                <span className="text-chalk">{form.stakeAmount} STRK</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-fade">Counterpart stakes</span>
                <span className="text-chalk">{form.stakeAmount} STRK</span>
              </div>
              <div className="flex justify-between font-mono text-xs border-t border-amber-500/20 pt-1.5 mt-1.5">
                <span className="text-fade">Total at stake</span>
                <span className="text-amber-400 font-bold">
                  {(parseFloat(form.stakeAmount || '0') * 2).toFixed(2)} STRK
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {(error || status === 'error') && (
          <div className="flex items-start gap-2 bg-danger/5 border border-danger/30 p-3">
            <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-danger">{error || 'Transaction failed'}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={status === 'loading'}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Staking & Creating...
            </>
          ) : (
            <>
              <Coins size={14} />
              Stake & Create Meetup
            </>
          )}
        </button>
      </div>
    </div>
  );
}
