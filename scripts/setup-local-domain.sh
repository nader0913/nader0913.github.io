#!/bin/bash

# Setup script for local domain development
# This configures pluma.local to work like a real hosted domain

echo "🔧 Setting up local domain for Pluma development"
echo "================================================"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  This script needs sudo access to modify /etc/hosts"
  echo ""
  echo "Please run with sudo:"
  echo "  sudo bash scripts/setup-local-domain.sh"
  exit 1
fi

echo "Step 1: Adding entries to /etc/hosts"
echo "-------------------------------------"

# Backup /etc/hosts
cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up /etc/hosts"

# Add pluma.local entries
HOSTS_ENTRIES="
# Pluma local development
127.0.0.1 pluma.local
127.0.0.1 www.pluma.local
127.0.0.1 nader0913.pluma.local
127.0.0.1 api.pluma.local
"

# Check if entries already exist
if grep -q "pluma.local" /etc/hosts; then
  echo "⚠️  pluma.local entries already exist in /etc/hosts"
  echo "   Skipping..."
else
  echo "$HOSTS_ENTRIES" >> /etc/hosts
  echo "✅ Added pluma.local to /etc/hosts"
fi

echo ""
echo "Step 2: Flushing DNS cache"
echo "-------------------------"

# Flush DNS cache (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  dscacheutil -flushcache
  killall -HUP mDNSResponder
  echo "✅ DNS cache flushed (macOS)"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  systemctl restart systemd-resolved 2>/dev/null || service network-manager restart 2>/dev/null || true
  echo "✅ DNS cache flushed (Linux)"
fi

echo ""
echo "================================================"
echo "✅ Setup complete!"
echo ""
echo "Your local domains are now available:"
echo "  • http://pluma.local:8080 (main site)"
echo "  • http://nader0913.pluma.local:8080 (user subdomain)"
echo "  • http://api.pluma.local:3000 (API server)"
echo ""
echo "Next steps:"
echo "  1. Start the API server: npm run api"
echo "  2. Start the web server: npm run dev"
echo "  3. Visit http://pluma.local:8080"
echo ""
echo "Note: The servers will still run on localhost ports,"
echo "but you'll access them via pluma.local domain."
echo "================================================"
