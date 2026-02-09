# 🍩 DonutSMP Quiz Website

A pixel-art themed Minecraft quiz website where players can deposit in-game currency, take daily quizzes about Minecraft 1.21.11, and withdraw their winnings!

## ✨ Features

- **Discord OAuth Login** - Secure authentication via Discord
- **Three Quiz Difficulties**
  - Simple: 500k entry → 650k reward (5 questions)
  - Medium: 5M entry → 6.5M reward (7 questions)  
  - Hard: 25M entry → 30M reward (10 questions)
- **Daily Quiz System** - Each quiz can only be taken once per day
- **Instant Withdrawals** - Request withdrawals that notify admins via Discord webhook
- **Balance Management** - Track deposits, quiz costs, and earnings
- **Responsive Design** - Distinctive pixel-art Minecraft aesthetic

## 🎮 How It Works

1. Players deposit money in-game using `/pay conexicn <amount>`
2. Admin manually updates player balance in the database
3. Players login via Discord and take quizzes
4. Win 130% back by answering all questions correctly
5. Withdraw winnings anytime - admins get notified via Discord

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Discord account for OAuth setup

## 🚀 Installation

### 1. Clone or Download the Files

```bash
# If you have all the files, navigate to the directory
cd donutsmp-website
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Discord Application Setup

#### Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "DonutSMP" (or your preferred name)
4. Go to "OAuth2" → "General"
5. Copy your **Client ID**
6. Copy your **Client Secret**
7. Add redirect URL: `http://localhost:3000/auth/discord/callback`
   - For production, use your actual domain: `https://yourdomain.com/auth/discord/callback`

#### Create Discord Webhook
1. Go to your Discord server
2. Edit the channel where you want withdrawal notifications
3. Go to "Integrations" → "Webhooks"
4. Click "New Webhook"
5. Copy the webhook URL

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DISCORD_CLIENT_ID=your_actual_client_id
DISCORD_CLIENT_SECRET=your_actual_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
SESSION_SECRET=generate_a_random_string_here
PORT=3000
```

**Generate a secure SESSION_SECRET:**
```bash
# In terminal/command prompt:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Start the Server

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The website will be available at `http://localhost:3000`

## 💾 Database

The application uses SQLite with `better-sqlite3`. The database (`donutsmp.db`) is created automatically on first run.

### Manual Balance Management

Since deposits are done in-game, you'll need to manually update balances. You can do this by:

1. **Direct database access:**
```bash
npm install -g sqlite3
sqlite3 donutsmp.db

# Update balance
UPDATE users SET balance = balance + 1000000 WHERE discord_id = 'DISCORD_USER_ID';
```

2. **Create an admin endpoint** (recommended for production):
```javascript
// Add to server.js - protect with admin authentication!
app.post('/admin/deposit', isAdmin, (req, res) => {
  const { discord_id, amount } = req.body;
  const stmt = db.prepare('UPDATE users SET balance = balance + ? WHERE discord_id = ?');
  stmt.run(amount, discord_id);
  res.json({ success: true });
});
```

## 🎯 Quiz Questions

The quiz questions are hardcoded in `server.js` in the `quizQuestions` object. To modify questions:

1. Open `server.js`
2. Find the `quizQuestions` object (around line 70)
3. Edit the questions, options, and correct answer indices
4. Restart the server

## 📊 Database Schema

### Users Table
- `id` - Primary key
- `discord_id` - Discord user ID (unique)
- `discord_username` - Discord username
- `minecraft_username` - Minecraft username
- `balance` - Current balance
- `created_at` - Registration date

### Quiz Attempts Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `difficulty` - Quiz difficulty (simple/medium/hard)
- `score` - Number of correct answers
- `completed_at` - Completion timestamp

### Withdrawals Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `minecraft_username` - Minecraft username
- `amount` - Withdrawal amount
- `status` - Status (pending/completed)
- `requested_at` - Request timestamp

## 🔒 Security Notes

- **Never commit `.env` file** to version control
- Use strong SESSION_SECRET in production
- Implement rate limiting for production
- Add admin authentication for sensitive endpoints
- Use HTTPS in production
- Validate all user inputs
- Implement CSRF protection for production

## 🌐 Production Deployment

### Using a VPS (DigitalOcean, Linode, etc.)

1. Set up a server with Node.js
2. Clone your repository
3. Install dependencies
4. Update `.env` with production URLs
5. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js --name donutsmp
pm2 save
pm2 startup
```

6. Set up Nginx as reverse proxy
7. Get SSL certificate with Let's Encrypt

### Using Heroku

1. Create a Heroku app
2. Add buildpack: `heroku/nodejs`
3. Set environment variables in Heroku dashboard
4. Deploy:
```bash
git push heroku main
```

## 📝 API Endpoints

- `GET /` - Landing page
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /api/user` - Get current user data
- `POST /api/user/minecraft` - Update Minecraft username
- `GET /api/quiz/availability` - Check quiz availability
- `GET /api/quiz/:difficulty` - Start a quiz
- `POST /api/quiz/:difficulty/submit` - Submit quiz answers
- `POST /api/withdraw` - Submit withdrawal request
- `GET /api/withdrawals` - Get withdrawal history

## 🎨 Customization

### Change Colors
Edit CSS variables in each HTML file:
```css
:root {
  --grass-top: #7FC241;
  --diamond: #5DCDE3;
  --gold: #FCEE4B;
  /* etc... */
}
```

### Modify Quiz Costs/Rewards
Edit in `server.js`:
```javascript
const costs = { simple: 500000, medium: 5000000, hard: 25000000 };
const rewards = { simple: 650000, medium: 6500000, hard: 30000000 };
```

### Add More Quiz Questions
Add questions to the `quizQuestions` object in `server.js`.

## 🐛 Troubleshooting

**"Discord OAuth failed"**
- Check CLIENT_ID and CLIENT_SECRET are correct
- Verify redirect URI matches exactly in Discord app settings
- Ensure redirect URI includes protocol (http:// or https://)

**"Quiz already taken today"**
- Quiz cooldown is based on calendar day (UTC)
- Check database quiz_attempts table for debugging

**"Insufficient balance"**
- User balance is in database
- Verify balance was added correctly
- Check for negative values

**Database locked errors**
- SQLite doesn't handle high concurrency well
- Consider PostgreSQL or MySQL for production

## 📞 Support

For issues or questions:
1. Check this README
2. Review server logs: `pm2 logs donutsmp` (if using PM2)
3. Check browser console for frontend errors
4. Verify `.env` configuration

## 📄 License

This project is provided as-is for the DonutSMP Minecraft server.

## 🙏 Credits

Built with:
- Express.js
- better-sqlite3
- Discord OAuth
- Press Start 2P font (Google Fonts)
- Pixel art design inspiration from Minecraft

---

**Enjoy your quiz website! May your players' knowledge be tested and their wallets grow! 🍩💎**
