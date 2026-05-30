'use client';
import { useEffect, useRef, useCallback } from 'react';

interface DrumProps {
  count: number;
  value: number;
  onChange: (v: number) => void;
  pad?: boolean;
}

function Drum({ count, value, onChange, pad = true }: DrumProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const state = useRef({ dragging: false, startY: 0, baseOffset: 0, velocity: 0, lastY: 0, lastT: 0 });

  const ITEM_H = 44;
  const OFFSET = 48;

  const items = Array.from({ length: count }, (_, i) =>
    pad ? String(i).padStart(2, '0') : String(i)
  );

  const getOffset = (idx: number) => -(idx * ITEM_H) + OFFSET;

  const snapTo = useCallback((idx: number, vel = 0) => {
    const el = innerRef.current;
    if (!el) return;
    const clamped = ((idx % count) + count) % count;
    el.style.transition = `transform ${Math.min(0.4, 0.15 + Math.abs(vel) * 0.002)}s cubic-bezier(.23,1,.32,1)`;
    el.style.transform = `translateY(${getOffset(clamped)}px)`;
    el.querySelectorAll<HTMLDivElement>('.tp-item').forEach((n, i) =>
      n.classList.toggle('active', i === clamped)
    );
    onChange(clamped);
  }, [count, onChange]);

  useEffect(() => { snapTo(value, 0); }, [value]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onStart = (y: number) => {
      const mat = new DOMMatrix(getComputedStyle(innerRef.current!).transform);
      state.current = { dragging: true, startY: y, baseOffset: mat.m42, velocity: 0, lastY: y, lastT: Date.now() };
    };
    const onMove = (y: number) => {
      if (!state.current.dragging) return;
      const { startY, baseOffset, lastY, lastT } = state.current;
      const now = Date.now(); const dt = now - lastT;
      state.current.velocity = dt > 0 ? (y - lastY) / dt : 0;
      state.current.lastY = y; state.current.lastT = now;
      const el = innerRef.current!;
      el.style.transition = 'none';
      el.style.transform = `translateY(${baseOffset + y - startY}px)`;
    };
    const onEnd = () => {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      const mat = new DOMMatrix(getComputedStyle(innerRef.current!).transform);
      const projected = mat.m42 + state.current.velocity * 120;
      snapTo(Math.round((-projected + OFFSET) / ITEM_H), state.current.velocity * 1000);
    };

    const onMD = (e: MouseEvent) => { e.preventDefault(); onStart(e.clientY); };
    const onMM = (e: MouseEvent) => onMove(e.clientY);
    const onTS = (e: TouchEvent) => { e.preventDefault(); onStart(e.touches[0].clientY); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mat = new DOMMatrix(getComputedStyle(innerRef.current!).transform);
      snapTo(Math.round((-mat.m42 + OFFSET) / ITEM_H) + (e.deltaY > 0 ? 1 : -1));
    };

    wrap.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onEnd);
    wrap.addEventListener('touchstart', onTS, { passive: false });
    wrap.addEventListener('touchmove', onTM, { passive: false });
    wrap.addEventListener('touchend', onEnd);
    wrap.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      wrap.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onEnd);
      wrap.removeEventListener('touchstart', onTS);
      wrap.removeEventListener('touchmove', onTM);
      wrap.removeEventListener('touchend', onEnd);
      wrap.removeEventListener('wheel', onWheel);
    };
  }, [snapTo]);

  return (
    <div ref={wrapRef} className="tp-drum-wrap">
      <div className="tp-highlight" />
      <div className="tp-fade-top" />
      <div className="tp-fade-bot" />
      <div ref={innerRef} className="tp-drum">
        {items.map((v, i) => (
          <div key={i} className="tp-item">{v}</div>
        ))}
      </div>
    </div>
  );
}

interface TimePickerProps {
  hour: number;
  minute: number;
  second?: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onSecondChange?: (s: number) => void;
}

export function TimePicker({ hour, minute, second, onHourChange, onMinuteChange, onSecondChange }: TimePickerProps) {
  return (
    <div className="tp-wrap">
      <Drum count={24} value={hour} onChange={onHourChange} />
      <span className="tp-sep">:</span>
      <Drum count={60} value={minute} onChange={onMinuteChange} />
      {onSecondChange !== undefined && second !== undefined && (
        <>
          <span className="tp-sep">:</span>
          <Drum count={60} value={second} onChange={onSecondChange} />
        </>
      )}
    </div>
  );
}