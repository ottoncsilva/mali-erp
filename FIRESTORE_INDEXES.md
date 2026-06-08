# Índices Recomendados do Firestore

Este arquivo documenta os índices que devem ser criados no Firestore para otimizar as queries do Mali ERP.

## Instruções de Criação

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto
3. Vá para **Firestore Database** > **Indexes**
4. Clique em **Create Index** e preencha conforme especificado abaixo

---

## Índices Obrigatórios

### 1. Atendimentos por Vendedor e Status
**Collection:** `atendimentos`

| Campo | Direção |
|-------|---------|
| `vendedorId` | Ascending |
| `status` | Ascending |
| `criadoEm` | Descending |

**Razão:** Queries de carteira (`vendedorId + status` filtrado)

---

### 2. Atendimentos por Tipo e Status
**Collection:** `atendimentos`

| Campo | Direção |
|-------|---------|
| `tipo` | Ascending |
| `status` | Ascending |
| `criadoEm` | Descending |

**Razão:** Filtrar orçamentos vs vendas finalizadas

---

### 3. Movimentos de Caixa por Conta
**Collection:** `movimentos_caixa`

| Campo | Direção |
|-------|---------|
| `contaBancariaId` | Ascending |
| `criadoEm` | Descending |

**Razão:** Extrato bancário e reconciliação

---

### 4. Contas a Receber por Status
**Collection:** `contas_receber`

| Campo | Direção |
|-------|---------|
| `status` | Ascending |
| `dataCompetencia` | Ascending |

**Razão:** Listagem de contas abertas/vencidas

---

### 5. Contas a Pagar por Status
**Collection:** `contas_pagar`

| Campo | Direção |
|-------|---------|
| `status` | Ascending |
| `dataCompetencia` | Ascending |

**Razão:** Listagem de contas a pagar

---

### 6. Metas por Ano e Mês
**Collection:** `metas`

| Campo | Direção |
|-------|---------|
| `ano` | Ascending |
| `mes` | Ascending |
| `vendedorId` | Ascending |

**Razão:** Busca rápida de metas por período

---

### 7. Produtos por Categoria
**Collection:** `produtos`

| Campo | Direção |
|-------|---------|
| `categoriaId` | Ascending |
| `status` | Ascending |

**Razão:** Listagem de produtos por categoria

---

### 8. Estoque por Localização
**Collection:** `estoque`

| Campo | Direção |
|-------|---------|
| `produtoId` | Ascending |
| `localizacao` | Ascending |

**Razão:** Busca de saldo por localização física

---

### 9. Pedidos de Compra por Status
**Collection:** `pedidos_compra`

| Campo | Direção |
|-------|---------|
| `fornecedorId` | Ascending |
| `status` | Ascending |
| `criadoEm` | Descending |

**Razão:** Pedidos por fornecedor

---

### 10. Notas Fiscais por Status
**Collection:** `notas_fiscais`

| Campo | Direção |
|-------|---------|
| `status` | Ascending |
| `criadoEm` | Descending |

**Razão:** Listagem de NFs a processar

---

## Índices de Compostos Opcionais

### Para Relatórios Avançados

Se você implementar filtros múltiplos simultâneos, adicione:

**Atendimentos: Vendedor + Tipo + Data**
```
vendedorId (Asc)
tipo (Asc)
criadoEm (Desc)
```

**Movimentos: Conta + Reconciliado + Data**
```
contaBancariaId (Asc)
conciliado (Asc)
criadoEm (Desc)
```

---

## Otimizações de Query

### 1. Use igualdade antes de ranges
❌ Evite:
```javascript
query(
  collection(db, 'atendimentos'),
  where('tipo', '==', 'venda'),
  where('criadoEm', '>=', startDate),
  where('criadoEm', '<=', endDate),
  orderBy('criadoEm', 'desc')
)
```

✅ Prefira:
```javascript
query(
  collection(db, 'atendimentos'),
  where('tipo', '==', 'venda'),
  where('criadoEm', '>=', startDate),
  orderBy('criadoEm', 'desc'),
  limit(100)
)
```

### 2. Denormalize quando apropriado
Em vez de junta entre `clientes` e `atendimentos`, armazene:
- `clienteNome`
- `clienteTelefone`
- `clienteCPF`

Diretamente no `atendimentos` para evitar queries duplicadas.

### 3. Agrupe e cache resultados
Para DRE e relatórios mensais, considere:
- Calcular agregações offline e armazenar em documento `relatorios_cache`
- Atualizar cache diariamente via Cloud Functions
- Queries de relatório leem do cache, não da collection inteira

---

## Monitoramento

### Verificar Índices Usados

No Firebase Console:
1. **Firestore** > **Indexes**
2. Procure por `STATUS: ENABLED` (índices ativos)
3. Procure por `STATUS: DELETED` (remover se não usar)

### Otimizar Queries Lentas

Se receber aviso:
```
The query requires an index. You can create it here.
```

- Clique no link fornecido
- Revise se o índice é realmente necessário
- Se sim, crie-o

---

## Estimativa de Custos

Índices compostos **não aumentam custos de leitura**, apenas:
- **Escrita:** ~10% extra por índice ativo (escrita em background)
- **Armazenamento:** ~0.5-1% extra por índice

Recomendação: Crie apenas índices que serão usados regularmente (>1000 queries/mês).

---

## Checklist de Deployment

Antes de ir para produção:

- [ ] Criar todos os 10 índices obrigatórios
- [ ] Testar queries com Firebase Emulator
- [ ] Verificar `Firestore Usage` no Console
- [ ] Validar índices com `firebase indexes:list`
- [ ] Documentar índices customizados em `FIRESTORE_INDEXES.md`
