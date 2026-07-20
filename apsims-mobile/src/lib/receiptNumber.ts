/**
 * ═══════════════════════════════════════════════════════════════
 * APSIMS Receipt Number Engine
 * ═══════════════════════════════════════════════════════════════
 * Uses a Postgres atomic function to guarantee:
 *   - No duplicates even with concurrent payments
 *   - Works from web, mobile APK, parent portal, M-Pesa webhook
 *   - School can set their own start number at any time
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Get the next receipt number atomically from the DB.
 * Always call this — never generate receipt numbers client-side.
 *
 * @returns e.g. "89635" or "RCT/89635" depending on school prefix setting
 */
export async function getNextReceiptNumber(supabase: any): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('get_next_receipt_number');
        if (error) throw new Error(error.message);
        return String(data);
    } catch (err: any) {
        console.error('[receiptNumber] getNextReceiptNumber failed:', err.message);
        // Fallback: timestamp-based (no duplicates, but not sequential)
        return `RCT${Date.now()}`;
    }
}

/**
 * Set the starting receipt number (and optional prefix) for the school.
 * Call this from the Settings page when admin enters their book number.
 *
 * @param start  - The number to start FROM (e.g. 89635 means next receipt = 89635)
 * @param prefix - Optional prefix (e.g. "RCT/" → "RCT/89635"). Leave empty for plain numbers.
 */
export async function setReceiptStart(
    supabase: any,
    start: number,
    prefix: string = ''
): Promise<string> {
    const { data, error } = await supabase.rpc('set_receipt_start', {
        p_start:  start,
        p_prefix: prefix,
    });
    if (error) throw new Error(error.message);
    return String(data);
}

/**
 * Load current receipt settings (counter, prefix, start).
 * Use this to preview next receipt number in the UI.
 */
export async function getReceiptSettings(supabase: any): Promise<{
    receipt_counter: number;
    receipt_prefix:  string;
    receipt_start:   number;
}> {
    const { data, error } = await supabase
        .from('school_settings')
        .select('receipt_counter, receipt_prefix, receipt_start')
        .order('id', { ascending: true })
        .limit(1)
        .single();

    if (error) return { receipt_counter: 1, receipt_prefix: '', receipt_start: 1 };
    return {
        receipt_counter: Number(data.receipt_counter ?? 1),
        receipt_prefix:  data.receipt_prefix ?? '',
        receipt_start:   Number(data.receipt_start ?? 1),
    };
}
