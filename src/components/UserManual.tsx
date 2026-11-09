import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Globe,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package,
  Layers,
  Boxes,
  Calendar,
  Trash2,
  Activity,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Upload,
  Download,
  HelpCircle,
  ShieldCheck,
  Zap,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Terminal,
} from 'lucide-react';

export interface UserManualProps {
  onClose?: () => void;
  onOpenUpdateCenter?: () => void;
}

export type ManualLanguage = 'es' | 'en';

interface ManualSection {
  id: string;
  categoryEs: string;
  categoryEn: string;
  titleEs: string;
  titleEn: string;
  icon: any;
  color: string;
  bgColor: string;
  summaryEs: string;
  summaryEn: string;
  featuresEs: { name: string; desc: string }[];
  featuresEn: { name: string; desc: string }[];
  tipsEs?: string[];
  tipsEn?: string[];
}

export const USER_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'scanner-engine',
    categoryEs: 'Operación Principal',
    categoryEn: 'Core Operations',
    titleEs: '1. Motor de Escaneo & Modos de Registro',
    titleEn: '1. Scanning Engine & Entry Modes',
    icon: Zap,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    summaryEs: 'Permite la captura de códigos de barras (EAN-13, UPC, SKUs alfanuméricos) utilizando escáner láser físico, cámara HD o carga de fotografía con retroalimentación en tiempo real.',
    summaryEn: 'Enables capture of barcodes (EAN-13, UPC, alphanumeric SKUs) using physical laser scanner, HD camera, or photo upload with real-time feedback.',
    featuresEs: [
      {
        name: 'Modo Entrada (+)',
        desc: 'Suma bultos y piezas al inventario del área activa. Si el código ya existe con la misma fecha de caducidad, incrementa automáticamente la existencia.',
      },
      {
        name: 'Modo Salida (-)',
        desc: 'Descuenta piezas o bultos del inventario físico. Registra el timestamp con la marca "(-)" y valida disponibilidad antes de sustraer.',
      },
      {
        name: 'Modo Auditoría / Consulta',
        desc: 'Permite consultar el desglose de existencias globales, ubicación en almacenes y salud del stock sin alterar ninguna cantidad.',
      },
      {
        name: 'Escaneo Rápido (⚡ ON/OFF)',
        desc: 'Modo de alta velocidad que procesa lecturas consecutivas sin necesidad de presionar el botón de confirmación en cada escaneo.',
      },
      {
        name: 'Retroalimentación Auditiva y Háptica',
        desc: 'Bip auditivo diferenciado para registros exitosos (agudo) o errores (grave), acompañado de marco visual de destello (verde/rojo) y vibración en dispositivos móviles.',
      },
    ],
    featuresEn: [
      {
        name: 'Entry Mode (+)',
        desc: 'Adds packages and pieces to the active area inventory. If the barcode exists with matching expiration date, it automatically increases quantity.',
      },
      {
        name: 'Exit Mode (-)',
        desc: 'Deducts pieces or packages from physical stock. Logs the timestamp marked with "(-)" and validates stock availability before subtracting.',
      },
      {
        name: 'Audit / Search Mode',
        desc: 'Allows querying global stock breakdown, warehouse location, and stock health without altering any quantities.',
      },
      {
        name: 'Quick Scan Mode (⚡ ON/OFF)',
        desc: 'High-speed mode that processes consecutive readings without needing to press the submit button on every scan.',
      },
      {
        name: 'Audio and Haptic Feedback',
        desc: 'Differentiated audio beep for successful reads (high pitch) or errors (low pitch), accompanied by flash visual frame (green/red) and haptic vibration on mobile devices.',
      },
    ],
    tipsEs: [
      'Puedes usar escáneres USB/Bluetooth de mano directo en el campo de SKU.',
      'Soporta códigos alfanuméricos como "PALLET-A", "MIX-001" o "LOT-2026".',
    ],
    tipsEn: [
      'You can use handheld USB/Bluetooth scanners directly into the SKU input field.',
      'Supports alphanumeric barcodes like "PALLET-A", "MIX-001" or "LOT-2026".',
    ],
  },
  {
    id: 'batch-cloning',
    categoryEs: 'Control de Lotes',
    categoryEn: 'Batch Control',
    titleEs: '2. Clonación de Lotes por Fecha de Caducidad',
    titleEn: '2. Batch Cloning by Expiration Date',
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    summaryEs: 'Permite la convivencia de múltiples lotes con el mismo código de barras y nombre pero con diferentes fechas de caducidad, garantizando trazabilidad y control PEPS (Primeras Entradas, Primeras Salidas).',
    summaryEn: 'Allows multiple batches sharing the same barcode and product name but having different expiration dates to coexist, ensuring traceability and FIFO inventory control.',
    featuresEs: [
      {
        name: 'Regla de Clonación Automática',
        desc: 'Al registrar un producto con un código existente pero con distinta fecha de vencimiento, el sistema crea un nuevo renglón independiente (clon de lote).',
      },
      {
        name: 'Visualizador de Lotes Detectados',
        desc: 'En el formulario de registro se muestra un badge azul con las caducidades existentes y el botón "+ Clonar / Nueva Caducidad" para agilizar la entrada.',
      },
      {
        name: 'Mantenimiento de Catálogo',
        desc: 'Permite gestionar caducidades individuales sin mezclar las fechas de lotes antiguos con mercancía de reciente ingreso.',
      },
    ],
    featuresEn: [
      {
        name: 'Automatic Cloning Rule',
        desc: 'When entering a product with an existing barcode but a different expiration date, the system creates a new independent row (batch clone).',
      },
      {
        name: 'Detected Batches Display',
        desc: 'The registration form shows a blue badge listing existing expiration dates and a "+ Clone / New Expiration" button for swift entry.',
      },
      {
        name: 'Catalog Maintenance',
        desc: 'Manages individual expiration dates without mixing older batch dates with freshly arrived merchandise.',
      },
    ],
    tipsEs: [
      'Si la caducidad es idéntica a un lote existente, se suman las piezas en lugar de clonar.',
    ],
    tipsEn: [
      'If the expiration date matches an existing batch, quantities are added instead of creating a clone.',
    ],
  },
  {
    id: 'expiring-area',
    categoryEs: 'Alertas & Prevención',
    categoryEn: 'Alerts & Prevention',
    titleEs: '3. Área Exclusiva «Productos a Caducar» (Aviso 20 Días)',
    titleEn: '3. Dedicated "Expiring Products" Area (20-Day Notice)',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    summaryEs: 'Zona exclusiva y sincronizada en tiempo real que reúne de forma automática todos los productos con fecha de vencimiento menor o igual a 20 días o ya expirados.',
    summaryEn: 'Dedicated area synchronized in real time that automatically gathers all products with expiration date within 20 days or already expired.',
    featuresEs: [
      {
        name: 'Banner Superior Redirigible',
        desc: 'Notificación de alerta roja/amarilla en la barra superior con el botón "🚀 Ir a Área Caducados" que lleva directamente a la lista exclusiva.',
      },
      {
        name: 'Sincronización Transparente sin Desplazamiento',
        desc: 'Los productos permanecen en su inventario o bodega de origen, pero se proyectan simultáneamente en la lista de caducados.',
      },
      {
        name: 'Etiquetas de Urgencia y Origen',
        desc: 'Cada producto muestra la etiqueta del conteo de días ("⏰ Vence en X días" / "⏰ ¡Vencido!") junto a su almacén de procedencia ("De: Piso de Venta", "De: Bodega 2").',
      },
    ],
    featuresEn: [
      {
        name: 'Redirectable Alert Banner',
        desc: 'Red/yellow alert notification in the top bar with "🚀 Go to Expiring Area" button that takes you straight to the exclusive list.',
      },
      {
        name: 'Seamless Sync without Relocation',
        desc: 'Products remain in their original inventory or warehouse, while being projected simultaneously in the expiring products list.',
      },
      {
        name: 'Urgency Tags & Origin Badge',
        desc: 'Each product displays a countdown badge ("⏰ Expires in X days" / "⏰ Expired!") alongside its source warehouse ("From: Sales Floor", "From: Warehouse 2").',
      },
    ],
  },
  {
    id: 'merma-management',
    categoryEs: 'Control de Merma',
    categoryEn: 'Merma Management',
    titleEs: '4. Gestión de Merma, Flujo de Aprobación y Reportes',
    titleEn: '4. Merma Management, Approval Workflow & Reports',
    icon: Trash2,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    summaryEs: 'Módulo completo para registrar, auditar y descargar solicitudes de merma (daños, caducados, robo, extravío) con respaldos descargables en Excel, PDF y Word.',
    summaryEn: 'Comprehensive module to register, audit, and download merma requests (damage, expired, theft, loss) with downloadable Excel, PDF, and Word reports.',
    featuresEs: [
      {
        name: 'Formulario de Solicitud de Merma',
        desc: 'Registro de SKU, Nombre, Cantidad de piezas, Motivo, Responsable y evidencia fotográfica adjunta en Base64.',
      },
      {
        name: 'Estatus de Validación (`En espera` -> `Validado` -> `Aprobado`)',
        desc: 'Flujo formal de supervisión con casillas de verificación para aprobar o rechazar solicitudes.',
      },
      {
        name: 'Descarga Multiformato (Excel, PDF, Word)',
        desc: 'Exportación instantánea de reportes oficiales. El PDF incluye tabla autoajustable con columnas de Nombre, UPC, Cantidad, Motivo, Foto de evidencia y casillas de aprobación.',
      },
      {
        name: 'Regla de Descuento Inteligente y Reseteo a 0',
        desc: 'Al aprobar una merma: si existen múltiples clones y uno queda en 0 piezas, se elimina el clon agotado. Si solo queda 1 producto en el catálogo y se agota, se resetea a 0 (Total: 0, Caducidad: "") manteniendo la referencia del código.',
      },
    ],
    featuresEn: [
      {
        name: 'Merma Request Form',
        desc: 'Registers SKU, Product Name, Piece Count, Reason, Manager, and attached Base64 evidence photo.',
      },
      {
        name: 'Validation Workflow (`Pending` -> `Validated` -> `Approved`)',
        desc: 'Formal supervision workflow with checkboxes to approve or decline merma requests.',
      },
      {
        name: 'Multi-Format Export (Excel, PDF, Word)',
        desc: 'Instant official report downloads. PDF includes auto-fitting table with Product Name, UPC, Quantity, Reason, Evidence Photo, and Approval Checkboxes.',
      },
      {
        name: 'Smart Deduction & Zero-Reset Rule',
        desc: 'Upon merma approval: if multiple clones exist and one reaches 0, the exhausted clone is deleted. If only 1 master item remains and reaches 0, it resets to 0 (Total: 0, Expiration: "") preserving code reference.',
      },
    ],
  },
  {
    id: 'multi-inventory',
    categoryEs: 'Sincronización Global',
    categoryEn: 'Global Synchronization',
    titleEs: '5. Multi-Inventario & Consolidación en Tiempo Real',
    titleEn: '5. Multi-Inventory & Real-Time Consolidation',
    icon: Layers,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    summaryEs: 'Conexión automatizada que mantiene sincronizados los conteos de un mismo producto en todos los almacenes e inventarios donde se encuentre.',
    summaryEn: 'Automated connection maintaining synchronized counts for identical products across all warehouses and inventories where present.',
    featuresEs: [
      {
        name: 'Sincronización Bidireccional de Cantidades',
        desc: 'Al modificar la cantidad o aplicar merma a un producto en cualquier pestaña de almacén o en Inventario General, el valor se actualiza idénticamente en todas las áreas.',
      },
      {
        name: 'Consolidación Inteligente a Inventario General',
        desc: 'Unifica las listas agregando existencias de forma clara sin duplicar registros ni distorsionar conteos espejo.',
      },
      {
        name: 'Persistencia Doble (LocalStorage & Servidor Node.js)',
        desc: 'Resguardo de datos con recuperación automática tras recargar o reiniciar el navegador.',
      },
    ],
    featuresEn: [
      {
        name: 'Bi-directional Quantity Synchronization',
        desc: 'Modifying quantities or deducting merma from a product in any warehouse tab or in General Inventory immediately syncs identical values across all areas.',
      },
      {
        name: 'Smart Consolidation to General Inventory',
        desc: 'Unifies area lists into a master view without duplicate entries or distorted mirror counts.',
      },
      {
        name: 'Dual Persistence (LocalStorage & Node.js Server)',
        desc: 'Data safeguard with automatic recovery upon page refresh or browser restart.',
      },
    ],
  },
  {
    id: 'analytics-dashboard',
    categoryEs: 'Analítica Recharts',
    categoryEn: 'Recharts Analytics',
    titleEs: '6. Dashboard & Flujo Histórico (Recharts LineChart)',
    titleEn: '6. Dashboard & Historical Flow (Recharts LineChart)',
    icon: Activity,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    summaryEs: 'Panel interactivo de inteligencia de negocios con gráfico de líneas en tiempo real para evaluar el comportamiento temporal de Entradas, Salidas y Balance Neto.',
    summaryEn: 'Interactive business intelligence dashboard featuring real-time LineChart to evaluate temporal trends of Inputs, Outputs, and Net Balance.',
    featuresEs: [
      {
        name: 'Gráfico Histórico de Entradas vs Salidas (`LineChart`)',
        desc: 'Línea de Entradas (Verde), Salidas/Merma (Rosa/Rojo) y Balance Neto (Azul Cyan punteado).',
      },
      {
        name: 'Filtros Dinámicos por Métrica y Tiempo',
        desc: 'Cambio con un clic entre Piezas, Bultos y Valor ($ MXN), y horizontes de 7 Días, 14 Días, 30 Días y 6 Meses.',
      },
      {
        name: 'Salud de Stock y Distribución Monetaria',
        desc: 'Gráficos de pastel y barras con métricas de stock Óptimo, Bajo, Crítico y Sobrestock, así como valor económico por almacén.',
      },
    ],
    featuresEn: [
      {
        name: 'Historical Inputs vs Outputs Chart (`LineChart`)',
        desc: 'Inputs line (Green), Outputs/Merma line (Pink/Red), and Net Balance line (Cyan dashed).',
      },
      {
        name: 'Dynamic Metric & Time Horizon Filters',
        desc: 'One-click toggle between Pieces, Bundles, and Value ($ MXN), and time ranges of 7 Days, 14 Days, 30 Days, and 6 Months.',
      },
      {
        name: 'Stock Health & Monetary Distribution',
        desc: 'Pie and Bar charts with Optimal, Low, Critical, and Overstock health indicators alongside total economic value per warehouse.',
      },
    ],
  },
  {
    id: 'system-updates',
    categoryEs: 'Actualizaciones de Software',
    categoryEn: 'Software Updates',
    titleEs: '7. Centro de Actualizaciones & Parches de Software',
    titleEn: '7. Software Update Center & Hot Patching',
    icon: RefreshCw,
    color: 'text-purple-300',
    bgColor: 'bg-purple-950/40 border-purple-500/40',
    summaryEs: 'Guía técnica e interfaz integrada para cargar nuevas versiones, parches de código o actualizar el sistema sin perder inventarios almacenados.',
    summaryEn: 'Technical guide and built-in interface to deploy new program versions, code patches, or update system software without losing stored inventory.',
    featuresEs: [
      {
        name: '¿Cómo funciona la carga de actualizaciones?',
        desc: '1. PWA Service Worker: En navegadores y PWA, al compilar una nueva versión el Service Worker detecta los cambios y muestra la alerta "Nueva versión disponible: [Actualizar]".\n2. Carga de Paquetes (.bundle / .json / .patch): Desde el menú de Ajustes puedes subir archivos de parche con nuevas funciones o actualizaciones del esquema de datos.\n3. Servidor Node.js Backend: Si ejecutas el servidor en Termux o Linux, el endpoint `/api/update` permite actualizar automáticamente vía Git (`git pull && npm run build`).',
      },
      {
        name: 'Gestor de Versiones Integrado',
        desc: 'Verificación del número de compilación actual, comprobación en línea e instalador de archivos de actualización de software.',
      },
    ],
    featuresEn: [
      {
        name: 'How do update uploads work?',
        desc: '1. PWA Service Worker: In browsers & PWAs, when compiling a new version the Service Worker detects code changes and displays "New Version Available: [Update Now]".\n2. Update Package Upload (.bundle / .json / .patch): From the Settings menu you can upload patch files containing new features or schema updates.\n3. Node.js Backend Server: If running on Termux or Linux server, the `/api/update` endpoint allows automated updates via Git (`git pull && npm run build`).',
      },
      {
        name: 'Built-in Version Manager',
        desc: 'Checks current build version, verifies online updates, and installs software update packages.',
      },
    ],
  },
];

export const UserManual: React.FC<UserManualProps> = ({ onClose, onOpenUpdateCenter }) => {
  const [lang, setLang] = useState<ManualLanguage>('es');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openSectionId, setOpenSectionId] = useState<string>('scanner-engine');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return USER_MANUAL_SECTIONS;
    const q = searchQuery.toLowerCase();
    return USER_MANUAL_SECTIONS.filter((sec) => {
      const title = lang === 'es' ? sec.titleEs : sec.titleEn;
      const summary = lang === 'es' ? sec.summaryEs : sec.summaryEn;
      const feats = (lang === 'es' ? sec.featuresEs : sec.featuresEn).map((f) => `${f.name} ${f.desc}`).join(' ');
      return title.toLowerCase().includes(q) || summary.toLowerCase().includes(q) || feats.toLowerCase().includes(q);
    });
  }, [searchQuery, lang]);

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans animate-in fade-in duration-200">
      {/* Top Banner Header with Language Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                {lang === 'es' ? 'Manual de Usuario y Guía de Funciones' : 'User Manual & Feature Guide'}
              </h2>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold px-2 py-0.5 rounded-full">
                {lang === 'es' ? 'BILINGÜE' : 'BILINGUAL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'es'
                ? 'Documentación oficial detallada de capacidades, opciones y actualizaciones.'
                : 'Official detailed documentation of capabilities, options, and updates.'}
            </p>
          </div>
        </div>

        {/* Language Switcher Buttons */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLang('es')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              lang === 'es'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🇲🇽</span>
            <span>Español</span>
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              lang === 'en'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🇺🇸</span>
            <span>English</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'es'
              ? 'Buscar en el manual (ej. merma, caducidad, recharts, actualizar...)'
              : 'Search in manual (e.g. merma, expiration, recharts, update...)'
          }
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Manual Accordion Sections */}
      <div className="flex flex-col gap-3">
        {filteredSections.map((sec) => {
          const isOpen = openSectionId === sec.id;
          const Icon = sec.icon;
          const title = lang === 'es' ? sec.titleEs : sec.titleEn;
          const category = lang === 'es' ? sec.categoryEs : sec.categoryEn;
          const summary = lang === 'es' ? sec.summaryEs : sec.summaryEn;
          const features = lang === 'es' ? sec.featuresEs : sec.featuresEn;
          const tips = lang === 'es' ? sec.tipsEs : sec.tipsEn;

          return (
            <div
              key={sec.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all shadow-sm"
            >
              {/* Section Header Button */}
              <button
                type="button"
                onClick={() => setOpenSectionId(isOpen ? '' : sec.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${sec.bgColor} ${sec.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {category}
                    </span>
                    <h3 className="text-sm font-black text-slate-100">{title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono hidden sm:block">
                    {features.length} {lang === 'es' ? 'funciones' : 'features'}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Expandable Section Content */}
              {isOpen && (
                <div className="p-4 pt-0 border-t border-slate-800/60 flex flex-col gap-4 animate-in fade-in duration-150">
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {summary}
                  </p>

                  <div className="flex flex-col gap-2.5">
                    <h4 className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'es' ? 'Detalle de Funciones y Capacidades' : 'Detailed Capabilities'}</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-2">
                      {features.map((feat, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{feat.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed pl-5 whitespace-pre-line">
                            {feat.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {tips && tips.length > 0 && (
                    <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 flex flex-col gap-1 text-xs">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{lang === 'es' ? 'Recomendaciones Pro:' : 'Pro Tips:'}</span>
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-400 flex flex-col gap-0.5">
                        {tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sec.id === 'system-updates' && onOpenUpdateCenter && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={onOpenUpdateCenter}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>
                          {lang === 'es'
                            ? 'Abrir Centro de Actualizaciones de Software'
                            : 'Open Software Update Center'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
