import { useMemo, useState, useCallback } from 'react';

export function usePagination<T>(items: T[], pageSize: number) {
    const [page, setPage] = useState(1);
    const visible = useMemo(() => items.slice(0, page * pageSize), [items, page, pageSize]);
    const hasMore = visible.length < items.length;
    const loadMore = useCallback(() => setPage(p => p + 1), []);
    const reset = useCallback(() => setPage(1), []);
    return { visible, hasMore, loadMore, reset, total: items.length };
}
