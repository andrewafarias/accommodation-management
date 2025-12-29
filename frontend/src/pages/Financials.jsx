import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportButtons } from '../components/ui/ImportExportButtons';
import { TransactionTable } from '../components/financials/TransactionTable';
import { TransactionModal } from '../components/financials/TransactionModal';
import { FinancialReport } from '../components/financials/FinancialReport';
import { DetailedFinancialModal } from '../components/financials/DetailedFinancialModal';
import { GroupedFinancialModal } from '../components/financials/GroupedFinancialModal';
import { TransactionDetailsModal } from '../components/financials/TransactionDetailsModal';
import { Plus, TrendingUp, TrendingDown, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../services/api';

export function Financials() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState(false);
  const [isGroupedModalOpen, setIsGroupedModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paidStatusFilter, setPaidStatusFilter] = useState('ALL');
  // Default to show all dates (as per requirement: "O padrão do financeiro deve ser ver tudo")
  const [showAllDates, setShowAllDates] = useState(true);
  
  // Date range state - default to current month
  const [startDate, setStartDate] = useState(() => 
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() => 
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = [...transactions];

    // Filter by date range (unless "All Dates" is active)
    if (!showAllDates) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      filtered = filtered.filter((t) => {
        const dueDate = new Date(t.due_date);
        return dueDate >= rangeStart && dueDate <= rangeEnd;
      });
    }

    // Filter by transaction type
    if (activeFilter === 'INCOME') {
      filtered = filtered.filter((t) => t.transaction_type === 'INCOME');
    } else if (activeFilter === 'EXPENSE') {
      filtered = filtered.filter((t) => t.transaction_type === 'EXPENSE');
    }

    // Filter by category
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Filter by paid status
    if (paidStatusFilter === 'PAID') {
      filtered = filtered.filter((t) => t.is_paid);
    } else if (paidStatusFilter === 'UNPAID') {
      filtered = filtered.filter((t) => !t.is_paid);
    }

    setFilteredTransactions(filtered);
  }, [transactions, activeFilter, categoryFilter, paidStatusFilter, startDate, endDate, showAllDates]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('financials/');
      const data = response.data.results || response.data;
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (formData) => {
    try {
      await api.post('financials/', formData);
      await fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const handleMarkAsPaid = async (transactionId) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Find the transaction to check if it's linked to a reservation
      const transaction = transactions.find(t => t.id === transactionId);
      
      // Mark the transaction as paid
      await api.patch(`financials/${transactionId}/`, {
        paid_date: today,
      });
      
      // If transaction is linked to a reservation, fill the payment pool (Item 12)
      if (transaction && transaction.reservation) {
        try {
          // Fetch the reservation to get current data
          const resResponse = await api.get(`reservations/${transaction.reservation}/`);
          const reservation = resResponse.data;
          
          // Only update if not already fully paid
          const currentPaid = parseFloat(reservation.amount_paid) || 0;
          const totalPrice = parseFloat(reservation.total_price) || 0;
          const transactionAmount = parseFloat(transaction.amount) || 0;
          
          if (currentPaid < totalPrice) {
            // Add payment to fill the pool up to total_price
            const newAmountPaid = Math.min(totalPrice, currentPaid + transactionAmount);
            const paymentEntry = {
              date: new Date().toISOString(),
              amount: newAmountPaid - currentPaid,
              method: 'Pagamento (Financeiro)'
            };
            
            await api.patch(`reservations/${transaction.reservation}/`, {
              amount_paid: newAmountPaid,
              payment_history: [...(reservation.payment_history || []), paymentEntry],
              status: newAmountPaid >= totalPrice ? 'CONFIRMED' : reservation.status
            });
          }
        } catch (resError) {
          console.error('Error updating reservation payment pool:', resError);
        }
      }
      
      await fetchTransactions();
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
    }
  };

  const handleUpdateTransaction = async (transactionId, formData) => {
    try {
      // Use the response data directly from the API call
      const response = await api.patch(`financials/${transactionId}/`, formData);
      // Update selected transaction with the response data
      setSelectedTransaction(response.data);
      // Refresh transactions list
      await fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }
    
    try {
      await api.delete(`financials/${transactionId}/`);
      await fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir transação. Tente novamente.');
    }
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      const response = await api.get(`financials/export_data/?export_format=${format}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financials.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting financials:', error);
      alert('Erro ao exportar transações.');
    }
  };

  // Handle import
  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('financials/import_data/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { imported, errors } = response.data;
      
      if (errors && errors.length > 0) {
        alert(`Importadas: ${imported} transações.\nErros: ${errors.length} registros não puderam ser importados.`);
      } else {
        alert(`Importadas: ${imported} transações com sucesso!`);
      }
      
      // Refresh the list
      await fetchTransactions();
    } catch (error) {
      console.error('Error importing financials:', error);
      alert('Erro ao importar transações. Verifique o formato do arquivo.');
    }
  };

  // Calculate monthly summary
  const calculateMonthlySummary = () => {
    let rangeTransactions = transactions;

    // Apply date filter unless "All Dates" is active
    if (!showAllDates) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      rangeTransactions = transactions.filter((t) => {
        const dueDate = new Date(t.due_date);
        return dueDate >= rangeStart && dueDate <= rangeEnd;
      });
    }

    const income = rangeTransactions
      .filter((t) => t.transaction_type === 'INCOME' && t.is_paid)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenses = rangeTransactions
      .filter((t) => t.transaction_type === 'EXPENSE' && t.is_paid)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netProfit = income - expenses;

    return { income, expenses, netProfit };
  };

  const { income, expenses, netProfit } = calculateMonthlySummary();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const filterButtons = [
    { id: 'ALL', label: 'Todas' },
    { id: 'INCOME', label: 'Receitas' },
    { id: 'EXPENSE', label: 'Despesas' },
  ];

  const categoryOptions = [
    { value: 'ALL', label: 'Todas as Categorias' },
    { value: 'LODGING', label: 'Hospedagem' },
    { value: 'MAINTENANCE', label: 'Manutenção' },
    { value: 'UTILITIES', label: 'Utilidades' },
    { value: 'SUPPLIES', label: 'Suprimentos' },
    { value: 'SALARY', label: 'Salário' },
    { value: 'OTHER', label: 'Outro' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando transações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Report Component - Only visible when printing */}
      <FinancialReport 
        transactions={transactions}
        startDate={startDate}
        endDate={endDate}
        showAllDates={showAllDates}
      />

      {/* Main Content - Hidden when printing */}
      <div className="no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financeiro</h1>
          <div className="flex flex-wrap gap-2">
            <ImportExportButtons 
              onExport={handleExport}
              onImport={handleImport}
            />
            <Button variant="outline" onClick={() => setIsDetailedModalOpen(true)} aria-label="Relatório Detalhado">
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Relatório Detalhado</span>
            </Button>
            <Button variant="outline" onClick={() => setIsGroupedModalOpen(true)} aria-label="Relatório Agrupado">
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Relatório Agrupado</span>
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-initial" aria-label="Nova Transação">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nova Transação</span>
            </Button>
          </div>
        </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex items-center gap-2 sm:order-first">
              <input
                type="checkbox"
                id="showAllDates"
                checked={showAllDates}
                onChange={(e) => setShowAllDates(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="showAllDates" className="text-xs sm:text-sm font-medium text-gray-700">
                Ignorar Datas / Ver Tudo
              </label>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={showAllDates}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={showAllDates}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {showAllDates ? 'Receitas (Todas)' : 'Receitas (Período)'}
                </p>
                <p className="mt-2 text-2xl font-bold text-green-600">
                  {formatCurrency(income)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {showAllDates ? 'Despesas (Todas)' : 'Despesas (Período)'}
                </p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {formatCurrency(expenses)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {showAllDates ? 'Lucro Líquido (Todas)' : 'Lucro Líquido (Período)'}
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    netProfit >= 0 ? 'text-accent-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(netProfit)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary-100">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex gap-4 items-center">
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700">
                  Categoria:
                </label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid Status Filter Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex gap-2">
                  <Button
                    variant={paidStatusFilter === 'ALL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaidStatusFilter('ALL')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={paidStatusFilter === 'PAID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaidStatusFilter('PAID')}
                  >
                    Pago
                  </Button>
                  <Button
                    variant={paidStatusFilter === 'UNPAID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaidStatusFilter('UNPAID')}
                  >
                    Não Pago
                  </Button>
                </div>
              </div>
              
              {/* Type Filter Buttons */}
              <div className="flex gap-2">
                {filterButtons.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={filteredTransactions}
            onMarkAsPaid={handleMarkAsPaid}
            onDelete={handleDeleteTransaction}
            onTransactionClick={handleTransactionClick}
          />
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onUpdate={handleUpdateTransaction}
        onMarkAsPaid={handleMarkAsPaid}
      />

      {/* Detailed Financial Modal */}
      <DetailedFinancialModal
        isOpen={isDetailedModalOpen}
        onClose={() => setIsDetailedModalOpen(false)}
        transactions={transactions}
        startDate={startDate}
        endDate={endDate}
        showAllDates={showAllDates}
      />

      {/* Grouped Financial Modal */}
      <GroupedFinancialModal
        isOpen={isGroupedModalOpen}
        onClose={() => setIsGroupedModalOpen(false)}
        transactions={transactions}
        startDate={startDate}
        endDate={endDate}
        showAllDates={showAllDates}
      />
      </div>
    </div>
  );
}
