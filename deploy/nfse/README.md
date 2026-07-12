# NFS-e Nacional — provisionamento do certificado (segredo do servidor)

Este módulo monta a **DPS** (Declaração de Prestação de Serviço) no padrão
nacional e prepara a emissão pela **API do Contribuinte (Sefin Nacional)**.
A emissão com validade jurídica só ocorre com o **certificado e-CNPJ A1**
configurado como **segredo no servidor** — nunca no repositório.

> Betim aderiu ao Emissor Nacional (Decreto 51.670/2025). Desde 01/01/2026 a
> NFS-e é emitida exclusivamente pelo Portal Nacional.

## Ordem correta

1. **Certificado**: obtenha/confirme o **e-CNPJ A1** (arquivo `.pfx`/`.p12`) da
   Verdelimp com o contador/certificadora ICP-Brasil.
2. **Homologação primeiro**: comece sempre em **Produção Restrita**
   (`NFSE_AMBIENTE=restrita`). Só passe para `producao` após validar.
3. **Contador no circuito**: confirme o **código de tributação nacional
   (cTribNac)**, a alíquota de ISS, a incidência municipal e o grupo IBS/CBS
   antes de emitir de verdade.

## Variáveis de ambiente (na VPS, em `.env.production` — NÃO commitar)

```bash
# Uma das duas formas de fornecer o certificado:
NFSE_CERT_BASE64="<conteúdo do .pfx em base64>"   # recomendado
# ou
NFSE_CERT_PATH="/opt/verdelimp-erp/secrets/ecnpj.pfx"

NFSE_CERT_SENHA="<senha do certificado>"
NFSE_AMBIENTE="restrita"   # restrita (homologação) | producao
```

Gerar o base64 do certificado (no seu computador, não no repositório):

```bash
base64 -w0 ecnpj.pfx   # Linux
base64 -i ecnpj.pfx    # macOS
```

Se optar por `NFSE_CERT_PATH`, coloque o arquivo em
`/opt/verdelimp-erp/secrets/` (fora do build) e garanta permissão `600`.

## O que já funciona sem o certificado

- **Prontidão** (`GET /api/nfse/config`): checa CNPJ, inscrição municipal,
  IBGE do município, ISS, regime e o estado do certificado.
- **Prévia da DPS** (`POST /api/nfse/preview`): gera o XML da DPS a partir de
  uma medição/contrato para conferência do contador.
- **Emissão** (`POST /api/nfse/emitir`): bloqueada de forma transparente
  enquanto o certificado não estiver presente, informando exatamente o que falta.

## Próximo marco (com o certificado em mãos)

Ativar, em `POST /api/nfse/emitir`, a etapa de **assinatura XML-DSig** com o
e-CNPJ + **GZip/Base64** + **POST mTLS** ao endpoint do Sefin, e gravar a
NFS-e retornada em `FiscalNfse`. Homologar em Produção Restrita antes de
produção.

## Segurança

- **NUNCA** commitar `.pfx`, base64 do certificado, senha ou `.env.production`.
- Mantenha os segredos apenas no servidor; rotacione a senha se vazar.
- Registre os testes em Produção Restrita antes de emitir com validade.
