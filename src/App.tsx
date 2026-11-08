/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, ScanMode, AuditResult } from './types/inventory';
import {
  cleanNum,
  formatDateTime,
  calculateTotal,
  calculatePiecesPerBundle,
  aggregateGlobalInventory,
  auditProduct,
  filterInventory,
  sortInventoryItems,
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
import { WifiOff, CloudUpload, Bell } from 'lucide-react';

const DEFAULT_AREAS = ['Inventario_General', 'Hogar', 'Fiesta', 'Ferreteria'];

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
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Custom Deletion Confirmation Modal States (Replaces blocked window.confirm)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

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

  // Current items for active area
  const currentItems = useMemo(() => {
    return allAreaItems[activeArea] || [];
  }, [allAreaItems, activeArea]);

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

  // Expiration notifications check
  const expiringItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: { item: InventoryItem; area: string; daysLeft: number }[] = [];

    Object.entries(allAreaItems).forEach(([areaKey, items]) => {
      items.forEach((it) => {
        if (it.Caducidad) {
          const expDate = new Date(it.Caducidad);
          expDate.setHours(0, 0, 0, 0);
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) {
            results.push({ item: it, area: areaKey.replace(/_/g, ' '), daysLeft: diffDays });
          }
        }
      });
    });
    return results;
  }, [allAreaItems]);

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

            // Cleanly filter DB archives to only include valid stored areas
            const filteredArchivos: Record<string, InventoryItem[]> = {};
            savedList.forEach((areaKey) => {
              if (db.archivos[areaKey]) {
                filteredArchivos[areaKey] = db.archivos[areaKey];
              }
            });

            setAllAreaItems((prev) => ({
              ...prev,
              ...filteredArchivos,
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
      const clean = cleanNum(inputSku);
      if (!clean) return;

      let found: InventoryItem | undefined = currentItems.find((i) => cleanNum(i.Código) === clean);
      if (!found) {
        for (const items of Object.values(allAreaItems)) {
          found = items.find((i) => cleanNum(i.Código) === clean && i.Nombre !== 'S/N');
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
      const clean = cleanNum(scannedText);
      if (clean.length < 3) return;

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
          alert(`Código ${clean} no encontrado en ninguna sesión.`);
          setIsScannerPaused(false);
          setTimeout(() => setScannerFeedback(null), 1400);
        }
        return;
      }

      handleAutofillBySku(clean);
    },
    [isScannerPaused, mode, allAreaItems, activeArea, handleAutofillBySku]
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
    const cleanSku = cleanNum(sku);
    if (!cleanSku) {
      alert('Por favor ingresa o escanea un código de barras.');
      return;
    }

    if (mode === 'consulta') {
      const audit = auditProduct(cleanSku, allAreaItems, activeArea);
      if (audit) {
        setAuditResult(audit);
      } else {
        playLaserBeep('remove');
        alert(`El código ${cleanSku} no existe en ninguna área.`);
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
        alert('Agrega al menos un sub-item dentro de la Caja Mixta.');
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
      alert('Ingresa una cantidad válida mayor a cero.');
      return;
    }

    let createdOrUpdatedItem: InventoryItem | null = null;

    setAllAreaItems((prev) => {
      const list = [...(prev[activeArea] || [])];
      const existingIndex = list.findIndex(
        (i) => cleanNum(i.Código) === cleanSku && (i.Caducidad || '') === (caducidad || '')
      );

      if (mode === 'salida') {
        if (existingIndex === -1) {
          playLaserBeep('remove');
          alert('El producto no existe en esta área para restar.');
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
            ...(extraDataRecord ? { _extraData: extraDataRecord } : {}),
          };
          list.unshift(newItem);
          createdOrUpdatedItem = newItem;
        }
        playLaserBeep('success');
      }

      persistAreaItems(activeArea, list);

      if (activeArea !== 'Inventario_General') {
        const nextAll = { ...prev, [activeArea]: list };
        const updatedGlobal = aggregateGlobalInventory(nextAll);
        persistAreaItems('Inventario_General', updatedGlobal);
        return {
          ...nextAll,
          Inventario_General: updatedGlobal,
        };
      }

      return {
        ...prev,
        [activeArea]: list,
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
      const list = [...(prev[activeArea] || [])];
      const index = list.findIndex(
        (i) => i.Código === itemToUpdate.Código && i.Fecha_Captura === itemToUpdate.Fecha_Captura
      );
      if (index === -1) return prev;

      const item = list[index];
      const pz = calculatePiecesPerBundle(item);
      const newBultos = (Number(item.Bultos) || 0) + delta;

      if (newBultos <= 0) {
        setItemToDelete(item);
      } else {
        item.Bultos = newBultos;
        item.Total = Math.max(0, (Number(item.Total) || 0) + delta * pz);
        item.Fecha_Captura = formatDateTime();
        playLaserBeep(delta > 0 ? 'success' : 'remove');
      }

      persistAreaItems(activeArea, list);
      return { ...prev, [activeArea]: list };
    });
  };

  const handleChangePiezasRowByItem = (itemToUpdate: InventoryItem, delta: number) => {
    setAllAreaItems((prev) => {
      const list = [...(prev[activeArea] || [])];
      const index = list.findIndex(
        (i) => i.Código === itemToUpdate.Código && i.Fecha_Captura === itemToUpdate.Fecha_Captura
      );
      if (index === -1) return prev;

      const item = list[index];
      const newTotal = (Number(item.Total) || 0) + delta;

      if (newTotal <= 0) {
        setItemToDelete(item);
      } else {
        item.Total = newTotal;
        if ((Number(item.Bultos) || 0) <= 1) {
          item.Bultos = 1;
          item.Piezas = newTotal;
        }
        item.Fecha_Captura = formatDateTime();
        playLaserBeep(delta > 0 ? 'success' : 'remove');
      }

      persistAreaItems(activeArea, list);
      return { ...prev, [activeArea]: list };
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
    setItemToDelete(null);

    setAllAreaItems((prev) => {
      const list = [...(prev[activeArea] || [])];
      let index = list.findIndex(
        (i) => i.Código === target.Código && i.Fecha_Captura === target.Fecha_Captura
      );
      if (index === -1) {
        index = list.findIndex((i) => i.Código === target.Código);
      }
      if (index !== -1) {
        list.splice(index, 1);
      }
      persistAreaItems(activeArea, list);

      const nextAll = { ...prev, [activeArea]: list };
      if (activeArea !== 'Inventario_General') {
        const updatedGlobal = aggregateGlobalInventory(nextAll);
        persistAreaItems('Inventario_General', updatedGlobal);
        return {
          ...nextAll,
          Inventario_General: updatedGlobal,
        };
      }
      return nextAll;
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
    setAllAreaItems((prev) => {
      const list = [...(prev[activeArea] || [])];
      let index = list.findIndex(
        (i) => i.Código === editingItem.Código && i.Fecha_Captura === editingItem.Fecha_Captura
      );
      if (index === -1) {
        index = list.findIndex((i) => i.Código === editingItem.Código);
      }
      if (index !== -1) {
        list[index] = updatedItem;
      }
      persistAreaItems(activeArea, list);
      return { ...prev, [activeArea]: list };
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
    const clean = areaName.trim().replace(/\s+/g, '_');
    if (!areasList.includes(clean)) {
      const updated = [...areasList, clean];
      setAreasList(updated);
      localStorage.setItem('inventario_lista_archivos', JSON.stringify(updated));
    }
    handleSelectArea(clean);
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
      return {
        ...prev,
        [cleanArea]: merged,
      };
    });

    setActiveArea(cleanArea);
    localStorage.setItem('inventario_archivo_activo', cleanArea);
    playLaserBeep('success');
  };

  const handleManualSave = () => {
    persistAreaItems(activeArea, currentItems);
    if (activeArea !== 'Inventario_General') {
      handleConsolidateGlobal();
    }
    playLaserBeep('success');
    alert(`Guardado exitoso de "${activeArea.replace(/_/g, ' ')}" con ${currentItems.length} registros.`);
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

      {/* Expiration Notification Center Banner */}
      {expiringItems.length > 0 && showExpirationBanner && (
        <div className="bg-rose-950/90 border-b border-rose-500/60 px-3 py-2 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-rose-600 text-white rounded-lg animate-pulse">
              <Bell className="w-4 h-4" />
            </div>
            <span>
              <strong>Alerta de Caducidad:</strong> Hay <strong>{expiringItems.length}</strong> producto(s) próximos a vencer o vencidos en el inventario.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                const list = expiringItems
                  .map((e) => `• [${e.area}] ${e.item.Nombre} (SKU: ${e.item.Código}) - Vence: ${e.item.Caducidad} (${e.daysLeft <= 0 ? 'VENCIDO' : `${e.daysLeft} días`})`)
                  .join('\n');
                alert(`PRODUCTOS PRÓXIMOS A CADUCAR:\n\n${list}`);
              }}
              className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded text-[11px]"
            >
              Ver Lista Detallada
            </button>
            <button
              onClick={() => setShowExpirationBanner(false)}
              className="text-rose-400 hover:text-white font-bold px-1"
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
                onExport={(type, fmt) => exportInventory(currentItems, activeArea, type, fmt)}
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
        onLoadDemoData={() => {}}
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
    </div>
  );
}
