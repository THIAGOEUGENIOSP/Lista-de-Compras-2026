# Plano de Evolução da Lista de Compras

## Objetivo
Evoluir a aplicação com foco em: segurança, robustez técnica, produtividade do usuário e escala.

## Sprint 1 (2 semanas) - Segurança e base técnica
### Escopo
- Mover validação de ações críticas (lixeira/restauração/purge) para backend/RLS.
- Remover dependência de PIN no frontend para autorização real.
- Criar testes unitários para:
  - classificador de categorias (`src/utils/shoppingCategories.js`)
  - parse de quantidade/moeda (`src/app.js`)
  - fallback de compatibilidade soft-delete (`src/services/items.js`)
- Melhorar mensagens de erro e telemetria básica de falhas.

### Critérios de aceite
- Usuário sem permissão não consegue purge/restaurar via client.
- Cobertura mínima para regras de classificação e parsing.
- Fluxos críticos sem regressão (add/edit/delete/restore).

## Sprint 2 (2 semanas) - UX e produtividade
### Escopo
- Implementar "Desfazer" após exclusão individual (janela curta).
- Sugerir itens recorrentes por mês e por colaborador.
- Deteção de item duplicado no submit (alerta antes de salvar).
- Melhorar painel de filtros com estado persistido no localStorage.

### Critérios de aceite
- Exclusão individual com undo funcional.
- Sugestões recorrentes aparecem ao abrir "+ Adicionar item".
- Duplicado gera aviso claro com opção de continuar.

## Sprint 3 (2 semanas) - Gestão e inteligência de compra
### Escopo
- Orçamento mensal por categoria e total do mês.
- Alertas visuais de estouro de orçamento.
- Tela de auditoria simples para ações críticas.
- Filtro por intervalo de datas (comparação mês atual vs anterior).

### Critérios de aceite
- Usuário visualiza meta, gasto atual e saldo por categoria.
- Eventos críticos aparecem no histórico de auditoria.

## Sprint 4 (opcional) - Confiabilidade e escala
### Escopo
- Modo offline (PWA) com fila de sincronização.
- Paginação/virtualização para listas grandes.
- Melhorias de índices e consultas em cenários de alto volume.

### Critérios de aceite
- App continua utilizável sem internet e sincroniza ao reconectar.
- Performance estável com volume alto de itens.

## Backlog Técnico Recomendado
- Separar `src/app.js` em módulos (`state`, `actions`, `filters`, `ui`, `sync`).
- Centralizar validação de dados de item.
- Padronizar naming e contratos de serviços.
- Adicionar lint + format + pipeline de CI.

## Métricas de sucesso
- Menos erros de operação crítica.
- Menor tempo para montar lista mensal.
- Aumento de itens classificados automaticamente sem ajuste manual.
- Redução de retrabalho por exclusões acidentais.

## Diretrizes para Supabase Free
### Premissas
- Evitar operações com alto volume de leitura repetida.
- Priorizar processamento no banco via RPC/funções SQL para reduzir round-trips.
- Crescimento de dados controlado (principalmente `audit_log`).

### Regras práticas
- Sempre usar `select` com colunas mínimas necessárias.
- Paginar listas grandes por período quando necessário.
- Evitar polling agressivo; preferir atualização sob ação do usuário.
- Reutilizar cache local para filtros, preferências e dados de apoio.

### Banco e desempenho
- Manter índices essenciais:
  - `items(periodo_id, deleted_at)`
  - parcial de ativos por período
  - `audit_log(created_at)`, `audit_log(action)`
- Revisar índices a cada nova feature para não criar sobrecarga desnecessária.

### Auditoria e retenção
- Implementar política de retenção:
  - Exemplo: manter `audit_log` por 90-180 dias.
- Criar rotina manual/mensal para limpeza de logs antigos.

### Escopo recomendado por fase (custo baixo)
- Fase 1: Segurança + testes + refactor mínimo.
- Fase 2: UX de produtividade (undo, recorrentes, duplicados).
- Fase 3: orçamento e relatórios leves.
- Fase 4: offline incremental sem infraestrutura adicional.
