/**
 * ═══════════════════════════════════════════════════════════════════
 * APSIMS Fee Auto-Distribution Engine  — v2.0
 * ═══════════════════════════════════════════════════════════════════
 * Kenyan school-accurate distribution algorithm:
 *
 *  STEP 1 — Calculate ARREARS (brought-forward from previous terms)
 *    Arrears = Σ(previous term fee structures) − Σ(previous term payments)
 *
 *  STEP 2 — Distribute payment in priority order:
 *    a) ARREARS vote head first  (priority 1 by convention)
 *    b) Current term vote heads  in priority order
 *    c) Any leftover → PREPAYMENT / Credit
 *
 *  Works on BOTH web (Next.js) and mobile (React Native / Expo).
 *  Same Supabase client API on both platforms.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface AllocationResult {
    vote_head_id:      number | null;
    vote_head_code:    string;
    vote_head_name:    string;
    allocated_amount:  number;
    outstanding_before: number;
    is_arrears?:       boolean;   // true = this chunk is paying off past-term debt
    is_prepayment?:    boolean;   // true = overpayment / credit
}

export interface DistributeParams {
    paymentId:  number;
    studentId:  number;
    amount:     number;     // total payment amount in KES
    termId:     number | null;
    year:       number;
}

export interface DistributeResult {
    allocations:    AllocationResult[];
    totalAllocated: number;
    unallocated:    number;       // any overpayment (prepayment credit)
    arrearsPaid:    number;       // how much of this payment went to arrears
    arrearsTotal:   number;       // total arrears before this payment
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────
export async function autoDistributePayment(
    supabase: any,
    params: DistributeParams
): Promise<DistributeResult> {
    const { paymentId, studentId, amount, termId, year } = params;

    try {
        // ── Load all data in parallel ───────────────────────────────
        const [studentRes, vhRes, allPayRes, allStructRes, allocRes, termsRes] = await Promise.all([

            // Student's form (to look up fee structure)
            supabase.from('school_students').select('form_id').eq('id', studentId).single(),

            // Active vote heads ordered by priority (priority 1 = paid first)
            supabase.from('school_vote_heads')
                .select('id, code, name, category, priority, is_active')
                .eq('is_active', true)
                .order('priority', { ascending: true })
                .order('name'),

            // All payments by this student (for arrears calc) — exclude current payment
            supabase.from('school_fee_payments')
                .select('id, amount, term_id, year')
                .eq('student_id', studentId)
                .neq('id', paymentId),

            // All fee structures (all terms/years) for this student's form
            supabase.from('school_fee_structures')
                .select('id, category, amount, form_id, term_id, year, vote_head_id, vote_head_name'),

            // Existing allocations for current term (what's already been paid per head this term)
            supabase.from('school_fee_payment_allocations')
                .select('vote_head_code, allocated_amount, term_id, year')
                .eq('student_id', studentId)
                .neq('payment_id', paymentId),

            // ALL terms ordered — needed to tell past from future
            supabase.from('school_terms')
                .select('id, year')
                .order('year', { ascending: true })
                .order('id',   { ascending: true }),
        ]);

        const formId     = studentRes.data?.form_id ?? null;
        const voteHeads: any[] = vhRes.data || [];
        const allPays:   any[] = allPayRes.data || [];
        const allStructs: any[] = (allStructRes.data || []).filter((s: any) =>
            !formId || s.form_id === formId || !s.form_id
        );
        const existAllocs: any[] = allocRes.data || [];

        // Build set of PAST term IDs (terms that come before current in chronological order)
        // This prevents future terms (e.g. Term 3 when we are in Term 2) from being
        // counted as arrears just because no payments have been made for them yet.
        const allTermsOrdered: any[] = termsRes.data || [];
        const currentTermIdx = allTermsOrdered.findIndex(t => String(t.id) === String(termId));
        const pastTermIdSet = new Set(
            allTermsOrdered
                .slice(0, Math.max(0, currentTermIdx))   // everything BEFORE current term
                .map(t => String(t.id))
        );

        // ── STEP 1: Calculate ARREARS from previous terms ───────────
        // Group fee structures by term+year
        const termFeeMap: Record<string, number> = {};   // key = "termId|year"
        for (const s of allStructs) {
            const key = `${s.term_id}|${s.year}`;
            termFeeMap[key] = (termFeeMap[key] || 0) + Number(s.amount || 0);
        }

        // Group payments by term+year
        const termPaidMap: Record<string, number> = {};
        for (const p of allPays) {
            const key = `${p.term_id}|${p.year}`;
            termPaidMap[key] = (termPaidMap[key] || 0) + Number(p.amount || 0);
        }

        // Arrears = sum of all PAST term shortfalls (never include future terms)
        const currentKey = `${termId}|${year}`;
        let arrearsTotal = 0;
        for (const [key, expected] of Object.entries(termFeeMap)) {
            if (key === currentKey) continue;           // skip current term
            const tid = key.split('|')[0];
            if (!pastTermIdSet.has(tid)) continue;     // skip FUTURE terms ← KEY FIX
            const paid    = termPaidMap[key] || 0;
            const deficit = Math.max(0, expected - paid);
            arrearsTotal += deficit;
        }
        arrearsTotal = Math.round(arrearsTotal * 100) / 100;

        // ── STEP 2: Current term fee structure per vote head ─────────
        const currentStructs = allStructs.filter(s =>
            String(s.term_id) === String(termId) && Number(s.year) === Number(year)
        );

        // Build map: vote_head_id → expected amount for current term
        // Prefer vote_head_id match; fall back to category-name match for legacy rows
        const currentExpectedById:   Record<number, number> = {}; // vote_head_id → amount
        const currentExpectedByName: Record<string, number> = {}; // category name (lower) → amount
        for (const s of currentStructs) {
            if (s.vote_head_id) {
                currentExpectedById[s.vote_head_id] = (currentExpectedById[s.vote_head_id] || 0) + Number(s.amount || 0);
            } else {
                const cat = (s.category || s.vote_head_name || '').toLowerCase();
                currentExpectedByName[cat] = (currentExpectedByName[cat] || 0) + Number(s.amount || 0);
            }
        }

        // Already-paid per vote head this term (from existing allocations)
        const alreadyPaidMap: Record<string, number> = {};
        for (const a of existAllocs) {
            if (String(a.term_id) === String(termId) && Number(a.year) === Number(year)) {
                alreadyPaidMap[a.vote_head_code] = (alreadyPaidMap[a.vote_head_code] || 0) + Number(a.allocated_amount || 0);
            }
        }

        // ── STEP 3: Distribute ───────────────────────────────────────
        let remaining = amount;
        const allocations: AllocationResult[] = [];
        let arrearsPaid = 0;

        // Find the ARREARS vote head (by name or code containing "arrear")
        const arrearsVH = voteHeads.find(vh =>
            vh.code.toUpperCase().includes('ARREAR') ||
            vh.name.toLowerCase().includes('arrear')
        );

        // 3a — Pay ARREARS first (highest priority regardless of priority number)
        if (arrearsTotal > 0.01) {
            const toAllocate = Math.min(remaining, arrearsTotal);
            arrearsPaid = Math.round(toAllocate * 100) / 100;
            allocations.push({
                vote_head_id:      arrearsVH?.id ?? null,
                vote_head_code:    arrearsVH?.code ?? 'ARREARS',
                vote_head_name:    arrearsVH?.name ?? 'Arrears (Brought Forward)',
                allocated_amount:  arrearsPaid,
                outstanding_before: arrearsTotal,
                is_arrears: true,
            });
            remaining = Math.round((remaining - toAllocate) * 100) / 100;
        }

        // 3b — Pay current term vote heads in priority order
        for (const vh of voteHeads) {
            if (remaining <= 0.01) break;

            // Skip if this is the ARREARS head (already handled above)
            if (arrearsVH && vh.id === arrearsVH.id) continue;

            // Match fee structure items to this vote head:
            //   1st choice: vote_head_id exact match (most reliable — new system)
            //   2nd choice: fuzzy name/code match (legacy rows with no vote_head_id)
            let expected = currentExpectedById[vh.id] ?? 0;
            if (expected <= 0) {
                const nameKey = Object.keys(currentExpectedByName).find(k =>
                    k === vh.name.toLowerCase() ||
                    k === vh.code.toLowerCase() ||
                    vh.name.toLowerCase().includes(k) ||
                    k.includes(vh.name.toLowerCase())
                );
                expected = nameKey ? currentExpectedByName[nameKey] : 0;
            }

            const paidSoFar = alreadyPaidMap[vh.code] || 0;
            const balance   = Math.max(0, expected - paidSoFar);

            // Only allocate if there is a fee structure for this head this term
            if (expected <= 0) continue;
            if (balance <= 0.01) continue;   // fully paid this head already

            const toAllocate = Math.min(remaining, balance);
            if (toAllocate <= 0.01) continue;

            allocations.push({
                vote_head_id:       vh.id,
                vote_head_code:     vh.code,
                vote_head_name:     vh.name,
                allocated_amount:   Math.round(toAllocate * 100) / 100,
                outstanding_before: Math.round(balance * 100) / 100,
            });
            remaining = Math.round((remaining - toAllocate) * 100) / 100;
        }

        // 3c — If still remaining after all vote heads → PREPAYMENT / Credit
        if (remaining > 0.01) {
            allocations.push({
                vote_head_id:      null,
                vote_head_code:    'PREPAYMENT',
                vote_head_name:    'Prepayment / Advance Credit',
                allocated_amount:  Math.round(remaining * 100) / 100,
                outstanding_before: 0,
                is_prepayment:     true,
            });
        }

        const totalAllocated = Math.round(
            allocations.reduce((s, a) => s + a.allocated_amount, 0) * 100
        ) / 100;

        // ── STEP 4: Save allocations to DB ───────────────────────────
        await _saveAllocations(supabase, paymentId, studentId, termId, year, allocations);

        console.log(
            `[feeDistribution] KES ${amount} → arrears KES ${arrearsPaid},`,
            allocations.map(a => `${a.vote_head_code}=KES${a.allocated_amount}`).join(', ')
        );

        return {
            allocations,
            totalAllocated,
            unallocated: Math.max(0, Math.round((amount - totalAllocated) * 100) / 100),
            arrearsPaid,
            arrearsTotal,
        };

    } catch (err: any) {
        console.error('[feeDistribution] Error:', err?.message);
        // Fallback — save the whole payment as GENERAL so it's never lost
        const fallback: AllocationResult = {
            vote_head_id: null, vote_head_code: 'GENERAL', vote_head_name: 'General',
            allocated_amount: amount, outstanding_before: amount,
        };
        await _saveAllocations(supabase, paymentId, studentId, termId, year, [fallback]);
        return { allocations: [fallback], totalAllocated: amount, unallocated: 0, arrearsPaid: 0, arrearsTotal: 0 };
    }
}

// ─────────────────────────────────────────────────────────────────────
// SAVE ALLOCATION ROWS
// ─────────────────────────────────────────────────────────────────────
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
        year,
    }));

    const { error } = await supabase.from('school_fee_payment_allocations').insert(rows);
    if (error) console.error('[feeDistribution] Failed to save allocations:', error.message);
}

// ─────────────────────────────────────────────────────────────────────
// GET ALLOCATIONS FOR A PAYMENT (for receipt display)
// ─────────────────────────────────────────────────────────────────────
export async function getPaymentAllocations(
    supabase: any,
    paymentId: number
): Promise<AllocationResult[]> {
    const { data, error } = await supabase
        .from('school_fee_payment_allocations')
        .select('vote_head_id, vote_head_code, vote_head_name, allocated_amount')
        .eq('payment_id', paymentId)
        .order('allocated_amount', { ascending: false });

    if (error) { console.warn('[feeDistribution] getPaymentAllocations:', error.message); return []; }
    return (data || []).map((r: any) => ({
        vote_head_id: r.vote_head_id, vote_head_code: r.vote_head_code,
        vote_head_name: r.vote_head_name, allocated_amount: Number(r.allocated_amount),
        outstanding_before: 0,
    }));
}

// ─────────────────────────────────────────────────────────────────────
// GET STUDENT FEE SUMMARY PER VOTE HEAD
// Shows: expected, paid, balance for each head — including arrears
// ─────────────────────────────────────────────────────────────────────
export async function getStudentVoteHeadSummary(
    supabase: any,
    studentId: number,
    termId: number | null,
    year: number
): Promise<{
    code: string; name: string; priority: number; color: string | null;
    expected: number; paid: number; balance: number; is_arrears?: boolean;
}[]> {
    const [studentRes, vhRes, allStructRes, allPayRes, allocRes, termsRes] = await Promise.all([
        supabase.from('school_students').select('form_id').eq('id', studentId).single(),
        supabase.from('school_vote_heads').select('id,code,name,priority,color').eq('is_active', true).order('priority'),
        supabase.from('school_fee_structures').select('category,amount,form_id,term_id,year,vote_head_id,vote_head_name'),
        supabase.from('school_fee_payments').select('amount,term_id,year').eq('student_id', studentId),
        supabase.from('school_fee_payment_allocations').select('vote_head_code,allocated_amount,term_id,year').eq('student_id', studentId),
        supabase.from('school_terms').select('id,year').order('year', { ascending: true }).order('id', { ascending: true }),
    ]);

    const formId     = studentRes.data?.form_id ?? null;
    const voteHeads: any[] = vhRes.data || [];
    const allStructs: any[] = (allStructRes.data || []).filter((s: any) => !formId || s.form_id === formId || !s.form_id);
    const allPays:   any[] = allPayRes.data || [];
    const allocs:    any[] = allocRes.data || [];

    // Determine which terms are PAST (before current term in order)
    const allTermsOrdered: any[] = termsRes.data || [];
    const currentTermIdx2 = allTermsOrdered.findIndex(t => String(t.id) === String(termId));
    const pastTermIdSet2 = new Set(
        allTermsOrdered.slice(0, Math.max(0, currentTermIdx2)).map(t => String(t.id))
    );

    // Current term expected per vote head
    const currentStructs = allStructs.filter(s =>
        String(s.term_id) === String(termId) && Number(s.year) === Number(year)
    );
    // Current term expected per vote head — keyed by vote_head_id (preferred) or name (legacy)
    const expectedById:   Record<number, number> = {};
    const expectedByName: Record<string, number> = {};
    for (const s of currentStructs) {
        if (s.vote_head_id) {
            expectedById[s.vote_head_id] = (expectedById[s.vote_head_id] || 0) + Number(s.amount || 0);
        } else {
            const cat = (s.category || s.vote_head_name || '').toLowerCase();
            expectedByName[cat] = (expectedByName[cat] || 0) + Number(s.amount || 0);
        }
    }

    // Paid per vote head this term (from allocations)
    const paidMap: Record<string, number> = {};
    for (const a of allocs) {
        if (String(a.term_id) === String(termId) && Number(a.year) === Number(year)) {
            paidMap[a.vote_head_code] = (paidMap[a.vote_head_code] || 0) + Number(a.allocated_amount || 0);
        }
    }

    // Arrears (previous terms)
    const termFeeMap: Record<string, number> = {};
    const termPaidMap: Record<string, number> = {};
    const currentKey = `${termId}|${year}`;
    for (const s of allStructs) {
        const k = `${s.term_id}|${s.year}`;
        if (k !== currentKey) termFeeMap[k] = (termFeeMap[k] || 0) + Number(s.amount || 0);
    }
    for (const p of allPays) {
        const k = `${p.term_id}|${p.year}`;
        if (k !== currentKey) termPaidMap[k] = (termPaidMap[k] || 0) + Number(p.amount || 0);
    }
    let arrearsTotal = 0;
    for (const [k, exp] of Object.entries(termFeeMap)) {
        const tid2 = k.split('|')[0];
        if (!pastTermIdSet2.has(tid2)) continue;   // skip FUTURE terms
        arrearsTotal += Math.max(0, exp - (termPaidMap[k] || 0));
    }

    // Build summary
    const result = [];

    // Add ARREARS row first if there are any
    if (arrearsTotal > 0) {
        const arrearsVH = voteHeads.find(vh =>
            vh.code.toUpperCase().includes('ARREAR') || vh.name.toLowerCase().includes('arrear')
        );
        const arrearsPaid = allocs
            .filter(a => a.vote_head_code === (arrearsVH?.code || 'ARREARS'))
            .reduce((s: number, a: any) => s + Number(a.allocated_amount || 0), 0);
        result.push({
            code: arrearsVH?.code || 'ARREARS',
            name: arrearsVH?.name || 'Arrears (Brought Forward)',
            priority: 0,
            color: '#dc2626',
            expected: arrearsTotal,
            paid: Math.min(arrearsPaid, arrearsTotal),
            balance: Math.max(0, arrearsTotal - arrearsPaid),
            is_arrears: true,
        });
    }

    // Current term vote heads
    for (const vh of voteHeads) {
        // Match by vote_head_id first, then fuzzy name fallback
        let expected = expectedById[vh.id] ?? 0;
        if (expected <= 0) {
            const matchKey = Object.keys(expectedByName).find(k =>
                k === vh.name.toLowerCase() || k === vh.code.toLowerCase() ||
                vh.name.toLowerCase().includes(k) || k.includes(vh.name.toLowerCase())
            );
            expected = matchKey ? expectedByName[matchKey] : 0;
        }
        if (expected <= 0) continue;
        const paid = paidMap[vh.code] || 0;
        result.push({
            code: vh.code, name: vh.name, priority: vh.priority, color: vh.color,
            expected, paid: Math.min(paid, expected), balance: Math.max(0, expected - paid),
        });
    }

    return result;
}
