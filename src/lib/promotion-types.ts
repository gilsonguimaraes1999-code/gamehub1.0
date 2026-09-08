import type { LinkPorCidade, Promocao } from "./sghub-api";

const padDatePart = (value: number) => String(value).padStart(2, "0");

export function parseLocalDateTime(value?: string): {
  date?: Date;
  hour: number;
  minute: number;
  second: number;
} {
  const match = value?.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return { date: undefined, hour: 0, minute: 0, second: 0 };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { date: undefined, hour: 0, minute: 0, second: 0 };
  }

  return { date, hour, minute, second };
}

export function combineLocalDateTime(
  date: Date | undefined,
  hour: number,
  minute: number,
  second = 0,
): string {
  if (!date) return "";
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(hour)}:${padDatePart(minute)}:${padDatePart(second)}`;
}

export function getFirstPromotionUrl(
  links?: Array<Pick<LinkPorCidade, "url">>,
): string {
  return links?.find((item) => item.url?.trim())?.url.trim() || "";
}

export function getCouponTimeRemaining(
  expiration?: string,
  now = new Date(),
): { days: number; hours: number } | null {
  if (!expiration) return null;
  const remainingMs = new Date(expiration).getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;

  const totalHours = Math.floor(remainingMs / 3_600_000);
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
  };
}

export function promotionUsesSalesChannels(tipo?: string): boolean {
  return tipo !== "cupom";
}

export function preparePromotionForSubmit(
  promotion: Partial<Promocao>,
): Partial<Promocao> {
  if (promotion.tipo !== "cupom") return promotion;
  return { ...promotion, imagem: "" };
}
