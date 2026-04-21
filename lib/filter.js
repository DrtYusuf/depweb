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

module.exports = { isRelevant, isBMERelevant, isIstanbulOrOnline };
