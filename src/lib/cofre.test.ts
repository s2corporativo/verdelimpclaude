import { describe, it, expect, beforeAll } from "vitest";
import { criptografar, descriptografar, NOMES_PERMITIDOS, CATALOGO_COFRE } from "./cofre";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "segredo-de-teste-com-tamanho-suficiente";
});

describe("Cofre — criptografia AES-256-GCM", () => {
  it("cifra e decifra de volta ao valor original (roundtrip)", () => {
    const original = "gsk_chave-super-secreta-123";
    const blob = criptografar(original);
    expect(blob.startsWith("v1:")).toBe(true);
    expect(blob).not.toContain(original); // nunca em claro no banco
    expect(descriptografar(blob)).toBe(original);
  });

  it("cada cifragem gera blob diferente (IV aleatório), mas decifra igual", () => {
    const a = criptografar("mesmo-valor");
    const b = criptografar("mesmo-valor");
    expect(a).not.toBe(b);
    expect(descriptografar(a)).toBe("mesmo-valor");
    expect(descriptografar(b)).toBe("mesmo-valor");
  });

  it("blob adulterado é rejeitado (autenticação GCM)", () => {
    const blob = criptografar("valor");
    const partes = blob.split(":");
    partes[3] = Buffer.from("adulterado!").toString("base64");
    expect(() => descriptografar(partes.join(":"))).toThrow();
  });

  it("formato inválido é rejeitado com erro claro", () => {
    expect(() => descriptografar("lixo-sem-formato")).toThrow(/inválido/);
  });
});

describe("Cofre — catálogo (whitelist)", () => {
  it("só aceita nomes do catálogo — nunca segredos de infraestrutura", () => {
    expect(NOMES_PERMITIDOS.has("GROQ_API_KEY")).toBe(true);
    expect(NOMES_PERMITIDOS.has("EMAIL_IMAP_PASS")).toBe(true);
    expect(NOMES_PERMITIDOS.has("DATABASE_URL")).toBe(false);
    expect(NOMES_PERMITIDOS.has("NEXTAUTH_SECRET")).toBe(false);
    expect(NOMES_PERMITIDOS.has("POSTGRES_PASSWORD")).toBe(false);
  });

  it("senhas do catálogo estão marcadas como secretas (mascaramento total)", () => {
    for (const item of CATALOGO_COFRE) {
      if (item.nome.endsWith("_PASS") || item.nome.endsWith("_KEY")) {
        expect(item.secreta, `${item.nome} deveria ser secreta`).toBe(true);
      }
    }
  });
});
