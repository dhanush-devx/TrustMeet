'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { useState } from 'react';
import { Wallet, X, ChevronDown, Plus, LayoutDashboard, Zap } from 'lucide-react';
import { truncateAddress } from '@/lib/meetup';
import { useStarkzap } from '@/context/StarkzapContext';

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    address: cartridgeAddress,
    isConnected: cartridgeConnected,
    isConnecting: cartridgeConnecting,
    connectCartridge,
    disconnectCartridge,
  } = useStarkzap();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  const anyConnected = isConnected || cartridgeConnected;
  const displayAddress = cartridgeConnected ? cartridgeAddress : address;

  return (
    <nav className="border-b border-zinc-800 bg-carbon/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-amber-500 flex items-center justify-center">
            <span className="text-ink font-display text-sm">T</span>
          </div>
          <span className="font-display text-xl tracking-widest text-snow group-hover:text-amber-400 transition-colors">
            TRUSTMEET
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors ${
              pathname === '/'
                ? 'text-amber-400'
                : 'text-fade hover:text-snow'
            }`}
          >
            <LayoutDashboard size={12} />
            Dashboard
          </Link>
          <Link
            href="/create"
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors ${
              pathname === '/create'
                ? 'text-amber-400'
                : 'text-fade hover:text-snow'
            }`}
          >
            <Plus size={12} />
            New Meetup
          </Link>
        </div>

        {/* Wallet */}
        <div className="relative">
          {anyConnected && displayAddress ? (
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="flex items-center gap-2 border border-zinc-700 px-3 py-1.5 hover:border-amber-500/50 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              <span className="font-mono text-xs text-chalk">{truncateAddress(displayAddress)}</span>
              {cartridgeConnected && <Zap size={11} className="text-amber-400" />}
              <ChevronDown size={12} className="text-fade" />
            </button>
          ) : (
            <button
              onClick={() => setShowConnectors(!showConnectors)}
              className="btn-primary flex items-center gap-2 py-2"
            >
              <Wallet size={13} />
              Connect
            </button>
          )}

          {/* Wallet dropdown */}
          {showWalletMenu && anyConnected && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-carbon border border-zinc-700 shadow-xl z-50 animate-slide-up">
              <div className="p-3 border-b border-zinc-800">
                <p className="font-mono text-xs text-fade uppercase tracking-wider">
                  {cartridgeConnected ? 'Cartridge · Gasless' : 'Connected'}
                </p>
                <p className="font-mono text-sm text-snow mt-0.5 break-all">{truncateAddress(displayAddress!)}</p>
              </div>
              <button
                onClick={() => {
                  cartridgeConnected ? disconnectCartridge() : disconnect();
                  setShowWalletMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-danger hover:bg-ash font-mono text-xs uppercase tracking-wider transition-colors"
              >
                <X size={12} />
                Disconnect
              </button>
            </div>
          )}

          {/* Connector selection */}
          {showConnectors && !anyConnected && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-carbon border border-zinc-700 shadow-xl z-50 animate-slide-up">
              <div className="p-3 border-b border-zinc-800">
                <p className="font-mono text-xs text-fade uppercase tracking-wider">Select wallet</p>
              </div>
              {/* Cartridge — social login + gasless */}
              <button
                onClick={() => { connectCartridge(); setShowConnectors(false); }}
                disabled={cartridgeConnecting}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-ash font-mono text-xs text-amber-400 uppercase tracking-wider transition-colors border-b border-zinc-800"
              >
                <Zap size={12} />
                {cartridgeConnecting ? 'Connecting...' : 'Cartridge (Gasless)'}
              </button>
              {/* Injected wallets — Argent X, Braavos */}
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => { connect({ connector }); setShowConnectors(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-ash font-mono text-xs text-chalk uppercase tracking-wider transition-colors"
                >
                  <Wallet size={12} />
                  {connector.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
