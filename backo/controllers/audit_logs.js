const AuditLog = require("../models/audit_log");
const { attachHierarchy } = require("../utils/hierarchy");

exports.getAuditLogs = async (req, res) => {
        try {
        const hierarchy = attachHierarchy(req.user);

        const {
            module,
            action,
            userId,
            fromDate,
            toDate
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId
        };

        if (module) {
            filter.module = module;
        }

        if (action) {
            filter.action = action;
        }

        if (userId) {
            filter.userId = userId;
        }

        if (fromDate || toDate) {
            filter.createdAt = {};

            if (fromDate) {
                const startDate = new Date(fromDate);
                startDate.setHours(0, 0, 0, 0);

                filter.createdAt.$gte = startDate;
            }

            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);

                filter.createdAt.$lte = endDate;
            }
        }

        const logs = await AuditLog.find(filter)
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error("GET AUDIT LOGS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.getAuditLogsByid = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const log = await AuditLog.findOne({
            _id: req.params.id,
            superAdminId: hierarchy.superAdminId
        }).populate("userId", "name email role");

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Audit log not found"
            });
        }

        res.json({
            success: true,
            data: log
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.deleteAuditLog = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const { id } = req.params;

        const log = await AuditLog.findOneAndDelete({
            _id: id,
            superAdminId: hierarchy.superAdminId
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Audit log not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Audit log deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};