# Overclock — refatoração da base

Esta versão foi organizada em três arquivos:

- `index.html`
- `styles.css`
- `app.js`

## O que já funciona

- navegação entre views
- timer com início, cancelamento e finalização
- salvamento local via `localStorage`
- cadastro, edição e exclusão de matérias
- exclusão de matéria removendo sessões relacionadas
- meta diária com progresso automático
- dashboard com totais de hoje, semana e mês
- ofensiva de dias estudados
- gráfico dos últimos 7 dias com Chart.js
- lista de sessões recentes

## Próxima etapa sugerida

Trocar a persistência local por Supabase:

1. criar tabelas `subjects`, `study_sessions` e `profiles`
2. adicionar autenticação
3. trocar `loadState()` / `saveState()` por funções assíncronas de leitura e escrita
4. manter `localStorage` só como cache opcional
