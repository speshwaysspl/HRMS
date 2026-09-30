import Employee from '../models/Employee.js'
import Leave from '../models/Leave.js'
import { createLeaveRequestNotification, createLeaveStatusNotification } from './notificationController.js'
import { enqueueEmail } from '../utils/emailQueue.js'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { saveFile, deleteFile, getFileKeyFromUrl } from '../utils/fileSaver.js'

// Signed link that lets HR approve/reject one leave from the email without logging in.
const ACTION_PURPOSE = 'leave_email_action'
const leaveActionToken = (leaveId) =>
    jwt.sign({ leaveId: leaveId.toString(), purpose: ACTION_PURPOSE }, process.env.JWT_SECRET, { expiresIn: '14d' })
const readLeaveActionToken = (token) => {
    const p = jwt.verify(String(token || ''), process.env.JWT_SECRET)
    if (p.purpose !== ACTION_PURPOSE) throw new Error('bad purpose')
    return p.leaveId
}
const actionButton = (href, label, bg) =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:8px;margin:0 8px 8px 0">${label}</a>`

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

// Every new leave request is also emailed to HR (HR_EMAIL, default hr@speshway.com).
const emailLeaveToHR = async (leave, employee, proofFile) => {
    await employee.populate([{ path: 'userId', select: 'name email' }, { path: 'department', select: 'dep_name' }])
    const name = employee.userId?.name || 'Employee'
    const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / 86400000) + 1
    const rows = [
        ['Employee', name],
        ['Employee ID', employee.employeeId],
        ['Email', employee.userId?.email],
        ['Department', employee.department?.dep_name],
        ['Leave type', leave.leaveType],
        ['From', fmtDate(leave.startDate)],
        ['To', fmtDate(leave.endDate)],
        ['Days', days],
        ['Reason', leave.reason],
        ['Proof', leave.proofName ? `${leave.proofName} (attached)` : ''],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '')
    const actionBase = `${process.env.CLIENT_URL || 'http://localhost:5173'}/leave-action?token=${leaveActionToken(leave._id)}`
    const html = `<p>Dear HR,</p>
<p>A new leave request has been submitted on Speshway HRMS and is awaiting approval.</p>
<table cellpadding="8" style="border-collapse:collapse;font-size:14px">
${rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd;font-weight:bold">${k}</td><td style="border:1px solid #ddd">${esc(v)}</td></tr>`).join('')}
</table>
<p style="margin-top:24px">${actionButton(`${actionBase}&action=approve`, 'Approve', '#337038')}${actionButton(`${actionBase}&action=reject`, 'Reject', '#DC2626')}</p>
<p style="font-size:13px;color:#6b7280">You can add a remark on the next page. Rejecting requires a reason. This link expires in 14 days; you can also review the request in the Admin Dashboard under Leaves.</p>`
    enqueueEmail(process.env.HR_EMAIL || 'hr@speshway.com', `Leave Request - ${name} (${fmtDate(leave.startDate)} to ${fmtDate(leave.endDate)})`, html, proofFile ? [{ filename: proofFile.originalname, content: proofFile.buffer, contentType: proofFile.mimetype }] : [], {
        // Sent through the company mailbox (a personal address can't be used as the sender
        // without failing SPF/DKIM), but shown under the employee's name; Reply goes to them.
        fromName: `${name} via Speshway HRMS`,
        replyTo: employee.userId?.email || undefined,
    })
}

const addLeave = async (req, res) => {
    try {
        const {userId, leaveType, startDate, endDate, reason} = req.body
        const employee = await Employee.findOne({userId})

        console.log("leave")

        const newLeave = new Leave({
            employeeId: employee._id, leaveType, startDate, endDate, reason
        })
        if (req.file) {
            newLeave.proof = (await saveFile(req.file, 'leave-proofs')).url
            newLeave.proofName = req.file.originalname
        }

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

        try {
            await emailLeaveToHR(newLeave, employee, req.file);
        } catch (emailError) {
            console.error('Error emailing leave request to HR:', emailError);
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
        if (!id || id === "undefined") {
             return res.status(400).json({success: false, error: "Invalid ID provided"});
        }
        let leaves
        if(role === "admin") {
            leaves = await Leave.find({employeeId: id}).sort({ appliedAt: -1 })
        } else {
            const employee = await Employee.findOne({userId: id})
            if (!employee) {
                 return res.status(404).json({success: false, error: "Employee not found"});
            }
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
        if (!id || id === "undefined") {
            return res.status(400).json({success: false, error: "Invalid ID provided"});
        }
        const { status } = req.body;
        // Optional admin remark (the reason, when rejecting); shown to the employee.
        const remark = typeof req.body.remark === 'string' ? req.body.remark.trim().slice(0, 500) : undefined;
        const update = { status, updatedAt: new Date() };
        if (remark !== undefined) update.reviewRemark = remark;

        const leave = await Leave.findByIdAndUpdate({_id: id}, update, {new: true})
        if(!leave) {
            return res.status(404).json({success: false, error: "leave not founded"})
        }

        // Send notification to employee about status change
        const io = req.app.get('io');
        if (io && (status === 'Approved' || status === 'Rejected')) {
            try {
                await createLeaveStatusNotification(leave, status, req.user._id, io, remark || '');
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

// GET /api/leave/email-action?token=  (public, token-authorised) -> summary for the HR action page
const getLeaveByActionToken = async (req, res) => {
    let leaveId
    try { leaveId = readLeaveActionToken(req.query.token) } catch {
        return res.status(401).json({ success: false, error: 'This link is invalid or has expired. Please review the request in the Admin Dashboard.' })
    }
    try {
        const leave = await Leave.findById(leaveId).populate({ path: 'employeeId', select: 'employeeId userId', populate: { path: 'userId', select: 'name' } })
        if (!leave) return res.status(404).json({ success: false, error: 'This leave request no longer exists.' })
        return res.json({
            success: true,
            leave: {
                employeeName: leave.employeeId?.userId?.name || 'Employee',
                employeeCode: leave.employeeId?.employeeId || '',
                leaveType: leave.leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                reason: leave.reason,
                proof: leave.proof || '',
                proofName: leave.proofName || '',
                status: leave.status,
                reviewRemark: leave.reviewRemark || '',
            },
        })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Server error' })
    }
}

// POST /api/leave/email-action  { token, status: 'Approved'|'Rejected', remark }
const actOnLeaveByToken = async (req, res) => {
    let leaveId
    try { leaveId = readLeaveActionToken(req.body?.token) } catch {
        return res.status(401).json({ success: false, error: 'This link is invalid or has expired. Please review the request in the Admin Dashboard.' })
    }
    try {
        const { status } = req.body
        const remark = String(req.body?.remark || '').trim().slice(0, 500)
        if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid action' })
        if (status === 'Rejected' && !remark) return res.status(400).json({ success: false, error: 'Please give a reason for rejecting.' })

        // Only a still-pending leave can be decided, so a second click can't flip a decision.
        const leave = await Leave.findOneAndUpdate(
            { _id: leaveId, status: 'Pending' },
            { status, reviewRemark: remark, updatedAt: new Date() },
            { new: true }
        )
        if (!leave) {
            const current = await Leave.findById(leaveId).select('status')
            if (!current) return res.status(404).json({ success: false, error: 'This leave request no longer exists.' })
            return res.status(409).json({ success: false, error: `This request was already ${current.status.toLowerCase()}.`, status: current.status })
        }

        const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id')
        if (admin) {
            try {
                await createLeaveStatusNotification(leave, status, admin._id, req.app.get('io'), remark)
            } catch (notificationError) {
                console.error('Error sending leave status notification:', notificationError)
            }
        }
        return res.json({ success: true, status })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Server error' })
    }
}

const deleteLeave = async (req, res) => {
    try {
        const { id } = req.params
        if (!id || id === "undefined") {
            return res.status(400).json({ success: false, error: "Invalid ID provided" })
        }

        const deletedLeave = await Leave.findByIdAndDelete(id)
        if (!deletedLeave) {
            return res.status(404).json({ success: false, error: "leave not found" })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, error: "leave delete server error" })
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

// Employee withdraws their own leave request — only while it's still Pending.
const cancelMyLeave = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id })
        if (!employee) {
            return res.status(404).json({ success: false, error: "Employee profile not found" })
        }
        const leave = await Leave.findOne({ _id: req.params.id, employeeId: employee._id })
        if (!leave) {
            return res.status(404).json({ success: false, error: "Leave not found" })
        }
        if (leave.status !== "Pending") {
            return res.status(409).json({ success: false, error: `Only pending leaves can be cancelled (this one is ${leave.status})` })
        }
        await leave.deleteOne()
        return res.status(200).json({ success: true })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, error: "Failed to cancel leave" })
    }
}

const dropProofFile = async (url) => {
    if (!url) return
    try { await deleteFile(getFileKeyFromUrl(url)) } catch (e) { console.warn('Old leave proof not deleted:', e.message) }
}

// PUT /api/leave/mine/:id/proof  (multipart "proof")  -> add or replace the proof.
// DELETE /api/leave/mine/:id/proof                    -> remove it.
// Allowed on the employee's own Pending or Rejected leave. On a Rejected leave a new
// proof resubmits it: back to Pending, admins notified and HR emailed again.
const upsertMyLeaveProof = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Choose a file to upload' })
        const employee = await Employee.findOne({ userId: req.user._id })
        const leave = employee && await Leave.findOne({ _id: req.params.id, employeeId: employee._id })
        if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' })
        if (leave.status === 'Approved') {
            return res.status(409).json({ success: false, error: 'Proof can’t be changed on an approved leave' })
        }
        const old = leave.proof
        leave.proof = (await saveFile(req.file, 'leave-proofs')).url
        leave.proofName = req.file.originalname
        const resubmitted = leave.status === 'Rejected'
        if (resubmitted) {
            leave.status = 'Pending'
            leave.reviewRemark = ''
        }
        leave.updatedAt = new Date()
        await leave.save()
        await dropProofFile(old)

        if (resubmitted) {
            const io = req.app.get('io')
            if (io) {
                try { await createLeaveRequestNotification(leave, io) } catch (e) { console.error('Resubmit notification failed:', e) }
            }
            try { await emailLeaveToHR(leave, employee, req.file) } catch (e) { console.error('Resubmit HR email failed:', e) }
        }
        return res.json({ success: true, resubmitted, proof: leave.proof, proofName: leave.proofName, status: leave.status })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, error: 'Failed to upload proof' })
    }
}

const deleteMyLeaveProof = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.user._id })
        const leave = employee && await Leave.findOne({ _id: req.params.id, employeeId: employee._id })
        if (!leave) return res.status(404).json({ success: false, error: 'Leave not found' })
        if (leave.status === 'Approved') {
            return res.status(409).json({ success: false, error: 'Proof can’t be changed on an approved leave' })
        }
        await dropProofFile(leave.proof)
        leave.proof = ''
        leave.proofName = ''
        leave.updatedAt = new Date()
        await leave.save()
        return res.json({ success: true })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, error: 'Failed to remove proof' })
    }
}

export {upsertMyLeaveProof, deleteMyLeaveProof, getLeaveByActionToken, actOnLeaveByToken, cancelMyLeave, addLeave, getLeave, getLeaves, getLeaveDetail, updateLeave, deleteLeave, getEmployeeLeavesByDate}
