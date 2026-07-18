#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Backup completo do Verdelimp ERP: banco (pg_dump) + uploads (tar) +
# cópia off-site opcional via rclone.
#
# Por que este script existe: o cron antigo fazia só o pg_dump e deixava
# tudo na própria VPS — perder a VPS significava perder banco E anexos
# (GED, XMLs de NF-e, fotos de OS). Uploads NUNCA ficavam em backup.
#
# Uso:   ./backup.sh [dir_do_app]           (padrão: /opt/verdelimp)
# Cron:  20 2 * * * /opt/verdelimp/deploy/contabo/backup.sh >> /var/log/verdelimp-backup.log 2>&1
#
# Off-site: configure um remote rclone (ex.: `rclone config` → Google Drive,
# S3, Backblaze) e defina RCLONE_REMOTE abaixo ou via ambiente.
#   RCLONE_REMOTE="gdrive:backups/verdelimp" ./backup.sh
#
# Restore (testar pelo menos 1× por trimestre!):
#   gunzip -c /opt/backups/verdelimp_YYYY-MM-DD.sql.gz | \
#     docker compose exec -T db psql -U verdelimp verdelimp_erp
#   tar -xzf /opt/backups/uploads_YYYY-MM-DD.tar.gz -C /  # restaura o volume
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${1:-/opt/verdelimp}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
RETENCAO_DIAS="${RETENCAO_DIAS:-14}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"   # vazio = sem off-site (NÃO recomendado)
DATA=$(date +%F)

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

echo "[$(date '+%F %T')] Backup do banco..."
docker compose exec -T db pg_dump -U verdelimp verdelimp_erp | gzip > "$BACKUP_DIR/verdelimp_${DATA}.sql.gz"

echo "[$(date '+%F %T')] Backup dos uploads (GED, XMLs, fotos de OS)..."
# O volume nomeado é acessado por um container efêmero — não depende do app estar de pé
docker run --rm -v verdelimp_uploads:/uploads:ro -v "$BACKUP_DIR":/backup alpine \
  tar -czf "/backup/uploads_${DATA}.tar.gz" -C / uploads

echo "[$(date '+%F %T')] Retenção local: ${RETENCAO_DIAS} dias"
find "$BACKUP_DIR" -name 'verdelimp_*.sql.gz' -mtime +"$RETENCAO_DIAS" -delete
find "$BACKUP_DIR" -name 'uploads_*.tar.gz'  -mtime +"$RETENCAO_DIAS" -delete

if [ -n "$RCLONE_REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date '+%F %T')] Cópia off-site → $RCLONE_REMOTE"
  rclone copy "$BACKUP_DIR/verdelimp_${DATA}.sql.gz" "$RCLONE_REMOTE/" --transfers 2
  rclone copy "$BACKUP_DIR/uploads_${DATA}.tar.gz"  "$RCLONE_REMOTE/" --transfers 2
  # Retenção remota (mantém o dobro da local)
  rclone delete "$RCLONE_REMOTE/" --min-age "$((RETENCAO_DIAS * 2))d" || true
else
  echo "[$(date '+%F %T')] ⚠️  SEM cópia off-site (RCLONE_REMOTE não configurado)."
  echo "    Se a VPS falhar, banco E anexos se perdem juntos. Configure:"
  echo "    apt install rclone && rclone config  → depois exporte RCLONE_REMOTE no cron."
fi

echo "[$(date '+%F %T')] OK — $(du -sh "$BACKUP_DIR" | cut -f1) em $BACKUP_DIR"
