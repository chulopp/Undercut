/**
 * fud-keywords.ts
 * FUD (Fear, Uncertainty, Doubt) keyword dictionary for competitor complaint detection.
 * Used by the fuzzy pre-filter before calling Gate 1 LLM.
 */

export const FUD_KEYWORDS: Record<string, string[]> = {
  // === FRUSTASI & KELUHAN LANGSUNG ===
  frustration: [
    'broken', 'crash', 'crashed', 'crashing', 'bug', 'buggy', 'glitch', 'glitchy', 'error',
    'not working', "doesn't work", 'doesnt work', 'stopped working', 'wont work',
    'keeps crashing', 'keeps breaking', 'constantly failing', 'unusable', 'unacceptable',
    'trash', 'garbage', 'junk', 'terrible', 'horrible', 'awful', 'worst', 'pathetic',
    'ridiculous', 'unbelievable', 'disaster', 'nightmare', 'embarrassing',
    'shame', 'disgrace', 'failure', 'fail', 'epic fail', 'disaster',
  ],
  // === MENCARI ALTERNATIF — SINYAL PALING KUAT ===
  switching_intent: [
    'alternative', 'alternatives', 'looking for', 'searching for', 'any alternatives',
    'switching to', 'switching from', 'switch to', 'switch from',
    'moving away', 'moving to', 'migrate to', 'migrating',
    'leaving', 'ditching', 'dumping', 'dropping', 'uninstalling',
    'replacing', 'replacement', 'better than', 'instead of',
    'anyone know', 'any suggestions', 'any recommendations', 'recommend',
    'any good', 'similar app', 'similar tool',
    'fed up', 'had enough', 'last straw', 'done with', 'done using',
    'never again', 'goodbye', 'farewell',
  ],
  // === MASALAH HARGA / NILAI ===
  pricing_complaint: [
    'overpriced', 'too expensive', 'ripoff', 'rip off', 'rip-off', 'scam', 'fraud',
    'not worth', 'waste of money', 'money grab', 'highway robbery',
    'subscription', 'price hike', 'price increase', 'raised prices', 'price gouging',
    'charging more', 'hidden fees', 'extra charges', 'charged wrong',
    'refund', 'cancel subscription', 'cancelling',
  ],
  // === MASALAH SUPPORT / LAYANAN ===
  support_complaint: [
    'no response', 'no reply', 'customer support', 'customer service', 'cs',
    'support ticket', 'waiting days', 'waiting weeks', 'no answer',
    'ignored', 'unresponsive', 'slow response', 'automated reply', 'bot response',
    'unhelpful', 'useless support', 'terrible support', 'worst support',
    'cant get help', 'reaching out', 'no one helps',
  ],
  // === MASALAH KUALITAS / PERFORMA ===
  quality_issues: [
    'slow', 'laggy', 'lag', 'freezing', 'frozen', 'loading', 'timeout', 'timed out',
    'downtime', 'outage', 'down again', 'keeps going down', 'service down',
    'data loss', 'lost data', 'lost my work', 'lost everything',
    'sync issue', 'sync problem', 'not syncing', 'sync broken',
    'missing feature', 'removed feature', 'update broke', 'regression',
    'performance', 'battery drain', 'memory leak',
  ],
  // === BAHASA INDONESIA — Target market utama ===
  indonesian_fud: [
    // Frustrasi
    'lemot', 'error terus', 'gabisa', 'ga bisa', 'gak bisa', 'nggak bisa', 'tidak bisa',
    'rusak', 'parah banget', 'kecewa', 'mengecewakan', 'sampah', 'ancur',
    'zonk', 'bodo amat', 'males', 'ribet', 'susah banget',
    // Performa
    'lambat', 'loading terus', 'sering error', 'sering down', 'hang',
    'sering crash', 'tiba-tiba close', 'force close', 'not responding',
    // Harga
    'mahal', 'kemahalan', 'kemahal', 'bayar terus', 'dicharge', 'kena charge',
    'gak worth', 'nggak worth', 'bukan scam', 'nipu', 'menipu',
    // Mencari alternatif
    'pindah ke', 'mending pindah', 'cari alternatif', 'ada yang lebih bagus',
    'rekomendasi', 'rekomen', 'rekomendasiin', 'ada yang tau', 'suggest',
    'kapok', 'kapok pake', 'mau uninstall', 'udah uninstall', 'hapus aja',
    // Support
    'cs nya', 'customer service nya', 'ga direspon', 'tidak direspon',
    'lambat banget respon', 'nggak bisa dihubungi', 'ga ada respon',
  ],
}

// Spam/promotional signals that reduce confidence (Indonesian and English)
export const SPAM_SIGNALS = [
  'giveaway', 'follow for follow', 'f4f', 'dm for', 'promo code', 'discount code',
  'coupon', 'affiliate', 'sponsored', 'partner', 'collab', 'collaboration',
  'check out my', 'visit my', 'click here', 'link in bio', 'free trial',
  '#ad', '#sponsored', '#collab',
  // English Spam/Commercial Jargon
  'wts', 'wtb', 'buy now', 'order now', 'referral code', 'sign up bonus',
  'fast shipping', 'best price', 'hiring', 'job opening', 'passive income',
  'crypto gem', 'airdrop', 'whitelist', 'nft drop', 'hot deal', 'deals of the day',
  'in stock', 'followers promo', 'dm for info',
  // Indonesian Spam/Commercial Jargon
  'ready stock', 'ready akun', 'jasa followers', 'jasa joki', 'paylater',
  'gacor', 'judi', 'slot', 'ongkir', 'cod', 'rekber', 'link shopee', 'shope.ee',
  'tokopedia.link', 'gratis ongkir', 'jasa tambah', 'open member', 'grup wa',
  'bantu retweet', 'saling follow', 'banting harga'
]

// Positive signals that indicate the post is NOT a complaint
export const POSITIVE_SIGNALS = [
  'love', 'amazing', 'awesome', 'great', 'excellent', 'perfect', 'fantastic',
  'highly recommend', 'best app', 'love this app', 'great app', 'works great',
  'update is great', 'new feature is', 'just launched', 'congrats',
  'bagus', 'keren', 'mantap', 'top', 'recommended', 'suka banget',
]

export interface FuzzyMatchResult {
  passes: boolean
  score: number           // 0.0 – 1.0
  matchedKeywords: string[]
  topCategory: string
}

/**
 * Fuzzy pre-filter to decide if a post is worth sending to Gate 1 LLM.
 * Much cheaper than LLM — saves API calls and latency.
 *
 * Score breakdown:
 *   +0.35  if post mentions the competitor name
 *   +0.15  per matched FUD keyword (capped contribution)
 *   -0.40  if strong positive signals detected
 *   -0.30  if spam signals detected
 *   -0.35  if poster username indicates bot/promo
 *   -0.20  if post is too short (< 20 chars)
 *
 * Threshold: 0.20 to pass (very permissive — let Gate 1 LLM do hard filtering)
 */
export function fuzzyPreFilter(
  text: string,
  competitorName: string,
  authorUsername?: string
): FuzzyMatchResult {
  const normalized = text.toLowerCase().trim()
  const matchedKeywords: string[] = []
  const categoryScores: Record<string, number> = {}
  let score = 0

  // 1. Competitor mention — strongest signal
  const competitorNormalized = competitorName.toLowerCase().replace(/[@#]/, '').trim()
  if (
    normalized.includes(competitorNormalized) ||
    normalized.includes(`@${competitorNormalized}`) ||
    normalized.includes(`#${competitorNormalized}`)
  ) {
    score += 0.35
  }

  // 2. Scan FUD keyword categories
  for (const [category, keywords] of Object.entries(FUD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
        const catScore = 0.15
        categoryScores[category] = (categoryScores[category] ?? 0) + catScore
        // Cap per-category contribution to avoid single-category domination
        score += Math.min(catScore, 0.3 - (categoryScores[category] - catScore))
      }
    }
  }

  // 3. Positive sentiment → downgrade (likely not a complaint)
  const hasPositive = POSITIVE_SIGNALS.some((s) => normalized.includes(s.toLowerCase()))
  if (hasPositive && matchedKeywords.length === 0) {
    score -= 0.40
  }

  // 4. Spam signals → downgrade
  const isSpam = SPAM_SIGNALS.some((s) => normalized.includes(s.toLowerCase()))
  if (isSpam) score -= 0.30

  // 4b. Username bot/spam patterns -> downgrade
  if (authorUsername) {
    const usernameLower = authorUsername.toLowerCase()
    const botPatterns = ['_bot', 'bot_', 'promobot', 'giveaway', 'dealhunter', 'spambot', 'fudbot', 'dropship', 'store', 'shop']
    const isBot = botPatterns.some((pattern) => usernameLower.includes(pattern))
    if (isBot) score -= 0.35
  }

  // 5. Too short → likely noise
  if (normalized.length < 20) score -= 0.20

  // Cap
  score = Math.min(1.0, Math.max(0, score))

  // Top category by accumulated score
  const topCategory = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat)[0] ?? ''

  return {
    passes: score >= 0.20,
    score,
    matchedKeywords: [...new Set(matchedKeywords)], // dedupe
    topCategory,
  }
}
