import { describe, expect, it } from "vitest";
import { duplicateAccountMessage, isDuplicateEmailError, normalizeEmail } from "../../supabase/functions/create-user/logic";

describe("admin create-user", () => {
  it("normalizes e-mails typed with spaces or capitals", () => {
    expect(normalizeEmail("  PiresPatrick@iCloud.com ")).toBe("pirespatrick@icloud.com");
  });
  it("recognizes the Auth duplicate e-mail error", () => {
    expect(isDuplicateEmailError({ code: "email_exists", message: "x" })).toBe(true);
    expect(isDuplicateEmailError({ message: "A user with this email address has already been registered" })).toBe(true);
    expect(isDuplicateEmailError({ message: "Database error saving new user" })).toBe(false);
  });
  it("tells the admin which existing account uses the e-mail and that it is a free trial", () => {
    expect(duplicateAccountMessage({ nome: "I9 Eventos", created_at: "2026-11-12T14:59:42Z", inTrial: true }))
      .toBe('Já existe uma conta com este e-mail: I9 Eventos, criada em 12/11/2026. Ela está em "Testes grátis". Procure o cliente na lista em vez de criá-lo de novo.');
  });
});
