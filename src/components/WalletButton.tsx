'use client';

import { useState, useEffect } from 'react';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { WalletManager, WalletState } from '@/lib/wallet';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface WalletButtonProps {
  onWalletConnected?: (walletState: WalletState) => void;
  onWalletDisconnected?: () => void;
  className?: string;
}

export default function WalletButton({ 
  onWalletConnected, 
  onWalletDisconnected, 
  className 
}: WalletButtonProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    account: null,
    address: null,
    isConnected: false,
    provider: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [funnyText, setFunnyText] = useState(getRandomFunnyText('welcome'));

  const walletManager = WalletManager.getInstance();

  useEffect(() => {
    // Check if wallet is already connected on mount
    walletManager.checkConnection().then((connected) => {
      if (connected) {
        const state = walletManager.getWalletState();
        setWalletState(state);
        onWalletConnected?.(state);
      }
    });
  }, [onWalletConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setFunnyText(getRandomFunnyText('connecting'));
    
    try {
      const newWalletState = await walletManager.connectWallet();
      setWalletState(newWalletState);
      onWalletConnected?.(newWalletState);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setFunnyText("Oops! Couldn't connect to your wallet. Try again? 🤔");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await walletManager.disconnectWallet();
      setWalletState({
        account: null,
        address: null,
        isConnected: false,
        provider: null,
      });
      onWalletDisconnected?.();
      setFunnyText(getRandomFunnyText('welcome'));
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {formatAddress(walletState.address)}
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
    <div className={cn("space-y-3", className)}>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={cn(
          "flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
          isConnecting && "animate-pulse"
        )}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Wallet className="w-5 h-5" />
        )}
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs mx-auto">
        {funnyText}
      </p>
    </div>
  );
}
