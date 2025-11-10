# Debugging Guide - LightSNS Backend

Complete guide for debugging the LightSNS backend with Chrome DevTools and VSCode.

---

## Quick Start

### Option 1: Chrome DevTools (Recommended)

#### Method A: Auto-restart with Nodemon
```bash
npm run dev:debug
```

Then open Chrome and go to:
```
chrome://inspect
```

Click "Open dedicated DevTools for Node" or click "inspect" under your running process.

#### Method B: Debug from Start
```bash
npm run debug
```

This will pause execution at the first line. Open `chrome://inspect` to attach.

---

## VSCode Debugging

### Step 1: Open Project in VSCode
```bash
code .
```

### Step 2: Set Breakpoints
- Click to the left of line numbers to add breakpoints
- Or add `debugger;` statement in your code

### Step 3: Start Debugging

Press `F5` or click "Run and Debug" icon, then select:

- **"Debug Backend"**: With auto-restart (nodemon)
- **"Debug Backend (No Restart)"**: Single run
- **"Debug Current Test File"**: Debug specific test
- **"Debug All Tests"**: Debug entire test suite

---

## Chrome DevTools Features

### Available Tools

1. **Sources Panel**
   - Set breakpoints
   - Step through code (F10, F11)
   - Watch variables
   - Call stack inspection

2. **Console**
   - Execute code in context
   - View console.log output
   - Inspect objects

3. **Profiler**
   - CPU profiling
   - Memory profiling
   - Performance analysis

4. **Network** (for HTTP requests)
   - View API calls
   - Inspect headers
   - Check response times

---

## Common Debugging Scenarios

### 1. Debug API Endpoint

```javascript
// src/controllers/authController.js
exports.login = async (req, res, next) => {
  debugger; // <-- Execution will pause here

  const { email, password } = req.body;
  // ...
};
```

### 2. Debug Database Queries

```javascript
// src/models/User.js
const query = async (text, params) => {
  debugger; // <-- Pause before query
  console.log('Query:', text);
  console.log('Params:', params);
  const result = await pool.query(text, params);
  return result;
};
```

### 3. Debug Middleware

```javascript
// src/middleware/auth.js
const authMiddleware = (req, res, next) => {
  debugger; // <-- Check token validation

  const token = req.headers.authorization?.split(' ')[1];
  // ...
};
```

### 4. Debug WebSocket Events

```javascript
// src/services/socketService.js
io.on('connection', (socket) => {
  debugger; // <-- New connection

  socket.on('message:send', (data) => {
    debugger; // <-- Message received
    // ...
  });
});
```

---

## Debugging Best Practices

### 1. Use Conditional Breakpoints
Right-click breakpoint → Edit breakpoint → Add condition:
```javascript
userId === 123
```

### 2. Log Strategically
```javascript
const logger = require('./utils/logger');

logger.debug('Variable value:', { userId, data });
logger.error('Error occurred:', { error: err.message });
```

### 3. Inspect Request Objects
```javascript
exports.someHandler = async (req, res) => {
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('Headers:', req.headers);
  console.log('User:', req.user); // if authenticated
};
```

### 4. Debug Async Issues
```javascript
async function fetchData() {
  try {
    debugger; // <-- Before async call
    const result = await someAsyncFunction();
    debugger; // <-- After async call
    return result;
  } catch (error) {
    debugger; // <-- Catch block
    throw error;
  }
}
```

---

## Testing with Debugger

### Debug Unit Tests
```bash
# In VSCode: Open test file, press F5, select "Debug Current Test File"

# Or in terminal:
node --inspect-brk node_modules/.bin/jest __tests__/models/User.test.js --runInBand
```

### Debug Integration Tests
```bash
node --inspect-brk node_modules/.bin/jest __tests__/integration/auth.test.js --runInBand
```

---

## Troubleshooting

### Debugger Not Attaching

**Problem**: Chrome can't find the process

**Solution**:
1. Check if process is running: `ps aux | grep node`
2. Verify port (default: 9229): `lsof -i :9229`
3. Try explicit port: `node --inspect=0.0.0.0:9229 src/index.js`

### Breakpoints Not Hit

**Problem**: Code not stopping at breakpoints

**Solution**:
1. Ensure source maps are enabled
2. Check file path matches
3. Verify code is actually executed
4. Use `debugger;` statement instead

### Performance Issues

**Problem**: App is slow in debug mode

**Solution**:
1. Remove unnecessary breakpoints
2. Use conditional breakpoints
3. Disable "Pause on exceptions" when not needed
4. Profile instead of debug for performance issues

---

## Advanced Debugging

### 1. Remote Debugging
```bash
# On server
node --inspect=0.0.0.0:9229 src/index.js

# On local machine
ssh -L 9229:localhost:9229 user@server
```

Then connect Chrome DevTools to `localhost:9229`

### 2. Memory Leak Detection
```bash
# Start with memory profiling
node --inspect --expose-gc src/index.js

# In Chrome DevTools:
# Memory tab → Take heap snapshot → Compare snapshots
```

### 3. CPU Profiling
```bash
node --inspect --prof src/index.js

# Generate readable output
node --prof-process isolate-*.log > profile.txt
```

---

## Environment-Specific Debugging

### Development
```bash
NODE_ENV=development npm run dev:debug
```

### Testing
```bash
NODE_ENV=test node --inspect-brk node_modules/.bin/jest --runInBand
```

### Production Issues (with caution)
```bash
NODE_ENV=production node --inspect src/index.js
# ⚠️ Never expose debug port publicly in production!
```

---

## Useful Chrome DevTools Shortcuts

- `F8` - Resume script execution
- `F10` - Step over next function call
- `F11` - Step into next function call
- `Shift + F11` - Step out of current function
- `Ctrl/Cmd + \` - Pause/Resume
- `Ctrl/Cmd + Shift + F` - Search all files
- `Ctrl/Cmd + P` - Go to file

---

## Additional Resources

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)

---

## Quick Reference Commands

```bash
# Start with debugging
npm run dev:debug        # Auto-restart on changes
npm run debug            # Pause at first line

# Debug specific test
node --inspect-brk node_modules/.bin/jest path/to/test.js --runInBand

# Check if debugger is running
lsof -i :9229

# Kill stuck debugger
kill $(lsof -t -i:9229)
```

---

**Happy Debugging! 🐛🔍**
