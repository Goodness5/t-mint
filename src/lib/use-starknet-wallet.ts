'use client';

import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { Contract } from 'starknet';
import fullAbi from './abi.json';

export function useStarknetWallet() {
  const { account, address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Get contract instance using Starknet React
  // Note: We'll create the contract manually since the ABI format needs special handling
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0';

  const connectWallet = async (connector: any) => {
    try {
      await connect(connector);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  // Create contract instance when account is available
  const getContract = () => {
    console.log('🔍 Contract creation debug:');
    console.log('  - Account:', account);
    console.log('  - Contract Address:', contractAddress);
    console.log('  - ABI loaded:', !!fullAbi);
    console.log('  - ABI length:', fullAbi?.length || 'N/A');
    
    if (!account) {
      console.log('❌ No account available');
      return null;
    }
    
    if (contractAddress === '0x0') {
      console.log('❌ Contract address not set (still 0x0)');
      console.log('💡 Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file');
      return null;
    }
    
    try {
      const contract = new Contract(fullAbi, contractAddress, account);
      console.log('✅ Contract instance created successfully');
      return contract;
    } catch (error) {
      console.error('❌ Failed to create contract instance:', error);
      console.error('  - Error details:', error);
      return null;
    }
  };

  const contract = getContract();

  return {
    account,
    address,
    isConnected: status === 'connected',
    contract,
    getContract,
    connectWallet,
    disconnectWallet,
    connectors,
    status,
  };
}
