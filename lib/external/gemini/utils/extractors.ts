/**
 * Extract ayah references from AI response
 * 
 * Supported formats:
 * - [2:255]
 * - (3:159)
 * - Surah 2, verse 255
 * - 2:255 (plain)
 */
export function extractAyahReferences(content: string): string[] {
  const refs = new Set<string>()
  
  // Pattern 1: [2:255] or (2:255)
  const bracketed = content.matchAll(/[\[\(](\d{1,3}:\d{1,3})[\]\)]/g)
  for (const match of bracketed) {
    refs.add(match[1])
  }
  
  // Pattern 2: "Surah 2, verse 255" or "Surah 2:255"
  const spelled = content.matchAll(/Surah\s+(\d{1,3})[,:]\s*(?:verse\s+)?(\d{1,3})/gi)
  for (const match of spelled) {
    refs.add(`${match[1]}:${match[2]}`)
  }
  
  // Pattern 3: Plain "2:255" (at word boundaries)
  const plain = content.matchAll(/\b(\d{1,3}:\d{1,3})\b/g)
  for (const match of plain) {
    const [surah, ayah] = match[1].split(':').map(Number)
    // Validate range (114 surahs, max ~286 verses)
    if (surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 286) {
      refs.add(match[1])
    }
  }
  
  return Array.from(refs).sort() // Sort for consistency
}

/**
 * Extract tafsir names from AI response
 * 
 * Matches common tafsir mentions:
 * - "Tafsir Ibn Kathir"
 * - "According to al-Jalalayn"
 * - "Ibn Kathir states..."
 */
export function extractTafsirNames(content: string): string[] {
  const names = new Set<string>()
  
  // Pattern 1: "Tafsir [Name]"
  const tafsirPattern = content.matchAll(/Tafsir\s+((?:Ibn\s+)?[\w-]+(?:\s+al-[\w-]+)?)/gi)
  for (const match of tafsirPattern) {
    names.add(normalizeScholarName(match[1]))
  }
  
  // Pattern 2: Common scholars (standalone)
  const scholars = [
    'Ibn Kathir',
    'al-Jalalayn',
    'Maarif-ul-Quran',
    'al-Tabari',
    'Ibn Abbas',
    'al-Qurtubi',
  ]
  
  for (const scholar of scholars) {
    const regex = new RegExp(`\\b${scholar}\\b`, 'gi')
    if (regex.test(content)) {
      names.add(scholar)
    }
  }
  
  return Array.from(names).sort()
}

/**
 * Normalize scholar names for consistency
 */
function normalizeScholarName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}