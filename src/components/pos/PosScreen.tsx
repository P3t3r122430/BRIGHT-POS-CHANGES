import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, Service, CartItem, Customer, Sale, Discount } from '../../types';
import { api } from '../../lib/api';
import { formatKsh, formatNumber, formatDate } from '../../lib/utils';
import {
  printReceipt,
  openReceiptInNewTab,
  downloadReceiptFile,
  copyReceiptToClipboard,
} from '../../lib/receiptPrinter';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Tag,
  Clock,
  Layers,
  X,
  FileText,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Download,
  Copy,
  Check,
  Package,
  Percent,
  Zap,
  Sliders,
  Gift,
  UserPlus
} from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'PRINTING & DOCUMENTATION',
  'GOVERNMENT SERVICES',
  'GRAPHIC DESIGN & BRANDING',
  'INTERNET & GENERAL OFFICE SERVICES',
];

export const PosScreen: React.FC = () => {
  const { user, settings, isAdmin } = useAuth();

  // Catalogue data
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick Restock from POS (Admin)
  const [posRestockModalOpen, setPosRestockModalOpen] = useState<boolean>(false);
  const [posRestockProduct, setPosRestockProduct] = useState<Product | null>(null);
  const [posRestockQty, setPosRestockQty] = useState<string>('10');
  const [posRestockReason, setPosRestockReason] = useState<string>('');
  const [posRestockSaving, setPosRestockSaving] = useState<boolean>(false);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cartNotes, setCartNotes] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Cart Navigation & Discounts State
  const [cartTab, setCartTab] = useState<'items' | 'discounts'>('items');
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [appliedDiscountRule, setAppliedDiscountRule] = useState<Discount | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [customDiscountType, setCustomDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [customDiscountReason, setCustomDiscountReason] = useState<string>('');

  // Direct Cashier / Admin Discount Entry
  const [directDiscountType, setDirectDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [directDiscountInput, setDirectDiscountInput] = useState<string>('');
  const [targetTotalInput, setTargetTotalInput] = useState<string>('');
  const [showTargetTotalPrompt, setShowTargetTotalPrompt] = useState<boolean>(false);

  // Line Item Discount Editor Modal
  const [itemDiscountModalItem, setItemDiscountModalItem] = useState<CartItem | null>(null);
  const [itemDiscountVal, setItemDiscountVal] = useState<string>('');
  const [itemDiscountUnit, setItemDiscountUnit] = useState<'fixed' | 'percentage' | 'override_price'>('fixed');

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'bank' | 'mixed'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [mpesaReference, setMpesaReference] = useState<string>('');
  const [mixedCash, setMixedCash] = useState<string>('');
  const [mixedMpesa, setMixedMpesa] = useState<string>('');
  const [processingSale, setProcessingSale] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [receiptFormat, setReceiptFormat] = useState<'thermal' | 'a4'>('thermal');
  const [receiptCopied, setReceiptCopied] = useState<boolean>(false);

  const handleCopyReceiptText = async () => {
    if (!completedSale) return;
    const ok = await copyReceiptToClipboard(completedSale, settings);
    if (ok) {
      setReceiptCopied(true);
      setTimeout(() => setReceiptCopied(false), 2500);
    }
  };

  // Responsive Mobile/Tablet View Tab
  const [mobileTab, setMobileTab] = useState<'catalogue' | 'cart'>('catalogue');
  const [stockToast, setStockToast] = useState<{
    type: 'success' | 'out_of_stock' | 'limit';
    title: string;
    message: string;
    productId?: number;
  } | null>(null);

  // Auto-dismiss stock toast
  useEffect(() => {
    if (!stockToast) return;
    const timer = setTimeout(() => {
      setStockToast(null);
    }, stockToast.type === 'out_of_stock' ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, [stockToast]);

  // Quick Customer Add Modal
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load Catalogue
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [servRes, prodRes, custRes, discRes] = await Promise.all([
        api.get<{ services: Service[] }>('/services?active_only=true'),
        api.get<{ products: Product[] }>('/products?active_only=true'),
        api.get<{ customers: Customer[] }>('/customers'),
        api.get<{ discounts: Discount[] }>('/discounts?active_only=true').catch(() => ({ discounts: [] })),
      ]);
      setServices(servRes.services || []);
      setProducts(prodRes.products || []);
      setCustomers(custRes.customers || []);
      setAvailableDiscounts(discRes?.discounts || []);
    } catch (err: any) {
      if (err?.status === 401) {
        // Handled globally by auth:unauthorized event
        return;
      }
      console.warn('Could not load catalogue:', err.message || err);
      setLoadError(err.message || 'Failed to load catalogue. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard shortcut listener for F2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic available categories list
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('ALL');
    cats.add('SERVICES');
    cats.add('STATIONERY & PRODUCTS');
    services.forEach((s) => s.category_name && cats.add(s.category_name.toUpperCase()));
    products.forEach((p) => p.category_name && cats.add(p.category_name.toUpperCase()));
    return Array.from(cats);
  }, [services, products]);

  // Searchable offerings list (Services + Products)
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Map services
    const servItems = services.map((s) => ({
      id: `s-${s.id}`,
      productId: null as number | null,
      serviceId: s.id,
      name: s.name,
      categoryName: s.category_name || 'SERVICES',
      price: s.price,
      costPrice: s.cost_estimate || 0,
      unit: s.unit || 'unit',
      stockQuantity: 99999,
      sku: '',
      barcode: '',
      isProduct: false,
      description: s.description,
    }));

    // Map products
    const prodItems = products.map((p) => ({
      id: `p-${p.id}`,
      productId: p.id,
      serviceId: null as number | null,
      name: p.name,
      categoryName: p.category_name || 'PRODUCTS',
      price: p.selling_price,
      costPrice: p.cost_price || 0,
      unit: p.unit || 'pc',
      stockQuantity: p.stock_quantity,
      sku: p.sku || '',
      barcode: p.barcode || '',
      isProduct: true,
      description: `Stock: ${p.stock_quantity} ${p.unit || 'pcs'}`,
    }));

    let all = [...servItems, ...prodItems];

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'SERVICES') {
        all = all.filter((i) => !i.isProduct);
      } else if (selectedCategory === 'STATIONERY & PRODUCTS') {
        all = all.filter((i) => i.isProduct);
      } else {
        all = all.filter((i) => {
          const catUpper = (i.categoryName || '').toUpperCase();
          const targetUpper = selectedCategory.toUpperCase();
          return catUpper === targetUpper || catUpper.includes(targetUpper) || targetUpper.includes(catUpper);
        });
      }
    }

    // Filter by Search Query
    if (query) {
      all = all.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.categoryName.toLowerCase().includes(query) ||
          (i.sku && i.sku.toLowerCase().includes(query)) ||
          (i.barcode && i.barcode.toLowerCase().includes(query)) ||
          (i.description && i.description.toLowerCase().includes(query))
      );
    }

    return all;
  }, [services, products, selectedCategory, searchQuery]);

  // Add Item to Cart
  const addToCart = (item: {
    productId: number | null;
    serviceId: number | null;
    name: string;
    price: number | string;
    costPrice: number | string;
    unit: string;
    isProduct: boolean;
    stockQuantity?: number;
  }) => {
    // 1. If it's a physical product and stock is 0 or less
    if (item.isProduct && (item.stockQuantity === undefined || item.stockQuantity <= 0)) {
      setStockToast({
        type: 'out_of_stock',
        title: 'Out of Stock',
        message: `"${item.name}" is currently out of stock (0 ${item.unit} available in inventory).`,
        productId: item.productId || undefined,
      });
      return;
    }

    const unitPrice = Number(item.price) || 0;
    const costPrice = Number(item.costPrice) || 0;
    const cartKey = item.productId ? `p-${item.productId}` : `s-${item.serviceId}`;

    // 2. Check if product already exists in cart and exceeds available stock
    const existing = cart.find((c) => c.cartId === cartKey);
    if (
      existing &&
      item.isProduct &&
      settings?.allow_negative_stock !== 1 &&
      item.stockQuantity !== undefined &&
      existing.quantity + 1 > item.stockQuantity
    ) {
      setStockToast({
        type: 'limit',
        title: 'Stock Limit Reached',
        message: `Cannot add more "${item.name}". Only ${item.stockQuantity} ${item.unit}(s) available. All are in your cart.`,
      });
      return;
    }

    setCart((prevCart) => {
      const existingInCart = prevCart.find((c) => c.cartId === cartKey);

      if (existingInCart) {
        return prevCart.map((c) =>
          c.cartId === cartKey
            ? {
                ...c,
                quantity: c.quantity + 1,
                total: (c.quantity + 1) * c.unitPrice - c.discount,
              }
            : c
        );
      } else {
        const newItem: CartItem = {
          cartId: cartKey,
          productId: item.productId,
          serviceId: item.serviceId,
          name: item.name,
          unitPrice: unitPrice,
          costPrice: costPrice,
          quantity: 1,
          unit: item.unit,
          discount: 0,
          total: unitPrice,
          isProduct: item.isProduct,
          stockQuantity: item.stockQuantity,
        };
        return [...prevCart, newItem];
      }
    });

    // Show instant visual confirmation banner
    setStockToast({
      type: 'success',
      title: 'Added to Cart',
      message: `${item.name} (${formatKsh(unitPrice)}/${item.unit})`,
    });
  };

  // Update Cart Quantity
  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.cartId !== cartId) return item;

          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          if (
            delta > 0 &&
            item.isProduct &&
            settings?.allow_negative_stock !== 1 &&
            item.stockQuantity !== undefined &&
            newQty > item.stockQuantity
          ) {
            setStockToast({
              type: 'limit',
              title: 'Stock Limit Reached',
              message: `Maximum ${item.stockQuantity} ${item.unit}(s) available in inventory for "${item.name}".`,
            });
            return item;
          }

          const newTotal = newQty * item.unitPrice - item.discount;
          return {
            ...item,
            quantity: newQty,
            total: Math.max(0, newTotal),
          };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Set direct quantity
  const setDirectQuantity = (cartId: string, quantityStr: string) => {
    const parsedQty = parseFloat(quantityStr);
    if (isNaN(parsedQty) || parsedQty <= 0) return;

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cartId !== cartId) return item;

        if (
          item.isProduct &&
          settings?.allow_negative_stock !== 1 &&
          item.stockQuantity !== undefined &&
          parsedQty > item.stockQuantity
        ) {
          setStockToast({
            type: 'limit',
            title: 'Stock Limit Reached',
            message: `Only ${item.stockQuantity} ${item.unit}(s) in stock for "${item.name}". Capping quantity to available stock.`,
          });
          const cappedQty = item.stockQuantity;
          const newTotal = cappedQty * item.unitPrice - item.discount;
          return {
            ...item,
            quantity: cappedQty,
            total: Math.max(0, newTotal),
          };
        }

        const newTotal = parsedQty * item.unitPrice - item.discount;
        return {
          ...item,
          quantity: parsedQty,
          total: Math.max(0, newTotal),
        };
      })
    );
  };

  // Remove from cart
  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  // Clear entire cart or reset for new customer
  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear all items and concessions from current order?')) {
      setCart([]);
      setGlobalDiscount(0);
      setDirectDiscountInput('');
      setAppliedDiscountRule(null);
      setCartNotes('');
    }
  };

  const handleResetForNextCustomer = () => {
    setSelectedCustomerId(null);
    setCart([]);
    setGlobalDiscount(0);
    setDirectDiscountInput('');
    setAppliedDiscountRule(null);
    setCartNotes('');
    setPromoCodeInput('');
    setPromoCodeError(null);
    setStockToast({
      type: 'success',
      title: 'Ready for Next Customer',
      message: 'Cart, client selection, and all discounts have been reset.',
    });
  };

  // Remove/delete global discount with 1-click
  const removeGlobalDiscount = () => {
    setGlobalDiscount(0);
    setDirectDiscountInput('');
    setAppliedDiscountRule(null);
    setStockToast({
      type: 'success',
      title: 'Discount Removed',
      message: 'The order concession has been cleared.',
    });
  };

  // Direct Discount Price Handler for Cashier or Admin
  const handleDirectDiscountChange = (valStr: string, mode: 'fixed' | 'percentage' = directDiscountType) => {
    setDirectDiscountInput(valStr);
    if (cart.length === 0) return;

    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) {
      setGlobalDiscount(0);
      setAppliedDiscountRule(null);
      return;
    }

    if (mode === 'percentage') {
      const pct = Math.min(100, Math.max(0, val));
      const calculated = Math.round(((subtotal * pct) / 100) * 100) / 100;
      setGlobalDiscount(calculated);
      setAppliedDiscountRule(null);
    } else {
      const deduction = Math.min(val, subtotal);
      setGlobalDiscount(deduction);
      setAppliedDiscountRule(null);
    }
  };

  const handleSwitchDirectDiscountType = (newType: 'fixed' | 'percentage') => {
    setDirectDiscountType(newType);
    if (directDiscountInput) {
      handleDirectDiscountChange(directDiscountInput, newType);
    }
  };

  const handleQuickDirectDiscount = (amt: number) => {
    if (cart.length === 0) {
      setStockToast({
        type: 'limit',
        title: 'Empty Cart',
        message: 'Add items to the order before entering a discount.',
      });
      return;
    }
    if (globalDiscount === amt && !appliedDiscountRule && directDiscountType === 'fixed') {
      setGlobalDiscount(0);
      setDirectDiscountInput('');
      setStockToast({
        type: 'success',
        title: 'Discount Removed',
        message: 'Concession cleared.',
      });
      return;
    }
    setDirectDiscountType('fixed');
    setDirectDiscountInput(String(amt));
    setGlobalDiscount(Math.min(amt, subtotal));
    setAppliedDiscountRule(null);
    setStockToast({
      type: 'success',
      title: `KSh ${amt} Concession Applied`,
      message: `Discount of -${formatKsh(amt)} applied directly.`,
    });
  };

  const handleApplyTargetTotal = () => {
    const target = parseFloat(targetTotalInput);
    if (isNaN(target) || target < 0) {
      setStockToast({
        type: 'limit',
        title: 'Invalid Target Total',
        message: 'Enter a valid amount the customer agreed to pay.',
      });
      return;
    }
    if (target > subtotal) {
      setStockToast({
        type: 'limit',
        title: 'Amount Exceeds Subtotal',
        message: `Agreed total cannot exceed cart subtotal (${formatKsh(subtotal)}).`,
      });
      return;
    }
    const discount = Math.round((subtotal - target) * 100) / 100;
    setDirectDiscountType('fixed');
    setDirectDiscountInput(String(discount));
    setGlobalDiscount(discount);
    setAppliedDiscountRule(null);
    setShowTargetTotalPrompt(false);
    setTargetTotalInput('');
    setStockToast({
      type: 'success',
      title: 'Target Settlement Applied',
      message: `Discount set to -${formatKsh(discount)} so client pays exactly ${formatKsh(target)}.`,
    });
  };

  // Discount Action Handlers (Supports 1-click apply and toggle-off to delete)
  const applyPresetPercentage = (pct: number) => {
    if (cart.length === 0) {
      setStockToast({
        type: 'limit',
        title: 'Empty Cart',
        message: 'Add products or services to the cart before applying discounts.',
      });
      return;
    }
    const calculated = Math.round(((subtotal * pct) / 100) * 100) / 100;

    // Toggle off if already applied
    if (globalDiscount === calculated && !appliedDiscountRule) {
      setGlobalDiscount(0);
      setDirectDiscountInput('');
      setStockToast({
        type: 'success',
        title: 'Discount Deleted',
        message: `${pct}% discount concession removed from order.`,
      });
      return;
    }

    setDirectDiscountType('percentage');
    setDirectDiscountInput(String(pct));
    setGlobalDiscount(calculated);
    setAppliedDiscountRule(null);
    setStockToast({
      type: 'success',
      title: `${pct}% Discount Applied`,
      message: `Concession of -${formatKsh(calculated)} deducted from order subtotal.`,
    });
  };

  const applyPresetFixed = (amount: number) => {
    if (cart.length === 0) {
      setStockToast({
        type: 'limit',
        title: 'Empty Cart',
        message: 'Add products or services to the cart before applying discounts.',
      });
      return;
    }
    const deduction = Math.min(amount, subtotal);

    // Toggle off if already applied
    if (globalDiscount === deduction && !appliedDiscountRule) {
      setGlobalDiscount(0);
      setDirectDiscountInput('');
      setStockToast({
        type: 'success',
        title: 'Discount Deleted',
        message: `Fixed concession of KSh ${amount} removed from order.`,
      });
      return;
    }

    setDirectDiscountType('fixed');
    setDirectDiscountInput(String(amount));
    setGlobalDiscount(deduction);
    setAppliedDiscountRule(null);
    setStockToast({
      type: 'success',
      title: `KSh ${amount} Concession Applied`,
      message: `Fixed discount of -${formatKsh(deduction)} applied to order.`,
    });
  };

  const applyDiscountRule = (rule: Discount) => {
    if (cart.length === 0) {
      setStockToast({
        type: 'limit',
        title: 'Empty Cart',
        message: 'Add products or services to the cart before applying discounts.',
      });
      return;
    }

    // Toggle off / delete if already applied
    if (appliedDiscountRule && appliedDiscountRule.id === rule.id) {
      setGlobalDiscount(0);
      setAppliedDiscountRule(null);
      setStockToast({
        type: 'success',
        title: 'Discount Deleted',
        message: `Promotion "${rule.name}" removed from order.`,
      });
      return;
    }

    // Min spend check
    if (rule.min_spend > 0 && subtotal < rule.min_spend) {
      setStockToast({
        type: 'limit',
        title: 'Minimum Spend Not Met',
        message: `Promotion "${rule.name}" requires minimum spend of ${formatKsh(rule.min_spend)}. Current subtotal: ${formatKsh(subtotal)}.`,
      });
      return;
    }

    let applicableBase = subtotal;
    if (rule.target_type === 'product') {
      applicableBase = cart.filter((i) => i.isProduct).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      if (applicableBase <= 0) {
        setStockToast({
          type: 'limit',
          title: 'No Qualifying Products',
          message: `"${rule.name}" applies only to physical products in cart.`,
        });
        return;
      }
    } else if (rule.target_type === 'service') {
      applicableBase = cart.filter((i) => !i.isProduct).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      if (applicableBase <= 0) {
        setStockToast({
          type: 'limit',
          title: 'No Qualifying Services',
          message: `"${rule.name}" applies only to cyber services in cart.`,
        });
        return;
      }
    }

    let calculatedDiscount = 0;
    if (rule.discount_type === 'percentage') {
      calculatedDiscount = (applicableBase * rule.value) / 100;
      if (rule.max_discount && rule.max_discount > 0 && calculatedDiscount > rule.max_discount) {
        calculatedDiscount = rule.max_discount;
      }
    } else {
      calculatedDiscount = Math.min(rule.value, applicableBase);
    }

    calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;
    setGlobalDiscount(calculatedDiscount);
    setAppliedDiscountRule(rule);
    setStockToast({
      type: 'success',
      title: `Promotion Applied: ${rule.name}`,
      message: `Discount of -${formatKsh(calculatedDiscount)} deducted from bill.`,
    });
  };

  const handleApplyPromoCode = async () => {
    setPromoCodeError(null);
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoCodeError('Please enter a voucher or promo code.');
      return;
    }
    if (cart.length === 0) {
      setPromoCodeError('Cart is empty. Add items first.');
      return;
    }

    // Try finding in loaded discounts first
    const matched = availableDiscounts.find((d) => d.code && d.code.toUpperCase() === code);
    if (matched) {
      applyDiscountRule(matched);
      setPromoCodeInput('');
      return;
    }

    // If not found in memory, validate via server API
    try {
      const res = await api.post<{ valid: boolean; discount_amount: number; discount: Discount; message?: string }>(
        '/discounts/validate',
        {
          code,
          subtotal,
          items: cart.map((i) => ({ isProduct: i.isProduct, total: i.quantity * i.unitPrice })),
        }
      );

      if (res.valid && res.discount_amount > 0) {
        setGlobalDiscount(res.discount_amount);
        setAppliedDiscountRule(res.discount);
        setPromoCodeInput('');
        setStockToast({
          type: 'success',
          title: `Promo Code Applied: ${code}`,
          message: `Savings of -${formatKsh(res.discount_amount)} deducted.`,
        });
      } else {
        setPromoCodeError(res.message || 'Invalid or inactive promo code.');
      }
    } catch (err: any) {
      setPromoCodeError(err.message || 'Invalid or expired promo code.');
    }
  };

  const handleApplyCustomDiscount = () => {
    const val = parseFloat(customDiscountValue);
    if (isNaN(val) || val <= 0) {
      setStockToast({
        type: 'limit',
        title: 'Invalid Discount',
        message: 'Enter a valid positive number for discount value.',
      });
      return;
    }
    if (cart.length === 0) {
      setStockToast({
        type: 'limit',
        title: 'Empty Cart',
        message: 'Add items to cart before applying discount.',
      });
      return;
    }

    let calculated = 0;
    if (customDiscountType === 'percentage') {
      if (val > 100) {
        setStockToast({
          type: 'limit',
          title: 'Percentage Limit',
          message: 'Percentage discount cannot exceed 100%.',
        });
        return;
      }
      calculated = Math.round(((subtotal * val) / 100) * 100) / 100;
    } else {
      calculated = Math.min(val, subtotal);
    }

    setGlobalDiscount(calculated);
    setAppliedDiscountRule(null);
    if (customDiscountReason.trim()) {
      setCartNotes((prev) => (prev ? `${prev} | Discount: ${customDiscountReason.trim()}` : `Discount: ${customDiscountReason.trim()}`));
    }
    setCustomDiscountValue('');
    setCustomDiscountReason('');
    setStockToast({
      type: 'success',
      title: 'Custom Discount Applied',
      message: `Discount of -${formatKsh(calculated)} deducted from order.`,
    });
  };

  const updateItemDiscount = (cartId: string, discAmount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId !== cartId) return item;
        const boundedDiscount = Math.max(0, Math.min(discAmount, item.quantity * item.unitPrice));
        return {
          ...item,
          discount: boundedDiscount,
          total: Math.max(0, item.quantity * item.unitPrice - boundedDiscount),
        };
      })
    );
  };

  const handleOpenItemDiscountModal = (item: CartItem) => {
    setItemDiscountModalItem(item);
    setItemDiscountVal(item.discount > 0 ? String(item.discount) : '');
    setItemDiscountUnit('fixed');
  };

  const handleSaveItemDiscount = () => {
    if (!itemDiscountModalItem) return;
    const val = parseFloat(itemDiscountVal);
    if (isNaN(val) || val <= 0) {
      updateItemDiscount(itemDiscountModalItem.cartId, 0);
      setItemDiscountModalItem(null);
      setStockToast({
        type: 'success',
        title: 'Line Discount Removed',
        message: `Concession removed from "${itemDiscountModalItem.name}".`,
      });
      return;
    }

    let deduction = val;
    const lineGross = itemDiscountModalItem.quantity * itemDiscountModalItem.unitPrice;
    if (itemDiscountUnit === 'percentage') {
      deduction = (lineGross * Math.min(100, val)) / 100;
    } else if (itemDiscountUnit === 'override_price') {
      const targetGross = itemDiscountModalItem.quantity * val;
      deduction = Math.max(0, lineGross - targetGross);
    }
    deduction = Math.round(Math.min(deduction, lineGross) * 100) / 100;

    updateItemDiscount(itemDiscountModalItem.cartId, deduction);
    setItemDiscountModalItem(null);
    setStockToast({
      type: 'success',
      title: 'Line Concession Applied',
      message: `Discount of -${formatKsh(deduction)} applied to "${itemDiscountModalItem.name}".`,
    });
  };

  const clearAllDiscounts = () => {
    setGlobalDiscount(0);
    setDirectDiscountInput('');
    setAppliedDiscountRule(null);
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        discount: 0,
        total: item.quantity * item.unitPrice,
      }))
    );
    setStockToast({
      type: 'success',
      title: 'All Discounts Deleted',
      message: 'All cart and line-item concessions have been removed.',
    });
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const itemsDiscountTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  }, [cart]);

  const totalDiscount = itemsDiscountTotal + globalDiscount;

  const taxAmount = useMemo(() => {
    if (settings?.tax_enabled === 1 && settings?.tax_rate > 0) {
      const taxable = Math.max(0, subtotal - totalDiscount);
      return (taxable * settings.tax_rate) / 100;
    }
    return 0;
  }, [subtotal, totalDiscount, settings]);

  const grandTotal = Math.max(0, subtotal - totalDiscount + taxAmount);

  // Handle Quick Payment Open
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setSaleError(null);
    setCashTendered(String(grandTotal));
    setMixedCash(String(Math.floor(grandTotal / 2)));
    setMixedMpesa(String(Math.ceil(grandTotal / 2)));
    setPaymentModalOpen(true);
  };

  // Calculate Change
  const cashGiven = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashGiven - grandTotal);
  const isCashInsufficient = paymentMethod === 'cash' && cashGiven < grandTotal;

  // Complete Sale Checkout
  const handleCompleteSale = async () => {
    setSaleError(null);

    // Validate Payment
    const paymentsList: Array<{ method: 'cash' | 'mpesa' | 'card' | 'bank' | 'other'; amount: number; reference?: string }> = [];

    if (paymentMethod === 'cash') {
      if (cashGiven < grandTotal) {
        setSaleError(`Cash tendered (KSh ${cashGiven}) is less than Total (KSh ${grandTotal}).`);
        return;
      }
      paymentsList.push({
        method: 'cash',
        amount: grandTotal,
      });
    } else if (paymentMethod === 'mpesa') {
      if (!mpesaReference.trim()) {
        setSaleError('Please enter M-Pesa transaction reference code (e.g. QHK7891234).');
        return;
      }
      paymentsList.push({
        method: 'mpesa',
        amount: grandTotal,
        reference: mpesaReference.trim().toUpperCase(),
      });
    } else if (paymentMethod === 'mixed') {
      const cAmt = parseFloat(mixedCash) || 0;
      const mAmt = parseFloat(mixedMpesa) || 0;
      if (cAmt + mAmt < grandTotal) {
        setSaleError(`Mixed payment sum (KSh ${cAmt + mAmt}) is less than grand total (KSh ${grandTotal}).`);
        return;
      }
      if (mAmt > 0 && !mpesaReference.trim()) {
        setSaleError('Please provide the M-Pesa reference for the mobile portion.');
        return;
      }
      if (cAmt > 0) paymentsList.push({ method: 'cash', amount: cAmt });
      if (mAmt > 0) paymentsList.push({ method: 'mpesa', amount: mAmt, reference: mpesaReference.trim().toUpperCase() });
    } else {
      // card or bank
      paymentsList.push({
        method: paymentMethod,
        amount: grandTotal,
        reference: mpesaReference.trim() || undefined,
      });
    }

    try {
      setProcessingSale(true);

      const payload = {
        customerId: selectedCustomerId,
        items: cart.map((item) => ({
          productId: item.productId,
          serviceId: item.serviceId,
          name: item.name,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          quantity: item.quantity,
          unit: item.unit,
          discount: item.discount,
          total: item.total,
        })),
        subtotal,
        discount: totalDiscount,
        tax: taxAmount,
        total: grandTotal,
        payments: paymentsList,
        amountPaid: paymentMethod === 'cash' ? cashGiven : grandTotal,
        change: paymentMethod === 'cash' ? changeDue : 0,
        notes: cartNotes.trim() || undefined,
      };

      const res = await api.post<{ success: boolean; sale: Sale }>('/sales', payload);

      if (res.sale) {
        // Success celebration
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });

        // Optimistically deduct stock from local state so UI updates immediately
        setProducts((prev) =>
          prev.map((p) => {
            const soldItem = cart.find((c) => c.productId === p.id);
            if (soldItem) {
              return {
                ...p,
                stock_quantity: Math.max(0, p.stock_quantity - soldItem.quantity),
              };
            }
            return p;
          })
        );

        setCompletedSale(res.sale);
        setPaymentModalOpen(false);
        setReceiptModalOpen(true);

        // Reset Cart State
        setCart([]);
        setGlobalDiscount(0);
        setCartNotes('');
        setSelectedCustomerId(null);

        // Reload data from backend to ensure synchronization
        loadData();
      }
    } catch (err: any) {
      console.error('Sale transaction failed:', err);
      setSaleError(err.message || 'Failed to process sale. Please check balance.');
    } finally {
      setProcessingSale(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const res = await api.post<{ success: boolean; customer: Customer }>('/customers', {
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
      });

      if (res.customer) {
        setCustomers((prev) => [res.customer, ...prev]);
        setSelectedCustomerId(res.customer.id);
        setNewCustomerModalOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
      }
    } catch (err: any) {
      alert('Failed to register customer: ' + err.message);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-57px)] overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] relative transition-colors">
      {/* Toast Alert for Stock / Actions */}
      {stockToast && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-3 text-xs max-w-xl w-max animate-in fade-in slide-in-from-top-3 border ${
            stockToast.type === 'out_of_stock'
              ? 'bg-rose-950 text-rose-100 border-rose-600 shadow-rose-950/60 ring-2 ring-rose-500/30'
              : stockToast.type === 'limit'
              ? 'bg-amber-950 text-amber-100 border-amber-600 shadow-amber-950/60 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white border-[#2563EB]/40 shadow-lg'
          }`}
        >
          {stockToast.type === 'out_of_stock' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {stockToast.type === 'limit' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {stockToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />}
          <div className="flex-1">
            <span className="font-bold tracking-wide uppercase">{stockToast.title}</span>: {stockToast.message}
          </div>
          {stockToast.type === 'out_of_stock' && stockToast.productId && isAdmin && (
            <button
              onClick={() => {
                const prod = products.find((p) => p.id === stockToast.productId);
                if (prod) {
                  setPosRestockProduct(prod);
                  setPosRestockQty('10');
                  setPosRestockReason(`POS Quick Restock for ${prod.name}`);
                  setPosRestockModalOpen(true);
                  setStockToast(null);
                }
              }}
              className="px-2.5 py-1 bg-[#2563EB] text-white font-semibold rounded text-[10px] uppercase tracking-wider hover:bg-[#1D4ED8] transition cursor-pointer shrink-0 shadow"
            >
              + Restock Item
            </button>
          )}
          <button onClick={() => setStockToast(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MOBILE / TABLET TOP TAB SWITCHER (Visible on < lg) */}
      <div className="lg:hidden bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] p-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setMobileTab('catalogue')}
          className={`flex-1 py-2 px-3 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            mobileTab === 'catalogue'
              ? 'bg-[#2563EB] text-white shadow'
              : 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Catalogue ({filteredItems.length})
        </button>

        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            mobileTab === 'cart'
              ? 'bg-[#2563EB] text-white shadow'
              : 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Order Cart ({totalCartCount})
          {grandTotal > 0 && <span className="font-mono text-[11px]">[{formatKsh(grandTotal)}]</span>}
        </button>
      </div>

      {/* LEFT: Catalogue, Search & Filtering */}
      <div
        className={`flex-1 flex-col min-w-0 border-r border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B0F19] ${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Top Search & Filter Bar */}
        <div className="p-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                id="input-pos-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredItems.length === 1) {
                      addToCart(filteredItems[0]);
                    }
                  }
                }}
                placeholder="Search services, products, SKU, or scan barcode (F2)..."
                className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/40 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#2563EB]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={loadData}
              title="Refresh catalogue"
              className="p-2 bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] rounded-lg border border-[#E2E8F0] dark:border-[#334155] transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Business Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            {availableCategories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`cat-pill-${cat}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-[11px] uppercase tracking-wider font-medium whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'border border-[#2563EB] bg-[#2563EB] text-white font-semibold shadow-xs'
                      : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] border border-[#E2E8F0] dark:border-[#334155]'
                  }`}
                >
                  {cat === 'PRINTING & DOCUMENTATION'
                    ? 'Printing & Docs'
                    : cat === 'GOVERNMENT SERVICES'
                    ? 'Govt Portals'
                    : cat === 'GRAPHIC DESIGN & BRANDING'
                    ? 'Branding'
                    : cat === 'INTERNET & GENERAL OFFICE SERVICES'
                    ? 'Internet & Office'
                    : cat === 'SERVICES'
                    ? 'All Services'
                    : cat === 'STATIONERY & PRODUCTS'
                    ? 'Stationery & Products'
                    : cat === 'ALL'
                    ? 'All Offerings'
                    : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 lg:pb-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] text-xs">
              <RotateCcw className="w-5 h-5 animate-spin mr-2 text-[#2563EB]" /> Synchronizing catalogue...
            </div>
          ) : loadError ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs space-y-3 p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-500 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-rose-600 dark:text-rose-300 max-w-sm">{loadError}</p>
              <button
                id="btn-retry-catalogue"
                onClick={loadData}
                className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Loading Catalogue
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#64748B] dark:text-[#94A3B8] text-xs space-y-2">
              <Search className="w-8 h-8 text-[#94A3B8] dark:text-[#475569]" />
              <p>No offerings found matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="text-[#2563EB] dark:text-[#3B82F6] uppercase tracking-wider underline cursor-pointer text-[11px]"
              >
                Clear search criteria
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const isOutOfStock = item.isProduct && (item.stockQuantity ?? 0) <= 0;
                const isLowStock = item.isProduct && (item.stockQuantity ?? 0) > 0 && (item.stockQuantity ?? 0) <= 5;

                return (
                  <button
                    key={item.id}
                    id={`item-btn-${item.id}`}
                    onClick={() => addToCart(item)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition relative cursor-pointer group shadow-xs hover:shadow-md ${
                      isOutOfStock
                        ? 'bg-rose-50/50 dark:bg-[#140b0b] border-rose-200 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-600/80'
                        : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2 flex-wrap">
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] border border-[#BFDBFE] dark:border-[#334155]">
                          {item.categoryName}
                        </span>

                        {item.isProduct ? (
                          isOutOfStock ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700/60 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                              {item.stockQuantity} {item.unit} left
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              {item.stockQuantity} {item.unit} in stock
                            </span>
                          )
                        ) : (
                          <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30">
                            Service
                          </span>
                        )}
                      </div>

                      <h4
                        className={`font-semibold text-xs line-clamp-2 transition ${
                          isOutOfStock
                            ? 'text-rose-900 dark:text-[#F1B5B5]'
                            : 'text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#2563EB] dark:group-hover:text-[#3B82F6]'
                        }`}
                      >
                        {item.name}
                      </h4>

                      {item.description && (
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1 mt-1">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] dark:border-[#1E293B] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">Rate:</span>
                        <div className="font-serif-luxury text-xs text-[#0F172A] dark:text-[#F8FAFC] font-semibold">
                          {formatKsh(item.price)}
                          <span className="text-[9px] text-[#64748B] dark:text-[#94A3B8] font-sans font-normal">/{item.unit}</span>
                        </div>
                      </div>

                      {isOutOfStock ? (
                        <div className="px-2 py-1 rounded border border-rose-300 dark:border-rose-800/50 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Out of stock
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg border border-[#BFDBFE] dark:border-[#2563EB]/40 bg-[#EFF6FF] dark:bg-[#1E293B] group-hover:bg-[#2563EB] text-[#2563EB] group-hover:text-white flex items-center justify-center transition shadow-2xs">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FLOATING MOBILE/TABLET SETTLEMENT BAR (Visible on < lg when in catalogue and cart has items) */}
        {cart.length > 0 && (
          <div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur border border-[#2563EB] p-3 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">Order Total ({totalCartCount} items)</div>
              <div className="font-serif-luxury text-base text-[#2563EB] font-bold">{formatKsh(grandTotal)}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileTab('cart')}
                className="px-3 py-2 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#334155]"
              >
                View Cart
              </button>
              <button
                onClick={handleOpenCheckout}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow"
              >
                Settle & Pay <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Active Cart & Checkout Panel */}
      <div
        className={`w-full lg:w-96 bg-white dark:bg-[#0F172A] flex-col shrink-0 border-l border-[#E2E8F0] dark:border-[#1E293B] h-full ${
          mobileTab === 'catalogue' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Cart Header & Customer Selector */}
        <div className="p-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#2563EB]" />
              <h2 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-[0.18em]">
                Current Order
              </h2>
              <span className="bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] border border-[#BFDBFE] dark:border-[#334155] text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(cart.length > 0 || totalDiscount > 0 || selectedCustomerId) && (
                <button
                  id="btn-next-customer"
                  onClick={handleResetForNextCustomer}
                  title="Reset order, customer, and all discounts for next customer"
                  className="text-[10px] text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#3B82F6] font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                >
                  <UserPlus className="w-3 h-3" /> Next Client
                </button>
              )}

              {cart.length > 0 && (
                <button
                  id="btn-clear-cart"
                  onClick={clearCart}
                  className="text-[10px] text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <User className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                id="select-cart-customer"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full pl-8 pr-2 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">Walk-in Client (Default)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-quick-add-customer"
              onClick={() => setNewCustomerModalOpen(true)}
              title="Add new customer"
              className="p-1.5 bg-[#EFF6FF] dark:bg-[#1E293B] hover:bg-[#DBEAFE] dark:hover:bg-[#334155] text-[#2563EB] dark:text-[#3B82F6] border border-[#BFDBFE] dark:border-[#334155] rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Active Order Discount Pill (With 1-Click Delete) */}
          {totalDiscount > 0 && (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold truncate">
                  {appliedDiscountRule ? appliedDiscountRule.name : 'Active Concession'}:
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                  -{formatKsh(totalDiscount)}
                </span>
              </div>

              <button
                onClick={clearAllDiscounts}
                title="Delete discount concession"
                className="ml-2 px-2 py-0.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shrink-0 shadow-2xs"
              >
                <Trash2 className="w-2.5 h-2.5" /> Delete Disc
              </button>
            </div>
          )}
        </div>

        {/* Cart Sub-tabs: Order Items vs Discounts & Promotions */}
        <div className="flex border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B0F19] p-1 gap-1 shrink-0">
          <button
            id="tab-cart-items"
            onClick={() => setCartTab('items')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              cartTab === 'items'
                ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Items ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
          </button>

          <button
            id="tab-cart-discounts"
            onClick={() => setCartTab('discounts')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              cartTab === 'discounts'
                ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Discounts</span>
            {totalDiscount > 0 && (
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                -{formatKsh(totalDiscount)}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Cart Items Table */}
        {cartTab === 'items' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0B0F19]">
            {cart.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-[#64748B] dark:text-[#94A3B8] text-xs space-y-2">
                <ShoppingCart className="w-10 h-10 text-[#CBD5E1] dark:text-[#334155] stroke-1" />
                <p className="uppercase tracking-widest text-[10px] font-semibold">Order register is empty</p>
                <p className="text-[10px] text-[#94A3B8] text-center max-w-[200px]">
                  Select services and products on the catalogue to assemble ticket.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartId}
                  className="bg-white dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] text-xs space-y-2 hover:border-[#CBD5E1] dark:hover:border-[#334155] transition shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-tight truncate">{item.name}</div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{formatKsh(item.unitPrice)} / {item.unit}</span>
                        {item.isProduct && item.stockQuantity !== undefined && (
                          <span className="text-[#2563EB] dark:text-[#3B82F6] font-mono">
                            • {item.stockQuantity} in stock
                          </span>
                        )}
                        {item.discount > 0 && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1">
                            -{formatKsh(item.discount)} disc
                            <button
                              onClick={() => updateItemDiscount(item.cartId, 0)}
                              title="Delete line discount"
                              className="text-rose-500 hover:text-rose-700 cursor-pointer ml-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenItemDiscountModal(item)}
                        title={item.discount > 0 ? 'Edit line concession' : 'Add discount to this item'}
                        className={`p-1 rounded transition cursor-pointer border ${
                          item.discount > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300 dark:border-emerald-700'
                            : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155] hover:text-[#2563EB] hover:border-[#BFDBFE]'
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => removeFromCart(item.cartId)}
                        title="Remove from cart"
                        className="text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-400 p-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controls & Subtotal */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.cartId, -1)}
                        className="w-6 h-6 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-md flex items-center justify-center transition cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => setDirectQuantity(item.cartId, e.target.value)}
                        className="w-12 text-center py-0.5 bg-[#F8FAFC] dark:bg-[#0B0F19] border border-[#E2E8F0] dark:border-[#334155] rounded-md text-xs font-mono font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        onClick={() => updateQuantity(item.cartId, 1)}
                        className="w-6 h-6 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-md flex items-center justify-center transition cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] ml-1">{item.unit}</span>
                    </div>

                    <div className="text-right">
                      {item.discount > 0 && (
                        <div className="text-[9px] text-[#94A3B8] line-through font-mono">
                          {formatKsh(item.quantity * item.unitPrice)}
                        </div>
                      )}
                      <div className="font-serif-luxury text-xs text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                        {formatKsh(item.total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Discounts & Promotions Control View */}
        {cartTab === 'discounts' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0B0F19]">
            {/* Active Discount Banner with Quick Delete */}
            {totalDiscount > 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-xs">Active Concession</span>
                  </div>
                  <button
                    onClick={clearAllDiscounts}
                    className="px-2 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" /> Delete / Remove Discount
                  </button>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {appliedDiscountRule ? appliedDiscountRule.name : 'Custom / POS Preset Concession'}
                  </span>
                  <span className="font-serif-luxury text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    -{formatKsh(totalDiscount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-2.5 text-center text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Select a preset, enter a promo code, or pick an active promotion below to apply.
              </div>
            )}

            {/* Quick Preset Percentage Buttons */}
            <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                  <Percent className="w-3 h-3 text-[#2563EB]" /> 1-Click % Presets
                </span>
                <span className="text-[10px] text-[#94A3B8]">Click again to remove</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[5, 10, 15, 20, 25, 50].map((pct) => {
                  const calculated = subtotal > 0 ? Math.round(((subtotal * pct) / 100) * 100) / 100 : 0;
                  const isCurrent = globalDiscount > 0 && Math.abs(globalDiscount - calculated) < 0.01 && !appliedDiscountRule;

                  return (
                    <button
                      key={pct}
                      onClick={() => applyPresetPercentage(pct)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold font-serif-luxury transition cursor-pointer border ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#EFF6FF] dark:hover:bg-[#2563EB]/20 border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#2563EB]'
                      }`}
                    >
                      {pct}% OFF
                      {isCurrent && <span className="block text-[8px] font-sans font-normal opacity-90">Click to Delete</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Preset Fixed Amount Buttons */}
            <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Fixed KSh Deductions
                </span>
                <span className="text-[10px] text-[#94A3B8]">Click again to remove</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 200, 500].map((amt) => {
                  const isCurrent = globalDiscount > 0 && Math.abs(globalDiscount - amt) < 0.01 && !appliedDiscountRule;

                  return (
                    <button
                      key={amt}
                      onClick={() => applyPresetFixed(amt)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer text-center border ${
                        isCurrent
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-amber-50 dark:hover:bg-amber-950/30 border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] hover:text-amber-700'
                      }`}
                    >
                      - {amt}/=
                      {isCurrent && <span className="block text-[7px] font-sans font-normal opacity-90">Delete</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Promo / Voucher Code Box */}
            <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                <Gift className="w-3 h-3 text-[#2563EB]" /> Voucher / Coupon Code
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. STUDENT10, BULK15"
                  value={promoCodeInput}
                  onChange={(e) => {
                    setPromoCodeInput(e.target.value.toUpperCase());
                    setPromoCodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyPromoCode();
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono uppercase text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  onClick={handleApplyPromoCode}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {promoCodeError && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                  {promoCodeError}
                </p>
              )}
            </div>

            {/* Active Store Promotions List */}
            {availableDiscounts.length > 0 && (
              <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#2563EB]" /> Active Store Deals ({availableDiscounts.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {availableDiscounts.map((disc) => {
                    const isCurrent = appliedDiscountRule?.id === disc.id;

                    return (
                      <div
                        key={disc.id}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                          isCurrent
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                            : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {disc.name}
                          </div>
                          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#2563EB] dark:text-[#3B82F6]">
                              {disc.discount_type === 'percentage' ? `${disc.value}% OFF` : `-${formatKsh(disc.value)}`}
                            </span>
                            {disc.min_spend > 0 && (
                              <span>• Min {formatKsh(disc.min_spend)}</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => applyDiscountRule(disc)}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-[#2563EB] hover:bg-[#2563EB] hover:text-white'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <X className="w-2.5 h-2.5" /> Remove
                            </>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Value Discount Form */}
            <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                <Sliders className="w-3 h-3 text-[#2563EB]" /> Custom Concession
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={customDiscountType}
                  onChange={(e) => setCustomDiscountType(e.target.value as any)}
                  className="px-2 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="percentage">% Percent</option>
                  <option value="fixed">KES Fixed</option>
                </select>
                <input
                  type="number"
                  step="any"
                  placeholder={customDiscountType === 'percentage' ? 'e.g. 12' : 'e.g. 150'}
                  value={customDiscountValue}
                  onChange={(e) => setCustomDiscountValue(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <input
                type="text"
                placeholder="Reason / Note (optional, e.g. Returning client)"
                value={customDiscountReason}
                onChange={(e) => setCustomDiscountReason(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-[11px] text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none"
              />
              <button
                onClick={handleApplyCustomDiscount}
                className="w-full py-1.5 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-[#334155] text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Apply Custom Discount
              </button>
            </div>
          </div>
        )}

        {/* Cart Totals & Checkout Button */}
        <div className="p-3.5 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] space-y-3 shadow-sm">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8]">
              <span>Cart Subtotal:</span>
              <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC] font-semibold">{formatKsh(subtotal)}</span>
            </div>

            {/* CASHIER / ADMIN DIRECT DISCOUNT PRICE ENTRY */}
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/70 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="font-bold text-[11px] text-[#0F172A] dark:text-[#F8FAFC]">
                    Discount / Concession:
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowTargetTotalPrompt(!showTargetTotalPrompt)}
                    className="text-[10px] text-[#2563EB] dark:text-[#3B82F6] hover:underline cursor-pointer font-medium"
                  >
                    {showTargetTotalPrompt ? 'Close Pay Target' : 'Set Client Pay Total'}
                  </button>
                  {totalDiscount > 0 && (
                    <button
                      onClick={clearAllDiscounts}
                      title="Clear discount to 0"
                      className="text-[10px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Target Pay Total Mode (Customer negotiated exact final pay amount) */}
              {showTargetTotalPrompt ? (
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#0F172A] p-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155]">
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium shrink-0">Client Pays:</span>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="e.g. 500"
                    value={targetTotalInput}
                    onChange={(e) => setTargetTotalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyTargetTotal();
                    }}
                    className="flex-1 px-2 py-1 text-xs font-mono font-bold bg-transparent text-[#0F172A] dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyTargetTotal}
                    className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold rounded cursor-pointer"
                  >
                    Apply Total
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* Mode toggle KSh / % */}
                  <div className="flex bg-[#E2E8F0] dark:bg-[#0F172A] p-0.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSwitchDirectDiscountType('fixed')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                        directDiscountType === 'fixed'
                          ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] shadow-2xs'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      KSh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchDirectDiscountType('percentage')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                        directDiscountType === 'percentage'
                          ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] shadow-2xs'
                          : 'text-[#64748B] dark:text-[#94A3B8]'
                      }`}
                    >
                      %
                    </button>
                  </div>

                  {/* Direct Input Field */}
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={directDiscountType === 'percentage' ? 'e.g. 10%' : 'Enter discount price'}
                      value={directDiscountInput}
                      onChange={(e) => handleDirectDiscountChange(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1 bg-white dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-lg text-xs font-mono font-bold text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                    />
                    {directDiscountInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setDirectDiscountInput('');
                          setGlobalDiscount(0);
                          setAppliedDiscountRule(null);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-rose-500 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Fast deduction buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[20, 50, 100].map((amt) => {
                      const isCurrent = globalDiscount === amt && !appliedDiscountRule && directDiscountType === 'fixed';
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickDirectDiscount(amt)}
                          className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-[#0F172A] border-[#CBD5E1] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1] hover:border-[#2563EB]'
                          }`}
                        >
                          -{amt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-emerald-600 dark:text-emerald-400 font-semibold border-t border-[#E2E8F0] dark:border-[#334155]">
                  <span>Total Concession Deducted:</span>
                  <span className="font-mono font-bold">-{formatKsh(totalDiscount)}</span>
                </div>
              )}
            </div>

            {settings?.tax_enabled === 1 && (
              <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8]">
                <span>Tax ({settings.tax_rate}%):</span>
                <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC] font-medium">{formatKsh(taxAmount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <span className="font-serif-luxury text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">Settlement Total:</span>
              <span className="font-serif-luxury text-xl text-[#2563EB] font-bold">
                {formatKsh(grandTotal)}
              </span>
            </div>
          </div>

          <button
            id="btn-pos-checkout"
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className={`w-full py-3 rounded-lg text-xs uppercase tracking-[0.2em] font-semibold transition-all shadow flex items-center justify-center gap-2 cursor-pointer ${
              cart.length === 0
                ? 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#94A3B8] dark:text-[#64748B] border border-[#E2E8F0] dark:border-[#334155] cursor-not-allowed'
                : 'border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white active:scale-[0.99] shadow-sm'
            }`}
          >
            <Banknote className="w-4 h-4" /> Finalize {formatKsh(grandTotal)}
          </button>
        </div>
      </div>

      {/* MODAL 1: Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-[#0F172A] dark:text-[#F8FAFC]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B0F19]">
              <div>
                <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-[0.18em]">
                  Settlement Transaction
                </h3>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mt-0.5">
                  {selectedCustomer ? `Client: ${selectedCustomer.name}` : 'Client: Walk-in'}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-[#64748B] hover:text-[#2563EB] dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
              {/* Grand Total Banner */}
              <div className="bg-[#EFF6FF] dark:bg-[#1E293B] p-4 rounded-xl border border-[#BFDBFE] dark:border-[#334155] text-center">
                <div className="text-[10px] text-[#2563EB] dark:text-[#3B82F6] font-semibold uppercase tracking-[0.25em]">TOTAL PAYABLE</div>
                <div className="text-2xl font-serif-luxury text-[#0F172A] dark:text-white font-bold mt-1">
                  {formatKsh(grandTotal)}
                </div>
                {totalDiscount > 0 && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    (Concession: -{formatKsh(totalDiscount)} deducted from {formatKsh(subtotal)})
                  </div>
                )}
              </div>

              {/* Settlement-Time Concession Override (Cashier / Admin) */}
              <div className="bg-[#F8FAFC] dark:bg-[#1E293B]/70 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#2563EB]" /> Settlement Concession / Discount
                  </span>
                  {totalDiscount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllDiscounts}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Remove Concession
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-[#E2E8F0] dark:bg-[#0F172A] p-0.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSwitchDirectDiscountType('fixed')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                        directDiscountType === 'fixed'
                          ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      KSh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchDirectDiscountType('percentage')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                        directDiscountType === 'percentage'
                          ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      %
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={directDiscountType === 'percentage' ? 'e.g. 10%' : 'Enter discount price'}
                      value={directDiscountInput}
                      onChange={(e) => handleDirectDiscountChange(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1 bg-white dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-lg text-xs font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                    />
                    {directDiscountInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setDirectDiscountInput('');
                          setGlobalDiscount(0);
                          setAppliedDiscountRule(null);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-rose-500 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {saleError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{saleError}</span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.2em] block mb-2">
                  Tender Instrument
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                    { id: 'card', label: 'Card / Bank', icon: CreditCard },
                    { id: 'mixed', label: 'Split', icon: Layers },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-lg border text-[11px] uppercase tracking-wider font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          active
                            ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                            : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#0F172A] dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CASH INPUT & QUICK DENOMINATIONS */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 bg-[#F8FAFC] dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
                  <div>
                    <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                      Cash Tendered (KSh)
                    </label>
                    <input
                      id="input-cash-tendered"
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-lg font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Quick Denominations */}
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 200, 500, 1000, grandTotal].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashTendered(String(amt))}
                        className="px-2.5 py-1 bg-white dark:bg-[#0F172A] hover:bg-[#EFF6FF] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-[11px] rounded-md border border-[#E2E8F0] dark:border-[#334155] font-mono transition cursor-pointer"
                      >
                        {amt === grandTotal ? 'Exact Total' : `KSh ${amt}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Output */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">Change Due:</span>
                    <span
                      className={`text-base font-serif-luxury font-bold ${
                        isCashInsufficient ? 'text-rose-600 dark:text-rose-400' : 'text-[#10B981]'
                      }`}
                    >
                      {isCashInsufficient
                        ? `Short by ${formatKsh(grandTotal - cashGiven)}`
                        : `${formatKsh(changeDue)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* M-PESA REFERENCE INPUT */}
              {paymentMethod === 'mpesa' && (() => {
                const servPaybill = settings?.services_mpesa_paybill || '4298298';
                const servAccount = settings?.services_mpesa_account || '0350494';

                return (
                  <div className="space-y-3 bg-[#F8FAFC] dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
                    {/* Paybill Instructions Box */}
                    <div className="p-3 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-[#2563EB] dark:text-[#3B82F6] font-serif-luxury uppercase tracking-wider font-semibold">
                        <span>Cyber & ICT Services (Lipa Na M-Pesa)</span>
                        <span className="font-mono">{formatKsh(grandTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-2 rounded-md border border-[#E2E8F0] dark:border-[#334155]">
                          <span className="text-[#64748B] dark:text-[#94A3B8] block text-[9px] uppercase">PAYBILL NO</span>
                          <span className="text-[#2563EB] dark:text-[#3B82F6] font-bold text-base">{servPaybill}</span>
                        </div>
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-2 rounded-md border border-[#E2E8F0] dark:border-[#334155]">
                          <span className="text-[#64748B] dark:text-[#94A3B8] block text-[9px] uppercase">ACCOUNT NO</span>
                          <span className="text-[#0F172A] dark:text-[#F8FAFC] font-bold text-base">{servAccount}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                        M-Pesa Reference / Confirmation Code *
                      </label>
                      <input
                        id="input-mpesa-ref"
                        type="text"
                        placeholder="e.g. QHK8901234"
                        value={mpesaReference}
                        onChange={(e) => setMpesaReference(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono font-semibold text-[#0F172A] dark:text-white placeholder-[#94A3B8] uppercase focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* MIXED PAYMENT INPUT */}
              {paymentMethod === 'mixed' && (() => {
                const servPaybill = settings?.services_mpesa_paybill || '4298298';
                const servAccount = settings?.services_mpesa_account || '0350494';

                return (
                  <div className="space-y-3 bg-[#F8FAFC] dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">Cash Portion (KSh)</label>
                        <input
                          type="number"
                          value={mixedCash}
                          onChange={(e) => setMixedCash(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono text-[#0F172A] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">M-Pesa Portion (KSh)</label>
                        <input
                          type="number"
                          value={mixedMpesa}
                          onChange={(e) => setMixedMpesa(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono text-[#0F172A] dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-[11px] font-mono text-[#2563EB] dark:text-[#3B82F6] space-y-1">
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-sans">LIPA NA M-PESA CHANNEL:</div>
                      <div>Services: Paybill <strong className="text-[#0F172A] dark:text-white">{servPaybill}</strong> | Acc <strong className="text-[#0F172A] dark:text-white">{servAccount}</strong></div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">M-Pesa Reference Code</label>
                      <input
                        type="text"
                        placeholder="e.g. QHK8901234"
                        value={mpesaReference}
                        onChange={(e) => setMpesaReference(e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs font-mono uppercase text-[#0F172A] dark:text-white"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white text-[11px] uppercase tracking-wider rounded-lg transition cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
              >
                Cancel
              </button>

              <button
                id="btn-confirm-complete-sale"
                type="button"
                disabled={processingSale || isCashInsufficient}
                onClick={handleCompleteSale}
                className={`px-6 py-2.5 rounded-lg text-xs uppercase tracking-[0.2em] font-semibold transition flex items-center gap-2 cursor-pointer shadow ${
                  processingSale || isCashInsufficient
                    ? 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#94A3B8] dark:text-[#64748B] border border-[#E2E8F0] dark:border-[#334155] cursor-not-allowed'
                    : 'border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                }`}
              >
                {processingSale ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-white" /> Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Issue Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Receipt & Print View Modal */}
      {receiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-[#0F172A] dark:text-[#F8FAFC] max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0B0F19]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-[0.18em]">
                  Transaction Settled
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setReceiptFormat(receiptFormat === 'thermal' ? 'a4' : 'thermal')}
                  className="px-2.5 py-1 bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[10px] uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC] rounded-md border border-[#E2E8F0] dark:border-[#334155] transition cursor-pointer"
                >
                  {receiptFormat === 'thermal' ? '80mm Thermal' : 'Standard A4'}
                </button>
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-4 overflow-y-auto flex-1 bg-[#F1F5F9] dark:bg-[#0B0F19] custom-scrollbar flex justify-center">
              <div
                id="printable-receipt"
                className={`bg-white text-black p-5 font-mono text-[11px] leading-tight rounded-xl shadow-md border border-[#E2E8F0] ${
                  receiptFormat === 'thermal' ? 'w-[320px]' : 'w-full'
                }`}
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-gray-400 space-y-0.5">
                  <div className="font-serif font-bold text-sm tracking-wider text-black">
                    {settings?.business_name || 'BRIGHT CYBER & ICT CENTRE'}
                  </div>
                  <div className="text-[10px] text-gray-700">
                    {settings?.address || 'Biashara Street, Nairobi, Kenya'}
                  </div>
                  <div className="text-[10px] text-gray-700">
                    Tel: {settings?.phone || '+254 712 345 678'}
                  </div>
                  <div className="text-[10px] text-gray-700">{settings?.email || 'info@brightcyber.co.ke'}</div>
                </div>

                {/* Metadata */}
                <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span className="font-bold">{completedSale.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDate(completedSale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operator:</span>
                    <span>{completedSale.cashier_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span>{completedSale.customer_name || 'Walk-in Guest'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-2 border-b border-dashed border-gray-400">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-300 font-bold">
                        <th className="pb-1">Item</th>
                        <th className="pb-1 text-center">Qty</th>
                        <th className="pb-1 text-right">Price</th>
                        <th className="pb-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedSale.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1 pr-1 font-medium">{item.item_name_snapshot}</td>
                          <td className="py-1 text-center font-mono">{item.quantity}</td>
                          <td className="py-1 text-right font-mono">{formatNumber(item.unit_price_snapshot)}</td>
                          <td className="py-1 text-right font-mono font-bold">{formatNumber(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatKsh(completedSale.subtotal)}</span>
                  </div>
                  {(completedSale.discount || 0) > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Discount:</span>
                      <span className="font-mono">- {formatKsh(completedSale.discount)}</span>
                    </div>
                  )}
                  {(completedSale.tax || 0) > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Tax:</span>
                      <span className="font-mono">{formatKsh(completedSale.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono">{formatKsh(completedSale.total)}</span>
                  </div>
                </div>

                {/* Payments */}
                <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
                  {completedSale.payments?.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="uppercase font-medium">
                        Paid ({p.method}){p.reference ? ` [${p.reference}]` : ''}:
                      </span>
                      <span className="font-mono">{formatKsh(p.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="text-center pt-2 space-y-1 text-[9px] text-gray-700">
                  <p>{settings?.receipt_footer || 'Thank you for choosing Bright Cyber & ICT Centre!'}</p>
                  {settings?.mpesa_paybill_or_till && (
                    <p className="font-bold text-[10px] text-black">{settings.mpesa_paybill_or_till}</p>
                  )}
                  <p className="font-mono text-[8px] text-gray-500">*** Bright Cyber & ICT Enterprise ***</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-[11px] uppercase tracking-wider rounded-lg transition cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
              >
                Next Sale
              </button>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyReceiptText}
                  className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    receiptCopied
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/80 text-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155]'
                  }`}
                  title="Copy formatted receipt text for WhatsApp/SMS"
                >
                  {receiptCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#2563EB]" />}
                  {receiptCopied ? 'Copied!' : 'Copy Text'}
                </button>

                <button
                  type="button"
                  onClick={() => downloadReceiptFile(completedSale, settings, receiptFormat)}
                  className="px-3 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#334155] transition flex items-center gap-1.5 cursor-pointer"
                  title="Download receipt HTML file to device"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB]" /> Download
                </button>

                <button
                  type="button"
                  onClick={() => openReceiptInNewTab(completedSale, settings, receiptFormat)}
                  className="px-3 py-2 bg-white dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#334155] transition flex items-center gap-1.5 cursor-pointer"
                  title="Open full printable receipt in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" /> Open in Tab
                </button>

                <button
                  id="btn-print-receipt-action"
                  onClick={() => printReceipt(completedSale, settings, receiptFormat)}
                  className="px-4 py-2 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Add Customer */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl max-w-sm w-full shadow-2xl p-5 text-[#0F172A] dark:text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-3">
              <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-[0.18em]">
                Register Client Profile
              </h3>
              <button onClick={() => setNewCustomerModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Kamau"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +254 712 345 678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(false)}
                  className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#64748B] dark:text-[#94A3B8] text-[11px] uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Admin Quick Restock in POS */}
      {posRestockModalOpen && posRestockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl p-5 text-[#0F172A] dark:text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#3B82F6] flex items-center justify-center border border-[#BFDBFE] dark:border-[#334155]">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-serif-luxury font-medium text-xs text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-[0.18em]">
                  Restock: {posRestockProduct.name}
                </h3>
              </div>
              <button onClick={() => setPosRestockModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl mb-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">SKU:</span>
                <span className="font-mono text-[#2563EB] dark:text-[#3B82F6] font-semibold">{posRestockProduct.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Current Stock:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{posRestockProduct.stock_quantity} {posRestockProduct.unit}s</span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const qtyToAdd = parseInt(posRestockQty, 10);
                if (isNaN(qtyToAdd) || qtyToAdd <= 0) return;

                try {
                  setPosRestockSaving(true);
                  await api.post('/inventory/adjust', {
                    productId: posRestockProduct.id,
                    movement_type: 'restock',
                    quantity: qtyToAdd,
                    reason: posRestockReason.trim() || `POS restock intake (+${qtyToAdd})`,
                  });

                  // Optimistically update products state
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === posRestockProduct.id
                        ? { ...p, stock_quantity: p.stock_quantity + qtyToAdd }
                        : p
                    )
                  );

                  setStockToast({
                    type: 'success',
                    title: 'Restocked Successfully',
                    message: `Added +${qtyToAdd} ${posRestockProduct.unit}(s) to "${posRestockProduct.name}".`,
                  });

                  setPosRestockModalOpen(false);
                  loadData();
                } catch (err: any) {
                  alert('Restock failed: ' + err.message);
                } finally {
                  setPosRestockSaving(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                  Quantity to Add ({posRestockProduct.unit}s) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  autoFocus
                  value={posRestockQty}
                  onChange={(e) => setPosRestockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-sm font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Presets:</span>
                  {[5, 10, 20, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPosRestockQty(String(num))}
                      className="px-2 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#EFF6FF] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-[10px] font-mono border border-[#E2E8F0] dark:border-[#334155] transition cursor-pointer"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                  Restock Reason / Vendor Invoice
                </label>
                <input
                  type="text"
                  value={posRestockReason}
                  onChange={(e) => setPosRestockReason(e.target.value)}
                  placeholder="e.g. Received new stock delivery"
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  New count:{' '}
                  <strong className="text-[#2563EB] dark:text-[#3B82F6] font-mono">
                    {posRestockProduct.stock_quantity + (parseInt(posRestockQty, 10) || 0)}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPosRestockModalOpen(false)}
                    className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] text-[11px] uppercase tracking-wider rounded-lg border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={posRestockSaving}
                    className="px-4 py-1.5 border border-[#2563EB] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {posRestockSaving ? 'Updating...' : 'Add Stock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINE ITEM DISCOUNT MODAL */}
      {itemDiscountModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E293B] pb-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#2563EB]" />
                <h3 className="font-serif-luxury text-sm font-semibold text-[#0F172A] dark:text-white">
                  Item Concession / Discount
                </h3>
              </div>
              <button
                onClick={() => setItemDiscountModalItem(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-xl text-xs space-y-1">
              <div className="font-semibold text-[#0F172A] dark:text-white truncate">
                {itemDiscountModalItem.name}
              </div>
              <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                <span>Gross Total ({itemDiscountModalItem.quantity} {itemDiscountModalItem.unit}):</span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {formatKsh(itemDiscountModalItem.quantity * itemDiscountModalItem.unitPrice)}
                </span>
              </div>
              {itemDiscountModalItem.discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Current Discount:</span>
                  <span className="font-mono">-{formatKsh(itemDiscountModalItem.discount)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#1E293B] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setItemDiscountUnit('fixed')}
                  className={`flex-1 py-1 text-center text-xs font-semibold rounded-lg transition ${
                    itemDiscountUnit === 'fixed'
                      ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  KSh Off
                </button>
                <button
                  type="button"
                  onClick={() => setItemDiscountUnit('percentage')}
                  className={`flex-1 py-1 text-center text-xs font-semibold rounded-lg transition ${
                    itemDiscountUnit === 'percentage'
                      ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  % Off
                </button>
                <button
                  type="button"
                  onClick={() => setItemDiscountUnit('override_price')}
                  className={`flex-1 py-1 text-center text-xs font-semibold rounded-lg transition ${
                    itemDiscountUnit === 'override_price'
                      ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#3B82F6] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8]'
                  }`}
                >
                  Direct Price / Unit
                </button>
              </div>

              <div>
                <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                  {itemDiscountUnit === 'percentage'
                    ? 'Enter Discount Percentage (%):'
                    : itemDiscountUnit === 'override_price'
                    ? `Direct Unit Selling Price (Current: ${formatKsh(itemDiscountModalItem.unitPrice)}):`
                    : 'Enter Discount Amount (KSh):'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder={
                    itemDiscountUnit === 'percentage'
                      ? 'e.g. 10%'
                      : itemDiscountUnit === 'override_price'
                      ? `e.g. ${itemDiscountModalItem.unitPrice * 0.9}`
                      : 'e.g. 50'
                  }
                  value={itemDiscountVal}
                  onChange={(e) => setItemDiscountVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveItemDiscount();
                  }}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg text-sm font-mono font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Quick Presets */}
              {itemDiscountUnit !== 'override_price' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Quick:</span>
                  {(itemDiscountUnit === 'percentage' ? [5, 10, 15, 20, 50] : [20, 50, 100, 200]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setItemDiscountVal(String(p))}
                      className="px-2 py-0.5 rounded bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#EFF6FF] text-[#0F172A] dark:text-[#F8FAFC] text-[10px] font-mono border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
                    >
                      {itemDiscountUnit === 'percentage' ? `${p}%` : `-${p}`}
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2">
                {itemDiscountModalItem.discount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateItemDiscount(itemDiscountModalItem.cartId, 0);
                      setItemDiscountModalItem(null);
                      setStockToast({
                        type: 'success',
                        title: 'Discount Removed',
                        message: `Concession removed from "${itemDiscountModalItem.name}".`,
                      });
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Disc
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemDiscountModalItem(null)}
                    className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold rounded-lg border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItemDiscount}
                    className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Apply Concession
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
