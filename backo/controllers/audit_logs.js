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




exports.getBillWiseItemAudit = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            fromDate,
            toDate,
            action,
            search
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId,
            module: "Bill"
        };

        if (action) {
            filter.action = action;
        }

        // DATE FILTER
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

        let billWiseData = [];

        for (const log of logs) {
            const auditData = log.newData || {};

            const items = Array.isArray(auditData.items)
                ? auditData.items
                : [];

            // GST ITEMS ONLY
            const gstItems = items
                .filter((item) =>
                    Number(item.gstRate || 0) > 0 &&
                    Number(item.gstAmount || 0) > 0
                )
                .map((item) => ({
                    productId:
                        item.productId || null,

                    barcode:
                        item.barcode || "",

                    itemName:
                        item.itemName || "",

                    hsnCode:
                        item.hsnCode || "",

                    qty:
                        Number(item.qty || 0),

                    freeQty:
                        Number(item.freeQty || 0),

                    totalGivenQty:
                        Number(item.totalGivenQty || 0),

                    unit:
                        item.unit || "",

                    unitValue:
                        Number(item.unitValue || 1),

                    unitText:
                        item.unitText || "",

                    totalKg:
                        item.totalKg || "",

                    mrp:
                        Number(item.mrp || 0),

                    rate:
                        Number(item.rate || 0),

                    discountAmount:
                        Number(item.discountAmount || 0),

                    taxableAmount:
                        Number(item.taxableAmount || 0),

                    gstRate:
                        Number(item.gstRate || 0),

                    cgstRate:
                        Number(item.cgstRate || 0),

                    sgstRate:
                        Number(item.sgstRate || 0),

                    gstAmount:
                        Number(item.gstAmount || 0),

                    cgstAmount:
                        Number(item.cgstAmount || 0),

                    sgstAmount:
                        Number(item.sgstAmount || 0),

                    totalAmount:
                        Number(item.totalAmount || 0),

                    finalAmount:
                        Number(item.finalAmount || 0),

                    appliedPriceLevel:
                        item.appliedPriceLevel || "normal"
                }));

            // GST item illa na bill skip
            if (gstItems.length === 0) {
                continue;
            }

            billWiseData.push({
                auditId:
                    log._id,

                documentId:
                    log.documentId,

                action:
                    log.action,

                date:
                    log.createdAt,

                user: log.userId
                    ? {
                        id:
                            log.userId._id,

                        name:
                            log.userId.name || "",

                        email:
                            log.userId.email || "",

                        role:
                            log.userId.role ||
                            log.role ||
                            ""
                    }
                    : {
                        id: null,
                        name: "",
                        email: "",
                        role: log.role || ""
                    },

                // BILL
                invoiceNo:
                    auditData.invoiceNo || "",

                invoiceDate:
                    auditData.invoiceDate || null,

                customerName:
                    auditData.customerName ||
                    "Walk-in Customer",

                customerGstNumber:
                    auditData.customerGstNumber || "",

                placeOfSupply:
                    auditData.placeOfSupply || "",

                // ITEMS
                itemCount:
                    gstItems.length,

                items:
                    gstItems,

                // SUMMARY
                summary: {
                    subTotal:
                        Number(
                            auditData.summary?.subTotal || 0
                        ),

                    totalGST:
                        Number(
                            auditData.summary?.totalGST || 0
                        ),

                    itemDiscountAmount:
                        Number(
                            auditData.summary?.itemDiscountAmount || 0
                        ),

                    billDiscountAmount:
                        Number(
                            auditData.summary?.billDiscountAmount || 0
                        ),

                    billDiscountPercentage:
                        Number(
                            auditData.summary?.billDiscountPercentage || 0
                        ),

                    loyaltyDiscount:
                        Number(
                            auditData.summary?.loyaltyDiscount || 0
                        ),

                    grandTotal:
                        Number(
                            auditData.summary?.grandTotal || 0
                        )
                },

                // PAYMENT
                paidAmount:
                    Number(auditData.paidAmount || 0),

                pendingAmount:
                    Number(auditData.pendingAmount || 0),

                paymentMethod:
                    auditData.paymentMethod || "",

                paymentStatus:
                    auditData.paymentStatus || "",

                payments:
                    Array.isArray(auditData.payments)
                        ? auditData.payments
                        : []
            });
        }

        // SEARCH
        if (search && String(search).trim()) {
            const searchText = String(search)
                .trim()
                .toLowerCase();

            billWiseData = billWiseData.filter((bill) => {

                const itemMatch =
                    bill.items.some((item) =>
                        String(item.itemName || "")
                            .toLowerCase()
                            .includes(searchText) ||

                        String(item.hsnCode || "")
                            .toLowerCase()
                            .includes(searchText) ||

                        String(item.barcode || "")
                            .toLowerCase()
                            .includes(searchText)
                    );

                return (
                    String(bill.invoiceNo || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    String(bill.customerName || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    itemMatch
                );
            });
        }

        return res.status(200).json({
            success: true,

            count:
                billWiseData.length,

            data:
                billWiseData
        });

    } catch (error) {

        console.error(
            "BILL WISE ITEM AUDIT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getPurchaseBillWiseItemAudit = async (req, res) => {
      try {
    const hierarchy = attachHierarchy(req.user);

    const {
      fromDate,
      toDate,
      action,
      search
    } = req.query;

    // ==========================================
    // BASE FILTER
    // ==========================================
    const filter = {
      superAdminId: hierarchy.superAdminId,
      module: "Purchase"
    };

    if (action) {
      filter.action = action;
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

    const itemWiseData = [];

    for (const log of logs) {
      
      const purchaseData =
        log.newData ||
        log.oldData ||
        {};

      const items =
        purchaseData.items ||
        purchaseData.products ||
        purchaseData.purchaseItems ||
        [];

     
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item, index) => {
          itemWiseData.push({
            auditId: log._id,
            documentId:
              log.documentId ||
              log.referenceId ||
              purchaseData._id ||
              null,

            action: log.action,

            description: log.description || "",

            date: log.createdAt,

            
            user: {
              id: log.userId?._id || log.userId || null,
              name: log.userId?.name || "",
              email: log.userId?.email || "",
              role: log.userId?.role || log.role || ""
            },

            
            grnNo:
              purchaseData.grnNo ||
              purchaseData.grnNumber ||
              "",

            invoiceNo:
              purchaseData.invoiceNo ||
              purchaseData.supplierInvoiceNo ||
              purchaseData.originalInvoiceNo ||
              "",

            grnDate:
              purchaseData.grnDate ||
              purchaseData.purchaseDate ||
              purchaseData.invoiceDate ||
              null,

            supplierId:
              purchaseData.supplierId?._id ||
              purchaseData.supplierId ||
              null,

            supplierName:
              purchaseData.supplierName ||
              purchaseData.supplier?.name ||
              "",

            supplierGstNumber:
              purchaseData.supplierGstNumber ||
              purchaseData.supplierGST ||
              purchaseData.supplier?.gstNumber ||
              "",

            placeOfSupply:
              purchaseData.placeOfSupply || "",

           
            itemIndex: index + 1,

            productId:
              item.productId?._id ||
              item.productId ||
              item._id ||
              null,

            itemCode:
              item.itemCode ||
              item.productCode ||
              item.code ||
              "",

            itemName:
              item.itemName ||
              item.productName ||
              item.name ||
              "",

            hsnCode:
              item.hsnCode ||
              item.hsn ||
              "",

            unit:
              item.unit || "",

            unitValue:
              Number(item.unitValue || 0),

            qty:
              Number(
                item.qty ??
                item.quantity ??
                item.purchaseQty ??
                0
              ),

            freeQty:
              Number(item.freeQty || 0),

            
            mrp:
              Number(item.mrp || 0),

            costPrice:
              Number(
                item.costPrice ??
                item.purchasePrice ??
                item.rate ??
                0
              ),

            purchasePrice:
              Number(
                item.purchasePrice ??
                item.costPrice ??
                item.rate ??
                0
              ),

            sellingPrice:
              Number(item.sellingPrice || 0),

            grossAmount:
              Number(
                item.grossAmount ??
                item.amount ??
                item.total ??
                0
              ),

            discountPercent:
              Number(item.discountPercent || 0),

            discountAmount:
              Number(item.discountAmount || 0),

            taxableAmount:
              Number(item.taxableAmount || 0),

            
            gstRate:
              Number(item.gstRate || 0),

            cgstRate:
              Number(item.cgstRate || 0),

            cgstAmount:
              Number(item.cgstAmount || 0),

            sgstRate:
              Number(item.sgstRate || 0),

            sgstAmount:
              Number(item.sgstAmount || 0),

            igstRate:
              Number(item.igstRate || 0),

            igstAmount:
              Number(item.igstAmount || 0),

            taxAmount:
              Number(
                item.taxAmount ??
                item.totalTaxAmount ??
                (
                  Number(item.cgstAmount || 0) +
                  Number(item.sgstAmount || 0) +
                  Number(item.igstAmount || 0)
                )
              ),

                   totalAmount: Number(
        Number(
            item.totalAmount ??
            item.netAmount ??
            (
                Number(item.taxableAmount || 0) +
                Number(item.taxAmount || 0)
            )
        ).toFixed(2)
    ),

            netAmount:
              Number(
                item.netAmount ??
                item.totalAmount ??
                item.finalAmount ??
                0
              ),

           
            freightCharge:
              Number(purchaseData.freightCharge || 0),

            packagingCharge:
              Number(purchaseData.packagingCharge || 0),

            billDiscountPercent:
              Number(purchaseData.billDiscountPercent || 0),

            billDiscountAmount:
              Number(purchaseData.billDiscountAmount || 0),

            itemsTotal:
              Number(
                purchaseData.itemsTotal ??
                purchaseData.subTotal ??
                0
              ),

            totalTaxAmount:
              Number(
                purchaseData.totalTaxAmount ??
                purchaseData.totalTax ??
                0
              ),

            supplierBillAmount:
              Number(
                purchaseData.supplierBillAmount ??
                purchaseData.grandTotal ??
                purchaseData.totalAmount ??
                0
              ),

            paidAmount:
              Number(purchaseData.paidAmount || 0),

            balanceAmount:
              Number(
                purchaseData.balanceAmount ??
                purchaseData.pendingAmount ??
                0
              ),

            paymentStatus:
              purchaseData.paymentStatus || "",

            paymentMode:
              purchaseData.paymentMode ||
              purchaseData.paymentMethod ||
              ""
          });
        });
      }
    }

   
    let finalData = itemWiseData;

    if (search) {
      const keyword = search.toLowerCase().trim();

      finalData = itemWiseData.filter((row) => {
        return (
          String(row.grnNo || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.invoiceNo || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.supplierName || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.itemName || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.itemCode || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.hsnCode || "")
            .toLowerCase()
            .includes(keyword) ||

          String(row.action || "")
            .toLowerCase()
            .includes(keyword)
        );
      });
    }

   
    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData
    });

  } catch (error) {
    console.error(
      "PURCHASE BILL ITEM-WISE AUDIT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


exports.getPurchaseItemWiseAudit = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            fromDate,
            toDate,
            action,
            search
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId,
            module: "Purchase"
        };

        if (action) {
            filter.action = action;
        }

        // DATE FILTER
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

        const itemWiseData = [];

        for (const log of logs) {


            const auditData = log.newData || {};

            const items = Array.isArray(auditData.items)
                ? auditData.items
                : [];

            for (const item of items) {

                const gstRate = Number(item.gst || 0);
                const taxAmount = Number(item.taxAmount || 0);

                // GST ITEMS ONLY
                if (gstRate <= 0 || taxAmount <= 0) {
                    continue;
                }

                const row = {
                    auditId: log._id,
                    documentId: log.documentId,

                    action: log.action,
                    date: log.createdAt,

                    user: log.userId
                        ? {
                            id: log.userId._id,
                            name: log.userId.name || "",
                            email: log.userId.email || "",
                            role: log.userId.role || log.role || ""
                        }
                        : {
                            id: null,
                            name: "",
                            email: "",
                            role: log.role || ""
                        },

                    grnNo: auditData.grnNo || "",
                    invoiceNo: auditData.invoiceNo || "",
                    grnDate: auditData.grnDate || null,

                    supplierName:
                        auditData.supplierName || "",

                    supplierGstNumber:
                        auditData.supplierGstNumber || "",

                    placeOfSupply:
                        auditData.placeOfSupply || "",

                    itemName:
                        item.itemName || "",

                    hsnCode:
                        item.hsnCode || "",

                    qty:
                        Number(item.qty || 0),

                    unit:
                        item.unit || "",

                    rate:
                        Number(item.rate || 0),

                    mrp:
                        Number(item.mrp || 0),

                    gst:
                        gstRate,

                    cgstAmount:
                        Number(
                            Number(
                                item.cgstAmount ??
                                (taxAmount / 2)
                            ).toFixed(2)
                        ),

                    sgstAmount:
                        Number(
                            Number(
                                item.sgstAmount ??
                                (taxAmount / 2)
                            ).toFixed(2)
                        ),

                    taxAmount,

                     totalAmount: Number(
        Number(
            item.totalAmount ??
            item.netAmount ??
            (
                Number(item.taxableAmount || 0) +
                Number(item.taxAmount || 0)
            )
        ).toFixed(2)
    )
                };

                

                itemWiseData.push(row);

                
            }
        }


        let finalData = itemWiseData;

        if (search && String(search).trim()) {
            const searchText = String(search)
                .trim()
                .toLowerCase();

            finalData = itemWiseData.filter((item) => {
                return (
                    String(item.itemName || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    String(item.hsnCode || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    String(item.grnNo || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    String(item.invoiceNo || "")
                        .toLowerCase()
                        .includes(searchText) ||

                    String(item.supplierName || "")
                        .toLowerCase()
                        .includes(searchText)
                );
            });
        }

        return res.status(200).json({
            success: true,

            count: finalData.length,

            data: finalData
        });

    } catch (error) {

        console.error(
            "PURCHASE ITEM WISE AUDIT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getBillItemWiseAudit = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const {
            fromDate,
            toDate,
            action,
            search
        } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId,
            module: "Bill"
        };

        if (action) {
            filter.action = action;
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

        const itemWiseData = [];

        for (const log of logs) {
            const auditData = log.newData || {};

            const items = Array.isArray(auditData.items)
                ? auditData.items
                : [];

            for (const item of items) {

                // EXTRA SAFETY:
                // GST item only
                if (
                    Number(item.gstRate || 0) <= 0 ||
                    Number(item.gstAmount || 0) <= 0
                ) {
                    continue;
                }

                itemWiseData.push({
                    auditId: log._id,
                    documentId: log.documentId,

                    action: log.action,
                    date: log.createdAt,

                    user: log.userId
                        ? {
                            id: log.userId._id,
                            name: log.userId.name || "",
                            email: log.userId.email || "",
                            role: log.userId.role || log.role || ""
                        }
                        : {
                            id: null,
                            name: "",
                            email: "",
                            role: log.role || ""
                        },

                    // BILL
                    invoiceNo:
                        auditData.invoiceNo || "",

                    invoiceDate:
                        auditData.invoiceDate || null,

                    customerName:
                        auditData.customerName || "Walk-in Customer",

                    customerGstNumber:
                        auditData.customerGstNumber || "",

                    placeOfSupply:
                        auditData.placeOfSupply || "",

                    // ITEM
                    productId:
                        item.productId || null,

                    barcode:
                        item.barcode || "",

                    itemName:
                        item.itemName || "",

                    hsnCode:
                        item.hsnCode || "",

                    qty:
                        Number(item.qty || 0),

                    freeQty:
                        Number(item.freeQty || 0),

                    totalGivenQty:
                        Number(item.totalGivenQty || 0),

                    unit:
                        item.unit || "",

                    unitValue:
                        Number(item.unitValue || 1),

                    unitText:
                        item.unitText || "",

                    totalKg:
                        item.totalKg || "",

                    mrp:
                        Number(item.mrp || 0),

                    rate:
                        Number(item.rate || 0),

                    discountAmount:
                        Number(item.discountAmount || 0),

                    taxableAmount:
                        Number(item.taxableAmount || 0),

                    gstRate:
                        Number(item.gstRate || 0),

                    cgstRate:
                        Number(item.cgstRate || 0),

                    sgstRate:
                        Number(item.sgstRate || 0),

                    gstAmount:
                        Number(item.gstAmount || 0),

                    cgstAmount:
                        Number(item.cgstAmount || 0),

                    sgstAmount:
                        Number(item.sgstAmount || 0),

                    totalAmount:
                        Number(item.totalAmount || 0),

                    finalAmount:
                        Number(item.finalAmount || 0),

                    appliedPriceLevel:
                        item.appliedPriceLevel || "normal",

                    // SUMMARY
                    billGrandTotal:
                        Number(
                            auditData.summary?.grandTotal || 0
                        ),

                    totalGST:
                        Number(
                            auditData.summary?.totalGST || 0
                        ),

                    paymentMethod:
                        auditData.paymentMethod || "",

                    paymentStatus:
                        auditData.paymentStatus || ""
                });
            }
        }

        let finalData = itemWiseData;

        if (search && String(search).trim()) {
            const searchText =
                String(search)
                    .trim()
                    .toLowerCase();

            finalData = itemWiseData.filter((item) =>
                String(item.invoiceNo || "")
                    .toLowerCase()
                    .includes(searchText) ||

                String(item.itemName || "")
                    .toLowerCase()
                    .includes(searchText) ||

                String(item.hsnCode || "")
                    .toLowerCase()
                    .includes(searchText) ||

                String(item.barcode || "")
                    .toLowerCase()
                    .includes(searchText) ||

                String(item.customerName || "")
                    .toLowerCase()
                    .includes(searchText)
            );
        }

        return res.status(200).json({
            success: true,
            count: finalData.length,
            data: finalData
        });

    } catch (error) {
        console.error(
            "BILL ITEM WISE AUDIT ERROR:",
            error
        );

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