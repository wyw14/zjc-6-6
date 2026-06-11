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

let leaderboard = [];

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

  const entry = {
    id: Date.now() + Math.random(),
    time: time,
    playerName: playerName || '匿名玩家',
    difficulty: difficulty,
    level: parseInt(level) || 1,
    moves: parseInt(moves) || 0,
    date: new Date().toISOString(),
    dateStr: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);

  const sameDifficultyLevel = leaderboard.filter(
    e => e.difficulty === difficulty && e.level === parseInt(level)
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

  if (difficulty !== 'all') {
    filtered = filtered.filter(e => e.difficulty === difficulty);
  }

  if (level !== 'all') {
    const levelNum = parseInt(level);
    filtered = filtered.filter(e => e.level === levelNum);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(e => 
      e.playerName.toLowerCase().includes(searchLower)
    );
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filtered = filtered.filter(e => new Date(e.date) >= fromDate);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(e => new Date(e.date) <= toDate);
  }

  filtered.sort((a, b) => a.time - b.time);

  const total = filtered.length;
  const pageNum = parseInt(page);
  const size = parseInt(pageSize);
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
