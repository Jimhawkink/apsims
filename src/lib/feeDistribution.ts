/**
 * ─────────────────────────────────────────────────────────────────
 * APSIMS Fee Auto-Distribution Engine
 * ─────────────────────────────────────────────────────────────────
 * Distributes a payment across vote heads in priority order.
 * Works on BOTH web (Next.js) and mobile (React Native / Expo).
 *
 * Algorithm:
 *   1. Fetch active vote heads ordered by priority ASC
 *   2. For each vote head, calculate outstanding balance
 *      (fee structure amount - already paid to this head)
 *   3. Fill vote heads in priority order until payment is exhausted
 *   4. Save individual allocations to school_fee_payment_allocations
 *
 * Usage:
 *   import { autoDistributePayment } from '@/lib/feeDistribution';
 *   const allocations = await autoDistributePayment(supabase, { ... });
 * ─────────────────────────────────────────────────────────────────
 */

export interface VoteHeadRow {
    id: number;
    code: string;
    name: string;
    category: string;
    priority: number;
    is_active: boolean;
}

export interface AllocationResult {
    vote_head_id: number | null;
    vote_head_code: string;
    vote_head_name: string;
    allocated_amount: number;
    outstanding_before: number;  // how much was owed before this payment
}

export interface DistributeParams {
    paymentId: number;
    studentId: number;
    amount: number;          // total payment amount
    termId: number | null;
    year: number;
}

export interface DistributeResult {
    allocations: AllocationResult[];
    totalAllocated: number;
    unallocated: number;     // any leftover after all vote heads filled (overpayment)
}

/**
 * Core distribution function.
 * Pass any Supabase client (web or mobile — same API).
 */
export async function autoDistributePayment(
    supabase: any,
    params: DistributeParams
): Promise<DistributeResult> {
    const { paymentId, studentId, amount, termId, year } = params;

    // ── 1. Load active vote heads ordered by priority ──────────────
    const { data: voteHeads, error: vhErr } = await supabase
        .from('school_vote_heads')
        .select('id, code, name, category, priority, is_active')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('name');

    if (vhErr) {
        console.warn('[feeDistribution] Could not load vote heads:', vhErr.message);
        // Fall back to single "General" allocation
        const fallback: AllocationResult = {
            vote_head_id: null, vote_head_code: 'GENERAL', vote_head_name: 'General',
            allocated_amount: amount, outstanding_before: amount,
        };
        await _saveAllocations(supabase, paymentId, studentId, termId, year, [fallback]);
        return { allocations: [fallback], totalAllocated: amount, unallocated: 0 };
    }

    if (!voteHeads || voteHeads.length === 0) {
        // No vote heads configured — save as general
        const fallback: AllocationResult = {
            vote_head_id: null, vote_head_code: 'GENERAL', vote_head_name: 'General',
            allocated_amount: amount, outstanding_before: amount,
        };
        await _saveAllocations(supabase, paymentId, studentId, termId, year, [fallback]);
        return { allocations: [fallback], totalAllocated: amount, unallocated: 0 };
    }

    // ── 2. Load student's fee structure for this term/year ─────────
    let feeStructures: any[] = [];
    try {
        const fsQuery = supabase
            .from('school_fee_structures')
            .select('id, category, amount, form_id, term_id, year');

        if (termId) fsQuery.eq('term_id', termId);
        if (year)   fsQuery.eq('year', year);

        const { data: fs } = await fsQuery;
        feeStructures = fs || [];
    } catch { /* fee structure optional */ }

    // ── 3. Load existing allocations for this student+term ─────────
    // (to know how much of each vote head is already paid)
    let existingAllocations: any[] = [];
    try {
        const eaQuery = supabase
            .from('school_fee_payment_allocations')
            .select('vote_head_code, allocated_amount')
            .eq('student_id', studentId);
        if (termId) eaQuery.eq('term_id', termId);
        if (year)   eaQuery.eq('year', year);

        const { data: ea } = await eaQuery;
        existingAllocations = ea || [];
    } catch { /* first payment — no existing allocations */ }

    // Build map: vote_head_code → total already paid
    const alreadyPaid: Record<string, number> = {};
    for (const ea of existingAllocations) {
        alreadyPaid[ea.vote_head_code] = (alreadyPaid[ea.vote_head_code] || 0) + Number(ea.allocated_amount || 0);
    }

    // Build map: vote_head name/code → expected amount from fee structure
    // Fee structures use category = vote head name
    const expectedByHead: Record<string, number> = {};
    for (const fs of feeStructures) {
        const cat = fs.category || 'General';
        expectedByHead[cat] = (expectedByHead[cat] || 0) + Number(fs.amount || 0);
    }

    // ── 4. Distribute payment across vote heads in priority order ──
    let remaining = amount;
    const allocations: AllocationResult[] = [];

    for (const vh of voteHeads as VoteHeadRow[]) {
        if (remaining <= 0) break;

        // Match fee structure by vote head name OR code
        const expectedKey = Object.keys(expectedByHead).find(
            k => k.toLowerCase() === vh.name.toLowerCase() || k.toLowerCase() === vh.code.toLowerCase()
        );
        const expected  = expectedKey ? expectedByHead[expectedKey] : 0;
        const paidSoFar = alreadyPaid[vh.code] || 0;
        const balance   = Math.max(0, expected - paidSoFar);

        // Skip vote heads where student owes nothing (unless no structure defined)
        // If no fee structure at all, distribute proportionally or fill in order
        const hasStructure = feeStructures.length > 0;
        const outstandingBefore = hasStructure ? balance : remaining;

        if (hasStructure && balance <= 0) continue;  // fully paid head, skip

        // Allocate: take min(remaining, balance or remaining if no structure)
        const toAllocate = hasStructure
            ? Math.min(remaining, balance)
            : remaining;  // no structure → last head gets everything

        if (toAllocate <= 0) continue;

        allocations.push({
            vote_head_id: vh.id,
            vote_head_code: vh.code,
            vote_head_name: vh.name,
            allocated_amount: Math.round(toAllocate * 100) / 100,
            outstanding_before: Math.round(outstandingBefore * 100) / 100,
        });

        remaining = Math.round((remaining - toAllocate) * 100) / 100;

        // If no fee structure, first vote head gets all — break
        if (!hasStructure) break;
    }

    // Any leftover (overpayment / prepayment)
    if (remaining > 0.01) {
        allocations.push({
            vote_head_id: null,
            vote_head_code: 'PREPAYMENT',
            vote_head_name: 'Prepayment / Credit',
            allocated_amount: Math.round(remaining * 100) / 100,
            outstanding_before: 0,
        });
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.allocated_amount, 0);

    // ── 5. Save allocations to DB ──────────────────────────────────
    await _saveAllocations(supabase, paymentId, studentId, termId, year, allocations);

    console.log(`[feeDistribution] Distributed KES ${amount} → ${allocations.length} vote head(s):`,
        allocations.map(a => `${a.vote_head_code}=KES${a.allocated_amount}`).join(', '));

    return {
        allocations,
        totalAllocated: Math.round(totalAllocated * 100) / 100,
        unallocated: Math.max(0, Math.round((amount - totalAllocated) * 100) / 100),
    };
}

/**
 * Save allocation rows to school_fee_payment_allocations.
 * Called internally after distribution is calculated.
 */
async function _saveAllocations(
    supabase: any,
    paymentId: number,
    studentId: number,
    termId: number | null,
    year: number,
    allocations: AllocationResult[]
): Promise<void> {
    if (allocations.length === 0) return;

    const rows = allocations.map(a => ({
        payment_id:       paymentId,
        student_id:       studentId,
        vote_head_id:     a.vote_head_id,
        vote_head_code:   a.vote_head_code,
        vote_head_name:   a.vote_head_name,
        allocated_amount: a.allocated_amount,
        term_id:          termId,
        year:             year,
    }));

    const { error } = await supabase
        .from('school_fee_payment_allocations')
        .insert(rows);

    if (error) {
        console.error('[feeDistribution] Failed to save allocations:', error.message);
    }
}

/**
 * Fetch allocations for a specific payment (for receipt display).
 */
export async function getPaymentAllocations(
    supabase: any,
    paymentId: number
): Promise<AllocationResult[]> {
    const { data, error } = await supabase
        .from('school_fee_payment_allocations')
        .select('vote_head_id, vote_head_code, vote_head_name, allocated_amount')
        .eq('payment_id', paymentId)
        .order('allocated_amount', { ascending: false });

    if (error) {
        console.warn('[feeDistribution] getPaymentAllocations error:', error.message);
        return [];
    }
    return (data || []).map((r: any) => ({
        vote_head_id:       r.vote_head_id,
        vote_head_code:     r.vote_head_code,
        vote_head_name:     r.vote_head_name,
        allocated_amount:   Number(r.allocated_amount),
        outstanding_before: 0,
    }));
}

/**
 * Fetch per-vote-head summary for a student (outstanding per head).
 * Useful for showing how much is still owed per vote head.
 */
export async function getStudentVoteHeadSummary(
    supabase: any,
    studentId: number,
    termId: number | null,
    year: number
): Promise<{ code: string; name: string; priority: number; expected: number; paid: number; balance: number }[]> {
    const [vhRes, fsRes, allocRes] = await Promise.all([
        supabase.from('school_vote_heads').select('id,code,name,priority').eq('is_active', true).order('priority'),
        termId
            ? supabase.from('school_fee_structures').select('category,amount').eq('term_id', termId).eq('year', year)
            : supabase.from('school_fee_structures').select('category,amount').eq('year', year),
        supabase.from('school_fee_payment_allocations').select('vote_head_code,allocated_amount')
            .eq('student_id', studentId)
            .eq('year', year),
    ]);

    const voteHeads: any[] = vhRes.data || [];
    const feeStructures: any[] = fsRes.data || [];
    const allocations: any[] = allocRes.data || [];

    const expectedMap: Record<string, number> = {};
    for (const fs of feeStructures) {
        const cat = fs.category || 'General';
        expectedMap[cat] = (expectedMap[cat] || 0) + Number(fs.amount || 0);
    }

    const paidMap: Record<string, number> = {};
    for (const a of allocations) {
        paidMap[a.vote_head_code] = (paidMap[a.vote_head_code] || 0) + Number(a.allocated_amount || 0);
    }

    return voteHeads.map(vh => {
        const expectedKey = Object.keys(expectedMap).find(
            k => k.toLowerCase() === vh.name.toLowerCase() || k.toLowerCase() === vh.code.toLowerCase()
        );
        const expected = expectedKey ? expectedMap[expectedKey] : 0;
        const paid = paidMap[vh.code] || 0;
        return {
            code: vh.code, name: vh.name, priority: vh.priority,
            expected, paid, balance: Math.max(0, expected - paid),
        };
    });
}
