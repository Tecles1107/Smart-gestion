import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { InventoryItem } from '../types/inventory';
import { Package, Layers, Calendar, Boxes, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  allAreaItems: Record<string, InventoryItem[]>;
  areasList: string[];
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export const Dashboard: React.FC<DashboardProps> = ({ allAreaItems, areasList }) => {
  // 1. Calculate stock distribution per area
  const areaDistributionData = React.useMemo(() => {
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
      });
  }, [allAreaItems, areasList]);

  // 2. Aggregate top 8 products by stock count across all non-general areas
  const topProductsData = React.useMemo(() => {
    const map = new Map<string, { name: string; sku: string; totalPzs: number; area: string }>();

    Object.entries(allAreaItems).forEach(([areaKey, items]) => {
      if (areaKey === 'Inventario_General') return;
      items.forEach((it) => {
        const key = it.Código;
        const current = map.get(key);
        const pzs = Number(it.Total) || 0;
        if (current) {
          current.totalPzs += pzs;
        } else {
          map.set(key, {
            name: it.Nombre && it.Nombre !== 'S/N' ? it.Nombre : `Código: ${it.Código}`,
            sku: it.Código,
            totalPzs: pzs,
            area: areaKey.replace(/_/g, ' '),
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalPzs - a.totalPzs)
      .slice(0, 8);
  }, [allAreaItems]);

  // 3. Pending expiration alerts analysis
  const expirationData = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expired = 0;
    let criticalDays = 0; // 1-3 days
    let warningDays = 0; // 4-7 days
    let healthy = 0;

    Object.values(allAreaItems).forEach((items) => {
      items.forEach((it) => {
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
    });

    return [
      { name: 'Vencidos', count: expired, color: '#f43f5e' },
      { name: 'Criticos (1-3 d)', count: criticalDays, color: '#f97316' },
      { name: 'Proximos (4-7 d)', count: warningDays, color: '#eab308' },
      { name: 'Saludables (>7 d)', count: healthy, color: '#10b981' },
    ].filter((d) => d.count > 0);
  }, [allAreaItems]);

  // General Summary Metrics
  const globalMetrics = React.useMemo(() => {
    let totalPzs = 0;
    let totalBultos = 0;
    const skuSet = new Set<string>();

    Object.entries(allAreaItems).forEach(([areaKey, items]) => {
      if (areaKey === 'Inventario_General') return;
      items.forEach((it) => {
        totalPzs += Number(it.Total) || 0;
        totalBultos += Number(it.Bultos) || 0;
        if (it.Código) skuSet.add(it.Código);
      });
    });

    return {
      totalPzs,
      totalBultos,
      totalSKUs: skuSet.size,
      totalAreas: areasList.filter((a) => a !== 'Inventario_General').length,
    };
  }, [allAreaItems, areasList]);

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

      {/* Expiration Alerts Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Estado de Caducidades Registradas</span>
          </h3>
        </div>

        {expirationData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No hay productos registrados con fecha de caducidad para analizar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expirationData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {expirationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-300">
                Resumen de caducidad sobre inventarios monitoreados:
              </p>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                {expirationData.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {item.count} productos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
