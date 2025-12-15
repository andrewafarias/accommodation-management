import { X, Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { format } from 'date-fns';

/**
 * GroupedFinancialModal Component
 * 
 * Modal showing income and expense transactions grouped by category.
 * Respects the date filters from the parent Financials page.
 */
export function GroupedFinancialModal({ 
  isOpen, 
  onClose, 
  transactions,
  startDate,
  endDate,
  showAllDates
}) {
  if (!isOpen) return null;

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

  // Aggregate transactions by category
  const aggregateByCategory = (type) => {
    const byCategory = {};
    
    filteredTransactions
      .filter(t => t.transaction_type === type && t.is_paid)
      .forEach(t => {
        const category = t.category;
        if (!byCategory[category]) {
          byCategory[category] = {
            total: 0,
            count: 0,
          };
        }
        byCategory[category].total += parseFloat(t.amount);
        byCategory[category].count += 1;
      });
    
    return byCategory;
  };

  const incomeByCategory = aggregateByCategory('INCOME');
  const expensesByCategory = aggregateByCategory('EXPENSE');

  // Calculate totals
  const totalIncome = Object.values(incomeByCategory).reduce((sum, cat) => sum + cat.total, 0);
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0);
  const netProfit = totalIncome - totalExpenses;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b no-print">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Relatório Agrupado por Categoria
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
        <div className="p-6 space-y-8 print-content">
          {/* Print Header (only visible when printing) */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Relatório Financeiro Agrupado
            </h1>
            <p className="text-gray-600">
              {showAllDates 
                ? 'Período: Todas as Transações' 
                : `Período: ${formatDate(startDate)} a ${formatDate(endDate)}`}
            </p>
          </div>

          {/* Income Section */}
          <div>
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center">
              <span className="flex-1">Receitas por Categoria</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="py-3 px-4 text-left font-semibold">Categoria</th>
                    <th className="py-3 px-4 text-center font-semibold">Quantidade</th>
                    <th className="py-3 px-4 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(incomeByCategory).length > 0 ? (
                    Object.entries(incomeByCategory).map(([category, data]) => (
                      <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">
                          {getCategoryLabel(category)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {data.count} transação(ões)
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">
                          {formatCurrency(data.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-gray-500">
                        Nenhuma receita no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                {Object.keys(incomeByCategory).length > 0 && (
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan="2" className="py-3 px-4 text-right font-bold">
                        Total de Receitas:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-700 text-lg">
                        {formatCurrency(totalIncome)}
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
              <span className="flex-1">Despesas por Categoria</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="py-3 px-4 text-left font-semibold">Categoria</th>
                    <th className="py-3 px-4 text-center font-semibold">Quantidade</th>
                    <th className="py-3 px-4 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(expensesByCategory).length > 0 ? (
                    Object.entries(expensesByCategory).map(([category, data]) => (
                      <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">
                          {getCategoryLabel(category)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {data.count} transação(ões)
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-700">
                          {formatCurrency(data.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-gray-500">
                        Nenhuma despesa no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                {Object.keys(expensesByCategory).length > 0 && (
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan="2" className="py-3 px-4 text-right font-bold">
                        Total de Despesas:
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-700 text-lg">
                        {formatCurrency(totalExpenses)}
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
                  <span className="font-semibold text-base">Total de Receitas:</span>
                  <span className="text-green-700 font-bold text-base">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-base">Total de Despesas:</span>
                  <span className="text-red-700 font-bold text-base">{formatCurrency(totalExpenses)}</span>
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end no-print">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
