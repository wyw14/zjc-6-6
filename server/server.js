const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6035;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, label: '简单' },
  medium: { pairs: 8, label: '中等' },
  hard: { pairs: 12, label: '困难' }
};

const MAX_LEVEL = 5;
const DEFAULT_PAGE_SIZE = 10;
const MAX_NAME_LENGTH = 10;

let leaderboard = [];

function escapeHtml(str) {
  if (typeof str !== 'string') {
    str = String(str);
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePlayerName(name) {
  if (typeof name !== 'string') {
    return '匿名玩家';
  }
  let sanitized = name.trim();
  if (sanitized.length === 0) {
    return '匿名玩家';
  }
  sanitized = sanitized.substring(0, MAX_NAME_LENGTH);
  return sanitized;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/config', (req, res) => {
  res.json({
    difficulties: DIFFICULTY_CONFIG,
    maxLevel: MAX_LEVEL
  });
});

app.get('/api/shuffle', (req, res) => {
  const difficulty = req.query.difficulty || 'medium';
  const level = parseInt(req.query.level) || 1;
  
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const pairs = Math.min(config.pairs + Math.floor((level - 1) * 1.5), 20);
  
  const cardIds = [];
  for (let i = 1; i <= pairs; i++) {
    cardIds.push(i, i);
  }
  const shuffled = shuffle(cardIds);
  res.json({ cards: shuffled, pairs, difficulty, level });
});

app.post('/api/score', (req, res) => {
  const { time, playerName, difficulty = 'medium', level = 1, moves = 0 } = req.body;
  
  if (typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: '无效的成绩数据' });
  }

  const safePlayerName = sanitizePlayerName(playerName);
  const safeDifficulty = DIFFICULTY_CONFIG[difficulty] ? difficulty : 'medium';
  const safeLevel = Math.min(Math.max(parseInt(level) || 1, 1), MAX_LEVEL);

  const entry = {
    id: Date.now() + Math.random(),
    time: time,
    playerName: safePlayerName,
    difficulty: safeDifficulty,
    level: safeLevel,
    moves: Math.max(parseInt(moves) || 0, 0),
    date: new Date().toISOString(),
    dateStr: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);

  const sameDifficultyLevel = leaderboard.filter(
    e => e.difficulty === safeDifficulty && e.level === safeLevel
  );
  sameDifficultyLevel.sort((a, b) => a.time - b.time);
  const rank = sameDifficultyLevel.findIndex(e => e.id === entry.id) + 1;

  res.json({
    success: true,
    rank: rank,
    entry: entry
  });
});

app.get('/api/leaderboard', (req, res) => {
  const {
    difficulty = 'all',
    level = 'all',
    search = '',
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    dateFrom = '',
    dateTo = ''
  } = req.query;

  let filtered = [...leaderboard];

  if (difficulty !== 'all' && DIFFICULTY_CONFIG[difficulty]) {
    filtered = filtered.filter(e => e.difficulty === difficulty);
  }

  if (level !== 'all') {
    const levelNum = parseInt(level);
    if (!isNaN(levelNum) && levelNum >= 1 && levelNum <= MAX_LEVEL) {
      filtered = filtered.filter(e => e.level === levelNum);
    }
  }

  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(e => 
      e.playerName.toLowerCase().includes(searchLower)
    );
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (!isNaN(fromDate.getTime())) {
      filtered = filtered.filter(e => new Date(e.date) >= fromDate);
    }
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= toDate);
    }
  }

  filtered.sort((a, b) => a.time - b.time);

  const total = filtered.length;
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize) || DEFAULT_PAGE_SIZE, 1), 100);
  const totalPages = Math.ceil(total / size);
  const start = (pageNum - 1) * size;
  const paginated = filtered.slice(start, start + size);

  res.json({
    leaderboard: paginated,
    total,
    page: pageNum,
    pageSize: size,
    totalPages
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
