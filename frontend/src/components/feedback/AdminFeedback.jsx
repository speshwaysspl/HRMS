import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Divider,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Tabs,
  Tab,
  CardHeader
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Reply as ReplyIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';
import { formatDMYWithTime } from '../../utils/dateUtils';

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [respondingFeedback, setRespondingFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 0,
    rowsPerPage: 10,
    totalItems: 0
  });

  const categories = [
    'General', 'Work Environment', 'Management', 'Benefits', 
    'Training', 'Technology', 'Suggestion', 'Complaint', 'Other'
  ];

  const priorities = ['Low', 'Medium', 'High'];

  useEffect(() => {
    fetchFeedbacks();
  }, [filters, pagination.page, pagination.rowsPerPage, searchTerm]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page + 1,
        limit: pagination.rowsPerPage,
        search: searchTerm,
        ...filters
      });

      const response = await axios.get(`${API_BASE}/api/feedback?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks);
        setPagination(prev => ({
          ...prev,
          totalItems: response.data.data.pagination.totalItems
        }));
      }
    } catch (error) {
      showSnackbar('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateStatus = async () => {
    if (!respondingFeedback || !adminResponse.trim()) return;

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE}/api/feedback/${respondingFeedback._id}/status`,
        {
          adminResponse: adminResponse.trim()
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        showSnackbar('Response sent successfully', 'success');
        setRespondingFeedback(null);
        setAdminResponse('');
        fetchFeedbacks();
      }
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || 'Failed to send response',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResponse = (feedback) => {
    setRespondingFeedback(feedback);
    setAdminResponse(feedback.adminResponse?.message || '');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Under Review': return 'info';
      case 'Resolved': return 'success';
      case 'Closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (date) => formatDMYWithTime(date);



  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 3, fontFamily: 'Times New Roman, serif' }}>
        Feedback Management
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="All Feedback" icon={<ViewIcon />} />
        </Tabs>
      </Box>

      {/* All Feedback Tab */}
      <TabPanel value={activeTab} index={0}>
        {/* Search and Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchFeedbacks}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Feedback Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feedbacks.map((feedback) => (
                  <TableRow key={feedback._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {feedback.isAnonymous 
                            ? '?' 
                            : feedback.employeeId?.userId?.name?.charAt(0) || 'U'
                          }
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {feedback.isAnonymous 
                              ? 'Anonymous' 
                              : feedback.employeeId?.userId?.name || 'Unknown'
                            }
                          </Typography>
                          {!feedback.isAnonymous && (
                            <Typography variant="caption" color="text.secondary">
                              {feedback.employeeId?.userId?.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {feedback.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {feedback.description.length > 50 
                          ? `${feedback.description.substring(0, 50)}...`
                          : feedback.description
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={feedback.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {feedback.rating ? (
                        <Rating value={feedback.rating} readOnly size="small" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No rating
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(feedback.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setViewingFeedback(feedback)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Respond">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenResponse(feedback)}
                            color="primary"
                          >
                            <ReplyIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pagination.totalItems}
            page={pagination.page}
            onPageChange={(e, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
            rowsPerPage={pagination.rowsPerPage}
            onRowsPerPageChange={(e) => setPagination(prev => ({ 
              ...prev, 
              rowsPerPage: parseInt(e.target.value, 10),
              page: 0
            }))}
          />
        </Card>
      </TabPanel>

      {/* View Feedback Dialog */}
      <Dialog 
        open={!!viewingFeedback} 
        onClose={() => setViewingFeedback(null)} 
        maxWidth="md" 
        fullWidth
      >
        {viewingFeedback && (
          <>
            <DialogTitle sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              Feedback Details
              <IconButton onClick={() => setViewingFeedback(null)} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Employee:</Typography>
                  <Typography variant="body1">
                    {viewingFeedback.isAnonymous 
                      ? 'Anonymous Submission' 
                      : viewingFeedback.employeeId?.userId?.name || 'Unknown'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Email:</Typography>
                  <Typography variant="body1">
                    {viewingFeedback.isAnonymous 
                      ? 'Hidden' 
                      : viewingFeedback.employeeId?.userId?.email || 'Unknown'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Title:</Typography>
                  <Typography variant="h6" gutterBottom>{viewingFeedback.title}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Typography variant="body1">{viewingFeedback.category}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Description:</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{viewingFeedback.description}</Typography>
                </Grid>
                {viewingFeedback.rating && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Rating:</Typography>
                    <Rating value={viewingFeedback.rating} readOnly />
                  </Grid>
                )}
                {viewingFeedback.tags && viewingFeedback.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Tags:</Typography>
                    <Box sx={{ mt: 1 }}>
                      {viewingFeedback.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Submitted:</Typography>
                  <Typography variant="body1">{formatDate(viewingFeedback.createdAt)}</Typography>
                </Grid>
                {viewingFeedback.adminResponse?.message && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>Admin Response</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {viewingFeedback.adminResponse.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Responded on: {formatDate(viewingFeedback.adminResponse.respondedAt)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewingFeedback(null)}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleOpenResponse(viewingFeedback);
                  setViewingFeedback(null);
                }}
              >
                Respond
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Response Dialog */}
      <Dialog 
        open={!!respondingFeedback} 
        onClose={() => setRespondingFeedback(null)} 
        maxWidth="md" 
        fullWidth
      >
        {respondingFeedback && (
          <>
            <DialogTitle sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              Respond to Feedback
              <IconButton onClick={() => setRespondingFeedback(null)} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {respondingFeedback.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    From: {respondingFeedback.isAnonymous 
                      ? 'Anonymous' 
                      : respondingFeedback.employeeId?.userId?.name || 'Unknown'
                    }
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    {respondingFeedback.description}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Response"
                    multiline
                    rows={4}
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Provide a response to the employee..."
                    required
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setRespondingFeedback(null)}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={handleUpdateStatus}
                disabled={loading || !adminResponse.trim()}
                startIcon={<ReplyIcon />}
              >
                Send Response
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminFeedback;