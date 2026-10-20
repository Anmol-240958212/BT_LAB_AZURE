#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.runlogs"

for name in frontend product fd auth; do
  pid_file="$LOG_DIR/$name.pid"
  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file")"
    if [[ "$pid" =~ ^[0-9]+$ ]]; then
      kill "$pid" 2>/dev/null || true
      echo "Stopped $name (PID $pid)."
    fi
    rm -f "$pid_file"
  fi
done

cd "$ROOT_DIR"
if command -v docker >/dev/null 2>&1; then
  docker compose stop mysql kafka >/dev/null
  echo "Stopped MySQL and Kafka containers."
fi
