import { useReducer, useCallback, useRef } from 'react';
import { JellyfinItem } from './useJellyFinLibrary';

export interface QueueTrack extends JellyfinItem {
  queueId: string;
}

type State = {
  queue: QueueTrack[];
  currentIndex: number;
  history: QueueTrack[];
};

type Action =
  | { type: 'SET_QUEUE'; queue: QueueTrack[]; index?: number }
  | { type: 'ADD_END'; items: QueueTrack[] }
  | { type: 'INSERT_AFTER_CURRENT'; items: QueueTrack[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'NEXT' }
  | { type: 'PREV' };

function wrap(item: JellyfinItem): QueueTrack {
  return {
    ...item,
    queueId: `${item.Id}-${crypto.randomUUID()}`,
  };
}

const initialState: State = {
  queue: [],
  currentIndex: -1,
  history: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {

    case 'SET_QUEUE':
      return {
        queue: action.queue,
        currentIndex: action.index ?? 0,
        history: [],
      };

    case 'ADD_END':
      return {
        ...state,
        queue: [...state.queue, ...action.items],
      };

    case 'INSERT_AFTER_CURRENT': {
      const insertAt =
        state.currentIndex < 0 ? state.queue.length : state.currentIndex + 1;

      const queue = [
        ...state.queue.slice(0, insertAt),
        ...action.items,
        ...state.queue.slice(insertAt),
      ];

      return { ...state, queue };
    }

    case 'MOVE': {
      const { from, to } = action;
      if (from === to) return state;

      const queue = [...state.queue];
      const [moved] = queue.splice(from, 1);

      const insertAt = from < to ? to - 1 : to;
      queue.splice(insertAt, 0, moved);

      let currentIndex = state.currentIndex;

      if (from === currentIndex) currentIndex = insertAt;
      else if (from < currentIndex && insertAt >= currentIndex) currentIndex--;
      else if (from > currentIndex && insertAt <= currentIndex) currentIndex++;

      return { ...state, queue, currentIndex };
    }

    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: Math.max(0, Math.min(action.index, state.queue.length - 1)),
      };

    case 'NEXT': {
      const next = state.currentIndex + 1;
      if (next >= state.queue.length) return state;

      return {
        ...state,
        history: [...state.history, state.queue[state.currentIndex]],
        currentIndex: next,
      };
    }

    case 'PREV': {
      if (state.currentIndex <= 0) return state;

      return {
        ...state,
        currentIndex: state.currentIndex - 1,
        history: state.history.slice(0, -1),
      };
    }

    case 'REMOVE': {
      const idx = state.queue.findIndex(t => t.queueId === action.id);
      if (idx === -1) return state;

      const queue = state.queue.filter(t => t.queueId !== action.id);

      let currentIndex = state.currentIndex;

      if (idx < currentIndex) currentIndex--;
      if (idx === currentIndex) {
        currentIndex = Math.min(currentIndex, queue.length - 1);
      }

      return {
        ...state,
        queue,
        currentIndex: queue.length === 0 ? -1 : currentIndex,
      };
    }

    case 'CLEAR':
      return initialState;

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

  const queueRef = useRef(state.queue);
  const indexRef = useRef(state.currentIndex);

  queueRef.current = state.queue;
  indexRef.current = state.currentIndex;

  const emit = useCallback((track: QueueTrack | null) => {
    onTrackChange?.(track);
  }, [onTrackChange]);

  // ─────────────────────────────────────────
  // PLAY FUNCTIONS
  // ─────────────────────────────────────────

  const playIndex = useCallback(async (index: number) => {
    const clamped = Math.max(0, Math.min(index, queueRef.current.length - 1));
    const track = queueRef.current[clamped];
    if (!track) return;

    dispatch({ type: 'SET_INDEX', index: clamped });

    emit(track);
    await playInBrowser(track.Id);
  }, [playInBrowser, emit]);

  const playFirst = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    await playIndex(0);
  }, [playIndex]);

  const playNext = useCallback(async () => {
    const next = indexRef.current + 1;
    const track = queueRef.current[next];
    if (!track) return;

    dispatch({ type: 'NEXT' });
    await playInBrowser(track.Id);
  }, [playInBrowser]);

  const playPrev = useCallback(async () => {
    const prev = indexRef.current - 1;
    const track = queueRef.current[prev];
    if (!track) return;

    dispatch({ type: 'PREV' });

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

  // ─────────────────────────────────────────
  // QUEUE OPERATIONS
  // ─────────────────────────────────────────

  const addToQueue = useCallback((item: JellyfinItem) => {
    dispatch({ type: 'ADD_END', items: [wrap(item)] });
  }, []);

  const addManyToQueue = useCallback((items: JellyfinItem[]) => {
    dispatch({ type: 'ADD_END', items: items.map(wrap) });
  }, []);

  const addNext = useCallback((items: JellyfinItem[]) => {
    dispatch({
      type: 'INSERT_AFTER_CURRENT',
      items: items.map(wrap),
    });
  }, []);

  const removeFromQueue = useCallback((queueId: string) => {
    dispatch({ type: 'REMOVE', id: queueId });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    onStop?.();
  }, [onStop]);

  const move = useCallback((from: number, to: number) => {
    dispatch({ type: 'MOVE', from, to });
  }, []);

  return {
    // state
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentTrack: state.queue[state.currentIndex] ?? null,

    // queue ops
    addToQueue,
    addManyToQueue,
    addNext,
    removeFromQueue,
    clearQueue,
    move,

    // playback
    playNow,
    playNext,
    playPrev,
    playIndex,
    playFirst,
  };
}