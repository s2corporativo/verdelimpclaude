#!/usr/bin/env bash
# Compatibilidade: o instalador legado foi substituído pelo bootstrap v2.3.
# O novo fluxo não gera nem imprime segredos. Prepare .env.production e
# .env.ops na VPS antes de executá-lo.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/install-v23.sh" "$@"
