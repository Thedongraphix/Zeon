# CORS Emergency Fix Guide

## 🚨 Current Issue
The frontend at `https://www.zeonai.xyz` is being blocked by CORS when trying to access the API at `https://zeon-hybrid.onrender.com/api/chat`.

**Error Message:**
```
Access to fetch at 'https://zeon-hybrid.onrender.com/api/chat' from origin 'https://www.zeonai.xyz' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 Root Cause Analysis

1. **Server Status**: The server is returning 503 (Service Unavailable)
2. **Hibernation**: Render free tier puts services to sleep after inactivity
3. **Deployment**: The updated CORS configuration may not be deployed yet

## ✅ Immediate Solutions

### 1. **Deploy Updated Code**
The CORS configuration has been updated in the code but needs to be deployed to Render:

```bash
# If using Git deployment on Render:
git add .
git commit -m "Fix CORS configuration for zeonai.xyz"
git push origin main
```

### 2. **Wake Up the Service**
Visit the health check endpoint to wake up the hibernating service:
- `https://zeon-hybrid.onrender.com/health`
- `https://zeon-hybrid.onrender.com/cors-test`

### 3. **Verify CORS Configuration**
The backend already has this CORS configuration:

```typescript
// Current CORS configuration in index.ts
const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://www.zeonai.xyz',  // ✅ Your domain
      'https://zeonai.xyz',     // ✅ Your domain without www
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      // In production, allow zeonai.xyz domains even if not in the exact list
      if (origin.includes('zeonai.xyz') && process.env.NODE_ENV === 'production') {
        console.log(`✅ Allowing zeonai.xyz subdomain: ${origin}`);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Length', 'X-Processing-Time'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// FALLBACK: Manual CORS headers
app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  
  // Always set basic CORS headers for zeonai.xyz domains
  if (origin && origin.includes('zeonai.xyz')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
  }
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});
```

## 🚀 Quick Test Commands

### Test 1: Check if server is awake
```bash
curl https://zeon-hybrid.onrender.com/health
```

### Test 2: Test CORS endpoint
```bash
curl https://zeon-hybrid.onrender.com/cors-test
```

### Test 3: Test CORS preflight
```bash
curl -X OPTIONS https://zeon-hybrid.onrender.com/api/chat \
  -H "Origin: https://www.zeonai.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

### Test 4: Test actual API call
```bash
curl -X POST https://zeon-hybrid.onrender.com/api/chat \
  -H "Origin: https://www.zeonai.xyz" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "sessionId": "test"}' \
  -v
```

## 🔧 Frontend Workarounds (Temporary)

While waiting for the backend fix, you can try these frontend approaches:

### 1. **Add Request Headers**
```javascript
const response = await fetch('https://zeon-hybrid.onrender.com/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://www.zeonai.xyz'
  },
  body: JSON.stringify({
    message: userMessage,
    sessionId: sessionId
  })
});
```

### 2. **Add Error Handling for CORS**
```javascript
async function sendMessage(message, sessionId) {
  try {
    const response = await fetch('https://zeon-hybrid.onrender.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.error('🚫 CORS Error detected. The backend server may be hibernating.');
      
      // Try to wake up the server
      try {
        await fetch('https://zeon-hybrid.onrender.com/health', { method: 'GET' });
        console.log('🔄 Attempted to wake up server. Please try again in 30 seconds.');
        
        // Retry after a delay
        setTimeout(() => {
          console.log('🔄 Retrying request...');
          sendMessage(message, sessionId);
        }, 30000);
        
      } catch (wakeError) {
        console.error('❌ Failed to wake up server:', wakeError);
      }
      
      return { error: 'Server is starting up. Please try again in 30 seconds.' };
    }
    
    throw error;
  }
}
```

### 3. **Display User-Friendly Error**
```javascript
function handleCorsError() {
  const errorMessage = `
    🔄 **Server Starting Up**
    
    The AI agent is waking up from hibernation. This happens on free hosting services.
    
    **Please wait 30 seconds and try again.**
    
    If the problem persists:
    1. Refresh the page
    2. Wait a moment for the server to fully start
    3. Try your message again
  `;
  
  displayMessage(errorMessage, false);
}
```

## 📋 Expected Resolution Timeline

1. **Immediate (0-2 minutes)**: Wake up hibernating server
2. **Short term (5-10 minutes)**: Deploy updated CORS configuration
3. **Long term**: Consider upgrading to paid Render plan to avoid hibernation

## ✅ Success Indicators

When the fix works, you should see:

1. **Browser Network Tab**: Status 200 instead of failed requests
2. **Console Logs**: No CORS errors
3. **API Response**: Proper JSON responses from the agent
4. **CORS Test Endpoint**: Returns success message

## 🎯 Next Steps

1. **Redeploy the backend** with the updated CORS configuration
2. **Test the CORS endpoints** using the curl commands above
3. **Verify frontend can connect** to the API
4. **Monitor server hibernation** and consider upgrading hosting plan

The CORS configuration is already properly set up in the code - the main issue is deployment and server hibernation on Render's free tier. 