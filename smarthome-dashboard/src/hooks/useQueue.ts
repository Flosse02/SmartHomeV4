import { useState, useCallback, useRef } from 'react';
import { JellyfinItem } from './useJellyFinLibrary';

export interface QueueTrack extends JellyfinItem {
  queueId: string; // unique per queue entry
}

export function useQueue(
  playInBrowser: (itemId: string) => Promise<void>,
  onTrackChange?: (item: QueueTrack) => void,
) {
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const currentIndexRef = useRef(-1);

  const wrap = (item: JellyfinItem): QueueTrack => ({
    ...item,
    queueId: `${item.Id}-${Date.now()}-${Math.random()}`,
  });

  // ── Mutators ──────────────────────────────────────────────────────────────
  const addToQueue = useCallback((item: JellyfinItem) => {
    setQueue(q => [...q, wrap(item)]);
  }, []);

  const addManyToQueue = useCallback((items: any[]) => {
    setQueue(q => [
      ...q,
      ...items.map((item: any) =>
        item.queueId ? item : wrap(item)
      ),
    ]);
  }, []);

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue(q => {
      const idx = q.findIndex(t => t.queueId === queueId);
      const next = q.filter(t => t.queueId !== queueId);
      // adjust currentIndex if needed
      if (idx <= currentIndexRef.current) {
        const newIdx = Math.max(-1, currentIndexRef.current - 1);
        currentIndexRef.current = newIdx;
        setCurrentIndex(newIdx);
      }
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue(q => {
      const copy = [...q];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setCurrentIndex(-1);
    currentIndexRef.current = -1;
  }, []);

  const moveUp = useCallback((queueId: string) => {
    setQueue(q => {
      const idx = q.findIndex(t => t.queueId === queueId);
      if (idx <= 0) return q;
      const copy = [...q];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }, []);

  const moveDown = useCallback((queueId: string) => {
    setQueue(q => {
      const idx = q.findIndex(t => t.queueId === queueId);
      if (idx === -1 || idx >= q.length - 1) return q;
      const copy = [...q];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────
  const playIndex = useCallback(async (idx: number, currentQueue?: QueueTrack[]) => {
    const q = currentQueue ?? queue;
    if (idx < 0 || idx >= q.length) return;
    currentIndexRef.current = idx;
    setCurrentIndex(idx);
    await playInBrowser(q[idx].Id);
    onTrackChange?.(q[idx]);
  }, [queue, playInBrowser, onTrackChange]);

  const playNext = useCallback(async () => {
    const next = currentIndexRef.current + 1;

    if (next < queue.length) {
      await playIndex(next);
    }
  }, [playIndex, queue.length]);

  const playPrev = useCallback(async () => {
    const prev = currentIndexRef.current - 1;

    if (prev >= 0) {
      await playIndex(prev);
    }
  }, [playIndex]);

  const playNow = useCallback(async (item: JellyfinItem) => {
    const track = wrap(item);
    setQueue(q => {
      const next = [track, ...q.slice(currentIndexRef.current + 1)];
      const newQueue = [...q.slice(0, currentIndexRef.current + 1), ...next];
      const newIdx = currentIndexRef.current + 1;
      currentIndexRef.current = newIdx;
      setCurrentIndex(newIdx);
      playInBrowser(track.Id);
      return newQueue;
    });
  }, [playInBrowser]);

  return {
    queue,
    currentIndex,
    addToQueue,
    addManyToQueue,
    removeFromQueue,
    clearQueue,
    shuffleQueue,
    moveUp,
    moveDown,
    playIndex,
    playNext,
    playPrev,
    playNow,
  };
}