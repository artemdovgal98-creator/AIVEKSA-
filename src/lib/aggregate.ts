/**
 * Totalum returns aggregates as: { data: [ { _aggregate: { _count, _sum: {...} } } ] }
 * These helpers normalise that shape so counts are never read from `.data.length`.
 */
export function readAggregate(result: any): Record<string, any> {
  const data = result?.data;
  if (Array.isArray(data)) return data[0]?._aggregate || {};
  return data?._aggregate || {};
}

export function readCount(result: any): number {
  const value = readAggregate(result)._count;
  return typeof value === "number" ? value : 0;
}

export function readSum(result: any, field: string): number {
  const value = readAggregate(result)._sum?.[field];
  return typeof value === "number" ? value : 0;
}
