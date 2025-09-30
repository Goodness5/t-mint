'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Loader2, CheckCircle, XCircle, Copy, ArrowLeft, History, RefreshCw } from 'lucide-react';
import { useStarknetWallet } from '@/lib/use-starknet-wallet';
import { stringToFelt252, addressToContractAddress, CONTRACT_ADDRESS } from '@/lib/wallet';
import { getRandomFunnyText } from '@/lib/utils';
import { cn } from '@/lib/utils';
import WalletButton from '@/components/WalletButton';
import Link from 'next/link';
import ErrorBoundary from '@/components/ErrorBoundary';

interface AdminStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txHash?: string;
}

interface GeneratedCode {
  id: string;
  code: string;
  amount: string;
  timestamp: Date;
  txHash?: string;
}

export default function AdminPage() {
  const { account, address, isConnected, getContract } = useStarknetWallet();
  const [amount, setAmount] = useState('100');
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ type: 'idle', message: '' });
  const [funnyText, setFunnyText] = useState('');
  
  // Code generation history
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Admin management states
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [contractStatus, setContractStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    // Set initial funny text on client side only
    setFunnyText(getRandomFunnyText('adminWelcome'));
    
    // Load generated codes from localStorage
    const savedCodes = localStorage.getItem('generatedCodes');
    if (savedCodes) {
      try {
        const parsed = JSON.parse(savedCodes);
        setGeneratedCodes(parsed.map((code: any) => ({
          ...code,
          timestamp: new Date(code.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load saved codes:', error);
      }
    }
  }, []);

  // Generate random claim code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check admin status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkAdminStatus();
    }
  }, [isConnected, address]);

  const handleWalletConnected = (walletAddress: string) => {
    // Wallet state is now managed by the hook
    console.log('Wallet connected:', walletAddress);
  };

  const handleWalletDisconnected = () => {
    // Wallet state is now managed by the hook
    setContractStatus('unknown');
  };

  const handleGenerateCode = async () => {
    // Prevent multiple simultaneous calls
    if (adminStatus.type === 'loading') {
      return;
    }

    if (!amount.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter an amount!' });
      return;
    }

    if (!account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setAdminStatus({ type: 'error', message: 'Please enter a valid amount!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Generating claim code...' });
    setFunnyText("Creating digital magic...");

    try {
      const contract = getContract();
      if (!contract) {
        setAdminStatus({ type: 'error', message: 'Failed to create contract instance!' });
        return;
      }
      
      // Generate random claim code
      const claimCode = generateRandomCode();
      
      // Convert claim code to felt252
      const codeFelt = stringToFelt252(claimCode);
      
      // Convert amount to u256 (simplified to prevent browser hanging)
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const amountU256 = {
        low: amountWei,
        high: '0'
      };

      // Call the generate_claim_code function
      const result = await contract.generate_claim_code(codeFelt, amountU256);
      
      // Add to generated codes history
      const newCode: GeneratedCode = {
        id: Date.now().toString(),
        code: claimCode,
        amount: amount,
        timestamp: new Date(),
        txHash: result.transaction_hash
      };
      
      const updatedCodes = [newCode, ...generatedCodes];
      setGeneratedCodes(updatedCodes);
      
      // Save to localStorage
      localStorage.setItem('generatedCodes', JSON.stringify(updatedCodes));
      
      setAdminStatus({ 
        type: 'success', 
        message: `Claim code "${claimCode}" generated successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Another happy user incoming!");
      
      // Reset form
      setAmount('');
      
    } catch (error: any) {
      console.error('Generate code failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: (error as any).message || 'Failed to generate claim code!' 
      });
      setFunnyText("Even admins have bad days... but we'll fix this!");
    }
  };

  const handleAddAdmin = async () => {
    // Prevent multiple simultaneous calls
    if (adminStatus.type === 'loading') {
      return;
    }

    if (!newAdminAddress.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter an admin address!' });
      return;
    }

    if (!account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Adding admin...' });
    setFunnyText("Granting admin powers...");

    try {
      const contract = getContract();
      if (!contract) {
        setAdminStatus({ type: 'error', message: 'Failed to create contract instance!' });
        return;
      }
      
      // Call the add_admin function
      const result = await contract.add_admin(addressToContractAddress(newAdminAddress));
      
      setAdminStatus({ 
        type: 'success', 
        message: `Admin ${newAdminAddress.slice(0, 6)}...${newAdminAddress.slice(-4)} added successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Another admin joins the team!");
      
      // Reset form
      setNewAdminAddress('');
      
    } catch (error: any) {
      console.error('Add admin failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: (error as any).message || 'Failed to add admin!' 
      });
      setFunnyText("Admin addition failed... but we'll fix this!");
    }
  };


  // Utility functions
  const generateRandomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateBatchCodes = (count: number): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(generateRandomCode());
    }
    return codes;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllCodes = () => {
    const allCodes = generatedCodes.join('\n');
    copyToClipboard(allCodes);
    setAdminStatus({ 
      type: 'success', 
      message: `Copied ${generatedCodes.length} codes to clipboard!` 
    });
  };

  // Admin status check function
  const checkAdminStatus = async () => {
    if (!account) {
      return;
    }

    setIsCheckingAdmin(true);
    try {
      const contract = getContract();
      if (!contract) {
        setAdminStatus({ type: 'error', message: 'Failed to create contract instance!' });
        return;
      }
      setContractStatus('connected');
      
      const accountAddress = account.address;
      
      try {
        console.log('🔍 DEBUG: About to call is_admin with address:', accountAddress);
        console.log('🔍 DEBUG: Contract address being used:', CONTRACT_ADDRESS);
        console.log('🔍 DEBUG: Contract object:', contract);
        
        // Try using callStatic for view functions
        const cleanedAddress = addressToContractAddress(accountAddress);
        console.log("cleanedAddress", cleanedAddress)
        const isCurrentUserAdmin = await contract.callStatic.is_admin(cleanedAddress);
        console.log("isCurrentUserAdmin", isCurrentUserAdmin)
        
        console.log('🔍 DEBUG: Raw response from is_admin:', isCurrentUserAdmin);
        console.log('🔍 DEBUG: Response type:', typeof isCurrentUserAdmin);
        console.log('🔍 DEBUG: Response constructor:', isCurrentUserAdmin?.constructor?.name);
        console.log('🔍 DEBUG: Response keys:', Object.keys(isCurrentUserAdmin || {}));
        console.log('🔍 DEBUG: Response values:', Object.values(isCurrentUserAdmin || {}));
        console.log('🔍 DEBUG: Is response an array?', Array.isArray(isCurrentUserAdmin));
        console.log('🔍 DEBUG: Response stringified:', JSON.stringify(isCurrentUserAdmin, null, 2));
        
        // Handle the core::bool enum response
        let isAdmin = false;
        if (isCurrentUserAdmin && typeof isCurrentUserAdmin === 'object') {
          if ('variant' in isCurrentUserAdmin) {
            isAdmin = isCurrentUserAdmin.variant === 'True';
            console.log('🔍 DEBUG: Found variant property:', isCurrentUserAdmin.variant);
          } else if (Array.isArray(isCurrentUserAdmin) && isCurrentUserAdmin.length > 0) {
            // Handle array response
            isAdmin = isCurrentUserAdmin[0] === 'True' || isCurrentUserAdmin[0] === true;
            console.log('🔍 DEBUG: Found array response:', isCurrentUserAdmin);
          } else {
            // Try to extract boolean from other possible structures
            console.log('🔍 DEBUG: No variant found, trying other approaches...');
            isAdmin = Boolean(isCurrentUserAdmin);
          }
        } else {
          console.log('🔍 DEBUG: Response is not an object, treating as boolean:', isCurrentUserAdmin);
          isAdmin = Boolean(isCurrentUserAdmin);
        }
        
        console.log('🔍 DEBUG: Final isAdmin value:', isAdmin);
        
        if (isAdmin) {
          setAdminStatus({ 
            type: 'success', 
            message: 'Admin status verified! You have admin privileges.' 
          });
        } else {
          setAdminStatus({ 
            type: 'error', 
            message: 'You are not an admin. Only admins can access this panel.' 
          });
        }
      } catch (contractError) {
        console.error('Contract call failed:', contractError);
        setContractStatus('error');
        setAdminStatus({ 
          type: 'error', 
          message: `Contract call failed: ${(contractError as any).message || 'Unknown error'}` 
        });
      }
      
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setContractStatus('error');
      setAdminStatus({ 
        type: 'error', 
        message: `Failed to connect to contract: ${(error as any).message || 'Unknown error'}` 
      });
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdminAddress.trim()) {
      setAdminStatus({ type: 'error', message: 'Please enter an admin address to remove!' });
      return;
    }

    if (!account) {
      setAdminStatus({ type: 'error', message: 'Please connect your wallet first!' });
      return;
    }

    // Prevent multiple simultaneous calls
    if (adminStatus.type === 'loading') {
      return;
    }

    setAdminStatus({ type: 'loading', message: 'Removing admin...' });
    setFunnyText("Revoking admin powers...");

    try {
      const contract = getContract();
      if (!contract) {
        setAdminStatus({ type: 'error', message: 'Failed to create contract instance!' });
        return;
      }
      const result = await contract.remove_admin(addressToContractAddress(removeAdminAddress));
      
      setAdminStatus({ 
        type: 'success', 
        message: `Admin ${removeAdminAddress.slice(0, 6)}...${removeAdminAddress.slice(-4)} removed successfully!`,
        txHash: result.transaction_hash 
      });
      setFunnyText("Admin powers revoked!");
      
      // Reset form
      setRemoveAdminAddress('');
      
    } catch (error: any) {
      console.error('Remove admin failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: error.message || 'Failed to remove admin!' 
      });
      setFunnyText("Admin removal failed... but we'll fix this!");
    }
  };

  // Function to copy a single code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setAdminStatus({ 
        type: 'success', 
        message: `Code "${code}" copied to clipboard!` 
      });
    } catch (error) {
      setAdminStatus({ 
        type: 'error', 
        message: 'Failed to copy code to clipboard!' 
      });
    }
  };


  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="w-full p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                T-Mint Admin
              </h1>
            </Link>
          </div>
          <WalletButton 
            onWalletConnected={handleWalletConnected}
            onWalletDisconnected={handleWalletDisconnected}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Control Panel
          </h2>
          {funnyText && (
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {funnyText}
            </p>
          )}
        </div>

        {/* Admin Forms */}
        <div className="space-y-8">
          {/* Quick Generation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Generation</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="quickAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  STRK Amount (per code)
                </label>
                <input
                  id="quickAmount"
                  type="number"
                  step="0.000001"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  placeholder="Enter amount of STRK per code..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleQuickGenerate}
                  disabled={isGenerating || !batchAmount.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span>
                    {isGenerating ? 'Generating...' : 'Generate 1 Code'}
                  </span>
                </button>

                <button
                  onClick={handleBatchGenerate}
                  disabled={isGenerating || !batchAmount.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span>
                    {isGenerating ? 'Generating...' : `Generate ${batchCount} Codes`}
                  </span>
                </button>
              </div>

              <div>
                <label htmlFor="batchCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Count (1-50)
                </label>
                <input
                  id="batchCount"
                  type="number"
                  min="1"
                  max="50"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Generated Codes Display */}
          {generatedCodes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generated Codes ({generatedCodes.length})
                </h3>
                <button
                  onClick={copyAllCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy All</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{code}</span>
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Copy code"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Generation (Legacy) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Manual Generation</h3>
            <div className="space-y-6">
            <div>
              <label htmlFor="adminClaimCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Claim Code
              </label>
              <input
                id="adminClaimCode"
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Enter a custom claim code..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label htmlFor="adminAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                STRK Amount
              </label>
              <input
                id="adminAmount"
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount of STRK to claim..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleGenerateCode}
              disabled={adminStatus.type === 'loading' || !claimCode.trim() || !amount.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                adminStatus.type === 'loading' && "animate-pulse"
              )}
            >
              {adminStatus.type === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>
                {adminStatus.type === 'loading' ? 'Generating...' : 'Generate Custom Code'}
              </span>
            </button>
            </div>
          </div>

          {/* Admin Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Status</h3>
              <button
                onClick={checkAdminStatus}
                disabled={isCheckingAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                {isCheckingAdmin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>🔄</span>
                )}
                <span>Check Status</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Connected Wallet
                    </p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-300">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-4 border rounded-lg",
                contractStatus === 'connected' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                contractStatus === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                contractStatus === 'unknown' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    contractStatus === 'connected' && "bg-green-500",
                    contractStatus === 'error' && "bg-red-500",
                    contractStatus === 'unknown' && "bg-yellow-500"
                  )}></div>
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      contractStatus === 'connected' && "text-green-800 dark:text-green-200",
                      contractStatus === 'error' && "text-red-800 dark:text-red-200",
                      contractStatus === 'unknown' && "text-yellow-800 dark:text-yellow-200"
                    )}>
                      Contract Status
                    </p>
                    <p className={cn(
                      "text-xs",
                      contractStatus === 'connected' && "text-green-600 dark:text-green-300",
                      contractStatus === 'error' && "text-red-600 dark:text-red-300",
                      contractStatus === 'unknown' && "text-yellow-600 dark:text-yellow-300"
                    )}>
                      {contractStatus === 'connected' && 'Connected to contract'}
                      {contractStatus === 'error' && 'Contract connection failed'}
                      {contractStatus === 'unknown' && 'Contract status unknown'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>• Admin status is verified when you connect your wallet</p>
                <p>• Only verified admins can generate claim codes and manage other admins</p>
                <p>• Use the contract functions below to add or remove admin privileges</p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  • Make sure to set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment variables
                </p>
              </div>
            </div>
          </div>

          {/* Add New Admin */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Admin</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="newAdminAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Address
                </label>
                <input
                  id="newAdminAddress"
                  type="text"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  placeholder="Enter new admin wallet address..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleAddAdmin}
                disabled={adminStatus.type === 'loading' || !newAdminAddress.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                  adminStatus.type === 'loading' && "animate-pulse"
                )}
              >
                {adminStatus.type === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                <span>
                  {adminStatus.type === 'loading' ? 'Adding...' : 'Add Admin'}
                </span>
              </button>
            </div>
          </div>

          {/* Remove Admin */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Remove Admin</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="removeAdminAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Address
                </label>
                <input
                  id="removeAdminAddress"
                  type="text"
                  value={removeAdminAddress}
                  onChange={(e) => setRemoveAdminAddress(e.target.value)}
                  placeholder="Enter admin wallet address to remove..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleRemoveAdmin}
                disabled={adminStatus.type === 'loading' || !removeAdminAddress.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                  adminStatus.type === 'loading' && "animate-pulse"
                )}
              >
                {adminStatus.type === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span>
                  {adminStatus.type === 'loading' ? 'Removing...' : 'Remove Admin'}
                </span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {adminStatus.type !== 'idle' && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              adminStatus.type === 'success' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
              adminStatus.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
              adminStatus.type === 'loading' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}>
              {adminStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
              {adminStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
              {adminStatus.type === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5" />}
              
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  adminStatus.type === 'success' && "text-green-700 dark:text-green-300",
                  adminStatus.type === 'error' && "text-red-700 dark:text-red-300",
                  adminStatus.type === 'loading' && "text-blue-700 dark:text-blue-300"
                )}>
                  {adminStatus.message}
                </p>
                {adminStatus.txHash && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                        {adminStatus.txHash.slice(0, 10)}...{adminStatus.txHash.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(adminStatus.txHash!)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Copy transaction hash"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Info Box */}
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
              Admin Instructions:
            </h3>
            <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
              <li>• <strong>Quick Generation:</strong> Set amount and click to generate random codes</li>
              <li>• <strong>Batch Generation:</strong> Generate up to 50 codes at once</li>
              <li>• <strong>Manual Generation:</strong> Create custom claim codes</li>
              <li>• <strong>Admin Management:</strong> Add or remove admin privileges by address</li>
              <li>• <strong>Admin Status:</strong> Check if your connected wallet has admin privileges</li>
              <li>• Each code can only be used once</li>
              <li>• Users will pay their own gas fees</li>
              <li>• Keep this URL secret from regular users</li>
            </ul>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Security Notice:
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            This admin panel is hidden from regular users. Only share the main claim portal URL with users. 
            Keep this admin URL secure and only accessible to authorized administrators.
          </p>
        </div>
      </main>
      </div>
    </ErrorBoundary>
  );
}