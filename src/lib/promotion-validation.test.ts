import assert from "node:assert/strict";
import test from "node:test";
import { getPromotionValidationErrors } from "./promotion-validation.ts";

test("cupom requires code, category, discount and product link", () => {
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "cupom",
      nome_interno: "Cupom de boas-vindas",
      cupom: "",
      categoria: "",
      percentual_desconto: "",
      link: "",
    }),
    {
      cupom: true,
      categoria: true,
      percentual_desconto: true,
      link: true,
    },
  );
});

test("cupom accepts the required fields when filled", () => {
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "cupom",
      nome_interno: "Cupom de boas-vindas",
      cupom: "NOBRE",
      categoria: "Toda a Loja",
      percentual_desconto: "30",
      link: "https://example.com/produto",
    }),
    {},
  );
});

test("colecao VIP requires title, description, banner and a Tebex URL", () => {
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "colecao_vip",
      nome_interno: "Coleção VIP Chefão",
      titulo: "",
      descricao: "",
      imagem: "",
      links_por_cidade: [],
    }),
    {
      titulo: true,
      descricao: true,
      imagem: true,
      links_por_cidade: true,
    },
  );
});

test("colecao VIP accepts its required content", () => {
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "colecao_vip",
      nome_interno: "Coleção VIP Chefão",
      titulo: "VIP Chefão",
      descricao: "Luxo, exclusividade e benefícios.",
      imagem: "https://example.com/banner.png",
      links_por_cidade: [
        { countryId: "brasil", cityId: "nobre", url: "https://tebex.io/vip" },
      ],
    }),
    {},
  );
});

test("existing promotion validation remains intact", () => {
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "vip_mensal",
      nome_interno: "",
      nome: "",
    }),
    { nome_interno: true, nome: true },
  );
  assert.deepEqual(
    getPromotionValidationErrors({
      tipo: "oferta_flash",
      nome_interno: "Flash",
      titulo: "",
    }),
    { titulo: true },
  );
});
