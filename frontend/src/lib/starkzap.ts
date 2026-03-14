import type { WalletInterface } from 'starkzap';
import { TRUSTMEET_ADDRESS, STRK_ADDRESS } from './contract';

let starkzapSDKPromise: Promise<unknown> | null = null;

// Lazy-load Starkzap only on the client when Cartridge connection is requested.
export async function getStarkzapSDK() {
  if (!starkzapSDKPromise) {
    starkzapSDKPromise = import('starkzap').then(({ StarkZap }) => new StarkZap({ network: 'sepolia' }));
  }

  return starkzapSDKPromise as Promise<{
    connectCartridge: (options: {
      policies: Array<{ target: string; method: string }>;
      feeMode: 'sponsored';
    }) => Promise<WalletInterface>;
  }>;
}

// Policies define which contract methods are eligible for gas sponsorship
// Users approve these once during Cartridge onboarding, then all calls are gasless
export const TRUSTMEET_POLICIES = [
  { target: TRUSTMEET_ADDRESS, method: 'create_meetup' },
  { target: TRUSTMEET_ADDRESS, method: 'join_meetup' },
  { target: TRUSTMEET_ADDRESS, method: 'checkin' },
  { target: TRUSTMEET_ADDRESS, method: 'finalize_meetup' },
  { target: STRK_ADDRESS, method: 'approve' },
];
