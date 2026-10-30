// Picks the asks out of one prompt, in English or French. Cheap and local: the model fixes
// misses through add_ask, so this only has to catch the obvious ones.

const ASK_START =
  /^(please |pls |can you|could you|can we|could we|will you|would you|make sure|let'?s |send|show|add|fix|build|put|push|check|update|tell|bring|give|get|load|schedule|delete|remove|clean|create|make|draft|write|reply|post|publish|upload|share|run|render|go ahead|do |finalise|finish|save|bank|review|qa|analyse|research|look (at|into)|find|move|set up|book|fill|need you|i need you|i want you|we need to)/i

// The same openings in French: a polite question, a wish, or a verb in the imperative.
const DEMANDE_DEBUT =
  /^(peux-tu|pourrais-tu|tu peux|tu pourrais|est-ce que tu|merci de|il faut|je veux|je voudrais|j['’]aimerais|j['’]ai besoin|on doit|fais|faites|ajoute|corrige|améliore|crée|cree|mets|met |supprime|enlève|retire|vérifie|verifie|change|modifie|envoie|montre|affiche|teste|installe|lance|écris|ecris|rédige|explique|trouve|cherche|regarde|répare|refais|nettoie|range|déplace|renomme|publie|termine|finis|continue sur|occupe-toi|prépare|analyse|traduis|résume|optimise|simplifie|restructure|intègre|configure|passe )/i

// \b does not see accented letters, so the French phrases carry no word boundary at the end.
const ASK_ANYWHERE = /\b(make sure|please|can you|could you|can we|need you to|want you to)\b|\b(peux-tu|pourrais-tu|s['’]il te pla[iî]t|s['’]il vous pla[iî]t|stp|svp|merci de|je veux que|je voudrais que|j['’]aimerais|tu vas t['’]occuper|il faut que)/i

// Bare approvals and pings are replies, not asks.
const NOT_AN_ASK =
  /^(go|send|yes|no|ok|okay|done|great|perfect|eta\??|allow|connected|open|in|sure|yep|nice|amazing|how'?s it going\??|oui|non|d['’]accord|vas-y|parfait|super|merci|continue|top|nickel|c['’]est bon|ça marche|valide|je valide)[.!? ]*$/i

const MAX_PROMPT = 4000 // longer prompts are pasted transcripts or scheduled jobs
const MAX_ASKS = 8

export function extractAsks(raw: string): string[] {
  if (!raw || raw.length > MAX_PROMPT) return []
  const text = raw
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ' ') // drop tagged pastes and reminders
    .replace(/\[(Image|Pasted text)[^\]]*\]/gi, ' ')
    .replace(/(^|\s)\/[a-z][\w:-]*(?=\s|$)/gi, ' ') // drop /plan, /close
    .replace(/(file:\/\/|https?:\/\/)\S+/g, '(link)')
  const sentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(Boolean)

  const asks: string[] = []
  for (const s of sentences) {
    if (s.length < 6 || s.length > 300) continue
    if (NOT_AN_ASK.test(s)) continue
    if (s.endsWith('?') || ASK_START.test(s) || DEMANDE_DEBUT.test(s) || ASK_ANYWHERE.test(s)) asks.push(s)
    if (asks.length >= MAX_ASKS) break
  }
  return asks
}
