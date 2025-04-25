const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 8080;

// 启用 JSON 和 URL-encoded 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 从环境变量获取 HuggingFace 用户名和对应的 API Token 映射
const userTokenMapping = {};
const usernames = [];
const hfUserConfig = process.env.HF_USER || '';
if (hfUserConfig) {
  hfUserConfig.split(',').forEach(pair => {
    const parts = pair.split(':').map(part => part.trim());
    const username = parts[0];
    const token = parts[1] || '';
    if (username) {
      usernames.push(username);
      if (token) {
        userTokenMapping[username] = token;
      }
    }
  });
}

// 从环境变量获取登录凭据
const ADMIN_USERNAME = process.env.USER_NAME || 'admin';
const ADMIN_PASSWORD = process.env.USER_PASSWORD || 'password';

// 存储会话 token 的简单内存数据库（生产环境中应使用数据库或 Redis）
const sessions = new Map();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时超时

// 缓存管理
class SpaceCache {
  constructor() {
    this.spaces = {};
    this.lastUpdate = null;
  }

  updateAll(spacesData) {
    this.spaces = spacesData.reduce((acc, space) => ({ ...acc, [space.repo_id]: space }), {});
    this.lastUpdate = Date.now();
  }

  getAll() {
    return Object.values(this.spaces);
  }

  isExpired(expireMinutes = 5) {
    if (!this.lastUpdate) return true;
    return (Date.now() - this.lastUpdate) > (expireMinutes * 60 * 1000);
  }
}

const spaceCache = new SpaceCache();

// 提供静态文件（前端文件）
app.use(express.static(path.join(__dirname, 'public')));

// 提供配置信息的 API 接口
app.get('/api/config', (req, res) => {
  res.json({ usernames: usernames.join(',') });
});

// 登录 API 接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // 生成一个随机 token 作为会话标识
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + SESSION_TIMEOUT;
    sessions.set(token, { username, expiresAt });
    console.log(`用户 ${username} 登录成功，生成 token: ${token.slice(0, 8)}...`);
    res.json({ success: true, token });
  } else {
    console.log(`用户 ${username} 登录失败，凭据无效`);
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// 验证登录状态 API 接口
app.post('/api/verify-token', (req, res) => {
  const { token } = req.body;
  const session = sessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    res.json({ success: true, message: 'Token 有效' });
  } else {
    if (session) {
      sessions.delete(token); // 删除过期的 token
      console.log(`Token ${token.slice(0, 8)}... 已过期，已删除`);
    }
    res.status(401).json({ success: false, message: 'Token 无效或已过期' });
  }
});

// 登出 API 接口
app.post('/api/logout', (req, res) => {
  const { token } = req.body;
  sessions.delete(token);
  console.log(`Token ${token.slice(0, 8)}... 已手动登出`);
  res.json({ success: true, message: '登出成功' });
});

// 中间件：验证请求中的 token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供有效的认证令牌' });
  }
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    req.session = session;
    next();
  } else {
    if (session) {
      sessions.delete(token); // 删除过期的 token
      console.log(`Token ${token.slice(0, 8)}... 已过期，拒绝访问`);
    }
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
};

// 获取所有 spaces 列表（包括私有）
app.get('/api/proxy/spaces', async (req, res) => {
  try {
    if (!spaceCache.isExpired()) {
      console.log('从缓存获取 Spaces 数据');
      // 从缓存返回的数据也需要过滤掉 token 字段
      const cachedSpaces = spaceCache.getAll().map(space => {
        const { token, ...safeSpace } = space; // 移除 token 字段
        return safeSpace;
      });
      return res.json(cachedSpaces);
    }

    const allSpaces = [];
    for (const username of usernames) {
      const token = userTokenMapping[username];
      if (!token) {
        console.warn(`用户 ${username} 没有配置 API Token，将尝试无认证访问公开数据`);
      }

      try {
        // 调用 HuggingFace API 获取 Spaces 列表
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await axios.get(`https://huggingface.co/api/spaces?author=${username}`, { headers });
        const spaces = response.data;
        console.log(`获取到 ${spaces.length} 个 Spaces for ${username}`);

        for (const space of spaces) {
          try {
            // 获取 Space 详细信息
            const spaceInfoResponse = await axios.get(`https://huggingface.co/api/spaces/${space.id}`, { headers });
            const spaceInfo = spaceInfoResponse.data;
            const spaceRuntime = spaceInfo.runtime || {};

            allSpaces.push({
              repo_id: spaceInfo.id,
              name: spaceInfo.cardData?.title || spaceInfo.id.split('/')[1],
              owner: spaceInfo.author,
              username: username,
              url: `https://${spaceInfo.author}-${spaceInfo.id.split('/')[1]}.hf.space`,
              status: spaceRuntime.stage || 'unknown',
              last_modified: spaceInfo.lastModified || 'unknown',
              created_at: spaceInfo.createdAt || 'unknown',
              sdk: spaceInfo.sdk || 'unknown',
              tags: spaceInfo.tags || [],
              private: spaceInfo.private || false,
              app_port: spaceInfo.cardData?.app_port || 'unknown'
            });
          } catch (error) {
            console.error(`处理 Space ${space.id} 失败:`, error.message);
          }
        }
      } catch (error) {
        console.error(`获取 Spaces 列表失败 for ${username}:`, error.message);
      }
    }

    allSpaces.sort((a, b) => a.name.localeCompare(b.name));
    spaceCache.updateAll(allSpaces);
    console.log(`总共获取到 ${allSpaces.length} 个 Spaces`);
    res.json(allSpaces);
  } catch (error) {
    console.error(`代理获取 spaces 列表失败:`, error.message);
    res.status(500).json({ error: '获取 spaces 列表失败', details: error.message });
  }
});

// 代理重启 Space（需要认证）
app.post('/api/proxy/restart/:repoId(*)', authenticateToken, async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log(`尝试重启 Space: ${repoId}`);
    const spaces = spaceCache.getAll();
    const space = spaces.find(s => s.repo_id === repoId);
    if (!space || !space.token) {
      console.error(`Space ${repoId} 未找到或无 Token 配置`);
      return res.status(404).json({ error: 'Space 未找到或无 Token 配置' });
    }

    const headers = { 'Authorization': `Bearer ${space.token}`, 'Content-Type': 'application/json' };
    const response = await axios.post(`https://huggingface.co/api/spaces/${repoId}/restart`, {}, { headers });
    console.log(`重启 Space ${repoId} 成功，状态码: ${response.status}`);
    res.json({ success: true, message: `Space ${repoId} 重启成功` });
  } catch (error) {
    console.error(`重启 space 失败 (${req.params.repoId}):`, error.message);
    if (error.response) {
      console.error(`状态码: ${error.response.status}, 响应数据:`, error.response.data);
      res.status(error.response.status || 500).json({ error: '重启 space 失败', details: error.response.data?.message || error.message });
    } else {
      res.status(500).json({ error: '重启 space 失败', details: error.message });
    }
  }
});

// 代理重建 Space（需要认证）
app.post('/api/proxy/rebuild/:repoId(*)', authenticateToken, async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log(`尝试重建 Space: ${repoId}`);
    const spaces = spaceCache.getAll();
    const space = spaces.find(s => s.repo_id === repoId);
    if (!space || !space.token) {
      console.error(`Space ${repoId} 未找到或无 Token 配置`);
      return res.status(404).json({ error: 'Space 未找到或无 Token 配置' });
    }

    const headers = { 'Authorization': `Bearer ${space.token}`, 'Content-Type': 'application/json' };
    // 将 factory_reboot 参数作为查询参数传递，而非请求体
    const response = await axios.post(
      `https://huggingface.co/api/spaces/${repoId}/restart?factory=true`,
      {},
      { headers }
    );
    console.log(`重建 Space ${repoId} 成功，状态码: ${response.status}`);
    res.json({ success: true, message: `Space ${repoId} 重建成功` });
  } catch (error) {
    console.error(`重建 space 失败 (${req.params.repoId}):`, error.message);
    if (error.response) {
      console.error(`状态码: ${error.response.status}, 响应数据:`, error.response.data);
      res.status(error.response.status || 500).json({ error: '重建 space 失败', details: error.response.data?.message || error.message });
    } else {
      res.status(500).json({ error: '重建 space 失败', details: error.message });
    }
  }
});

// 外部 API 服务（类似于 Flask 的 /api/v1）
app.get('/api/v1/info/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_KEY) {
      return res.status(401).json({ error: '无效的 API 密钥' });
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const userInfoResponse = await axios.get('https://huggingface.co/api/whoami-v2', { headers });
    const username = userInfoResponse.data.name;
    const spacesResponse = await axios.get(`https://huggingface.co/api/spaces?author=${username}`, { headers });
    const spaces = spacesResponse.data;
    const spaceList = [];

    for (const space of spaces) {
      try {
        const spaceInfoResponse = await axios.get(`https://huggingface.co/api/spaces/${space.id}`, { headers });
        spaceList.push(spaceInfoResponse.data.id);
      } catch (error) {
        console.error(`获取 Space 信息失败 (${space.id}):`, error.message);
      }
    }

    res.json({ spaces: spaceList, total: spaceList.length });
  } catch (error) {
    console.error(`获取 spaces 列表失败 (外部 API):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/info/:token/:spaceId(*)', async (req, res) => {
  try {
    const { token, spaceId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_KEY) {
      return res.status(401).json({ error: '无效的 API 密钥' });
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const spaceInfoResponse = await axios.get(`https://huggingface.co/api/spaces/${spaceId}`, { headers });
    const spaceInfo = spaceInfoResponse.data;
    const spaceRuntime = spaceInfo.runtime || {};

    res.json({
      id: spaceInfo.id,
      status: spaceRuntime.stage || 'unknown',
      last_modified: spaceInfo.lastModified || null,
      created_at: spaceInfo.createdAt || null,
      sdk: spaceInfo.sdk || 'unknown',
      tags: spaceInfo.tags || [],
      private: spaceInfo.private || false
    });
  } catch (error) {
    console.error(`获取 space 信息失败 (外部 API):`, error.message);
    res.status(error.response?.status || 404).json({ error: error.message });
  }
});

app.post('/api/v1/action/:token/:spaceId(*)/restart', async (req, res) => {
  try {
    const { token, spaceId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_KEY) {
      return res.status(401).json({ error: '无效的 API 密钥' });
    }

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    await axios.post(`https://huggingface.co/api/spaces/${spaceId}/restart`, {}, { headers });
    res.json({ success: true, message: `Space ${spaceId} 重启成功` });
  } catch (error) {
    console.error(`重启 space 失败 (外部 API):`, error.message);
    res.status(error.response?.status || 500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/action/:token/:spaceId(*)/rebuild', async (req, res) => {
  try {
    const { token, spaceId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_KEY) {
      return res.status(401).json({ error: '无效的 API 密钥' });
    }

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    console.log(`外部 API 发送重建请求，spaceId: ${spaceId}`);
    // 将 factory_reboot 参数作为查询参数传递，而非请求体
    const response = await axios.post(
      `https://huggingface.co/api/spaces/${spaceId}/restart?factory=true`,
      {},
      { headers }
    );
    console.log(`外部 API 重建 Space ${spaceId} 成功，状态码: ${response.status}`);
    res.json({ success: true, message: `Space ${spaceId} 重建成功` });
  } catch (error) {
    console.error(`重建 space 失败 (外部 API):`, error.message);
    if (error.response) {
      console.error(`状态码: ${error.response.status}, 响应数据:`, error.response.data);
      res.status(error.response.status || 500).json({ success: false, error: error.response.data?.message || error.message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 代理 HuggingFace API：获取实时监控数据（SSE）
app.get('/api/proxy/live-metrics/:username/:instanceId', async (req, res) => {
  try {
    const { username, instanceId } = req.params;
    const url = `https://api.hf.space/v1/${username}/${instanceId}/live-metrics/sse`;

    // 检查实例状态，决定是否继续请求
    const spaces = spaceCache.getAll();
    const space = spaces.find(s => s.repo_id === `${username}/${instanceId}`);
    if (!space) {
      console.log(`实例 ${username}/${instanceId} 未找到，不尝试获取监控数据`);
      return res.status(404).json({ error: '实例未找到，无法获取监控数据' });
    }
    if (space.status.toLowerCase() !== 'running') {
      console.log(`实例 ${username}/${instanceId} 状态为 ${space.status}，不尝试获取监控数据`);
      return res.status(400).json({ error: '实例未运行，无法获取监控数据' });
    }

    const token = userTokenMapping[username];
    let headers = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios({
      method: 'get',
      url,
      headers,
      responseType: 'stream',
      timeout: 10000
    });

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error(`代理获取直播监控数据失败 (${req.params.username}/${req.params.instanceId}):`, error.message);
    res.status(error.response?.status || 500).json({ error: '获取监控数据失败', details: error.message });
  }
});

// 处理其他请求，重定向到 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 定期清理过期的会话
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
      console.log(`Token ${token.slice(0, 8)}... 已过期，自动清理`);
    }
  }
}, 60 * 60 * 1000); // 每小时清理一次

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`User configurations:`, usernames.map(user => `${user}: ${userTokenMapping[user] ? 'Token Configured' : 'No Token'}`).join(', ') || 'None');
  console.log(`Admin login enabled: Username=${ADMIN_USERNAME}, Password=${ADMIN_PASSWORD ? 'Configured' : 'Not Configured'}`);
});
