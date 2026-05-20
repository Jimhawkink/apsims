'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiWifi, FiWifiOff, FiCpu, FiMapPin, FiUsers, FiRefreshCw } from 'react-icons/fi';
import { BiometricDevice, isDeviceOffline } from '@/lib/biometric-types';

interface Props {
  devices: BiometricDevice[];
  onRefresh: () => void;
}

const BRANDS = ['ZKTeco', 'Hikvision', 'Suprema', 'Generic'] as const;
const DEVICE_TYPES = ['fingerprint', 'face', 'card', 'mixed'] as const;
const SYNC_MODES = ['pull', 'push'] as const;

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Offline: 'bg-red-100 text-red-700',
  Maintenance: 'bg-amber-100 text-amber-700',
  Disabled: 'bg-gray-100 text-gray-500',
};

const brandColors: Record<string, string> = {
  ZKTeco: 'bg-blue-100 text-blue-700',
  Hikvision: 'bg-red-100 text-red-700',
  Suprema: 'bg-purple-100 text-purple-700',
  Generic: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  device_name: '', brand: 'ZKTeco' as const, model: '', device_type: 'fingerprint' as const,
  ip_address: '', port: 4370, location: '', sync_mode: 'pull' as const,
  sync_interval_minutes: 5, notes: '', assigned_forms: [] as number[],
};

export default function DevicesTab({ devices, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (d: BiometricDevice) => {
    setEditing(d);
    setForm({
      device_name: d.device_name, brand: d.brand, model: d.model || '',
      device_type: d.device_type, ip_address: d.ip_address || '', port: d.port,
      location: d.location || '', sync_mode: d.sync_mode,
      sync_interval_minutes: d.sync_interval_minutes, notes: d.notes || '',
      assigned_forms: d.assigned_forms || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.device_name.trim()) { toast.error('Device name is required'); return; }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch('/api/biometric/devices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? 'Device updated' : 'Device added');
      setShowModal(false);
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save device');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Disable device "${name}"?`)) return;
    const res = await fetch('/api/biometric/devices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) { toast.success('Device disabled'); onRefresh(); }
    else toast.error('Failed to disable device');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{devices.length} device{devices.length !== 1 ? 's' : ''} registered</p>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700">
            <FiPlus size={15} /> Add Device
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiCpu size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No biometric devices registered</p>
          <p className="text-sm mt-1">Add your first ZKTeco, Hikvision, or Suprema device</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(d => {
            const offline = isDeviceOffline(d.last_heartbeat_at);
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{d.device_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{d.model || 'No model'}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(d.id, d.device_name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[d.status] || 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${brandColors[d.brand] || 'bg-gray-100 text-gray-600'}`}>{d.brand}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{d.sync_mode}</span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  {d.location && (
                    <div className="flex items-center gap-1.5"><FiMapPin size={11} />{d.location}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <FiUsers size={11} />{d.total_enrolled} enrolled
                  </div>
                  <div className="flex items-center gap-1.5">
                    {offline ? <FiWifiOff size={11} className="text-red-500" /> : <FiWifi size={11} className="text-green-500" />}
                    {offline
                      ? <span className="text-red-500 font-medium">⚠ Offline</span>
                      : <span className="text-green-600">Online</span>
                    }
                    {d.last_heartbeat_at && (
                      <span className="text-gray-400">· {new Date(d.last_heartbeat_at).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Device' : 'Add Biometric Device'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Device Name *</label>
                <input value={form.device_name} onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Main Gate Scanner" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brand</label>
                  <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value as typeof form.brand }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Device Type</label>
                  <select value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value as typeof form.device_type }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {DEVICE_TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
                <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. ZK-F18" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">IP Address</label>
                  <input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Port</label>
                  <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 4370 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Main Gate, Staff Room" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sync Mode</label>
                  <select value={form.sync_mode} onChange={e => setForm(f => ({ ...f, sync_mode: e.target.value as typeof form.sync_mode }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {SYNC_MODES.map(m => <option key={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sync Interval (min)</label>
                  <select value={form.sync_interval_minutes} onChange={e => setForm(f => ({ ...f, sync_interval_minutes: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {[1, 5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update Device' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
