// Conversas do WhatsApp podem chegar identificadas apenas por um "LID"
// (identificador interno, ex.: 144654582448187@lid) quando o contato oculta o
// número. Nesses casos o número real ainda não é conhecido.

export type LidLikeConv = {
  contact_number?: string | null;
  contact_jid?: string | null;
  contact_lid?: string | null;
};

export const isUnresolvedLid = (conv?: LidLikeConv | null): boolean => {
  if (!conv) return false;
  const jid = conv.contact_jid || "";
  const num = (conv.contact_number || "").replace(/\D/g, "");
  const lid = (conv.contact_lid || "").replace(/\D/g, "");
  if (jid.endsWith("@lid")) {
    return !num || (!!lid && num === lid);
  }
  return false;
};

export const displayContactNumber = (conv?: LidLikeConv | null): string => {
  if (!conv) return "—";
  if (isUnresolvedLid(conv)) return "Número não identificado";
  return conv.contact_number || "—";
};

export const displayContactName = (
  conv?: (LidLikeConv & { contact_name?: string | null }) | null,
): string | null => {
  if (!conv) return null;
  const name = (conv.contact_name || "").trim();
  if (!name) return null;
  const digits = name.replace(/\D/g, "");
  const lid = (conv.contact_lid || "").replace(/\D/g, "");
  // Nome igual ao LID não é um nome real
  if (digits && digits === name && lid && digits === lid) return null;
  return name;
};

// Um lead criado a partir de uma conversa ainda não identificada fica com o LID
// (15 dígitos) no nome e/ou no WhatsApp. Telefone real tem no máximo 13 dígitos.
export const isLidLikeValue = (value?: string | null): boolean => {
  const raw = (value || "").trim();
  if (!raw) return false;
  const d = raw.replace(/\D/g, "");
  return d.length >= 14 && d === raw.replace(/[\s\-()+]/g, "");
};
