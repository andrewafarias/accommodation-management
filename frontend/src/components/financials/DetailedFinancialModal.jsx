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
    const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Financeiro Detalhado</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            
            * {
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #1f2937;
              line-height: 1.6;
              background: white;
            }
            
            /* Header Styles */
            .report-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #9333ea;
            }
            
            .report-title {
              font-size: 28px;
              font-weight: 700;
              color: #9333ea;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
            }
            
            .report-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin: 4px 0;
            }
            
            .report-period {
              font-size: 16px;
              color: #374151;
              font-weight: 600;
              margin: 8px 0 0 0;
            }
            
            .report-meta {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #9ca3af;
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
            
            /* Section Styles */
            .section {
              margin-bottom: 35px;
              page-break-inside: avoid;
            }
            
            .section-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
              padding: 12px 16px;
              border-radius: 8px;
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .section-title.income {
              color: #15803d;
            }
            
            .section-title.expense {
              color: #dc2626;
            }
            
            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 24px;
              border-radius: 2px;
            }
            
            .section-title.income::before {
              background: #15803d;
            }
            
            .section-title.expense::before {
              background: #dc2626;
            }
            
            .section-count {
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
              background: white;
              padding: 4px 12px;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            /* Table Styles */
            table { 
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 20px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            thead {
              background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
            }
            
            th {
              padding: 12px 16px;
              text-align: left;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #374151;
              border-bottom: 2px solid #d1d5db;
            }
            
            th.text-right, td.text-right {
              text-align: right;
            }
            
            th.text-center, td.text-center {
              text-align: center;
            }
            
            tbody tr {
              background: white;
              border-bottom: 1px solid #f3f4f6;
            }
            
            tbody tr:hover {
              background: #fafafa;
            }
            
            tbody tr:last-child {
              border-bottom: none;
            }
            
            td {
              padding: 14px 16px;
              font-size: 13px;
              color: #374151;
            }
            
            td.description {
              font-weight: 500;
              color: #111827;
            }
            
            td.amount {
              font-weight: 700;
              font-size: 14px;
            }
            
            td.amount.income {
              color: #15803d;
            }
            
            td.amount.expense {
              color: #dc2626;
            }
            
            /* Status Badge */
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            
            .status-paid {
              background: #dcfce7;
              color: #15803d;
            }
            
            .status-pending {
              background: #fef3c7;
              color: #d97706;
            }
            
            /* Footer Styles */
            tfoot {
              background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
              border-top: 2px solid #d1d5db;
            }
            
            tfoot td {
              padding: 12px 16px;
              font-weight: 600;
              font-size: 14px;
            }
            
            tfoot tr.total-row td {
              font-weight: 700;
              font-size: 15px;
              padding-top: 16px;
            }
            
            tfoot tr.grand-total td {
              font-size: 16px;
              padding: 14px 16px;
              border-top: 2px solid #9ca3af;
            }
            
            /* Summary Box */
            .summary-box {
              margin-top: 40px;
              padding: 24px;
              background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
              border-radius: 12px;
              border: 2px solid #e9d5ff;
              box-shadow: 0 4px 6px rgba(147, 51, 234, 0.1);
              page-break-inside: avoid;
            }
            
            .summary-title {
              font-size: 18px;
              font-weight: 700;
              color: #7c3aed;
              margin: 0 0 20px 0;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .summary-grid {
              display: grid;
              gap: 16px;
              max-width: 500px;
              margin: 0 auto;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .summary-label {
              font-size: 15px;
              font-weight: 600;
              color: #4b5563;
            }
            
            .summary-value {
              font-size: 18px;
              font-weight: 700;
            }
            
            .summary-value.income {
              color: #15803d;
            }
            
            .summary-value.expense {
              color: #dc2626;
            }
            
            .summary-value.net {
              color: #1d4ed8;
            }
            
            .summary-value.net-negative {
              color: #dc2626;
            }
            
            .summary-row.net-result {
              background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
              border: 2px solid #93c5fd;
              padding: 16px;
            }
            
            .summary-row.net-result .summary-label {
              font-size: 16px;
              color: #1e3a8a;
            }
            
            .summary-row.net-result .summary-value {
              font-size: 22px;
            }
            
            /* Empty State */
            .empty-state {
              text-align: center;
              padding: 40px 20px;
              color: #9ca3af;
              font-style: italic;
            }
            
            /* Page Break */
            .page-break {
              page-break-after: always;
            }
            
            /* Footer */
            .report-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
            
            /* Print Optimizations */
            @media print {
              body {
                padding: 0;
              }
              
              .section {
                page-break-inside: avoid;
              }
              
              tbody tr {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1 class="report-title">Relatório Financeiro Detalhado</h1>
            <p class="report-subtitle">Sistema de Gestão de Acomodações</p>
            <p class="report-period">${showAllDates ? 'Período: Todas as Transações' : `Período: ${formatDate(startDate)} a ${formatDate(endDate)}`}</p>
            <div class="report-meta">
              <span>Gerado em: ${currentDate}</span>
              <span>AccommodationManager v1.0</span>
            </div>
          </div>
          
          ${printContent.innerHTML}
          
          <div class="report-footer">
            <p>Este relatório foi gerado automaticamente pelo sistema AccommodationManager.</p>
            <p>© ${new Date().getFullYear()} - Gestão de Acomodações</p>
          </div>
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
          {/* Income Section */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title income">Receitas (Entradas)</h3>
              <span className="section-count">
                {incomeTransactions.length} transação(ões)
              </span>
            </div>
            
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
                        <td className="py-3 px-4 description text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {getCategoryLabel(transaction.category)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {transaction.is_paid ? (
                            <span className="status-badge status-paid">
                              Pago
                            </span>
                          ) : (
                            <span className="status-badge status-pending">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right amount income font-semibold text-green-700">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state py-8 text-center text-gray-500">
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
                    <tr className="grand-total border-t border-gray-300">
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
          <div className="section">
            <div className="section-header">
              <h3 className="section-title expense">Despesas (Saídas)</h3>
              <span className="section-count">
                {expenseTransactions.length} transação(ões)
              </span>
            </div>
            
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
                        <td className="py-3 px-4 description text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {getCategoryLabel(transaction.category)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {transaction.is_paid ? (
                            <span className="status-badge status-paid">
                              Pago
                            </span>
                          ) : (
                            <span className="status-badge status-pending">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right amount expense font-semibold text-red-700">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state py-8 text-center text-gray-500">
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
                    <tr className="grand-total border-t border-gray-300">
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
          <div className="summary-box">
            <h3 className="summary-title">Resumo Financeiro</h3>
            <div className="summary-grid">
              <div className="summary-row">
                <span className="summary-label">Total de Receitas (Pagas):</span>
                <span className="summary-value income">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total de Despesas (Pagas):</span>
                <span className="summary-value expense">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="summary-row net-result">
                <span className="summary-label">Resultado Líquido:</span>
                <span className={`summary-value ${(totalIncome - totalExpenses) >= 0 ? 'net' : 'net-negative'}`}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </span>
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
