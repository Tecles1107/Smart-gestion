import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { InventoryItem, MovementRecord, MermaRecord } from '../types/inventory';
import { calculateStockHealth, computeHistoricalFlow, FlowOptions } from '../utils/inventoryLogic';
import {
  Package,
  Layers,
  Calendar,
  Boxes,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  BarChart2,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  CalendarRange,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  allAreaItems: Record<string, InventoryItem[]>;
  areasList: string[];
  mermaRecords?: MermaRecord[];
  movements?: MovementRecord[];
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export const Dashboard: React.FC<DashboardProps> = ({ allAreaItems, areasList, mermaRecords, movements }) => {
  // Line chart interactive controls
  const [timeRange, setTimeRange] = React.useState<'7d' | '14d' | '30d' | 'meses'>('14d');
  const [flowMetric, setFlowMetric] = React.useState<'piezas' | 'bultos' | 'valor'>('piezas');
  const [showEntradas, setShowEntradas] = React.useState<boolean>(true);
  const [showSalidas, setShowSalidas] = React.useState<boolean>(true);
  const [showNetLine, setShowNetLine] = React.useState<boolean>(true);

  // Compute Historical Flow data for LineChart
  const historicalFlowData = React.useMemo(() => {
    let movs = movements;
    if (!movs || movs.length === 0) {
      try {
        const raw = localStorage.getItem('inventario_movement_history');
        if (raw) movs = JSON.parse(raw);
      } catch {
        movs = [];
      }
    }

    let mermas = mermaRecords;
    if (!mermas || mermas.length === 0) {
      try {
        const raw = localStorage.getItem('inventario_merma_records');
        if (raw) mermas = JSON.parse(raw);
      } catch {
        mermas = [];
      }
    }

    const flatItems = Object.values(allAreaItems).flat();

    return computeHistoricalFlow(movs || [], flatItems, mermas || [], {
      range: timeRange,
      metric: flowMetric,
    });
  }, [movements, mermaRecords, allAreaItems, timeRange, flowMetric]);

  // Compute stats for current time horizon
  const flowStats = React.useMemo(() => {
    const totalEntradas = historicalFlowData.reduce((acc, d) => acc + (d.entradas || 0), 0);
    const totalSalidas = historicalFlowData.reduce((acc, d) => acc + (d.salidas || 0), 0);
    const balanceNeto = totalEntradas - totalSalidas;
    const ratio = totalEntradas > 0 ? Math.round((totalSalidas / totalEntradas) * 100) : 0;
    return {
      totalEntradas,
      totalSalidas,
      balanceNeto,
      rotacion: ratio,
    };
  }, [historicalFlowData]);

  // Check if non-general areas are populated or if data resides in Inventario_General
  const nonGeneralCount = React.useMemo(() => {
    return areasList
      .filter((a) => a !== 'Inventario_General')
      .reduce((sum, a) => sum + (allAreaItems[a]?.length || 0), 0);
  }, [allAreaItems, areasList]);

  const useGeneralAsBase = nonGeneralCount === 0 && (allAreaItems['Inventario_General']?.length || 0) > 0;

  // 1. Calculate stock distribution per area
  const areaDistributionData = React.useMemo(() => {
    if (useGeneralAsBase) {
      // Group items in Inventario_General by their internal Área property
      const generalItems = allAreaItems['Inventario_General'] || [];
      const subAreaMap = new Map<string, { piezas: number; bultos: number; skus: number }>();
      generalItems.forEach((it) => {
        const areaName = (it.Área || 'General').trim();
        const current = subAreaMap.get(areaName) || { piezas: 0, bultos: 0, skus: 0 };
        current.piezas += Number(it.Total) || 0;
        current.bultos += Number(it.Bultos) || 0;
        current.skus += 1;
        subAreaMap.set(areaName, current);
      });
      return Array.from(subAreaMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.piezas - a.piezas)
        .slice(0, 8);
    }

    return areasList
      .filter((a) => a !== 'Inventario_General')
      .map((areaKey) => {
        const items = allAreaItems[areaKey] || [];
        const totalPzs = items.reduce((sum, item) => sum + (Number(item.Total) || 0), 0);
        const totalBultos = items.reduce((sum, item) => sum + (Number(item.Bultos) || 0), 0);
        return {
          name: areaKey.replace(/_/g, ' '),
          piezas: totalPzs,
          bultos: totalBultos,
          skus: items.length,
        };
      })
      .filter((d) => d.piezas > 0 || d.skus > 0);
  }, [allAreaItems, areasList, useGeneralAsBase]);

  // 2. Aggregate top 8 products by stock count across all areas
  const topProductsData = React.useMemo(() => {
    const map = new Map<string, { name: string; sku: string; totalPzs: number; area: string }>();

    const targetEntries = useGeneralAsBase
      ? [['Inventario_General', allAreaItems['Inventario_General'] || []] as [string, InventoryItem[]]]
      : Object.entries(allAreaItems).filter(([k]) => k !== 'Inventario_General');

    targetEntries.forEach(([areaKey, items]) => {
      items.forEach((it) => {
        const key = it.Código;
        if (!key) return;
        const current = map.get(key);
        const pzs = Number(it.Total) || 0;
        if (current) {
          current.totalPzs += pzs;
        } else {
          map.set(key, {
            name: it.Nombre && it.Nombre !== 'S/N' ? it.Nombre : `Código: ${it.Código}`,
            sku: it.Código,
            totalPzs: pzs,
            area: it.Área || areaKey.replace(/_/g, ' '),
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalPzs - a.totalPzs)
      .slice(0, 8);
  }, [allAreaItems, useGeneralAsBase]);

  // 3. Pending expiration alerts analysis
  const expirationData = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expired = 0;
    let criticalDays = 0; // 1-3 days
    let warningDays = 0; // 4-7 days
    let healthy = 0;

    const targetItems = useGeneralAsBase
      ? allAreaItems['Inventario_General'] || []
      : Object.entries(allAreaItems)
          .filter(([k]) => k !== 'Inventario_General')
          .flatMap(([, items]) => items);

    targetItems.forEach((it) => {
      if (it.Caducidad) {
        const exp = new Date(it.Caducidad);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) expired++;
        else if (diffDays <= 3) criticalDays++;
        else if (diffDays <= 7) warningDays++;
        else healthy++;
      }
    });

    return [
      { name: 'Vencidos', count: expired, color: '#f43f5e' },
      { name: 'Críticos (1-3 d)', count: criticalDays, color: '#f97316' },
      { name: 'Próximos (4-7 d)', count: warningDays, color: '#eab308' },
      { name: 'Saludables (>7 d)', count: healthy, color: '#10b981' },
    ].filter((d) => d.count > 0);
  }, [allAreaItems, useGeneralAsBase]);

  // 4. Value distribution per area
  const valueDistributionData = React.useMemo(() => {
     return areasList
      .filter((a) => a !== 'Inventario_General')
      .map((areaKey) => {
        const items = allAreaItems[areaKey] || [];
        const totalVal = items.reduce((sum, item) => sum + ((Number(item.Total) || 0) * (Number(item.Precio) || 0)), 0);
        return {
          name: areaKey.replace(/_/g, ' '),
          value: totalVal,
        };
      })
      .filter((d) => d.value > 0);
  }, [allAreaItems, areasList]);

  // 5. Registration timeline (Last 14 days)
  const timelineData = React.useMemo(() => {
    const map = new Map<string, number>();
    const targetItems = Object.values(allAreaItems).flat();
    
    // Sort and limit to last 14 days
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      map.set(dateStr, 0);
    }

    targetItems.forEach(it => {
       // Expecting Fecha_Captura like "DD/MM HH:mm" or ISO
       // This is a bit brittle, we'll try to parse day/month
       try {
         const [datePart] = it.Fecha_Captura.split(' ');
         const [day, month] = datePart.split('/');
         const d = new Date();
         if (day && month) {
           d.setMonth(parseInt(month) - 1);
           d.setDate(parseInt(day));
           const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
           if (map.has(dateStr)) {
             map.set(dateStr, (map.get(dateStr) || 0) + (Number(it.Total) || 0));
           }
         }
       } catch { /* ignore parse errors */ }
    });

    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [allAreaItems]);

  // General Summary Metrics & Stock Health Breakdown
  const globalMetrics = React.useMemo(() => {
    let totalPzs = 0;
    let totalBultos = 0;
    const skuSet = new Set<string>();
    let criticalCount = 0;
    let lowCount = 0;
    let optimalCount = 0;
    let excessCount = 0;

    const targetItems = useGeneralAsBase
      ? allAreaItems['Inventario_General'] || []
      : Object.entries(allAreaItems)
          .filter(([k]) => k !== 'Inventario_General')
          .flatMap(([, items]) => items);

    targetItems.forEach((it) => {
      const pzs = Number(it.Total) || 0;
      totalPzs += pzs;
      totalBultos += Number(it.Bultos) || 0;
      if (it.Código) skuSet.add(it.Código);

      const health = calculateStockHealth(pzs, Number(it.Precio) || 0, it.Caducidad);
      if (health.status === 'critical') criticalCount++;
      else if (health.status === 'low') lowCount++;
      else if (health.status === 'excess') excessCount++;
      else optimalCount++;
    });

    return {
      totalPzs,
      totalBultos,
      totalSKUs: skuSet.size,
      totalAreas: useGeneralAsBase ? areaDistributionData.length || 1 : areasList.filter((a) => a !== 'Inventario_General').length,
      health: {
        criticalCount,
        lowCount,
        optimalCount,
        excessCount,
      },
    };
  }, [allAreaItems, areasList, useGeneralAsBase, areaDistributionData]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Metric Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Piezas</p>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{globalMetrics.totalPzs.toLocaleString()}</p>
          </div>
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bultos</p>
            <p className="text-2xl font-black text-blue-400 font-mono mt-0.5">{globalMetrics.totalBultos.toLocaleString()}</p>
          </div>
          <div className="p-2.5 bg-blue-950/60 border border-blue-800/50 rounded-lg text-blue-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SKUs Únicos</p>
            <p className="text-2xl font-black text-cyan-400 font-mono mt-0.5">{globalMetrics.totalSKUs}</p>
          </div>
          <div className="p-2.5 bg-cyan-950/60 border border-cyan-800/50 rounded-lg text-cyan-400">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Áreas Registradas</p>
            <p className="text-2xl font-black text-purple-400 font-mono mt-0.5">{globalMetrics.totalAreas}</p>
          </div>
          <div className="p-2.5 bg-purple-950/60 border border-purple-800/50 rounded-lg text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Health Analytics Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Salud del Inventario y Estado de Seguridad</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Análisis en Tiempo Real</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-400 font-bold block">🟢 ÓPTIMO</span>
            <span className="text-xl font-black text-emerald-300 mt-1 block">
              {globalMetrics.health.optimalCount} ítems
            </span>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5">
            <span className="text-[10px] text-amber-400 font-bold block">🟡 STOCK BAJO</span>
            <span className="text-xl font-black text-amber-300 mt-1 block">
              {globalMetrics.health.lowCount} ítems
            </span>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
            <span className="text-[10px] text-rose-400 font-bold block">🔴 CRÍTICO</span>
            <span className="text-xl font-black text-rose-300 mt-1 block">
              {globalMetrics.health.criticalCount} ítems
            </span>
          </div>

          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2.5">
            <span className="text-[10px] text-blue-400 font-bold block">🔵 SOBRESTOCK</span>
            <span className="text-xl font-black text-blue-300 mt-1 block">
              {globalMetrics.health.excessCount} ítems
            </span>
          </div>
        </div>
      </div>

      {/* HISTORICAL FLOW LINE CHART (ENTRADAS Y SALIDAS EN EL TIEMPO) */}
      <div className="bg-slate-900 border-2 border-slate-800 hover:border-slate-700/80 transition-all rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
        {/* Header with Title and Interactive Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <span>Flujo Histórico de Entradas y Salidas de Productos</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono font-bold px-2 py-0.5 rounded-full">
                    RECHARTS PRO
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visualización temporal de recepción, despachos, rotación de mercancía y mermas
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector (Piezas, Bultos, Valor) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setFlowMetric('piezas')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  flowMetric === 'piezas'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Piezas
              </button>
              <button
                type="button"
                onClick={() => setFlowMetric('bultos')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  flowMetric === 'bultos'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bultos
              </button>
              <button
                type="button"
                onClick={() => setFlowMetric('valor')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  flowMetric === 'valor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Valor ($)
              </button>
            </div>

            {/* Time Horizon Selector (7D, 14D, 30D, 6M) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === '7d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('14d')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === '14d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                14D
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === '30d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('meses')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === 'meses' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                6 Meses
              </button>
            </div>
          </div>
        </div>

        {/* Period Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Entradas</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {flowMetric === 'valor'
                  ? `$${flowStats.totalEntradas.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : `+${flowStats.totalEntradas.toLocaleString('es-MX')}`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {flowMetric === 'valor' ? 'MXN' : flowMetric === 'bultos' ? 'bultos' : 'pzs'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Total Salidas / Merma</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-400 font-mono">
                {flowMetric === 'valor'
                  ? `$${flowStats.totalSalidas.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : `-${flowStats.totalSalidas.toLocaleString('es-MX')}`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {flowMetric === 'valor' ? 'MXN' : flowMetric === 'bultos' ? 'bultos' : 'pzs'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Balance Neto</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`text-xl font-black font-mono ${
                  flowStats.balanceNeto >= 0 ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                {flowStats.balanceNeto >= 0 ? '+' : ''}
                {flowMetric === 'valor'
                  ? `$${flowStats.balanceNeto.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : flowStats.balanceNeto.toLocaleString('es-MX')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {flowMetric === 'valor' ? 'MXN' : flowMetric === 'bultos' ? 'bultos' : 'pzs'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Índice Rotación</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-300 font-mono">
                {flowStats.rotacion}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">salida/entrada</span>
            </div>
          </div>
        </div>

        {/* Legend and Visibility Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEntradas(!showEntradas)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                showEntradas
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-600 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Entradas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSalidas(!showSalidas)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                showSalidas
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                  : 'bg-slate-950 border-slate-800 text-slate-600 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Salidas y Mermas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNetLine(!showNetLine)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                showNetLine
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-600 line-through'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-dashed border-white" />
              <span>Balance Neto</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Histórico activo: {historicalFlowData.length} puntos
          </div>
        </div>

        {/* The Recharts LineChart */}
        <div className="h-80 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={historicalFlowData}
              margin={{ top: 15, right: 20, left: -10, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                dy={6}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
                tickFormatter={(val: any) => {
                  const num = Number(val);
                  if (flowMetric === 'valor') {
                    return Math.abs(num) >= 1000 ? `$${(num / 1000).toFixed(0)}k` : `$${num}`;
                  }
                  return Math.abs(num) >= 1000 ? `${(num / 1000).toFixed(1)}k` : `${num}`;
                }}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload;
                    const isPieces = flowMetric === 'piezas';
                    const isValor = flowMetric === 'valor';
                    const unit = isValor ? '$' : isPieces ? 'pzs' : 'bultos';

                    const formatVal = (v: number) =>
                      isValor
                        ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `${Number(v).toLocaleString('es-MX')} ${unit}`;

                    return (
                      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl min-w-[210px] text-xs font-sans">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {data?.date || label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{data?.fullDate}</span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                              Entradas:
                            </span>
                            <span className="font-mono font-bold text-emerald-300">
                              +{formatVal(data?.entradas || 0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
                              Salidas / Merma:
                            </span>
                            <span className="font-mono font-bold text-rose-300">
                              -{formatVal(data?.salidas || 0)}
                            </span>
                          </div>

                          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Balance Neto:</span>
                            <span
                              className={`font-mono font-black px-1.5 py-0.5 rounded ${
                                (data?.neto || 0) >= 0
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                              }`}
                            >
                              {(data?.neto || 0) >= 0 ? '+' : ''}
                              {formatVal(data?.neto || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              {showEntradas && (
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1, stroke: '#0f172a' }}
                  activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}
              {showSalidas && (
                <Line
                  type="monotone"
                  dataKey="salidas"
                  name="Salidas"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#f43f5e', strokeWidth: 1, stroke: '#0f172a' }}
                  activeDot={{ r: 7, stroke: '#f43f5e', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}
              {showNetLine && (
                <Line
                  type="monotone"
                  dataKey="neto"
                  name="Flujo Neto"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 1, stroke: '#0f172a' }}
                  activeDot={{ r: 6, stroke: '#38bdf8', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Bar Chart: Stock Distribution by Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-400" />
              <span>Distribución de Inventario por Área (Piezas)</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} pzs`, 'Piezas Totales']}
                />
                <Bar dataKey="piezas" radius={[6, 6, 0, 0]}>
                  {areaDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Bar Chart: Top Products by Stock Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Top Productos con Mayor Stock Existente</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} pzs`, 'Existencia']}
                />
                <Bar dataKey="totalPzs" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Value Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Valor Económico por Almacén</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={valueDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {valueDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Valor Estimado']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Expiration Urgency Status Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Urgencia de Caducidades (Monitoreo)</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expirationData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {expirationData.map((entry, index) => (
                    <Cell key={`exp-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`${value} ítems`, 'Cantidad']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
