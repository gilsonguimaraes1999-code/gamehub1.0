export interface PromotionValidationInput {
  tipo?: string;
  nome_interno?: string;
  nome?: string;
  titulo?: string;
  cupom?: string;
  categoria?: string;
  percentual_desconto?: string;
  link?: string;
  descricao?: string;
  imagem?: string;
  links_por_cidade?: Array<{ url?: string }>;
}

export function getPromotionValidationErrors(
  promotion: PromotionValidationInput,
): Record<string, boolean> {
  const errors: Record<string, boolean> = {};

  if (!promotion.nome_interno?.trim()) errors.nome_interno = true;
  if (promotion.tipo === "vip_mensal" && !promotion.nome?.trim())
    errors.nome = true;
  if (promotion.tipo === "oferta_flash" && !promotion.titulo?.trim())
    errors.titulo = true;

  if (promotion.tipo === "cupom") {
    if (!promotion.cupom?.trim()) errors.cupom = true;
    if (!promotion.categoria?.trim()) errors.categoria = true;
    if (!promotion.percentual_desconto?.trim())
      errors.percentual_desconto = true;
    if (!promotion.link?.trim()) errors.link = true;
  }

  if (promotion.tipo === "colecao_vip") {
    if (!promotion.titulo?.trim()) errors.titulo = true;
    if (!promotion.descricao?.trim()) errors.descricao = true;
    if (!promotion.imagem?.trim()) errors.imagem = true;
    if (!promotion.links_por_cidade?.some((item) => item.url?.trim()))
      errors.links_por_cidade = true;
  }

  return errors;
}
