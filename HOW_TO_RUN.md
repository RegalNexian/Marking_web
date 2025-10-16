# 🚀 HOW TO RUN run-fix.bat

## Method 1: Double-Click (Easiest!)

1. Open File Explorer
2. Go to: `D:\Projects\Marking_web`
3. Find the file: `run-fix.bat`
4. **Double-click** on it
5. Wait for it to finish (~2 minutes)

---

## Method 2: From Command Prompt

1. Press `Windows Key + R`
2. Type: `cmd`
3. Press Enter
4. Copy and paste this command:
   ```
   cd D:\Projects\Marking_web && run-fix.bat
   ```
5. Press Enter

---

## Method 3: From Current Location

If you're already in the project folder:

```cmd
run-fix.bat
```

That's it! Just type the filename and press Enter.

---

## What Will Happen

The script will automatically:

1. ✅ Remove corrupted `node_modules` folder
2. ✅ Remove old `package-lock.json`
3. ✅ Install fresh dependencies (~2 minutes)
4. ✅ Test database connection
5. ✅ Show you the results

---

## Expected Output

### If Everything Works ✅

```
[1/4] Removing old node_modules...
Done: node_modules removed

[2/4] Removing old package-lock.json...
Done: package-lock.json removed

[3/4] Installing fresh dependencies...
This may take 1-2 minutes...
[Installing...]

[4/4] Testing database connection...
🔍 Testing MongoDB Connection...
✅ MONGO_URI found
📍 Connecting to: cluster0.awlwkqe.mongodb.net
✅ MongoDB Connected Successfully!
⏱️  Connection time: 2.34s
🏠 Host: cluster0-shard-00-00.xxxxx.mongodb.net
🎉 Database connection is working!

============================================
Done! Check the output above.
============================================

Next steps:
1. If database test succeeded, run: npm start
2. If database test failed, check MongoDB Atlas
```

---

### If Database Connection Fails ❌

```
❌ MongoDB Connection Failed (after 30.5s)

Error: Server selection timed out after 30000 ms

🔧 Troubleshooting Tips:

⚠️  Connection timed out. Possible causes:
   1. MongoDB Atlas cluster is paused (go to Atlas and resume it)
   2. Your IP is not whitelisted (add 0.0.0.0/0 in Network Access)
   3. Firewall blocking port 27017
   4. Network issues (check internet connection)
```

**Fix:** See "Database Connection Fixes" below

---

## Database Connection Fixes

### Fix 1: Resume Paused Cluster (Most Common!)

1. Open: https://cloud.mongodb.com
2. Login with your account
3. Go to: **Database** → **Browse Collections**
4. If you see **"Paused"** or **"Resume"** button:
   - Click: **"Resume"**
   - Wait: 2 minutes for cluster to start
   - Re-run: `run-fix.bat`

### Fix 2: Whitelist IP Address

1. Go to: https://cloud.mongodb.com
2. Click: **Network Access** (left sidebar)
3. Click: **"Add IP Address"** (green button)
4. Select: **"Allow Access from Anywhere"**
5. Enter: `0.0.0.0/0`
6. Click: **"Confirm"**
7. Wait: 1 minute
8. Re-run: `run-fix.bat`

### Fix 3: Check MongoDB URI

1. Open: `D:\Projects\Marking_web\server\.env`
2. Verify this line exists:
   ```
   MONGO_URI=mongodb+srv://nexus:Soumya0305@cluster0.awlwkqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
3. Make sure password is correct
4. Save file
5. Re-run: `run-fix.bat`

---

## After run-fix.bat Succeeds

### Start Backend Server

**Terminal 1:**
```cmd
cd D:\Projects\Marking_web\server
npm start
```

**Expected:**
```
Connecting to MongoDB...
✅ MongoDB Connected: cluster0.awlwkqe.mongodb.net
Server running on port 5000
```

### Start Frontend

**Terminal 2 (new window):**
```cmd
cd D:\Projects\Marking_web\client
npm run dev
```

**Expected:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Open Application

**Browser:**
- Frontend: http://localhost:5173
- Health Check: http://localhost:5000/health

---

## Troubleshooting

### "run-fix.bat is not recognized"

You're not in the right folder. Run this:
```cmd
cd D:\Projects\Marking_web
run-fix.bat
```

### "npm is not recognized"

Node.js is not installed or not in PATH. Install it:
- Download: https://nodejs.org
- Install the LTS version
- Restart Command Prompt
- Re-run: `run-fix.bat`

### Script closes immediately

The script has a `pause` at the end, so this shouldn't happen. If it does:
1. Run from Command Prompt (not double-click)
2. You'll see the error message

### Still having issues?

Read these files:
1. **START_HERE.md** - Quick troubleshooting
2. **COMPLETE_GUIDE.md** - Detailed solutions
3. **DATABASE_FIX.md** - Database-specific help

---

## Summary

**Simplest way:** Just **double-click** `run-fix.bat` in File Explorer!

**Or from command line:**
```cmd
cd D:\Projects\Marking_web
run-fix.bat
```

That's it! The script does everything automatically. 🎉

---

**Status:** Ready to run!  
**Location:** `D:\Projects\Marking_web\run-fix.bat`  
**Action:** Double-click or run from command prompt
