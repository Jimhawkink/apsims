'use client';

import { useState } from 'react';
import { FiDownload, FiTerminal, FiCheckCircle, FiCopy, FiMonitor } from 'react-icons/fi';
import toast from 'react-hot-toast';

const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

export default function ScannerBridgePage() {
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  const installCommands = {
    windows: `# 1. Install Node.js from https://nodejs.org (if not installed)

# 2. Open PowerShell and run:
npm install -g apsims-bridge

# 3. Start the bridge:
apsims-bridge --port 9500`,
    mac: `# 1. Install Node.js (if not installed):
brew install node

# 2. Install APSIMS Bridge:
npm install -g apsims-bridge

# 3. Start the bridge:
apsims-bridge --port 9500`,
    linux: `# 1. Install Node.js:
sudo apt install nodejs npm

# 2. Install APSIMS Bridge:
sudo npm install -g apsims-bridge

# 3. Start the bridge:
apsims-bridge --port 9500`,
  };

  // Simple bridge script teachers can run directly with Node.js
  const bridgeScript = `/**
 * APSIMS ZK9500 Bridge — Run this on teacher's laptop
 * Connects ZK9500 USB fingerprint scanner to APSIMS web system
 *
 * Requirements: Node.js installed on laptop
 * Install deps: npm install ws node-hid
 * Run: node apsims-bridge.js
 */

const WebSocket = require('ws');
const HID = require('node-hid');

const PORT = 9500;
const wss = new WebSocket.Server({ port: PORT });

// ZK9500 USB IDs (ZKTeco East Africa)
const ZK9500_VID = 0x1B55;
const ZK9500_PID_LIST = [0x0230, 0x0231, 0x0232];

let scanner = null;
let clients = new Set();

console.log('\\n🔌 APSIMS ZK9500 Bridge starting...');
console.log(\`📡 WebSocket server on ws://localhost:\${PORT}\`);

// Find and connect to ZK9500
function connectScanner() {
  const devices = HID.devices();
  const zk = devices.find(d =>
    d.vendorId === ZK9500_VID ||
    ZK9500_PID_LIST.includes(d.productId) ||
    (d.manufacturer || '').toLowerCase().includes('zk')
  );

  if (!zk) {
    console.log('⚠️  ZK9500 not found. Plug in USB scanner and retry in 3s...');
    setTimeout(connectScanner, 3000);
    return;
  }

  console.log(\`✅ ZK9500 found: \${zk.product || 'ZKTeco Scanner'}\`);
  scanner = new HID.HID(zk.path);

  scanner.on('data', (data) => {
    // Parse fingerprint data from ZK9500
    const hex = Buffer.from(data).toString('hex');
    if (data.length > 10) {
      const msg = JSON.stringify({
        type: 'fingerprint',
        template: hex,
        quality: data[1] || 70,
        timestamp: new Date().toISOString(),
      });
      clients.forEach(c => { try { c.send(msg); } catch {} });
      console.log(\`☝️  Fingerprint captured (quality: \${data[1] || 70}%)\`);
    }
  });

  scanner.on('error', () => {
    console.log('❌ Scanner disconnected. Reconnecting...');
    scanner = null;
    setTimeout(connectScanner, 2000);
  });
}

// WebSocket server
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(\`🌐 APSIMS web connected (\${clients.size} clients)\`);
  ws.send(JSON.stringify({ type: 'status', scanner: !!scanner, message: 'Bridge connected' }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'capture') {
        console.log(\`📋 Capture requested for: \${msg.name || msg.student_id}\`);
        // Trigger LED on scanner if supported
      }
    } catch {}
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

connectScanner();
console.log('✅ Bridge ready! Open APSIMS → Student Scanner in Chrome.\\n');
`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-white/10">☝️</div>
            <div>
              <h1 className="text-2xl font-black text-white">APSIMS Scanner Bridge</h1>
              <p className="text-indigo-300">ZK9500 USB Fingerprint Scanner — Kenya (Like SHA Hospitals)</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { e: '🏥', t: 'Same as SHA', d: 'Exact technology used in Kenya hospitals' },
              { e: '💻', t: 'USB + Laptop', d: 'Teacher walks to class with laptop & scanner' },
              { e: '⚡', t: 'Instant', d: 'Student scans → attendance saved in 1 second' },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl p-3 bg-white/5 border border-white/10 text-center">
                <p className="text-2xl mb-1">{c.e}</p>
                <p className="text-white text-sm font-bold">{c.t}</p>
                <p className="text-indigo-300 text-xs mt-0.5">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What you need */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-4">📦 What You Need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { e: '🖥️', t: 'ZKTeco ZK9500', d: 'USB Fingerprint Scanner (~KES 4,000)', where: 'ZKTeco East Africa — Ngong Road, Nairobi\n+254 742 444 000\nwww.zkteco-ea.com', ok: true },
            { e: '💻', t: 'Teacher\'s Laptop', d: 'Windows/Mac/Linux with Chrome browser', where: 'Already have', ok: true },
            { e: '⚙️', t: 'Node.js', d: 'Free download from nodejs.org', where: 'nodejs.org (free)', ok: false },
            { e: '📡', t: 'APSIMS Bridge Script', d: 'Download below — run once on laptop', where: 'Download below', ok: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${item.ok ? 'border-green-200 bg-green-50' : 'border-indigo-100 bg-indigo-50'}`}>
              <span className="text-3xl flex-shrink-0">{item.e}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{item.t}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.d}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: item.ok ? '#059669' : '#4f46e5', whiteSpace: 'pre-line' }}>{item.where}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-5">🚀 One-Time Setup (Do This Once)</h2>
        <div className="space-y-4">
          {[
            {
              step: 1, title: 'Buy ZK9500 USB Scanner',
              body: 'Available at ZKTeco East Africa, Ngong Road Nairobi. Tel: +254 742 444 000. Price ~KES 4,000.',
              tag: 'Buy Once',
            },
            {
              step: 2, title: 'Install Node.js on teacher laptop',
              body: 'Download from nodejs.org — choose "LTS" version. Install like any normal program.',
              tag: 'Install Once',
              link: 'https://nodejs.org',
            },
            {
              step: 3, title: 'Download APSIMS Bridge Script',
              body: 'Click the download button below. Save the file apsims-bridge.js on your desktop.',
              tag: 'Download',
              download: true,
              script: bridgeScript,
            },
            {
              step: 4, title: 'Install bridge dependencies (run once)',
              body: 'Open Command Prompt / Terminal and run:',
              tag: 'Run Once',
              cmd: 'npm install -g ws node-hid',
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>{s.step}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-800 text-sm">{s.title}</p>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{s.tag}</span>
                </div>
                <p className="text-xs text-gray-500">{s.body}</p>
                {s.cmd && (
                  <div className="flex items-center gap-2 mt-2 bg-gray-800 rounded-xl px-3 py-2">
                    <code className="text-green-400 text-xs flex-1">{s.cmd}</code>
                    <button onClick={() => copy(s.cmd!)} className="text-white/40 hover:text-white"><FiCopy size={11} /></button>
                  </div>
                )}
                {s.download && (
                  <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([s.script!], { type: 'text/javascript' }));
                    a.download = 'apsims-bridge.js'; a.click();
                    toast.success('Bridge script downloaded!');
                  }} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    <FiDownload size={12} />Download apsims-bridge.js
                  </button>
                )}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer" className="mt-1 text-indigo-600 text-xs font-semibold hover:underline block">{s.link} →</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Use */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-800 text-lg mb-5">📅 Daily Use (Every Day)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { step: 1, e: '🔌', t: 'Plug ZK9500 into laptop USB port' },
            { step: 2, e: '⚙️', t: 'Double-click "Start APSIMS Bridge" (or run: node apsims-bridge.js)' },
            { step: 3, e: '🌐', t: 'Open Chrome → APSIMS → Student Scanner page' },
            { step: 4, e: '🏫', t: 'Select class, walk to classroom with laptop' },
            { step: 5, e: '☝️', t: 'Click student name → student places finger on ZK9500' },
            { step: 6, e: '✅', t: 'Attendance auto-saved! Move to next student' },
          ].map(s => (
            <div key={s.step} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{s.step}</div>
              <span className="text-xl flex-shrink-0">{s.e}</span>
              <p className="text-xs font-semibold text-gray-700">{s.t}</p>
            </div>
          ))}
        </div>

        {/* Run command */}
        <div className="mt-5 p-4 bg-gray-900 rounded-2xl">
          <p className="text-green-400 text-xs font-bold mb-2">▶ Run this every morning to start the bridge:</p>
          <div className="flex items-center gap-2">
            <code className="text-green-300 text-sm flex-1">node apsims-bridge.js</code>
            <button onClick={() => copy('node apsims-bridge.js')} className="text-white/40 hover:text-white p-1"><FiCopy size={12} /></button>
          </div>
          <p className="text-white/30 text-xs mt-2">Keep this terminal window open while taking attendance</p>
        </div>
      </div>

      {/* Open scanner button */}
      <div className="text-center py-4">
        <a href="/dashboard/attendance/student-scanner"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-black text-white shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 20px 40px -10px rgba(79,70,229,0.5)' }}>
          <FiMonitor size={18} />Open Student Scanner →
        </a>
        <p className="text-xs text-gray-400 mt-3">Make sure ZK9500 is plugged in and bridge is running before opening</p>
      </div>
    </div>
  );
}
