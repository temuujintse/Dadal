#!/usr/bin/env bash
#
# .env доторх УТГАТАЙ EXPO_PUBLIC_* хувьсагчийг EAS рүү илгээнэ.
#
# ЯАГААД ХЭРЭГТЭЙ ВЭ:
#   .env нь .gitignore-т орсон. EAS build хийхдээ төслийг үүлэн рүү илгээхдээ
#   gitignore-дсон файлыг алгасдаг. Тиймээс EAS сервер дээр
#   process.env.EXPO_PUBLIC_FIREBASE_API_KEY гэх мэт бүгд undefined болно.
#
#   Үр дагавар:
#     1) src/firebase.js дэх isFirebaseConfigured === false → апп нээгдэхэд
#        "Firebase config хийгдээгүй байна" гарч, юу ч ажиллахгүй.
#     2) app.config.js дэх iOS reverse-client URL scheme нь
#        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID-аас хамаардаг ба BUILD хийх үед
#        тооцоологддог. Хувьсагч байхгүй бол Google нэвтрэлтийн native
#        тохиргоо огт орохгүй — дараа нь нэмсэн ч дахин build хийх хэрэгтэй.
#
#   EXPO_PUBLIC_ угтвартай утга нь bundle дотор ил байдаг тул нууц биш —
#   visibility=plaintext зөв сонголт. Firebase-ийн бодит хамгаалалт нь
#   Firestore Security Rules.
#
# АШИГЛАХ:
#   chmod +x scripts/eas-env-push.sh
#   ./scripts/eas-env-push.sh production
#   ./scripts/eas-env-push.sh preview
#
# macOS-ийн bash 3.2 дээр set -u нь хоосон массив дээр унадаг тул хэрэглээгүй.
set -o pipefail

ENVIRONMENT="${1:-production}"
ENV_FILE="${2:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ $ENV_FILE олдсонгүй. Төслийн үндэс хавтаснаас ажиллуулна уу." >&2
  exit 1
fi

# ── Шүүсэн түр файл бэлдэнэ ────────────────────────────────────────────────
# ЧУХАЛ: EAS нь ХООСОН утгыг татгалздаг ("Variable value can not be empty").
# Тиймээс энд зөвхөн утгатай, EXPO_PUBLIC_ угтвартай мөрүүдийг үлдээнэ.
TMP_ENV="$(mktemp "${TMPDIR:-/tmp}/eas-env.XXXXXX")"
cleanup() { rm -f "$TMP_ENV"; }
trap cleanup EXIT

declare -a NAMES=()
declare -a VALUES=()
skipped_empty=0
skipped_private=0

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"                       # Windows-ийн мөр төгсгөл
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line//[[:space:]]/}" ]] && continue
  [[ "$line" != *"="* ]] && continue

  name="${line%%=*}"
  value="${line#*=}"

  if [[ "$name" != EXPO_PUBLIC_* ]]; then
    skipped_private=$((skipped_private + 1))
    continue
  fi

  # Хашилт болон захын зайг арилгана
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  if [[ -z "$value" ]]; then
    echo "  ⊘ $name — хоосон, алгаслаа"
    skipped_empty=$((skipped_empty + 1))
    continue
  fi

  NAMES+=("$name")
  VALUES+=("$value")
  printf '%s=%s\n' "$name" "$value" >> "$TMP_ENV"
done < "$ENV_FILE"

total="${#NAMES[@]}"

echo
echo "EAS environment : $ENVIRONMENT"
echo "Эх файл         : $ENV_FILE"
echo "Илгээх          : $total хувьсагч"
[[ $skipped_empty  -gt 0 ]] && echo "Алгассан        : $skipped_empty хоосон"
[[ $skipped_private -gt 0 ]] && echo "                  $skipped_private нь EXPO_PUBLIC_ бус (клиентэд хэрэггүй)"
echo

if [[ "$total" -eq 0 ]]; then
  echo "✗ Илгээх утгатай хувьсагч алга." >&2
  exit 1
fi

for n in "${NAMES[@]}"; do echo "  · $n"; done
echo

# ── 1-р оролдлого: бүгдийг нэг дор ────────────────────────────────────────
if npx eas env:push --help >/dev/null 2>&1; then
  echo "→ eas env:push ашиглан шүүсэн жагсаалтыг илгээж байна…"
  if npx eas env:push --environment "$ENVIRONMENT" --path "$TMP_ENV"; then
    echo
    echo "✓ Дууслаа. Шалгах: npx eas env:list --environment $ENVIRONMENT"
    exit 0
  fi
  echo
  echo "⚠ env:push амжилтгүй боллоо. Хувьсагч тус бүрээр дахин оролдоно…"
  echo
fi

# ── 2-р оролдлого: нэг нэгээр нь ──────────────────────────────────────────
ok=0
failed=()
for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"
  value="${VALUES[$i]}"
  printf '  · %s … ' "$name"
  if npx eas env:create \
      --scope project \
      --environment "$ENVIRONMENT" \
      --name "$name" \
      --value "$value" \
      --visibility plaintext \
      --non-interactive \
      --force >/dev/null 2>&1; then
    echo "✓"
    ok=$((ok + 1))
  else
    echo "✗"
    failed+=("$name")
  fi
done

echo
echo "✓ $ok / $total илгээгдлээ."
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "✗ Амжилтгүй: ${failed[*]}" >&2
  echo "  Гараар: npx eas env:create --environment $ENVIRONMENT --name <НЭР> --value <УТГА> --visibility plaintext" >&2
  exit 1
fi
echo "  Шалгах: npx eas env:list --environment $ENVIRONMENT"
