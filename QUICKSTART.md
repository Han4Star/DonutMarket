# 🚀 QUICK START GUIDE

## Get Up and Running in 5 Minutes!

### Step 1: Install Node.js
If you don't have Node.js installed:
- Download from https://nodejs.org/ (use LTS version)
- Install and verify: `node --version`

### Step 2: Install Dependencies
Open terminal in the project folder and run:
```bash
npm install
```

### Step 3: Set Up Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "DonutSMP"
3. Go to "OAuth2" section
4. Copy your **Client ID**
5. Click "Reset Secret" and copy **Client Secret**
6. Add Redirect: `http://localhost:3000/auth/discord/callback`

### Step 4: Create Discord Webhook
1. Go to your Discord server
2. Right-click channel → Edit Channel → Integrations → Webhooks
3. Create New Webhook
4. Copy the webhook URL

### Step 5: Configure Environment
1. Copy `.env.example` to `.env`
2. Edit `.env` with your values:
```
DISCORD_CLIENT_ID=paste_your_client_id
DISCORD_CLIENT_SECRET=paste_your_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_WEBHOOK_URL=paste_your_webhook_url
SESSION_SECRET=make_this_a_random_string
```

### Step 6: Start the Server
```bash
npm start
```

### Step 7: Open the Website
Go to http://localhost:3000 in your browser!

---

## 💰 Managing Player Balances

Players deposit using `/pay conexicn <amount>` in-game. You need to manually add this to their account:

### Option 1: Using SQLite Command Line
```bash
# Install sqlite3 globally
npm install -g sqlite3

# Open database
sqlite3 donutsmp.db

# Add balance (replace DISCORD_ID and AMOUNT)
UPDATE users SET balance = balance + 1000000 WHERE discord_id = '123456789';

# Exit
.exit
```

### Option 2: Use a Database Browser
1. Download "DB Browser for SQLite" from https://sqlitebrowser.org/
2. Open `donutsmp.db`
3. Go to "Execute SQL" tab
4. Run: `UPDATE users SET balance = balance + 1000000 WHERE discord_id = '123456789';`

### Finding Discord IDs
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
2. Right-click user → Copy User ID

---

## ✅ Testing the Website

1. Click "Login with Discord" on homepage
2. Authorize the application
3. Set your Minecraft username
4. Take a quiz (make sure you have balance!)
5. Test withdrawal

---

## 🔧 Common Issues

**Port 3000 already in use?**
```bash
# Use different port
PORT=3001 npm start
```

**Can't connect to Discord?**
- Check CLIENT_ID and CLIENT_SECRET are correct
- Verify redirect URI is exact match in Discord app settings

**Database errors?**
- Make sure you're in the right directory
- Database file gets created automatically on first run

---

## 📱 Production Deployment

When ready for production:
1. Get a domain name
2. Update DISCORD_REDIRECT_URI in Discord app settings
3. Update `.env` with production URL
4. Use HTTPS (Let's Encrypt)
5. Use PM2 or similar for process management

---

Need help? Check the full README.md for detailed documentation!
