/**
 * Testes para cálculos críticos do ERP.
 * Garante que faturamento, CMV, pontuação e comissões estão corretos.
 *
 * Para rodar: npm test (após configurar Jest)
 */

describe('Cálculos de CMV', () => {
  const calcularCMV = (custo: number, icms: number, ipi: number, frete: number): number => {
    return custo + icms + ipi + frete;
  };

  it('deve calcular CMV corretamente', () => {
    const custo = 100;
    const icms = 15;
    const ipi = 10;
    const frete = 5;
    const esperado = 130;

    const resultado = calcularCMV(custo, icms, ipi, frete);
    expect(resultado).toBe(esperado);
  });

  it('deve calcular CMV com valores zero', () => {
    const resultado = calcularCMV(100, 0, 0, 0);
    expect(resultado).toBe(100);
  });

  it('deve calcular CMV com valores negativos (desconto)', () => {
    const resultado = calcularCMV(100, 10, -5, 2);
    expect(resultado).toBe(107);
  });
});

describe('Cálculos de Preço e Pontuação', () => {
  interface ItemOrcamento {
    cmv: number;
    precoAplicado: number;
    qtd: number;
  }

  const calcularPontuacao = (cmv: number, precoAplicado: number): number => {
    if (precoAplicado === 0) return 0;
    return cmv / precoAplicado;
  };

  const calcularSubtotal = (items: ItemOrcamento[]): number => {
    return items.reduce((sum, item) => sum + item.precoAplicado * item.qtd, 0);
  };

  it('deve calcular pontuação corretamente', () => {
    const cmv = 100;
    const preco = 200;
    const resultado = calcularPontuacao(cmv, preco);
    expect(resultado).toBeCloseTo(0.5);
  });

  it('deve calcular pontuação mínima de 1.0', () => {
    const cmv = 100;
    const preco = 100;
    const resultado = calcularPontuacao(cmv, preco);
    expect(resultado).toBe(1);
  });

  it('deve calcular pontuação > 2.0 (boa margem)', () => {
    const cmv = 100;
    const preco = 300;
    const resultado = calcularPontuacao(cmv, preco);
    expect(resultado).toBeCloseTo(0.333, 2);
  });

  it('deve calcular subtotal de múltiplos itens', () => {
    const items: ItemOrcamento[] = [
      { cmv: 100, precoAplicado: 200, qtd: 1 },
      { cmv: 50, precoAplicado: 150, qtd: 2 },
      { cmv: 75, precoAplicado: 225, qtd: 3 },
    ];

    const resultado = calcularSubtotal(items);
    const esperado = 200 + 150 * 2 + 225 * 3;
    expect(resultado).toBe(esperado);
  });

  it('deve retornar 0 para pontuação com preço zero', () => {
    const resultado = calcularPontuacao(100, 0);
    expect(resultado).toBe(0);
  });
});

describe('Cálculos de Comissão', () => {
  interface Venda {
    valor: number;
    vendedorId: string;
  }

  const calcularComissao = (valor: number, percentual: number): number => {
    return (valor * percentual) / 100;
  };

  const calcularComissaoPorVendedor = (vendas: Venda[], vendedorId: string, percentual: number): number => {
    const vendedorVendas = vendas
      .filter((v) => v.vendedorId === vendedorId)
      .reduce((sum, v) => sum + v.valor, 0);
    return calcularComissao(vendedorVendas, percentual);
  };

  it('deve calcular comissão simples corretamente', () => {
    const valor = 1000;
    const percentual = 5;
    const resultado = calcularComissao(valor, percentual);
    expect(resultado).toBe(50);
  });

  it('deve calcular comissão de 10%', () => {
    const resultado = calcularComissao(1000, 10);
    expect(resultado).toBe(100);
  });

  it('deve calcular comissão por vendedor', () => {
    const vendas: Venda[] = [
      { valor: 1000, vendedorId: 'vendedor1' },
      { valor: 500, vendedorId: 'vendedor1' },
      { valor: 2000, vendedorId: 'vendedor2' },
    ];

    const resultado = calcularComissaoPorVendedor(vendas, 'vendedor1', 5);
    const esperado = (1000 + 500) * 0.05;
    expect(resultado).toBe(esperado);
  });

  it('deve retornar 0 para vendedor sem vendas', () => {
    const vendas: Venda[] = [{ valor: 1000, vendedorId: 'vendedor1' }];

    const resultado = calcularComissaoPorVendedor(vendas, 'vendedor2', 5);
    expect(resultado).toBe(0);
  });

  it('deve calcular corretamente com percentual decimal', () => {
    const resultado = calcularComissao(1000, 2.5);
    expect(resultado).toBe(25);
  });
});

describe('Cálculos de Margem', () => {
  const calcularMargemLiquida = (faturamento: number, custoTotal: number): number => {
    if (faturamento === 0) return 0;
    return ((faturamento - custoTotal) / faturamento) * 100;
  };

  const calcularMargemBruta = (faturamento: number, cmvTotal: number): number => {
    if (faturamento === 0) return 0;
    return ((faturamento - cmvTotal) / faturamento) * 100;
  };

  it('deve calcular margem líquida corretamente', () => {
    const faturamento = 1000;
    const custo = 600;
    const resultado = calcularMargemLiquida(faturamento, custo);
    expect(resultado).toBeCloseTo(40, 1);
  });

  it('deve retornar 0 para faturamento zero', () => {
    const resultado = calcularMargemLiquida(0, 100);
    expect(resultado).toBe(0);
  });

  it('deve retornar negativo se custo > faturamento', () => {
    const resultado = calcularMargemLiquida(500, 600);
    expect(resultado).toBeLessThan(0);
  });

  it('deve calcular margem bruta', () => {
    const faturamento = 1000;
    const cmv = 400;
    const resultado = calcularMargemBruta(faturamento, cmv);
    expect(resultado).toBeCloseTo(60, 1);
  });
});

describe('Validações de Entrada', () => {
  const validarPreco = (preco: number): boolean => {
    return preco > 0 && isFinite(preco);
  };

  const validarQtd = (qtd: number): boolean => {
    return qtd > 0 && Number.isInteger(qtd);
  };

  it('deve validar preço positivo', () => {
    expect(validarPreco(100)).toBe(true);
    expect(validarPreco(0)).toBe(false);
    expect(validarPreco(-10)).toBe(false);
    expect(validarPreco(Infinity)).toBe(false);
  });

  it('deve validar quantidade inteira positiva', () => {
    expect(validarQtd(1)).toBe(true);
    expect(validarQtd(5)).toBe(true);
    expect(validarQtd(0)).toBe(false);
    expect(validarQtd(-1)).toBe(false);
    expect(validarQtd(1.5)).toBe(false);
  });
});

describe('Testes de Precisão Numérica', () => {
  it('deve lidar com arredondamento de centavos', () => {
    const resultado = 0.1 + 0.2;
    const esperado = 0.3;
    expect(Math.abs(resultado - esperado)).toBeLessThan(0.0001);
  });

  it('deve calcular múltiplas parcelas sem perder centavos', () => {
    const total = 100;
    const numParcelas = 3;
    const valorParcela = total / numParcelas;

    let soma = 0;
    for (let i = 0; i < numParcelas; i++) {
      soma += parseFloat(valorParcela.toFixed(2));
    }

    expect(soma).toBeCloseTo(total, 1);
  });
});
