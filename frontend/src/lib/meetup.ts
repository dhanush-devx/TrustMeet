import { decodeCoords, formatCoords } from './gps';

export const STRK_DECIMALS = 18n;
export const STRK_UNIT = 10n ** STRK_DECIMALS;

export type MeetupStatus = 'pending' | 'active' | 'finalized';

export interface Meetup {
  id: number;
  title: string;
  creator: string;
  counterpart: string;
  lat: number;
  lng: number;
  meetupTime: Date;
  stakeAmount: bigint;
  status: MeetupStatus;
  creatorCheckedIn: boolean;
  counterpartCheckedIn: boolean;
  coordsDisplay: string;
}

type U256Like =
  | bigint
  | number
  | string
  | {
      low?: bigint | number | string;
      high?: bigint | number | string;
    };

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') return BigInt(value);
  throw new Error('Unsupported bigint value');
}

function parseU256(value: unknown): bigint {
  const v = value as U256Like;
  if (typeof v === 'object' && v !== null && ('low' in v || 'high' in v)) {
    const low = toBigInt(v.low ?? 0);
    const high = toBigInt(v.high ?? 0);
    return (high << 128n) + low;
  }
  return toBigInt(v);
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'bigint') return value !== 0n;
  return false;
}

export function normalizeAddress(value: unknown): string {
  if (typeof value === 'string') {
    if (value.startsWith('0x') || value.startsWith('0X')) {
      const normalizedHex = value.slice(2).toLowerCase().replace(/^0+/, '');
      return `0x${normalizedHex || '0'}`;
    }
    try {
      return `0x${BigInt(value).toString(16)}`;
    } catch {
      return value;
    }
  }

  if (typeof value === 'bigint' || typeof value === 'number') {
    return `0x${BigInt(value).toString(16)}`;
  }

  return String(value ?? '');
}

export function addressesEqual(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;
  return normalizeAddress(left) === normalizeAddress(right);
}

export function parseMeetupData(id: number, raw: Record<string, unknown>): Meetup {
  const latEncoded = BigInt(String(raw.lat));
  const lngEncoded = BigInt(String(raw.lng));
  const { lat, lng } = decodeCoords(latEncoded, lngEncoded);

  const statusNum = Number(raw.status);
  const statusMap: MeetupStatus[] = ['pending', 'active', 'finalized'];

  return {
    id,
    title: feltToString(String(raw.title)),
    creator: normalizeAddress(raw.creator),
    counterpart: normalizeAddress(raw.counterpart),
    lat,
    lng,
    meetupTime: new Date(Number(raw.meetup_time) * 1000),
    stakeAmount: parseU256(raw.stake_amount),
    status: statusMap[statusNum] ?? 'pending',
    creatorCheckedIn: parseBool(raw.creator_checked_in),
    counterpartCheckedIn: parseBool(raw.counterpart_checked_in),
    coordsDisplay: formatCoords(lat, lng),
  };
}

export function feltToString(felt: string): string {
  try {
    const hex = BigInt(felt).toString(16);
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return str.replace(/\0/g, '').trim() || `Meetup #${felt.slice(0, 6)}`;
  } catch {
    return 'Meetup';
  }
}

export function stringToFelt(str: string): bigint {
  if (!str) return 0n;
  const trimmed = str.slice(0, 31);
  let result = 0n;
  for (let i = 0; i < trimmed.length; i++) {
    result = result * 256n + BigInt(trimmed.charCodeAt(i));
  }
  return result;
}

export function formatStrk(amount: bigint, decimals = 4): string {
  const whole = amount / STRK_UNIT;
  const frac = amount % STRK_UNIT;
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals);
  return `${whole}.${fracStr} STRK`;
}

export function parseStrk(amount: string): bigint {
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = frac.slice(0, 18).padEnd(18, '0');
  return BigInt(whole || '0') * STRK_UNIT + BigInt(fracPadded);
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getMeetupStatusLabel(meetup: Meetup, userAddress?: string): string {
  if (meetup.status === 'finalized') return 'Finalized';
  if (meetup.status === 'pending') {
    const isCreator = addressesEqual(userAddress, meetup.creator);
    return isCreator ? 'Awaiting counterpart' : 'Stake to join';
  }
  const now = new Date();
  if (meetup.meetupTime > now) {
    const diff = meetup.meetupTime.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `In ${hours}h ${minutes}m`;
    return `In ${minutes}m`;
  }
  return 'Check in now';
}

export function getMeetupStatusColor(status: MeetupStatus): string {
  switch (status) {
    case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'active': return 'text-safe bg-safe/10 border-safe/30';
    case 'finalized': return 'text-fade bg-zinc/20 border-zinc';
  }
}
