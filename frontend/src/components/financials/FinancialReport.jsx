import { format } from 'date-fns';

export function FinancialReport({ transactions, startDate, endDate, income, expenses, netProfit }) {
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
            Relatório Financeiro
          </h1>
          <p className="text-gray-600">
            Período: {formatDate(startDate)} a {formatDate(endDate)}
          </p>
        </div>

        {/* Transactions Table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 px-4 text-left font-semibold">Data</th>
              <th className="py-2 px-4 text-left font-semibold">Descrição</th>
              <th className="py-2 px-4 text-left font-semibold">Categoria</th>
              <th className="py-2 px-4 text-right font-semibold">Entrada</th>
              <th className="py-2 px-4 text-right font-semibold">Saída</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-gray-300">
                <td className="py-2 px-4 text-sm">
                  {formatDate(transaction.due_date)}
                </td>
                <td className="py-2 px-4 text-sm">
                  {transaction.description || '-'}
                </td>
                <td className="py-2 px-4 text-sm">
                  {getCategoryLabel(transaction.category)}
                </td>
                <td className="py-2 px-4 text-sm text-right">
                  {transaction.transaction_type === 'INCOME' && transaction.is_paid
                    ? formatCurrency(transaction.amount)
                    : '-'}
                </td>
                <td className="py-2 px-4 text-sm text-right">
                  {transaction.transaction_type === 'EXPENSE' && transaction.is_paid
                    ? formatCurrency(transaction.amount)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="border-t-2 border-gray-800 pt-4">
          <div className="flex justify-end">
            <div className="w-1/2">
              <div className="flex justify-between py-2">
                <span className="font-semibold">Total de Receitas:</span>
                <span className="text-green-700 font-bold">{formatCurrency(income)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Total de Despesas:</span>
                <span className="text-red-700 font-bold">{formatCurrency(expenses)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-2 pt-2">
                <span className="font-bold text-lg">Saldo do Período:</span>
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
