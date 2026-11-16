# Certifica Vale API

API central do Certifica Vale para execução no Vercel e acesso ao TiDB. Os clientes WEB e Electron usam HTTPS e tokens Bearer; nenhuma credencial do banco deve ser distribuída com os clientes.

## Configuração no Vercel

Cadastre em **Project Settings → Environment Variables**:

- `DB_HOST`
- `DB_PORT` (`4000`)
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `DB_SSL` (`true`)
- `JWT_SECRET` (aleatório, com pelo menos 32 caracteres)
- `ALLOWED_ORIGINS` (origens WEB separadas por vírgula)
- `NODE_ENV` (`production`)

`ADMIN_EMAIL` e `ADMIN_PASSWORD` são necessários somente ao executar `npm run db:init` em um ambiente administrativo seguro; não precisam permanecer no Vercel.

Depois de alterar variáveis no Vercel, faça um novo deployment.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e preencha os valores.
2. Execute `npm install`.
3. Execute `npm run db:init` se o schema ainda não estiver preparado.
4. Execute `npm run dev`.

## Segurança

- Autenticação por token Bearer com validade de 8 horas.
- Usuários inativados são recusados mesmo com token ainda válido.
- CORS aceita origens configuradas e loopback HTTP para o Electron.
- TLS obrigatório no TiDB quando `DB_SSL=true`.
- Senhas armazenadas somente como hash bcrypt.
- Limites de requisição e tentativas de login.

## Uploads

O Vercel limita requisições a 4,5 MB. Para reservar espaço aos cabeçalhos multipart, a API aceita arquivos XLSX de até **4,4 MB decimais** (`4.400.000` bytes). Arquivos maiores retornam erro antes do processamento.

## Comandos

- `npm run typecheck`: valida o TypeScript.
- `npm test`: executa os testes.
- `npm run dev`: inicia a API local em `127.0.0.1:3001`.
- `npm run db:init`: cria ou atualiza o schema e prepara o administrador inicial.
