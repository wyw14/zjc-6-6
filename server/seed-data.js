const http = require('http');

const testData = [
  { time: 35, playerName: '闪电侠', difficulty: 'easy', level: 1, moves: 10 },
  { time: 42, playerName: '小明', difficulty: 'easy', level: 1, moves: 12 },
  { time: 58, playerName: '小红', difficulty: 'easy', level: 1, moves: 15 },
  { time: 65, playerName: '游戏达人', difficulty: 'easy', level: 2, moves: 14 },
  { time: 72, playerName: '新手玩家', difficulty: 'easy', level: 2, moves: 18 },
  { time: 88, playerName: '张三', difficulty: 'medium', level: 1, moves: 20 },
  { time: 95, playerName: '李四', difficulty: 'medium', level: 1, moves: 22 },
  { time: 102, playerName: '王五', difficulty: 'medium', level: 2, moves: 25 },
  { time: 110, playerName: '赵六', difficulty: 'medium', level: 3, moves: 28 },
  { time: 120, playerName: '高手', difficulty: 'hard', level: 1, moves: 30 },
  { time: 135, playerName: '挑战者', difficulty: 'hard', level: 2, moves: 35 },
  { time: 150, playerName: '大师', difficulty: 'hard', level: 3, moves: 40 },
];

function postScore(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 6035,
      path: '/api/score',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  for (const data of testData) {
    try {
      const result = await postScore(data);
      console.log(`添加成功: ${data.playerName} - ${data.difficulty} 第${data.level}关`);
    } catch (err) {
      console.error(`添加失败: ${data.playerName}`, err.message);
    }
  }
  console.log('所有测试数据添加完成！');
}

main();
