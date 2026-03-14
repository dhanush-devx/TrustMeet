'use client';

import { sepolia } from '@starknet-react/chains';
import {
  StarknetConfig,
  argent,
  braavos,
  useInjectedConnectors,
  voyager,
} from '@starknet-react/core';
import { RpcProvider } from 'starknet';
import React from 'react';
import { StarkzapProvider } from '@/context/StarkzapContext';

function RpcProviderFactory() {
  return new RpcProvider({
    nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/ax-xhXkQU33M8x12hgusX',
  });
}

function StarknetConfigWrapper({ children }: { children: React.ReactNode }) {
  const { connectors: injectedConnectors } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: 'onlyIfNoConnectors',
    order: 'random',
  });

  const connectors = injectedConnectors.filter((connector) => {
    const value = `${connector.id} ${connector.name}`.toLowerCase();
    return value.includes('argent') || value.includes('braavos');
  });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={RpcProviderFactory}
      connectors={connectors}
      explorer={voyager}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarkzapProvider>
      <StarknetConfigWrapper>{children}</StarknetConfigWrapper>
    </StarkzapProvider>
  );
}
