-- Cofre de credenciais: chaves de API e senhas de integração cadastradas na
-- tela Admin → Credenciais & APIs. Valores criptografados (AES-256-GCM) no
-- aplicativo antes de gravar — nunca em claro no banco.
CREATE TABLE "SystemCredential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemCredential_name_key" ON "SystemCredential"("name");
