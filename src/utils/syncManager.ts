import { InventoryItem } from '../types/inventory';

export interface PendingSyncAction {
  id: string;
  timestamp: string;
  area: string;
  items: InventoryItem[];
}

type SyncListener = (state: {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncMessage: string | null;
}) => void;

const SYNC_QUEUE_KEY = 'inventario_offline_sync_queue';
const listeners = new Set<SyncListener>();

let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSyncingState = false;
let lastSyncMsg: string | null = null;

function notifyListeners() {
  const pending = getPendingQueue().length;
  listeners.forEach((listener) => {
    listener({
      isOnline: isOnlineState,
      pendingCount: pending,
      isSyncing: isSyncingState,
      lastSyncMessage: lastSyncMsg,
    });
  });
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({
    isOnline: isOnlineState,
    pendingCount: getPendingQueue().length,
    isSyncing: isSyncingState,
    lastSyncMessage: lastSyncMsg,
  });
  return () => {
    listeners.delete(listener);
  };
}

export function getPendingQueue(): PendingSyncAction[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(queue: PendingSyncAction[]) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Could not save sync queue:', err);
  }
}

/**
 * Save area items with automatic offline queuing and instant retry when online
 */
export async function queueOrSaveSession(
  areaName: string,
  items: InventoryItem[]
): Promise<boolean> {
  const cleanName = areaName.replace(/\s+/g, '_');

  // Always update local storage first (instant local persistence)
  try {
    localStorage.setItem('inventario_' + cleanName, JSON.stringify(items));
    localStorage.setItem('inventario_archivo_activo', cleanName);
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }

  // If online, attempt to sync directly
  if (isOnlineState) {
    try {
      const res = await fetch('/api/guardar_sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cleanName, items }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        lastSyncMsg = `Sincronizado ${cleanName}`;
        notifyListeners();
        return true;
      }
    } catch {
      // Network failed or timed out, fall through to queue
    }
  }

  // If offline or network call failed, enqueue for background sync
  const queue = getPendingQueue();
  const existingIdx = queue.findIndex((q) => q.area === cleanName);
  const action: PendingSyncAction = {
    id: `${cleanName}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    area: cleanName,
    items,
  };

  if (existingIdx !== -1) {
    queue[existingIdx] = action;
  } else {
    queue.push(action);
  }

  savePendingQueue(queue);
  lastSyncMsg = `Guardado local (Pendiente de sincronizar ${cleanName})`;
  notifyListeners();
  return false;
}

/**
 * Delete an entire area session locally and from backend server
 */
export async function deleteAreaSession(areaName: string): Promise<boolean> {
  const cleanName = areaName.replace(/\s+/g, '_');

  // Purge local storage and sync queue
  try {
    localStorage.removeItem('inventario_' + cleanName);
    const queue = getPendingQueue().filter((q) => q.area !== cleanName);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('LocalStorage error on delete:', err);
  }

  if (isOnlineState) {
    try {
      const res = await fetch('/api/eliminar_area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: cleanName }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        lastSyncMsg = `Área eliminada: ${cleanName}`;
        notifyListeners();
        return true;
      }
    } catch {
      // Offline or backend offline
    }
  }

  notifyListeners();
  return false;
}

/**
 * Process all queued offline changes when network is restored
 */
export async function flushSyncQueue(): Promise<number> {
  const queue = getPendingQueue();
  if (queue.length === 0) return 0;

  isSyncingState = true;
  notifyListeners();

  let syncedCount = 0;
  const remainingQueue: PendingSyncAction[] = [];

  for (const item of queue) {
    try {
      const res = await fetch('/api/guardar_sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: item.area, items: item.items }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        syncedCount++;
      } else {
        remainingQueue.push(item);
      }
    } catch {
      remainingQueue.push(item);
    }
  }

  savePendingQueue(remainingQueue);
  isSyncingState = false;

  if (syncedCount > 0) {
    lastSyncMsg = `Sincronizados ${syncedCount} cambios pendientes`;
  }
  notifyListeners();

  return syncedCount;
}

// Initialize global event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnlineState = true;
    notifyListeners();
    flushSyncQueue();
  });

  window.addEventListener('offline', () => {
    isOnlineState = false;
    notifyListeners();
  });

  // Periodic heartbeat / sync check every 15 seconds
  setInterval(() => {
    if (navigator.onLine && getPendingQueue().length > 0) {
      flushSyncQueue();
    }
  }, 15000);
}
