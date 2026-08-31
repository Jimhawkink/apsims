'use client';
import { useState } from 'react';
import { FiDownload, FiCopy, FiMonitor, FiTerminal, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const copy = (text: string) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
};

// Bridge script as a plain string — no nested template literals
function getBridgeScript(): string {
  return [
    '/**',
    ' * APSIMS ZK9500 Bridge — Run on teacher laptop',
    ' * Connects ZK9500 USB fingerprint scanner to APSIMS web',
    ' * Requirements: Node.js installed',
    ' * Install: npm install ws node-hid',
    ' * Run: node apsims-bridge.js',
    ' */',
    "const WebSocket = require('ws');",
    "const HID = require('node-hid');",
    '',
    'const PORT = 9500;',
    'const wss = new WebSocket.Server({ port: PORT });',
    '',
    '// ZK9500 USB Vendor ID (ZKTeco)',
    'const ZK_VID = 0x1B55;',
    "const ZK_PIDS = [0x0230, 0x0231, 0x0232];",
    '',
    'let scanner = null;',
    'const clients = new Set();',
    '',
    "console.log('APSIMS ZK9500 Bridge starting...');",
    "console.log('WebSocket on ws://localhost:' + PORT);",
    '',
    'function connectScanner() {',
    '  const devices = HID.devices();',
    '  const zk = devices.find(function(d) {',
    '    return d.vendorId === ZK_VID ||',
    '      ZK_PIDS.includes(d.productId) ||',
    "      (d.manufacturer || '').toLowerCase().includes('zk');",
    '  });',
    '  if (!zk) {',
    "    console.log('ZK9500 not found. Retrying in 3s...');",
    '    setTimeout(connectScanner, 3000);',
    '    return;',
    '  }',
    "  console.log('ZK9500 found: ' + (zk.product || 'ZKTeco Scanner'));",
    '  scanner = new HID.HID(zk.path);',
    "  scanner.on('data', function(data) {",
    '    if (data.length > 10) {',
    '      const msg = JSON.stringify({',
    "        type: 'fingerprint',",
    '        template: Buffer.from(data).toString(\'hex\'),',
    '        quality: data[1] || 70,',
    '        timestamp: new Date().toISOString(),',
    '      });',
    '      clients.forEach(function(c) { try { c.send(msg); } catch(e) {} });',
    "      console.log('Fingerprint captured, quality: ' + (data[1] || 70) + '%');",
    '    }',
    '  });',
    "  scanner.on('error', function() {",
    "    console.log('Scanner disconnected. Reconnecting...');",
    '    scanner = null;',
    '    setTimeout(connectScanner, 2000);',
    '  });',
    '}',
    '',
    "wss.on('connection', function(ws) {",
    '  clients.add(ws);',
    "  console.log('APSIMS web connected. Clients: ' + clients.size);",
    "  ws.send(JSON.stringify({ type: 'status', scanner: !!scanner, message: 'Bridge connected' }));",
    "  ws.on('message', function(data) {",
    '    try {',
    '      const msg = JSON.parse(data.toString());',
    "      if (msg.type === 'capture') {",
    "        console.log('Capture requested for: ' + (msg.name || msg.student_id));",
    '      }',
    '    } catch(e) {}',
    '  });',
    "  ws.on('close', function() { clients.delete(ws); });",
    "  ws.on('error', function() { clients.delete(ws); });",
    '});',
    '',
    'connectScanner();',
    "console.log('Bridge ready! Open APSIMS Student Scanner in Chrome.');",
  ].join('\n');
}

const STEPS = [
  {
    num: 1,
    icon: '🖥️',
    title: 'Buy ZKTeco ZK9500 Scanner',
    tag: 'Buy Once',
    body: 'Available at ZKTeco East Africa, Ngong Road Nairobi. Tel: +254 742 444 000. Price approx KES 4,000. Same device used in SHA health facilities.',
    link: null,
    cmd: null,
    isDownload: false,
  },
  {
    num: 2,
    icon: '⚙️',
    title: 'Install Node.js on the teacher laptop',
    tag: 'Install Once',
    body: 'Download from nodejs.org — choose the LTS version. Install like any normal Windows program. Run the installer and click Next until done.',
    link: 'https://nodejs.org',
    cmd: null,
    isDownload: false,
  },
  {
    num: 3,
    icon: '📥',
    title: 'Download APSIMS Bridge Script',
    tag: 'Download',
    body: 'Click the button below. Save apsims-bridge.js to the Desktop or a folder you can find easily.',
    link: null,
    cmd: null,
    isDownload: true,
  },
  {
    num: 4,
    icon: '📦',
    title: 'Install bridge dependencies (run once)',
    tag: 'Run Once',
    body: 'Open Command Prompt (search "cmd" in Start menu). Navigate to where you saved the file and run:',
    link: null,
    cmd: 'npm install ws node-hid',
    isDownload: false,
  },
];

const DAILY = [
  { e: '🔌', t: 'Plug ZK9500 into laptop USB port' },
  { e: '⚙️', t: 'Open Command Prompt → run: node apsims-bridge.js' },
  { e: '🟢', t: 'You should see "Bridge ready!" in the terminal' },
  { e: '🌐', t: 'Open Chrome → APSIMS → Student USB Scanner' },
  { e: '🏫', t: 'Select the class, walk to the classroom with laptop' },
  { e: '☝️', t: 'Click a student name → they place finger on ZK9500' },
  { e: '✅', t: 'Attendance saved automatically! Go to next student.' },
];

export default function ScannerBridgePage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      const script = getBridgeScript();
      const blob = new Blob([script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apsims-bridge.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('apsims-bridge.js downloaded!');
    } catch (e) {
      toast.error('Download failed. Try right-clicking and Save As.');
    }
    setDownloading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)' }}>
        <div className="p-7">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-4xl">☝️</div>
            <div>
              <h1 className="text-2xl font-black text-white">APSIMS Scanner Bridge</h1>
              <p className="text-indigo-300 text-sm mt-0.5">ZK9500 USB — Like SHA Kenya hospital scanners</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { e: '🏥', t: 'SHA-style', d: 'Same device used in Kenya health facilities' },
              { e: '💻', t: 'USB + Laptop', d: 'Teacher walks to class with laptop & scanner' },
              { e: '⚡', t: 'Instant', d: 'Student scans → attendance saved in 1 second' },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl p-3 bg-white/5 border border-white/10 text-center">
                <p className="text-2xl mb-1">{c.e}</p>
                <p className="text-white text-xs font-bold">{c.t}</p>
                <p className="text-indigo-300 text-[10px] mt-0.5">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Alert */}
        <div className="mx-5 mb-5 p-3 bg-green-500/20 border border-green-400/30 rounded-2xl flex items-start gap-3">
          <FiCheckCircle className="text-green-300 flex-shrink-0 mt-0.5" size={14} />
          <p className="text-green-200 text-xs">
            <strong>Works on any Windows/Mac/Linux laptop.</strong> Once the bridge is running, teachers never need to touch it again. Just open APSIMS in Chrome and start scanning.
          </p>
        </div>
      </div>

      {/* What you need */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-4">📦 What You Need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { e: '🖥️', t: 'ZKTeco ZK9500', d: 'USB Fingerprint Scanner — ~KES 4,000', note: 'ZKTeco East Africa, Ngong Rd Nairobi', ok: true },
            { e: '💻', t: "Teacher's Laptop", d: 'Windows / Mac / Linux + Chrome browser', note: 'Already have', ok: true },
            { e: '⚙️', t: 'Node.js (free)', d: 'Download once from nodejs.org', note: 'nodejs.org (free)', ok: false },
            { e: '📄', t: 'APSIMS Bridge Script', d: 'Download below — run once per day', note: 'Download button below', ok: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${item.ok ? 'border-green-200 bg-green-50' : 'border-indigo-100 bg-indigo-50'}`}>
              <span className="text-3xl flex-shrink-0">{item.e}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{item.t}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.d}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: item.ok ? '#059669' : '#4f46e5' }}>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-5">🚀 One-Time Setup (Do This Once)</h2>
        <div className="space-y-4">
          {STEPS.map(s => (
            <div key={s.num} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>{s.num}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-gray-800 text-sm">{s.icon} {s.title}</p>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{s.tag}</span>
                </div>
                <p className="text-xs text-gray-500">{s.body}</p>
                {s.cmd && (
                  <div className="flex items-center gap-2 mt-2 bg-gray-900 rounded-xl px-3 py-2">
                    <code className="text-green-400 text-xs flex-1">{s.cmd}</code>
                    <button onClick={() => copy(s.cmd!)} className="text-white/40 hover:text-white p-1">
                      <FiCopy size={11} />
                    </button>
                  </div>
                )}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:underline">
                    → {s.link}
                  </a>
                )}
                {s.isDownload && (
                  <button onClick={handleDownload} disabled={downloading}
                    className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    <FiDownload size={13} />
                    {downloading ? 'Preparing download…' : 'Download apsims-bridge.js'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Use */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-5">📅 Daily Use (Every School Day)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAILY.map((d, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
              <span className="text-xl flex-shrink-0">{d.e}</span>
              <p className="text-xs font-semibold text-gray-700">{d.t}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 p-4 bg-gray-900 rounded-2xl">
          <p className="text-green-400 text-xs font-bold mb-2">▶ Run every morning to start the bridge:</p>
          <div className="flex items-center gap-2">
            <code className="text-green-300 text-sm flex-1">node apsims-bridge.js</code>
            <button onClick={() => copy('node apsims-bridge.js')} className="text-white/40 hover:text-white p-1">
              <FiCopy size={12} />
            </button>
          </div>
          <p className="text-white/30 text-xs mt-2">Keep this terminal window open while taking attendance.</p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-black text-amber-800 mb-3 flex items-center gap-2">
          <FiAlertCircle size={16} /> Troubleshooting
        </h3>
        <div className="space-y-2">
          {[
            { q: '"ZK9500 not found"', a: 'Unplug and re-plug the USB cable. Try a different USB port. Restart the bridge.' },
            { q: '"Scanner Offline" in APSIMS', a: 'Make sure the bridge script is running in Command Prompt. Check the terminal shows "Bridge ready!".' },
            { q: 'Fingerprint not scanning', a: 'Clean the scanner surface with a dry cloth. Ask student to press firmly and hold for 2 seconds.' },
            { q: 'Bridge crashes on start', a: 'Run: npm install ws node-hid again. Make sure Node.js is installed (node --version in cmd).' },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-amber-200">
              <p className="text-xs font-black text-amber-800">{item.q}</p>
              <p className="text-xs text-amber-700 mt-0.5">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-2">
        <a href="/dashboard/attendance/student-scanner"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-white shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 20px 40px -10px rgba(79,70,229,0.5)' }}>
          <FiMonitor size={18} /> Open Student Scanner →
        </a>
        <p className="text-xs text-gray-400 mt-3">Make sure ZK9500 is plugged in and bridge is running first.</p>
      </div>
    </div>
  );
}
