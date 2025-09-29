# T-Mint - STRK Token Claim Portal 🎉

A beautiful and user-friendly Starknet application for claiming STRK tokens with a calm design and funny texts!

## Features ✨

- 🔗 **Wallet Connection**: Connect with Starknet wallets (Argent, Braavos, etc.)
- 🎁 **Token Claiming**: Enter claim codes to receive STRK tokens
- 🛡️ **Admin Panel**: Generate claim codes for users (admin only)
- 💰 **Flexible Recipients**: Send tokens to connected wallet or custom address
- ⚡ **Gas Efficient**: Users pay their own gas fees
- 🎨 **Beautiful UI**: Calm design with gradient backgrounds and smooth animations
- 😄 **Funny Texts**: Random humorous messages throughout the app

## Tech Stack 🛠️

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Starknet, Cairo smart contracts
- **Wallet**: get-starknet for wallet integration
- **Icons**: Lucide React

## Smart Contract 📜

The application includes a Cairo smart contract (`contracts/token_claimer.cairo`) with:

- Admin functions to generate claim codes
- User functions to claim tokens
- One-time use claim codes
- Event logging for transparency

## Setup Instructions 🚀

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Starknet Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0
NEXT_PUBLIC_NETWORK=goerli-alpha

# For production, use:
# NEXT_PUBLIC_NETWORK=mainnet-alpha
```

### 3. Deploy Smart Contract

1. Install Starknet development tools
2. Compile the contract:
   ```bash
   starknet-compile contracts/token_claimer.cairo --output contracts/token_claimer.json
   ```
3. Deploy to your chosen network
4. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` with the deployed contract address

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## How It Works 🔄

### For Users:
1. Connect your Starknet wallet
2. Enter your claim code
3. Optionally specify a recipient address (defaults to connected wallet)
4. Pay gas fees and claim your STRK tokens!

### For Admins:
1. Navigate to the hidden admin URL: `/admin`
2. Connect your admin wallet
3. Generate claim codes with specific STRK amounts
4. Share codes with users

## Contract Functions 📋

### Admin Functions:
- `generate_claim_code(code: felt252, amount: felt252)`: Create a new claim code
- `change_admin(new_admin: felt252)`: Transfer admin privileges

### User Functions:
- `claim_tokens(code: felt252, recipient: felt252)`: Claim tokens with a code

### View Functions:
- `get_claim_code_info(code: felt252)`: Check code amount and usage status
- `is_code_used(code: felt252)`: Check if code has been used
- `get_total_claimed()`: Get total tokens claimed

## Security Features 🔒

- Only contract admin can generate claim codes
- Each claim code can only be used once
- Users maintain full control of their wallets
- No private key collection or storage
- Transparent on-chain transactions
- **Hidden admin panel** - Admin URL is not discoverable by regular users

## Funny Texts 😄

The app includes random humorous messages in various categories:
- Welcome messages
- Connection status
- Success/error messages
- Admin panel messages

## Contributing 🤝

Feel free to contribute to this project! Areas for improvement:
- Additional wallet support
- Enhanced UI/UX
- More funny texts
- Advanced admin features
- Analytics dashboard

## License 📄

This project is open source and available under the MIT License.

---

Built with ❤️ on Starknet • Powered by Cairo • Secured by Math
