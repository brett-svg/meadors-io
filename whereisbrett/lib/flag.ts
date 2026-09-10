/**
 * Render an ISO 3166-1 alpha-2 code as a flag emoji by mapping each letter to
 * its regional indicator symbol. No image assets, no licensing, no CDN.
 */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️'

  const REGIONAL_INDICATOR_A = 0x1f1e6
  const LETTER_A = 'A'.charCodeAt(0)

  return String.fromCodePoint(
    ...[...code].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - LETTER_A),
  )
}
