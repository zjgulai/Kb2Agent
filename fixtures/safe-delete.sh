#!/usr/bin/env bash
set -euo pipefail

target_collection="${DELETE_COLLECTION:-}"
confirm_delete="${CONFIRM_DELETE:-}"
backup_receipt="${BACKUP_RECEIPT:-}"

if [[ -z "${target_collection}" || -z "${backup_receipt}" ]]; then
  echo "blocked: explicit target and backup receipt are required" >&2
  exit 2
fi

echo "DRY RUN: would delete ${target_collection}; backup=${backup_receipt}"

if [[ "${confirm_delete}" != "delete:${target_collection}" ]]; then
  echo "blocked: confirmation mismatch" >&2
  exit 3
fi

echo "fixture only: no deletion command is executed"
echo "rollback: restore the recorded snapshot and switch reads to the previous collection"
