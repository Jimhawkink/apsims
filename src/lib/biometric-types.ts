// ============================================================
// APSIMS ULTRA — Biometric, WhatsApp & PWA Type Definitions
// ============================================================

// ─── Biometric ───────────────────────────────────────────────

export interface BiometricDevice {
  id: number;
  device_name: string;
  device_type: 'fingerprint' | 'face' | 'card' | 'mixed';
  brand: 'ZKTeco' | 'Hikvision' | 'Suprema' | 'Generic';
  model: string | null;
  serial_number: string | null;
  ip_address: string | null;
  port: number;
  location: string | null;
  assigned_forms: number[] | null;
  status: 'Active' | 'Offline' | 'Maintenance' | 'Disabled';
  last_sync_at: string | null;
  last_heartbeat_at: string | null;
  total_enrolled: number;
  api_key: string | null;
  sync_mode: 'pull' | 'push';
  sync_interval_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricEnrollment {
  id: number;
  student_id: number;
  device_id: number | null;
  enrollment_type: 'fingerprint' | 'face' | 'card';
  device_user_id: string | null;
  enrolled_at: string;
  is_active: boolean;
  template_data: string | null;
  // joined
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    form_id: number;
    stream_id: number | null;
  };
  device?: BiometricDevice;
}

export interface BiometricLog {
  id: number;
  device_id: number | null;
  device_user_id: string | null;
  student_id: number | null;
  punch_time: string;
  punch_type: 'check_in' | 'check_out';
  verify_method: 'fingerprint' | 'face' | 'card' | 'password';
  temperature: number | null;
  photo_url: string | null;
  synced_to_attendance: boolean;
  attendance_record_id: number | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  // joined
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
  };
  device?: {
    id: number;
    device_name: string;
    brand: string;
    location: string | null;
  };
}

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  duration_ms: number;
}

// ─── WhatsApp ─────────────────────────────────────────────────

export interface WhatsAppLog {
  id: number;
  recipient_phone: string;
  recipient_name: string | null;
  student_id: number | null;
  message_type: 'report_card' | 'fee_reminder' | 'general' | 'attendance_alert';
  template_name: string | null;
  message_body: string | null;
  whatsapp_message_id: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message: string | null;
  cost_saved: number;
  term_id: number | null;
  sent_by: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  // joined
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    admission_number: string;
    form_id: number;
    stream_id: number | null;
    guardian_name?: string;
    guardian_phone?: string;
  };
}

export interface WhatsAppTemplate {
  key: string;
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  parameters: string[];
  approved: boolean;
  sampleBody: string;
  description: string;
}

export interface WhatsAppStats {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  total: number;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  total: number;
  batch_id: string;
}

// ─── PWA / IndexedDB ──────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;           // uuid
  type: 'attendance' | 'fee_payment' | 'biometric_log';
  endpoint: string;     // API route to POST to
  payload: Record<string, unknown>;
  queued_at: string;    // ISO timestamp
  attempts: number;
  status: 'pending' | 'failed';
  last_error: string | null;
}

export interface IndexedDBStudent {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  form_id: number;
  stream_id: number | null;
  guardian_phone: string | null;
}

export interface IndexedDBAttendance {
  id: string;           // composite key: `${student_id}_${date}`
  student_id: number;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  class_id: number | null;
}

// ─── Utility helpers ──────────────────────────────────────────

/** Returns true if the device's last heartbeat was more than 10 minutes ago */
export function isDeviceOffline(lastHeartbeatAt: string | null): boolean {
  if (!lastHeartbeatAt) return true;
  const diff = Date.now() - new Date(lastHeartbeatAt).getTime();
  return diff > 10 * 60 * 1000;
}

/** Determines attendance status based on punch time (EAT = UTC+3) */
export function determineAttendanceStatus(punchTime: string): 'Present' | 'Late' {
  const dt = new Date(punchTime);
  // Convert to EAT (UTC+3)
  const eatHour = (dt.getUTCHours() + 3) % 24;
  const eatMinute = dt.getUTCMinutes();
  const isBeforeThreshold = eatHour < 8 || (eatHour === 8 && eatMinute < 30);
  return isBeforeThreshold ? 'Present' : 'Late';
}

/** Calculates KES cost savings vs SMS (KES 1.00 per SMS) */
export function calculateCostSavings(sentCount: number): number {
  return sentCount * 1.0;
}

/** Checks if the PWA install prompt should be shown (7-day suppression) */
export function shouldShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem('pwa-dismissed-at');
  if (!dismissed) return true;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - parseInt(dismissed, 10) > sevenDays;
}
