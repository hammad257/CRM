export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  const safeLimit = limit > 0 ? limit : 1;
  const totalPages = Math.ceil(totalItems / safeLimit);
  return {
    page,
    limit: safeLimit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
