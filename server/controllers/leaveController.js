import Employee from '../models/Employee.js'
import Leave from '../models/Leave.js'
import { createLeaveRequestNotification, createLeaveStatusNotification } from './notificationController.js'

const addLeave = async (req, res) => {
    try {
        const {userId, leaveType, startDate, endDate, reason} = req.body
        const employee = await Employee.findOne({userId})

        console.log("leave")

        const newLeave = new Leave({
            employeeId: employee._id, leaveType, startDate, endDate, reason
        })

        await newLeave.save()

        // Send notification to admins
        const io = req.app.get('io');
        if (io) {
            try {
                await createLeaveRequestNotification(newLeave, io);
            } catch (notificationError) {
                console.error('Error sending leave request notification:', notificationError);
            }
        }

        return res.status(200).json({success: true})

    } catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "leave add server error"})
    }
}

const getLeave = async (req, res) => {
    try {
        const {id, role} = req.params;
        let leaves
        if(role === "admin") {
            leaves = await Leave.find({employeeId: id}).sort({ appliedAt: -1 })
        } else {
            const employee = await Employee.findOne({userId: id})
            leaves = await Leave.find({employeeId: employee._id}).sort({ appliedAt: -1 })
        }
        
        return res.status(200).json({success: true, leaves})
    } catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "leave add .. server error"})
    }
}

const getLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find().populate({
            path: 'employeeId',
            populate: [
                {
                    path: 'department',
                    select: 'dep_name'
                },
                {
                    path: 'userId',
                    select: 'name'
                }
            ]
        }).sort({ appliedAt: -1 })

        return res.status(200).json({success: true, leaves})
    } catch(error) {
        console.log("Eror: ", error.message)
        return res.status(500).json({success: false, error: "leave add server error"})
    }
}

const getLeaveDetail = async (req, res) => {
    try {
        const {id} = req.params;
        const leave = await Leave.findById({_id: id}).populate({
            path: 'employeeId',
            populate: [
                {
                    path: 'department',
                    select: 'dep_name'
                },
                {
                    path: 'userId',
                    select: 'name'
                }
            ]
        })
 
        return res.status(200).json({success: true, leave})
    } catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "leave detail server error"})
    }
}

const updateLeave = async (req, res) => {
    try {
        const {id} = req.params;
        const { status } = req.body;
        
        const leave = await Leave.findByIdAndUpdate({_id: id}, {status: status}, {new: true})
        if(!leave) {
            return res.status(404).json({success: false, error: "leave not founded"})
        }

        // Send notification to employee about status change
        const io = req.app.get('io');
        if (io && (status === 'Approved' || status === 'Rejected')) {
            try {
                await createLeaveStatusNotification(leave, status, req.user._id, io);
            } catch (notificationError) {
                console.error('Error sending leave status notification:', notificationError);
            }
        }

        return res.status(200).json({success: true})
    } catch(error) {
        console.log(error.message)
        return res.status(500).json({success: false, error: "leave update server error"})
    }
}

// Get employee leaves by date (for attendance status)
const getEmployeeLeavesByDate = async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ success: false, error: "Date parameter is required" });
        }
        
        // Find the employee based on the logged-in user
        const employee = await Employee.findOne({ userId: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, error: "Employee not found" });
        }
        
        // Find leaves that include the specified date
        const leaves = await Leave.find({
            employeeId: employee._id,
            startDate: { $lte: new Date(date) },
            endDate: { $gte: new Date(date) }
        });
        
        return res.status(200).json(leaves);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, error: "Error fetching employee leaves" });
    }
}

export {addLeave, getLeave, getLeaves, getLeaveDetail, updateLeave, getEmployeeLeavesByDate}