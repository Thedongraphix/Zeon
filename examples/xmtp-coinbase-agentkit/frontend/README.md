# XMTP Crypto Agent Frontend

A sleek, modern frontend for your XMTP crypto agent built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern UI with blue and black color scheme
- 🔐 Wallet connection via Privy
- 💬 Real-time chat interface with XMTP agent
- 📱 Responsive design for all devices
- ⚡ Fast and smooth animations
- 🔧 TypeScript support

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   yarn install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Update the following variables in `.env.local`:
   - `REACT_APP_PRIVY_APP_ID`: Your Privy app ID
   - `REACT_APP_ALCHEMY_API_KEY`: Your Alchemy API key (optional)
   - `REACT_APP_API_URL`: Your backend API URL

3. **Start the development server:**
   ```bash
   yarn start
   ```

## Environment Variables

- `REACT_APP_PRIVY_APP_ID`: Your Privy application ID for wallet connection
- `REACT_APP_ALCHEMY_API_KEY`: Alchemy API key for enhanced blockchain features
- `REACT_APP_XMTP_ENV`: XMTP environment (development/production)
- `REACT_APP_API_URL`: Backend API URL for XMTP agent communication

## Scripts

- `yarn start`: Start development server
- `yarn build`: Build for production
- `yarn test`: Run tests
- `yarn eject`: Eject from Create React App

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Privy** for wallet connection
- **XMTP** for messaging
- **Framer Motion** for animations
- **Wagmi** for Ethereum interactions

## Chat Interface Features

- Real-time messaging with XMTP agent
- Smart message formatting
- Quick action buttons
- Auto-scroll to new messages
- Typing indicators
- Message timestamps
- Responsive chat bubbles

## Wallet Integration

- Connect with multiple wallet types
- Display wallet address in header
- Automatic network switching
- Transaction confirmations
- Balance displays

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request