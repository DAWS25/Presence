#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd "$DIR/.."
echo "script [$0] started"
#

if ! command -v node &> /dev/null; then
  NVM_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"
  # Setup nodejs using nvm
  echo "Node.js not found, installing..."
  curl -o- $NVM_URL | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install --lts
  ln -s "$(which node)" "$HOME/.local/bin/node"
fi


#
popd
echo "script [$0] completed"