import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TransactionTable } from '../components/financials/TransactionTable';
import { TransactionModal } from '../components/financials/TransactionModal';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../services/api';

export function Financials() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = [...transactions];

    if (activeFilter === 'INCOME') {
      filtered = filtered.filter((t) => t.transaction_type === 'INCOME');
    } else if (activeFilter === 'EXPENSE') {
      filtered = filtered.filter((t) => t.transaction_type === 'EXPENSE');
    }

    setFilteredTransactions(filtered);
  }, [transactions, activeFilter]);

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

  // Calculate monthly summary
  const calculateMonthlySummary = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlyTransactions = transactions.filter((t) => {
      const dueDate = new Date(t.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });

    const income = monthlyTransactions
      .filter((t) => t.transaction_type === 'INCOME' && t.is_paid)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenses = monthlyTransactions
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando transações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Receitas (Mês)
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
                  Despesas (Mês)
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
                  Lucro Líquido (Mês)
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
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={filteredTransactions}
            onMarkAsPaid={handleMarkAsPaid}
          />
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}
