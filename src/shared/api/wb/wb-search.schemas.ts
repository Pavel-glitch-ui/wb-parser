import { z } from 'zod';

/**
 * Zod-схема размера товара (содержит цену в копейках)
 */
export const WbProductSizePriceSchema = z
  .object({
    basic: z.number().optional().nullable(),
    product: z.number().optional().nullable(),
    total: z.number().optional().nullable(),
  })
  .passthrough();

export const WbProductSizeSchema = z
  .object({
    name: z.string().optional().nullable(),
    origName: z.string().optional().nullable(),
    price: WbProductSizePriceSchema.optional().nullable(),
  })
  .passthrough();

/**
 * Zod-схема единичного товара в поисковой выдаче WB
 */
export const WbProductItemSchema = z
  .object({
    id: z.number(), // nm_id
    name: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    supplierId: z.number().optional().nullable(),
    priceU: z.number().optional().nullable(),
    salePriceU: z.number().optional().nullable(),
    rating: z.number().optional().nullable(),
    reviewRating: z.number().optional().nullable(),
    feedbacks: z.number().optional().nullable(),
    time1: z.number().optional().nullable(), // время доставки в часах
    time2: z.number().optional().nullable(),
    sizes: z.array(WbProductSizeSchema).optional().nullable(),
  })
  .passthrough();

/**
 * Zod-схема корневого ответа поискового эндпоинта WB
 */
export const WbSearchResponseSchema = z
  .object({
    state: z.number().optional().nullable(),
    data: z
      .object({
        products: z.array(WbProductItemSchema).default([]),
      })
      .optional()
      .nullable(),
  })
  .passthrough();

export type WbProductItem = z.infer<typeof WbProductItemSchema>;
export type WbSearchResponse = z.infer<typeof WbSearchResponseSchema>;

/**
 * Нормализованный элемент товара для сохранения в базу данных
 */
export interface NormalizedSerpItem {
  nmId: bigint;
  name: string | null;
  brand: string | null;
  position: number;
  price: number | null;
  rating: number | null;
  feedbacks: number | null;
  deliveryDays: number | null;
  sellerName: string | null;
}
