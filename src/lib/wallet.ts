import { Account, Contract, RpcProvider } from 'starknet';

export interface WalletState {
  account: Account | null;
  address: string | null;
  isConnected: boolean;
  provider: RpcProvider | null;
}

export class WalletManager {
  private static instance: WalletManager;
  private walletState: WalletState = {
    account: null,
    address: null,
    isConnected: false,
    provider: null,
  };

  private constructor() {}

  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  public async connectWallet(): Promise<WalletState> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection only available in browser');
      }

      // Check for available wallets
      const availableWallets = (window as any).starknet;
      
      if (!availableWallets) {
        throw new Error('No Starknet wallet found. Please install ArgentX or Braavos wallet.');
      }

      // Connect to the wallet
      await availableWallets.enable();
      
      if (!availableWallets.isConnected) {
        throw new Error('Failed to connect to wallet');
      }

      this.walletState = {
        account: availableWallets.account,
        address: availableWallets.account.address,
        isConnected: true,
        provider: availableWallets.provider,
      };

      return this.walletState;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  public async disconnectWallet(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && (window as any).starknet) {
        const wallet = (window as any).starknet;
        if (wallet.disconnect) {
          await wallet.disconnect();
        }
      }
      
      this.walletState = {
        account: null,
        address: null,
        isConnected: false,
        provider: null,
      };
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  public getWalletState(): WalletState {
    return { ...this.walletState };
  }

  public async checkConnection(): Promise<boolean> {
    try {
      // Check if window.starknet exists (browser environment)
      if (typeof window !== 'undefined' && (window as any).starknet) {
        const wallet = (window as any).starknet;
        if (wallet && wallet.isConnected) {
          this.walletState = {
            account: wallet.account,
            address: wallet.account.address,
            isConnected: true,
            provider: wallet.provider,
          };
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to check connection:', error);
      return false;
    }
  }
}

// Contract interaction utilities
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x05348ec08e351b057576a277776b630538bc1bdc2bd2f25caa92e4af47434f94';
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'mainnet-alpha';

export async function getContract(account: Account): Promise<Contract> {
  const contract = new Contract(
    [
      {
        type: "impl",
        name: "ClaimImpl",
        interface_name: "contracts::claim::ClaimContract::IClaim"
      },
      {
        type: "struct",
        name: "core::integer::u256",
        members: [
          {
            name: "low",
            type: "core::integer::u128"
          },
          {
            name: "high",
            type: "core::integer::u128"
          }
        ]
      },
      {
        type: "enum",
        name: "core::bool",
        variants: [
          {
            name: "False",
            type: "()"
          },
          {
            name: "True",
            type: "()"
          }
        ]
      },
      {
        type: "interface",
        name: "contracts::claim::ClaimContract::IClaim",
        items: [
          {
            type: "function",
            name: "generate_claim_code",
            inputs: [
              {
                name: "code",
                type: "core::felt252"
              },
              {
                name: "amount",
                type: "core::integer::u256"
              }
            ],
            outputs: [],
            state_mutability: "external"
          },
          {
            type: "function",
            name: "add_admin",
            inputs: [
              {
                name: "admin",
                type: "core::starknet::contract_address::ContractAddress"
              }
            ],
            outputs: [],
            state_mutability: "external"
          },
          {
            type: "function",
            name: "remove_admin",
            inputs: [
              {
                name: "admin",
                type: "core::starknet::contract_address::ContractAddress"
              }
            ],
            outputs: [],
            state_mutability: "external"
          },
          {
            type: "function",
            name: "claim_tokens",
            inputs: [
              {
                name: "code",
                type: "core::felt252"
              }
            ],
            outputs: [],
            state_mutability: "external"
          },
          {
            type: "function",
            name: "get_claim_code_info",
            inputs: [
              {
                name: "code",
                type: "core::felt252"
              }
            ],
            outputs: [
              {
                type: "(core::integer::u256, core::bool)"
              }
            ],
            state_mutability: "view"
          },
          {
            type: "function",
            name: "get_total_claimed",
            inputs: [],
            outputs: [
              {
                type: "core::integer::u256"
              }
            ],
            state_mutability: "view"
          },
          {
            type: "function",
            name: "is_code_used",
            inputs: [
              {
                name: "code",
                type: "core::felt252"
              }
            ],
            outputs: [
              {
                type: "core::bool"
              }
            ],
            state_mutability: "view"
          },
          {
            type: "function",
            name: "is_admin",
            inputs: [
              {
                name: "admin",
                type: "core::starknet::contract_address::ContractAddress"
              }
            ],
            outputs: [
              {
                type: "core::bool"
              }
            ],
            state_mutability: "view"
          }
        ]
      },
      {
        type: "constructor",
        name: "constructor",
        inputs: [
          {
            name: "admin_address",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ]
      },
      {
        type: "event",
        name: "contracts::claim::ClaimContract::ClaimCodeGenerated",
        kind: "struct",
        members: [
          {
            name: "code",
            type: "core::felt252",
            kind: "key"
          },
          {
            name: "amount",
            type: "core::integer::u256",
            kind: "data"
          }
        ]
      },
      {
        type: "event",
        name: "contracts::claim::ClaimContract::TokensClaimed",
        kind: "struct",
        members: [
          {
            name: "code",
            type: "core::felt252",
            kind: "key"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
            kind: "data"
          },
          {
            name: "amount",
            type: "core::integer::u256",
            kind: "data"
          }
        ]
      },
      {
        type: "event",
        name: "contracts::claim::ClaimContract::AdminAdded",
        kind: "struct",
        members: [
          {
            name: "admin",
            type: "core::starknet::contract_address::ContractAddress",
            kind: "data"
          },
          {
            name: "added_by",
            type: "core::starknet::contract_address::ContractAddress",
            kind: "data"
          }
        ]
      },
      {
        type: "event",
        name: "contracts::claim::ClaimContract::AdminRemoved",
        kind: "struct",
        members: [
          {
            name: "admin",
            type: "core::starknet::contract_address::ContractAddress",
            kind: "data"
          },
          {
            name: "removed_by",
            type: "core::starknet::contract_address::ContractAddress",
            kind: "data"
          }
        ]
      },
      {
        type: "event",
        name: "contracts::claim::ClaimContract::Event",
        kind: "enum",
        variants: [
          {
            name: "ClaimCodeGenerated",
            type: "contracts::claim::ClaimContract::ClaimCodeGenerated",
            kind: "nested"
          },
          {
            name: "TokensClaimed",
            type: "contracts::claim::ClaimContract::TokensClaimed",
            kind: "nested"
          },
          {
            name: "AdminAdded",
            type: "contracts::claim::ClaimContract::AdminAdded",
            kind: "nested"
          },
          {
            name: "AdminRemoved",
            type: "contracts::claim::ClaimContract::AdminRemoved",
            kind: "nested"
          }
        ]
      }
    ],
    CONTRACT_ADDRESS,
    account
  );

  return contract;
}

export function stringToFelt252(str: string): string {
  // Simple conversion - in production, you'd want a more robust solution
  return '0x' + Buffer.from(str).toString('hex');
}

export function felt252ToString(felt: string): string {
  // Simple conversion - in production, you'd want a more robust solution
  return Buffer.from(felt.slice(2), 'hex').toString();
}
