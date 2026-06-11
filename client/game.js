const API_BASE_URL = 'http://localhost:6035/api';

const CARD_EMOJIS = {
  1: '🍎',
  2: '🍊',
  3: '🍋',
  4: '🍇',
  5: '🍓',
  6: '🍒',
  7: '🍑',
  8: '🍌',
  9: '🥝',
  10: '🍍',
  11: '🥭',
  12: '🍉',
  13: '🍐',
  14: '🍈',
  15: '🫐',
  16: '🍏',
  17: '🥥',
  18: '🍅',
  19: '🥑',
  20: '🌽'
};

const DIFFICULTY_LABELS = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const difficultySelect = document.getElementById('difficultySelect');
const levelSelect = document.getElementById('levelSelect');
const winModal = document.getElementById('winModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const winDifficultyEl = document.getElementById('winDifficulty');
const winLevelEl = document.getElementById('winLevel');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');

const filterDifficulty = document.getElementById('filterDifficulty');
const filterLevel = document.getElementById('filterLevel');
const searchInput = document.getElementById('searchInput');
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const refreshBtn = document.getElementById('refreshBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const currentPageEl = document.getElementById('currentPage');
const totalPagesEl = document.getElementById('totalPages');
const totalCountEl = document.getElementById('totalCount');

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;
let currentDifficulty = 'medium';
let currentLevel = 1;
let totalPairs = 8;

let leaderboardState = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1
};

let searchDebounceTimer = null;

async function initGame() {
  currentDifficulty = difficultySelect.value;
  currentLevel = parseInt(levelSelect.value) || 1;
  resetGameState();
  const shuffledData = await fetchShuffledCards();
  totalPairs = shuffledData.pairs || 8;
  matchedEl.textContent = `0/${totalPairs}`;
  renderCards(shuffledData.cards);
  adjustBoardLayout(totalPairs);
}

function adjustBoardLayout(pairs) {
  const totalCards = pairs * 2;
  let cols = 4;
  if (totalCards <= 12) cols = 4;
  else if (totalCards <= 16) cols = 4;
  else if (totalCards <= 20) cols = 5;
  else cols = 6;
  
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  updateTimerDisplay();
  movesEl.textContent = '0';
  gameBoard.innerHTML = '';
}

async function fetchShuffledCards() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/shuffle?difficulty=${currentDifficulty}&level=${currentLevel}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取洗牌数据失败:', error);
    const fallbackCards = [];
    const pairs = 8;
    for (let i = 1; i <= pairs; i++) {
      fallbackCards.push(i, i);
    }
    for (let i = fallbackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackCards[i], fallbackCards[j]] = [fallbackCards[j], fallbackCards[i]];
    }
    return { cards: fallbackCards, pairs };
  }
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '❓';
    
    card.appendChild(cardBack);
    card.appendChild(cardFront);
    
    card.addEventListener('click', () => handleCardClick(card));
    
    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;
  
  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  if (id1 === id2) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/${totalPairs}`;
      flippedCards = [];
      isProcessing = false;
      
      if (matchedPairs === totalPairs) {
        endGame();
      }
    }, 500);
  } else {
    setTimeout(() => {
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  clearInterval(timer);
  timer = null;
  
  finalTimeEl.textContent = timerEl.textContent;
  finalMovesEl.textContent = moves;
  winDifficultyEl.textContent = DIFFICULTY_LABELS[currentDifficulty] || '中等';
  winLevelEl.textContent = `第${currentLevel}关`;
  
  nextLevelBtn.style.display = currentLevel < 5 ? 'inline-block' : 'none';
  
  setTimeout(() => {
    winModal.classList.remove('hidden');
  }, 500);
}

async function submitScore() {
  const playerName = playerNameInput.value.trim() || '匿名玩家';
  const timeInSeconds = Math.floor(elapsedTime / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        playerName: playerName,
        difficulty: currentDifficulty,
        level: currentLevel,
        moves: moves
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`恭喜！你在${DIFFICULTY_LABELS[currentDifficulty]}第${currentLevel}关排名第 ${data.rank} 名！`);
      winModal.classList.add('hidden');
      showLeaderboard();
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard() {
  leaderboardState.page = 1;
  await loadLeaderboard();
  leaderboardModal.classList.remove('hidden');
}

async function loadLeaderboard() {
  const difficulty = filterDifficulty.value;
  const level = filterLevel.value;
  const search = searchInput.value.trim();
  const dateFrom = dateFromInput.value;
  const dateTo = dateToInput.value;
  
  const params = new URLSearchParams({
    difficulty,
    level,
    search,
    page: leaderboardState.page,
    pageSize: leaderboardState.pageSize
  });
  
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?${params.toString()}`);
    const data = await response.json();
    
    leaderboardState = {
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      totalPages: data.totalPages
    };
    
    renderLeaderboard(data.leaderboard);
    updatePagination();
    totalCountEl.textContent = data.total;
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li class="empty-message">加载排行榜失败</li>';
  }
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  
  const startRank = (leaderboardState.page - 1) * leaderboardState.pageSize;
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    
    const minutes = Math.floor(entry.time / 60);
    const seconds = entry.time % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const rank = startRank + index + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'rank-gold';
    else if (rank === 2) rankClass = 'rank-silver';
    else if (rank === 3) rankClass = 'rank-bronze';
    
    li.innerHTML = `
      <div class="rank-main">
        <span class="rank ${rankClass}">#${rank}</span>
        <span class="name">${entry.playerName}</span>
      </div>
      <div class="rank-details">
        <span class="difficulty-badge">${DIFFICULTY_LABELS[entry.difficulty] || entry.difficulty}</span>
        <span class="level-badge">第${entry.level}关</span>
        <span class="time">⏱️ ${timeStr}</span>
      </div>
      <div class="rank-date">${entry.dateStr || ''}</div>
    `;
    
    leaderboardList.appendChild(li);
  });
}

function updatePagination() {
  currentPageEl.textContent = leaderboardState.page;
  totalPagesEl.textContent = leaderboardState.totalPages || 1;
  
  prevPageBtn.disabled = leaderboardState.page <= 1;
  nextPageBtn.disabled = leaderboardState.page >= leaderboardState.totalPages;
}

function debounceSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    leaderboardState.page = 1;
    loadLeaderboard();
  }, 300);
}

restartBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', initGame);
levelSelect.addEventListener('change', initGame);

playAgainBtn.addEventListener('click', () => {
  winModal.classList.add('hidden');
  initGame();
});

nextLevelBtn.addEventListener('click', () => {
  if (currentLevel < 5) {
    currentLevel++;
    levelSelect.value = currentLevel;
    winModal.classList.add('hidden');
    initGame();
  }
});

leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});
submitScoreBtn.addEventListener('click', submitScore);

filterDifficulty.addEventListener('change', () => {
  leaderboardState.page = 1;
  loadLeaderboard();
});

filterLevel.addEventListener('change', () => {
  leaderboardState.page = 1;
  loadLeaderboard();
});

searchInput.addEventListener('input', debounceSearch);

dateFromInput.addEventListener('change', () => {
  leaderboardState.page = 1;
  loadLeaderboard();
});

dateToInput.addEventListener('change', () => {
  leaderboardState.page = 1;
  loadLeaderboard();
});

refreshBtn.addEventListener('click', () => {
  leaderboardState.page = 1;
  loadLeaderboard();
});

prevPageBtn.addEventListener('click', () => {
  if (leaderboardState.page > 1) {
    leaderboardState.page--;
    loadLeaderboard();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (leaderboardState.page < leaderboardState.totalPages) {
    leaderboardState.page++;
    loadLeaderboard();
  }
});

initGame();
