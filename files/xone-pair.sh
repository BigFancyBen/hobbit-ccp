#!/bin/bash
# Toggle Xbox Wireless Adapter pairing mode via xone driver
# Usage: xone-pair.sh [0|1]
echo "${1:-1}" > /sys/bus/usb/drivers/xone-dongle/*/pairing 2>/dev/null || true
