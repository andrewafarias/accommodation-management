import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportButtons } from '../components/ui/ImportExportButtons';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { Users, Plus } from 'lucide-react';
import api from '../services/api';

export function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <div className="flex gap-2">
          <ImportExportButtons 
            onExport={handleExport}
            onImport={handleImport}
          />
          <Button onClick={handleNewClient}>
            <Plus className="w-5 h-5 mr-2" />
            Novo Cliente
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
    </div>
  );
}
