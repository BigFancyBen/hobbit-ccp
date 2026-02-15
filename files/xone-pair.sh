#!/bin/bash
# Toggle Xbox Wireless Adapter pairing mode via xone driver
# Usage: xone-pair.sh [0|1]
# Exit codes: 0 = success, 1 = no dongle found, 2 = write failed

# Wait up to 5s for the sysfs pairing file to appear (driver may still be binding)
for i in $(seq 1 10); do
  PATHS=(/sys/bus/usb/drivers/xone-dongle/*/pairing)
  [ -e "${PATHS[0]}" ] && break
  sleep 0.5
done

if [ ! -e "${PATHS[0]}" ]; then
  echo "No xone dongle found in sysfs" >&2
  exit 1
fi

VALUE="${1:-1}"
for p in "${PATHS[@]}"; do
  # Retry write up to 5 times — sysfs may not be ready immediately after driver bind
  written=false
  for attempt in $(seq 1 5); do
    if echo "$VALUE" > "$p" 2>/dev/null; then
      written=true
      break
    fi
    sleep 0.5
  done
  if [ "$written" = false ]; then
    echo "Failed to write to $p" >&2
    exit 2
  fi
done
