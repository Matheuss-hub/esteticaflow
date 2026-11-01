# EsteticaFlow

SaaS de gestão para clínicas de estética, desenvolvido com Next.js 14 App Router, TypeScript, Tailwind CSS e Supabase.

## Desenvolvimento local

1. Use Node.js 20 ou superior e execute `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variáveis:
	- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon do projeto.
	- `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço, usada somente por actions no servidor para convites e cadastro atômico. Nunca use prefixo `NEXT_PUBLIC_`.
	- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` no desenvolvimento e URL pública do app em produção.
3. Execute `npm run dev` e acesse `http://localhost:3000`.

`.env.local` é ignorado pelo Git. Não compartilhe nem versione a service role.

## Banco Supabase

No SQL Editor do projeto, execute as migrations em ordem:

1. `supabase/migrations/001_auth_rls.sql`: criação atômica da clínica inicial, funções de autorização e RLS.
2. `supabase/migrations/002_pacientes_agenda_pacotes.sql`: dados adicionais de pacientes, pacotes, serviços e agenda; RPCs transacionais de paciente, agendamento e mudança de status.

As tabelas base `clinicas`, `clinica_membros`, `pacientes`, `servicos`, `pacotes` e `agendamentos` devem existir antes de rodar as migrations. A coluna de clínica em todas as entidades operacionais é `clinica_id`; a duração do serviço fica em `servicos.duracao_min`, enquanto a duração do agendamento fica em `agendamentos.duracao_minutos`.

## Supabase Auth

Em **Authentication > URL Configuration**:

- **Site URL**: use `http://localhost:3000` durante o desenvolvimento. Em produção, use a URL principal do site na Netlify, por exemplo `https://seu-site.netlify.app`.
- **Redirect URLs**: adicione `http://localhost:3000/auth/callback`, a URL de produção `https://seu-site.netlify.app/auth/callback` e, se usar deploy previews, `https://**--seu-site.netlify.app/auth/callback` ou um padrão equivalente aceito pelo domínio do projeto.

Crie a primeira conta em `/cadastro`; a action cria o usuário, a clínica e o vínculo de dona. Com confirmação de e-mail ligada, a tela pede para confirmar a conta antes de entrar.

## Deploy na Netlify

O `netlify.toml` configura o plugin oficial `@netlify/plugin-nextjs` e Node.js 20. Importe o repositório na Netlify e cadastre no painel **Site configuration > Environment variables** as quatro variáveis de `.env.example`, usando a URL pública no `NEXT_PUBLIC_SITE_URL`. Depois execute o deploy e confirme que a mesma URL está cadastrada nas Redirect URLs do Supabase.

## Checklist de teste manual

1. Abra `/cadastro`, crie a conta e confirme o e-mail quando a confirmação estiver ativada.
2. Entre e cadastre uma paciente com nome, WhatsApp, consentimento e dados opcionais; tente repetir o mesmo WhatsApp e confirme o aviso de duplicidade.
3. Abra o detalhe da paciente e confira CPF/anamnese; confirme que esses dados não aparecem na listagem.
4. Crie um pacote com serviço, total de sessões, valor, pagamento e validade.
5. Na agenda ou detalhe da paciente, crie um agendamento e associe o pacote e um profissional.
6. Confirme o agendamento e marque-o como realizado; confira o histórico e a barra de progresso do pacote.
7. Marque um atendimento realizado para outro status e confira que a sessão foi devolvida ao pacote.
8. Use **Enviar no Zap** e confira nome, serviço, dia, hora e número formatado no link.
9. Teste conflito no mesmo profissional, confirmação para horário passado, filtro por profissional e permissões de atendente/dona.
