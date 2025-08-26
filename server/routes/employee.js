import express from 'express';
import authMiddleware from '../middleware/authMiddlware.js';
import {
  addEmployee,
  upload,
  getEmployees,
  getEmployee,
  updateEmployee,
  updateEmployeeStatus,
  fetchEmployeesByDepId,
  getEmployeeByIdOrName
} from '../controllers/employeeController.js';
 
const router = express.Router();
 
router.get('/', authMiddleware, getEmployees);
router.get('/search', authMiddleware, getEmployeeByIdOrName);
router.post('/add', authMiddleware, upload.single('image'), addEmployee);
router.get('/:id', authMiddleware, getEmployee);
router.put('/:id', authMiddleware, upload.single('image'), updateEmployee);
router.patch('/:id/status', authMiddleware, updateEmployeeStatus);
router.get('/department/:id', authMiddleware, fetchEmployeesByDepId);
 
export default router;