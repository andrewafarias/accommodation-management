import { format } from 'date-fns';

export function FinancialReport({ transactions, startDate, endDate, showAllDates }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const getCategoryLabel = (category) => {
    const labels = {
      LODGING: 'Hospedagem',
      MAINTENANCE: 'Manutenção',
      UTILITIES: 'Utilidades',
      SUPPLIES: 'Suprimentos',
      SALARY: 'Salário',
      OTHER: 'Outro',
    };
    return labels[category] || category;
  };

  // Filter transactions by date range (if not showing all)
  const getFilteredTransactions = () => {
    if (showAllDates) {
      return transactions;
    }
    
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    return transactions.filter((t) => {
      const dueDate = new Date(t.due_date);
      return dueDate >= rangeStart && dueDate <= rangeEnd;
    });
  };

  // Aggregate transactions by category
  const aggregateByCategory = () => {
    const filteredTransactions = getFilteredTransactions();
    const incomeByCategory = {};
    const expensesByCategory = {};

    filteredTransactions.forEach((transaction) => {
      if (!transaction.is_paid) return; // Only count paid transactions
      
      const category = transaction.category;
      const amount = parseFloat(transaction.amount);

      if (transaction.transaction_type === 'INCOME') {
        incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
      } else if (transaction.transaction_type === 'EXPENSE') {
        expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
      }
    });

    return { incomeByCategory, expensesByCategory };
  };

  const { incomeByCategory, expensesByCategory } = aggregateByCategory();

  // Calculate totals
  const totalIncome = Object.values(incomeByCategory).reduce((sum, val) => sum + val, 0);
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="print-only">
      <style>{`
        @media print {
          .print-only {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .print-only,
          .print-only * {
            visibility: visible;
          }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
      
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Balancete Financeiro Agrupado
          </h1>
          <p className="text-gray-600">
            {showAllDates 
              ? 'Período: Todas as Transações' 
              : `Período: ${formatDate(startDate)} a ${formatDate(endDate)}`}
          </p>
        </div>

        {/* Income Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-green-700 mb-4 border-b-2 border-green-700 pb-2">
            Receitas (Entradas)
          </h2>
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-2 px-4 text-left font-semibold">Categoria</th>
                <th className="py-2 px-4 text-right font-semibold">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(incomeByCategory).length > 0 ? (
                Object.entries(incomeByCategory).map(([category, amount]) => (
                  <tr key={category} className="border-b border-gray-200">
                    <td className="py-2 px-4 text-sm">{getCategoryLabel(category)}</td>
                    <td className="py-2 px-4 text-sm text-right text-green-700 font-semibold">
                      {formatCurrency(amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-4 text-center text-gray-500 text-sm">
                    Nenhuma receita no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expenses Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-red-700 mb-4 border-b-2 border-red-700 pb-2">
            Despesas (Saídas)
          </h2>
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-2 px-4 text-left font-semibold">Categoria</th>
                <th className="py-2 px-4 text-right font-semibold">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(expensesByCategory).length > 0 ? (
                Object.entries(expensesByCategory).map(([category, amount]) => (
                  <tr key={category} className="border-b border-gray-200">
                    <td className="py-2 px-4 text-sm">{getCategoryLabel(category)}</td>
                    <td className="py-2 px-4 text-sm text-right text-red-700 font-semibold">
                      {formatCurrency(amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-4 text-center text-gray-500 text-sm">
                    Nenhuma despesa no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="border-t-2 border-gray-800 pt-4">
          <div className="flex justify-end">
            <div className="w-1/2">
              <div className="flex justify-between py-2">
                <span className="font-semibold">Total de Receitas:</span>
                <span className="text-green-700 font-bold">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Total de Despesas:</span>
                <span className="text-red-700 font-bold">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-2 pt-2">
                <span className="font-bold text-lg">Resultado Líquido:</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Relatório gerado em {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
}
