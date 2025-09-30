'use client';

import { ReactNode } from 'react';
import { StarknetConfig, publicProvider } from '@starknet-react/core';
import { mainnet, sepolia } from '@starknet-react/chains';
import { argent, braavos, ready } from '@starknet-react/core';

// Configure the Starknet provider with reliable RPC endpoints
export function StarknetProvider({ children }: { children: ReactNode }) {
  const chains = [mainnet, sepolia];
  
  // Use public provider with fallback RPC endpoints
  const provider = publicProvider();

  return (
    <StarknetConfig
      chains={chains}
      provider={provider}
      connectors={[
        argent(),
        braavos(),
        ready(),
      ]}
    >
      {children}
    </StarknetConfig>
  );
}
