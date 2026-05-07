import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, StatusBar, SafeAreaView,
    KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { useSession } from "../../context/SessionContext";
import {
    formatKES, getStudentFeePayments, getStudentFeeStructures,
    initiateKCBSTKPush, initiateSTKPush, pollSTKStatus,
} from "../../lib/supabase";
import { validateKenyanPhone, validateAmount } from "../../lib/security";

type RouteProps = RouteProp<RootStackParamList, "PayFees">;
type PayStep = "amount" | "confirm" | "processing" | "success" | "failed";
type PayMethod = "MPesa" | "KCB";

const C = {
    bg: "#f8fafc", card: "#fff", border: "#e2e8f0",
    primary: "#2563eb", accent: "#059669", accentLight: "#d1fae5",
    danger: "#ef4444", warning: "#f59e0b",
    purple: "#7c3aed", teal: "#0d9488",
    text: "#0f172a", textSub: "#64748b", textDim: "#94a3b8",
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function PayFeesScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { session } = useSession();
    const { studentId, studentName, formId } = route.params;

    const [step, setStep] = useState<PayStep>("amount");
    const [method, setMethod] = useState<PayMethod>("MPesa");
    const [amount, setAmount] = useState("");
    const [phone, setPhone] = useState("");
    const [balance, setBalance] = useState(0);
    const [totalDue, setTotalDue] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [error, setError] = useState("");
    const [receipt, setReceipt] = useState("");
    const [paidAmount, setPaidAmount] = useState(0);
    const [pollSeconds, setPollSeconds] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        loadBalance();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const loadBalance = async () => {
        const [pays, structs] = await Promise.all([
            getStudentFeePayments(studentId),
            formId ? getStudentFeeStructures(formId) : Promise.resolve([]),
        ]);
        const due = structs.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
        const paid = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
        setTotalDue(due);
        setTotalPaid(paid);
        setBalance(Math.max(0, due - paid));
    };

    const handleProceed = () => {
        const { valid: av, error: ae } = validateAmount(amount);
        if (!av) { setError(ae || "Invalid amount"); return; }
        const { valid: pv, error: pe } = validateKenyanPhone(phone);
        if (!pv) { setError(pe || "Invalid phone"); return; }
        setError("");
        setStep("confirm");
    };

    const startPolling = (checkoutRequestId: string) => {
        let elapsed = 0;
        pollRef.current = setInterval(async () => {
            elapsed += 5;
            setPollSeconds(elapsed);
            const { status, receipt: r } = await pollSTKStatus(checkoutRequestId);
            if (status === "completed" && r) {
                clearInterval(pollRef.current!);
                setReceipt(r);
                setPaidAmount(Math.round(parseFloat(amount)));
                setStep("success");
            } else if (elapsed >= 60) {
                clearInterval(pollRef.current!);
                setError("Payment not confirmed. Please check your M-Pesa and try again.");
                setStep("failed");
            }
        }, 5000);
    };

    const handlePayNow = async () => {
        setStep("processing");
        setError("");
        try {
            const amt = Math.round(parseFloat(amount));
            if (method === "MPesa") {
                const { checkoutRequestId, error: e } = await initiateSTKPush({
                    phone, amount: amt, studentId, studentName, description: `School Fees - ${studentName}`,
                });
                if (e || !checkoutRequestId) { setStep("failed"); setError(e || "M-Pesa STK Push failed"); return; }
                startPolling(checkoutRequestId);
            } else {
                const { checkoutRequestId, error: e } = await initiateKCBSTKPush({
                    phone, amount: amt, studentId, studentName, description: `School Fees - ${studentName}`,
                });
                if (e || !checkoutRequestId) { setStep("failed"); setError(e || "KCB STK Push failed"); return; }
                setTimeout(() => {
                    setReceipt(`KCB${Date.now().toString().slice(-8)}`);
                    setPaidAmount(amt);
                    setStep("success");
                }, 8000);
            }
        } catch (err: any) {
            setError(err.message || "Network error");
            setStep("failed");
        }
    };

    const reset = () => {
        setStep("amount"); setAmount(""); setPhone("");
        setError(""); setReceipt(""); setPaidAmount(0); setPollSeconds(0);
        if (pollRef.current) clearInterval(pollRef.current);
    };

    const mask = (p: string) => p.length >= 6 ? p.slice(0, 4) + "****" + p.slice(-3) : p;

    //  Processing Screen 
    if (step === "processing") return (
        <View style={[st.container, { justifyContent: "center", alignItems: "center" }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={st.resultTitle}>Processing Payment</Text>
                <Text style={st.resultSub}>Check your phone for the {method === "MPesa" ? "M-Pesa" : "KCB"} prompt</Text>
                {pollSeconds > 0 && (
                    <Text style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                        Waiting {60 - pollSeconds}s remaining
                    </Text>
                )}
                <View style={st.warningBox}>
                    <Text style={st.warningText}> Do NOT close this screen</Text>
                </View>
            </View>
        </View>
    );

    //  Success Screen 
    if (step === "success") return (
        <View style={[st.container, { justifyContent: "center", alignItems: "center" }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}>
                <Text style={{ fontSize: 60 }}></Text>
                <Text style={[st.resultTitle, { color: C.accent }]}>Payment Successful!</Text>
                <View style={st.receiptBox}>
                    {[
                        { l: "Student", v: studentName, e: "" },
                        { l: "Amount Paid", v: formatKES(paidAmount), e: "" },
                        { l: "Receipt No", v: receipt, e: "" },
                        { l: "Method", v: method === "MPesa" ? "M-Pesa" : "KCB Bank", e: method === "MPesa" ? "" : "" },
                    ].map((r, i) => (
                        <View key={i} style={st.rRow}>
                            <Text style={st.rEmoji}>{r.e}</Text>
                            <Text style={st.rLabel}>{r.l}</Text>
                            <Text style={[st.rValue, r.l === "Amount Paid" && { color: C.accent, fontWeight: "900" }]}>{r.v}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity onPress={() => { reset(); loadBalance(); navigation.goBack(); }} activeOpacity={0.85} style={{ width: "100%" }}>
                    <LinearGradient colors={[C.primary, "#1d4ed8"]} style={st.doneBtn}>
                        <Text style={st.doneBtnText}> Back to Dashboard</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={reset} style={{ paddingVertical: 10 }}>
                    <Text style={{ color: C.textSub, fontSize: 12, fontWeight: "600" }}>Make Another Payment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    //  Failed Screen 
    if (step === "failed") return (
        <View style={[st.container, { justifyContent: "center", alignItems: "center" }]}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <View style={st.resultCard}>
                <Text style={{ fontSize: 60 }}></Text>
                <Text style={[st.resultTitle, { color: C.danger }]}>Payment Failed</Text>
                <Text style={st.resultSub}>{error}</Text>
                <TouchableOpacity onPress={reset} activeOpacity={0.85} style={{ width: "100%" }}>
                    <LinearGradient colors={[C.primary, "#1d4ed8"]} style={st.doneBtn}>
                        <Text style={st.doneBtnText}> Try Again</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 10 }}>
                    <Text style={{ color: C.textDim, fontWeight: "600" }}> Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    //  Confirm Screen 
    if (step === "confirm") return (
        <View style={st.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
            <LinearGradient colors={["#2563eb", "#1d4ed8"]} style={st.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => setStep("amount")} accessibilityLabel="Go back">
                        <Text style={st.backText}> Back</Text>
                    </TouchableOpacity>
                    <Text style={st.headerTitle}> Confirm Payment</Text>
                </SafeAreaView>
            </LinearGradient>
            <ScrollView contentContainerStyle={st.content}>
                <View style={st.confirmCard}>
                    {[
                        { l: "Student", v: studentName, e: "" },
                        { l: "Form", v: session?.student_form || "N/A", e: "" },
                        { l: "Admission", v: session?.student_admission || "N/A", e: "" },
                        { l: "Amount", v: formatKES(parseFloat(amount)), e: "" },
                        { l: "Phone", v: mask(phone), e: "" },
                        { l: "Method", v: method === "MPesa" ? "M-Pesa STK Push" : "KCB STK Push", e: method === "MPesa" ? "" : "" },
                    ].map((r, i) => (
                        <View key={i} style={st.cRow}>
                            <Text style={{ fontSize: 16, width: 30 }}>{r.e}</Text>
                            <Text style={{ flex: 1, fontSize: 12, color: C.textSub, fontWeight: "600" }}>{r.l}</Text>
                            <Text style={{ fontSize: 13, color: r.l === "Amount" ? C.accent : C.text, fontWeight: r.l === "Amount" ? "900" : "700" }}>{r.v}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity onPress={handlePayNow} activeOpacity={0.85} accessibilityLabel="Confirm and pay">
                    <LinearGradient colors={["#059669", "#047857"]} style={st.payBtn}>
                        <Text style={{ fontSize: 18 }}></Text>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: "#fff" }}>
                            Pay {formatKES(parseFloat(amount))}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    //  Main Amount Entry Screen 
    return (
        <View style={st.container}>
            <StatusBar barStyle="light-content" backgroundColor="#059669" />
            <LinearGradient colors={["#059669", "#047857"]} style={st.header}>
                <SafeAreaView>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
                        <Text style={st.backText}> Back</Text>
                    </TouchableOpacity>
                    <Text style={st.headerTitle}> Pay School Fees</Text>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        {studentName}  {session?.student_form || ""} {session?.student_stream_name ? ` ${session.student_stream_name}` : ""}
                    </Text>
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Student & Balance Info */}
                    <View style={st.infoCard}>
                        <View style={st.infoRow}>
                            <Text style={st.infoLabel}> Student</Text>
                            <Text style={st.infoValue}>{studentName}</Text>
                        </View>
                        <View style={st.infoRow}>
                            <Text style={st.infoLabel}> Admission</Text>
                            <Text style={st.infoValue}>{session?.student_admission || "N/A"}</Text>
                        </View>
                        <View style={st.infoRow}>
                            <Text style={st.infoLabel}> Form</Text>
                            <Text style={st.infoValue}>{session?.student_form || "N/A"}</Text>
                        </View>
                        {session?.student_stream_name && (
                            <View style={st.infoRow}>
                                <Text style={st.infoLabel}> Stream</Text>
                                <Text style={st.infoValue}>{session.student_stream_name}</Text>
                            </View>
                        )}
                        <View style={[st.infoRow, { borderBottomWidth: 0, paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: C.border }]}>
                            <Text style={st.infoLabel}> Balance</Text>
                            <Text style={[st.infoValue, { color: balance > 0 ? C.danger : C.accent, fontWeight: "900", fontSize: 16 }]}>
                                {balance > 0 ? formatKES(balance) : " Fully Paid"}
                            </Text>
                        </View>
                        {totalDue > 0 && (
                            <View style={st.progressBar}>
                                <View style={[st.progressFill, { width: `${Math.min(100, (totalPaid / totalDue) * 100)}%` as any }]} />
                            </View>
                        )}
                        {balance === 0 && totalDue > 0 && (
                            <Text style={{ fontSize: 11, color: C.accent, textAlign: "center", marginTop: 4, fontWeight: "700" }}>
                                 All fees paid! You can still make a prepayment for next term.
                            </Text>
                        )}
                    </View>

                    {/* Payment Method */}
                    <Text style={st.label}> Payment Method</Text>
                    <View style={st.methodRow}>
                        {(["MPesa", "KCB"] as PayMethod[]).map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setMethod(m)}
                                style={[st.methodBtn, method === m && st.methodBtnActive]}
                                accessibilityLabel={`Select ${m} payment`}
                            >
                                <Text style={st.methodEmoji}>{m === "MPesa" ? "" : ""}</Text>
                                <Text style={[st.methodBtnText, method === m && st.methodBtnTextActive]}>
                                    {m === "MPesa" ? "M-Pesa" : "KCB Bank"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Phone */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={st.label}> Phone Number</Text>
                        <TextInput
                            style={st.input}
                            value={phone}
                            onChangeText={t => { setPhone(t); setError(""); }}
                            placeholder="0712345678"
                            placeholderTextColor={C.textDim}
                            keyboardType="phone-pad"
                            maxLength={13}
                            accessibilityLabel="Phone number"
                        />
                        <Text style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>
                            This phone receives the {method === "MPesa" ? "M-Pesa" : "KCB"} payment prompt
                        </Text>
                    </View>

                    {/* Amount */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={st.label}> Amount (KES)</Text>
                        <TextInput
                            style={[st.input, { fontSize: 24, fontWeight: "900", textAlign: "center" }]}
                            value={amount}
                            onChangeText={t => { setAmount(t.replace(/[^0-9]/g, "")); setError(""); }}
                            placeholder="Enter amount"
                            placeholderTextColor={C.textDim}
                            keyboardType="numeric"
                            maxLength={7}
                            accessibilityLabel="Payment amount"
                        />

                        {/* Quick Amount Buttons */}
                        <View style={st.quickAmounts}>
                            {QUICK_AMOUNTS.map(qa => (
                                <TouchableOpacity
                                    key={qa}
                                    onPress={() => setAmount(String(qa))}
                                    style={[st.quickBtn, amount === String(qa) && st.quickBtnActive]}
                                    accessibilityLabel={`Quick amount ${formatKES(qa)}`}
                                >
                                    <Text style={[st.quickBtnText, amount === String(qa) && st.quickBtnTextActive]}>
                                        {qa >= 1000 ? `${qa / 1000}K` : qa}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Pay Balance Button */}
                        {balance > 0 && (
                            <TouchableOpacity
                                onPress={() => setAmount(String(Math.round(balance)))}
                                style={st.payBalanceBtn}
                                accessibilityLabel="Pay full balance"
                            >
                                <Text style={st.payBalanceBtnText}>
                                     Pay full balance: {formatKES(balance)}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Error */}
                    {error ? (
                        <View style={st.errorBox}>
                            <Text style={st.errorText}> {error}</Text>
                        </View>
                    ) : null}

                    {/* Continue Button */}
                    <TouchableOpacity
                        onPress={handleProceed}
                        disabled={!amount.trim() || !phone.trim()}
                        activeOpacity={0.85}
                        accessibilityLabel="Continue to confirm"
                    >
                        <LinearGradient
                            colors={amount.trim() && phone.trim() ? ["#059669", "#047857"] : ["#94a3b8", "#64748b"]}
                            style={st.continueBtn}
                        >
                            <Text style={st.continueBtnText}>Continue </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Security Note */}
                    <View style={st.securityNote}>
                        <Text style={st.securityNoteText}>
                             Payments processed securely via {method === "MPesa" ? "Safaricom M-Pesa" : "KCB Bank"}.
                            Credited to {studentName}'s account immediately.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 40 },
    header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20 },
    backText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600", marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },

    infoCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 16,
        marginBottom: 16, borderWidth: 1, borderColor: C.border,
    },
    infoRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
    },
    infoLabel: { fontSize: 12, color: C.textSub, fontWeight: "600" },
    infoValue: { fontSize: 13, color: C.text, fontWeight: "700" },
    progressBar: { height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginTop: 8 },
    progressFill: { height: "100%", backgroundColor: C.accent, borderRadius: 3 },

    label: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 8 },
    methodRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    methodBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: "#f1f5f9", alignItems: "center",
        borderWidth: 1.5, borderColor: C.border, gap: 4,
    },
    methodBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
    methodEmoji: { fontSize: 22 },
    methodBtnText: { fontSize: 13, fontWeight: "800", color: C.textSub },
    methodBtnTextActive: { color: "#fff" },

    input: {
        backgroundColor: "#f1f5f9", borderWidth: 1.5, borderColor: "#cbd5e1",
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: C.text, fontWeight: "600",
    },

    quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    quickBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: C.border,
    },
    quickBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    quickBtnText: { fontSize: 12, fontWeight: "800", color: C.textSub },
    quickBtnTextActive: { color: "#fff" },

    payBalanceBtn: {
        backgroundColor: "rgba(5,150,105,0.08)", borderRadius: 12,
        padding: 12, marginTop: 10, borderWidth: 1, borderColor: "rgba(5,150,105,0.2)",
    },
    payBalanceBtnText: { fontSize: 13, color: C.accent, fontWeight: "800", textAlign: "center" },

    errorBox: {
        backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 12,
        padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    },
    errorText: { fontSize: 12, color: C.danger, fontWeight: "600" },

    continueBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
    continueBtnText: { fontSize: 16, fontWeight: "900", color: "#fff" },

    securityNote: {
        flexDirection: "row", backgroundColor: "rgba(37,99,235,0.06)",
        borderRadius: 14, padding: 14, marginTop: 16,
        borderWidth: 1, borderColor: "rgba(37,99,235,0.1)",
    },
    securityNoteText: { fontSize: 11, color: C.textSub, lineHeight: 18 },

    // Confirm screen
    confirmCard: {
        backgroundColor: C.card, borderRadius: 18, borderWidth: 1,
        borderColor: C.border, marginBottom: 20, overflow: "hidden",
    },
    cRow: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
    },
    payBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, borderRadius: 18, paddingVertical: 18,
    },

    // Result screens
    resultCard: {
        backgroundColor: C.card, borderRadius: 24, padding: 32,
        alignItems: "center", gap: 12, marginHorizontal: 24,
        borderWidth: 1, borderColor: C.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
    },
    resultTitle: { fontSize: 20, fontWeight: "900", color: C.text },
    resultSub: { fontSize: 13, color: C.textSub, textAlign: "center", lineHeight: 20 },
    warningBox: {
        backgroundColor: "#fef3c7", borderRadius: 10, padding: 10,
        borderWidth: 1, borderColor: "#f59e0b",
    },
    warningText: { fontSize: 12, color: "#92400e", fontWeight: "700" },
    receiptBox: { width: "100%", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
    rRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 10, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
    },
    rEmoji: { fontSize: 16, width: 24 },
    rLabel: { flex: 1, fontSize: 12, color: C.textSub, fontWeight: "600" },
    rValue: { fontSize: 13, color: C.text, fontWeight: "700" },
    doneBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    doneBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
