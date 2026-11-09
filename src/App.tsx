/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, ScanMode, AuditResult, MermaRecord, MovementRecord } from './types/inventory';
import {
  cleanNum,
  cleanCode,
  formatDateTime,
  calculateTotal,
  calculatePiecesPerBundle,
  aggregateGlobalInventory,
  auditProduct,
  filterInventory,
  sortInventoryItems,
  applyMermaApprovalDeduction,
  syncExpiringProductsArea,
  syncItemAcrossAllAreas,
  SortOption,
} from './utils/inventoryLogic';
import { playLaserBeep, triggerHaptic } from './utils/audio';
import { exportInventory } from './utils/export';
import { queueOrSaveSession, subscribeSyncState, flushSyncQueue, deleteAreaSession } from './utils/syncManager';
import { Navbar } from './components/Navbar';
import { CameraScanner } from './components/CameraScanner';
import { InventoryForm } from './components/InventoryForm';
import { InventoryTable } from './components/InventoryTable';
import { AuditModal } from './components/AuditModal';
import { AreasModal } from './components/AreasModal';
import { ImportModal } from './components/ImportModal';
import { TermuxModal } from './components/TermuxModal';
import { EditItemModal } from './components/EditItemModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Dashboard } from './components/Dashboard';
import { LookupModal } from './components/LookupModal';
import { AndroidNotificationShade } from './components/AndroidNotificationShade';
import { LeftSidebarDrawer } from './components/LeftSidebarDrawer';
import { RightSidebarDrawer } from './components/RightSidebarDrawer';
import { WifiOff, CloudUpload, Bell, Sparkles, AlertTriangle } from 'lucide-react';

const DEFAULT_AREAS = ['Inventario_General', 'Hogar', 'Fiesta', 'Ferreteria', 'Productos_a_Caducar'];

// Load cached form draft if available
function getInitialFormDraft() {
  try {
    const raw = localStorage.getItem('inventario_form_draft');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const initialDraft = useMemo(() => getInitialFormDraft(), []);

  // Offline sync & network states
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Active Area and Areas List
  const [activeArea, setActiveArea] = useState<string>(() => {
    return localStorage.getItem('inventario_archivo_activo') || 'Inventario_General';
  });

  const [areasList, setAreasList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('inventario_lista_archivos');
      const list = saved ? JSON.parse(saved) : DEFAULT_AREAS;
      if (!list.includes('Inventario_General')) list.unshift('Inventario_General');
      if (!list.includes('Productos_a_Caducar')) list.push('Productos_a_Caducar');
      return list;
    } catch {
      return DEFAULT_AREAS;
    }
  });

  // State: Pure clean inventory items mapped by Area Key
  const [allAreaItems, setAllAreaItems] = useState<Record<string, InventoryItem[]>>(() => {
    const data: Record<string, InventoryItem[]> = {};

    let currentAreas: string[] = DEFAULT_AREAS;
    try {
      const saved = localStorage.getItem('inventario_lista_archivos');
      if (saved) currentAreas = JSON.parse(saved);
    } catch {
      currentAreas = DEFAULT_AREAS;
    }
    if (!currentAreas.includes('Inventario_General')) currentAreas.unshift('Inventario_General');

    currentAreas.forEach((area) => {
      try {
        const key = 'inventario_' + area;
        const saved = localStorage.getItem(key);
        data[area] = saved ? JSON.parse(saved) : [];
      } catch {
        data[area] = [];
      }
    });

    return data;
  });

  // Backend connection status (Termux or local Node Express)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Form states hydrated from cache
  const [mode, setMode] = useState<ScanMode>(initialDraft?.mode || 'entrada');
  const [sku, setSku] = useState<string>(initialDraft?.sku || '');
  const [nombre, setNombre] = useState<string>(initialDraft?.nombre || '');
  const [bultos, setBultos] = useState<number>(initialDraft?.bultos || 0);
  const [piezas, setPiezas] = useState<number>(initialDraft?.piezas || 0);
  const [showCaducidad, setShowCaducidad] = useState<boolean>(initialDraft?.showCaducidad || false);
  const [caducidad, setCaducidad] = useState<string>(initialDraft?.caducidad || '');
  const [showPrecio, setShowPrecio] = useState<boolean>(initialDraft?.showPrecio || false);
  const [precio, setPrecio] = useState<number>(initialDraft?.precio || 0);
  const [cachedPiecesRatio, setCachedPiecesRatio] = useState<number>(1);
  const [imagen, setImagen] = useState<string | undefined>(initialDraft?.imagen || undefined);

  // New features: Caja Mixta and Quick Scan Mode
  const [showCajaMixta, setShowCajaMixta] = useState<boolean>(initialDraft?.showCajaMixta || false);
  const [cajaMixtaSubItems, setCajaMixtaSubItems] = useState<{ codigo: string; nombre: string; piezas: number }[]>(
    initialDraft?.cajaMixtaSubItems || []
  );
  const [quickScanMode, setQuickScanMode] = useState<boolean>(initialDraft?.quickScanMode || false);
  const [showExpirationBanner, setShowExpirationBanner] = useState<boolean>(true);

  // Search & Sort filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('defecto');

  // Scanner status
  const [isScannerPaused, setIsScannerPaused] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannerFeedback, setScannerFeedback] = useState<'success' | 'error' | null>(null);

  // Pinned last registered item for high-visibility confirmation
  const [lastRegisteredItem, setLastRegisteredItem] = useState<InventoryItem | null>(null);

  // View Tab & Lookup Modal States
  const [activeTab, setActiveTab] = useState<'operacion' | 'dashboard'>('operacion');
  const [isLookupModalOpen, setIsLookupModalOpen] = useState<boolean>(false);

  // Modals state
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAreasModalOpen, setIsAreasModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isTermuxModalOpen, setIsTermuxModalOpen] = useState<boolean>(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);
  const [isShadeOpen, setIsShadeOpen] = useState<boolean>(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Custom Deletion Confirmation Modal States (Replaces blocked window.confirm)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  // In-app non-blocking toast notifications (Replaces blocked window.alert)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 4000);
  }, []);

  // Subscribe to offline sync manager
  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setIsOnline(state.isOnline);
      setPendingSyncCount(state.pendingCount);
      setIsSyncing(state.isSyncing);
      if (state.lastSyncMessage) {
        setSyncToastMessage(state.lastSyncMessage);
        const timer = setTimeout(() => setSyncToastMessage(null), 3500);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, []);

  // Current items for active area (automatically dynamic for Productos_a_Caducar)
  const currentItems = useMemo(() => {
    if (activeArea === 'Productos_a_Caducar') {
      return syncExpiringProductsArea(allAreaItems, 20);
    }
    return allAreaItems[activeArea] || [];
  }, [allAreaItems, activeArea]);

  // Area KPIs matching Termux layout
  const totalPiezasArea = useMemo(() => {
    return currentItems.reduce((acc, it) => acc + (Number(it.Total) || 0), 0);
  }, [currentItems]);

  const totalValorArea = useMemo(() => {
    return currentItems.reduce((acc, it) => acc + ((Number(it.Precio) || 0) * (Number(it.Total) || 0)), 0);
  }, [currentItems]);

  // Filtered & Sorted items
  const filteredAndSortedItems = useMemo(() => {
    const filtered = filterInventory(currentItems, searchQuery);
    return sortInventoryItems(filtered, sortBy);
  }, [currentItems, searchQuery, sortBy]);

  // Known product names for auto-suggestions
  const knownNames = useMemo(() => {
    const set = new Set<string>();
    Object.values(allAreaItems).forEach((items) => {
      items.forEach((it) => {
        if (it.Nombre && it.Nombre !== 'S/N') {
          set.add(it.Nombre);
        }
      });
    });
    return Array.from(set);
  }, [allAreaItems]);

  // Expiration notifications check with 20 days advance notice
  const expiringItems = useMemo(() => {
    return syncExpiringProductsArea(allAreaItems, 20);
  }, [allAreaItems]);

  // Existing batches / clones for the current SKU
  const existingBatchesForSku = useMemo(() => {
    const clean = cleanCode(sku);
    if (!clean) return [];
    const batches: { caducidad: string; total: number; bultos?: number }[] = [];
    Object.entries(allAreaItems).forEach(([aKey, items]) => {
      if (aKey === 'Productos_a_Caducar') return;
      items.forEach((it) => {
        if (cleanCode(it.Código) === clean) {
          batches.push({
            caducidad: it.Caducidad || 'Sin caducidad',
            total: Number(it.Total) || 0,
            bultos: Number(it.Bultos) || 0,
          });
        }
      });
    });
    return batches;
  }, [sku, allAreaItems]);

  // Save form draft to localStorage whenever form inputs change
  useEffect(() => {
    try {
      const draft = {
        mode,
        sku,
        nombre,
        bultos,
        piezas,
        showCaducidad,
        caducidad,
        showPrecio,
        precio,
        showCajaMixta,
        cajaMixtaSubItems,
        quickScanMode,
        imagen,
      };
      localStorage.setItem('inventario_form_draft', JSON.stringify(draft));
    } catch (err) {
      console.warn('Draft save error:', err);
    }
  }, [
    mode,
    sku,
    nombre,
    bultos,
    piezas,
    showCaducidad,
    caducidad,
    showPrecio,
    precio,
    showCajaMixta,
    cajaMixtaSubItems,
    quickScanMode,
  ]);

  // BeforeUnload protection against accidental page reloads
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedContent =
        sku.trim().length > 0 ||
        nombre.trim().length > 0 ||
        bultos > 0 ||
        piezas > 0 ||
        cajaMixtaSubItems.length > 0;

      if (hasUnsavedContent) {
        e.preventDefault();
        e.returnValue = 'Tienes datos ingresados sin guardar. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sku, nombre, bultos, piezas, cajaMixtaSubItems]);

  // Global Edge Swipe-Right Gesture Handler to open Left Drawer on mobile & touch
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (e.touches[0].clientX <= 28) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        } else if (e.touches[0].clientX >= window.innerWidth - 28) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        } else {
          startX = 0;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX > 0 && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        // Swipe Right from Left Edge
        if (startX <= 28 && deltaX > 20 && deltaY < 40 && !isLeftDrawerOpen) {
          setIsLeftDrawerOpen(true);
          startX = 0;
        }
        // Swipe Left from Right Edge
        else if (startX >= window.innerWidth - 28 && deltaX < -20 && deltaY < 40 && !isRightDrawerOpen) {
          setIsRightDrawerOpen(true);
          startX = 0;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isLeftDrawerOpen]);

  // Synchronize with Termux / Server backend with stable key filtering
  const checkBackendConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/ping', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setIsBackendConnected(true);
        const dataRes = await fetch('/api/cargar_todo');
        if (dataRes.ok) {
          const db = await dataRes.json();
          if (db.archivos) {
            // Read valid stored list of areas as ground truth
            let savedList: string[] = [];
            try {
              const raw = localStorage.getItem('inventario_lista_archivos');
              savedList = raw ? JSON.parse(raw) : DEFAULT_AREAS;
            } catch {
              savedList = DEFAULT_AREAS;
            }
            if (!savedList.includes('Inventario_General')) {
              savedList.unshift('Inventario_General');
            }

            // Merge any areas discovered in the database
            Object.keys(db.archivos).forEach((areaKey) => {
              if (areaKey && !savedList.includes(areaKey)) {
                savedList.push(areaKey);
              }
            });

            // Cleanly filter DB archives to only include valid stored areas
            const loadedArchivos: Record<string, InventoryItem[]> = {};
            savedList.forEach((areaKey) => {
              if (db.archivos[areaKey]) {
                loadedArchivos[areaKey] = db.archivos[areaKey];
                try {
                  localStorage.setItem('inventario_' + areaKey, JSON.stringify(db.archivos[areaKey]));
                } catch {
                  // Ignore localStorage quota limits
                }
              }
            });

            try {
              localStorage.setItem('inventario_lista_archivos', JSON.stringify(savedList));
            } catch {
              // Ignore localStorage quota limits
            }

            setAllAreaItems((prev) => ({
              ...prev,
              ...loadedArchivos,
            }));

            setAreasList(savedList);
          }
        }
        await flushSyncQueue();
      } else {
        setIsBackendConnected(false);
      }
    } catch {
      setIsBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  // Persist items using offline sync manager
  const persistAreaItems = useCallback(
    (areaKey: string, items: InventoryItem[]) => {
      try {
        localStorage.setItem('inventario_lista_archivos', JSON.stringify(areasList));
        queueOrSaveSession(areaKey, items);
      } catch (err) {
        console.warn('Persistence warning:', err);
      }
    },
    [areasList]
  );

  const handleConsolidateGlobal = useCallback(() => {
    setAllAreaItems((prev) => {
      const globalList = aggregateGlobalInventory(prev);
      persistAreaItems('Inventario_General', globalList);
      return {
        ...prev,
        Inventario_General: globalList,
      };
    });
    playLaserBeep('info');
  }, [persistAreaItems]);

  const totalCalculated = useMemo(() => {
    return calculateTotal(bultos, piezas);
  }, [bultos, piezas]);

  // Autofill lookup when SKU changes
  const handleAutofillBySku = useCallback(
    (inputSku: string) => {
      const clean = cleanCode(inputSku);
      if (!clean) return;

      let found: InventoryItem | undefined = currentItems.find((i) => cleanCode(i.Código) === clean);
      if (!found) {
        for (const items of Object.values(allAreaItems)) {
          found = items.find((i) => cleanCode(i.Código) === clean && i.Nombre !== 'S/N');
          if (found) break;
        }
      }

      if (found && found.Nombre && found.Nombre !== 'S/N') {
        setNombre(found.Nombre.toUpperCase());
        const pz = calculatePiecesPerBundle(found);
        setCachedPiecesRatio(pz);
        if (showCaducidad && found.Caducidad) {
          setCaducidad(found.Caducidad);
        }
        if (showPrecio && Number(found.Precio) > 0) {
          setPrecio(Number(found.Precio));
        }
        
        if (found.Imagen) {
          setImagen(found.Imagen);
        }

        if (quickScanMode && mode === 'entrada') {
          setBultos(1);
          setPiezas(pz);
        }
      } else {
        setCachedPiecesRatio(1);
      }
    },
    [currentItems, allAreaItems, showCaducidad, showPrecio, quickScanMode, mode]
  );

  // Handle Barcode Scan from Camera
  const handleScanCode = useCallback(
    (scannedText: string) => {
      if (!scannedText || isScannerPaused) return;
      const clean = cleanCode(scannedText);
      if (clean.length < 2) return;

      setIsScannerPaused(true);
      setLastScannedCode(clean);
      setSku(clean);
      setScannerFeedback('success');

      playLaserBeep('success');
      triggerHaptic('success');

      if (mode === 'consulta') {
        const audit = auditProduct(clean, allAreaItems, activeArea);
        if (audit) {
          setAuditResult(audit);
          setScannerFeedback('success');
        } else {
          setScannerFeedback('error');
          playLaserBeep('alert');
          showToast(`Código ${clean} no encontrado en ninguna sesión.`, 'error');
          setIsScannerPaused(false);
          setTimeout(() => setScannerFeedback(null), 1400);
        }
        return;
      }

      handleAutofillBySku(clean);
    },
    [isScannerPaused, mode, allAreaItems, activeArea, handleAutofillBySku, showToast]
  );

  const handleResumeScan = () => {
    setIsScannerPaused(false);
    setScannerFeedback(null);
    setLastScannedCode(null);
    setSku('');
    setNombre('');
    setBultos(0);
    setPiezas(0);
    setCaducidad('');
    setImagen(undefined);
    setCachedPiecesRatio(1);
    playLaserBeep('info');
  };

  const handleDiscardCode = () => {
    setIsScannerPaused(false);
    setLastScannedCode(null);
    setScannerFeedback('error');
    setSku('');
    setNombre('');
    setBultos(0);
    setPiezas(0);
    setCaducidad('');
    setPrecio(0);
    setImagen(undefined);
    setCachedPiecesRatio(1);
    playLaserBeep('remove');
    triggerHaptic('remove');
    setTimeout(() => setScannerFeedback(null), 1400);
  };

  const handleBultosChange = (val: number) => {
    setBultos(val);
    if (val > 0 && piezas === 0) {
      setPiezas(cachedPiecesRatio || 1);
    }
  };

  const handleSoloPiezas = () => {
    setBultos(0);
    if (piezas === 0) {
      setPiezas(1);
    }
  };

  // Handle Form Submission (Entrada, Salida, or Caja Mixta)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = cleanCode(sku);
    if (!cleanSku) {
      showToast('Por favor ingresa o escanea un código de barras.', 'error');
      return;
    }

    if (mode === 'consulta') {
      const audit = auditProduct(cleanSku, allAreaItems, activeArea);
      if (audit) {
        setAuditResult(audit);
      } else {
        playLaserBeep('remove');
        showToast(`El código ${cleanSku} no existe en ninguna área.`, 'error');
      }
      return;
    }

    const cleanAreaName = activeArea.replace(/_/g, ' ');
    const nowStr = formatDateTime();

    let finalTotal = totalCalculated;
    let finalBultos = bultos;
    let finalNombre = (nombre.trim() || 'S/N').toUpperCase();
    let extraDataRecord: Record<string, any> | undefined = undefined;

    if (showCajaMixta) {
      if (cajaMixtaSubItems.length === 0) {
        showToast('Agrega al menos un sub-item dentro de la Caja Mixta.', 'error');
        return;
      }
      finalBultos = 1;
      finalTotal = cajaMixtaSubItems.reduce((acc, s) => acc + s.piezas, 0);
      finalNombre = `CAJA MIXTA: ${finalNombre !== 'S/N' ? finalNombre : 'MULTIPLE'} (${cajaMixtaSubItems.length} prod)`;
      extraDataRecord = {
        isCajaMixta: true,
        subItems: cajaMixtaSubItems,
      };
    } else if (finalTotal <= 0 && bultos <= 0 && piezas <= 0) {
      showToast('Ingresa una cantidad válida mayor a cero.', 'error');
      return;
    }

    let createdOrUpdatedItem: InventoryItem | null = null;

    setAllAreaItems((prev) => {
      const list = [...(prev[activeArea] || [])];
      const existingIndex = list.findIndex(
        (i) => cleanCode(i.Código) === cleanSku && (i.Caducidad || '') === (caducidad || '')
      );

      if (mode === 'salida') {
        if (existingIndex === -1) {
          playLaserBeep('remove');
          showToast('El producto no existe en esta área para restar.', 'error');
          return prev;
        }

        const existing = list[existingIndex];
        const newBultos = Math.max(0, (Number(existing.Bultos) || 0) - finalBultos);
        const newTotal = Math.max(0, (Number(existing.Total) || 0) - finalTotal);

        list[existingIndex] = {
          ...existing,
          Bultos: newBultos,
          Total: newTotal,
          Fecha_Captura: `${nowStr} (-)`,
        };
        createdOrUpdatedItem = list[existingIndex];
        playLaserBeep('remove');
      } else {
        if (existingIndex !== -1 && !showCajaMixta) {
          const existing = list[existingIndex];
          const newBultos = (Number(existing.Bultos) || 0) + finalBultos;
          const newTotal = (Number(existing.Total) || 0) + finalTotal;

          list[existingIndex] = {
            ...existing,
            Nombre: finalNombre !== 'S/N' ? finalNombre : existing.Nombre,
            Bultos: newBultos,
            Piezas: piezas || existing.Piezas || 1,
            Total: newTotal,
            Precio: precio > 0 ? precio : existing.Precio,
            Fecha_Captura: nowStr,
          };
          createdOrUpdatedItem = list[existingIndex];
        } else {
          const newItem: InventoryItem = {
            Fecha_Captura: nowStr,
            Área: cleanAreaName,
            Código: cleanSku,
            Nombre: finalNombre,
            Caducidad: caducidad,
            Bultos: finalBultos,
            Piezas: showCajaMixta ? finalTotal : (piezas || finalTotal || 1),
            Total: finalTotal,
            Precio: precio,
            Imagen: imagen,
            ...(extraDataRecord ? { _extraData: extraDataRecord } : {}),
          };
          list.unshift(newItem);
          createdOrUpdatedItem = newItem;
        }
        playLaserBeep('success');
      }

      persistAreaItems(activeArea, list);

      // Log movement transaction for Historical Flow LineChart
      try {
        const movItem = createdOrUpdatedItem as InventoryItem | null;
        const mov: MovementRecord = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          type: mode === 'salida' ? 'salida' : 'entrada',
          sku: cleanSku,
          nombre: finalNombre,
          cantidadPiezas: finalTotal,
          cantidadBultos: finalBultos,
          valor: (precio > 0 ? precio : (movItem?.Precio || 0)) * finalTotal,
          area: activeArea,
        };
        const rawMovs = localStorage.getItem('inventario_movement_history');
        const listMovs: MovementRecord[] = rawMovs ? JSON.parse(rawMovs) : [];
        listMovs.unshift(mov);
        localStorage.setItem('inventario_movement_history', JSON.stringify(listMovs.slice(0, 500)));
      } catch {
        // ignore storage errors
      }

      let nextAll = { ...prev, [activeArea]: list };

      // Multi-inventory sync: propagate values to other areas containing this SKU
      if (createdOrUpdatedItem) {
        const itemSync = createdOrUpdatedItem as InventoryItem;
        nextAll = syncItemAcrossAllAreas(
          nextAll,
          cleanSku,
          {
            total: itemSync.Total,
            bultos: itemSync.Bultos,
            piezas: itemSync.Piezas,
            nombre: itemSync.Nombre,
            caducidad: itemSync.Caducidad,
          },
          activeArea
        );
        Object.keys(nextAll).forEach((a) => {
          if (a !== activeArea && a !== 'Inventario_General') {
            persistAreaItems(a, nextAll[a] || []);
          }
        });
      }

      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });

    if (createdOrUpdatedItem) {
      setLastRegisteredItem(createdOrUpdatedItem);
    }

    // Reset Form & INSTANTLY RESUME SCANNER
    setSku('');
    setNombre('');
    setBultos(0);
    setPiezas(0);
    setCaducidad('');
    setPrecio(0);
    setImagen(undefined);
    setCachedPiecesRatio(1);
    setShowCajaMixta(false);
    setCajaMixtaSubItems([]);
    setIsScannerPaused(false);
    setLastScannedCode(null);
    setScannerFeedback(null);
  };

  // Robust Row Handlers
  const handleChangeBultosRowByItem = (itemToUpdate: InventoryItem, delta: number) => {
    setAllAreaItems((prev) => {
      const nextAll = { ...prev };
      const list = [...(nextAll[activeArea] || [])];
      const targetSku = cleanCode(itemToUpdate.Código);

      const index = list.findIndex(
        (i) => cleanCode(i.Código) === targetSku && i.Fecha_Captura === itemToUpdate.Fecha_Captura
      );
      if (index === -1) return prev;

      const item = { ...list[index] };
      const pz = calculatePiecesPerBundle(item);
      const newBultos = (Number(item.Bultos) || 0) + delta;

      if (newBultos <= 0) {
        setItemToDelete(item);
        return prev;
      }

      item.Bultos = newBultos;
      item.Total = Math.max(0, (Number(item.Total) || 0) + delta * pz);
      item.Fecha_Captura = formatDateTime();
      playLaserBeep(delta > 0 ? 'success' : 'remove');

      list[index] = item;
      nextAll[activeArea] = list;
      persistAreaItems(activeArea, list);

      // If acting inside Inventario_General, also update matching item in sub-areas
      if (activeArea === 'Inventario_General') {
        Object.keys(nextAll).forEach((aKey) => {
          if (aKey !== 'Inventario_General') {
            const subList = [...(nextAll[aKey] || [])];
            const subIdx = subList.findIndex((si) => cleanCode(si.Código) === targetSku);
            if (subIdx !== -1) {
              const subItem = { ...subList[subIdx] };
              subItem.Bultos = Math.max(0, (Number(subItem.Bultos) || 0) + delta);
              subItem.Total = Math.max(0, (Number(subItem.Total) || 0) + delta * pz);
              subList[subIdx] = subItem;
              nextAll[aKey] = subList;
              persistAreaItems(aKey, subList);
            }
          }
        });
      }

      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });
  };

  const handleChangePiezasRowByItem = (itemToUpdate: InventoryItem, delta: number) => {
    setAllAreaItems((prev) => {
      const nextAll = { ...prev };
      const list = [...(nextAll[activeArea] || [])];
      const targetSku = cleanCode(itemToUpdate.Código);

      const index = list.findIndex(
        (i) => cleanCode(i.Código) === targetSku && i.Fecha_Captura === itemToUpdate.Fecha_Captura
      );
      if (index === -1) return prev;

      const item = { ...list[index] };
      const newTotal = (Number(item.Total) || 0) + delta;

      if (newTotal <= 0) {
        setItemToDelete(item);
        return prev;
      }

      item.Total = newTotal;
      if ((Number(item.Bultos) || 0) <= 1) {
        item.Bultos = 1;
        item.Piezas = newTotal;
      }
      item.Fecha_Captura = formatDateTime();
      playLaserBeep(delta > 0 ? 'success' : 'remove');

      list[index] = item;
      nextAll[activeArea] = list;
      persistAreaItems(activeArea, list);

      // If acting inside Inventario_General, also update matching item in sub-areas
      if (activeArea === 'Inventario_General') {
        Object.keys(nextAll).forEach((aKey) => {
          if (aKey !== 'Inventario_General') {
            const subList = [...(nextAll[aKey] || [])];
            const subIdx = subList.findIndex((si) => cleanCode(si.Código) === targetSku);
            if (subIdx !== -1) {
              const subItem = { ...subList[subIdx] };
              subItem.Total = Math.max(0, (Number(subItem.Total) || 0) + delta);
              if ((Number(subItem.Bultos) || 0) <= 1) {
                subItem.Bultos = 1;
                subItem.Piezas = subItem.Total;
              }
              subList[subIdx] = subItem;
              nextAll[aKey] = subList;
              persistAreaItems(aKey, subList);
            }
          }
        });
      }

      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });
  };

  // Trigger Custom Confirm Modal for Item Deletion
  const handleDeleteItemRequest = (itemToDeleteReq: InventoryItem) => {
    setItemToDelete(itemToDeleteReq);
  };

  // Execute actual item deletion after user confirms in Custom Confirm Modal
  const executeDeleteItem = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const targetSku = cleanCode(target.Código);
    setItemToDelete(null);

    setAllAreaItems((prev) => {
      const nextAll = { ...prev };

      // Delete from active area
      const list = [...(nextAll[activeArea] || [])];
      let index = list.findIndex(
        (i) => cleanCode(i.Código) === targetSku && i.Fecha_Captura === target.Fecha_Captura
      );
      if (index === -1) {
        index = list.findIndex((i) => cleanCode(i.Código) === targetSku);
      }
      if (index !== -1) {
        list.splice(index, 1);
      }
      nextAll[activeArea] = list;
      persistAreaItems(activeArea, list);

      // If deleting directly from Inventario_General, also delete from all sub-areas
      if (activeArea === 'Inventario_General') {
        Object.keys(nextAll).forEach((aKey) => {
          if (aKey !== 'Inventario_General') {
            const subList = (nextAll[aKey] || []).filter(
              (si) => cleanCode(si.Código) !== targetSku
            );
            nextAll[aKey] = subList;
            persistAreaItems(aKey, subList);
          }
        });
      }

      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });
    playLaserBeep('remove');
  };

  // Trigger Custom Confirm Modal for Area Deletion
  const handleDeleteAreaRequest = (areaName: string) => {
    setAreaToDelete(areaName);
  };

  // Execute actual area deletion after user confirms in Custom Confirm Modal
  const executeDeleteArea = async () => {
    if (!areaToDelete) return;
    const areaName = areaToDelete;
    setAreaToDelete(null);

    if (areaName === 'Inventario_General') return;
    const clean = areaName.trim().replace(/\s+/g, '_');

    // Permanently delete area locally, from offline queue, and from backend server
    await deleteAreaSession(clean);

    const updated = areasList.filter((a) => a !== clean);
    setAreasList(updated);
    localStorage.setItem('inventario_lista_archivos', JSON.stringify(updated));

    setAllAreaItems((prev) => {
      const copy = { ...prev };
      delete copy[clean];
      const updatedGlobal = aggregateGlobalInventory(copy);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...copy,
        Inventario_General: updatedGlobal,
      };
    });

    if (activeArea === clean) {
      handleSelectArea('Inventario_General');
    }
    playLaserBeep('remove');
  };

  const handleSaveEditedRow = (updatedItem: InventoryItem) => {
    if (!editingItem) return;
    const targetSku = cleanCode(editingItem.Código);

    setAllAreaItems((prev) => {
      const nextAll = { ...prev };
      const list = [...(nextAll[activeArea] || [])];
      let index = list.findIndex(
        (i) => cleanCode(i.Código) === targetSku && i.Fecha_Captura === editingItem.Fecha_Captura
      );
      if (index === -1) {
        index = list.findIndex((i) => cleanCode(i.Código) === targetSku);
      }
      if (index !== -1) {
        list[index] = updatedItem;
      }
      nextAll[activeArea] = list;
      persistAreaItems(activeArea, list);

      // If editing in General, also sync updated fields to matching sub-area items
      if (activeArea === 'Inventario_General') {
        Object.keys(nextAll).forEach((aKey) => {
          if (aKey !== 'Inventario_General') {
            const subList = [...(nextAll[aKey] || [])];
            const subIdx = subList.findIndex((si) => cleanCode(si.Código) === targetSku);
            if (subIdx !== -1) {
              subList[subIdx] = {
                ...subList[subIdx],
                Nombre: updatedItem.Nombre,
                Precio: updatedItem.Precio,
                Caducidad: updatedItem.Caducidad,
              };
              nextAll[aKey] = subList;
              persistAreaItems(aKey, subList);
            }
          }
        });
      }

      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });
    playLaserBeep('success');
    setEditingItem(null);
  };

  const handleSelectArea = (areaName: string) => {
    const clean = areaName.trim().replace(/\s+/g, '_');
    setActiveArea(clean);
    localStorage.setItem('inventario_archivo_activo', clean);
    setIsAreasModalOpen(false);
    playLaserBeep('info');
  };

  const handleCreateArea = (areaName: string) => {
    const clean = areaName.trim().replace(/[\/\\?#%]/g, '').replace(/\s+/g, '_');
    if (!clean) return;
    if (!areasList.includes(clean)) {
      const updated = [...areasList, clean];
      setAreasList(updated);
      localStorage.setItem('inventario_lista_archivos', JSON.stringify(updated));
    }
    handleSelectArea(clean);
  };

  const handleLoadDemoData = () => {
    const demoArea = 'Demostracion_Industrial';
    const demoItems: InventoryItem[] = [
      {
        Fecha_Captura: formatDateTime(),
        Área: 'Demostracion Industrial',
        Código: '7501000123456',
        Nombre: 'CAJA ACEITE VEGETAL 12X1L',
        Bultos: 5,
        Piezas: 12,
        Total: 60,
        Precio: 45.0,
        Caducidad: '2027-06-30',
      },
      {
        Fecha_Captura: formatDateTime(),
        Área: 'Demostracion Industrial',
        Código: '7501000654321',
        Nombre: 'DETERGENTE INDUSTRIAL EN POLVO 10KG',
        Bultos: 10,
        Piezas: 1,
        Total: 10,
        Precio: 180.0,
      },
      {
        Fecha_Captura: formatDateTime(),
        Área: 'Demostracion Industrial',
        Código: 'MIX-INDUSTRIAL-01',
        Nombre: 'CAJA MIXTA: SURTIDO ABARROTES (3 prod)',
        Bultos: 1,
        Piezas: 36,
        Total: 36,
        Precio: 320.0,
        _extraData: {
          isCajaMixta: true,
          subItems: [
            { codigo: '750101', nombre: 'GALLETAS CHOCOLATE', piezas: 12 },
            { codigo: '750102', nombre: 'CAFÉ SOLUBLE 200G', piezas: 12 },
            { codigo: '750103', nombre: 'TÉ NEGRO 50 SOBRES', piezas: 12 },
          ],
        },
      },
    ];

    if (!areasList.includes(demoArea)) {
      const updated = [...areasList, demoArea];
      setAreasList(updated);
      localStorage.setItem('inventario_lista_archivos', JSON.stringify(updated));
    }
    setAllAreaItems((prev) => {
      const merged = [...demoItems, ...(prev[demoArea] || [])];
      persistAreaItems(demoArea, merged);
      const nextAll = { ...prev, [demoArea]: merged };
      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });
    handleSelectArea(demoArea);
    playLaserBeep('success');
    showToast('Datos de demostración industrial cargados con éxito.', 'success');
  };

  const handleImportComplete = (items: InventoryItem[], areaName: string, isNewArea: boolean) => {
    const cleanArea = areaName.replace(/\s+/g, '_');

    if (isNewArea && !areasList.includes(cleanArea)) {
      const updatedAreas = [...areasList, cleanArea];
      setAreasList(updatedAreas);
      localStorage.setItem('inventario_lista_archivos', JSON.stringify(updatedAreas));
    }

    setAllAreaItems((prev) => {
      const existing = isNewArea ? [] : prev[cleanArea] || [];
      const merged = [...items, ...existing];
      persistAreaItems(cleanArea, merged);
      const nextAll = { ...prev, [cleanArea]: merged };
      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return {
        ...nextAll,
        Inventario_General: updatedGlobal,
      };
    });

    setActiveArea(cleanArea);
    localStorage.setItem('inventario_archivo_activo', cleanArea);
    playLaserBeep('success');
  };

  const handleUpdateAreaItem = useCallback((areaKey: string, updatedItem: InventoryItem) => {
    setAllAreaItems((prev) => {
      const list = [...(prev[areaKey] || [])];
      const idx = list.findIndex(i => cleanCode(i.Código) === cleanCode(updatedItem.Código) && i.Fecha_Captura === updatedItem.Fecha_Captura);
      if (idx !== -1) {
        list[idx] = updatedItem;
      } else {
        // Try finding by just SKU if timestamp mismatched (fallback)
        const idx2 = list.findIndex(i => cleanCode(i.Código) === cleanCode(updatedItem.Código));
        if (idx2 !== -1) list[idx2] = updatedItem;
      }
      
      const nextAll = { ...prev, [areaKey]: list };
      persistAreaItems(areaKey, list);
      
      // Sync global
      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return { ...nextAll, Inventario_General: updatedGlobal };
    });
  }, [persistAreaItems]);

  const handleDeleteAreaItem = useCallback((areaKey: string, itemToDelete: InventoryItem) => {
     setAllAreaItems((prev) => {
      const list = (prev[areaKey] || []).filter(i => 
        !(cleanCode(i.Código) === cleanCode(itemToDelete.Código) && i.Fecha_Captura === itemToDelete.Fecha_Captura)
      );
      const nextAll = { ...prev, [areaKey]: list };
      persistAreaItems(areaKey, list);
      
      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      return { ...nextAll, Inventario_General: updatedGlobal };
    });
    playLaserBeep('remove');
  }, [persistAreaItems]);

  const handleApproveMerma = useCallback((record: MermaRecord) => {
    const targetSku = cleanCode(record.sku);
    const targetArea = record.area;
    const qtyToSubtract = Number(record.cantidad) || 0;
    const caducidad = record.caducidad;

    setAllAreaItems((prev) => {
      const nextAll = { ...prev };

      // Determine which areas to deduct from
      const areasToUpdate = targetArea && nextAll[targetArea] 
        ? [targetArea] 
        : Object.keys(nextAll).filter(a => a !== 'Productos_a_Caducar' && a !== 'Inventario_General');

      areasToUpdate.forEach((aKey) => {
        const list = nextAll[aKey] || [];
        const updatedList = applyMermaApprovalDeduction(list, {
          sku: targetSku,
          cantidad: qtyToSubtract,
          caducidad,
        });
        nextAll[aKey] = updatedList;
        persistAreaItems(aKey, updatedList);
      });

      // Synchronize across matching areas so inventory values match
      const updatedGlobal = aggregateGlobalInventory(nextAll);
      persistAreaItems('Inventario_General', updatedGlobal);
      nextAll['Inventario_General'] = updatedGlobal;

      return nextAll;
    });

    // Log merma output to movement history for Historical Flow LineChart
    try {
      const mov: MovementRecord = {
        id: `mov_merma_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        type: 'merma',
        sku: targetSku,
        nombre: record.nombre,
        cantidadPiezas: qtyToSubtract,
        cantidadBultos: 1,
        valor: qtyToSubtract * 50,
        area: targetArea || 'General',
        motivo: record.motivo,
      };
      const rawMovs = localStorage.getItem('inventario_movement_history');
      const listMovs: MovementRecord[] = rawMovs ? JSON.parse(rawMovs) : [];
      listMovs.unshift(mov);
      localStorage.setItem('inventario_movement_history', JSON.stringify(listMovs.slice(0, 500)));
    } catch {
      // ignore
    }

    playLaserBeep('success');
    showToast(`Merma aprobada para "${record.nombre}". Cantidades actualizadas y reseteadas a 0 si se agotó.`, 'success');
  }, [persistAreaItems, showToast]);

  const handleManualSave = () => {
    persistAreaItems(activeArea, currentItems);
    if (activeArea !== 'Inventario_General') {
      handleConsolidateGlobal();
    }
    playLaserBeep('success');
    showToast(`Guardado exitoso de "${activeArea.replace(/_/g, ' ')}" con ${currentItems.length} registros.`, 'success');
  };

  const handleLoadAuditToForm = () => {
    if (!auditResult) return;
    setSku(auditResult.sku);
    setNombre(auditResult.nombre.toUpperCase());
    setCachedPiecesRatio(auditResult.piezasPorBulto || 1);
    setBultos(0);
    setPiezas(0);
    setMode('entrada');
    setAuditResult(null);
    playLaserBeep('info');
  };

  const totalGlobalItemsCount = useMemo(() => {
    let count = 0;
    Object.values(allAreaItems).forEach((items) => {
      count += items.length;
    });
    return count;
  }, [allAreaItems]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeArea={activeArea}
        isBackendConnected={isBackendConnected}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        totalItems={currentItems.length}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenLookup={() => setIsLookupModalOpen(true)}
        onOpenAreas={() => setIsAreasModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenTermux={() => setIsTermuxModalOpen(true)}
        onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
        onManualSave={handleManualSave}
        onOpenShade={() => setIsShadeOpen(true)}
        onOpenLeftDrawer={() => setIsLeftDrawerOpen(true)}
        onOpenRightDrawer={() => setIsRightDrawerOpen(true)}
      />

      {/* Sync notification toast */}
      {syncToastMessage && (
        <div className="fixed top-14 right-4 z-50 bg-slate-900 border border-emerald-500/60 shadow-xl rounded-xl px-3 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CloudUpload className="w-4 h-4 text-emerald-400" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-3 py-1.5 text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Modo Offline (Sin Internet): Los datos se guardan en el dispositivo y se sincronizarán al volver la red.</span>
        </div>
      )}

      {/* Expiration Notification Center Banner - Fully Interactive & Redirectable */}
      {expiringItems.length > 0 && showExpirationBanner && (
        <div 
          onClick={() => {
            handleSelectArea('Productos_a_Caducar');
            playLaserBeep('info');
          }}
          className="bg-rose-950/95 border-b border-rose-500/70 hover:bg-rose-900/90 cursor-pointer px-3 py-2.5 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2 shadow-lg transition-all group"
          title="Haz clic para ir directamente al Área Exclusiva de Productos a Caducar"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-600 text-white rounded-xl animate-pulse shadow-md group-hover:scale-105 transition-transform">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-white text-xs uppercase tracking-tight flex items-center gap-1.5">
                <span>⚠️ ALERTA DE CADUCIDAD (20 DÍAS DE AVISO PREVIO)</span>
                <span className="bg-rose-500 text-white font-mono text-[10px] px-2 py-0.5 rounded-full font-black">
                  {expiringItems.length}
                </span>
              </span>
              <p className="text-[11px] text-rose-300/90 leading-tight">
                Hay <strong>{expiringItems.length}</strong> producto(s) por caducar en menos de 20 días o ya vencidos. Haz clic para ver el área exclusiva.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                handleSelectArea('Productos_a_Caducar');
                playLaserBeep('info');
              }}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>🚀 Ir a Área Caducados</span>
            </button>
            <button
              onClick={() => {
                setIsRightDrawerOpen(true);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all"
            >
              <span>Abrir Gestión</span>
            </button>
            <button
              onClick={() => setShowExpirationBanner(false)}
              className="text-rose-400 hover:text-white font-bold p-1 rounded-lg hover:bg-rose-900/50"
              title="Cerrar notificación temporalmente"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Exclusive Area Banner when Productos_a_Caducar is active */}
      {activeArea === 'Productos_a_Caducar' && (
        <div className="bg-amber-950/60 border-b border-amber-500/40 px-3 py-2 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-lg">EXCLUSIVA</span>
            <span>
              <strong>ÁREA EXCLUSIVA: PRODUCTOS A CADUCAR (20 DÍAS)</strong> — Sincronizada automáticamente en tiempo real con todas las bodegas. Los productos se mantienen en sus áreas de origen.
            </span>
          </div>
          <button
            onClick={() => handleSelectArea('Inventario_General')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-bold border border-slate-700 shrink-0"
          >
            Volver a General
          </button>
        </div>
      )}

      {/* Floating In-App Toast Container */}
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`p-3 rounded-xl border shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/50'
                : 'bg-slate-900/95 border-cyan-500 text-cyan-200 shadow-slate-950/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="text-xs font-semibold leading-snug break-words">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-slate-400 hover:text-white shrink-0 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-3">
        {activeTab === 'dashboard' ? (
          <Dashboard allAreaItems={allAreaItems} areasList={areasList} />
        ) : (
          <>
            {/* High-visibility Dual KPI Cards matching Termux layout */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/40 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-md">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-emerald-400">🔢</span> PIEZAS TOTALES
                </span>
                <span className="text-2xl sm:text-4xl font-black text-emerald-400 font-mono mt-1 tracking-tight">
                  {totalPiezasArea.toLocaleString('es-MX')}
                </span>
              </div>

              <div className="bg-slate-900 border-2 border-slate-800 hover:border-amber-500/40 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-md">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-400">💰</span> VALOR ESTIMADO ($)
                </span>
                <span className="text-2xl sm:text-4xl font-black text-white font-mono mt-1 tracking-tight">
                  ${totalValorArea.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Top Grid: Camera Scanner (Left) & Registration Form (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Camera Scanner Viewport */}
              <div className="lg:col-span-5 w-full">
                <CameraScanner
                  onScanCode={handleScanCode}
                  isPaused={isScannerPaused}
                  lastScannedCode={lastScannedCode}
                  onResumeScan={handleResumeScan}
                  onDiscardCode={handleDiscardCode}
                  externalFeedback={scannerFeedback}
                  onNotification={showToast}
                />
              </div>

              {/* Form and Ergonomic Controls */}
              <div className="lg:col-span-7 w-full">
                <InventoryForm
                  mode={mode}
                  onChangeMode={(m) => {
                    setMode(m);
                    playLaserBeep('info');
                  }}
                  sku={sku}
                  onChangeSku={(s) => {
                    const clean = cleanNum(s);
                    setSku(clean);
                    if (clean.length >= 3) {
                      handleAutofillBySku(clean);
                    }
                  }}
                  nombre={nombre}
                  onChangeNombre={setNombre}
                  bultos={bultos}
                  onChangeBultos={handleBultosChange}
                  piezas={piezas}
                  onChangePiezas={setPiezas}
                  totalCalculated={totalCalculated}
                  showCaducidad={showCaducidad}
                  onToggleCaducidad={setShowCaducidad}
                  caducidad={caducidad}
                  onChangeCaducidad={setCaducidad}
                  showPrecio={showPrecio}
                  onTogglePrecio={setShowPrecio}
                  precio={precio}
                  onChangePrecio={setPrecio}
                  showCajaMixta={showCajaMixta}
                  onToggleCajaMixta={setShowCajaMixta}
                  cajaMixtaSubItems={cajaMixtaSubItems}
                  onAddCajaMixtaSubItem={(sub) => setCajaMixtaSubItems((prev) => [...prev, sub])}
                  onRemoveCajaMixtaSubItem={(idx) => setCajaMixtaSubItems((prev) => prev.filter((_, i) => i !== idx))}
                  quickScanMode={quickScanMode}
                  onToggleQuickScanMode={setQuickScanMode}
                  knownNames={knownNames}
                  onSubmit={handleFormSubmit}
                  onSoloPiezas={handleSoloPiezas}
                  imagen={imagen}
                  onChangeImagen={setImagen}
                  existingBatches={existingBatchesForSku}
                />
              </div>
            </div>

            {/* Bottom Section: Table & Realtime Export / Search */}
            <div className="w-full mt-2">
              <InventoryTable
                items={currentItems}
                filteredItems={filteredAndSortedItems}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeArea={activeArea}
                sortBy={sortBy}
                onSortChange={setSortBy}
                lastRegisteredItem={lastRegisteredItem}
                onConsolidate={handleConsolidateGlobal}
                onExport={(type, fmt) => exportInventory(currentItems, activeArea, type, fmt, (err) => showToast(err, 'error'))}
                onEditItem={(item) => setEditingItem(item)}
                onDeleteItem={handleDeleteItemRequest}
                onChangeBultosRow={handleChangeBultosRowByItem}
                onChangePiezasRow={handleChangePiezasRowByItem}
              />
            </div>
          </>
        )}
      </main>

      {/* Audit Modal */}
      <AuditModal
        audit={auditResult}
        onClose={() => setAuditResult(null)}
        onLoadToForm={handleLoadAuditToForm}
      />

      {/* Areas Manager Modal */}
      <AreasModal
        isOpen={isAreasModalOpen}
        onClose={() => setIsAreasModalOpen(false)}
        areasList={areasList}
        activeArea={activeArea}
        allAreaItems={allAreaItems}
        onSelectArea={handleSelectArea}
        onCreateArea={handleCreateArea}
        onDeleteArea={handleDeleteAreaRequest}
        onForceSync={handleConsolidateGlobal}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        activeArea={activeArea}
      />

      {/* Termux Integration Modal */}
      <TermuxModal
        isOpen={isTermuxModalOpen}
        onClose={() => setIsTermuxModalOpen(false)}
        isBackendConnected={isBackendConnected}
        onCheckConnection={checkBackendConnection}
      />

      {/* Edit Row Item Modal */}
      <EditItemModal
        item={editingItem}
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedRow}
      />

      {/* Diagnostic Modal */}
      <DiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        isBackendConnected={isBackendConnected}
        activeArea={activeArea}
        activeItemsCount={currentItems.length}
        totalGlobalItemsCount={totalGlobalItemsCount}
        onForceSync={handleConsolidateGlobal}
        onLoadDemoData={handleLoadDemoData}
      />

      {/* CUSTOM CONFIRM MODAL FOR ITEM DELETION */}
      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="¿Eliminar producto del inventario?"
        message={`¿Seguro que deseas eliminar el producto "${itemToDelete?.Nombre || itemToDelete?.Código}" (${itemToDelete?.Total} piezas)? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, Eliminar"
        cancelLabel="Cancelar"
        onConfirm={executeDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />

      {/* READ-ONLY BARCODE LOOKUP MODAL */}
      <LookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        allAreaItems={allAreaItems}
        onSelectCode={(scannedSku) => {
          setSku(scannedSku);
          if (scannedSku.length >= 3) {
            handleAutofillBySku(scannedSku);
          }
          setActiveTab('operacion');
        }}
      />

      {/* ANDROID NOTIFICATION & QUICK SETTINGS SLIDE-DOWN PANEL */}
      <AndroidNotificationShade
        isOpen={isShadeOpen}
        onClose={() => setIsShadeOpen(false)}
        activeArea={activeArea}
        totalItems={currentItems.length}
        totalPiezas={totalPiezasArea}
        totalValor={totalValorArea}
        isOnline={isOnline}
        isBackendConnected={isBackendConnected}
        quickScanMode={quickScanMode}
        onToggleQuickScanMode={setQuickScanMode}
        onForceSync={handleConsolidateGlobal}
        onOpenAreas={() => setIsAreasModalOpen(true)}
        onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
      />

      {/* LEFT SIDEBAR DRAWER (3-LINES HAMBURGER MENU FOR INVENTORIES) */}
      <LeftSidebarDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        areasList={areasList}
        activeArea={activeArea}
        allAreaItems={allAreaItems}
        onSelectArea={handleSelectArea}
        onCreateArea={handleCreateArea}
        onDeleteArea={handleDeleteAreaRequest}
        onLoadDemoData={handleLoadDemoData}
        onOpenImport={() => setIsImportModalOpen(true)}
        onForceSync={handleConsolidateGlobal}
      />

      {/* RIGHT SIDEBAR DRAWER (GESTIÓN Y AJUSTES PRO) */}
      <RightSidebarDrawer
        isOpen={isRightDrawerOpen}
        onClose={() => setIsRightDrawerOpen(false)}
        allAreaItems={allAreaItems}
        onUpdateItem={handleUpdateAreaItem}
        onDeleteAreaItem={handleDeleteAreaItem}
        onApproveMerma={handleApproveMerma}
        showToast={showToast}
        isBackendConnected={isBackendConnected}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        activeArea={activeArea}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenAreas={() => setIsAreasModalOpen(true)}
        onForceSync={handleConsolidateGlobal}
        onLoadDemoData={handleLoadDemoData}
        onManualSave={handleManualSave}
        onCheckBackendConnection={checkBackendConnection}
      />
    </div>
  );
}
