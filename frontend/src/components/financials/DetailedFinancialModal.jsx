import { X, Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { format } from 'date-fns';

/**
 * DetailedFinancialModal Component
 * 
 * Modal showing detailed income and expense transactions with totals.
 * Respects the date filters from the parent Financials page.
 */
export function DetailedFinancialModal({ 
  isOpen, 
  onClose, 
  transactions,
  startDate,
  endDate,
  showAllDates
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    // Create a temporary print window with detailed report content
    const printContent = document.getElementById('detailed-report-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Detalhado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-center: center; }
            .text-green { color: #15803d; }
            .text-red { color: #dc2626; }
            .text-blue { color: #1d4ed8; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 1.125rem; }
            .header { text-align: center; margin-bottom: 24px; }
            .section-title { font-size: 1.25rem; font-weight: bold; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid; }
            .income-title { color: #15803d; border-color: #15803d; }
            .expense-title { color: #dc2626; border-color: #dc2626; }
            .status-paid { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
            .status-pending { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
            .summary { border-top: 2px solid #333; padding-top: 16px; margin-top: 24px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

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

  const filteredTransactions = getFilteredTransactions();

  // Separate income and expenses
  const incomeTransactions = filteredTransactions
    .filter(t => t.transaction_type === 'INCOME')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
  const expenseTransactions = filteredTransactions
    .filter(t => t.transaction_type === 'EXPENSE')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Calculate totals
  const totalIncome = incomeTransactions
    .filter(t => t.is_paid)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const totalIncomeUnpaid = incomeTransactions
    .filter(t => !t.is_paid)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = expenseTransactions
    .filter(t => t.is_paid)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
  const totalExpensesUnpaid = expenseTransactions
    .filter(t => !t.is_paid)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b no-print">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Relatório Detalhado
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {showAllDates 
                ? 'Período: Todas as Transações' 
                : `Período: ${formatDate(startDate)} a ${formatDate(endDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="detailed-report-content" className="p-6 space-y-8">
          {/* Print Header */}
          <div className="header hidden print:block">
            <h1 className="text-2xl font-bold">Relatório Financeiro Detalhado</h1>
            <p className="text-gray-600">
              {showAllDates 
                ? 'Período: Todas as Transações' 
                : `Período: ${formatDate(startDate)} a ${formatDate(endDate)}`}
            </p>
          </div>

          {/* Income Section */}
          <div>
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center section-title income-title">
              <span className="flex-1">Receitas (Entradas)</span>
              <span className="text-sm font-normal text-gray-600">
                {incomeTransactions.length} transação(ões)
              </span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="py-3 px-4 text-left font-semibold">Data</th>
                    <th className="py-3 px-4 text-left font-semibold">Descrição</th>
                    <th className="py-3 px-4 text-left font-semibold">Categoria</th>
                    <th className="py-3 px-4 text-center font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeTransactions.length > 0 ? (
                    incomeTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">
                          {formatDate(transaction.due_date)}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {getCategoryLabel(transaction.category)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {transaction.is_paid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Pago
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        Nenhuma receita no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                {incomeTransactions.length > 0 && (
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan="4" className="py-3 px-4 text-right font-bold">
                        Total Pago:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-700 text-base">
                        {formatCurrency(totalIncome)}
                      </td>
                    </tr>
                    {totalIncomeUnpaid > 0 && (
                      <tr>
                        <td colSpan="4" className="py-3 px-4 text-right font-semibold text-gray-600">
                          Total Pendente:
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-yellow-700">
                          {formatCurrency(totalIncomeUnpaid)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="py-3 px-4 text-right font-bold text-lg">
                        Total Geral:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-700 text-lg">
                        {formatCurrency(totalIncome + totalIncomeUnpaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center">
              <span className="flex-1">Despesas (Saídas)</span>
              <span className="text-sm font-normal text-gray-600">
                {expenseTransactions.length} transação(ões)
              </span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="py-3 px-4 text-left font-semibold">Data</th>
                    <th className="py-3 px-4 text-left font-semibold">Descrição</th>
                    <th className="py-3 px-4 text-left font-semibold">Categoria</th>
                    <th className="py-3 px-4 text-center font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTransactions.length > 0 ? (
                    expenseTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">
                          {formatDate(transaction.due_date)}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {getCategoryLabel(transaction.category)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {transaction.is_paid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Pago
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-700">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        Nenhuma despesa no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                {expenseTransactions.length > 0 && (
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan="4" className="py-3 px-4 text-right font-bold">
                        Total Pago:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-700 text-base">
                        {formatCurrency(totalExpenses)}
                      </td>
                    </tr>
                    {totalExpensesUnpaid > 0 && (
                      <tr>
                        <td colSpan="4" className="py-3 px-4 text-right font-semibold text-gray-600">
                          Total Pendente:
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-yellow-700">
                          {formatCurrency(totalExpensesUnpaid)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="py-3 px-4 text-right font-bold text-lg">
                        Total Geral:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-700 text-lg">
                        {formatCurrency(totalExpenses + totalExpensesUnpaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t-2 border-gray-800 pt-6">
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-base">Total de Receitas (Pagas):</span>
                  <span className="text-green-700 font-bold text-base">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-base">Total de Despesas (Pagas):</span>
                  <span className="text-red-700 font-bold text-base">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-2 pt-2">
                  <span className="font-bold text-lg">Resultado Líquido:</span>
                  <span className={`font-bold text-lg ${(totalIncome - totalExpenses) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatCurrency(totalIncome - totalExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
