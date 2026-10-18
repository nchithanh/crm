const ONES = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const TENS = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

function twoDigits(n: number): string {
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t === 0) return ONES[o];
  if (t === 1) {
    if (o === 0) return "mười";
    if (o === 5) return "mười lăm";
    return `mười ${ONES[o]}`;
  }
  if (o === 0) return TENS[t];
  if (o === 1) return `${TENS[t]} mốt`;
  if (o === 4) return `${TENS[t]} tư`;
  if (o === 5) return `${TENS[t]} lăm`;
  return `${TENS[t]} ${ONES[o]}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return twoDigits(rest);
  const head = `${ONES[h]} trăm`;
  if (rest === 0) return head;
  if (rest < 10) return `${head} lẻ ${ONES[rest]}`;
  return `${head} ${twoDigits(rest)}`;
}

/** Đọc số tiền thành chữ tiếng Việt: 2160000 -> "Hai triệu một trăm sáu mươi ngàn đồng". */
export function vietnameseMoneyWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount === 0) return "Không đồng";
  const units: Array<[number, string]> = [[1_000_000_000, "tỷ"], [1_000_000, "triệu"], [1000, "ngàn"]];
  const parts: string[] = [];
  let rest = Math.floor(amount);
  for (const [unit, label] of units) {
    if (rest >= unit) {
      parts.push(`${threeDigits(Math.floor(rest / unit))} ${label}`);
      rest %= unit;
    }
  }
  if (rest > 0) parts.push(threeDigits(rest));
  const text = parts.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
