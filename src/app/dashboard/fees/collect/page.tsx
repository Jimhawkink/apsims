'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useUltraFeeCollect, fmt } from '@/hooks/useUltraFeeCollect';
import UltraFeeSearch from '@/components/fees/UltraFeeSearch';
import UltraStudentFeeProfile from '@/components/fees/UltraStudentFeeProfile';
import UltraPaymentModal, { type PaymentData } from '@/components/fees/UltraPaymentModal';
import UltraFeeHistoryPanel from '@/components/fees/UltraFeeHistoryPanel';
import { printThermalReceipt, printDemandLetter } from '@/components/fees/UltraThermalReceipt';

export default function UltraCollectFeePage() {
  const {
    loading, forms, streams, students, payments, terms, settings,
    currentTerm, getFormName, getStreamName, searchStudent,
    getStudentFeeProfile, getStudentPayments, getStatement,
    genReceipt, recordPayment, updatePayment, deletePayment,
    sendSmsReceipt, fetchAll,
  } = useUltraFeeCollect();

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<any>(null);

  // Derived data
  const fees = selectedStudent ? getStudentFeeProfile(selectedStudent.id, selectedStudent.form_id) : null;
  const studentPayments = selectedStudent ? getStudentPayments(selectedStudent.id) : [];
  const statement = selectedStudent ? getStatement(selectedStudent.id) : { totalCharged: 0, totalPaid: 0, balance: 0, entries: [] };

  const handleSelectStudent = useCallback((student: any) => {
    setSelectedStudent(student);
  }, []);

  const getFeeBalance = useCallback((studentId: number, formId: number) => {
    const f = getStudentFeeProfile(studentId, formId);
    return { termBalance: f.termBalance, annualBalance: f.annualBalance, totalPaid: f.totalPaid };
  }, [getStudentFeeProfile]);

  const handleRecordPayment = async (data: PaymentData) => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const result = await recordPayment({
        studentId: selectedStudent.id,
        amount: data.amount,
        method: data.method,
        mpesaPhone: data.mpesaPhone,
        mpesaCode: data.mpesaCode,
        bankRef: data.bankSlip || data.bankBranch ? `${data.bankSlip} ${data.bankBranch} ${data.bankDate}`.trim() : undefined,
        chequeNo: data.chequeNo ? `${data.chequeNo} (${data.chequeBank})` : undefined,
        inKindItem: data.inKindItem,
        inKindValue: data.inKindValue,
        allocationHead: data.allocationHead,
        bursarySource: data.bursarySource,
        waiverType: data.waiverType,
        notes: data.notes,
      });

      toast.success(`${fmt(data.amount)} recorded — ${result.receipt_number} ✅`, { duration: 4000 });
      setShowPayModal(false);

      // Send SMS
      if (data.sendSms && selectedStudent.guardian_phone && fees) {
        const smsOk = await sendSmsReceipt(selectedStudent, data.amount, result.receipt_number, data.method, fees);
        if (smsOk) toast.success('📱 SMS receipt sent to parent', { duration: 3000 });
      }

      // Print receipt
      if (fees) {
        const adm = selectedStudent.admission_no || selectedStudent.admission_number || '';
        printThermalReceipt({
          receiptNumber: result.receipt_number,
          paymentDate: result.payment_date,
          studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
          admissionNo: adm,
          formStream: `${getFormName(selectedStudent.form_id)} / ${getStreamName(selectedStudent.stream_id)}`,
          parentName: selectedStudent.guardian_name,
          parentPhone: selectedStudent.guardian_phone,
          paymentMethod: data.method,
          reference: data.mpesaCode || data.bankSlip || data.chequeNo || '',
          amount: data.amount,
          totalPaid: fees.totalPaid + data.amount,
          termFees: fees.termTotal,
          termBalance: Math.max(0, fees.termBalance - data.amount),
          annualFees: fees.annualTotal,
          annualBalance: Math.max(0, fees.annualBalance - data.amount),
          allocations: data.allocationHead ? [{ head: data.allocationHead, amount: data.amount }] : undefined,
          bursaryApplied: fees.bursaryTotal > 0 ? fees.bursaryTotal : undefined,
          capitationApplied: fees.capitationTotal > 0 ? fees.capitationTotal : undefined,
          schoolName: settings?.school_name,
          schoolAddress: settings?.school_address,
          schoolPhone: settings?.school_phone,
          schoolEmail: settings?.school_email,
          schoolMotto: settings?.school_motto,
        });
      }

      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    }
    setIsSubmitting(false);
  };

  const handleEditPayment = (payment: any) => {
    toast('Edit feature — use delete & re-record for now', { icon: 'ℹ️' });
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await deletePayment(paymentId);
      toast.success('Payment deleted');
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handlePrintDemand = () => {
    if (!selectedStudent || !fees) return;
    printDemandLetter(selectedStudent, fees, settings?.school_name);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-violet-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Loading fee system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200/50" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Collect Fees</h1>
            <p className="text-sm text-gray-400 mt-0.5">Search student, record payment, generate receipt</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentTerm && (
            <span className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-bold border border-violet-200">
              📅 {currentTerm.term_name}
            </span>
          )}
          <Link href="/dashboard/fees" className="px-4 py-2 text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-xl hover:bg-violet-50 flex items-center gap-1.5 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            Fee Dashboard
          </Link>
        </div>
      </div>

      {/* ═══════ SEARCH BAR ═══════ */}
      <UltraFeeSearch
        searchFn={searchStudent}
        onSelect={handleSelectStudent}
        getFormName={getFormName}
        getStreamName={getStreamName}
        getFeeBalance={getFeeBalance}
        selectedStudent={selectedStudent}
      />

      {/* ═══════ MAIN CONTENT ═══════ */}
      {!selectedStudent ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-400">Search for a student</h3>
          <p className="text-sm text-gray-300 mt-1 max-w-sm text-center">
            Type a name, admission number, NEMIS number, or guardian phone to find a student and record their fee payment
          </p>
          <div className="flex gap-3 mt-6">
            <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-semibold text-gray-400 border border-gray-100">📊 {students.length} students</div>
            <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-semibold text-gray-400 border border-gray-100">💳 {payments.length} payments</div>
            <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-semibold text-gray-400 border border-gray-100">📋 {forms.length} forms</div>
          </div>
        </div>
      ) : (
        /* Two-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT — Student Profile */}
          <div className="lg:col-span-2">
            <UltraStudentFeeProfile
              student={selectedStudent}
              fees={fees!}
              getFormName={getFormName}
              getStreamName={getStreamName}
              onRecordPayment={() => setShowPayModal(true)}
              onViewStatement={() => {/* handled by right panel */}}
              onPrintDemand={handlePrintDemand}
            />
          </div>

          {/* RIGHT — History / Statement / Receipts */}
          <div className="lg:col-span-3">
            <UltraFeeHistoryPanel
              student={selectedStudent}
              payments={studentPayments}
              statement={statement}
              fees={fees}
              terms={terms}
              getFormName={getFormName}
              getStreamName={getStreamName}
              onEditPayment={handleEditPayment}
              onDeletePayment={handleDeletePayment}
              settings={settings}
            />
          </div>
        </div>
      )}

      {/* ═══════ PAYMENT MODAL ═══════ */}
      {selectedStudent && fees && (
        <UltraPaymentModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          student={selectedStudent}
          fees={fees}
          receiptNo={genReceipt()}
          getFormName={getFormName}
          getStreamName={getStreamName}
          onSubmit={handleRecordPayment}
          isSubmitting={isSubmitting}
        />
      )}

      <style jsx>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
