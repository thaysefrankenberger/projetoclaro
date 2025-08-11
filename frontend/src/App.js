import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  LinearProgress,
  Chip,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import './App.css';

// Configuração do Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [notification, setNotification] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  const statusColors = {
    open: 'warning',
    in_progress: 'info',
    completed: 'success'
  };

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets/');
      setTickets(response.data);
    } catch (error) {
      handleApiError(error, 'Erro ao carregar tickets');
    }
  };

  const createTicket = async () => {
    try {
      setLoading(true);
      await api.post('/tickets/', formData);
      setFormData({ title: '', description: '' });
      showSuccess('Ticket criado com sucesso!');
      fetchTickets();
    } catch (error) {
      handleApiError(error, 'Erro ao criar ticket');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      showSuccess('Status atualizado!');
      fetchTickets();
    } catch (error) {
      handleApiError(error, 'Erro ao atualizar status');
    }
  };

  const handleApiError = (error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response) {
      errorMessage = `Erro ${error.response.status}: ${error.response.data?.detail || 'Sem detalhes'}`;
    } else if (error.request) {
      errorMessage = 'Servidor não respondeu - verifique sua conexão';
    } else {
      errorMessage = `Erro: ${error.message}`;
    }
    
    showError(errorMessage);
    console.error('Detalhes do erro:', error);
  };

  const showSuccess = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'success'
    });
  };

  const showError = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'error'
    });
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="md" className="App">
      <Typography variant="h3" gutterBottom>
        Internet Issue Tickets
      </Typography>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({...notification, open: false})}
      >
        <Alert 
          severity={notification.severity}
          onClose={() => setNotification({...notification, open: false})}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Card sx={{ mb: 4 }} variant="outlined">
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Create New Ticket
          </Typography>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            margin="normal"
            disabled={loading}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            margin="normal"
            disabled={loading}
          />
          <Button 
            variant="contained" 
            onClick={createTicket}
            disabled={!formData.title || !formData.description || loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Ticket'}
          </Button>
        </CardContent>
      </Card>

      {loading && tickets.length === 0 ? (
        <LinearProgress />
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Existing Tickets
          </Typography>
          {tickets.map(ticket => (
            <Card key={ticket.id} sx={{ mb: 2 }}>
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h5" component="div">
                    {ticket.title}
                  </Typography>
                  <Chip 
                    label={ticket.status.replace('_', ' ')} 
                    color={statusColors[ticket.status] || 'default'}
                  />
                </div>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  {ticket.description}
                </Typography>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Select
                    value={ticket.status}
                    onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                    size="small"
                    disabled={loading}
                  >
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                  
                  <Typography variant="caption" color="text.secondary">
                    IP: {ticket.client_ip} | 
                    Created: {format(new Date(ticket.created_at), 'PPpp')} | 
                    Last Updated: {format(new Date(ticket.updated_at), 'PPpp')}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Container>
  );
}

export default App;