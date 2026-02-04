#!/bin/bash
# Hobbit Mini PC Setup Script
# Run this on the hobbit machine with: bash setup-hobbit.sh

set -e

echo "=== Hobbit Mini PC Setup ==="
echo ""

# Check if running as hobbit user
if [ "$USER" != "hobbit" ]; then
    echo "Warning: Expected user 'hobbit', running as '$USER'"
fi

echo ">>> Updating system packages..."
sudo apt update
sudo apt upgrade -y

echo ">>> Installing base packages..."
sudo apt install -y \
    avahi-daemon \
    ca-certificates \
    curl \
    ufw \
    git

echo ">>> Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 5353/udp  # mDNS
sudo ufw allow 1883/tcp  # MQTT
sudo ufw --force enable

echo ">>> Installing Docker..."
# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add hobbit to docker group
sudo usermod -aG docker hobbit

echo ">>> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo ">>> Installing X11 and Moonlight..."
sudo apt install -y xserver-xorg x11-xserver-utils xinit

# Add Moonlight PPA
sudo add-apt-repository -y ppa:nickalvarezdev/moonlight-qt
sudo apt update
sudo apt install -y moonlight-qt

# Allow any user to start X
sudo bash -c 'echo "allowed_users=anybody" > /etc/X11/Xwrapper.config'

echo ">>> Setting up directories..."
mkdir -p ~/hobbit/{bridge,web,mosquitto,zigbee2mqtt}

echo ">>> Configuring sudo for power commands..."
echo "hobbit ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot" | sudo tee /etc/sudoers.d/hobbit-power
sudo chmod 440 /etc/sudoers.d/hobbit-power

echo ">>> Enabling services..."
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon

echo ""
echo "=== Base setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Log out and back in (for docker group)"
echo "2. Pair Moonlight with your gaming PC:"
echo "   xinit /usr/bin/moonlight-qt -- :0"
echo "3. Run deploy script to copy config files"
echo ""
