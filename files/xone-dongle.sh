#!/bin/bash
# Toggle Xbox Wireless Adapter USB device on/off
# When off, paired controllers disconnect and save battery
# When on, paired controllers auto-reconnect within ~2s
# Usage: xone-dongle.sh on|off

VENDOR="045e"
STATE_FILE="/tmp/xone-dongle-device"

find_dongle() {
  for dev in /sys/bus/usb/devices/[0-9]*; do
    [ -f "$dev/idVendor" ] || continue
    [ "$(cat "$dev/idVendor" 2>/dev/null)" = "$VENDOR" ] || continue
    pid=$(cat "$dev/idProduct" 2>/dev/null)
    if [ "$pid" = "02e6" ] || [ "$pid" = "02fe" ]; then
      echo "$dev"
      return 0
    fi
  done
  return 1
}

case "$1" in
  on)
    # Try saved path first (attributes may be unreadable when unauthorized)
    if [ -f "$STATE_FILE" ]; then
      dev=$(cat "$STATE_FILE")
    else
      dev=$(find_dongle)
    fi
    if [ -n "$dev" ] && [ -f "$dev/authorized" ]; then
      echo 1 > "$dev/authorized"
    else
      echo "No Xbox Wireless Adapter found" >&2
      exit 1
    fi
    ;;
  off)
    dev=$(find_dongle)
    if [ -n "$dev" ]; then
      echo "$dev" > "$STATE_FILE"
      echo 0 > "$dev/authorized"
    else
      echo "No Xbox Wireless Adapter found" >&2
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 on|off" >&2
    exit 1
    ;;
esac
