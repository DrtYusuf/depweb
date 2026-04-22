/**
 * Bir etkinliğin biyomedikal mühendislik ile ilgili olup olmadığını ve
 * İstanbul'da / online gerçekleşip gerçekleşmediğini kontrol eder.
 */

const BME_KEYWORDS = [
  "biyomedikal", "biomedical", "biyo", "bme",
  "medikal", "medical", "medtech", "med-tech",
  "sağlık teknoloji", "health tech", "healthtech", "health-tech",
  "tıbbi cihaz", "medical device",
  "biyoteknoloji", "biotechnology", "biotech",
  "embs", "biyomühendis", "bioengineer",
  "biyomekanik", "biomechanics",
  "biyosensör", "biosensor",
  "görüntüleme", "imaging",
  "protez", "prosthetic",
  "rehabilitasyon mühendislik", "rehabilitation engineering",
  "nöromühendislik", "neuroengineering",
  "doku mühendislik", "tissue engineering",
  "klinik mühendislik", "clinical engineering",
  "tıp mühendislik", "medical engineering",
];

const ISTANBUL_KEYWORDS = [
  "istanbul", "İstanbul", "i̇stanbul",
  "kadıköy", "beşiktaş", "şişli", "sarıyer", "üsküdar",
  "beyoğlu", "fatih", "levent", "maslak", "ataşehir",
  "beykoz", "bakırköy", "bağcılar", "avcılar",
  "online", "çevrimiçi", "webinar", "zoom", "teams", "virtual",
];

function isBMERelevant(text) {
  const lower = (text || "").toLowerCase();
  return BME_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function isIstanbulOrOnline(text) {
  const lower = (text || "").toLowerCase();
  return ISTANBUL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function isRelevant(event) {
  const fullText = [event.title, event.description, event.location].join(" ");
  return isBMERelevant(fullText) && isIstanbulOrOnline(fullText);
}

const TR_MONTHS = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
};

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();

  // "15 nisan 2026" veya "15 nisan 2026 09:00..."
  const trMatch = s.match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/);
  if (trMatch) {
    return new Date(parseInt(trMatch[3]), TR_MONTHS[trMatch[2]], parseInt(trMatch[1]));
  }

  // "2026-04-15" veya "15.04.2026"
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));

  const dotMatch = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) return new Date(parseInt(dotMatch[3]), parseInt(dotMatch[2]) - 1, parseInt(dotMatch[1]));

  return null;
}

function isNotPast(event) {
  const date = parseEventDate(event.date);
  if (!date) return true; // tarih yoksa göster
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

module.exports = { isRelevant, isBMERelevant, isIstanbulOrOnline, isNotPast };
