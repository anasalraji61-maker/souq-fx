#!/bin/bash
set -e
echo "=========================================================="
echo "  🚀 MATRIX TRADING BOT - NETCUP VPS AUTO-INSTALLER"
echo "=========================================================="
export DEBIAN_FRONTEND=noninteractive
echo "1/4 Updating package lists..."
apt-get update -y
echo "2/4 Installing Remote Desktop (XRDP) & XFCE Desktop..."
apt-get install -y xrdp xfce4 xfce4-goodies dbus-x11 curl wget git unzip
echo "xfce4-session" > /root/.xsession
adduser xrdp ssl-cert 2>/dev/null || true
systemctl restart xrdp
systemctl enable xrdp
echo "3/4 Installing Wine environment for MetaTrader 5..."
dpkg --add-architecture i386 || true
apt-get update -y || true
apt-get install -y wine wine64 || true
mkdir -p /root/Desktop
wget -q https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5linux.se -O /root/Desktop/install_mt5.sh || true
chmod +x /root/Desktop/install_mt5.sh 2>/dev/null || true
curl -sL "https://ais-dev-pjhygmlj47ntcorhfgn63w-532419130457.europe-west2.run.app/api/bot/mql5-ea" -o /root/Desktop/MatrixAgentBridge_5056692955.mq5 || true
echo "=========================================================="
echo "  ✅ ALL DONE! REMOTE DESKTOP (RDP) IS NOW READY!"
echo "  Connect from Windows: Win + R -> mstsc -> 62.83.34.57"
echo "=========================================================="
