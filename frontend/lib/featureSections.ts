export interface FieldMeta {
  label: string;
  tooltip: string;
  type?: "number" | "text" | "select";
  options?: string[];
  min?: number;
  max?: number;
}

export interface FormSection {
  id: string;
  title: string;
  advanced?: boolean;
  fields: string[];
}

// Section grouping mirrors the product spec exactly (Sections A–H). Any raw field the live
// /schema endpoint returns that ISN'T listed here still gets rendered — see "Other Fields"
// fallback in the predict page — so the form never silently drops a field the model actually
// requires just because this static map hasn't been updated yet.
export const FORM_SECTIONS: FormSection[] = [
  {
    id: "profile",
    title: "Customer Profile",
    fields: ["Current Age", "Retirement Age", "Gender", "State"],
  },
  {
    id: "financial",
    title: "Financial Profile",
    fields: [
      "Per Capita Income - Zipcode",
      "Yearly Income - Person",
      "Total Debt",
      "FICO Score",
      "Num Credit Cards",
    ],
  },
  {
    id: "credit",
    title: "Credit Profile",
    advanced: true,
    fields: [
      "debt_to_income",
      "income_per_card",
      "debt_per_card",
      "years_to_retirement",
      "credit_risk_proxy",
      "num_active_cards",
      "num_card_brands",
      "total_credit_limit",
      "avg_credit_limit",
      "avg_card_age_days",
      "oldest_card_age_days",
      "pct_cards_with_chip",
      "any_card_on_dark_web",
    ],
  },
  {
    id: "transaction_activity",
    title: "Transaction Activity",
    fields: [
      "txn_count",
      "total_spend",
      "avg_transaction_amount",
      "median_transaction_amount",
      "max_transaction_amount",
      "std_transaction_amount",
      "amount_volatility",
      "high_value_transaction_ratio",
      "days_since_first_txn",
      "days_since_last_txn",
      "active_days",
    ],
  },
  {
    id: "recent_activity",
    title: "Recent Activity",
    fields: [
      "transactions_7d",
      "spend_7d",
      "transactions_30d",
      "spend_30d",
      "transactions_90d",
      "spend_90d",
      "transactions_180d",
      "spend_180d",
    ],
  },
  {
    id: "behavioral",
    title: "Behavioral Patterns",
    advanced: true,
    fields: [
      "recent_mean_amount",
      "historical_mean_amount",
      "unique_merchants",
      "unique_mccs",
      "chip_transaction_ratio",
      "online_transaction_ratio",
      "swipe_transaction_ratio",
      "unique_states",
      "out_of_state_ratio",
      "night_transaction_ratio",
      "weekend_transaction_ratio",
      "txn_hour_std",
      "hour_entropy",
    ],
  },
  {
    id: "fraud_history",
    title: "Fraud History",
    fields: [
      "error_count",
      "error_rate",
      "historical_fraud_count",
      "historical_fraud_rate",
      "fraud_count_30d",
    ],
  },
  {
    id: "advanced_risk",
    title: "Advanced Risk Features",
    advanced: true,
    fields: [
      "recent_spending_change",
      "merchant_diversity_30d",
      "txn_count_ratio_30d_vs_180d",
      "historical_std_amount",
      "amount_zscore_vs_own_history",
      "days_since_last_high_value_txn",
      "mcc_novelty_ratio_30d",
      "state_novelty_ratio_30d",
      "merchant_concentration",
      "mcc_concentration",
      "spending_trend",
      "income_to_credit_limit_ratio",
      "fico_x_debt_to_income",
      "historical_fraud_rate_x_days_since_last_txn",
      "card_age_at_first_use_gap",
    ],
  },
];

export const FIELD_META: Record<string, FieldMeta> = {
  "Current Age": { label: "Current Age", tooltip: "Customer's current age in years." },
  "Retirement Age": {
    label: "Retirement Age",
    tooltip: "Customer's stated or expected retirement age.",
  },
  Gender: {
    label: "Gender",
    tooltip: "Self-reported gender, as recorded on the account.",
    type: "select",
    options: ["Male", "Female"],
  },
  State: { label: "State", tooltip: "Customer's state of residence (US state abbreviation)." },
  "Per Capita Income - Zipcode": {
    label: "Per Capita Income (Zipcode)",
    tooltip: "Average per-capita income for the customer's zip code, a neighborhood-level signal.",
  },
  "Yearly Income - Person": {
    label: "Yearly Income (Person)",
    tooltip: "Customer's individually reported annual income.",
  },
  "Total Debt": { label: "Total Debt", tooltip: "Customer's total reported outstanding debt." },
  "FICO Score": {
    label: "FICO Score",
    tooltip: "Standard US credit score, typically 300–850.",
    min: 300,
    max: 850,
  },
  "Num Credit Cards": {
    label: "Number of Credit Cards",
    tooltip: "Total credit cards on file for this customer.",
  },
  debt_to_income: {
    label: "Debt-to-Income Ratio",
    tooltip: "Total debt divided by yearly income — a standard credit-risk ratio.",
  },
  income_per_card: {
    label: "Income per Card",
    tooltip: "Yearly income divided by number of active cards.",
  },
  debt_per_card: { label: "Debt per Card", tooltip: "Total debt divided by number of active cards." },
  years_to_retirement: {
    label: "Years to Retirement",
    tooltip: "Retirement age minus current age.",
  },
  credit_risk_proxy: {
    label: "Credit Risk Proxy",
    tooltip: "A composite score combining FICO and debt-to-income as a rough credit-risk indicator.",
  },
  num_active_cards: { label: "Active Cards", tooltip: "Number of cards currently active on file." },
  num_card_brands: {
    label: "Card Brands",
    tooltip: "Number of distinct card brands/networks held by this customer.",
  },
  total_credit_limit: {
    label: "Total Credit Limit",
    tooltip: "Sum of credit limits across all of this customer's cards.",
  },
  avg_credit_limit: {
    label: "Average Credit Limit",
    tooltip: "Mean credit limit per card for this customer.",
  },
  avg_card_age_days: {
    label: "Average Card Age (days)",
    tooltip: "Average number of days since each card was opened.",
  },
  oldest_card_age_days: {
    label: "Oldest Card Age (days)",
    tooltip: "Days since the customer's oldest card was opened.",
  },
  pct_cards_with_chip: {
    label: "% Cards With Chip",
    tooltip: "Share of this customer's cards that have chip capability.",
  },
  any_card_on_dark_web: {
    label: "Any Card Flagged on Dark Web",
    tooltip: "Whether any of this customer's cards have been flagged in a dark-web exposure list.",
    type: "select",
    options: ["0", "1"],
  },
  txn_count: {
    label: "Transaction Count (history)",
    tooltip: "Total number of transactions observed for this customer before the prediction cutoff.",
  },
  total_spend: { label: "Total Spend", tooltip: "Total dollar amount spent, pre-cutoff." },
  avg_transaction_amount: {
    label: "Average Transaction Amount",
    tooltip: "Mean transaction amount, pre-cutoff.",
  },
  median_transaction_amount: {
    label: "Median Transaction Amount",
    tooltip: "Median transaction amount, pre-cutoff.",
  },
  max_transaction_amount: {
    label: "Max Transaction Amount",
    tooltip: "Largest single transaction amount observed, pre-cutoff.",
  },
  std_transaction_amount: {
    label: "Std. Dev. of Transaction Amount",
    tooltip: "Standard deviation of transaction amounts — a spend-volatility signal.",
  },
  amount_volatility: {
    label: "Amount Volatility",
    tooltip: "Coefficient of variation of spend amounts (std / mean).",
  },
  high_value_transaction_ratio: {
    label: "High-Value Transaction Ratio",
    tooltip: "Share of transactions that are 'high value' relative to this customer's own history.",
  },
  days_since_first_txn: {
    label: "Days Since First Transaction",
    tooltip: "Days between this customer's earliest observed transaction and the prediction cutoff.",
  },
  days_since_last_txn: {
    label: "Days Since Last Transaction",
    tooltip: "Days since this customer's most recent transaction before the prediction cutoff.",
  },
  active_days: {
    label: "Active Days",
    tooltip: "Number of distinct calendar days with at least one transaction, pre-cutoff.",
  },
  transactions_7d: { label: "Transactions (7d)", tooltip: "Transaction count in the last 7 days pre-cutoff." },
  spend_7d: { label: "Spend (7d)", tooltip: "Total spend in the last 7 days pre-cutoff." },
  transactions_30d: { label: "Transactions (30d)", tooltip: "Transaction count in the last 30 days pre-cutoff." },
  spend_30d: { label: "Spend (30d)", tooltip: "Total spend in the last 30 days pre-cutoff." },
  transactions_90d: { label: "Transactions (90d)", tooltip: "Transaction count in the last 90 days pre-cutoff." },
  spend_90d: { label: "Spend (90d)", tooltip: "Total spend in the last 90 days pre-cutoff." },
  transactions_180d: { label: "Transactions (180d)", tooltip: "Transaction count in the last 180 days pre-cutoff." },
  spend_180d: { label: "Spend (180d)", tooltip: "Total spend in the last 180 days pre-cutoff." },
  recent_mean_amount: {
    label: "Recent Mean Amount",
    tooltip: "Mean transaction amount over the recent window (last 30 days).",
  },
  historical_mean_amount: {
    label: "Historical Mean Amount",
    tooltip: "Mean transaction amount over the customer's longer pre-cutoff history.",
  },
  unique_merchants: { label: "Unique Merchants", tooltip: "Distinct merchants transacted with, pre-cutoff." },
  unique_mccs: { label: "Unique Merchant Categories", tooltip: "Distinct merchant category codes (MCCs), pre-cutoff." },
  chip_transaction_ratio: { label: "Chip Transaction Ratio", tooltip: "Share of transactions made via chip." },
  online_transaction_ratio: { label: "Online Transaction Ratio", tooltip: "Share of transactions made online." },
  swipe_transaction_ratio: { label: "Swipe Transaction Ratio", tooltip: "Share of transactions made via magnetic swipe." },
  unique_states: { label: "Unique States", tooltip: "Distinct US states the customer transacted in." },
  out_of_state_ratio: { label: "Out-of-State Ratio", tooltip: "Share of transactions outside the customer's home state." },
  night_transaction_ratio: { label: "Night Transaction Ratio", tooltip: "Share of transactions occurring at night." },
  weekend_transaction_ratio: { label: "Weekend Transaction Ratio", tooltip: "Share of transactions occurring on weekends." },
  txn_hour_std: { label: "Transaction Hour Std. Dev.", tooltip: "Spread of transaction hours across the day." },
  hour_entropy: { label: "Transaction Hour Entropy", tooltip: "Diversity of the hours transactions occur in." },
  error_count: { label: "Error Count", tooltip: "Number of declined/errored transactions, pre-cutoff." },
  error_rate: { label: "Error Rate", tooltip: "Share of transactions that errored or were declined." },
  historical_fraud_count: {
    label: "Historical Fraud Count",
    tooltip: "Number of confirmed fraudulent transactions before the prediction cutoff.",
  },
  historical_fraud_rate: {
    label: "Historical Fraud Rate",
    tooltip: "Share of this customer's pre-cutoff transactions that were fraudulent.",
  },
  fraud_count_30d: {
    label: "Fraud Count (30d)",
    tooltip: "Confirmed fraudulent transactions in the last 30 days pre-cutoff.",
  },
  recent_spending_change: {
    label: "Recent Spending Change",
    tooltip: "Ratio of recent mean spend to historical mean spend — a spend-shift signal.",
  },
  merchant_diversity_30d: {
    label: "Merchant Diversity (30d)",
    tooltip: "Distinct merchants transacted with in the last 30 days.",
  },
  txn_count_ratio_30d_vs_180d: {
    label: "30d vs 180d Transaction Ratio",
    tooltip: "Recent 30-day transaction rate relative to the 180-day baseline — a velocity-acceleration signal.",
  },
  historical_std_amount: {
    label: "Historical Std. Dev. Amount",
    tooltip: "Standard deviation of amounts in the customer's older (pre-recent) history.",
  },
  amount_zscore_vs_own_history: {
    label: "Amount Z-Score vs Own History",
    tooltip: "How many standard deviations the recent mean amount is from this customer's own older baseline.",
  },
  days_since_last_high_value_txn: {
    label: "Days Since Last High-Value Txn",
    tooltip: "Days since this customer's last transaction above their own 90th-percentile amount.",
  },
  mcc_novelty_ratio_30d: {
    label: "MCC Novelty Ratio (30d)",
    tooltip: "Share of recent transactions at merchant categories never seen in this customer's earlier history.",
  },
  state_novelty_ratio_30d: {
    label: "State Novelty Ratio (30d)",
    tooltip: "Share of recent transactions in a state never seen in this customer's earlier history.",
  },
  merchant_concentration: {
    label: "Merchant Concentration",
    tooltip: "How concentrated this customer's spend is among a small number of merchants.",
  },
  mcc_concentration: {
    label: "MCC Concentration",
    tooltip: "How concentrated this customer's spend is among a small number of merchant categories.",
  },
  spending_trend: {
    label: "Spending Trend",
    tooltip: "Directional trend in spend over the observed history.",
  },
  income_to_credit_limit_ratio: {
    label: "Income to Credit Limit Ratio",
    tooltip: "Yearly income divided by total credit limit.",
  },
  fico_x_debt_to_income: {
    label: "FICO × Debt-to-Income",
    tooltip: "Interaction term combining credit score and debt burden.",
  },
  historical_fraud_rate_x_days_since_last_txn: {
    label: "Fraud Rate × Recency",
    tooltip: "Interaction term combining historical fraud rate with days since last transaction.",
  },
  card_age_at_first_use_gap: {
    label: "Card Age at First Use Gap",
    tooltip: "Approximate gap between a card being opened and this customer's first captured transaction.",
  },
};

export function fieldLabel(name: string): string {
  return FIELD_META[name]?.label ?? name;
}

export function fieldTooltip(name: string): string {
  return FIELD_META[name]?.tooltip ?? "No description available for this field yet.";
}
