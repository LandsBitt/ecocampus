export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
}

export function formatMonth(value) {
  if (!value) return '-'
  const [year, month] = value.split('-')
  return `${month}/${year}`
}