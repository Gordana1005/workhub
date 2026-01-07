// Natural Language Transaction Parser
// Extracts transaction details from plain English input
// Examples:
//   "Spent $50 on groceries yesterday"
//   "Earned $500 from freelance work"
//   "$15 coffee at Starbucks"

interface ParsedTransaction {
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'income' | 'expense';
}

const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'groceries', 'coffee', 'snack', 'meal', 'eat', 'starbucks', 'cafe'],
  'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'train', 'bus', 'flight', 'car', 'transport'],
  'Shopping': ['amazon', 'shopping', 'clothes', 'shoes', 'buy', 'purchase', 'store'],
  'Entertainment': ['movie', 'concert', 'game', 'netflix', 'spotify', 'entertainment', 'show', 'theater'],
  'Bills & Utilities': ['rent', 'utilities', 'electricity', 'water', 'internet', 'phone', 'bill', 'subscription'],
  'Healthcare': ['doctor', 'hospital', 'medicine', 'pharmacy', 'health', 'medical', 'clinic'],
  'Education': ['school', 'course', 'book', 'tuition', 'class', 'education', 'learning'],
  'Travel': ['hotel', 'airbnb', 'vacation', 'trip', 'travel', 'flight', 'booking'],
  'Business': ['office', 'supplies', 'business', 'equipment', 'software', 'tools'],
  'Salary': ['salary', 'paycheck', 'wage', 'paid', 'payment'],
  'Freelance': ['freelance', 'gig', 'contract', 'consulting', 'client'],
  'Investment': ['dividend', 'interest', 'investment', 'stock', 'return'],
};

export function parseNaturalLanguageTransaction(input: string): ParsedTransaction | null {
  if (!input || input.trim().length === 0) return null;

  const text = input.toLowerCase();
  
  // Extract amount - handle various formats: $50, 50, $1,000, 1000.50
  const amountMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;
  
  // Determine type (income vs expense)
  const incomeKeywords = /earn|earned|receive|received|income|salary|paid|paycheck|freelance|got|revenue/i;
  const expenseKeywords = /spent|spend|paid|pay|bought|buy|purchase|cost/i;
  
  let type: 'income' | 'expense' = 'expense'; // Default to expense
  if (incomeKeywords.test(text)) {
    type = 'income';
  } else if (expenseKeywords.test(text)) {
    type = 'expense';
  }
  
  // Extract date
  const date = parseDate(text);
  
  // Detect category
  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // Extract description
  let description = extractDescription(input, amount);
  
  // If no description, use generic based on type
  if (!description) {
    description = type === 'income' ? 'Income' : 'Expense';
  }
  
  return {
    amount,
    description,
    category,
    date,
    type,
  };
}

function parseDate(text: string): Date {
  const today = new Date();
  
  // Check for relative dates
  if (/yesterday/i.test(text)) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  if (/tomorrow/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // Check for "X days ago"
  const daysAgoMatch = text.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1]);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }
  
  // Check for "last week"
  if (/last\s+week/i.test(text)) {
    const date = new Date(today);
    date.setDate(date.getDate() - 7);
    return date;
  }
  
  // Check for specific date patterns (MM/DD/YYYY or YYYY-MM-DD)
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  
  // Default to today
  return today;
}

function extractDescription(input: string, amount: number): string {
  // Remove amount from description
  let desc = input
    .replace(/\$?\d+(?:,\d{3})*(?:\.\d{1,2})?/g, '')
    .trim();
  
  // Remove common words and phrases
  const wordsToRemove = [
    /^spent\s+/i,
    /^spend\s+/i,
    /^paid\s+/i,
    /^pay\s+/i,
    /^bought\s+/i,
    /^buy\s+/i,
    /^earned\s+/i,
    /^earn\s+/i,
    /^received\s+/i,
    /^receive\s+/i,
    /\s+yesterday$/i,
    /\s+today$/i,
    /\s+tomorrow$/i,
    /\s+on$/i,
    /\s+at$/i,
    /\s+for$/i,
    /\s+from$/i,
    /\d+\s+days?\s+ago/i,
    /last\s+week/i,
  ];
  
  for (const pattern of wordsToRemove) {
    desc = desc.replace(pattern, '');
  }
  
  // Clean up extra whitespace
  desc = desc.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  return desc;
}

// Examples and test cases
export const exampleInputs = [
  "Spent $50 on groceries yesterday",
  "Earned $500 from freelance work",
  "$15 coffee at Starbucks",
  "Paid $1,200 rent",
  "Bought $89.99 shoes on Amazon",
  "Received $3,000 salary",
  "Gas $45",
  "Uber ride $18",
  "Lunch with client $65",
  "Netflix subscription $15.99",
];

// Test the parser
if (typeof window === 'undefined') {
  // Only run tests in Node.js environment (not in browser)
  console.log('Natural Language Transaction Parser - Test Results:');
  exampleInputs.forEach(input => {
    const result = parseNaturalLanguageTransaction(input);
    console.log(`\nInput: "${input}"`);
    console.log('Parsed:', result);
  });
}
