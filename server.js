require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('donutsmp.db');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    discord_username TEXT NOT NULL,
    minecraft_username TEXT,
    balance INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    score INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    deposited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    minecraft_username TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Discord OAuth Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Minecraft 1.21.11 Quiz Questions
const quizQuestions = {
  simple: [
    {
      question: "What is the maximum enchantment level for Protection in Minecraft 1.21?",
      options: ["III", "IV", "V", "VI"],
      correct: 1
    },
    {
      question: "Which wood type was added in the 1.19 update (Mangrove)?",
      options: ["Cherry", "Bamboo", "Mangrove", "Azalea"],
      correct: 2
    },
    {
      question: "How many hearts of damage does a Netherite Sword deal?",
      options: ["7", "8", "9", "10"],
      correct: 1
    },
    {
      question: "What is the blast resistance of Obsidian?",
      options: ["1200", "6000", "1000", "3000"],
      correct: 0
    },
    {
      question: "Which mob drops Phantom Membranes?",
      options: ["Enderman", "Phantom", "Vex", "Allay"],
      correct: 1
    }
  ],
  medium: [
    {
      question: "What is the exact light level required to prevent hostile mob spawning?",
      options: ["7", "8", "9", "10"],
      correct: 1
    },
    {
      question: "How many different wood types are in Minecraft 1.21?",
      options: ["9", "10", "11", "12"],
      correct: 1
    },
    {
      question: "What Y-level has the highest concentration of Ancient Debris?",
      options: ["Y=15", "Y=13-17", "Y=8-22", "Y=5-12"],
      correct: 0
    },
    {
      question: "Which enchantment is mutually exclusive with Infinity on a bow?",
      options: ["Flame", "Power", "Mending", "Punch"],
      correct: 2
    },
    {
      question: "How many Ender Pearls (on average) are needed to find a Stronghold?",
      options: ["8-12", "12-16", "4-6", "16-20"],
      correct: 0
    },
    {
      question: "What is the maximum fortune level for ore drops?",
      options: ["II", "III", "IV", "V"],
      correct: 1
    },
    {
      question: "Which structure generates exclusively in Deep Dark biomes?",
      options: ["Stronghold", "Ancient City", "Bastion", "End City"],
      correct: 1
    }
  ],
  hard: [
    {
      question: "What is the exact tick speed for a Redstone Repeater on maximum delay?",
      options: ["4 ticks", "8 ticks", "16 ticks", "2 ticks"],
      correct: 0
    },
    {
      question: "How many total Nether biomes exist in Minecraft 1.21?",
      options: ["4", "5", "6", "7"],
      correct: 1
    },
    {
      question: "What is the spawn rate percentage for a Chicken Jockey?",
      options: ["0.25%", "0.5%", "1%", "5%"],
      correct: 0
    },
    {
      question: "How many End Gateway Portals generate around the main End Island?",
      options: ["16", "20", "24", "32"],
      correct: 1
    },
    {
      question: "What is the exact explosion power of a Charged Creeper?",
      options: ["3", "6", "9", "12"],
      correct: 1
    },
    {
      question: "At what Y-level does Deepslate start generating?",
      options: ["Y=0", "Y=-8", "Y=8", "Y=-16"],
      correct: 1
    },
    {
      question: "How many unique sound events are triggered when a Note Block is played?",
      options: ["16", "25", "24", "32"],
      correct: 1
    },
    {
      question: "What is the internal ID for the Warden's sonic boom attack?",
      options: ["sonic_charge", "sonic_boom", "ranged_attack", "warden_attack"],
      correct: 1
    },
    {
      question: "How many different types of Tropical Fish variants exist?",
      options: ["2700", "3584", "2000", "4096"],
      correct: 0
    },
    {
      question: "What is the exact radius (in blocks) of a Beacon at level IV?",
      options: ["40", "50", "60", "70"],
      correct: 1
    }
  ]
};

// Helper function to check if user can take quiz today
function canTakeQuiz(userId, difficulty) {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE user_id = ? AND difficulty = ? AND DATE(completed_at) = ?
  `);
  const attempt = stmt.get(userId, difficulty, today);
  return !attempt;
}

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Discord OAuth login
app.get('/auth/discord', (req, res) => {
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(authUrl);
});

// Discord OAuth callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const discordUser = userResponse.data;

    // Check if user exists, if not create
    let stmt = db.prepare('SELECT * FROM users WHERE discord_id = ?');
    let user = stmt.get(discordUser.id);

    if (!user) {
      stmt = db.prepare('INSERT INTO users (discord_id, discord_username) VALUES (?, ?)');
      const result = stmt.run(discordUser.id, discordUser.username);
      user = { id: result.lastInsertRowid, discord_id: discordUser.id, discord_username: discordUser.username, balance: 0 };
    }

    req.session.user = user;
    res.redirect('/dashboard.html');
  } catch (error) {
    console.error('Discord OAuth Error:', error.response?.data || error.message);
    res.redirect('/?error=auth_failed');
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Get current user
app.get('/api/user', isAuthenticated, (req, res) => {
  const stmt = db.prepare('SELECT id, discord_username, minecraft_username, balance FROM users WHERE id = ?');
  const user = stmt.get(req.session.user.id);
  res.json(user);
});

// Update Minecraft username
app.post('/api/user/minecraft', isAuthenticated, (req, res) => {
  const { minecraft_username } = req.body;
  const stmt = db.prepare('UPDATE users SET minecraft_username = ? WHERE id = ?');
  stmt.run(minecraft_username, req.session.user.id);
  res.json({ success: true });
});

// Manual deposit (for admin/testing)
app.post('/api/deposit', isAuthenticated, (req, res) => {
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const updateStmt = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
  updateStmt.run(amount, req.session.user.id);

  const depositStmt = db.prepare('INSERT INTO deposits (user_id, amount) VALUES (?, ?)');
  depositStmt.run(req.session.user.id, amount);

  res.json({ success: true });
});

// Get quiz availability
app.get('/api/quiz/availability', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  res.json({
    simple: canTakeQuiz(userId, 'simple'),
    medium: canTakeQuiz(userId, 'medium'),
    hard: canTakeQuiz(userId, 'hard')
  });
});

// Start quiz
app.get('/api/quiz/:difficulty', isAuthenticated, (req, res) => {
  const { difficulty } = req.params;
  const userId = req.session.user.id;

  if (!['simple', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }

  if (!canTakeQuiz(userId, difficulty)) {
    return res.status(403).json({ error: 'Quiz already taken today' });
  }

  const costs = { simple: 500000, medium: 5000000, hard: 25000000 };
  const cost = costs[difficulty];

  // Check balance
  const userStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
  const user = userStmt.get(userId);

  if (user.balance < cost) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct cost
  const updateStmt = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
  updateStmt.run(cost, userId);

  res.json({
    questions: quizQuestions[difficulty],
    cost: cost
  });
});

// Submit quiz
app.post('/api/quiz/:difficulty/submit', isAuthenticated, (req, res) => {
  const { difficulty } = req.params;
  const { answers } = req.body;
  const userId = req.session.user.id;

  if (!['simple', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }

  if (!canTakeQuiz(userId, difficulty)) {
    return res.status(403).json({ error: 'Quiz already taken today' });
  }

  const questions = quizQuestions[difficulty];
  let correctAnswers = 0;

  answers.forEach((answer, index) => {
    if (questions[index] && questions[index].correct === answer) {
      correctAnswers++;
    }
  });

  const allCorrect = correctAnswers === questions.length;
  const rewards = { simple: 650000, medium: 6500000, hard: 30000000 };
  const reward = allCorrect ? rewards[difficulty] : 0;

  // Record attempt
  const attemptStmt = db.prepare('INSERT INTO quiz_attempts (user_id, difficulty, score) VALUES (?, ?, ?)');
  attemptStmt.run(userId, difficulty, correctAnswers);

  // Add reward if all correct
  if (allCorrect) {
    const updateStmt = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
    updateStmt.run(reward, userId);
  }

  res.json({
    correctAnswers,
    totalQuestions: questions.length,
    allCorrect,
    reward,
    passed: allCorrect
  });
});

// Withdraw
app.post('/api/withdraw', isAuthenticated, async (req, res) => {
  const { minecraft_username, amount } = req.body;
  const userId = req.session.user.id;

  if (!minecraft_username || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal request' });
  }

  // Check balance
  const userStmt = db.prepare('SELECT balance, discord_username FROM users WHERE id = ?');
  const user = userStmt.get(userId);

  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct money immediately
  const updateStmt = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
  updateStmt.run(amount, userId);

  // Record withdrawal
  const withdrawStmt = db.prepare('INSERT INTO withdrawals (user_id, minecraft_username, amount) VALUES (?, ?, ?)');
  withdrawStmt.run(userId, minecraft_username, amount);

  // Send Discord webhook
  if (DISCORD_WEBHOOK_URL) {
    try {
      await axios.post(DISCORD_WEBHOOK_URL, {
        embeds: [{
          title: '💰 Withdrawal Request',
          color: 0xF59E0B,
          fields: [
            {
              name: 'Discord User',
              value: user.discord_username,
              inline: true
            },
            {
              name: 'Minecraft Username',
              value: minecraft_username,
              inline: true
            },
            {
              name: 'Amount',
              value: amount.toLocaleString(),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      console.error('Discord webhook error:', error.message);
    }
  }

  res.json({ success: true });
});

// Get withdrawal history
app.get('/api/withdrawals', isAuthenticated, (req, res) => {
  const stmt = db.prepare(`
    SELECT minecraft_username, amount, status, requested_at 
    FROM withdrawals 
    WHERE user_id = ? 
    ORDER BY requested_at DESC 
    LIMIT 10
  `);
  const withdrawals = stmt.all(req.session.user.id);
  res.json(withdrawals);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DonutSMP server running on http://localhost:${PORT}`);
  console.log('\nIMPORTANT: Create a .env file with:');
  console.log('DISCORD_CLIENT_ID=your_discord_client_id');
  console.log('DISCORD_CLIENT_SECRET=your_discord_client_secret');
  console.log('DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback');
  console.log('DISCORD_WEBHOOK_URL=your_discord_webhook_url');
  console.log('SESSION_SECRET=your_random_secret_key');
});
