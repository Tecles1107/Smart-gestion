import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  Flashlight,
  Volume2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Upload,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { playLaserBeep } from '../utils/audio';

interface CameraScannerProps {
  onScanCode: (code: string) => void;
  isPaused: boolean;
  lastScannedCode: string | null;
  onResumeScan: () => void;
  onDiscardCode: () => void;
  externalFeedback?: 'success' | 'error' | null;
  onNotification?: (msg: string, type: 'error' | 'success' | 'info') => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanCode,
  isPaused,
  lastScannedCode,
  onResumeScan,
  onDiscardCode,
  externalFeedback = null,
  onNotification,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);

  // Visual confirmation frame animation states (green / red)
  const [localFeedback, setLocalFeedback] = useState<'success' | 'error' | null>(null);
  const [showFlash, setShowFlash] = useState<'success' | 'error' | null>(null);
  const [flashKey, setFlashKey] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'barcode-reader-container';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external feedback from parent
  useEffect(() => {
    if (externalFeedback) {
      setLocalFeedback(externalFeedback);
      setShowFlash(externalFeedback);
      setFlashKey((k) => k + 1);
      if (externalFeedback === 'error') {
        const timer = setTimeout(() => {
          setLocalFeedback(null);
          setShowFlash(null);
        }, 1400);
        return () => clearTimeout(timer);
      }
    }
  }, [externalFeedback]);

  // Auto-resume scanner decoding whenever isPaused becomes false
  useEffect(() => {
    if (!isPaused) {
      setLocalFeedback(null);
      setShowFlash(null);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.resume();
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [isPaused]);

  // Derived active feedback: green if paused with code, or active local/external state
  const activeFeedback = (isPaused && lastScannedCode)
    ? 'success'
    : localFeedback || externalFeedback || null;

  // Helper to stop active video tracks safely without prompting for new stream
  const releaseActiveTracks = useCallback(async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch {
      // Ignore if not running
    }

    try {
      const videoEl = document.querySelector<HTMLVideoElement>(`#${readerElementId} video`);
      if (videoEl && videoEl.srcObject && 'getTracks' in (videoEl.srcObject as any)) {
        (videoEl.srcObject as MediaStream).getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }
    } catch {
      // Ignore
    }
  }, []);

  // Load available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({
            id: d.id,
            label: d.label || `Lente ${d.id.slice(0, 5)}`,
          }));
          setCameras(list);
          const backCam =
            devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('trasera') ||
                d.label.toLowerCase().includes('environment')
            ) || devices[devices.length - 1];
          setSelectedCameraId(backCam.id);
        }
      })
      .catch((err) => {
        console.warn('Cameras query note:', err);
      });

    return () => {
      releaseActiveTracks();
    };
  }, [releaseActiveTracks]);

  const startCamera = async (cameraIdToUse?: string) => {
    if (isStarting) return;
    setIsStarting(true);
    setCameraError(null);

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.max(160, Math.floor(minEdge * 0.85)),
          height: Math.max(100, Math.floor(minEdge * 0.55)),
        };
      },
    };

    const handleSuccess = (decodedText: string) => {
      if (!isPaused) {
        setLocalFeedback('success');
        setShowFlash('success');
        setFlashKey((k) => k + 1);
        try {
          if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.pause(true);
          }
        } catch {
          // Ignore
        }
        onScanCode(decodedText);
      }
    };

    try {
      await releaseActiveTracks();

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      const id = cameraIdToUse || selectedCameraId;

      if (id) {
        try {
          await scannerRef.current.start(id, config, handleSuccess, () => {});
          setIsRunning(true);
          setIsStarting(false);
          checkTorch();
          return;
        } catch (tier1Err: any) {
          console.warn('Tier 1 camera start failed, attempting facingMode: environment...', tier1Err);
        }
      }

      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          handleSuccess,
          () => {}
        );
        setIsRunning(true);
        setIsStarting(false);
        checkTorch();
        return;
      } catch (tier2Err: any) {
        console.warn('Tier 2 camera start failed, attempting fallback camera...', tier2Err);
      }

      try {
        await scannerRef.current.start(
          { facingMode: 'user' },
          config,
          handleSuccess,
          () => {}
        );
        setIsRunning(true);
        setIsStarting(false);
        checkTorch();
        return;
      } catch (tier3Err: any) {
        console.warn('Tier 3 camera start failed:', tier3Err);
        throw tier3Err;
      }
    } catch (err: any) {
      console.error('Camera start final error:', err);
      setIsRunning(false);
      setIsStarting(false);
      const msg = String(err?.message || err);

      if (msg.includes('NotReadableError') || msg.includes('Could not start video source')) {
        setCameraError(
          'La cámara está en uso por otra aplicación o bloqueada por el sistema (NotReadableError). Cierra otras apps o pestañas, o usa el botón "Tomar/Subir Foto de Código" abajo.'
        );
      } else if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError(
          'Permiso de cámara denegado. Permite el acceso a la cámara en el candado de la barra de direcciones de Chrome.'
        );
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setCameraError(
          'No se encontró ninguna cámara de video disponible en este dispositivo.'
        );
      } else {
        setCameraError(
          'No se pudo inicializar el video de la cámara. Puedes subir una foto del código o escribir el SKU manualmente.'
        );
      }
    }
  };

  const checkTorch = () => {
    try {
      if (scannerRef.current) {
        const capabilities = scannerRef.current.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      }
    } catch {
      setHasTorch(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isRunning) {
      try {
        await scannerRef.current.stop();
        setIsRunning(false);
        setTorchOn(false);
      } catch (err) {
        console.error('Error stopping camera:', err);
        setIsRunning(false);
      }
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isRunning) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setCameraError(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(() => {});
        setIsRunning(false);
      }

      const decodedText = await scannerRef.current.scanFile(file, true);
      if (decodedText) {
        setLocalFeedback('success');
        setShowFlash('success');
        setFlashKey((k) => k + 1);
        onScanCode(decodedText);
        playLaserBeep('success');
      }
    } catch (err: any) {
      console.warn('File decode note:', err);
      setLocalFeedback('error');
      setShowFlash('error');
      setFlashKey((k) => k + 1);
      setTimeout(() => {
        setLocalFeedback(null);
        setShowFlash(null);
      }, 1500);
      if (onNotification) {
        onNotification('No se detectó un código de barras claro en la imagen. Intenta con mejor iluminación o escribe el código manualmente.', 'error');
      }
    } finally {
      setIsScanningFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleResumeClick = () => {
    setLocalFeedback(null);
    setShowFlash(null);
    try {
      if (scannerRef.current) {
        scannerRef.current.resume();
      }
    } catch {
      // Ignore
    }
    onResumeScan();
  };

  const handleDiscardClick = () => {
    setLocalFeedback('error');
    setShowFlash('error');
    setFlashKey((k) => k + 1);
    try {
      if (scannerRef.current) {
        scannerRef.current.resume();
      }
    } catch {
      // Ignore
    }
    onDiscardCode();
    setTimeout(() => {
      setLocalFeedback(null);
      setShowFlash(null);
    }, 1400);
  };

  const handleTestFrameAnimation = () => {
    setLocalFeedback('success');
    setShowFlash('success');
    setFlashKey((k) => k + 1);
    playLaserBeep('success');

    setTimeout(() => {
      setLocalFeedback('error');
      setShowFlash('error');
      setFlashKey((k) => k + 1);
      playLaserBeep('remove');

      setTimeout(() => {
        setLocalFeedback(null);
        setShowFlash(null);
      }, 1200);
    }, 1300);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* Header toolbar */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs font-bold text-cyan-400 tracking-wide flex items-center gap-1">
            <span>|||||</span> Escáner Láser
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTestFrameAnimation}
            aria-label="Probar animación del marco verde y rojo"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs flex items-center gap-1 transition-colors border border-slate-700/60"
            title="Probar animación del marco visual (Verde: Detectado / Rojo: Descartado)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden md:inline">Marco Visual</span>
          </button>

          <button
            onClick={() => playLaserBeep('success')}
            aria-label="Probar sonido bip"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            title="Probar sonido de escaneo"
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Bip</span>
          </button>

          {hasTorch && isRunning && (
            <button
              onClick={toggleTorch}
              aria-label="Alternar Linterna"
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
              }`}
              title="Encender/Apagar Flash"
            >
              <Flashlight className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">{torchOn ? 'ON' : 'Flash'}</span>
            </button>
          )}

          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCameraId(newId);
                if (isRunning) {
                  stopCamera().then(() => startCamera(newId));
                }
              }}
              aria-label="Seleccionar Cámara"
              className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded-md px-1.5 py-1 max-w-[90px] truncate"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main scanner view & controls */}
      <div className="p-2 sm:p-3 flex flex-col gap-2">
        {/* Freeze Panel with Discard and Continue buttons */}
        {isPaused && (
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-2 border-amber-400 rounded-xl p-3 text-center shadow-lg animate-in fade-in duration-200 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>CÓDIGO DETECTADO Y CONGELADO:</span>
              <span className="font-mono text-sm bg-black/80 px-2.5 py-0.5 rounded text-white tracking-widest border border-amber-400/50">
                {lastScannedCode || 'Detectado'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleDiscardClick}
                aria-label="Descartar código y volver a escanear"
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-lg shadow transition-all flex items-center justify-center gap-2"
                title="Elimina el código escaneado y reanuda el video inmediatamente"
              >
                <Trash2 className="w-4 h-4" />
                <span>Descartar y Re-escanear</span>
              </button>

              <button
                type="button"
                onClick={handleResumeClick}
                aria-label="Reanudar video para siguiente código"
                className="py-2.5 px-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm rounded-lg shadow transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Continuar / Siguiente</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Controls Bar matching screenshot */}
        <div className="grid grid-cols-2 gap-2">
          {!isRunning ? (
            <button
              onClick={() => startCamera()}
              disabled={isStarting}
              aria-label="Iniciar Cámara de Escaneo"
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-lg shadow transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{isStarting ? 'Conectando...' : 'Iniciar'}</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              aria-label="Detener Cámara de Escaneo"
              className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-lg shadow transition-all flex items-center justify-center gap-2"
            >
              <CameraOff className="w-4 h-4" />
              <span>⏹ Detener</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanningFile}
            aria-label="Tomar o Subir Foto de Código"
            className="py-2.5 px-3 bg-[#111e38] hover:bg-slate-800 border border-slate-700 active:scale-[0.99] text-slate-100 font-bold text-xs sm:text-sm rounded-lg transition-all flex items-center justify-center gap-2"
            title="Escanear desde foto o cámara de Android sin usar stream continuo"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>{isScanningFile ? 'Analizando...' : '📷 Foto'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileScan}
          />
        </div>

        {/* Camera error alert */}
        {cameraError && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-300">{cameraError}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-rose-900/50">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reintentar
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-md text-[11px] font-semibold flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Usar Foto
              </button>
              <span className="text-[10px] text-slate-400 ml-auto">O escribe el SKU abajo</span>
            </div>
          </div>
        )}

        {/* Video stream container with dynamic green/red confirmation frame */}
        <div
          data-testid="scanner-viewfinder-frame"
          className={`relative rounded-xl overflow-hidden transition-all duration-300 min-h-[180px] max-h-[230px] sm:max-h-[270px] flex items-center justify-center ${
            activeFeedback === 'success'
              ? 'scanner-frame-success border-4 border-emerald-400 bg-emerald-950/20'
              : activeFeedback === 'error'
              ? 'scanner-frame-error border-4 border-rose-500 bg-rose-950/20'
              : 'border-2 border-slate-700 bg-black'
          }`}
        >
          <div id={readerElementId} className="w-full h-full min-h-[180px]" />

          {/* Flash animation overlays */}
          {showFlash === 'success' && (
            <div
              key={`flash-succ-${flashKey}`}
              className="pointer-events-none absolute inset-0 z-30 bg-emerald-400/40 scanner-flash-green"
            />
          )}
          {showFlash === 'error' && (
            <div
              key={`flash-err-${flashKey}`}
              className="pointer-events-none absolute inset-0 z-30 bg-rose-500/40 scanner-flash-red"
            />
          )}

          {!isRunning && !activeFeedback && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-4 text-center">
              <Camera className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Cámara en Espera</p>
              <p className="text-[11px] text-slate-500 max-w-[260px] mt-0.5">
                Presiona "Iniciar Cámara", "Tomar / Subir Foto" o escribe el SKU directamente abajo.
              </p>
            </div>
          )}

          {/* Industrial viewfinder framing brackets matching Termux layout with Universal Laser Sweeper */}
          {isRunning && !activeFeedback && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-3">
              <div className="relative w-64 h-32 sm:w-72 sm:h-36 border border-cyan-400/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)] hud-pulse">
                {/* Neon Corners */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#06b6d4]" />

                {/* Laser Beam Animated Sweeper */}
                <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-cyan-500 via-rose-500 to-emerald-400 shadow-[0_0_12px_#06b6d4] laser-sweeper" />

                {/* Center Reticle Radar Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-cyan-400/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                </div>

                {/* Mode HUD badge */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40 text-[9px] font-mono text-cyan-300 tracking-wider uppercase font-bold flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>ESCANEO ACTIVO (CUALQUIER MODO)</span>
                </div>

                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/85 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-mono border border-emerald-500/30">
                  Apunta la cámara al código
                </div>
              </div>
            </div>
          )}

          {/* GREEN CONFIRMATION FRAME */}
          {activeFeedback === 'success' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-64 h-32 sm:w-72 sm:h-36 border-2 border-emerald-400 bg-slate-950/85 rounded-xl shadow-[0_0_35px_rgba(16,185,129,0.85)] flex flex-col items-center justify-center p-2.5 backdrop-blur-[2px]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-300 rounded-tl-lg shadow-[0_0_8px_#34d399]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-300 rounded-tr-lg shadow-[0_0_8px_#34d399]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-300 rounded-bl-lg shadow-[0_0_8px_#34d399]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-300 rounded-br-lg shadow-[0_0_8px_#34d399]" />

                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs rounded-md shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span className="tracking-wider uppercase">CÓDIGO CAPTURADO</span>
                </div>

                <div className="mt-2 font-mono text-base sm:text-lg font-black text-emerald-300 bg-black/90 px-3 py-0.5 rounded-md border border-emerald-400/60 shadow-inner tracking-widest max-w-[95%] truncate">
                  {lastScannedCode || 'DETECTADO'}
                </div>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300/90 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Respuesta visual confirmada</span>
                </div>
              </div>
            </div>
          )}

          {/* RED CONFIRMATION FRAME */}
          {activeFeedback === 'error' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-64 h-32 sm:w-72 sm:h-36 border-2 border-rose-500 bg-slate-950/85 rounded-xl shadow-[0_0_35px_rgba(244,63,94,0.85)] flex flex-col items-center justify-center p-2.5 backdrop-blur-[2px]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-rose-400 rounded-tl-lg shadow-[0_0_8px_#f43f5e]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-rose-400 rounded-tr-lg shadow-[0_0_8px_#f43f5e]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-rose-400 rounded-bl-lg shadow-[0_0_8px_#f43f5e]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-rose-400 rounded-br-lg shadow-[0_0_8px_#f43f5e]" />

                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-md shadow-lg">
                  <XCircle className="w-4 h-4 text-white animate-pulse" />
                  <span className="tracking-wider uppercase">CÓDIGO DESCARTADO</span>
                </div>

                <span className="text-[11px] text-rose-200 font-bold mt-2">
                  Visor liberado para nuevo escaneo
                </span>
              </div>
            </div>
          )}

          {/* Normal Target Reticle Overlay */}
          {isRunning && !isPaused && !activeFeedback && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-60 h-28 sm:w-64 sm:h-32 border-2 border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center overflow-hidden">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.9)] laser-sweeper" />

                <div className="absolute bottom-1 bg-black/75 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-mono">
                  Centra el código aquí
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
