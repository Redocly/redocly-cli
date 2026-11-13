import { useInfiniteQuery } from '@tanstack/react-query';

import type { Order } from './pagination.js';
import { listReceiptsInfiniteOptions } from './pagination.tanstack.js';

export function useReceipts() {
  const query = useInfiniteQuery(listReceiptsInfiniteOptions({ query: { limit: 2 } }));
  const receipts: Order[] | undefined = query.data?.pages.flatMap((page) => page.receipts);
  return receipts;
}
