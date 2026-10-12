const formatters = new Map<string, Intl.NumberFormat>()

function numberFormat(locale: string, currency: string, whole: boolean) {
  const key = `${locale}|${currency}|${whole ? 'w' : 'f'}`
  let formatter = formatters.get(key)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        ...(whole ? { maximumFractionDigits: 0 } : {}),
      })
    } catch {
      formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
    }
    formatters.set(key, formatter)
  }
  return formatter
}

/** Formats an amount in an ISO currency for the active UI locale ('en' | 'mk'). */
export function formatMoney(value: number, currency: string, appLocale: string, whole = false) {
  const locale = appLocale === 'mk' ? 'mk-MK' : 'en-US'
  return numberFormat(locale, currency || 'USD', whole).format(Number.isFinite(value) ? value : 0)
}

export function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

export const FINANCE_CATEGORY_KEYS: Record<string, string> = {
  'Food & Dining': 'finance.catFoodDining',
  Transportation: 'finance.catTransportation',
  Shopping: 'finance.catShopping',
  Entertainment: 'finance.catEntertainment',
  'Bills & Utilities': 'finance.catBillsUtilities',
  Healthcare: 'finance.catHealthcare',
  Education: 'finance.catEducation',
  Travel: 'finance.catTravel',
  Business: 'finance.catBusiness',
  'Other Expense': 'finance.catOtherExpense',
  Salary: 'finance.catSalary',
  Freelance: 'finance.catFreelance',
  Investment: 'finance.catInvestment',
  'Business Income': 'finance.catBusinessIncome',
  'Other Income': 'finance.catOtherIncome',
}
