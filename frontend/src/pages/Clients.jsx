import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportButtons } from '../components/ui/ImportExportButtons';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { Users, Plus, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

export function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    by_reservations: true,
    by_days_stayed: true,
    by_total_paid: true,
    by_avg_per_night: true,
  });

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('clients/');
      const clientsData = response.data.results || response.data;
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankings = async () => {
    try {
      const response = await api.get('clients/rankings/');
      setRankings(response.data);
      setShowRankings(true);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      alert('Erro ao carregar rankings.');
    }
  };

  // Handle opening modal for new client
  const handleNewClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEdit = (client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  // Handle saving client (create or update)
  const handleSave = async (clientData) => {
    try {
      // When sending FormData, we need to let the browser set the Content-Type
      // with the correct boundary for multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      let response;
      if (editingClient) {
        // Update existing client
        response = await api.put(`clients/${editingClient.id}/`, clientData, config);
      } else {
        // Create new client
        response = await api.post('clients/', clientData, config);
      }
      // Refresh the list
      await fetchClients();
      // Return the saved client data
      return response.data;
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  };

  // Handle delete
  const handleDelete = async (client) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${client.full_name}?`)) {
      return;
    }

    try {
      await api.delete(`clients/${client.id}/`);
      // Refresh the list
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Falha ao excluir cliente. Por favor, tente novamente.');
    }
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      const response = await api.get(`clients/export_data/?export_format=${format}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clients.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting clients:', error);
      alert('Erro ao exportar clientes.');
    }
  };

  // Handle import
  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('clients/import_data/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { imported, errors } = response.data;
      
      if (errors && errors.length > 0) {
        alert(`Importados: ${imported} clientes.\nErros: ${errors.length} registros não puderam ser importados.`);
      } else {
        alert(`Importados: ${imported} clientes com sucesso!`);
      }
      
      // Refresh the list
      await fetchClients();
    } catch (error) {
      console.error('Error importing clients:', error);
      alert('Erro ao importar clientes. Verifique o formato do arquivo.');
    }
  };

  // Get existing CPFs for validation
  const existingCpfs = clients.map(c => c.cpf);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchRankings} variant="outline" className="flex-1 sm:flex-initial" aria-label="Rankings">
            <TrendingUp className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Rankings</span>
          </Button>
          <ImportExportButtons 
            onExport={handleExport}
            onImport={handleImport}
          />
          <Button onClick={handleNewClient} className="flex-1 sm:flex-initial" aria-label="Novo Cliente">
            <Plus className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Client List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Gerenciamento de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientList
            clients={clients}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        client={editingClient}
        existingCpfs={existingCpfs}
      />

      {/* Rankings Modal */}
      {showRankings && rankings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Rankings de Clientes</h2>
                <button
                  onClick={() => setShowRankings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* General Statistics */}
              {rankings.general_stats && (
                <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                    <div className="text-sm text-primary-600 font-medium mb-1">Total de Reservas</div>
                    <div className="text-2xl font-bold text-primary-900">{rankings.general_stats.total_reservations}</div>
                  </div>
                  <div className="bg-secondary-50 p-4 rounded-lg border border-secondary-200">
                    <div className="text-sm text-secondary-600 font-medium mb-1">Total de Dias</div>
                    <div className="text-2xl font-bold text-secondary-900">{rankings.general_stats.total_days_stayed}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium mb-1">Total Arrecadado</div>
                    <div className="text-2xl font-bold text-green-900">R$ {rankings.general_stats.total_amount_paid.toFixed(2)}</div>
                  </div>
                  <div className="bg-accent-50 p-4 rounded-lg border border-accent-200">
                    <div className="text-sm text-accent-600 font-medium mb-1">Média por Noite</div>
                    <div className="text-2xl font-bold text-accent-900">R$ {rankings.general_stats.average_price_per_night.toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Reservations */}
                <div>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, by_reservations: !prev.by_reservations }))}
                    className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-primary-600 transition-colors"
                  >
                    <span>Por Número de Reservas</span>
                    {expandedCategories.by_reservations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedCategories.by_reservations && (
                  <div className="space-y-2">
                    {rankings.by_reservations.slice(0, 10).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary-600 w-8">#{client.rank}</span>
                          <span className="text-sm font-medium text-gray-900">{client.full_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{client.reservations_count} reservas</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {/* By Days Stayed */}
                <div>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, by_days_stayed: !prev.by_days_stayed }))}
                    className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-secondary-600 transition-colors"
                  >
                    <span>Por Dias Hospedados</span>
                    {expandedCategories.by_days_stayed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedCategories.by_days_stayed && (
                  <div className="space-y-2">
                    {rankings.by_days_stayed.slice(0, 10).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-secondary-600 w-8">#{client.rank}</span>
                          <span className="text-sm font-medium text-gray-900">{client.full_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{client.total_days_stayed} dias</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {/* By Total Paid */}
                <div>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, by_total_paid: !prev.by_total_paid }))}
                    className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-green-600 transition-colors"
                  >
                    <span>Por Total Pago</span>
                    {expandedCategories.by_total_paid ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedCategories.by_total_paid && (
                  <div className="space-y-2">
                    {rankings.by_total_paid.slice(0, 10).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-green-600 w-8">#{client.rank}</span>
                          <span className="text-sm font-medium text-gray-900">{client.full_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-700">R$ {client.total_amount_paid.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {/* By Average Per Night */}
                <div>
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, by_avg_per_night: !prev.by_avg_per_night }))}
                    className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-accent-600 transition-colors"
                  >
                    <span>Por Média por Noite</span>
                    {expandedCategories.by_avg_per_night ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedCategories.by_avg_per_night && (
                  <div className="space-y-2">
                    {rankings.by_avg_per_night.slice(0, 10).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-accent-600 w-8">#{client.rank}</span>
                          <span className="text-sm font-medium text-gray-900">{client.full_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-accent-700">R$ {client.average_price_per_night.toFixed(2)}/noite</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
