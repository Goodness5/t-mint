'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle, XCircle, Copy, ArrowLeft, History, RefreshCw } from 'lucide-react';
import { useStarknetWallet } from '@/lib/use-starknet-wallet';
import { stringToFelt, addressToContractAddress, CONTRACT_ADDRESS } from '@/lib/wallet-utils';
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
    console.log('Wallet connected:', walletAddress);
  };

  const handleWalletDisconnected = () => {
    setContractStatus('unknown');
  };

  const handleGenerateCode = async () => {
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
      const codeFelt = stringToFelt(claimCode);
      
      // Convert amount to u256
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const amountU256 = {
        low: amountWei,
        high: '0'
      };

      // Call the generate_claim_code function using invoke method
      console.log('🔍 Admin: Calling generate_claim_code with:');
      console.log('  - Original code:', claimCode);
      console.log('  - Code felt252:', codeFelt);
      console.log('  - Amount U256:', amountU256);
      console.log('  - Function name: generate_claim_code');
      console.log('  - Parameters array:', [codeFelt, amountU256]);
      console.log('  - Contract address:', contract.address);
      
      const result = await contract.invoke('generate_claim_code', [codeFelt, amountU256]);
      console.log('🔍 Admin: Generate result:', result);
      console.log('🔍 Admin: Transaction hash:', result.transaction_hash);
      console.log('🔍 Admin: Full transaction details:', JSON.stringify(result, null, 2));
      
      // Test if the code was actually created by checking it
      console.log('🔍 Admin: Testing if code was created...');
      try {
        const codeInfo = await contract.get_claim_code_info(codeFelt);
        console.log('🔍 Admin: Code info after generation:', codeInfo);
        const isUsed = await contract.is_code_used(codeFelt);
        console.log('🔍 Admin: Code is used after generation:', isUsed);
      } catch (error) {
        console.error('🔍 Admin: Error checking generated code:', error);
      }

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
      
    } catch (error: any) {
      console.error('Generate code failed:', error);
      setAdminStatus({ 
        type: 'error', 
        message: (error as any).message || 'Failed to generate claim code!' 
      });
      setFunnyText("Even admins have bad days... but we'll fix this!");
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

        const isAdminResult = await contract.is_admin(addressToContractAddress(accountAddress));
        console.log('🔍 DEBUG: is_admin result:', isAdminResult);
        
        if (isAdminResult) {
          setAdminStatus({ 
            type: 'success', 
            message: 'Admin privileges confirmed! You can generate claim codes.' 
          });
        } else {
          setAdminStatus({ 
            type: 'error', 
            message: 'You are not an admin. Contact the contract owner to get admin privileges.' 
          });
        }
      } catch (error: any) {
        console.error('Admin check failed:', error);
        setAdminStatus({ 
          type: 'error', 
          message: `Admin check failed: ${error.message}` 
        });
      }
    } catch (error: any) {
      console.error('Contract connection failed:', error);
      setContractStatus('error');
      setAdminStatus({ 
        type: 'error', 
        message: `Contract connection failed: ${error.message}` 
      });
    } finally {
      setIsCheckingAdmin(false);
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

          {/* Status Display */}
          {adminStatus.type !== 'idle' && (
            <div className="mb-8 p-4 rounded-lg border flex items-center gap-3">
              {adminStatus.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              {adminStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {adminStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              <span className={cn(
                "font-medium",
                adminStatus.type === 'loading' && "text-blue-700 dark:text-blue-300",
                adminStatus.type === 'success' && "text-green-700 dark:text-green-300",
                adminStatus.type === 'error' && "text-red-700 dark:text-red-300"
              )}>
                {adminStatus.message}
              </span>
            </div>
          )}

          {/* Admin Forms */}
          <div className="space-y-8">
            {/* Code Generation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Generate Claim Code</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    STRK Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount of STRK tokens..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={handleGenerateCode}
                  disabled={adminStatus.type === 'loading'}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl",
                    adminStatus.type === 'loading' && "animate-pulse"
                  )}
                >
                  {adminStatus.type === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  <span>
                    {adminStatus.type === 'loading' ? 'Generating...' : 'Generate Random Code'}
                  </span>
                </button>
              </div>
            </div>

            {/* Generated Codes History */}
            {generatedCodes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Generated Codes ({generatedCodes.length})
                  </h3>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {generatedCodes.map((codeData) => (
                    <div key={codeData.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                            {codeData.code}
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-full">
                            {codeData.amount} STRK
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {codeData.timestamp.toLocaleString()}
                          {codeData.txHash && (
                            <span className="ml-2 font-mono">
                              TX: {codeData.txHash.slice(0, 8)}...{codeData.txHash.slice(-8)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(codeData.code)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Contract Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Contract Address
                    </p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-300">
                      {CONTRACT_ADDRESS}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      contractStatus === 'connected' && "bg-green-500",
                      contractStatus === 'error' && "bg-red-500",
                      contractStatus === 'unknown' && "bg-gray-400"
                    )}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {contractStatus === 'connected' && 'Connected'}
                      {contractStatus === 'error' && 'Error'}
                      {contractStatus === 'unknown' && 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Connected Wallet
                    </p>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-300">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
