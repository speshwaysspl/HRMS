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
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';
import { formatDMYWithTime } from '../../utils/dateUtils';

const EmployeeFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });

  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    description: '',
    isAnonymous: false,
    rating: 0,
    tags: []
  });

  const categories = [
    'General', 'Work Environment', 'Management', 'Benefits', 
    'Training', 'Technology', 'Suggestion', 'Complaint', 'Other'
  ];


  useEffect(() => {
    fetchFeedbacks();
  }, [pagination.page]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });

      const response = await axios.get(`${API_BASE}/api/feedback/my-feedback?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      showSnackbar('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingFeedback 
        ? `${API_BASE}/api/feedback/my-feedback/${editingFeedback._id}`
        : `${API_BASE}/api/feedback`;
      
      const method = editingFeedback ? 'put' : 'post';
      
      const response = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        showSnackbar(
          editingFeedback ? 'Feedback updated successfully' : 'Feedback submitted successfully',
          'success'
        );
        handleCloseDialog();
        fetchFeedbacks();
      }
    } catch (error) {
      showSnackbar(
        error.response?.data?.error || 'Failed to submit feedback',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'General',
      description: '',
      rating: 0,
      tags: []
    });
  };

  const handleOpenDialog = (feedback = null) => {
    if (feedback) {
      setEditingFeedback(feedback);
      setFormData({
        title: feedback.title,
        category: feedback.category,
        description: feedback.description,
        tags: feedback.tags || [],
        rating: feedback.rating || 0
      });
    } else {
      setEditingFeedback(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFeedback(null);
    setViewingFeedback(null);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };



  const formatDate = (date) => formatDMYWithTime(date);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1976d2', fontFamily: 'Times New Roman, serif' }}>
          My Feedback
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          Submit Feedback
        </Button>
      </Box>



      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Feedback List */}
      <Grid container spacing={3}>
        <AnimatePresence>
          {feedbacks.map((feedback) => (
            <Grid item xs={12} md={6} lg={4} key={feedback._id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Title:</Typography>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                        {feedback.title}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Category: {feedback.category}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Description:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {feedback.description.length > 100 
                          ? `${feedback.description.substring(0, 100)}...`
                          : feedback.description
                        }
                      </Typography>
                    </Box>

                    {feedback.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>Rating:</Typography>
                        <Rating value={feedback.rating} readOnly size="small" />
                      </Box>
                    )}

                    {feedback.tags && feedback.tags.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {feedback.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Submitted: {formatDate(feedback.updatedAt || feedback.createdAt)}
                    </Typography>

                    {feedback.adminResponse?.message && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          Admin Response:
                        </Typography>
                        <Typography variant="body2">
                          {feedback.adminResponse.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Responded: {formatDate(feedback.adminResponse.respondedAt)}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => setViewingFeedback(feedback)}
                    >
                      View
                    </Button>
                    <Box>
                      {feedback.status === 'Pending' && (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(feedback)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Delete action removed */}
                    </Box>
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </AnimatePresence>
      </Grid>

      {/* Empty State */}
      {!loading && feedbacks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No feedback found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You haven't submitted any feedback yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Submit Your First Feedback
          </Button>
        </Paper>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            disabled={pagination.currentPage === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <Typography sx={{ mx: 2, alignSelf: 'center' }}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </Typography>
          <Button
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Submit/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {editingFeedback ? 'Edit Feedback' : 'Submit New Feedback'}
          <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3, bgcolor: 'grey.50' }}>
            <Grid container spacing={3} alignItems="flex-start">
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Title"
                  InputLabelProps={{ shrink: true }}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  sx={{ '& .MuiInputBase-root': { borderRadius: 2, minHeight: 44 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" sx={{ '& .MuiInputBase-root': { borderRadius: 2, minHeight: 44 } }}>
                  <InputLabel shrink>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Description"
                  InputLabelProps={{ shrink: true }}
                  multiline
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography component="span">Rating (Optional)</Typography>
                  <Rating
                    value={formData.rating}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({ ...prev, rating: newValue }));
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
            <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={<SendIcon />}
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
              }}
            >
              {editingFeedback ? 'Update' : 'Submit'} Feedback
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={!!viewingFeedback} 
        onClose={handleCloseDialog} 
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
              <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Title:</Typography>
                  <Typography variant="h6" gutterBottom>{viewingFeedback.title}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Typography variant="body1">{viewingFeedback.category}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Submitted:</Typography>
                  <Typography variant="body1">{formatDate(viewingFeedback.updatedAt || viewingFeedback.createdAt)}</Typography>
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
              <Button onClick={handleCloseDialog}>Close</Button>
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

export default EmployeeFeedback;