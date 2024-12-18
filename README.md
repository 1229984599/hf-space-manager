# HF Space Manager

HF Space Manager 是一个用于管理 Hugging Face Spaces 的 Web 应用程序。它提供了直观的界面和API 接口，让你能够方便地查看和管理多个账号下的所有 Spaces。

## 功能特点

- 🚀 支持多个 HuggingFace 账号管理
- 📊 实时显示 Spaces 状态
- 🔄 支持重启和重建操作
- 🔑 安全的登录认证
- 🎯 简洁的用户界面
- 📱 响应式设计，支持移动端
- 🔌 RESTful API 支持
- 💾 数据缓存机制

## 快速开始

### 环境要求

- Python 3.9+
- Docker (可选)

### 安装

1. 克隆仓库
```bash
git clone https://github.com/ssfun/hf-space-manager.git
cd hf-space-manager
```

2. 安装依赖
```bash
pip install Flask python-dotenv huggingface_hub requests gunicorn
```

3. 配置环境变量
创建 `.env` 文件：
```env
USERNAME=your_admin_username
PASSWORD=your_admin_password
HF_TOKENS=token1,token2,token3
API_KEY=your_api_key
```

### 运行

**直接运行：**
```bash
python app.py
```

**使用 Docker：**
```bash
docker run -d \
    --name hfspace-manager \
    -p 5000:5000 \
    -e USERNAME=your_username \
    -e PASSWORD=your_password \
    -e HF_TOKENS=token1,token2,token3 \
    -e API_KEY=your_api_key \
    sfun/hfspace:latest
```

## API 文档

### 认证
所有 API 请求都需要在 header 中包含 API key：
```
Authorization: Bearer your_api_key
```

### 端点

#### 1. 获取所有 Spaces
```bash
GET /api/v1/space
Content-Type: application/json
Authorization: Bearer API_KEY

{
    "token": "HF_TOKEN"
}
```

#### 2. 获取特定 Space 信息
```bash
GET /api/v1/space/{space_id}
Content-Type: application/json
Authorization: Bearer API_KEY

{
    "token": "HF_TOKEN"
}
```

#### 3. 重启 Space
```bash
POST /api/v1/{space_id}/restart
Content-Type: application/json
Authorization: Bearer API_KEY

{
    "token": "HF_TOKEN"
}
```

#### 4. 重建 Space
```bash
POST /api/v1/{space_id}/rebuild
Content-Type: application/json
Authorization: Bearer API_KEY

{
    "token": "HF_TOKEN"
}
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| USERNAME | 管理员用户名 | 是 |
| PASSWORD | 管理员密码 | 是 |
| HF_TOKENS | HuggingFace tokens（逗号分隔） | 是 |
| API_KEY | API访问密钥 | 是 |

###缓存配置

- 默认缓存时间：5 分钟
- 后台自动更新间隔：5 分钟

## 开发

### 本地开发
```bash
# 安装开发依赖
pip install Flask python-dotenv huggingface_hub requests gunicorn

# 运行开发服务器
python app.py
```

## 贡献

欢迎 Star 和 Fork 后自行修改！

## 许可证

本项目采用 [MIT 许可证](https://opensource.org/license/mit)。

## 作者

[ssfun](https://github.com/ssfun)

## 致谢

- [Hugging Face](https://huggingface.co/) - 提供优秀的 API 和服务
- [Flask](https://flask.palletsprojects.com/) - Web 框架支持
