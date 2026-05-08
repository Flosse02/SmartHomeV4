import { useReducer, useCallback, useRef } from 'react';
import { JellyfinItem } from './useJellyFinLibrary';

export interface QueueTrack extends JellyfinItem {
  queueId: string;
}

type State = {
  queue: QueueTrack[];
  currentIndex: number;
};

type Action =
  | { type: 'SET_QUEUE'; queue: QueueTrack[]; index?: number }
  | { type: 'ADD_END'; items: QueueTrack[] }
  | { type: 'INSERT_AFTER_CURRENT'; items: QueueTrack[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'SET_INDEX'; index: number };

function wrap(item: JellyfinItem): QueueTrack {
  return {
    ...item,
    queueId: `${item.Id}-${crypto.randomUUID()}`,
  };
}

const initialState: State = {
  queue: [],
  currentIndex: -1,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {

    case 'SET_QUEUE':
      return {
        queue: action.queue,
        currentIndex: action.index ?? -1,
      };

    case 'ADD_END':
      return {
        ...state,
        queue: [...state.queue, ...action.items],
      };

    case 'INSERT_AFTER_CURRENT': {
      const insertAt =
        state.currentIndex < 0
          ? state.queue.length
          : state.currentIndex + 1;

      const newQueue = [
        ...state.queue.slice(0, insertAt),
        ...action.items,
        ...state.queue.slice(insertAt),
      ];

      return {
        queue: newQueue,
        currentIndex: state.currentIndex,
      };
    }

    case 'REMOVE': {
      const idx = state.queue.findIndex(t => t.queueId === action.id);
      if (idx === -1) return state;

      const newQueue = state.queue.filter(t => t.queueId !== action.id);

      let newIndex = state.currentIndex;

      if (idx < state.currentIndex) newIndex--;
      if (idx === state.currentIndex) newIndex = Math.max(0, newIndex - 1);

      if (newQueue.length === 0) newIndex = -1;

      return {
        queue: newQueue,
        currentIndex: newIndex,
      };
    }

    case 'CLEAR':
      return initialState;

    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: Math.max(0, Math.min(action.index, state.queue.length - 1)),
      };

    default:
      return state;
  }
}

export function useQueue(
  playInBrowser: (id: string) => Promise<void>,
  onTrackChange?: (item: QueueTrack | null) => void,
  onStop?: () => void,

) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // prevents stale queue access inside async callbacks
  const queueRef = useRef(state.queue);
  const indexRef = useRef(state.currentIndex);

  queueRef.current = state.queue;
  indexRef.current = state.currentIndex;

  const emit = useCallback((track: QueueTrack | null) => {
    onTrackChange?.(track);
  }, [onTrackChange]);

  // ── PLAY ───────────────────────────────

  const playIndex = useCallback(async (index: number) => {
    const clamped = Math.max(0, Math.min(index, queueRef.current.length - 1));
    const track = queueRef.current[clamped];

    if (!track) return;

    dispatch({ type: 'SET_INDEX', index: clamped });

    emit(track);
    await playInBrowser(track.Id);
  }, [playInBrowser, emit]);

  const playNext = useCallback(async () => {
    const next = indexRef.current + 1;
    const track = queueRef.current[next];

    if (!track) return;

    dispatch({ type: 'SET_INDEX', index: next });

    emit(track);
    await playInBrowser(track.Id);
  }, [playInBrowser, emit]);

  const playPrev = useCallback(async () => {
    const prev = indexRef.current - 1;
    const track = queueRef.current[prev];

    if (!track) return;

    dispatch({ type: 'SET_INDEX', index: prev });

    emit(track);
    await playInBrowser(track.Id);
  }, [playInBrowser, emit]);

  const playNow = useCallback(async (item: JellyfinItem) => {
    const track = wrap(item);

    dispatch({
      type: 'SET_QUEUE',
      queue: [...queueRef.current, track],
      index: queueRef.current.length,
    });

    emit(track);
    await playInBrowser(track.Id);
  }, [playInBrowser, emit]);

  // ── QUEUE OPS ──────────────────────────

  const addToQueue = useCallback((item: JellyfinItem) => {
    dispatch({ type: 'ADD_END', items: [wrap(item)] });
  }, []);

  const addManyToQueue = useCallback((items: JellyfinItem[]) => {
    dispatch({ type: 'ADD_END', items: items.map(wrap) });
  }, []);

  // ✅ THIS is your fixed "play next / add to front of queue"
  const addNext = useCallback((items: JellyfinItem[]) => {
    dispatch({
      type: 'INSERT_AFTER_CURRENT',
      items: items.map(wrap),
    });
  }, []);

  const removeFromQueue = useCallback((queueId: string) => {
    const queue = queueRef.current;
    const currentIndex = indexRef.current;

    const idx = queue.findIndex(t => t.queueId === queueId);
    if (idx === -1) return;

    const newQueue = queue.filter(t => t.queueId !== queueId);

    let newIndex = currentIndex;

    const removedCurrent = idx === currentIndex;

    if (idx < currentIndex) newIndex--;
    if (idx === currentIndex) newIndex = currentIndex; // will adjust below

    if (newQueue.length === 0) {
      dispatch({ type: 'SET_QUEUE', queue: [], index: -1 });
      return;
    }

    // clamp index
    newIndex = Math.max(0, Math.min(newIndex, newQueue.length - 1));

    dispatch({
      type: 'SET_QUEUE',
      queue: newQueue,
      index: newIndex,
    });

    // 🔥 KEY FIX: auto-advance if we deleted current
    if (removedCurrent) {
      const nextTrack = newQueue[newIndex];
      if (nextTrack) {
        playInBrowser(nextTrack.Id).catch(() => {});
      }
    }
  }, [playInBrowser]);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    onStop?.();
  }, [onStop]);

  const playFirst = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    await playIndex(0);
  }, [playIndex]);

  return {
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentTrack: state.queue[state.currentIndex] ?? null,

    addToQueue,
    addManyToQueue,
    addNext,
    removeFromQueue,
    clearQueue,

    playNow,
    playNext,
    playPrev,
    playIndex,
    playFirst,
  };
}