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

const NON_EVENT_KEYWORDS = [
  "taziye", "vefat", "geçmiş olsun", "başsağlığı",
  "duyuru", "haber", "açıklama", "kamuoyu",
];

function isActualEvent(event) {
  const lower = (event.title || "").toLowerCase();
  return !NON_EVENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isRelevant(event) {
  const fullText = [event.title, event.description, event.location].join(" ");
  return isBMERelevant(fullText) && isIstanbulOrOnline(fullText);
}

const TR_MONTHS = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
  oca: 0, şub: 1, mar: 2, nis: 3, may: 4, haz: 5,
  tem: 6, ağu: 7, eyl: 8, eki: 9, kas: 10, ara: 11,
};
const EN_MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();

  // "15 nisan 2026" veya "15 nis 2026" (yıllı)
  const trMatchFull = s.match(/(\d{1,2})\s*(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|oca|şub|mar|nis|may|haz|tem|ağu|eyl|eki|kas|ara)\s+(\d{4})/);
  if (trMatchFull) {
    return new Date(parseInt(trMatchFull[3]), TR_MONTHS[trMatchFull[2]], parseInt(trMatchFull[1]));
  }

  // "25Ara", "22Nis" gibi yılsız — bu yılı kullan
  const trMatchShort = s.match(/^(\d{1,2})(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|oca|şub|mar|nis|may|haz|tem|ağu|eyl|eki|kas|ara)$/);
  if (trMatchShort) {
    return new Date(new Date().getFullYear(), TR_MONTHS[trMatchShort[2]], parseInt(trMatchShort[1]));
  }

  // "april 15, 2026" veya "15 april 2026"
  const enMatch1 = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (enMatch1 && EN_MONTHS[enMatch1[1]] !== undefined)
    return new Date(parseInt(enMatch1[3]), EN_MONTHS[enMatch1[1]], parseInt(enMatch1[2]));

  const enMatch2 = s.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (enMatch2 && EN_MONTHS[enMatch2[2]] !== undefined)
    return new Date(parseInt(enMatch2[3]), EN_MONTHS[enMatch2[2]], parseInt(enMatch2[1]));

  // "2026-04-15"
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));

  // "15.04.2026"
  const dotMatch = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) return new Date(parseInt(dotMatch[3]), parseInt(dotMatch[2]) - 1, parseInt(dotMatch[1]));

  // Sadece yıl varsa: "2023" → geçmiş yıl kabul et
  const yearOnly = s.match(/\b(20\d{2})\b/);
  if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1);

  return null;
}

function isNotPast(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();

  // Başlıkta '22, '23 gibi eski yıl varsa her zaman atla
  const shortYear = (event.title || "").match(/'(\d{2})/);
  if (shortYear && (2000 + parseInt(shortYear[1])) < thisYear) return false;

  const date = parseEventDate(event.date);

  if (!date) {
    // URL veya başlıkta geçmiş tam yıl varsa atla
    const text = `${event.url || ""} ${event.title || ""}`;
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch && parseInt(yearMatch[1]) < thisYear) return false;
    return true;
  }

  return date >= today;
}

module.exports = { isRelevant, isActualEvent, isBMERelevant, isIstanbulOrOnline, isNotPast, parseEventDate };
