/**
 * Toss Payments API Interfaces
 *
 * Based on Toss Payments REST API v1 Documentation
 * https://docs.tosspayments.com/reference
 */

export interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerKey?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
  method?: 'card' | 'transfer' | 'virtual_account' | 'mobile';
  flowMode?: 'DEFAULT' | 'DIRECT';
  easyPay?: string;
  locale?: 'ko_KR' | 'en_US';
  currency?: 'KRW';
  validHours?: number;
  cashReceipt?: {
    type: 'personal' | 'corporate' | 'none';
  };
  metadata?: Record<string, string>;
}

export interface TossPaymentResponse {
  mId: string;
  lastTransactionKey: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  taxExemptionAmount: number;
  status: 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  requestedAt: string;
  approvedAt?: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  card?: TossCardInfo;
  virtualAccount?: TossVirtualAccountInfo;
  transfer?: TossTransferInfo;
  mobilePhone?: TossMobilePhoneInfo;
  receipt?: {
    url: string;
  };
  checkout?: {
    url: string;
  };
  currency: 'KRW';
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  method: 'card' | 'virtual_account' | 'transfer' | 'mobile';
  version: string;
  metadata?: Record<string, string>;
}

export interface TossCardInfo {
  company: string;
  number: string; // Masked: "433012******1234"
  installmentPlanMonths: number;
  isInterestFree: boolean;
  approveNo: string;
  useCardPoint: boolean;
  cardType: 'credit' | 'debit' | 'gift';
  ownerType: 'personal' | 'corporate';
  acquireStatus: 'READY' | 'REQUESTED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELED';
  receiptUrl?: string;
  amount: number;
}

export interface TossVirtualAccountInfo {
  accountType: 'normal' | 'fixed';
  accountNumber: string;
  bank: string;
  customerName: string;
  dueDate: string;
  refundStatus: 'NONE' | 'PENDING' | 'FAILED' | 'COMPLETED';
  expired: boolean;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

export interface TossTransferInfo {
  bank: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
}

export interface TossMobilePhoneInfo {
  customerMobilePhone: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  receiptUrl?: string;
}

export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

export interface TossCancelResponse {
  mId: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: 'CANCELED' | 'PARTIAL_CANCELED';
  canceledAt: string;
  cancels: Array<{
    cancelAmount: number;
    cancelReason: string;
    taxExemptionAmount: number;
    taxFreeAmount: number;
    refundableAmount: number;
    easyPayDiscountAmount: number;
    canceledAt: string;
    transactionKey: string;
    receiptKey?: string;
  }>;
  totalAmount: number;
  balanceAmount: number;
  currency: 'KRW';
  method: 'card' | 'virtual_account' | 'transfer' | 'mobile';
}

export interface TossWebhookPayload {
  eventType: 'PAYMENT_STATUS_CHANGED';
  createdAt: string;
  data: {
    mId: string;
    paymentKey: string;
    orderId: string;
    status: string;
    totalAmount: number;
    balanceAmount: number;
    method: string;
    approvedAt?: string;
    requestedAt: string;
  };
}

export interface TossErrorResponse {
  code: string;
  message: string;
}

export interface TossPaymentStatusResponse {
  mId: string;
  lastTransactionKey: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  method: string;
  currency: 'KRW';
  card?: TossCardInfo;
  virtualAccount?: TossVirtualAccountInfo;
  transfer?: TossTransferInfo;
  mobilePhone?: TossMobilePhoneInfo;
  cancels?: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
    transactionKey: string;
  }>;
  receipt?: {
    url: string;
  };
}
