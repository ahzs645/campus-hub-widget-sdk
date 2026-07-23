export const DEFAULT_LIBCAL_AVAILABILITY_URL =
  'https://unbc.libcal.com/spaces/availability/grid';

export interface LibCalSlot {
  start?: string;
  end?: string;
  itemId?: number;
  className?: string;
}

export interface LibCalGridResponse {
  slots: LibCalSlot[];
  bookings: unknown[];
  windowEnd?: boolean;
  isPreCreatedBooking?: boolean;
}

export interface LibCalAvailabilityQuery {
  lid: string | number;
  gid: string | number;
  start: string;
  end: string;
  pageSize: string | number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeLibCalGridResponse(payload: unknown): LibCalGridResponse {
  if (typeof payload === 'string') {
    try {
      return normalizeLibCalGridResponse(JSON.parse(payload) as unknown);
    } catch {
      return { slots: [], bookings: [] };
    }
  }

  const record = asRecord(payload);
  const rawSlots = Array.isArray(record?.slots) ? record.slots : [];
  const slots = rawSlots.flatMap((value) => {
    const slot = asRecord(value);
    const itemId = Number(slot?.itemId);
    if (!slot || !Number.isFinite(itemId)) return [];
    return [{
      start: typeof slot.start === 'string' ? slot.start : undefined,
      end: typeof slot.end === 'string' ? slot.end : undefined,
      itemId,
      className: typeof slot.className === 'string' ? slot.className : undefined,
    }];
  });

  return {
    slots,
    bookings: Array.isArray(record?.bookings) ? record.bookings : [],
    windowEnd: typeof record?.windowEnd === 'boolean' ? record.windowEnd : undefined,
    isPreCreatedBooking: typeof record?.isPreCreatedBooking === 'boolean'
      ? record.isPreCreatedBooking
      : undefined,
  };
}

export function createLibCalAvailabilityFormData(
  query: LibCalAvailabilityQuery,
): FormData {
  const formData = new FormData();
  formData.set('lid', String(query.lid));
  formData.set('gid', String(query.gid));
  formData.set('start', query.start);
  formData.set('end', query.end);
  formData.set('pageSize', String(query.pageSize));
  return formData;
}

function formatDateKey(date: Date): string {
  const pad2 = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function createDefaultLibCalPreviewRequest(): RequestInit {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3);
  return {
    method: 'POST',
    body: createLibCalAvailabilityFormData({
      lid: 1637,
      gid: 2928,
      start: formatDateKey(startDate),
      end: formatDateKey(endDate),
      pageSize: 99,
    }),
  };
}
