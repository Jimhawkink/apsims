-- ============================================================
-- APSIMS Transport Management Schema
-- ============================================================

-- Driver records (must be created before vehicles due to FK)
CREATE TABLE IF NOT EXISTS school_transport_drivers (
  id                  SERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  national_id         TEXT NOT NULL,
  licence_number      TEXT NOT NULL,
  licence_expiry_date DATE NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_tenant   ON school_transport_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_active   ON school_transport_drivers(is_active);

-- Vehicle registry
CREATE TABLE IF NOT EXISTS school_transport_vehicles (
  id               SERIAL PRIMARY KEY,
  tenant_id        UUID NOT NULL,
  registration_no  TEXT NOT NULL,
  make_model       TEXT NOT NULL,
  seating_capacity INTEGER NOT NULL CHECK (seating_capacity > 0),
  driver_id        INTEGER REFERENCES school_transport_drivers(id) ON DELETE SET NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, registration_no)
);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_tenant ON school_transport_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_driver ON school_transport_vehicles(driver_id);

-- Route definitions with stops as JSONB array
-- stops format: [{"order": 1, "name": "Town Stage", "distance_km": 0}, ...]
CREATE TABLE IF NOT EXISTS school_transport_routes (
  id                SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  route_name        TEXT NOT NULL,
  stops             JSONB NOT NULL DEFAULT '[]',
  total_distance_km NUMERIC(8,2),
  vehicle_id        INTEGER REFERENCES school_transport_vehicles(id) ON DELETE SET NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_routes_tenant  ON school_transport_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_vehicle ON school_transport_routes(vehicle_id);

-- Student-to-route assignments per term
CREATE TABLE IF NOT EXISTS school_transport_assignments (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  student_id      INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  route_id        INTEGER NOT NULL REFERENCES school_transport_routes(id) ON DELETE CASCADE,
  pickup_stop     TEXT NOT NULL,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  term_id         INTEGER NOT NULL REFERENCES school_terms(id),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_route  ON school_transport_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_term   ON school_transport_assignments(term_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_student ON school_transport_assignments(student_id);

-- Transport fee structures (per route per term)
CREATE TABLE IF NOT EXISTS school_transport_fee_structures (
  id         SERIAL PRIMARY KEY,
  tenant_id  UUID NOT NULL,
  route_id   INTEGER NOT NULL REFERENCES school_transport_routes(id) ON DELETE CASCADE,
  term_id    INTEGER NOT NULL REFERENCES school_terms(id),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_transport_fee_struct_tenant ON school_transport_fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_fee_struct_term   ON school_transport_fee_structures(term_id);
CREATE INDEX IF NOT EXISTS idx_transport_fee_struct_route  ON school_transport_fee_structures(route_id);

-- Transport fee payments
CREATE TABLE IF NOT EXISTS school_transport_fee_payments (
  id             SERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  student_id     INTEGER NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  route_id       INTEGER NOT NULL REFERENCES school_transport_routes(id),
  term_id        INTEGER NOT NULL REFERENCES school_terms(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  receipt_number TEXT,
  recorded_by    INTEGER REFERENCES school_users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_payments_student ON school_transport_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_payments_term    ON school_transport_fee_payments(term_id);
CREATE INDEX IF NOT EXISTS idx_transport_payments_route   ON school_transport_fee_payments(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_payments_tenant  ON school_transport_fee_payments(tenant_id);

-- SMS notification logs
CREATE TABLE IF NOT EXISTS school_transport_sms_logs (
  id                SERIAL PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  route_id          INTEGER NOT NULL REFERENCES school_transport_routes(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('Departed','Arrived')),
  message_content   TEXT NOT NULL,
  recipient_phone   TEXT NOT NULL,
  student_id        INTEGER REFERENCES school_students(id),
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  delivery_status   TEXT DEFAULT 'Sent'
);
CREATE INDEX IF NOT EXISTS idx_transport_sms_route   ON school_transport_sms_logs(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_sms_tenant  ON school_transport_sms_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_sms_sent_at ON school_transport_sms_logs(sent_at);
