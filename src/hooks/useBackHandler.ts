import { useEffect, useRef } from 'react';

interface BackLayer {
  id: string;
  onBack: () => void;
}

const backStack: BackLayer[] = [];
let idSeq = 0;
let currentHistoryDepth = 0;
let pendingGo = false;
let reconcileScheduled = false;
let listenerAttached = false;

function getDepthFromState(state: unknown): number {
  if (state && typeof state === 'object' && '__dpmyDepth' in state) {
    const val = Number((state as { __dpmyDepth?: unknown }).__dpmyDepth);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }
  return 0;
}

function scheduleReconcile() {
  if (reconcileScheduled || typeof window === 'undefined') return;
  reconcileScheduled = true;
  queueMicrotask(() => {
    reconcileScheduled = false;
    reconcileHistory();
  });
}

function reconcileHistory() {
  if (typeof window === 'undefined' || pendingGo) return;

  const targetDepth = backStack.length;

  if (targetDepth > currentHistoryDepth) {
    while (currentHistoryDepth < targetDepth) {
      currentHistoryDepth += 1;
      const baseState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.pushState(
        { ...baseState, __dpmyDepth: currentHistoryDepth },
        ''
      );
    }
  } else if (targetDepth < currentHistoryDepth) {
    const delta = currentHistoryDepth - targetDepth;
    pendingGo = true;
    currentHistoryDepth = targetDepth;
    window.history.go(-delta);
  }
}

function ensurePopStateListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;

  currentHistoryDepth = getDepthFromState(window.history.state);

  window.addEventListener('popstate', (event) => {
    const actualDepth = getDepthFromState(event.state);

    if (pendingGo) {
      pendingGo = false;
      currentHistoryDepth = actualDepth;
      scheduleReconcile();
      return;
    }

    if (actualDepth < currentHistoryDepth) {
      const stepsToPop = currentHistoryDepth - actualDepth;
      currentHistoryDepth = actualDepth;

      for (let i = 0; i < stepsToPop; i += 1) {
        const top = backStack.pop();
        if (top) {
          try {
            top.onBack();
          } catch {}
        }
      }
      scheduleReconcile();
    } else {
      currentHistoryDepth = actualDepth;
      scheduleReconcile();
    }
  });
}

/**
 * Registers a modal or sub-view on the browser history stack so pressing the
 * browser/mobile "Back" ("Volver") button closes this layer / returns toward
 * the main page instead of exiting the application.
 */
export function useBackHandler(isActive: boolean, onBack: () => void, debugName = 'layer') {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    ensurePopStateListener();
    const layerId = `${debugName}-${++idSeq}`;
    backStack.push({
      id: layerId,
      onBack: () => onBackRef.current(),
    });
    scheduleReconcile();

    return () => {
      const idx = backStack.findIndex((item) => item.id === layerId);
      if (idx !== -1) {
        backStack.splice(idx, 1);
        scheduleReconcile();
      }
    };
  }, [isActive, debugName]);
}
