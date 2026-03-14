'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { WalletInterface } from 'starkzap';
import { getStarkzapSDK, TRUSTMEET_POLICIES } from '@/lib/starkzap';

interface StarkzapContextType {
  wallet: WalletInterface | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectCartridge: () => Promise<void>;
  disconnectCartridge: () => Promise<void>;
}

const StarkzapContext = createContext<StarkzapContextType | null>(null);

export function StarkzapProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectCartridge = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const starkzapSDK = await getStarkzapSDK();
      const w = await starkzapSDK.connectCartridge({
        policies: TRUSTMEET_POLICIES,
        feeMode: 'sponsored',
      });
      setWallet(w);
      setAddress(w.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Cartridge');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectCartridge = useCallback(async () => {
    if (wallet) {
      await wallet.disconnect();
    }
    setWallet(null);
    setAddress(null);
  }, [wallet]);

  return (
    <StarkzapContext.Provider
      value={{
        wallet,
        address,
        isConnected: !!wallet,
        isConnecting,
        error,
        connectCartridge,
        disconnectCartridge,
      }}
    >
      {children}
    </StarkzapContext.Provider>
  );
}

export function useStarkzap() {
  const ctx = useContext(StarkzapContext);
  if (!ctx) throw new Error('useStarkzap must be used inside StarkzapProvider');
  return ctx;
}
