export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'cashier';
  active: number;
  created_at?: string;
  total_sales_recorded?: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'service' | 'product';
  active: number;
  product_count?: number;
  service_count?: number;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id: number;
  category_name?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  unit: string;
  supplier?: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  category_id: number;
  category_name?: string;
  price: number;
  cost_estimate: number;
  unit: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  cartId: string; // unique id in cart
  productId?: number | null;
  serviceId?: number | null;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  unit: string;
  discount: number;
  total: number;
  isProduct: boolean;
  stockQuantity?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  total_purchases?: number;
  total_spend?: number;
  last_purchase_date?: string | null;
  created_at: string;
}

export interface PaymentItem {
  method: 'cash' | 'mpesa' | 'card' | 'bank' | 'other';
  amount: number;
  reference?: string;
}

export interface SaleItemSnapshot {
  id: number;
  sale_id: number;
  product_id?: number | null;
  service_id?: number | null;
  item_type?: 'product' | 'service';
  item_name_snapshot: string;
  unit_price_snapshot: number;
  cost_price_snapshot: number;
  quantity: number;
  unit: string;
  discount: number;
  total: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  cashier_id: number;
  cashier_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'completed' | 'voided' | 'refunded';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: SaleItemSnapshot[];
  payments?: PaymentItem[];
  payment_methods?: string;
  item_count?: number;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  user_id: number;
  user_name?: string;
  notes?: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
  movement_type: 'sale' | 'restock' | 'damage' | 'loss' | 'adjustment' | 'refund_return';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string | null;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  receipt_footer?: string | null;
  currency: string;
  tax_rate: number;
  tax_enabled: number;
  low_stock_threshold: number;
  receipt_prefix: string;
  allow_negative_stock: number;
  default_opening_float: number;
  mpesa_paybill_or_till?: string | null;
  services_mpesa_paybill?: string | null;
  services_mpesa_account?: string | null;
  products_mpesa_paybill?: string | null;
  products_mpesa_account?: string | null;
  updated_at: string;
}

export interface CashDrawerSession {
  id?: number;
  date: string;
  opening_float: number;
  default_opening_float?: number;
  cash_sales: number;
  cash_tx_count?: number;
  cash_expenses: number;
  expense_count?: number;
  cash_adjustment: number;
  calculated_cash_in_hand: number;
  counted_cash_in_hand: number | null;
  cash_in_hand: number;
  variance: number;
  is_audited: boolean;
  status: 'open' | 'closed' | 'reconciled';
  notes?: string | null;
  user_name?: string | null;
  updated_at?: string | null;
  history?: Array<{
    id: number;
    session_date: string;
    opening_float: number;
    counted_cash_in_hand: number | null;
    cash_adjustment: number;
    status: string;
    notes?: string | null;
    user_name?: string | null;
    updated_at: string;
  }>;
}

export interface Discount {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  value: number;
  min_spend: number;
  max_discount?: number | null;
  target_type: 'all' | 'product' | 'service';
  is_quick_preset: number;
  usage_count: number;
  active: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupItem {
  filename: string;
  size: number;
  createdAt: string;
}

export interface TrendMetric {
  percentage: number;
  isUp: boolean;
  text: string;
}

export interface PaymentMethodStat {
  name: string;
  key: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface TimelinePoint {
  label: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface LowStockProductItem {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  stock_quantity: number;
  minimum_stock: number;
  unit: string;
  selling_price: number;
  cost_price: number;
  category_name: string;
}

export interface FinancialSummaryData {
  openingBalance: number;
  todaySales: number;
  todayProfit: number;
  todayExpenses: number;
  cashSales: number;
  cashExpenses?: number;
  cashAdjustment?: number;
  expectedCashInHand?: number;
  countedCashInHand?: number | null;
  cashInHand: number;
  variance?: number;
  isAudited?: boolean;
  notes?: string | null;
  sessionDate?: string;
}

export interface DashboardStats {
  dateRange: {
    filter: string;
    start: string;
    end: string;
    comparisonLabel?: string;
  };
  kpis: {
    totalSales: number;
    salesTrend?: TrendMetric;
    totalProfit: number;
    profitTrend?: TrendMetric;
    totalTransactions: number;
    transactionsTrend?: TrendMetric;
    newCustomers: number;
    customersTrend?: TrendMetric;
    totalCustomers?: number;
    totalRevenue: number;
    transactionCount: number;
    totalDiscount: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    cashTotal: number;
    mpesaTotal: number;
    cardTotal: number;
    otherTotal: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  paymentMethods?: PaymentMethodStat[];
  salesTimeline?: TimelinePoint[];
  lowStockProducts?: LowStockProductItem[];
  recentTransactions: Sale[];
  financialSummary?: FinancialSummaryData;
  categoryRevenue?: Array<{ category_name: string; category_type: string; total_revenue: number }>;
  topItems?: Array<{ name: string; total_quantity: number; total_revenue: number; item_type: string }>;
}

