'use client';

import { useState, useEffect } from 'react';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';  
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';
import WalletModal from './WalletModal';

interface WalletButtonProps {
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: () => void;
  className?: string;
}

export default function WalletButton({ 
  onWalletConnected, 
  onWalletDisconnected, 
  className 
}: WalletButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [funnyText, setFunnyText] = useState('');

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // Set initial funny text on client side only
    setFunnyText(getRandomFunnyText('welcome'));
  }, []);

  useEffect(() => {
    // Handle wallet connection status changes
    if (isConnected && address) {
      onWalletConnected?.(address);
    } else if (!isConnected) {
      onWalletDisconnected?.();
    }
  }, [isConnected, address, onWalletConnected, onWalletDisconnected]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setFunnyText(getRandomFunnyText('welcome'));
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {formatAddress(address)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <button
          onClick={handleOpenModal}
          disabled={status === 'connecting'}
          className={cn(
            "flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
            status === 'connecting' && "animate-pulse"
          )}
        >
          {status === 'connecting' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Wallet className="w-5 h-5" />
          )}
          <span>
            {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </span>
        </button>
        
        {funnyText && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs mx-auto">
            {funnyText}
          </p>
        )}
      </div>

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
