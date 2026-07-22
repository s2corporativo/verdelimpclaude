# Deploy do Verdelimp na VPS pelo GitHub Actions

Este procedimento permite que o GitHub Actions conecte-se à VPS por **chave SSH**, execute a instalação ou atualização e publique um artefato com evidências técnicas.

> Nunca grave senha, chave privada, token, conteúdo de `.env.production` ou `.env.ops` no repositório.

## 1. Segurança imediata

Se uma senha de `root` foi enviada por chat, e-mail ou outro canal, considere-a comprometida e altere-a antes de continuar:

```bash
passwd
```

Use uma senha nova, forte e exclusiva. O workflow não utiliza senha de SSH.

## 2. Criar uma chave exclusiva para o GitHub Actions

No computador administrativo:

```bash
ssh-keygen -t ed25519 -a 100 -C "github-actions-verdelimp" -f github-actions-verdelimp
```

Não compartilhe o arquivo `github-actions-verdelimp`. Ele é a chave privada.

## 3. Autorizar a chave pública na VPS

Linux/macOS:

```bash
ssh-copy-id -i github-actions-verdelimp.pub -p 22 root@SEU_IP_DA_VPS
```

PowerShell do Windows:

```powershell
Get-Content .\github-actions-verdelimp.pub | ssh -p 22 root@SEU_IP_DA_VPS "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

Teste antes de configurar o GitHub:

```bash
ssh -i github-actions-verdelimp -p 22 root@SEU_IP_DA_VPS
```

## 4. Cadastrar Secrets no GitHub

No repositório, abra:

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Cadastre:

| Nome | Conteúdo |
|---|---|
| `VPS_HOST` | IP ou hostname da VPS |
| `VPS_PORT` | porta SSH, normalmente `22` |
| `VPS_USER` | usuário autorizado, inicialmente `root` |
| `VPS_SSH_PRIVATE_KEY` | conteúdo integral da chave privada `github-actions-verdelimp` |
| `VPS_KNOWN_HOSTS` | linha conhecida do host SSH; recomendado |

Para gerar o conteúdo de `VPS_KNOWN_HOSTS`:

```bash
ssh-keyscan -p 22 -H SEU_IP_DA_VPS
```

Antes de confiar na saída, confira a impressão digital da chave do servidor pelo console da Contabo ou por uma sessão SSH já confiável.

Em `Variables`, pode ser cadastrada a variável opcional:

| Nome | Valor recomendado |
|---|---|
| `VPS_APP_DIR` | `/opt/verdelimp-erp` |

## 5. Preparar arquivos exclusivos da VPS

Os arquivos abaixo devem existir somente na VPS:

```text
/opt/verdelimp-erp/.env.production
/opt/verdelimp-erp/.env.ops
```

Use como base:

```text
.env.vps.example
deploy/contabo/ops-config.example
```

Proteja-os:

```bash
chmod 600 /opt/verdelimp-erp/.env.production
chmod 600 /opt/verdelimp-erp/.env.ops
```

O workflow interrompe a execução quando esses arquivos não existem.

## 6. Executar pelo GitHub

Abra:

`Actions` → `Deploy VPS Contabo` → `Run workflow`

Modos disponíveis:

- `auto`: instala quando não encontra uma instalação válida; caso contrário, atualiza;
- `instalar`: força o bootstrap técnico da v2.3;
- `atualizar`: executa backup pré-deploy, build, migrations, healthcheck e rollback de aplicação em caso de falha.

## 7. Evidências geradas

Ao final, o workflow publica um artefato compactado contendo, conforme disponibilidade:

- commit implantado;
- data, host e usuário;
- estado dos containers;
- imagens utilizadas;
- resposta de `/api/health`;
- status das migrations Prisma;
- resultado do monitoramento;
- configuração do cron;
- listagem e checksums do backup.

O artefato fica disponível na execução do GitHub Actions por 30 dias.

## 8. Redução posterior de privilégios

Depois da primeira instalação, recomenda-se substituir o acesso direto de `root` por um usuário de deploy com permissões mínimas e `sudo` restrito aos scripts operacionais necessários.
