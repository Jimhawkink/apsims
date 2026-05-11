// Shared helpers and types for Ultra Finance Dashboard

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

export const fmtK = (n: number) =>
  n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(Math.round(n));

export const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()} ${dt.toLocaleString('en', { month: 'short' })}`;
};

export const fmtTime = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
};

export interface FinanceData {
  // KPI data
  todayCollection: number;
  weekCollection: number;
  totalCollected: number;
  feeArrears: number;
  collectionRate: number;
  totalExpenses: number;
  capitationReceived: number;
  netPosition: number;
  todayPayments: number;
  todayMpesa: number;
  weekChange: number;
  targetAmount: number;
  debtorCount: number;
  criticalDebtors: number;
  expenseEntries: number;
  salaryAmount: number;
  capitationTerm: string;
  // Chart data
  monthlyFees: { month: string; fees: number; expenses: number; capitation: number; target: number }[];
  dailyCollection: { day: string; mpesa: number; bank: number; cash: number }[];
  paymentMethods: { method: string; amount: number; pct: number; color: string }[];
  formPositions: { form: string; expected: number; paid: number; arrears: number; pct: number }[];
  budgetVotes: { head: string; budget: number; actual: number; pct: number }[];
  expenseBreakdown: { category: string; amount: number; color: string }[];
  // Table data
  agedDebtors: { admNo: string; student: string; form: string; invoiced: number; paid: number; balance: number; days: number; status: string }[];
  alerts: { type: string; text: string; sub: string; color: string; action?: string }[];
  capitationByForm: { form: string; amounts: number[] }[];
  capitationStreams: string[];
  bursaryKpis: { helb: number; county: number; cdf: number };
  bursaryStudents: { student: string; type: string; amount: number; status: string }[];
  etimsConfig: { vscu: string; vscuExpiry: string; pending: number; lastSync: string; paye: string; payeAmount: string; nssf: string; nssfAmount: string; nssfDue: string; tcc: string; tccExpiry: string };
  latestPayments: { date: string; admNo: string; student: string; formStream: string; amount: number; method: string; reference: string; receipt: string; voteHead: string; status: string }[];
  waterfallData: { label: string; value: number; color: string }[];
  bankAccounts: { bank: string; account: string; bookBal: number; bankBal: number; diff: number; status: string }[];
}

export const DEMO_ALERTS = [
  { type: 'critical', text: '187 students — fee balance > Ksh 5,000', sub: 'Send demand letters now · urgent', color: '#ef4444' },
  { type: 'warning', text: 'KRA eTIMS — 12 receipts pending upload', sub: 'Upload before 14 May or face penalty', color: '#f59e0b' },
  { type: 'info', text: 'Payroll due in 4 days — June 2026', sub: '48 staff · Ksh 2.1M net · prepare EFT', color: '#3b82f6' },
  { type: 'warning', text: 'Bank reconciliation — April not done', sub: 'KCB · Equity · outstanding 23 entries', color: '#f59e0b' },
  { type: 'info', text: 'NHIF / SHA returns due 30 May', sub: 'Ksh 184,200 total remittance', color: '#6366f1' },
  { type: 'success', text: 'Term 3 capitation — apply by 30 Jun', sub: 'MoE portal · NEMIS linked · Ksh 748K expected', color: '#10b981' },
];

export const METHOD_COLORS: Record<string, string> = {
  'M-Pesa': '#10b981', 'Bank': '#3b82f6', 'Cash': '#f59e0b', 'HELB': '#8b5cf6', 'Cheque': '#ec4899',
};

export const VOTE_HEADS = ['Salaries & wages', 'Operations', 'Procurement', 'Infrastructure', 'Library & ICT', 'Extra-curricular'];

export const EXPENSE_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#6366f1', '#10b981'];

export const QUICK_ACTIONS = [
  { label: 'Collect fee', icon: '💰', href: '/dashboard/fees/collect' },
  { label: 'Outstanding', icon: '⚠️', href: '/dashboard/fees/outstanding' },
  { label: 'Send reminders', icon: '📩', href: '/dashboard/fees/combined-sms' },
  { label: 'Statements', icon: '📄', href: '/dashboard/fees/statements' },
  { label: 'Reconcile', icon: '🔄', href: '/dashboard/bank-reconciliation' },
  { label: 'Payroll', icon: '👥', href: '/dashboard/payroll' },
  { label: 'Add expense', icon: '📝', href: '/dashboard/expenses' },
  { label: 'HELB / bursary', icon: '🎓', href: '/dashboard/bursary' },
  { label: 'eTIMS receipts', icon: '🧾', href: '/dashboard/etims' },
  { label: 'Capitation', icon: '🏛️', href: '/dashboard/capitation' },
];
