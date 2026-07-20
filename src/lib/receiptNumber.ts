/**
 * APSIMS Document Numbering System
 * Central source of truth for ALL document numbers in the school.
 * 
 * Uses school_document_counters table with atomic DB functions.
 * Covers: Receipts, Payment Vouchers, Payroll, Petty Cash, LPO, Journal Vouchers,
 *         Stores Issue/Receipt Vouchers, Imprest Warrants, Debit Notes.
 *
 * Usage:
 *   import { getNextDocumentNumber, DocType } from '@/lib/receiptNumber';
 *   const receiptNo = await getNextDocumentNumber(supabase, 'RECEIPT');
 *   const pvNo      = await getNextDocumentNumber(supabase, 'PAYMENT_VOUCHER');
 *   const payNo     = await getNextDocumentNumber(supabase, 'PAYROLL');
 */

export type DocType =
  | 'RECEIPT'
  | 'PAYMENT_VOUCHER'
  | 'PAYROLL'
  | 'PETTY_CASH'
  | 'LPO'
  | 'JOURNAL'
  | 'STORES_ISSUE'
  | 'STORES_RECEIPT'
  | 'IMPREST'
  | 'DEBIT_NOTE';

export interface DocumentCounter {
  doc_code: DocType;
  doc_prefix: string;
  doc_label: string;
  doc_description: string;
  doc_icon: string;
  doc_category: string;
  counter: number;
  start_num: number;
  is_active: boolean;
}

/** Atomically get next document number for any doc type */
export async function getNextDocumentNumber(supabase: any, docCode: DocType): Promise<string> {
  const { data, error } = await supabase
    .rpc('get_next_document_number', { p_doc_code: docCode });
  if (error) throw new Error(`Document number error (${docCode}): ${error.message}`);
  return data as string;
}

/** Convenience: get next receipt number (legacy compat) */
export async function getNextReceiptNumber(supabase: any): Promise<string> {
  return getNextDocumentNumber(supabase, 'RECEIPT');
}

/** Set the starting number for any document type */
export async function setDocumentStart(
  supabase: any,
  docCode: DocType,
  startNumber: number,
  prefix?: string
): Promise<string> {
  const params: any = { p_doc_code: docCode, p_start: startNumber };
  if (prefix !== undefined) params.p_prefix = prefix;
  const { data, error } = await supabase.rpc('set_document_start', params);
  if (error) throw new Error(`Set start error (${docCode}): ${error.message}`);
  return data as string;
}

/** Legacy: set receipt start (kept for backward compat) */
export async function setReceiptStart(
  supabase: any,
  startNumber: number,
  prefix: string = ''
): Promise<string> {
  return setDocumentStart(supabase, 'RECEIPT', startNumber, prefix);
}

/** Get all document counter settings */
export async function getAllDocumentSettings(supabase: any): Promise<DocumentCounter[]> {
  const { data, error } = await supabase
    .from('school_document_counters')
    .select('*')
    .order('id');
  if (error) throw new Error('Failed to load document settings: ' + error.message);
  return data || [];
}

/** Get receipt settings (legacy compat) */
export async function getReceiptSettings(supabase: any): Promise<{
  receipt_counter: number; receipt_prefix: string; receipt_start: number;
}> {
  const all = await getAllDocumentSettings(supabase);
  const r = all.find(d => d.doc_code === 'RECEIPT');
  return {
    receipt_counter: r?.counter ?? 1,
    receipt_prefix: r?.doc_prefix ?? '',
    receipt_start: r?.start_num ?? 1,
  };
}
