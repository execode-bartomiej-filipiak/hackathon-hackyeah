export { cn } from "cn"

/**
 * Formatuje kwotę w złotych w polskiej konwencji (przecinek dziesiętny, spacja jako separator tysięcy)
 */
export function formatPln(value: number, fractionDigits = 2): string {
  return value.toLocaleString('pl-PL', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}


