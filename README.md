# HuggingFace 实例监控面板

[![Docker Build](https://img.shields.io/badge/Docker-Build-blue)](https://hub.docker.com/repository/docker/yourusername/huggingface-monitor) [![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

一个现代化、美观的监控面板，用于监控和管理 HuggingFace Spaces 实例。通过实时数据展示、状态监控以及操作控制（如重启和重建），帮助用户高效管理自己的 HuggingFace 实例。

## 功能特性

- **实时监控**：显示 HuggingFace Spaces 实例的运行状态、CPU 使用率、内存占用、上传和下载速率等关键指标。
- **多用户支持**：支持监控多个 HuggingFace 用户的实例，并按用户分组显示。
- **操作控制**：支持对实例进行重启和重建操作（需要登录权限）。
- **主题切换**：支持浅色模式和深色模式，可根据系统设置自动切换。
- **权限管理**：通过登录系统限制操作权限，未登录用户只能查看数据，无法执行敏感操作。
- **Docker 部署**：提供 Docker 和 Docker Compose 支持，快速部署到任何支持 Docker 的环境。
- **安全性**：登录凭据通过后端 API 验证，使用临时会话 token 维护登录状态。
- **外部 API**：提供 RESTful API 接口，允许第三方应用查询实例信息和管理实例。

## 界面预览
### 未登录状态下只能查看无操作权限
![界面预览](https://github.com/ssfun/hf-space-manager/blob/main/preview/未登录.png?raw=true)
### 登录状态下支持操作
![界面预览](https://github.com/ssfun/hf-space-manager/blob/main/preview/已登录.png?raw=true)
### 支持夜间模式
![界面预览](https://github.com/ssfun/hf-space-manager/blob/main/preview/夜间模式.png?raw=true)

## 技术栈

- **前端**：HTML, CSS, JavaScript（原生实现，无外部框架依赖）
- **后端**：Node.js, Express.js
- **API 调用**：Axios（用于调用 HuggingFace REST API）
- **容器化**：Docker, Docker Compose
- **其他**：EventSource（用于实时监控数据流）

## 安装与部署

### 环境要求

- Docker 和 Docker Compose（推荐）
- 或者 Node.js 16+ 和 npm（手动部署）

### 部署方式 1：使用 Docker（推荐）

1. **拉取镜像**（或者构建镜像）

   你可以直接拉取预构建的镜像（如果已发布到 Docker Hub），或者从源代码构建镜像。

   ```bash
   # 拉取镜像（替换为实际镜像地址）
   docker pull yourusername/huggingface-monitor:latest
   ```

   或者从源代码构建：

   ```bash
   git clone https://github.com/yourusername/huggingface-monitor.git
   cd huggingface-monitor
   docker build -t huggingface-monitor .
   ```

2. **配置环境变量**

   创建一个 `.env` 文件或直接在命令中指定环境变量。以下是必要的环境变量：

   ```
   # HuggingFace 用户和 API Token 映射，格式为 username:token，多个用户用逗号分隔
   HF_USER="user1:token1,user2:token2,user3:"
   # 用于外部 API 调用的密钥
   API_KEY="your_api_key_here"
   # 登录用户名和密码
   USER_NAME="admin"
   USER_PASSWORD="secretpassword"
   ```

3. **运行容器**

   使用以下命令运行 Docker 容器：

   ```bash
   docker run -d -p 8080:8080 \
     -e HF_USER="user1:token1,user2:token2,user3:" \
     -e API_KEY="your_api_key_here" \
     -e USER_NAME="admin" \
     -e USER_PASSWORD="secretpassword" \
     --name huggingface-monitor \
     huggingface-monitor
   ```

   或者使用 Docker Compose（推荐）：

   创建 `docker-compose.yml` 文件：

   ```yaml
   version: '3'
   services:
     huggingface-monitor:
       image: huggingface-monitor:latest
       container_name: huggingface-monitor
       ports:
         - "8080:8080"
       environment:
         - HF_USER=user1:token1,user2:token2,user3:
         - API_KEY=your_api_key_here
         - USER_NAME=admin
         - USER_PASSWORD=secretpassword
       restart: unless-stopped
   ```

   然后运行：

   ```bash
   docker-compose up -d
   ```

4. **访问应用**

   打开浏览器，访问 `http://localhost:8080` 查看监控面板。

### 部署方式 2：手动部署（Node.js）

1. **克隆代码库**

   ```bash
   git clone https://github.com/yourusername/huggingface-monitor.git
   cd huggingface-monitor
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**

   创建 `.env` 文件或直接设置环境变量：

   ```bash
   export HF_USER="user1:token1,user2:token2,user3:"
   export API_KEY="your_api_key_here"
   export USER_NAME="admin"
   export USER_PASSWORD="secretpassword"
   ```

4. **启动应用**

   ```bash
   npm start
   ```

5. **访问应用**

   打开浏览器，访问 `http://localhost:8080` 查看监控面板。

## 使用方法

1. **查看监控数据**

   访问主页后，系统会自动加载所有配置的 HuggingFace 实例，并分组显示每个用户的 Spaces。默认情况下，用户可以查看实例的运行状态和性能指标（如 CPU、内存、上传/下载速率）。

2. **登录以执行操作**

   - 点击右上角的“登录”按钮，输入用户名和密码（通过环境变量 `USER_NAME` 和 `USER_PASSWORD` 配置）。
   - 登录成功后，实例卡片将显示“重启”和“重建”按钮，用于管理实例。
   - 点击右上角的“登出”按钮可退出登录状态。

3. **主题切换**

   使用右上角的主题切换按钮，可以在“系统默认”、“浅色模式”和“深色模式”之间切换。

## 环境变量说明

| 变量名           | 描述                                      | 默认值       | 必填 |
|------------------|-------------------------------------------|--------------|------|
| `HF_USER`        | HuggingFace 用户和 API Token 映射，格式为 `username:token`，多个用逗号分隔 | 无           | 是   |
| `API_KEY`        | 外部 API 访问密钥                        | 无           | 否   |
| `USER_NAME`      | 监控面板登录用户名                       | `admin`      | 否   |
| `USER_PASSWORD`  | 监控面板登录密码                         | `password`   | 否   |
| `PORT`           | 应用运行端口                             | `8080`       | 否   |

**注意**：为安全起见，建议在生产环境中自定义 `USER_NAME` 和 `USER_PASSWORD`，避免使用默认值。

## 外部 API 使用方法

本项目提供了一组 RESTful API 接口，允许第三方应用通过 API 查询 HuggingFace 实例信息和管理实例。所有外部 API 请求需要提供 `API_KEY`（通过环境变量配置）作为认证令牌。

### API 基础信息

- **基础 URL**：`http://<your-server>:8080/api/v1`
- **认证方式**：在请求头中设置 `Authorization: Bearer <API_KEY>`
- **内容类型**：`Content-Type: application/json`

### API 端点

#### 1. 获取用户实例列表

- **URL**：`/info/:token`
- **方法**：`GET`
- **描述**：获取指定 HuggingFace 用户的实例列表。
- **路径参数**：
  - `token`：HuggingFace API Token，用于认证和获取用户数据。
- **请求头**：
  - `Authorization: Bearer <API_KEY>`
- **成功响应**：
  - 状态码：`200 OK`
  - 示例响应体：
    ```json
    {
      "spaces": [
        "user1/space1",
        "user1/space2"
      ],
      "total": 2
    }
    ```
- **错误响应**：
  - 状态码：`401 Unauthorized`（无效的 API 密钥）
  - 状态码：`500 Internal Server Error`（获取数据失败）

#### 2. 获取实例详细信息

- **URL**：`/info/:token/:spaceId`
- **方法**：`GET`
- **描述**：获取指定实例的详细信息。
- **路径参数**：
  - `token`：HuggingFace API Token，用于认证。
  - `spaceId`：实例的完整 ID，格式为 `username/space-name`。
- **请求头**：
  - `Authorization: Bearer <API_KEY>`
- **成功响应**：
  - 状态码：`200 OK`
  - 示例响应体：
    ```json
    {
      "id": "user1/space1",
      "status": "running",
      "last_modified": "2023-10-01T12:00:00Z",
      "created_at": "2023-09-01T12:00:00Z",
      "sdk": "gradio",
      "tags": ["demo", "ai"],
      "private": false
    }
    ```
- **错误响应**：
  - 状态码：`401 Unauthorized`（无效的 API 密钥）
  - 状态码：`404 Not Found`（实例未找到）
  - 状态码：`500 Internal Server Error`（获取数据失败）

#### 3. 重启实例

- **URL**：`/action/:token/:spaceId/restart`
- **方法**：`POST`
- **描述**：重启指定的 HuggingFace 实例。
- **路径参数**：
  - `token`：HuggingFace API Token，用于认证。
  - `spaceId`：实例的完整 ID，格式为 `username/space-name`。
- **请求头**：
  - `Authorization: Bearer <API_KEY>`
- **成功响应**：
  - 状态码：`200 OK`
  - 示例响应体：
    ```json
    {
      "success": true,
      "message": "Space user1/space1 重启成功"
    }
    ```
- **错误响应**：
  - 状态码：`401 Unauthorized`（无效的 API 密钥）
  - 状态码：`500 Internal Server Error`（操作失败）

#### 4. 重建实例

- **URL**：`/action/:token/:spaceId/rebuild`
- **方法**：`POST`
- **描述**：重建指定的 HuggingFace 实例（触发工厂重启）。
- **路径参数**：
  - `token`：HuggingFace API Token，用于认证。
  - `spaceId`：实例的完整 ID，格式为 `username/space-name`。
- **请求头**：
  - `Authorization: Bearer <API_KEY>`
- **成功响应**：
  - 状态码：`200 OK`
  - 示例响应体：
    ```json
    {
      "success": true,
      "message": "Space user1/space1 重建成功"
    }
    ```
- **错误响应**：
  - 状态码：`401 Unauthorized`（无效的 API 密钥）
  - 状态码：`500 Internal Server Error`（操作失败）

### API 使用示例

以下是使用 `curl` 调用外部 API 的示例。假设你的服务器地址为 `http://localhost:8080`，`API_KEY` 为 `my-api-key`，HuggingFace API Token 为 `hf_xxx123`。

#### 获取用户实例列表

```bash
curl -X GET "http://localhost:8080/api/v1/info/hf_xxx123" \
  -H "Authorization: Bearer my-api-key"
```

#### 获取实例详情

```bash
curl -X GET "http://localhost:8080/api/v1/info/hf_xxx123/user1/space1" \
  -H "Authorization: Bearer my-api-key"
```

#### 重启实例

```bash
curl -X POST "http://localhost:8080/api/v1/action/hf_xxx123/user1/space1/restart" \
  -H "Authorization: Bearer my-api-key"
```

#### 重建实例

```bash
curl -X POST "http://localhost:8080/api/v1/action/hf_xxx123/user1/space1/rebuild" \
  -H "Authorization: Bearer my-api-key"
```

### 注意事项

- **安全性**：确保 `API_KEY` 仅提供给可信任的第三方，避免泄露。
- **错误处理**：API 调用可能因 HuggingFace 服务限制或网络问题而失败，建议在调用时添加重试机制。
- **频率限制**：避免过于频繁地调用 API，以免触发 HuggingFace 的速率限制。

## 安全说明

- **登录验证**：登录凭据通过后端 API 验证，并使用临时会话 token（有效期 24 小时）维护登录状态。
- **会话管理**：会话 token 存储在内存中，服务器重启会导致会话丢失（生产环境中建议使用数据库或 Redis）。
- **权限控制**：只有登录用户才能执行重启和重建操作，未登录用户只能查看监控数据。
- **外部 API 安全**：外部 API 调用需要提供有效的 `API_KEY`，确保只有授权用户才能访问。

## 贡献指南

欢迎对本项目进行贡献！如果你有任何改进建议或 bug 反馈，请按照以下步骤操作：

1. **提交 Issue**：在 GitHub Issue 页面描述你的问题或建议。
2. **提交 Pull Request**：
   - Fork 或克隆本仓库。
   - 创建一个新的分支进行开发：`git checkout -b feature/your-feature-name`。
   - 提交你的更改：`git commit -m "描述你的更改"`。
   - 推送代码：`git push origin feature/your-feature-name`。
   - 创建 Pull Request，等待审核与合并。

## 许可证

本项目遵循 [MIT 许可证](./LICENSE)，你可以自由使用、修改和分发代码。
