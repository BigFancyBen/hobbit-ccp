#!/bin/bash
# HDMI output control script
# Usage: hdmi-control.sh on|off

case "$1" in
    on)
        # Turn monitor on via DDC/CI (d6 = power mode, 1 = on)
        ddcutil setvcp d6 1 2>/dev/null || true
        ;;
    off)
        # Turn monitor off via DDC/CI (d6 = power mode, 5 = off)
        ddcutil setvcp d6 5 2>/dev/null || true
        ;;
    *)
        echo "Usage: $0 on|off"
        exit 1
        ;;
esac
