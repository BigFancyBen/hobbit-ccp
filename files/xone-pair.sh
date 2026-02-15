#!/bin/bash
# Toggle Xbox Wireless Adapter pairing mode via xone driver
# Usage: xone-pair.sh [0|1]
# Exit codes: 0 = success, 1 = no dongle found, 2 = write failed

PATHS=(/sys/bus/usb/drivers/xone-dongle/*/pairing)

if [ ! -e "${PATHS[0]}" ]; then
  echo "No xone dongle found in sysfs" >&2
  exit 1
fi

VALUE="${1:-1}"
for p in "${PATHS[@]}"; do
  if ! echo "$VALUE" > "$p" 2>&1; then
    echo "Failed to write to $p" >&2
    exit 2
  fi
done
