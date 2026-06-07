# Mali ERP - Stock (Estoque) & Purchases (Compras) Module Architecture

**Version**: 1.0  
**Date**: 2026-06-07  
**Status**: Design Phase (No Implementation Yet)

---

## 1. Overview

The Stock and Purchases modules form the operational backbone of Mali ERP, managing inventory across multiple physical locations and automating the complete procurement workflow from supplier order to warehouse receipt.

### Core Scope
- **Stock Module**: Real-time multi-location inventory tracking with automated movement, alerts, and integration with sales
- **Purchases Module**: Complete procurement workflow from PO creation to invoice registration with automatic CMV updates
- **Integration Points**: Bi-directional flows between Sales → Stock → Purchases

### Key Principles
1. **Location Awareness**: Every inventory unit has a location identifier
2. **Cost Tracking**: CMV calculated with allocated freight per item
3. **Audit Trail**: All stock movements must be logged for compliance
4. **Automation**: Back-orders trigger POs; sales reduce stock; invoices increase it
5. **Real-time Updates**: Firebase Firestore ensures consistency across users

---

## 2. Data Model (Firestore Collections)

### 2.1 `estoque` (Stock Levels by Location)

Tracks the quantity of each product at each physical location.

```typescript
interface EstoqueItem {
  id: string;                    // UUID or composite key
  produtoId: string;             // FK → produtos.id
  localizacao: 'comprado' | 'showroom' | 'deposito' | 'entrega';
  quantidade: number;            // Current quantity at location
  quantidadeReservada?: number;  // For pending sales/deliveries
  dataUltimaMovimentacao: Date;
  
  // Metadata
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Composite Key Strategy
// EstoqueItem.id = `${produtoId}_${localizacao}`
// Example: "prod123_showroom", "prod123_deposito"
```

**Rationale**:
- Separates stock quantity tracking from product master data
- Each location variant is a separate document for independent querying
- Indexed by `localizacao` and `produtoId` for quick filters

**Locations Explained**:
- **comprado**: Items purchased from supplier, in transit (estoque não disponível para venda)
- **showroom**: Floor display items, available for immediate sale
- **deposito**: Warehouse storage, backup inventory
- **entrega**: Items in customer delivery (reserved until confirmed received)

---

### 2.2 `pedidos_compra` (Purchase Orders)

Represents supplier orders with items and delivery tracking.

```typescript
interface PedidoCompra {
  id: string;
  fornecedorId: string;          // FK → fornecedores.id
  numeroPO: string;              // Sequential, human-readable (e.g., "PO-2026-00042")
  
  // Items
  itens: Array<{
    produtoId: string;           // FK → produtos.id (can be null for new product registration)
    skuFornecedor: string;        // Supplier's SKU if different
    nomeProduto: string;          // Denormalized for display
    quantidadePedida: number;
    custoPorUnidade: number;      // Unit cost from supplier invoice
    
    // New product registration fields (optional)
    novoProdu?: {
      nome: string;
      sku: string;
      custoProduto: number;
      icms: number;
      ipi: number;
      categoriaId?: string;
      fornecedorId?: string;
    };
  }>;
  
  // Delivery & Cost
  prazoEntregaEstimado: Date;    // Supplier's prazoEntregaDias + today
  freteTotal?: number;            // Total freight cost (allocated during invoice)
  status: 'pedido' | 'em_transito' | 'recebido' | 'faturado' | 'cancelado';
  
  // Approval
  criadoPorId: string;            // FK → usuarios.id
  aprovadoPorId?: string;         // FK → usuarios.id (gerencia/admin only)
  
  // Tracking
  dataEnvio?: Date;
  dataRecebimento?: Date;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
```

**Status Workflow**:
```
pedido → em_transito → recebido → faturado
  ↓
cancelado (can be from any state)
```

- **pedido**: Created, awaiting approval/send
- **em_transito**: Sent to supplier, no invoice yet
- **recebido**: Received at warehouse, awaiting invoice
- **faturado**: Invoice registered, stock updated, CMV finalized
- **cancelado**: Rejected or cancelled

---

### 2.3 `notas_fiscais` (Invoice Registration)

Registers supplier invoices and allocates costs across items.

```typescript
interface NotaFiscal {
  id: string;
  pedidoCompraId: string;         // FK → pedidos_compra.id (can be null for non-PO invoices)
  numeroNota: string;             // From supplier NF-e (e.g., "123456")
  serieNota: string;              // From supplier (e.g., "A", "1")
  dataEmissao: Date;
  dataEntrada: Date;              // When registered in system (default: today)
  
  // Cost Composition
  itens: Array<{
    produtoId: string;            // FK → produtos.id
    skuProduto: string;            // For reference
    nomeProduto: string;           // Denormalized
    quantidadeRecebida: number;
    custoPorUnidade: number;       // From invoice line
    subtotal: number;              // = custoPorUnidade × quantidadeRecebida
    
    // Freight Allocation (ratear frete)
    freteAlocado: number;          // Calculated during invoice
    cmvUnitario: number;           // Calculated: (costUnit + freteAlocado/qtd + ICMS + IPI)
    cmvTotal: number;              // = cmvUnitario × quantidadeRecebida
  }>;
  
  // Header Costs
  freteTotal: number;              // Total freight from supplier
  descontoTotal?: number;          // If any (applied before allocation)
  acrescimosTotal?: number;        // If any (applied before allocation)
  
  // Taxes (from NF-e)
  icmsTotal: number;
  ipiTotal: number;
  
  // Financial
  valorTotal: number;              // Subtotal + freight + acrescimos - desconto
  status: 'rascunho' | 'registrada' | 'cancelada';
  
  // Approval & Tracking
  registradaPorId: string;         // FK → usuarios.id
  aprox?: string;                  // A/C (Autorização de Crédito) or invoice reference
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
```

**CMV Calculation per Item**:
```
Subtotal Item = custoPorUnidade × quantidadeRecebida
Frete Alocado = (Subtotal Item / Subtotal Total) × Frete Total
CMV Unitário = (custoPorUnidade + (Frete Alocado / Quantidade) + ICMS Unit + IPI Unit)
CMV Total Item = CMV Unitário × Quantidade
```

---

### 2.4 `movimentacoes_estoque` (Stock Movement Audit Trail)

Immutable log of all stock movements for compliance and debugging.

```typescript
interface MovimentacaoEstoque {
  id: string;
  
  // Movement Details
  produtoId: string;              // FK → produtos.id
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  
  // From/To
  localizacaoOrigem: string;      // For transferencia
  localizacaoDestino: string;     // For entrada/saida/transferencia
  quantidade: number;              // Quantity moved
  
  // Reference
  referenceType: 'pedido_compra' | 'nota_fiscal' | 'atendimento' | 'ajuste_manual' | 'transferencia';
  referenceId: string;            // ID of the originating document
  
  // Context
  motivo?: string;                // For ajuste_manual
  registradoPorId: string;        // FK → usuarios.id
  observacoes?: string;
  
  // Tracking
  criadoEm: Date;
  processadoEm?: Date;            // When system auto-applied (for async operations)
}

// Indexing: 
// - (produtoId, criadoEm DESC) for audit trail per product
// - (referenceType, referenceId) for linking to source documents
```

**Movement Types**:
- **entrada**: Stock increase (from PO invoice or transfer)
- **saida**: Stock decrease (from sales confirmation or transfer)
- **ajuste**: Manual correction (with reason)
- **transferencia**: Location-to-location movement (origem → destino)

---

### 2.5 `alerts_estoque` (Low Stock Alerts)

Configurable notifications when stock falls below threshold.

```typescript
interface AlertEstoque {
  id: string;
  produtoId: string;              // FK → produtos.id
  limiteMinimo: number;           // Threshold (can override produto.estoqueMinimo)
  localizacao: 'comprado' | 'showroom' | 'deposito' | 'todas';
  
  // Alert Status
  ativo: boolean;
  nivelAtual: number;             // Current stock (denormalized for easy view)
  alertaAtivo: boolean;           // Has alert been triggered?
  dataPrimeiroAlerta?: Date;
  
  // Notification
  notificarPara: string[];        // User IDs (compradores, gerentes)
  ultimaNotificacao?: Date;
  frequenciaNotificacao: 'uma_vez' | 'diaria' | 'semanal';
  
  criadoEm: Date;
  atualizadoEm: Date;
}
```

---

### 2.6 Updated `produtos` Collection

Extend the existing Produto model with stock metadata:

```typescript
// CHANGE: Add to existing Produto interface
interface Produto {
  // ... existing fields ...
  
  // Stock Configuration (NEW)
  estoqueMinimo: number;          // Already exists
  localizacaoPrincipal?: 'showroom' | 'deposito' | 'comprado'; // Default location for new purchases
  
  // CMV Metadata (UPDATED)
  // custoProduto, icms, ipi already exist
  // frete moved to nota_fiscal (per invoice allocation)
  
  // Status
  status: 'ativo' | 'inativo' | 'esgotado';
  // CHANGE: 'esgotado' computed from estoque query, not hardcoded
}
```

---

## 3. Integration Flows

### 3.1 Sales → Stock Reduction

**Trigger**: When an `atendimento` (quotation) is converted to a confirmed `venda` with `status: 'convertido'`

**Flow**:
```
1. User marks Atendimento as "Convertido" in PDV/Orcamentos
2. System calls "ConfirmarVenda" function (server-side)
3. For each ItemAtendimento:
   a. Calculate total quantity needed
   b. Check availability across locations (priority: showroom → deposito → comprado)
   c. If insufficient: 
      - Create BackOrder (not in scope yet)
      - OR reject conversion
   d. If sufficient:
      - Create MovimentacaoEstoque (saida) for each location
      - Update EstoqueItem for each affected location
      - Update atendimento.status = 'convertido'
4. Reduce quantity from:
   - showroom first (floor display)
   - deposito second (backup)
   - comprado last (only if pre-allocated)
5. If stock → 0 at any location, close that EstoqueItem
6. Trigger alert check for low stock
```

**Firestore Transactions**:
```typescript
// Pseudo-code
transaction.update(EstoqueItem[showroom], {quantidade: qty - 1})
transaction.update(EstoqueItem[deposito], {quantidade: qty - 2})
transaction.create(MovimentacaoEstoque, {tipo: 'saida', referenceType: 'atendimento', ...})
transaction.update(Atendimento, {status: 'convertido'})
```

---

### 3.2 Stock → Purchase (Back-Order)

**Trigger**: Manual workflow or automatic if stock is insufficient during sales confirmation (Phase 4)

**Flow**:
```
1. User creates back-order from Stock Dashboard (or auto-triggered)
2. System creates PedidoCompra:
   a. Set status = 'pedido'
   b. Calculate quantity (demand - current stock)
   c. Link to appropriate fornecedor
   d. Set prazoEntrega = today + fornecedor.prazoEntregaDias
3. Option to auto-send or await approval
4. When approved: status → 'em_transito', dataEnvio = today
5. Back-order waits for supplier delivery
```

---

### 3.3 Purchase → Stock (Invoice Registration)

**Trigger**: Comprador/Gerente registers an incoming invoice

**Flow**:
```
1. User navigates to Notas Fiscais → "Registrar NF"
2. Link to existing PedidoCompra (optional, for reference)
3. Enter NF details:
   - Número, série, data emissão
   - Items: quantity, cost per unit
   - Frete total
4. System calculates:
   - Frete allocation per item (proportional)
   - CMV unitário for each item
5. Create NotaFiscal with status = 'rascunho'
6. User reviews CMV preview, confirms
7. On confirmation:
   - NotaFiscal.status = 'registrada'
   - For each item:
     a. Create EstoqueItem (or update if exists) in 'comprado' location
     b. Create MovimentacaoEstoque (entrada, reference: nota_fiscal)
     c. Update Produto.custoProduto and ICMS/IPI if changed
   - Link linked PedidoCompra.status → 'faturado'
   - Create ContaPagar entry for payment tracking
8. Stock now available in 'comprado' (in transit location)
```

**Transactional Guarantee**:
```typescript
transaction.create(NotaFiscal, {...})
transaction.update(PedidoCompra, {status: 'faturado'})
itens.forEach(item => {
  transaction.set(EstoqueItem[comprado], {quantidade: qty}, {merge: true})
  transaction.create(MovimentacaoEstoque, {tipo: 'entrada', ...})
})
transaction.create(ContaPagar, {...})
```

---

### 3.4 Stock Relocation (Warehouse Movement)

**Trigger**: Manual relocation of items from one location to another (e.g., comprado → showroom after physical inspection)

**Flow**:
```
1. Estoquista navigates to Stock Dashboard
2. Select product and source/destination locations
3. Enter quantity to move
4. Confirm relocation
5. System:
   a. Create MovimentacaoEstoque (transferencia, origem/destino)
   b. Decrease source EstoqueItem
   c. Increase destination EstoqueItem
   d. Update dataUltimaMovimentacao
```

---

### 3.5 CMV Auto-Update on Invoice

When invoice is registered, CMV values in the Produto collection are updated if this is the first invoice or cost has changed.

**Strategy**:
- Store CMV history in a sub-collection `produtos/{id}/cmv_historico` for audit
- Current CMV on Produto updated immediately
- Sales (Atendimento) records the CMV snapshot at time of quotation (immutable)

---

## 4. Business Logic Rules

### 4.1 Stock Availability Check

```
Available(produtoId) = 
  EstoqueItem[produtoId, 'showroom'].quantidade 
  + EstoqueItem[produtoId, 'deposito'].quantidade
  
Available_WithOrders = Available + EstoqueItem[produtoId, 'comprado'].quantidade
```

**Rule**: Vendedor can only sell from Available (showroom + deposito)  
**Exception**: Admin/Gerencia can override and trigger back-order

---

### 4.2 Freight Allocation Algorithm

Given:
- Frete Total (FT)
- Item quantities and costs: [(q1, cost1), (q2, cost2), ...]

```
Subtotal Item i = cost_i × q_i
Subtotal Total = Σ(Subtotal Item i)

Frete Alocado Item i = (Subtotal Item i / Subtotal Total) × FT

CMV Unitário Item i = (cost_i + (Frete Alocado i / q_i) + ICMS_Unit_i + IPI_Unit_i)
```

**Example**:
```
Item A: 2 units × R$ 100 = R$ 200
Item B: 3 units × R$ 200 = R$ 600
Total: R$ 800
Frete Total: R$ 80

Frete Item A = (200/800) × 80 = R$ 20
Frete Item B = (600/800) × 80 = R$ 60

CMV Unitário A = (100 + 20/2 + ICMS + IPI) = (100 + 10 + ...) 
CMV Unitário B = (200 + 60/3 + ICMS + IPI) = (200 + 20 + ...)
```

---

### 4.3 Stock Status Calculation

A product's `status` field in the Produtos collection should be computed based on current stock levels:

```typescript
function computeStatus(produtoId: string): 'ativo' | 'inativo' | 'esgotado' {
  const estoque = EstoqueItem where produtoId && localizacao != 'entrega'
  const totalQty = sum(estoque.quantidade)
  
  // Explicit inactive status overrides
  if (Produto[produtoId].ativo === false) return 'inativo'
  
  if (totalQty === 0) return 'esgotado'
  if (totalQty > 0) return 'ativo'
}
```

This is computed on-the-fly in queries, not stored.

---

### 4.4 Alert Triggering

```typescript
function checkAlerts(produtoId: string, localizacao: string) {
  const alerts = AlertEstoque where produtoId
  
  alerts.forEach(alert => {
    const estoqueItem = EstoqueItem[produtoId, alert.localizacao || 'todas']
    const quantidadeTotal = sum if localizacao === 'todas'
    
    if (quantidadeTotal < alert.limiteMinimo && !alert.alertaAtivo) {
      // Trigger notification
      notifyUsers(alert.notificarPara, {
        produto: Produto[produtoId].nome,
        estoque: quantidadeTotal,
        limite: alert.limiteMinimo
      })
      AlertEstoque.update({alertaAtivo: true, dataPrimeiroAlerta: now})
    } else if (quantidadeTotal >= alert.limiteMinimo && alert.alertaAtivo) {
      // Clear alert
      AlertEstoque.update({alertaAtivo: false})
    }
  })
}
```

---

### 4.5 Role-Based Access Rules

| Role | Create PO | Approve PO | Register Invoice | Move Stock | View Stock | Create Alert |
|------|-----------|------------|------------------|-----------|-----------|--------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gerência | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vendedor | - | - | - | - | ✅ (view only) | - |
| Comprador | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| Estoquista | - | - | - | ✅ | ✅ | - |
| Financeiro | - | - | - | - | ✅ (view only) | - |

**Firestore Rules**: Implemented via custom claims in Firebase Auth + document-level rules

---

## 5. Menu Structure Changes

### Current Structure Issue
- "CRM" and "Vendas" are separate top-level sections
- "Catálogo" mixes products with purchases
- No dedicated "Estoque" section

### Proposed Structure

```
Dashboard
├── Vendas
│   ├── Clientes
│   ├── Orçamentos
│   └── Carteira
│
├── Operações
│   ├── Entregas
│   └── Assistência Técnica
│
├── Catálogo
│   ├── Produtos
│   ├── Categorias
│   ├── Fornecedores
│   └── Acabamentos
│
├── Estoque                          [NEW]
│   ├── Dashboard Estoque            [NEW]
│   ├── Movimentações                [NEW]
│   ├── Alertas                      [NEW]
│   └── Histórico                    [NEW]
│
├── Compras                          [NEW]
│   ├── Pedidos de Compra            [NEW]
│   ├── Notas Fiscais                [NEW]
│   └── Relatórios                   [NEW]
│
├── Financeiro
│   ├── Contas a Receber
│   ├── Contas a Pagar               [UPDATED: from contaPagar]
│   ├── Relatórios
│   └── DRE
│
└── Configurações
    ├── Precificação
    ├── Estoque (Settings)           [NEW]
    ├── Acabamentos
    └── Gerais
```

**Role-Based Visibility**:
- **Estoque**: Admin, Gerencia, Comprador, Estoquista
- **Compras**: Admin, Gerencia, Comprador
- **Vendas**: Admin, Gerencia, Vendedor

---

## 6. Pages & UIs (High-Level Sketches)

### 6.1 Estoque Dashboard (`/dashboard/estoque`)

**Display**:
- Top KPIs:
  - Total estoque (all locations)
  - Items low in stock (count)
  - Items in transit (comprado location)
  - Items in delivery (entrega location)
- **Stock by Location** table:
  - Columns: Produto, SKU, Showroom, Depósito, Comprado, Entrega, Total
  - Color coding: Green (healthy), Orange (low), Red (critical)
  - Actions: Transfer, Manual Adjust, View History
- **Alerts Section**: List of active low-stock alerts
- **Quick Actions**: 
  - Create Purchase Order
  - Relocate Items
  - Acknowledge Alerts

---

### 6.2 Stock Movements (`/dashboard/estoque/movimentacoes`)

**Display**:
- Filterable log of all MovimentacaoEstoque entries
- Columns: Date, Produto, Type, Origem → Destino, Qty, Reference, User
- Filters:
  - Date range
  - Produto
  - Movement type (entrada/saida/ajuste/transferencia)
  - Reference type (pedido/nota/atendimento/manual)
- Export to CSV for reconciliation

---

### 6.3 Stock Alerts (`/dashboard/estoque/alertas`)

**Display**:
- Create/Edit alerts
- Table: Produto, Min Limit, Current Level, Location, Active/Inactive, Notify To
- Ability to configure notification frequency
- Test notification button

---

### 6.4 Purchase Orders (`/dashboard/compras/pedidos`)

**List View**:
- Table: PO#, Fornecedor, Data, Status, Total Esperado, Ações
- Status badges (Pedido, Em Trânsito, Recebido, Faturado, Cancelado)
- Filters: Date, Supplier, Status
- Actions: View, Edit (if not sent), Approve (if pending), Cancel, Receive

**Create/Edit Modal**:
- Step 1: Select Supplier
- Step 2: Add Items (existing or new product registration)
  - For each item: SKU, Name, Qty, Cost/Unit, ICMS, IPI
  - Total cost calculation (real-time)
  - New Product option: Quick-add product during PO creation
- Step 3: Delivery date (auto-filled from supplier prazo, editable)
- Step 4: Review & Approve (if manager)
- Step 5: Send (status → em_transito)

---

### 6.5 Invoice Registration (`/dashboard/compras/notas-fiscais`)

**List View**:
- Table: NF#, Série, Data, Fornecedor, PO Link, Frete, Total, Status, Ações
- Filters: Date, Supplier, Status, PO linked
- Actions: View, Edit (if draft), Register, Cancel

**Register/Edit Modal**:
- Step 1: Link to PO (optional auto-fill) or manual entry
- Step 2: NF Details (Número, Série, Data Emissão)
- Step 3: Items from PO or manual entry
  - For each: SKU, Name, Qty Received, Cost/Unit, Subtotal
  - Line-by-line ICMS/IPI
- Step 4: Freight Allocation
  - Enter total frete
  - Display allocation per item (read-only)
  - Show CMV preview per item
- Step 5: Review CMV Composition
  - Summary table: Item, Cost, +Frete, +ICMS, +IPI, =CMV Unit/Total
  - Approval required for large changes
- Step 6: Confirm & Register
  - Auto-creates stock movements
  - Updates CMV in Produto
  - Links to PO if exists
  - Creates ContaPagar

---

### 6.6 Stock Configuration (`/dashboard/configuracoes/estoque`)

**Settings**:
- Default minimum stock level (applies to new products)
- Alert notification preferences (frequency, channels)
- Enable/disable automatic back-order creation
- Location names (editable, default: Showroom, Depósito, Comprado, Entrega)

---

## 7. Implementation Phases & Dependencies

### Phase 1: Core Data Model (1-2 weeks)
**Deliverables**:
- Create Firestore collections: estoque, pedidos_compra, notas_fiscais, movimentacoes_estoque, alerts_estoque
- Update Produto model
- Update firestore.rules for new collections
- Create TypeScript interfaces in types/index.ts

**No UI yet** - Database-first approach

**Dependencies**: None (foundational)

---

### Phase 2: Stock Dashboard & Basic Operations (1-2 weeks)
**Deliverables**:
- Stock Dashboard (`/dashboard/estoque`)
- Stock Movements view
- Manual stock adjustment interface
- Stock relocation (transferencia) UI
- Alerts configuration

**Features**:
- Real-time stock level display
- Filter and search
- Manual movements (for corrections)

**Does NOT include**:
- Automated reduction (Phase 3)
- Alert notifications (Phase 3)

**Dependencies**: Phase 1

---

### Phase 3: Purchase Order & Invoice Registration (2-3 weeks)
**Deliverables**:
- PO creation flow
- Invoice registration flow with CMV calculation
- Freight allocation algorithm
- Server-side cloud function for invoice processing

**Features**:
- Create/Edit/Approve POs
- Register invoices
- Automatic stock increase to 'comprado' location
- Automatic CMV updates
- ContaPagar creation

**Does NOT include**:
- Automatic back-order from sales (Phase 4)

**Dependencies**: Phase 1, Phase 2 (for relocation)

---

### Phase 4: Sales Integration (1-2 weeks)
**Deliverables**:
- Modify ConfirmarVenda flow to reduce stock
- Back-order creation (manual or automatic if insufficient)
- Stock availability check in PDV
- Auto-trigger low-stock alerts

**Features**:
- Stock check during quotation
- Automatic stock reduction on sale confirmation
- Back-order workflow

**Dependencies**: Phase 1, Phase 2, Phase 3

---

### Phase 5: Reporting & Analytics (1 week)
**Deliverables**:
- Stock aging report (items in each location, time there)
- Turnover rate by product/location
- Procurement cycle time (PO → Invoice)
- Cost trend analysis (CMV history)

**Dependencies**: Phase 1, Phase 3

---

## 8. Technical Considerations

### 8.1 Firestore Indexing

Required composite indexes:
- `estoque`: (produtoId, localizacao) → for product stock summary
- `estoque`: (localizacao, quantidade) → for low-stock queries
- `pedidos_compra`: (status, dataUltimaMovimentacao) → for pending orders
- `notas_fiscais`: (pedidoCompraId, status) → for invoice reconciliation
- `movimentacoes_estoque`: (produtoId, criadoEm DESC) → for audit trail
- `movimentacoes_estoque`: (referenceType, referenceId) → for linking

---

### 8.2 Cloud Functions (Server-Side Logic)

Recommended Cloud Functions:

1. **`registerInvoice`** (on-demand)
   - Input: notaFiscal document
   - Actions: Allocate freight, create stock movements, update CMV, link PO
   - Transactional, idempotent

2. **`confirmVenda`** (on-demand)
   - Input: atendimentoId
   - Actions: Reduce stock, create movements, trigger alerts
   - Transactional

3. **`relocateStock`** (on-demand)
   - Input: product, source, destination, quantity
   - Actions: Transfer between locations
   - Transactional

4. **`checkLowStockAlerts`** (scheduled, hourly)
   - Scan all alerts, check current stock
   - Trigger notifications

5. **`autoCreateBackOrder`** (on-demand)
   - Input: product, quantity
   - Creates PO with suggested supplier
   - Optional: auto-send if configured

---

### 8.3 Firestore Transactions vs Batch Writes

**Use Transactions for**:
- Invoice registration (multi-document consistency)
- Sale confirmation (atomic stock reduction + status update)
- Relocation (atomic location transfer)

**Use Batch Writes for**:
- Bulk alert status updates (no inter-document dependencies)
- Mass stock adjustments (if independent)

---

### 8.4 Real-Time Updates (Client-Side Listeners)

Use Firestore real-time listeners for:
- Stock Dashboard: Listen to all EstoqueItem docs for location
- PO List: Listen to pedidos_compra collection filtered by status
- Alerts: Listen to alerts_estoque for user's notificarPara list

**Caution**: Limit listeners to reduce cost. Use pagination for large result sets.

---

### 8.5 CMV History Tracking

Create sub-collection `produtos/{id}/cmv_historico`:
```typescript
interface CMVHistorico {
  id: string;
  dataAlteracao: Date;
  custoProduto: number;
  icms: number;
  ipi: number;
  freteUnitario: number;  // From last invoice
  cmvTotal: number;
  notaFiscalId?: string;  // Reference
  alteradoPorId: string;
}
```

This allows tracing CMV changes back to invoices.

---

## 9. Error Handling & Validation

### 9.1 Stock-Related Errors

- **Insufficient Stock**: When trying to sell more than available
  - Show available quantity to user
  - Offer to create back-order (Phase 4)

- **Duplicate Invoice**: When same NF# from same supplier registered twice
  - Warn user, require confirmation override

- **Missing PO on Invoice**: When invoicing without linked PO
  - Allowed, but flag for reconciliation

- **CMV Mismatch**: When registered CMV differs significantly from product cost
  - Log difference, notify approver

---

### 9.2 Validation Rules

- **PO**: All items must have supplier SKU or match existing product
- **Invoice**: Number + Series + Supplier must be unique
- **Stock Movement**: Cannot transfer more than available
- **Alert**: Minimum limit must be >= 0, notificarPara must not be empty

---

## 10. Security & Compliance

### 10.1 Firestore Rules Updates

Add to `firestore.rules`:

```
match /estoque/{id} {
  allow read: if isAuth() && hasRole(['admin', 'gerencia', 'comprador', 'estoquista', 'vendedor']);
  allow write: if isAuth() && hasRole(['admin', 'gerencia', 'comprador', 'estoquista']);
}

match /pedidos_compra/{id} {
  allow read: if isAuth() && hasRole(['admin', 'gerencia', 'comprador']);
  allow create: if isAuth() && hasRole(['admin', 'gerencia', 'comprador']);
  allow update: if isAuth() && (resource.data.criadoPorId == request.auth.uid || hasRole(['admin', 'gerencia']));
}

match /notas_fiscais/{id} {
  allow read: if isAuth() && hasRole(['admin', 'gerencia', 'comprador', 'financeiro']);
  allow create: if isAuth() && hasRole(['admin', 'gerencia', 'comprador']);
  allow update: if isAuth() && hasRole(['admin', 'gerencia', 'comprador']) && resource.data.status == 'rascunho';
}

match /movimentacoes_estoque/{id} {
  allow read: if isAuth() && hasRole(['admin', 'gerencia', 'comprador', 'estoquista', 'financeiro']);
  allow create: if false;  // Only server-side
}

match /alerts_estoque/{id} {
  allow read: if isAuth();
  allow write: if isAuth() && hasRole(['admin', 'gerencia', 'comprador']);
}
```

---

### 10.2 Audit Logging

Every stock movement (MovimentacaoEstoque) includes:
- User ID (registradoPorId)
- Timestamp (criadoEm)
- Reason/Reference (referenceId, motivo)

Estoquista cannot delete movements; only Gerencia/Admin can cancel a movement (which creates a reversal entry).

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Freight allocation algorithm
- CMV calculations
- Stock availability checks
- Alert triggering logic

### 11.2 Integration Tests
- Invoice registration (mock multi-doc transaction)
- Sale confirmation (mock stock reduction)
- Stock relocation (location updates)

### 11.3 E2E Tests
- Complete purchase flow: PO → Invoice → Stock increase
- Complete sales flow: Stock check → Sale → Stock reduction
- Back-order scenario

### 11.4 Firestore Rules Testing
- Use Firebase Emulator Suite
- Test role-based access for each operation

---

## 12. Future Enhancements (Post-MVP)

- **Barcode Scanning**: For faster stock counting and relocation
- **Automatic Reorder Points**: Trigger PO creation when stock hits min
- **Warehouse Optimization**: Suggest locations based on turnover
- **Multi-warehouse Support**: Expand beyond 4 locations
- **Inventory Reconciliation**: Physical vs. System stock audits
- **Supplier Performance**: Track delivery times, cost variance
- **Serial Number Tracking**: For high-value items
- **Lot/Batch Tracking**: For perishable items (FIFO)

---

## 13. Appendix: Data Relationships

```
Fornecedor (1) ←→ (N) PedidoCompra
Fornecedor (1) ←→ (N) NotaFiscal

Produto (1) ←→ (N) EstoqueItem
Produto (1) ←→ (N) AlertEstoque
Produto (1) ←→ (N) MovimentacaoEstoque

PedidoCompra (1) ←→ (N) NotaFiscal
PedidoCompra (1) ←→ (N) MovimentacaoEstoque (via referenceId)

NotaFiscal (1) ←→ (N) MovimentacaoEstoque (via referenceId)

Atendimento (1) ←→ (N) MovimentacaoEstoque (via referenceId, for sales)

Usuario: criadoPorId, registradoPorId, aprovadoPorId references

Empresa: Contains global settings (default estoque mínimo, etc.)
```

---

## Summary

This architecture establishes a robust, scalable foundation for inventory management in Mali ERP:

- **Data**: Five new collections organize stock, purchases, movements, and alerts
- **Flows**: Bidirectional integration between Sales, Stock, and Purchases
- **Logic**: Sophisticated cost allocation and availability calculations
- **UX**: Dedicated dashboard and workflows for each operation
- **Security**: Role-based access and immutable audit trails
- **Phases**: Phased implementation from data model to full integration

The modular design allows each phase to be developed independently while maintaining consistency through server-side transactions and Cloud Functions.
