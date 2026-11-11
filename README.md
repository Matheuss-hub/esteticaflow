# EsteticaFlow

SaaS de gestão para clínicas de estética, desenvolvido com Next.js 14 App Router, TypeScript, Tailwind CSS e Supabase.

## Desenvolvimento local

1. Use Node.js 20 ou superior e execute `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as variáveis:
	- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon do projeto.
	- `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço, usada somente no servidor para cadastro direto de funcionários e criação inicial da clínica. Nunca use prefixo `NEXT_PUBLIC_`.
	- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` no desenvolvimento e URL pública do app em produção.
3. Execute `npm run dev` e acesse `http://localhost:3000`.

`.env.local` é ignorado pelo Git. Não compartilhe nem versione a service role.

## Banco Supabase

No SQL Editor do projeto, execute as migrations em ordem:

1. `supabase/migrations/001_auth_rls.sql`: criação atômica da clínica inicial, funções de autorização e RLS.
2. `supabase/migrations/002_pacientes_agenda_pacotes.sql`: dados adicionais de pacientes, pacotes, serviços e agenda; RPCs transacionais de paciente, agendamento e mudança de status.
3. `supabase/migrations/003_perfil_menu.sql`: perfil, fotos e dados da clínica.
4. `supabase/migrations/004_equipe.sql`: função, contatos e acesso de leitura dos contatos apenas pela dona.
5. `supabase/migrations/005_permissoes_atendentes.sql`: limite de 15 membros, leitura de serviços pelos atendentes, alteração de pacientes/agendamentos e exclusões restritas à dona.
6. `supabase/migrations/005_trial_tour.sql`: teste grátis, bloqueio de gravação após o término e estado do tutorial/checklist por pessoa.

Execute as migrations na ordem pelo SQL Editor do Supabase. A aplicação não as executa automaticamente.

As tabelas base `clinicas`, `clinica_membros`, `pacientes`, `servicos`, `pacotes` e `agendamentos` devem existir antes de rodar as migrations. A coluna de clínica em todas as entidades operacionais é `clinica_id`; a duração do serviço fica em `servicos.duracao_min`, enquanto a duração do agendamento fica em `agendamentos.duracao_minutos`.

## Supabase Auth

Em **Authentication > URL Configuration**:

- **Site URL**: use `http://localhost:3000` durante o desenvolvimento. Em produção, use a URL principal do site na Netlify, por exemplo `https://seu-site.netlify.app`.
- **Redirect URLs**: adicione `http://localhost:3000/auth/callback`, a URL de produção `https://seu-site.netlify.app/auth/callback` e, se usar deploy previews, `https://**--seu-site.netlify.app/auth/callback` ou um padrão equivalente aceito pelo domínio do projeto.

Crie a primeira conta em `/cadastro`; a action cria o usuário, a clínica e o vínculo de dona. Com confirmação de e-mail ligada, a tela pede para confirmar a conta antes de entrar.

Para confirmação de e-mail, em **Authentication > Email Templates > Confirm signup**, use este link:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Configure **Site URL** com `https://seu-site.netlify.app` (substitua pelo domínio real da Netlify). Cadastre também `https://seu-site.netlify.app/auth/confirm` e `https://seu-site.netlify.app/auth/callback` em **Redirect URLs**. Para desenvolvimento local, adicione `http://localhost:3000/auth/confirm` e `http://localhost:3000/auth/callback`. O `NEXT_PUBLIC_SITE_URL` da produção deve ser a URL pública HTTPS da Netlify, nunca localhost.

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
9. Teste conflito no mesmo profissional, confirmação para horário passado e filtro por profissional.
10. Como dona, cadastre uma atendente com telefone e função e confira o painel de acesso; use **Copiar acesso** e **Enviar no Zap**.
11. Tente cadastrar o mesmo e-mail novamente e confirme a mensagem de e-mail já cadastrado.
12. Entre como atendente, confirme o redirecionamento para `/trocar-senha`, troque a senha e confirme o acesso ao painel.
13. Como atendente, confirme que não aparecem **Equipe** nem **Dados da clínica**; abrir `/equipe` ou `/clinica` diretamente deve voltar ao painel com um aviso.
14. Como atendente, confira que serviços são somente para leitura; os botões **Excluir** não aparecem em pacientes, agenda e pacotes; **Meu perfil** continua disponível.
15. Como dona, redefina a senha de uma atendente e remova-a; confirme a nova troca obrigatória e que os agendamentos antigos exibem **Profissional removido** quando aplicável.
16. Confirme que e-mail e telefone dos membros só aparecem para a dona.
