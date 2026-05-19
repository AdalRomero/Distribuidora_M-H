import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../services/DB/indexBD';
import type Documento from '../services/DB/models/registros/documento';
import type DocumentoDetalle from '../services/DB/models/registros/documentoDetalle';
import type Producto from '../services/DB/models/catalogo/producto';
import type Familia from '../services/DB/models/bases/familia';
import type Cliente from '../services/DB/models/bases/cliente';

// ─── Types ───────────────────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardFilter {
  periodA: DateRange;
  periodB: DateRange | null; // Null if no comparison is needed
  trendGroupBy: 'hour' | 'day' | 'month'; // How to group trend data
}

export interface TopProduct {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface TopFamily {
  id: string;
  name: string;
  revenue: number;
  value: number; // alias for Recharts compatibility
}

export interface TopClient {
  id: string;
  name: string;
  amount: number;
}

export interface CurrencyEntry {
  name: string;
  value: number;
}

export interface SalesTrendEntry {
  name: string;
  total: number;
  sortKey: number; // epoch ms for reliable chronological sorting
}

export interface DashboardStats {
  salesTotal: number;
  salesPrevTotal: number;
  salesChange: number;

  documentsGenerated: number;
  documentsPrevGenerated: number;
  documentsChange: number;

  pendingAmount: number;
  pendingPrevAmount: number;
  pendingChange: number;

  cancelledAmount: number;
  cancelledPrevAmount: number;
  cancelledChange: number;

  topProducts: TopProduct[];
  topFamilies: TopFamily[];
  topClients: TopClient[];

  currencyBreakdown: CurrencyEntry[];
  salesTrend: SalesTrendEntry[];

  isLoading: boolean;
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function calcPercentChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function getTrendLabel(date: Date, groupBy: 'hour' | 'day' | 'month'): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  switch (groupBy) {
    case 'hour':
      return `${pad(date.getHours())}:00`;
    case 'day':
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
    case 'month':
      return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}

function getTrendSortKey(date: Date, groupBy: 'hour' | 'day' | 'month'): number {
  switch (groupBy) {
    case 'hour':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
    case 'day':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    case 'month':
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }
}

// ─── Initial State ───────────────────────────────────────────────────

const INITIAL_STATS: DashboardStats = {
  salesTotal: 0, salesPrevTotal: 0, salesChange: 0,
  documentsGenerated: 0, documentsPrevGenerated: 0, documentsChange: 0,
  pendingAmount: 0, pendingPrevAmount: 0, pendingChange: 0,
  cancelledAmount: 0, cancelledPrevAmount: 0, cancelledChange: 0,
  topProducts: [], topFamilies: [], topClients: [],
  currencyBreakdown: [], salesTrend: [],
  isLoading: true, error: null,
};

// ─── Hook ────────────────────────────────────────────────────────────

export function useDashboardStats(filter: DashboardFilter): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);

  const fetchStats = useCallback(async (currentFilter: DashboardFilter, mounted: { value: boolean }) => {
    if (mounted.value) setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { periodA, periodB, trendGroupBy } = currentFilter;

      // ── Fetch documents ────────────────────────────────────────
      const docsCollection = database.get<Documento>('documentos');

      // Fetch strictly within bounds to save resources! No "fetch all" ever.
      const currentDocs = await docsCollection.query(
        Q.where('created_at', Q.between(periodA.start.getTime(), periodA.end.getTime()))
      ).fetch();

      const prevDocs = periodB
        ? await docsCollection.query(
            Q.where('created_at', Q.between(periodB.start.getTime(), periodB.end.getTime()))
          ).fetch()
        : [];

      // ── Aggregate current period ───────────────────────────────
      let salesTotal = 0;
      let pendingAmount = 0;
      let cancelledAmount = 0;

      const clientsMap = new Map<string, { amount: number; name: string }>();
      const currencyMap = new Map<string, number>();
      const trendMap = new Map<string, { total: number; sortKey: number }>();

      for (const doc of currentDocs) {
        const total = doc.total || 0;
        const status = doc.estado;
        const clientId = (doc as any)._raw.cliente_id as string;

        if (status === 'cancelado') {
          cancelledAmount += total;
        } else {
          salesTotal += total;

          // Client aggregation
          const existing = clientsMap.get(clientId);
          if (existing) {
            existing.amount += total;
          } else {
            clientsMap.set(clientId, { amount: total, name: '' });
          }

          // Currency aggregation (hardcoded MXN)
          const currency = 'MXN';
          currencyMap.set(currency, (currencyMap.get(currency) || 0) + total);

          // Trend aggregation
          const docDate = new Date((doc as any)._raw.created_at);
          const label = getTrendLabel(docDate, trendGroupBy);
          const sortKey = getTrendSortKey(docDate, trendGroupBy);
          const trendEntry = trendMap.get(label);
          if (trendEntry) {
            trendEntry.total += total;
          } else {
            trendMap.set(label, { total, sortKey });
          }
        }

        if (status === 'pendiente') {
          pendingAmount += total;
        }
      }

      // ── Aggregate previous period ──────────────────────────────
      let salesPrevTotal = 0;
      let pendingPrevAmount = 0;
      let cancelledPrevAmount = 0;

      for (const doc of prevDocs) {
        const total = doc.total || 0;
        const status = doc.estado;

        if (status === 'cancelado') {
          cancelledPrevAmount += total;
        } else {
          salesPrevTotal += total;
        }
        if (status === 'pendiente') {
          pendingPrevAmount += total;
        }
      }

      // ── Percent changes ────────────────────────────────────────
      const salesChange = calcPercentChange(salesTotal, salesPrevTotal);
      const documentsChange = calcPercentChange(currentDocs.length, prevDocs.length);
      const pendingChange = calcPercentChange(pendingAmount, pendingPrevAmount);
      const cancelledChange = calcPercentChange(cancelledAmount, cancelledPrevAmount);

      // ── Top Products & Top Families ────────────────────────────
      const validDocIds = currentDocs
        .filter(d => d.estado !== 'cancelado')
        .map(d => d.id);

      const productsMap = new Map<string, { qty: number; name: string; revenue: number }>();
      const familiesMap = new Map<string, { revenue: number; name: string }>();

      if (validDocIds.length > 0) {
        // Optimized: only fetch details for active documents
        const detalles = await database.get<DocumentoDetalle>('documentos_detalles')
          .query(Q.where('documento_id', Q.oneOf(validDocIds)))
          .fetch();

        for (const det of detalles) {
          const prodId = (det as any)._raw.producto_id as string;
          const qty = det.cantidad || 0;
          const lineTotal = (det.precioUnitarioAplicado || 0) * qty;

          const existing = productsMap.get(prodId);
          if (existing) {
            existing.qty += qty;
            existing.revenue += lineTotal;
          } else {
            productsMap.set(prodId, { qty, name: '', revenue: lineTotal });
          }
        }

        // Fetch product names + family mapping in single query
        const prodIds = Array.from(productsMap.keys());
        if (prodIds.length > 0) {
          const productos = await database.get<Producto>('productos')
            .query(Q.where('id', Q.oneOf(prodIds)))
            .fetch();

          for (const prod of productos) {
            const entry = productsMap.get(prod.id);
            if (entry) {
              entry.name = prod.descripcion || `Producto ${prod.id.slice(0, 6)}`;

              const famId = (prod as any)._raw.familia_id as string;
              if (famId) {
                const famEntry = familiesMap.get(famId);
                if (famEntry) {
                  famEntry.revenue += entry.revenue;
                } else {
                  familiesMap.set(famId, { revenue: entry.revenue, name: '' });
                }
              }
            }
          }
        }

        // Fetch family names
        const famIds = Array.from(familiesMap.keys());
        if (famIds.length > 0) {
          const familias = await database.get<Familia>('familias')
            .query(Q.where('id', Q.oneOf(famIds)))
            .fetch();

          for (const fam of familias) {
            const entry = familiesMap.get(fam.id);
            if (entry) {
              entry.name = (fam as any).nombre || `Familia ${fam.id.slice(0, 6)}`;
            }
          }
        }
      }

      // Fetch client names
      const clientIds = Array.from(clientsMap.keys());
      if (clientIds.length > 0) {
        const clientes = await database.get<Cliente>('clientes')
          .query(Q.where('id', Q.oneOf(clientIds)))
          .fetch();

        for (const cli of clientes) {
          const entry = clientsMap.get(cli.id);
          if (entry) {
            entry.name = cli.nombre || `Cliente ${cli.id.slice(0, 6)}`;
          }
        }
      }

      // ── Build final arrays ─────────────────────────────────────
      const topProducts: TopProduct[] = Array.from(productsMap.entries())
        .map(([id, v]) => ({ id, name: v.name, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      const topFamilies: TopFamily[] = Array.from(familiesMap.entries())
        .map(([id, v]) => ({ id, name: v.name, revenue: v.revenue, value: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const topClients: TopClient[] = Array.from(clientsMap.entries())
        .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      const currencyBreakdown: CurrencyEntry[] = Array.from(currencyMap.entries())
        .map(([name, value]) => ({ name, value }));

      const salesTrend: SalesTrendEntry[] = Array.from(trendMap.entries())
        .map(([name, v]) => ({ name, total: v.total, sortKey: v.sortKey }))
        .sort((a, b) => a.sortKey - b.sortKey);

      // ── Commit state ───────────────────────────────────────────
      if (mounted.value) {
        setStats({
          salesTotal, salesPrevTotal, salesChange,
          documentsGenerated: currentDocs.length,
          documentsPrevGenerated: prevDocs.length,
          documentsChange,
          pendingAmount, pendingPrevAmount, pendingChange,
          cancelledAmount, cancelledPrevAmount, cancelledChange,
          topProducts, topFamilies, topClients,
          currencyBreakdown, salesTrend,
          isLoading: false, error: null,
        });
      }
    } catch (err) {
      console.error('Dashboard stats fetch error:', err);
      if (mounted.value) {
        setStats(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Error desconocido al cargar datos.',
        }));
      }
    }
  }, []);

  // Use JSON.stringify to trigger re-fetches only when dates actually change
  useEffect(() => {
    const mounted = { value: true };
    fetchStats(filter, mounted);
    return () => { mounted.value = false; };
  }, [JSON.stringify(filter), fetchStats]);

  return stats;
}
