import assert from "node:assert/strict";
import test from "node:test";
import {
  combineLocalDateTime,
  getAdjacentPreviewIndex,
  getCouponTimeRemaining,
  getFirstPromotionUrl,
  getPromotionPreviewPages,
  parseLocalDateTime,
  preparePromotionForSubmit,
  promotionUsesSalesChannels,
} from "./promotion-types.ts";

test("details creates one preview page for every city offer link", () => {
  const pages = getPromotionPreviewPages({
    tipo: "oferta_cidade",
    titulo: "Oferta especial",
    links_por_cidade: [
      {
        countryId: "brasil",
        cityId: "santa",
        url: "https://example.com/santa",
        imagem: "https://example.com/santa.png",
      },
      {
        countryId: "brasil",
        cityId: "nobre",
        url: "https://example.com/nobre",
        imagem: "https://example.com/nobre.png",
      },
    ],
  });

  assert.equal(pages.length, 2);
  assert.deepEqual(
    pages.map((page) => page.links_por_cidade?.map((link) => link.cityId)),
    [["santa"], ["nobre"]],
  );
  assert.equal(pages[0].titulo, "Oferta especial");
});

test("details keeps a single preview page for other promotion types", () => {
  const pages = getPromotionPreviewPages({
    tipo: "cupom",
    cupom: "NOBRE",
  });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].cupom, "NOBRE");
});

test("details preview pagination wraps at both ends", () => {
  assert.equal(getAdjacentPreviewIndex(0, 3, -1), 2);
  assert.equal(getAdjacentPreviewIndex(2, 3, 1), 0);
  assert.equal(getAdjacentPreviewIndex(0, 0, 1), 0);
});

test("custom calendar preserves the local date, time and seconds", () => {
  const parsed = parseLocalDateTime("2026-09-07T19:30:55");

  assert.equal(parsed.date?.getFullYear(), 2026);
  assert.equal(parsed.date?.getMonth(), 8);
  assert.equal(parsed.date?.getDate(), 7);
  assert.equal(parsed.hour, 19);
  assert.equal(parsed.minute, 30);
  assert.equal(parsed.second, 55);
  assert.equal(
    combineLocalDateTime(parsed.date, 19, 30, 55),
    "2026-09-07T19:30:55",
  );
});

test("custom calendar accepts legacy values without seconds", () => {
  const parsed = parseLocalDateTime("2026-09-07T19:30");

  assert.equal(parsed.hour, 19);
  assert.equal(parsed.minute, 30);
  assert.equal(parsed.second, 0);
});

test("VIP collection preview uses the first filled Tebex URL", () => {
  assert.equal(
    getFirstPromotionUrl([
      { countryId: "brasil", cityId: "santa", url: "" },
      {
        countryId: "brasil",
        cityId: "nobre",
        url: "https://loja.cidadenobre.com/package/7648197",
      },
      {
        countryId: "portugal",
        cityId: "lisboa",
        url: "https://example.com/second",
      },
    ]),
    "https://loja.cidadenobre.com/package/7648197",
  );
});

test("coupon expiration is shown as remaining days and hours", () => {
  assert.deepEqual(
    getCouponTimeRemaining("2026-09-07T18:00", new Date("2026-06-15T12:00:00")),
    { days: 84, hours: 6 },
  );
  assert.equal(
    getCouponTimeRemaining("2026-06-15T11:59", new Date("2026-06-15T12:00:00")),
    null,
  );
});

test("cupom removes a legacy banner and does not use sales channels", () => {
  assert.equal(promotionUsesSalesChannels("cupom"), false);
  assert.deepEqual(
    preparePromotionForSubmit({
      tipo: "cupom",
      imagem: "https://example.com/old-banner.png",
      cupom: "NOBRE",
    }),
    {
      tipo: "cupom",
      imagem: "",
      cupom: "NOBRE",
    },
  );
});

test("colecao VIP keeps its banner and uses Tebex links by city", () => {
  const promotion = {
    tipo: "colecao_vip",
    imagem: "https://example.com/vip-chefao.png",
  };

  assert.equal(promotionUsesSalesChannels("colecao_vip"), true);
  assert.deepEqual(preparePromotionForSubmit(promotion), promotion);
});
