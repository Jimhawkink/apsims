'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FiAlertTriangle, FiEdit2, FiSave, FiPlay, FiToggleLeft, FiToggleRight,
    FiX, FiRefreshCw, FiMessageSquare, FiPhone, FiCheckCircle
} from 'react-icons/fi';

type Channel = 'SMS' | 'WhatsApp' | 'Both';

interface EscalationStep {
    id?: number;
    step_number: number;
    days_offset: number;
    message_template: string;
    channel: Channel;
    is_active: boolean;
}

const DEFAULT_STEPS: EscalationStep[] = [
    {
        step_number: 1,
        days_offset: -3,
        message_template: "Dear {guardian}, {student_name}'s fees are due in 3 days. Balance: KES {balance}. - APSIMS",
        channel: 'SMS',
        is_active: true,
    },
    {
        step_number: 2,
        days_offset: 0,
        message_template: "Dear {guardian}, {student_name}'s fees are due TODAY. Balance: KES {balance}. Please pay now. - APSIMS",
        channel: 'Both',
        is_active: true,
    },
    {
        step_number: 3,
        days_offset: 7,
        message_template: "Dear {guardian}, {student_name}'s fees are 7 days overdue. Balance: KES {balance}. - APSIMS",
        channel: 'Both',
        is_active: true,
    },
    {
        step_number: 4,
        days_offset: 14,
        message_template: "FINAL DEMAND: Dear {guardian}, {student_name}'s fees are 14 days overdue. Balance: KES {balance}. Contact school immediately. - APSIMS",
        channel: 'Both',
        is_active: true,
    },
];

interface EditStepModalProps {
    step: EscalationStep;
    onSave: (step: EscalationStep) => void;
    onClose: () => void;
}

function EditStepModal({ step, onSave, onClose }: EditStepModalProps) {
    const [form, setForm] = useState<EscalationStep>({ ...step });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <FiEdit2 size={14} /> Edit Step {step.step_number}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">
                            Days Offset (negative = before due date, positive = after)
                        </label>
                        <input
                            type="number"
                            value={form.days_offset}
                            onChange={e => setForm(f => ({ ...f, days_offset: Number(e.target.value) }))}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-red-400 outline-none"
                            placeholder="e.g. -3 (3 days before), 7 (7 days after)"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            {form.days_offset < 0
                                ? `Sends ${Math.abs(form.days_offset)} day(s) before due date`
                                : form.days_offset === 0
                                    ? 'Sends on the due date'
                                    : `Sends ${form.days_offset} day(s) after due date`}
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Message Template</label>
                        <textarea
                            value={form.message_template}
                            onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-red-400 outline-none resize-none"
                            rows={4}
                            placeholder="Use {guardian}, {student_name}, {balance} as merge tags"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                            {['{guardian}', '{student_name}', '{balance}'].map(tag => (
                                <button key={tag}
                                    onClick={() => setForm(f => ({ ...f, message_template: f.message_template + ' ' + tag }))}
                                    className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-600 hover:bg-gray-200 transition-all">
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Channel</label>
                        <select
                            value={form.channel}
                            onChange={e => setForm(f => ({ ...f, channel: e.target.value as Channel }))}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-red-400 outline-none">
                            <option value="SMS">SMS only</option>
                            <option value="WhatsApp">WhatsApp only</option>
                            <option value="Both">Both SMS & WhatsApp</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Active</label>
                        <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                            {form.is_active
                                ? <FiToggleRight size={24} className="text-green-500" />
                                : <FiToggleLeft size={24} className="text-gray-400" />}
                        </button>
                        <span className="text-xs text-gray-500">{form.is_active ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                        Cancel
                    </button>
                    <button onClick={() => onSave(form)}
                        className="px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                        <FiSave size={14} /> Save Step
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DefaulterAutomationPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<EscalationStep[]>(DEFAULT_STEPS);
    const [editingStep, setEditingStep] = useState<EscalationStep | null>(null);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fees/defaulter-automation');
            if (res.ok) {
                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    setSteps(data.data);
                } else {
                    // Pre-populate with defaults on first load
                    setSteps(DEFAULT_STEPS);
                }
            }
        } catch (e) {
            console.error('Failed to load rules:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const handleSaveStep = (updatedStep: EscalationStep) => {
        setSteps(prev => prev.map(s => s.step_number === updatedStep.step_number ? updatedStep : s));
        setEditingStep(null);
    };

    const handleToggleActive = (stepNumber: number) => {
        setSteps(prev => prev.map(s =>
            s.step_number === stepNumber ? { ...s, is_active: !s.is_active } : s
        ));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/fees/defaulter-automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to save rules');
            } else {
                toast.success('Escalation rules saved successfully ✅');
                fetchRules();
            }
        } catch (e) {
            toast.error('Failed to save rules');
        }
        setSaving(false);
    };

    const handleRunNow = async () => {
        setRunning(true);
        try {
            const res = await fetch('/api/fees/defaulter-automation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to run automation');
            } else {
                toast.success(`${data.message} ✅`);
            }
        } catch (e) {
            toast.error('Failed to run automation');
        }
        setRunning(false);
    };

    const channelBadge = (channel: Channel) => {
        if (channel === 'SMS') return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"><FiMessageSquare size={10} /> SMS</span>;
        if (channel === 'WhatsApp') return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1"><FiPhone size={10} /> WhatsApp</span>;
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center gap-1"><FiCheckCircle size={10} /> Both</span>;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Defaulter Automation...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FiAlertTriangle size={24} /> Fee Defaulter Automation
                        </h1>
                        <p className="text-red-200 text-sm mt-1">
                            Configure automated escalation steps for fee demand communications
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleSaveAll} disabled={saving}
                            className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                            Save Rules
                        </button>
                        <button onClick={handleRunNow} disabled={running}
                            className="px-5 py-2.5 bg-white text-red-700 font-bold rounded-xl flex items-center gap-2 transition-all hover:bg-red-50 disabled:opacity-50 shadow-lg">
                            {running ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> : <FiPlay size={14} />}
                            Run Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                <div>
                    <p className="text-sm font-semibold text-amber-800">How it works</p>
                    <p className="text-xs text-amber-700 mt-1">
                        Each step triggers on a specific day relative to the term due date. Negative days_offset = before due date, positive = after.
                        The system checks daily and sends messages to all students with a fee balance &gt; 0 when today matches a step&apos;s target date.
                    </p>
                </div>
            </div>

            {/* Escalation Steps Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <FiAlertTriangle className="text-red-500" /> Escalation Steps ({steps.length}/5)
                    </h3>
                    <button onClick={fetchRules} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <FiRefreshCw size={12} /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-modern">
                        <thead>
                            <tr>
                                <th>Step</th>
                                <th>Days Offset</th>
                                <th>Trigger</th>
                                <th>Message Template</th>
                                <th>Channel</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {steps.map(step => (
                                <tr key={step.step_number} className={!step.is_active ? 'opacity-50' : ''}>
                                    <td>
                                        <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center">
                                            {step.step_number}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`font-bold text-sm ${step.days_offset < 0 ? 'text-blue-600' : step.days_offset === 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                            {step.days_offset > 0 ? '+' : ''}{step.days_offset}
                                        </span>
                                    </td>
                                    <td className="text-xs text-gray-500">
                                        {step.days_offset < 0
                                            ? `${Math.abs(step.days_offset)} day(s) before due`
                                            : step.days_offset === 0
                                                ? 'On due date'
                                                : `${step.days_offset} day(s) after due`}
                                    </td>
                                    <td className="max-w-[300px]">
                                        <p className="text-xs text-gray-600 truncate">{step.message_template}</p>
                                    </td>
                                    <td>{channelBadge(step.channel)}</td>
                                    <td>
                                        <button onClick={() => handleToggleActive(step.step_number)}>
                                            {step.is_active
                                                ? <FiToggleRight size={22} className="text-green-500" />
                                                : <FiToggleLeft size={22} className="text-gray-400" />}
                                        </button>
                                    </td>
                                    <td>
                                        <button onClick={() => setEditingStep(step)}
                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all flex items-center gap-1">
                                            <FiEdit2 size={11} /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStep && (
                <EditStepModal
                    step={editingStep}
                    onSave={handleSaveStep}
                    onClose={() => setEditingStep(null)}
                />
            )}
        </div>
    );
}
