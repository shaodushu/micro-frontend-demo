#!/bin/bash
echo "=== 启动所有服务 ==="

# OAuth2 服务端 (端口 9000)
echo "[server] 启动 OAuth2 服务端..."
cd "$(dirname "$0")/apps/server" && node index.js &
sleep 1

# 子应用 (端口 8001)
echo "[slave] 启动子应用..."
cd "$(dirname "$0")/apps/slave" && PORT=8001 pnpm dev &
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:8001/slave/ 2>/dev/null; then
    echo "[slave] ✓ 子应用已启动 (端口 8001)"
    break
  fi
  sleep 2
done

# 主应用 (端口 8002)
echo "[master] 启动主应用..."
cd "$(dirname "$0")/apps/master" && PORT=8002 pnpm dev &
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:8002/ 2>/dev/null; then
    echo "[master] ✓ 主应用已启动 (端口 8002)"
    break
  fi
  sleep 2
done

echo ""
echo "=== 所有服务已启动 ==="
echo "主应用:    http://localhost:8002"
echo "子应用:    http://localhost:8001/slave/"
echo "OAuth2:    http://localhost:9000/oauth/authorize"
