# Zeon Fundraiser Testing Guide

## Overview
This guide explains how to test the new fundraiser functionality in Zeon AI. The system now supports creating simple fundraisers with shareable links, QR codes, and mobile-friendly contribution pages.

## ✅ Fixed Issues

### 1. **Fundraiser Creation Logic**
- **Problem**: Agent was trying to create tokens instead of simple fundraisers
- **Solution**: Updated system prompt to guide agent toward wallet-to-wallet contributions
- **New Behavior**: When users request a "fundraiser for X ETH", the agent creates a contribution setup instead of deploying contracts

### 2. **Text Formatting**
- **Problem**: Markdown formatting wasn't rendering properly
- **Solution**: Replaced markdown with asterisk-based formatting and plain text links
- **New Behavior**: Bold text shows as `*text*`, links are displayed as plain URLs

### 3. **QR Code Generation**
- **Problem**: QR codes weren't rendering properly in the frontend
- **Solution**: Enhanced QR code parsing and display logic
- **New Behavior**: QR codes are properly extracted from agent responses and displayed as images

### 4. **Mobile Responsiveness**
- **Problem**: Input field and touch interactions weren't optimized for mobile
- **Solution**: Added mobile-specific CSS and touch-friendly interactions
- **New Behavior**: Better touch targets, prevented iOS zoom, improved scrolling

### 5. **Sharing Links**
- **Problem**: No way to share fundraisers easily
- **Solution**: Created fundraiser page routing with URL parameters
- **New Behavior**: Generate shareable links like `/fundraiser/0x123...?goal=0.5&name=Web3%20Clubs`

## 🧪 Testing Instructions

### Test 1: Basic Fundraiser Creation
**Input**: 
```
I want you to create a fundraiser worth 0.5 eth for Web3 clubs on this address 0x79912676F8BFbB787Afcb3347aa5e9606940d244
```

**Expected Response**:
- Formatted text with asterisks for bold
- Fundraiser details with goal amount
- Shareable link to the fundraiser page
- Base Sepolia explorer links
- Suggestion to generate QR codes

### Test 2: QR Code Generation
**Input**: 
```
Generate a QR code for 0.1 ETH contribution to that fundraiser
```

**Expected Response**:
- JSON object with QR code data
- Frontend should display the QR code image
- Mobile wallet compatibility
- Coinbase Wallet deep link option

### Test 3: Fundraiser Page Access
**URL**: `http://localhost:3000/fundraiser/0x79912676F8BFbB787Afcb3347aa5e9606940d244?goal=0.5&name=Web3%20Clubs`

**Expected Behavior**:
- Dedicated fundraiser page loads
- Shows fundraiser details and progress
- Contribution input field
- QR code generation button
- Coinbase Wallet integration
- Mobile-responsive design

### Test 4: Mobile Experience
**Test on mobile device or browser dev tools**:
- Input field doesn't zoom on iOS
- Touch targets are 44px+ minimum
- QR codes display properly
- Send button is touch-friendly
- Smooth scrolling works

## 🔧 API Endpoints

### Chat Endpoint
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Create a fundraiser for 0.5 ETH for Web3 clubs",
  "sessionId": "user123",
  "walletAddress": "0x123..."
}
```

### Fundraiser Endpoint (Future Enhancement)
```bash
POST /api/fundraiser
Content-Type: application/json

{
  "walletAddress": "0x79912676F8BFbB787Afcb3347aa5e9606940d244",
  "goalAmount": "0.5",
  "fundraiserName": "Web3 Clubs",
  "description": "Supporting local Web3 education"
}
```

## 🎯 Key Features Implemented

### 1. Smart Fundraiser Creation
- Detects fundraiser requests vs token deployment
- Uses wallet addresses instead of contract deployment
- Provides clear goal amounts and descriptions

### 2. Enhanced Text Formatting
- `*Bold text*` for emphasis
- Plain URL links for better compatibility
- Emojis for visual appeal
- Structured response format

### 3. Advanced QR Code System
- PNG format for wallet compatibility
- Base64 encoding for frontend display
- Mobile-optimized sizing
- Ethereum URI format for universal wallet support

### 4. Shareable Fundraiser Links
- URL-based fundraiser pages
- Query parameter encoding
- Social sharing ready
- Mobile-first design

### 5. Mobile-First Design
- Touch-friendly interactions
- Prevented iOS zoom on input
- Optimized QR code display
- Safe area support for notched devices

## 🚀 Deployment Notes

### Frontend Dependencies Added
```json
{
  "react-router-dom": "^6.20.0",
  "qrcode": "^1.5.3",
  "@types/qrcode": "^1.5.0"
}
```

### Environment Variables
```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
```

### URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://zeonai.xyz`

## 🐛 Troubleshooting

### QR Code Not Displaying
1. Check browser console for image loading errors
2. Verify QR data is base64 formatted
3. Ensure proper JSON parsing in frontend

### Mobile Input Issues
1. Verify font-size is 16px+ to prevent zoom
2. Check touch target sizes (44px minimum)
3. Test on actual devices, not just simulators

### Fundraiser Links Not Working
1. Verify React Router is properly configured
2. Check URL parameter encoding
3. Ensure backend CORS allows frontend domain

### Agent Not Creating Fundraisers
1. Check system prompt is properly loaded
2. Verify CDP_API_KEY configuration
3. Review agent logs for error patterns

## 📱 Mobile Testing Checklist

- [ ] Input field doesn't zoom on iOS
- [ ] Send button is easily tappable
- [ ] QR codes display at proper size
- [ ] Scrolling is smooth
- [ ] Copy buttons work with touch
- [ ] Links open properly
- [ ] Text is readable without zooming
- [ ] Navigation works with touch gestures

## 🔄 Next Steps

1. **Contribution Tracking**: Implement real-time contribution monitoring
2. **Social Features**: Add sharing buttons for Twitter, Telegram, etc.
3. **Analytics**: Track fundraiser performance and conversion
4. **Multi-chain Support**: Extend beyond Base Sepolia
5. **Advanced QR Codes**: Add logos and custom styling 