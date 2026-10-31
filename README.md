# EsteticaFlow

MVP de gestão para clínica de estética com Next.js 14, App Router, Tailwind CSS e Supabase.

## Executar

1. Instale o Node.js 20 ou superior.
2. Na pasta do projeto, instale as dependências com `npm install`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`.
4. Execute `npm run dev` e abra `http://localhost:3000`.

O identificador de clínica usado nas consultas é `7d4a4bfd-c205-4a4b-b945-26468494dc1a`. As tabelas devem permitir acesso pelo cliente Supabase autenticado pela chave pública e possuir a coluna `clinica_id`.

O dashboard e as telas esperam campos usuais como `data_hora` (ou `data` e `horario`) em `agendamentos`, `paciente_id`, `servico_id`, `total` e `sessoes_usadas` em `pacotes`, e `ultima_visita` em `pacientes`. Os dados existentes são lidos usando `select(*)` e campos alternativos comuns para datas e horários.

O arquivo `netlify.toml` configura o plugin oficial do Next.js para deploy na Netlify.
