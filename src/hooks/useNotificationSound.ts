'use client';
import { useCallback, useRef } from 'react';

type SoundType = 'alert' | 'success' | 'urgent' | 'info';

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = useCallback((
    frequencies: number[],
    durations: number[],
    volumes: number[],
    type: OscillatorType = 'sine'
  ) => {
    try {
      const ctx = getCtx();
      let time = ctx.currentTime;
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(volumes[i] || 0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (durations[i] || 0.3));
        osc.start(time);
        osc.stop(time + (durations[i] || 0.3));
        time += durations[i] || 0.3;
      });
    } catch { /* audio not supported */ }
  }, []);

  const play = useCallback((type: SoundType) => {
    switch (type) {
      // 🔴 URGENT — Stores issue request needing Bursar/Principal action
      // Loud 3-beep alarm sound
      case 'urgent':
        playTone(
          [880, 0, 880, 0, 880],
          [0.25, 0.08, 0.25, 0.08, 0.45],
          [0.9,  0,    0.9,  0,    0.9],
          'square'
        );
        break;

      // 🟡 ALERT — General alert (low stock, pending approval)
      // Two-tone chime
      case 'alert':
        playTone(
          [660, 550],
          [0.3, 0.5],
          [0.7, 0.6],
          'sine'
        );
        break;

      // 🟢 SUCCESS — Fee paid, approval granted
      // Pleasant ascending chime
      case 'success':
        playTone(
          [523, 659, 784],
          [0.15, 0.15, 0.4],
          [0.5, 0.5, 0.5],
          'sine'
        );
        break;

      // 🔵 INFO — General info notification
      // Single soft ding
      case 'info':
      default:
        playTone(
          [440, 550],
          [0.15, 0.35],
          [0.4, 0.35],
          'sine'
        );
        break;
    }
  }, [playTone]);

  return { play };
}
