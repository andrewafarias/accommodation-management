import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TransactionTable } from '../components/financials/TransactionTable';
import { TransactionModal } from '../components/financials/TransactionModal';
import { FinancialReport } from '../components/financials/FinancialReport';
import { DetailedFinancialModal } from '../components/financials/DetailedFinancialModal';
import { GroupedFinancialModal } from '../components/financials/GroupedFinancialModal';
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
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
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

    setFilteredTransactions(filtered);
  }, [transactions, activeFilter, categoryFilter, startDate, endDate, showAllDates]);

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
      await api.patch(`financials/${transactionId}/`, {
        paid_date: today,
      });
      await fetchTransactions();
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
    }
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDetailedModalOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Relatório Detalhado
            </Button>
            <Button variant="outline" onClick={() => setIsGroupedModalOpen(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatório Agrupado
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showAllDates"
                checked={showAllDates}
                onChange={(e) => setShowAllDates(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="showAllDates" className="text-sm font-medium text-gray-700">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                    netProfit >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(netProfit)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
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
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
          />
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
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
