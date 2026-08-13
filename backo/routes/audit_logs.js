const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const authorize = require("../middleware/role");

const AuditLog = require("../models/audit_log");
const { attachHierarchy } = require("../utils/hierarchy");

const{
    getAuditLogs,
    getBillWiseItemAudit,
    getPurchaseBillWiseItemAudit,
    getPurchaseItemWiseAudit,
    getBillItemWiseAudit,
    getAuditLogsByid,
    deleteAuditLog
} = require("../controllers/audit_logs");

router.get(
    "/",
    verifyToken,
    authorize("super_admin", "admin"),
    getAuditLogs
       
);

router.get(
    "/bill/bill-wise",
    verifyToken,
    authorize("super_admin", "admin"),
    getBillWiseItemAudit
);

router.get(
    "/Purchase/bill-wise",
    verifyToken,
    authorize("super_admin", "admin"),
    getPurchaseBillWiseItemAudit
);

router.get(
    "/purchase/item-wise",
     verifyToken,
    authorize("super_admin", "admin"),
    getPurchaseItemWiseAudit
);


router.get(
    "/bill/item-wise",
    verifyToken,
    authorize("super_admin", "admin"),
    getBillItemWiseAudit
);

router.get(
    "/:id",
    verifyToken,
    authorize("super_admin", "admin"),
    getAuditLogsByid
);

router.delete(
    "/:id",
    verifyToken,
    authorize("super_admin"),
    deleteAuditLog
);

module.exports = router;