import React, { useState } from 'react';
import {
  X,
  Terminal,
  Copy,
  Check,
  FolderTree,
  Camera,
  Play,
  HelpCircle,
  Download,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface TermuxModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBackendConnected: boolean;
  onCheckConnection: () => void;
}

export const TermuxModal: React.FC<TermuxModalProps> = ({
  isOpen,
  onClose,
  isBackendConnected,
  onCheckConnection,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const oneLineInstallCommand = `pkg update -y && pkg install -y python git && pip install flask && mkdir -p ~/smart-scanner-pro/templates ~/smart-scanner-pro/static/js`;

  const runCommand = `cd ~/smart-scanner-pro && python app.py`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 p-3.5 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Centro de Integración Termux (Android)</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de Termux"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto text-xs text-slate-300">
          {/* Connection status banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isBackendConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            <div>
              <p className="font-bold flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isBackendConnected ? 'Servidor Conectado y Sincronizando' : 'Modo Almacenamiento Local (Offline)'}</span>
              </p>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isBackendConnected
                  ? 'Los cambios se guardan automáticamente tanto en la app como en inventario_data.json.'
                  : 'Tus datos se guardan en el navegador. Inicia tu servidor Termux para respaldar en archivo físico.'}
              </p>
            </div>
            <button
              onClick={onCheckConnection}
              className="px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-xs font-semibold border border-white/20 transition-all shrink-0 ml-2"
            >
              Comprobar
            </button>
          </div>

          {/* Step 1: 1-Click Install Command */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              1. Comando de Instalación en Termux:
            </label>
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 break-all select-all">
              {oneLineInstallCommand}
              <button
                onClick={() => copyToClipboard(oneLineInstallCommand, 'install')}
                aria-label="Copiar comando de instalación"
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copiar comando"
              >
                {copiedCmd === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 2: Execution Command */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              2. Iniciar Servidor en Termux:
            </label>
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-300 select-all">
              {runCommand}
              <button
                onClick={() => copyToClipboard(runCommand, 'run')}
                aria-label="Copiar comando de inicio"
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copiar comando"
              >
                {copiedCmd === 'run' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Luego abre Google Chrome en tu teléfono e ingresa a: <strong className="text-white">http://localhost:8000</strong>
            </p>
          </div>

          {/* File Structure Overview */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <FolderTree className="w-3.5 h-3.5 text-blue-400" />
              <span>Estructura de Archivos Recomendada:</span>
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 whitespace-pre">
{`~/smart-scanner-pro/
├── app.py                 # Servidor Dual (Flask + nativo HTTP)
├── inventario_data.json   # Base de datos local automática
├── templates/
│   └── index.html         # Interfaz web móvil industrial
├── static/
│   └── js/
│       └── main.js        # Lógica de escaneo y exportación
└── instalar.sh            # Script de 1 solo toque`}
            </div>
          </div>

          {/* Android Camera Permissions note */}
          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-start gap-2.5">
            <Camera className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-300">Nota Clave sobre la Cámara en Android:</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                • Si abres <code className="bg-black/50 px-1 py-0.5 rounded text-white">http://localhost:8000</code> en Chrome en el mismo teléfono, Chrome permite la cámara directamente.<br />
                • Si abres la IP desde otro dispositivo en Wi-Fi (ej: <code className="bg-black/50 px-1 py-0.5 rounded text-white">http://192.168.1.100:8000</code>), entra a <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">chrome://flags</code>, busca <em>"Insecure origins treated as secure"</em>, añade tu IP y actívalo.
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
