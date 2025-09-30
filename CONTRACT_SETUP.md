# Contract Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0
NEXT_PUBLIC_NETWORK=mainnet-alpha
```

## Important Notes

1. **Replace `0x0`** with your actual deployed contract address
2. **Make sure your contract is deployed** on the correct network
3. **The contract must have the following functions:**
   - `claim_tokens(code: felt252)` - for users to claim tokens
   - `generate_claim_code(code: felt252, amount: u256)` - for admins to generate codes
   - `is_admin(address: ContractAddress)` - to check admin status

## Troubleshooting

- If you get "Failed to create contract instance", check your contract address
- If you get "multicall failed", make sure your contract is properly deployed
- If Braavos wallet doesn't work, try refreshing the page or clearing browser cache

## Testing

1. Deploy your contract to Starknet mainnet or testnet
2. Set the contract address in `.env.local`
3. Connect your wallet (Argent X, Braavos, or OKX)
4. Try generating a claim code in the admin panel
5. Try claiming tokens with the generated code
