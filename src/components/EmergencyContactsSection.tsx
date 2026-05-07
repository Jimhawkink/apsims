'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiAlertTriangle, FiPhone, FiMail, FiShield } from 'react-icons/fi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmergencyContact {
  id: number;
  student_id: number;
  contact_full_name: string;
  relationship: string;
  primary_phone: string;
  secondary_phone?: string;
  email?: string;
  escalation_order: number;
  authorized_to_collect: boolean;
}

// ─── Contact Form Modal ───────────────────────────────────────────────────────

function ContactModal({
  mode, contact, studentId, onClose, onSaved,
}: {
  mode: 'add' | 'edit';
  contact?: EmergencyContact;
  studentId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    contact_full_name: contact?.contact_full_name || '',
    relationship: contact?.relationship || '',
    primary_phone: contact?.primary_phone || '',
    secondary_phone: contact?.secondary_phone || '',
    email: contact?.email || '',
    escalation_order: contact?.escalation_order || 1,
    authorized_to_collect: contact?.authorized_to_collect || false,
  });
  const [saving, setSaving] = useState(false);
  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  const handleSubmit = async () => {
    if (!form.contact_full_name.trim()) return toast.error('Contact name is required');
    if (!form.relationship.trim()) return toast.error('Relationship is required');
    if (!form.primary_phone.trim()) return toast.error('Primary phone is required');
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/emergency-contacts' : `/api/emergency-contacts/${contact!.id}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const body = mode === 'add' ? { ...form, student_id: studentId } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save');
      toast.success(mode === 'add' ? 'Contact added ✅' : 'Contact updated ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🆘</div>
            <div>
              <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Add Emergency Contact' : 'Edit Emergency Contact'}</h2>
              <p className="text-xs text-white/70">Student emergency contact information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={lbl}>Full Name *</label><input type="text" value={form.contact_full_name} onChange={(e) => setForm({ ...form, contact_full_name: e.target.value })} placeholder="e.g. Mary Wanjiku" className={inp} /></div>
          <div><label className={lbl}>Relationship *</label><input type="text" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g. Mother, Father, Guardian" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Primary Phone *</label><input type="tel" value={form.primary_phone} onChange={(e) => setForm({ ...form, primary_phone: e.target.value })} placeholder="0712345678" className={inp} /></div>
            <div><label className={lbl}>Secondary Phone</label><input type="tel" value={form.secondary_phone} onChange={(e) => setForm({ ...form, secondary_phone: e.target.value })} placeholder="0798765432" className={inp} /></div>
          </div>
          <div><label className={lbl}>Email Address</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@example.com" className={inp} /></div>
          <div>
            <label className={lbl}>Escalation Order (1 = First to call)</label>
            <select value={form.escalation_order} onChange={(e) => setForm({ ...form, escalation_order: Number(e.target.value) })} className={inp}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="authorized" checked={form.authorized_to_collect} onChange={(e) => setForm({ ...form, authorized_to_collect: e.target.checked })} className="w-4 h-4 accent-red-600" />
            <label htmlFor="authorized" className="text-sm font-medium text-gray-700 cursor-pointer">Authorized to collect student from school</label>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2 disabled:opacity-50 transition">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            {mode === 'add' ? 'Add Contact' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Emergency Contacts Section ───────────────────────────────────────────────

export default function EmergencyContactsSection({
  studentId,
  studentStatus,
  canWrite,
}: {
  studentId: number;
  studentStatus?: string;
  canWrite: boolean;
}) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editContact, setEditContact] = useState<EmergencyContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EmergencyContact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emergency-contacts?student_id=${studentId}`);
      const result = await res.json();
      setContacts(result.data || []);
    } catch { toast.error('Failed to load emergency contacts'); } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleDelete = async (contact: EmergencyContact) => {
    try {
      const res = await fetch(`/api/emergency-contacts/${contact.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contact removed ✅');
      setDeleteConfirm(null);
      fetchContacts();
    } catch (e: any) { toast.error(e.message); }
  };

  const showWarning = contacts.length === 0 && studentStatus === 'Active';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #fef2f2, #fff7ed)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🆘</span>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Emergency Contacts</h3>
            <p className="text-xs text-gray-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} — sorted by escalation order</p>
          </div>
        </div>
        {canWrite && (
          <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-1">
            <FiPlus size={12} /> Add Contact
          </button>
        )}
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <FiAlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs font-bold text-amber-700">
            ⚠ No emergency contacts on file. This student is marked Active but has no emergency contacts. Please add at least one contact.
          </p>
        </div>
      )}

      {/* Contacts */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /></div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <span className="text-3xl mb-2">🆘</span>
            <p className="text-sm font-semibold">No emergency contacts</p>
            {canWrite && <p className="text-xs mt-1">Click &quot;Add Contact&quot; to add the first one</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-red-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Escalation Badge */}
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-extrabold text-red-700">{c.escalation_order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{c.contact_full_name}</p>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{c.relationship}</span>
                        {c.authorized_to_collect && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <FiShield size={10} /> Authorized to Collect
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <FiPhone size={11} className="text-gray-400" />
                          <span className="font-medium">{c.primary_phone}</span>
                        </div>
                        {c.secondary_phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FiPhone size={11} className="text-gray-400" />
                            <span>{c.secondary_phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FiMail size={11} className="text-gray-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditContact(c)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"><FiEdit2 size={13} /></button>
                      <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition"><FiTrash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <ContactModal mode="add" studentId={studentId} onClose={() => setShowAddModal(false)} onSaved={fetchContacts} />}
      {editContact && <ContactModal mode="edit" contact={editContact} studentId={studentId} onClose={() => setEditContact(null)} onSaved={fetchContacts} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-2">Remove Contact?</h3>
            <p className="text-sm text-gray-500 mb-5">Remove <strong>{deleteConfirm.contact_full_name}</strong> from emergency contacts? This cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
