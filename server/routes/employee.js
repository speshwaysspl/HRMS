import express from 'express';
import authMiddleware from '../middleware/authMiddlware.js';
import {
  addEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  updateEmployeeStatus,
  fetchEmployeesByDepId,
  getEmployeeByIdOrName,
  deleteEmployee,
  importEmployeesFromExcel,
  exportEmployeesToExcel
} from '../controllers/employeeController.js';
import multer from 'multer';

const router = express.Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

router.get('/', authMiddleware, getEmployees);
router.get('/search', authMiddleware, getEmployeeByIdOrName);
router.post('/add', authMiddleware, addEmployee);
router.post('/import-excel', authMiddleware, excelUpload.single('file'), importEmployeesFromExcel);
router.get('/export-excel', authMiddleware, exportEmployeesToExcel);
router.get('/department/:id', authMiddleware, fetchEmployeesByDepId);
router.get('/:id', authMiddleware, getEmployee);
router.put('/:id', authMiddleware, updateEmployee);
router.delete('/:id', authMiddleware, deleteEmployee);
router.patch('/:id/status', authMiddleware, updateEmployeeStatus);

export default router;
