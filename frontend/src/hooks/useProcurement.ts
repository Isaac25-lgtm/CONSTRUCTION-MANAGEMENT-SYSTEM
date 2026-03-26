/**
 * Procurement hooks -- suppliers, RFQs, quotations, purchase orders,
 * goods receipts, invoices, payments, summary.
 *
 * All interfaces match backend serializer field names exactly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface SupplierData {
  id: string
  organisation: string
  code: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  category: string
  status: string
  status_display: string
  notes: string
  created_at: string
  updated_at: string
}

export interface RFQItemData {
  id: string
  sort_order: number
  description: string
  unit: string
  quantity: string
  notes: string
}

export interface RFQData {
  id: string
  project: string
  code: string
  title: string
  description: string
  issue_date: string
  due_date: string
  status: string
  status_display: string
  items_count: number
  items: RFQItemData[]
  created_at: string
  updated_at: string
}

export interface QuotationItemData {
  id: string
  rfq_item: string | null
  sort_order: number
  description: string
  unit: string
  quantity: string
  unit_price: string
  line_total: string
}

export interface QuotationData {
  id: string
  project: string
  rfq: string | null
  rfq_code: string | null
  supplier: string
  supplier_name: string | null
  code: string
  quote_date: string
  validity_date: string | null
  status: string
  status_display: string
  notes: string
  total_amount: string
  items_count: number
  items: QuotationItemData[]
  created_at: string
  updated_at: string
}

export interface POItemData {
  id: string
  sort_order: number
  description: string
  unit: string
  quantity: string
  unit_price: string
  line_total: string
}

export interface PurchaseOrderData {
  id: string
  project: string
  supplier: string
  supplier_name: string | null
  code: string
  order_date: string
  delivery_date: string | null
  status: string
  status_display: string
  notes: string
  approved_by: string | null
  approved_by_name: string | null
  total_amount: string
  items: POItemData[]
  created_at: string
  updated_at: string
}

export interface GRNItemData {
  id: string
  sort_order: number
  description: string
  unit: string
  ordered_quantity: string
  received_quantity: string
  remarks: string
  po_item: string | null
}

export interface GoodsReceiptData {
  id: string
  project: string
  purchase_order: string
  code: string
  receipt_date: string
  received_by: string | null
  received_by_name: string | null
  status: string
  status_display: string
  notes: string
  items: GRNItemData[]
  created_at: string
  updated_at: string
}

export interface ProcurementInvoiceData {
  id: string
  project: string
  supplier: string
  supplier_name: string | null
  purchase_order: string | null
  code: string
  invoice_date: string
  due_date: string
  amount: string
  status: string
  status_display: string
  notes: string
  created_at: string
  updated_at: string
}

export interface ProcurementPaymentData {
  id: string
  project: string
  supplier: string
  supplier_name: string | null
  invoice: string | null
  payment_date: string
  amount: string
  reference: string
  method: string
  method_display: string
  status: string
  status_display: string
  notes: string
  created_at: string
  updated_at: string
}

export interface ProcurementSummary {
  total_rfqs: number
  total_quotations: number
  total_pos: number
  total_po_value: number
  total_invoiced: number
  total_paid: number
  outstanding: number
  pending_deliveries: number
  unpaid_invoices_count: number
  workflow_counts: {
    rfqs: number
    quotations: number
    pos: number
    grns: number
    invoices: number
    payments: number
  }
  recent_pos: {
    id: string
    code: string
    supplier_name: string | null
    order_date: string
    status: string
    status_display: string
    total_amount: number
  }[]
  unpaid_invoices: {
    id: string
    code: string
    supplier_name: string | null
    amount: number
    due_date: string | null
    status: string
    status_display: string
  }[]
  top_suppliers: {
    supplier_name: string
    total_value: number
    po_count: number
  }[]
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useSuppliers() {
  return useQuery({
    queryKey: ['procurement', 'suppliers'],
    queryFn: async () => {
      const { data } = await api.get<SupplierData[]>('/procurement/suppliers/')
      return data
    },
  })
}

export function usePurchaseOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'purchase-orders'],
    queryFn: async () => {
      const { data } = await api.get<PurchaseOrderData[]>(
        `/procurement/${projectId}/purchase-orders/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreatePO(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      supplier: string
      code?: string
      delivery_date?: string
      status?: string
      notes?: string
      approved_by?: string
    }) => {
      const { data } = await api.post(
        `/procurement/${projectId}/purchase-orders/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export function useRFQs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'rfqs'],
    queryFn: async () => {
      const { data } = await api.get<RFQData[]>(
        `/procurement/${projectId}/rfqs/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateRFQ(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      code?: string
      title: string
      description?: string
      due_date?: string
      status?: string
    }) => {
      const { data } = await api.post(
        `/procurement/${projectId}/rfqs/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export function useQuotations(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'quotations'],
    queryFn: async () => {
      const { data } = await api.get<QuotationData[]>(
        `/procurement/${projectId}/quotations/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateQuotation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: {
      rfq?: string
      supplier: string
      code?: string
      quote_date?: string
      validity_date?: string
      status?: string
      notes?: string
    }) => {
      const { data } = await api.post(
        `/procurement/${projectId}/quotations/`,
        d,
      )
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export function useGoodsReceipts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'goods-receipts'],
    queryFn: async () => {
      const { data } = await api.get<GoodsReceiptData[]>(
        `/procurement/${projectId}/goods-receipts/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useProcurementInvoices(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'invoices'],
    queryFn: async () => {
      const { data } = await api.get<ProcurementInvoiceData[]>(
        `/procurement/${projectId}/procurement-invoices/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useProcurementPayments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'payments'],
    queryFn: async () => {
      const { data } = await api.get<ProcurementPaymentData[]>(
        `/procurement/${projectId}/procurement-payments/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateGRN(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { purchase_order: string; receipt_date: string; notes?: string }) => {
      const { data } = await api.post(`/procurement/${projectId}/goods-receipts/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export function useCreateInvoice(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { supplier: string; purchase_order?: string; invoice_date: string; due_date?: string; amount: number }) => {
      const { data } = await api.post(`/procurement/${projectId}/procurement-invoices/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export function useCreatePayment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { supplier: string; invoice?: string; payment_date: string; amount: number; method?: string }) => {
      const { data } = await api.post(`/procurement/${projectId}/procurement-payments/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

/* ------------------------------------------------------------------ */
/* Item-level CRUD hooks                                               */
/* ------------------------------------------------------------------ */

export function useCreateRFQItem(projectId: string, rfqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { description: string; unit?: string; quantity?: number; notes?: string }) => {
      const { data } = await api.post(`/procurement/${projectId}/rfqs/${rfqId}/items/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'rfqs'] }),
  })
}

export function useDeleteRFQItem(projectId: string, rfqId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/procurement/${projectId}/rfqs/${rfqId}/items/${itemId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'rfqs'] }),
  })
}

export function useCreateQuotationItem(projectId: string, quotationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { description: string; unit?: string; quantity?: number; unit_price?: number }) => {
      const { data } = await api.post(`/procurement/${projectId}/quotations/${quotationId}/items/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'quotations'] }),
  })
}

export function useDeleteQuotationItem(projectId: string, quotationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/procurement/${projectId}/quotations/${quotationId}/items/${itemId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'quotations'] }),
  })
}

export function useCreatePOItem(projectId: string, poId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { description: string; unit?: string; quantity?: number; unit_price?: number }) => {
      const { data } = await api.post(`/procurement/${projectId}/purchase-orders/${poId}/items/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'purchase-orders'] }),
  })
}

export function useDeletePOItem(projectId: string, poId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/procurement/${projectId}/purchase-orders/${poId}/items/${itemId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'purchase-orders'] }),
  })
}

export function useCreateGRNItem(projectId: string, grnId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { description: string; unit?: string; ordered_quantity?: number; received_quantity: number; remarks?: string }) => {
      const { data } = await api.post(`/procurement/${projectId}/goods-receipts/${grnId}/items/`, d)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'goods-receipts'] }),
  })
}

export function useDeleteGRNItem(projectId: string, grnId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/procurement/${projectId}/goods-receipts/${grnId}/items/${itemId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId, 'goods-receipts'] }),
  })
}

export function useProcurementSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['procurement', projectId, 'procurement-summary'],
    queryFn: async () => {
      const { data } = await api.get<ProcurementSummary>(
        `/procurement/${projectId}/procurement-summary/`,
      )
      return data
    },
    enabled: !!projectId,
  })
}
