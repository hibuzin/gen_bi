const mongoose = require("mongoose");

const Purchase = require("../models/purchase");
const Product = require("../models/product");
const ProductPriceHistory = require("../models/product_price_history");
const Supplier = require("../models/supplier");
const Barcode = require("../models/barcode");
const Counter = require("../models/counter");
const AuditLog = require("../models/audit_log");
const PriceLevel = require("../models/price_level");
const { attachHierarchy } = require("../utils/hierarchy");

const { getFinancialYear } = require("../utils/financial_year");

const getNextGRNNo = async (
    superAdminId,
    invoiceDate = new Date()
) => {
    const fy = getFinancialYear(invoiceDate);

    const counter = await Counter.findOneAndUpdate(
        {
            name: `purchase_grn_${superAdminId}_${fy}`
        },
        {
            $inc: { seq: 1 }
        },
        {
            new: true,
            upsert: true
        }
    );

    return `GRN/${fy}/${String(counter.seq).padStart(5, "0")}`;
};

exports.createPurchase = async (req, res) => {
    try {
        const {
            supplierId,
            items,
            invoiceDate,

            invoiceNo,
            invoiceAmount,
            grnDate,
            supplierBillAmount,

            freightCharge = 0,
            packagingCharge = 0,

            billDiscountPercent = 0,
            billDiscountAmount = 0,

            paidAmount,
            DueDate,

            paymentType = "cash",
            details = {}
        } = req.body;

        if (!supplierId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Supplier and items are required"
            });
        }



        if (!invoiceDate) {
            return res.status(400).json({
                success: false,
                message: "Invoice date is required"
            });
        }

        let finalInvoiceDate = new Date(invoiceDate);

        if (invoiceDate.includes(".")) {
            const [day, month, year] = invoiceDate.split(".");
            finalInvoiceDate = new Date(`${year}-${month}-${day}`);
        }

        if (isNaN(finalInvoiceDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid invoice date format. Use YYYY-MM-DD or DD.MM.YYYY"
            });
        }

        let finalGrnDate = new Date();

        if (grnDate) {
            finalGrnDate = new Date(grnDate);

            if (grnDate.includes(".")) {
                const [day, month, year] = grnDate.split(".");
                finalGrnDate = new Date(`${year}-${month}-${day}`);
            }

            if (isNaN(finalGrnDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid GRN date format. Use YYYY-MM-DD or DD.MM.YYYY"
                });
            }
        }

        const finalInvoiceAmount = Number(invoiceAmount);


        const finalFreightCharge = Number(freightCharge || 0);

        if (isNaN(finalFreightCharge) || finalFreightCharge < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid freight charge"
            });
        }

        const finalPackagingCharge = Number(packagingCharge || 0);

        if (isNaN(finalPackagingCharge) || finalPackagingCharge < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid packaging charge"
            });
        }

        if (isNaN(finalInvoiceAmount) || finalInvoiceAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invoice amount is required"
            });
        }


        let finalDueDate = null;

        if (DueDate) {
            finalDueDate = new Date(DueDate);

            if (DueDate.includes(".")) {
                const [day, month, year] = DueDate.split(".");
                finalDueDate = new Date(`${year}-${month}-${day}`);
            }

            if (isNaN(finalDueDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid due date format. Use YYYY-MM-DD or DD.MM.YYYY"
                });
            }
        }

        const hierarchy = attachHierarchy(req.user);

        const grnNo = await getNextGRNNo(
            hierarchy.superAdminId,
            finalGrnDate
        );

        const supplier = await Supplier.findOne({
            _id: supplierId,
            superAdminId: hierarchy.superAdminId
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        let totalGrossAmount = 0;
        let totalTaxAmount = 0;
        let totalAmount = 0;

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        const processedItems = [];

        for (const item of items) {

            const productId = item.productId;

            const qty = Number(item.qty);
            const freeQty = Number(item.freeQty || 0);

            const priceLevel = item.priceLevel || null;
            let barcode = String(item.barcode || item.code || "").trim();

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: "Product id is required"
                });
            }

            if (isNaN(qty) || qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            if (isNaN(freeQty) || freeQty < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid free quantity"
                });
            }



            const product = await Product.findOne({
                _id: productId,
                superAdminId: hierarchy.superAdminId
            }).populate("categoryId", "name");

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const netcost = Number(item.netcost ?? item.netCost ?? product.costPrice);

            if (isNaN(netcost) || netcost < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid net cost"
                });
            }


            const netAmount = round2(netcost * qty);

            const hasItemMrp =
    item.mrp !== undefined &&
    item.mrp !== null &&
    String(item.mrp).trim() !== "";

const existingProductMrp = Number(product.mrp || 0);

const mrp = hasItemMrp
    ? Number(item.mrp)
    : existingProductMrp;

if (hasItemMrp && (isNaN(mrp) || mrp < 0)) {
    return res.status(400).json({
        success: false,
        message: "Invalid MRP"
    });
}

const sellingPrice = Number(
    item.sellingPrice ??
    product.sellingPrice ??
    mrp ??
    0
);

if (isNaN(sellingPrice) || sellingPrice < 0) {
    return res.status(400).json({
        success: false,
        message: "Invalid selling price"
    });
}

            const purchaseUnit = product.unit || "pcs";


            const purchaseUnitValue = item.unitValue
                ? Number(item.unitValue)
                : Number(product.unitValue || 1);

            const isCustomUnitValue = item.unitValue !== undefined;

            const qtyType = item.qtyType || "unit";

            if (!["pcs", "kg", "g"].includes(purchaseUnit)) {
                return res.status(400).json({
                    success: false,
                    message: "Unit must be pcs or kg"
                });
            }

            if (
                qtyType === "unit" &&
                (isNaN(purchaseUnitValue) || purchaseUnitValue <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid unitValue is required"
                });
            }

            if (!barcode) {
                const productBarcode = await Barcode.findOne({
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId
                }).sort({ createdAt: -1 });

                if (productBarcode) {
                    barcode = productBarcode.code;
                }
            }

            const productMrp = Number(product.mrp || 0);

            if (mrp !== productMrp) {
                return res.status(400).json({
                    success: false,
                    message: "Selected MRP not found in product"
                });
            }


            const taxPercentage = Number(product.gstRate || 0);

            const discountPercent = Number(
                item.discountPercent || item.disPercent || 0
            );

            const manualDiscountAmount = Number(
                item.discountAmount || item.disAmount || 0
            );

            const isGstIncluded = item.isGstIncluded !== false;

            const totalStockQty = qty + freeQty;

            let stockQty = 0;

            if (purchaseUnit === "kg" || purchaseUnit === "g") {
                if (qtyType === "unit") {
                    stockQty = totalStockQty * purchaseUnitValue;
                } else if (qtyType === "kg") {
                    stockQty = totalStockQty;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "qtyType must be unit or kg"
                    });
                }
            } else {
                stockQty = totalStockQty;
            }

            const grossAmount = round2(qty * netcost);

            let discountAmount = 0;
            let finalDiscountPercent = discountPercent;

            if (discountPercent > 0) {
                discountAmount = round2(grossAmount * discountPercent / 100);
            } else if (manualDiscountAmount > 0) {
                discountAmount = round2(manualDiscountAmount);
                finalDiscountPercent = round2((discountAmount / grossAmount) * 100);
            }

            if (discountAmount > grossAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Discount amount cannot be greater than gross amount"
                });
            }

            const amountAfterDiscount = round2(grossAmount - discountAmount);

            let amount = 0;
            let taxAmount = 0;
            let totalCostWithGST = 0;

            if (isGstIncluded) {
                totalCostWithGST = amountAfterDiscount;

                taxAmount = round2(
                    amountAfterDiscount * taxPercentage / (100 + taxPercentage)
                );

                amount = round2(
                    amountAfterDiscount - taxAmount
                );
            } else {
                amount = amountAfterDiscount;
                taxAmount = round2(amount * taxPercentage / 100);
                totalCostWithGST = round2(amount + taxAmount);
            }

            totalGrossAmount = round2(
                totalGrossAmount + amount
            );

            totalTaxAmount = round2(
                totalTaxAmount + taxAmount
            );

            const Rate = totalStockQty > 0
                ? round2(amount / totalStockQty)
                : 0;

            const profitAmount = round2(sellingPrice - netcost);

            const profitPercent = sellingPrice > 0
                ? round2((profitAmount / sellingPrice) * 100)
                : 0;

            const roiPercent = netcost > 0
                ? round2((profitAmount / netcost) * 100)
                : 0;


            if (barcode) {
                const existingBarcode = await Barcode.findOne({
                    code: barcode,
                    superAdminId: hierarchy.superAdminId
                });

                if (
                    existingBarcode &&
                    String(existingBarcode.productId) !== String(product._id)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Barcode already exists for another product"
                    });
                }

                await Barcode.findOneAndUpdate(
                    {
                        productId: product._id,
                        code: barcode,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        $set: {
                            productId: product._id,
                            code: barcode,

                            mrp: item.mrp || product.mrp || 0,
                            costPrice: item.costPrice || product.costPrice || 0,
                            sellingPrice: item.sellingPrice || product.sellingPrice || 0,
                            gstRate: product.gstRate || 0,

                            unit: purchaseUnit,
                            unitValue: purchaseUnitValue,
                            isCustomUnitValue,

                            isSold: false,

                            ...hierarchy,
                            createdBy: req.user.userId
                        },
                        $inc: {

                            qty: stockQty,
                            availableQty: stockQty

                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }

                )
            };


            if (priceLevel) {
                await PriceLevel.findOneAndUpdate(
                    {
                        productId: product._id,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        productId: product._id,

                        pricingType: priceLevel.pricingType,

                        manualPrice: priceLevel.manualPrice || 0,

                        autoPricing: priceLevel.autoPricing || {
                            baseOn: "netcost",
                            profitPercent: 0
                        },

                        slabs: priceLevel.slabs || [],

                        ...hierarchy,
                        createdBy: req.user.userId,
                        isActive: true
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true
                    }
                );
            }

            await Product.updateOne(
                {
                    _id: product._id,
                    superAdminId: hierarchy.superAdminId
                },
                {
                    $inc: {
                        stock: stockQty
                    },
                    $set: {
                        costPrice: netcost,
                        sellingPrice: sellingPrice,
                        mrp: mrp
                    }
                }
            );

            await Product.updateOne(

                {
                    _id: product._id,
                    superAdminId: hierarchy.superAdminId
                },

                {

                    mrp: mrp,

                    costPrice: netcost,

                    sellingPrice: sellingPrice

                }

            );


            totalAmount = round2(totalAmount + totalCostWithGST);


            processedItems.push({
                productId: product._id,
                productName: product.name || "",

                description: item.description
                    ? String(item.description).trim()
                    : product.description || "",

                hsnId: product.hsnId || null,
                hsnCode: product.hsnCode || "",

                categoryId: product.categoryId?._id,
                categoryName: product.categoryId?.name || "",

                taxPercentage,
                taxAmount,

                discountPercent: finalDiscountPercent,
                discountAmount,
                purchaseDiscount: 0,


                amount,
                totalCostWithGST,
                isGstIncluded,

                freeQty,
                totalStockQty,

                qty,
                qtyType,

                netcost,
                netAmount,
                Rate,
                mrp,
                barcode,

                unit: purchaseUnit,
                unitValue: purchaseUnitValue,
                isCustomUnitValue,

                sellingPrice,
                priceLevel,


                profitAmount,
                profitPercent,
                roiPercent,

                receivedQty: stockQty,
                pendingQty: 0
            });
        }



        const purchaseTotalAmount = round2(
            totalAmount +
            finalFreightCharge +
            finalPackagingCharge
        );

        const finalSupplierBillAmount = round2(totalAmount);


        let finalBillDiscount = 0;

        if (billDiscountPercent > 0) {
            finalBillDiscount = round2(
                totalAmount * billDiscountPercent / 100
            );
        } else if (billDiscountAmount > 0) {
            finalBillDiscount = round2(billDiscountAmount);
        }

        if (finalBillDiscount > totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Bill discount cannot exceed purchase total."
            });
        }


        let recalculatedTotal = 0;
        let recalculatedGST = 0;
        let recalculatedGross = 0;

        for (const item of processedItems) {

            const ratio = item.totalCostWithGST / totalAmount;

            const purchaseDiscount = round2(
                finalBillDiscount * ratio
            );

            const newTotal = round2(
                item.totalCostWithGST - purchaseDiscount
            );

            const gstRate = item.taxPercentage;

            let taxable = 0;
            let gst = 0;

            if (item.isGstIncluded) {

                gst = round2(
                    newTotal * gstRate /
                    (100 + gstRate)
                );

                taxable = round2(newTotal - gst);

            } else {

                taxable = newTotal;

                gst = round2(
                    taxable * gstRate / 100
                );

                newTotal = round2(taxable + gst);
            }

            item.purchaseDiscount = purchaseDiscount;
            item.amount = taxable;
            item.taxAmount = gst;
            item.totalCostWithGST = newTotal;

            const discountedNetCost = round2(
                item.totalCostWithGST / item.qty
            );

            item.netcost = discountedNetCost;
            item.netAmount = round2(
                discountedNetCost * item.qty
            );

            item.profitAmount = round2(
                item.sellingPrice - item.netcost
            );

            item.profitPercent =
                item.sellingPrice > 0
                    ? round2(
                        (item.profitAmount / item.sellingPrice) * 100
                    )
                    : 0;

            item.roiPercent =
                item.netcost > 0
                    ? round2(
                        (item.profitAmount / item.netcost) * 100
                    )
                    : 0;

            item.Rate = round2(
                taxable / item.totalStockQty
            );

            recalculatedGross += taxable;
            recalculatedGST += gst;
            recalculatedTotal += newTotal;
        }

        totalGrossAmount = round2(recalculatedGross);
        totalTaxAmount = round2(recalculatedGST);
        totalAmount = round2(recalculatedTotal);

        const allowedMethods = ["cash", "upi", "card", "bank", "cheque"];

        if (!allowedMethods.includes(paymentType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment type"
            });
        }

        if (paymentType === "upi") {
            if (!details.upiId || !details.transactionId) {
                return res.status(400).json({
                    success: false,
                    message: "UPI ID and Transaction ID are required"
                });
            }
        }

        if (paymentType === "card") {
            if (!details.cardType || !details.cardLast4) {
                return res.status(400).json({
                    success: false,
                    message: "Card details are required"
                });
            }
        }

        if (paymentType === "cheque") {
            if (
                !details.chequeNo ||
                !details.chequeDate ||
                !details.bankName ||
                !details.accountHolder
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Complete cheque details are required"
                });
            }
        }

        const firstPaidAmount = Number(paidAmount || 0);

        if (firstPaidAmount > finalSupplierBillAmount) {
            return res.status(400).json({
                success: false,
                message: "Paid amount cannot be greater than supplier bill amount"
            });
        }

        const balanceAmount = round2(
            finalSupplierBillAmount - firstPaidAmount
        );

        let paymentStatus = "pending";

        if (balanceAmount === 0) {
            paymentStatus = "paid";
        } else if (firstPaidAmount > 0) {
            paymentStatus = "partial";
        }

        const purchase = await Purchase.create({


            supplierId,
            supplierName: supplier.supplierName || "",
            supplierEmail: supplier.email || "",
            grnNo,
            grnDate: finalGrnDate,
            invoiceNo,
            invoiceAmount: finalInvoiceAmount,

            invoiceDate: finalInvoiceDate,
            items: processedItems,

            totalAmount: purchaseTotalAmount,
            freightCharge: finalFreightCharge,
            packagingCharge: finalPackagingCharge,

            billDiscountPercent,
            billDiscountAmount: finalBillDiscount,

            supplierBillAmount: finalSupplierBillAmount,
            paidAmount: firstPaidAmount,
            balanceAmount,
            DueDate: balanceAmount > 0 ? finalDueDate : null,
            paymentStatus,

            paymentHistory: firstPaidAmount > 0 ? [
                {
                    amount: firstPaidAmount,
                    paymentType,
                    details,
                    note: "Initial payment"
                }
            ] : [],

            ...hierarchy,
            createdBy: req.user.userId
        });

const gstPurchaseItems = purchase.items.filter(
    (item) =>
        Number(item.taxPercentage || 0) > 0 &&
        Number(item.taxAmount || 0) > 0
);

if (gstPurchaseItems.length > 0) {

  
    const productIds = gstPurchaseItems
        .map((item) => item.productId)
        .filter(Boolean);

    const products = await Product.find({
        _id: { $in: productIds }
    })
       .select("_id itemCode hsnCode sellingPrice mrp unit unitValue")
        .lean();

    const productMap = new Map(
        products.map((product) => [
            product._id.toString(),
            product
        ])
    );

    

const gstItemsTotal = gstPurchaseItems.reduce(
    (total, item) => {
        const qty = Number(item.qty || 0);

        const rate = Number(
            item.Rate ??
            item.netcost ??
            item.rate ??
            0
        );

        return total + (qty * rate);
    },
    0
);

const gstTotalCgstAmount = gstPurchaseItems.reduce(
    (total, item) => {
        const taxAmount = Number(item.taxAmount || 0);

        return total + Number(
            (taxAmount / 2).toFixed(2)
        );
    },
    0
);

const gstTotalSgstAmount = gstPurchaseItems.reduce(
    (total, item) => {
        const taxAmount = Number(item.taxAmount || 0);

        return total + Number(
            (taxAmount / 2).toFixed(2)
        );
    },
    0
);

const gstTotalGstAmount =
    gstTotalCgstAmount +
    gstTotalSgstAmount;

const gstBillTotalAmount =
    gstItemsTotal +
    gstTotalGstAmount;

    await AuditLog.create({
        ...hierarchy,

        userId: req.user.userId,
        role: req.user.role,

        module: "Purchase",
        action: "Create",

        documentId: purchase._id,
        oldData: null,

        newData: {
            grnNo: purchase.grnNo || "",
            invoiceNo: purchase.invoiceNo || "",
            grnDate: purchase.grnDate || null,


    
            supplierName:
                supplier.supplierName || "",

            supplierGstNumber:
                supplier.gstNumber ||
                supplier.gstnumber ||
                supplier.gstin ||
                "",

            placeOfSupply:
                supplier.state ||
                supplier.placeOfSupply ||
                "",

          itemsTotal: Number(
    gstBillTotalAmount.toFixed(2)
),


totalCgstAmount: Number(
    gstTotalCgstAmount.toFixed(2)
),

totalSgstAmount: Number(
    gstTotalSgstAmount.toFixed(2)
),

totalGstAmount: Number(
    gstTotalGstAmount.toFixed(2)
),

totalTaxAmount: Number(
    gstTotalGstAmount.toFixed(2)
),

            items: gstPurchaseItems.map((item) => {

                const gstRate =
                    Number(
                        item.taxPercentage || 0
                    );

                const taxAmount =
                    Number(
                        item.taxAmount || 0
                    );

                    

                    
                     const product = item.productId
        ? productMap.get(item.productId.toString())
        : null;

        

                return {
                            productId:
                        item.productId || null,

                    itemCode:
                        product?.itemCode || "",

                    hsnCode:
                        item.hsnCode ||
                        product?.hsnCode ||
                        "",

                   
                    itemName:
                        item.productName || "",

                    qty:
                        Number(item.qty || 0),

                    unit:
                        item.unit || "",

                    rate: Number(
                        item.Rate ??
                        item.netcost ??
                        0
                    ),

                    mrp:
                        Number(item.mrp || 0),

                            sellingPrice: Number(
        item.sellingPrice ??
        product?.sellingPrice ??
        0
    ),

                    gst:
                        gstRate,

                    cgst:
                        gstRate / 2,

                    sgst:
                        gstRate / 2,

                         cgstAmount:
        Number((taxAmount / 2).toFixed(2)),

    sgstAmount:
        Number((taxAmount / 2).toFixed(2)),


                    taxAmount
                };
            })
        }
    });
}


        const responsePurchase = await Purchase.findById(purchase._id)
            .populate("items.productId", "name brand");

        const cgst = round2(totalTaxAmount / 2);
        const sgst = round2(totalTaxAmount / 2);

        return res.status(201).json({
            success: true,
            message: "Purchase created successfully",

            data: {
                _id: responsePurchase._id,

                superAdminId: responsePurchase.superAdminId,
                adminId: responsePurchase.adminId,
                createdBy: responsePurchase.createdBy,

                paymentHistory: responsePurchase.paymentHistory.map(payment => ({
                    amount: payment.amount,
                    paymentType: payment.paymentType,
                    details: payment.details,
                    paidDate: payment.paidDate,
                    note: payment.note
                })),


                supplier: {
                    id: String(supplier._id),

                    name: String(supplier.supplierName || ""),

                    mobile: String(supplier.mobile || ""),

                    email: String(supplier.email || "")
                },

                grnNo: responsePurchase.grnNo,

                grnDate: responsePurchase.grnDate
                    ? new Date(responsePurchase.grnDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                invoiceNo: responsePurchase.invoiceNo,
                invoiceAmount: responsePurchase.invoiceAmount,

                invoiceDate: responsePurchase.invoiceDate
                    ? new Date(responsePurchase.invoiceDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                DueDate: responsePurchase.DueDate
                    ? new Date(responsePurchase.DueDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                freightCharge: round2(responsePurchase.freightCharge || 0),
                packagingCharge: round2(responsePurchase.packagingCharge || 0),

                billDiscountPercent: responsePurchase.billDiscountPercent,
                billDiscountAmount: responsePurchase.billDiscountAmount,

                itemsTotal: round2(totalAmount),

                totalAmount: round2(responsePurchase.totalAmount),

                totalGrossAmount: round2(totalGrossAmount),

                cgst,
                sgst,
                totalTaxAmount: round2(totalTaxAmount),

                paymentStatus: responsePurchase.paymentStatus,

                supplierBillAmount: round2(responsePurchase.supplierBillAmount),
                paidAmount: round2(responsePurchase.paidAmount),
                balanceAmount: round2(responsePurchase.balanceAmount),
                paymentStatus: responsePurchase.paymentStatus,

                items: responsePurchase.items.map((item) => ({

                    freeQty: item.freeQty || 0,
                    totalStockQty: item.totalStockQty || 0,


                    discountPercent: item.discountPercent || 0,
                    discountAmount: round2(item.discountAmount || 0),

                    amount: round2(item.amount || 0),
                    totalCostWithGST: round2(item.totalCostWithGST || 0),
                    isGstIncluded: item.isGstIncluded,


                    profitPercent: round2(item.profitPercent || 0),
                    roiPercent: round2(item.roiPercent || 0),


                    _id: item._id,

                    productId: item.productId?._id,

                    productName: item.productId?.name || "",

                    isCustomUnitValue: item.isCustomUnitValue || false,

                    description:
                        item.description || "",



                    hsnCode:
                        item.hsnCode || "",

                    categoryName:
                        item.categoryName || "",

                    taxPercentage: item.taxPercentage || 0,

                    categoryName:
                        item.categoryName || "",

                    qty:
                        item.qty || 0,

                    netcost:
                        round2(item.netcost || 0),

                    netAmount: round2(item.netAmount || 0),

                    Rate:
                        round2(item.Rate || 0),

                    unit: item.unit || "",
                    unitValue: item.unitValue || 1,

                    profitAmount:
                        round2(item.profitAmount || 0),

                    mrp:
                        item.mrp || 0,

                    sellingPrice:
                        item.sellingPrice || 0,

                    taxAmount: round2(item.taxAmount || 0),

                    priceLevel:
                        item.priceLevel || null,

                    barcode:
                        item.barcode || "",

                    receivedQty:
                        item.receivedQty || 0,

                    pendingQty:
                        item.pendingQty || 0
                }))
            }
        });


    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.calculatePurchase = async (req, res) => {
    try {
        const {
            items,
            paidAmount = 0,
            supplierBillAmount,

            freightCharge = 0,
            packagingCharge = 0,

            billDiscountPercent = 0,
            billDiscountAmount = 0
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required"
            });
        }

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        let totalAmount = 0;
        let totalGrossAmount = 0;
        let totalTaxAmount = 0;

        const calculatedItems = items.map((item, index) => {
            const qty = Number(item.qty);
            const freeQty = Number(item.freeQty || 0);
            const totalStockQty = qty + freeQty;

            const netcost = Number(item.netcost || item.purchasePrice || item.netCost);
           const mrp = Number(item.mrp || 0);
            const sellingPrice = Number(item.sellingPrice || mrp);
            const taxPercentage = Number(item.gst || item.gstRate || item.taxPercentage || 0);

            const discountPercent = Number(item.discountPercent || 0);
            const discountAmountInput = Number(item.discountAmount || 0);
            const isGstIncluded = item.isGstIncluded !== false;

            if (isNaN(qty) || qty <= 0) {
                throw new Error(`Invalid quantity at item ${index + 1}`);
            }

            if (isNaN(netcost) || netcost < 0) {
                throw new Error(`Invalid purchase price at item ${index + 1}`);
            }

           if (mrp < 0) {
    throw new Error(`Invalid MRP at item ${index + 1}`);
}

            const netAmount = round2(netcost * qty);
            const grossAmount = round2(qty * netcost);

            let discountAmount = 0;
            let finalDiscountPercent = 0;

            if (discountPercent > 0 && discountAmountInput > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Provide either discountPercent or discountAmount for item ${index + 1}, not both.`
                });
            }

            if (discountPercent > 0) {
                finalDiscountPercent = round2(discountPercent);

                discountAmount = round2(
                    grossAmount * finalDiscountPercent / 100
                );
            }
            else if (discountAmountInput > 0) {
                discountAmount = round2(discountAmountInput);

                if (discountAmount > grossAmount) {
                    throw new Error(
                        `Discount amount cannot exceed gross amount at item ${index + 1}`
                    );
                }

                finalDiscountPercent = round2(
                    (discountAmount / grossAmount) * 100
                );
            }

            const amountAfterDiscount = round2(grossAmount - discountAmount);

            let amount = 0;
            let taxAmount = 0;
            let totalCostWithGST = 0;

            if (isGstIncluded) {
                totalCostWithGST = amountAfterDiscount;

                taxAmount = round2(
                    amountAfterDiscount * taxPercentage / (100 + taxPercentage)
                );

                amount = round2(
                    amountAfterDiscount - taxAmount
                );
            } else {
                amount = amountAfterDiscount;

                taxAmount = round2(
                    amount * taxPercentage / 100
                );

                totalCostWithGST = round2(
                    amount + taxAmount
                );
            }

            totalGrossAmount = round2(totalGrossAmount + amount);
            totalTaxAmount = round2(totalTaxAmount + taxAmount);
            totalAmount = round2(totalAmount + totalCostWithGST);

            const Rate = totalStockQty > 0
                ? round2(amount / totalStockQty)
                : 0;

            const profitAmount = round2(sellingPrice - netcost);

            const profitPercent = sellingPrice > 0
                ? round2((profitAmount / sellingPrice) * 100)
                : 0;


            const roiPercent = netcost > 0
                ? round2((profitAmount / netcost) * 100)
                : 0;



            return {
                productName: item.productName || item.itemName || "",
                qty,
                freeQty,
                totalStockQty,

                discountPercent: finalDiscountPercent,
                discountAmount,

                amount,
                totalCostWithGST,
                isGstIncluded,

                profitPercent,
                roiPercent,

                taxPercentage,
                netcost,
                netAmount,
                Rate,
                profitAmount,
                mrp,
                sellingPrice,
                taxAmount,

                barcode: item.barcode || "",
                receivedQty: totalStockQty,
                pendingQty: 0
            };
        });


        const finalFreightCharge = Number(freightCharge || 0);


        const finalPackagingCharge = Number(packagingCharge || 0);

        if (isNaN(finalPackagingCharge) || finalPackagingCharge < 0) {
            throw new Error("Invalid packaging charge");
        }

        let finalBillDiscount = 0;

        if (billDiscountPercent > 0) {
            finalBillDiscount = round2(
                totalAmount * billDiscountPercent / 100
            );
        } else if (billDiscountAmount > 0) {
            finalBillDiscount = round2(billDiscountAmount);
        }

        if (finalBillDiscount > totalAmount) {
            throw new Error("Bill discount cannot exceed purchase total.");
        }

        let recalculatedTotal = 0;
        let recalculatedGross = 0;
        let recalculatedGST = 0;

        calculatedItems.forEach((item) => {

            const ratio =
                totalAmount > 0
                    ? item.totalCostWithGST / totalAmount
                    : 0;

            const purchaseDiscount = round2(
                finalBillDiscount * ratio
            );

            let newTotal = round2(
                item.totalCostWithGST - purchaseDiscount
            );

            const gstRate = item.taxPercentage;

            let taxable = 0;
            let gst = 0;

            if (item.isGstIncluded) {

                gst = round2(
                    newTotal * gstRate / (100 + gstRate)
                );

                taxable = round2(newTotal - gst);

            } else {

                taxable = newTotal;

                gst = round2(
                    taxable * gstRate / 100
                );

                newTotal = round2(
                    taxable + gst
                );
            }

            item.purchaseDiscount = purchaseDiscount;
            item.amount = taxable;
            item.taxAmount = gst;
            item.totalCostWithGST = newTotal;

            // Keep the original purchase cost entered by the user.
            // Do NOT overwrite netcost.

            item.netAmount = round2(item.netcost * item.qty);

            item.profitAmount = round2(
                item.sellingPrice - item.netcost
            );

            item.profitPercent =
                item.sellingPrice > 0
                    ? round2((item.profitAmount / item.sellingPrice) * 100)
                    : 0;

            item.roiPercent =
                item.netcost > 0
                    ? round2((item.profitAmount / item.netcost) * 100)
                    : 0;

            item.Rate = round2(
                taxable / item.totalStockQty
            );

            recalculatedGross += taxable;
            recalculatedGST += gst;
            recalculatedTotal += newTotal;
        });

        totalGrossAmount = round2(recalculatedGross);
        totalTaxAmount = round2(recalculatedGST);
        totalAmount = round2(recalculatedTotal);



        const purchaseTotalAmount = round2(
            totalAmount +
            finalFreightCharge +
            finalPackagingCharge
        );

        const finalSupplierBillAmount = Number(
            supplierBillAmount || totalAmount
        );

        const finalPaidAmount = Number(paidAmount || 0);

        const balanceAmount = round2(
            finalSupplierBillAmount - finalPaidAmount
        );



        const cgst = round2(totalTaxAmount / 2);
        const sgst = round2(totalTaxAmount / 2);

        return res.status(200).json({
            success: true,
            message: "Purchase calculation successful",
            data: {
                totalAmount: round2(totalAmount),
                totalGrossAmount: round2(totalGrossAmount),
                itemsTotal: round2(totalAmount),

                freightCharge: round2(finalFreightCharge),
                packagingCharge: round2(finalPackagingCharge),

                billDiscountPercent,
                billDiscountAmount: round2(finalBillDiscount),

                totalAmount: round2(purchaseTotalAmount),

                cgst,
                sgst,
                totalTaxAmount: round2(totalTaxAmount),

                supplierBillAmount: round2(finalSupplierBillAmount),
                paidAmount: round2(finalPaidAmount),
                balanceAmount,
                items: calculatedItems
            }
        });


    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
};



exports.getProductForPurchase = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const product = await Product.findOne({
            _id: productId,
            superAdminId: hierarchy.superAdminId
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        let barcode = String(item.barcode || item.code || "").trim();

        if (!barcode) {
            const productBarcode = await Barcode.findOne({
                productId: product._id,
                superAdminId: hierarchy.superAdminId
            }).sort({ createdAt: -1 });

            if (productBarcode) {
                barcode = productBarcode.code;
            }
        }

        const productMrp = Number(product.mrp || 0);

        if (mrp !== productMrp) {
            return res.status(400).json({
                success: false,
                message: "Selected MRP not found in product"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                productId: product._id,
                productName: product.name,
                brand: product.brand,
                categoryId: product.categoryId,
                categoryName: product.categoryName,
                hsnCode: product.hsnCode,
                taxRate: product.gstRate,
                mrp: product.mrp,
                costPrice: product.costPrice,
                sellingPrice: product.sellingPrice,

                kg: product.kg,
                currentStock: product.stock
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getPurchasesByDate = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const { date, fromDate, toDate } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId
        };

        if (date) {
            // Single Date
            const [day, month, year] = date.split("/");

            const start = new Date(year, month - 1, day);
            const end = new Date(year, month - 1, day);

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            filter.grnDate = {
                $gte: start,
                $lte: end
            };

        } else if (fromDate && toDate) {
            // Date Range
            const [fromDay, fromMonth, fromYear] = fromDate.split("/");
            const [toDay, toMonth, toYear] = toDate.split("/");

            const start = new Date(fromYear, fromMonth - 1, fromDay);
            const end = new Date(toYear, toMonth - 1, toDay);

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            filter.grnDate = {
                $gte: start,
                $lte: end
            };
        }

        const purchases = await Purchase.find(filter)
            .populate("supplierId", "supplierName mobile")
            .sort({ invoiceDate: -1 });

        return res.status(200).json({
            success: true,
            total: purchases.length,
            data: purchases.map((purchase) => ({
                _id: purchase._id,

                supplier: {
                    id: purchase.supplierId?._id || "",
                    name: purchase.supplierId?.supplierName || "",
                    mobile: purchase.supplierId?.mobile || ""
                },

                grnNo: purchase.grnNo,

                grnDate: purchase.grnDate
                    ? new Date(purchase.grnDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                invoiceNo: purchase.invoiceNo,

                invoiceDate: purchase.invoiceDate
                    ? new Date(purchase.invoiceDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                DueDate: purchase.DueDate
                    ? new Date(purchase.DueDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                totalAmount: purchase.totalAmount,
                supplierBillAmount: purchase.supplierBillAmount,
                paidAmount: purchase.paidAmount,
                balanceAmount: purchase.balanceAmount,
                paymentStatus: purchase.paymentStatus
            }))
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getPurchaseItemWiseReport = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const { date, fromDate, toDate } = req.query;

        const filter = {
            superAdminId: hierarchy.superAdminId
        };

        if (date) {
            const [day, month, year] = date.split("/");

            const start = new Date(year, month - 1, day);
            const end = new Date(year, month - 1, day);
            end.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: start,
                $lte: end
            };
        }

        if (fromDate && toDate) {
            const [fd, fm, fy] = fromDate.split("/");
            const [td, tm, ty] = toDate.split("/");

            const start = new Date(fy, fm - 1, fd);
            const end = new Date(ty, tm - 1, td);
            end.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: start,
                $lte: end
            };
        }

        const purchases = await Purchase.find(filter)
            .populate("items.productId", "name itemCode");

        const report = {};

        for (const purchase of purchases) {
            for (const item of purchase.items) {

                const id = item.productId?._id?.toString() || item.productId.toString();

                if (!report[id]) {
                    report[id] = {
                        productId: item.productId?._id || item.productId,
                        productName: item.productName || item.productId?.name || "",
                        itemCode: item.productId?.itemCode || "",

                        mrp: item.mrp || 0,
                        sellingPrice: item.sellingPrice || 0,
                        costPrice: item.netcost || 0,

                        unit: item.unit || "",
                        unitValue: item.unitValue || 1,

                        gstRate: item.taxPercentage || 0,

                        qtyPurchased: 0,
                        freeQty: 0,
                        totalStockQty: 0,

                        purchaseAmount: 0,
                        discountAmount: 0,
                        gstAmount: 0,
                        netPurchase: 0,

                        profitAmount: 0,
                        profitPercent: 0,
                        roiPercent: 0
                    };
                }

                report[id].qtyPurchased += Number(item.qty || 0);
                report[id].freeQty += Number(item.freeQty || 0);
                report[id].totalStockQty += Number(item.totalStockQty || 0);

                report[id].purchaseAmount += Number(item.totalCostWithGST || 0);

                report[id].discountAmount += Number(item.purchaseDiscount || item.discountAmount || 0);
                report[id].gstAmount += Number(item.taxAmount || 0);
                report[id].netPurchase += Number(item.totalCostWithGST || 0);

                report[id].profitAmount = Number(item.profitAmount || 0);
                report[id].profitPercent = Number(item.profitPercent || 0);
                report[id].roiPercent = Number(item.roiPercent || 0);
            }
        }

        return res.status(200).json({
            success: true,
            count: Object.keys(report).length,
            data: Object.values(report)
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.getAllSupplierBalances = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const balances = await Purchase.aggregate([
            {
                $match: {
                    superAdminId: hierarchy.superAdminId,
                    balanceAmount: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: "$supplierId",
                    totalBillAmount: { $sum: "$supplierBillAmount" },
                    totalPaidAmount: { $sum: "$paidAmount" },
                    totalBalanceAmount: { $sum: "$balanceAmount" },
                    pendingBills: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "suppliers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "supplier"
                }
            },
            {
                $unwind: "$supplier"
            },
            {
                $project: {
                    _id: 0,
                    supplierId: "$_id",
                    supplierName: "$supplier.supplierName",
                    mobile: "$supplier.mobile",
                    email: "$supplier.email",
                    totalBillAmount: 1,
                    totalPaidAmount: 1,
                    totalBalanceAmount: 1,
                    pendingBills: 1
                }
            },
            {
                $sort: {
                    totalBalanceAmount: -1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            count: balances.length,
            data: balances
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.quickSearchPurchases = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: "Search value is required"
            });
        }

        const searchValue = String(search).trim();
        const hierarchy = attachHierarchy(req.user);

        const purchases = await Purchase.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                { invoiceNo: { $regex: searchValue, $options: "i" } },
                { supplierName: { $regex: searchValue, $options: "i" } },
                { supplierEmail: { $regex: searchValue, $options: "i" } },
                { "items.productName": { $regex: searchValue, $options: "i" } },
                { "items.barcode": { $regex: searchValue, $options: "i" } }
            ]
        })
            .populate("supplierId", "supplierName mobile email")
            .populate("items.productId", "name brand")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: purchases.length,
            data: purchases
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getSupplierBalanceBills = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const hierarchy = attachHierarchy(req.user);

        const purchases = await Purchase.find({
            supplierId,
            superAdminId: hierarchy.superAdminId,
            balanceAmount: { $gt: 0 }
        })
            .populate("supplierId", "supplierName mobile email")
            .sort({ createdAt: -1 });

        const totalBalance = purchases.reduce(
            (sum, purchase) => sum + Number(purchase.balanceAmount || 0),
            0
        );

        return res.status(200).json({
            success: true,
            supplier: {
                id: purchases[0]?.supplierId?._id || supplierId,
                name: purchases[0]?.supplierId?.supplierName || "",
                mobile: purchases[0]?.supplierId?.mobile || "",
                email: purchases[0]?.supplierId?.email || ""
            },
            totalBalance,
            count: purchases.length,
            data: purchases.map((purchase) => ({
                purchaseId: purchase._id,
                invoiceNo: purchase.invoiceNo,
                invoiceDate: purchase.invoiceDate,
                totalAmount: purchase.totalAmount,
                supplierBillAmount: purchase.supplierBillAmount,
                paidAmount: purchase.paidAmount,
                balanceAmount: purchase.balanceAmount,
                paymentStatus: purchase.paymentStatus
            }))
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getPurchases = async (req, res) => {
    try {

        const hierarchy = attachHierarchy(req.user);

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        const purchases = await Purchase.find({
            superAdminId: hierarchy.superAdminId
        })
            .populate("supplierId", "supplierName mobile email")
            .populate("items.productId", "name brand")
            .sort({ createdAt: -1 });

        const formatted = purchases.map((purchase) => {
            const totalGrossAmount = purchase.items.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );

            const totalTaxAmount = purchase.items.reduce(
                (sum, item) => sum + Number(item.taxAmount || 0),
                0
            );

            return {
                _id: purchase._id,
                productName: purchase.items[0]?.productId?.name || "",

                supplier: {
                    id: purchase.supplierId?._id || "",
                    name: purchase.supplierId?.supplierName || purchase.supplierName || "",
                    mobile: purchase.supplierId?.mobile || "",
                    email: purchase.supplierId?.email || purchase.supplierEmail || ""
                },

                grnNo: purchase.grnNo || "",

                grnDate: purchase.grnDate
                    ? new Date(purchase.grnDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                invoiceNo: purchase.invoiceNo,

                invoiceDate: purchase.invoiceDate
                    ? new Date(purchase.invoiceDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                DueDate: purchase.DueDate
                    ? new Date(purchase.DueDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                totalAmount: round2(purchase.totalAmount || 0),
                totalGrossAmount: Math.round((totalGrossAmount + Number.EPSILON) * 100) / 100,
                totalTaxAmount: Math.round((totalTaxAmount + Number.EPSILON) * 100) / 100,

                supplierBillAmount: round2(purchase.supplierBillAmount || 0),
                paidAmount: round2(purchase.paidAmount || 0),
                balanceAmount: round2(purchase.balanceAmount || 0),

                paymentStatus: purchase.paymentStatus || "pending",

                paymentHistory: purchase.paymentHistory || [],

                items: purchase.items.map((item) => ({
                    _id: item._id,

                    productId: item.productId?._id || item.productId || "",
                    productName: item.productId?.name || item.productName || "",

                    description: item.description || "",

                    hsnCode: item.hsnCode || "",
                    taxPercentage: item.taxPercentage || 0,
                    categoryName: item.categoryName || "",

                    qty: item.qty || 0,
                    freeQty: item.freeQty || 0,
                    totalStockQty: item.totalStockQty || 0,

                    qtyType: item.qtyType || "unit",
                    stockQty: item.receivedQty || 0,

                    unit: item.unit || "pcs",
                    unitValue: item.unitValue || 1,
                    isCustomUnitValue: item.isCustomUnitValue || false,

                    netcost: round2(item.netcost || 0),
                    netAmount: round2(item.netAmount || 0),
                    Rate: round2(item.Rate || 0),

                    amount: round2(item.amount || 0),
                    taxAmount: round2(item.taxAmount || 0),
                    totalCostWithGST: round2(item.totalCostWithGST || 0),
                    isGstIncluded: item.isGstIncluded,

                    discountPercent: item.discountPercent || 0,
                    discountAmount: round2(item.discountAmount || 0),

                    profitAmount: round2(item.profitAmount || 0),
                    profitPercent: round2(item.profitPercent || 0),
                    roiPercent: round2(item.roiPercent || 0),

                    mrp: item.mrp || 0,
                    sellingPrice: item.sellingPrice || 0,

                    barcode: item.barcode || "",

                    receivedQty: item.receivedQty || 0,
                    pendingQty: item.pendingQty || 0
                })),
            }
        });

        return res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};



exports.getPurchaseById = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid purchase id"
            });
        }

        const purchase = await Purchase.findOne({
            _id: id,
            superAdminId: hierarchy.superAdminId
        })
            .populate("supplierId", "supplierName mobile email")
            .populate("items.productId", "name brand description");

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found"
            });
        }

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        const totalGrossAmount = purchase.items.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
        );

        const totalTaxAmount = purchase.items.reduce(
            (sum, item) => sum + Number(item.taxAmount || 0),
            0
        );

        return res.status(200).json({
            success: true,
            message: "Purchase fetched successfully",
            data: {
                _id: purchase._id,

                supplier: {
                    id: purchase.supplierId?._id || "",
                    name: purchase.supplierId?.supplierName || "",
                    mobile: purchase.supplierId?.mobile || "",
                    email: purchase.supplierId?.email || ""
                },

                grnNo: purchase.grnNo || "",

                grnDate: purchase.grnDate
                    ? new Date(purchase.grnDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                invoiceNo: purchase.invoiceNo,

                invoiceDate: purchase.invoiceDate
                    ? new Date(purchase.invoiceDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                DueDate: purchase.DueDate
                    ? new Date(purchase.DueDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                    : "",

                totalAmount: round2(purchase.totalAmount || 0),
                totalGrossAmount: round2(totalGrossAmount),
                totalTaxAmount: round2(totalTaxAmount),

                supplierBillAmount: round2(purchase.supplierBillAmount || 0),
                paidAmount: round2(purchase.paidAmount || 0),
                balanceAmount: round2(purchase.balanceAmount || 0),

                paymentStatus: purchase.paymentStatus || "",

                paymentHistory: purchase.paymentHistory || [],

                superAdminId: purchase.superAdminId || null,
                adminId: purchase.adminId || null,
                createdBy: purchase.createdBy || null,
                createdAt: purchase.createdAt,
                updatedAt: purchase.updatedAt,

                items: purchase.items.map((item) => ({
                    _id: item._id,

                    productId: item.productId?._id || item.productId,

                    productName:
                        item.productId?.name ||
                        item.productName ||
                        "",

                    description:
                        item.description ||
                        item.productId?.description ||
                        "",

                    hsnCode: item.hsnCode || "",
                    taxPercentage: item.taxPercentage || 0,
                    categoryName: item.categoryName || "",

                    qty: item.qty || 0,
                    freeQty: item.freeQty || 0,
                    totalStockQty: item.totalStockQty || 0,

                    qtyType: item.qtyType || "unit",
                    stockQty: item.receivedQty || 0,

                    unit: item.unit || "pcs",
                    unitValue: item.unitValue || 1,
                    isCustomUnitValue: item.isCustomUnitValue || false,

                    netcost: round2(item.netcost || 0),
                    netAmount: round2(item.netAmount || 0),
                    Rate: round2(item.Rate || 0),

                    amount: round2(item.amount || 0),
                    taxAmount: round2(item.taxAmount || 0),
                    totalCostWithGST: round2(item.totalCostWithGST || 0),
                    isGstIncluded: item.isGstIncluded,

                    discountPercent: item.discountPercent || 0,
                    discountAmount: round2(item.discountAmount || 0),

                    profitAmount: round2(item.profitAmount || 0),
                    profitPercent: round2(item.profitPercent || 0),
                    roiPercent: round2(item.roiPercent || 0),

                    mrp: item.mrp || 0,
                    sellingPrice: item.sellingPrice || 0,

                    barcode: item.barcode || "",
                    receivedQty: item.receivedQty || 0,
                    pendingQty: item.pendingQty || 0
                }))
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.updateSupplierBill = async (req, res) => {
    try {
        const { purchaseId } = req.params;
        const {
            amount,
            note,
            paymentType,
            details
        } = req.body;

        const payAmount = Number(amount);

        const allowedPaymentTypes = ["cash", "upi", "card", "bank", "cheque"];

        const finalPaymentType = paymentType
            ? String(paymentType).trim().toLowerCase()
            : "cash";

        if (!allowedPaymentTypes.includes(finalPaymentType)) {
            return res.status(400).json({
                success: false,
                message: "Payment type must be cash, upi, card, bank or cheque"
            });
        }

        if (isNaN(payAmount) || payAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid payment amount is required"
            });
        }



        const hierarchy = attachHierarchy(req.user);

        const purchase = await Purchase.findOne({
            _id: purchaseId,
            superAdminId: hierarchy.superAdminId
        });

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase bill not found"
            });
        }

        if (payAmount > purchase.balanceAmount) {
            return res.status(400).json({
                success: false,
                message: "Payment amount cannot be greater than balance amount"
            });
        }

        purchase.paidAmount += payAmount;
        purchase.balanceAmount -= payAmount;

        purchase.paidAmount = Number(purchase.paidAmount.toFixed(2));
        purchase.balanceAmount = Number(purchase.balanceAmount.toFixed(2));

        if (purchase.balanceAmount <= 0) {
            purchase.paymentStatus = "paid";
        } else if (purchase.paidAmount > 0) {
            purchase.paymentStatus = "partial";
        } else {
            purchase.paymentStatus = "due";
        }

        purchase.paymentHistory.push({
            amount: payAmount,
            paymentType: finalPaymentType,
            details: details || {},
            note: note || "Supplier payment",
            paidDate: new Date()
        });

        await purchase.save();

        return res.status(200).json({
            success: true,
            message: "Supplier payment updated successfully",
            data: {
                purchaseId: purchase._id,
                supplierBillAmount: purchase.supplierBillAmount,
                paidAmount: purchase.paidAmount,
                balanceAmount: purchase.balanceAmount,
                paymentStatus: purchase.paymentStatus,
                paymentHistory: purchase.paymentHistory
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.updatePurchase = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { id } = req.params;

        const {
            supplierId,
            invoiceNo,
            invoiceDate,
            grnDate,
            invoiceAmount,

            items,

            freightCharge = 0,
            packagingCharge = 0,

            billDiscountPercent = 0,
            billDiscountAmount = 0,

            supplierBillAmount,
            paidAmount,
            DueDate
        } = req.body;

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid purchase id"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required"
            });
        }

        const purchase = await Purchase.findOne({
            _id: id,
            superAdminId: hierarchy.superAdminId
        });

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found"
            });
        }

       
        for (const oldItem of purchase.items) {
            const oldStockQty = Number(
                oldItem.receivedQty ||
                oldItem.stockQty ||
                oldItem.totalStockQty ||
                oldItem.qty ||
                0
            );

            await Product.updateOne(
                {
                    _id: oldItem.productId,
                    superAdminId: hierarchy.superAdminId
                },
                {
                    $inc: { stock: -oldStockQty }
                }
            );

            if (oldItem.barcode) {
                await Barcode.updateOne(
                    {
                        productId: oldItem.productId,
                        code: oldItem.barcode,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        $inc: {
                            qty: -oldStockQty,
                            availableQty: -oldStockQty
                        }
                    }
                );
            }
        }

        let processedItems = [];
        let totalAmount = 0;
        let totalGrossAmount = 0;
        let totalTaxAmount = 0;

        for (const item of items) {
            const productId = item.productId;
            let barcode = String(item.barcode || item.code || "").trim();

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: "Product id is required"
                });
            }

            const product = await Product.findOne({
                _id: productId,
                superAdminId: hierarchy.superAdminId
            }).populate("categoryId", "name");

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const qty = Number(item.qty);
            const freeQty = Number(item.freeQty || 0);
            const totalStockQty = qty + freeQty;

            const netcost = Number(item.netcost || item.netCost);
            const netAmount = round2(netcost * qty);

  
const mrpValue = item.mrp;

let mrp = 0;

if (
    mrpValue !== undefined &&
    mrpValue !== null &&
    String(mrpValue).trim() !== ""
) {
    const parsedMrp = Number(mrpValue);

    if (!Number.isFinite(parsedMrp) || parsedMrp < 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid MRP"
        });
    }

    mrp = parsedMrp;
}

const sellingPrice = Number(
    item.sellingPrice ||
    product.sellingPrice ||
    mrp ||
    0
);

            if (isNaN(qty) || qty <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            if (isNaN(freeQty) || freeQty < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid free quantity"
                });
            }

            if (isNaN(netcost) || netcost < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid net cost"
                });
            }

            const purchaseUnit = product.unit || "pcs";

            const purchaseUnitValue = item.unitValue
                ? Number(item.unitValue)
                : Number(product.unitValue || 1);

            const isCustomUnitValue = item.unitValue !== undefined;
            const qtyType = item.qtyType || "unit";

            if (!["pcs", "kg", "g"].includes(purchaseUnit)) {
                return res.status(400).json({
                    success: false,
                    message: "Unit must be pcs, kg or g"
                });
            }

            if (
                qtyType === "unit" &&
                (isNaN(purchaseUnitValue) || purchaseUnitValue <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid unitValue is required"
                });
            }

            let stockQty = 0;

            if (purchaseUnit === "kg" || purchaseUnit === "g") {
                if (qtyType === "unit") {
                    stockQty = totalStockQty * purchaseUnitValue;
                } else if (qtyType === "kg") {
                    stockQty = totalStockQty;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "qtyType must be unit or kg"
                    });
                }
            } else {
                stockQty = totalStockQty;
            }

            if (!barcode) {
                const productBarcode = await Barcode.findOne({
                    productId: product._id,
                    superAdminId: hierarchy.superAdminId
                }).sort({ createdAt: -1 });

                if (productBarcode) {
                    barcode = productBarcode.code;
                }
            }

            if (barcode) {
                const existingBarcode = await Barcode.findOne({
                    code: barcode,
                    superAdminId: hierarchy.superAdminId
                });

                if (
                    existingBarcode &&
                    String(existingBarcode.productId) !== String(product._id)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Barcode already exists for another product"
                    });
                }
            }

            const taxPercentage = Number(product.gstRate || 0);

            const discountPercent = Number(item.discountPercent || item.disPercent || 0);
            const manualDiscountAmount = Number(item.discountAmount || item.disAmount || 0);
            const isGstIncluded = item.isGstIncluded !== false;

            const grossAmount = round2(qty * netcost);

            const percentDiscountAmount = round2(
                grossAmount * discountPercent / 100
            );

            const discountAmount = round2(
                percentDiscountAmount + manualDiscountAmount
            );

            if (discountAmount > grossAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Discount amount cannot be greater than gross amount"
                });
            }

            const amountAfterDiscount = round2(grossAmount - discountAmount);

            let amount = 0;
            let taxAmount = 0;
            let totalCostWithGST = 0;

            if (isGstIncluded) {
                totalCostWithGST = amountAfterDiscount;

                taxAmount = round2(
                    amountAfterDiscount * taxPercentage / (100 + taxPercentage)
                );

                amount = round2(amountAfterDiscount - taxAmount);
            } else {
                amount = amountAfterDiscount;
                taxAmount = round2(amount * taxPercentage / 100);
                totalCostWithGST = round2(amount + taxAmount);
            }

            totalGrossAmount = round2(totalGrossAmount + amount);
            totalTaxAmount = round2(totalTaxAmount + taxAmount);
            totalAmount = round2(totalAmount + totalCostWithGST);

            const Rate = totalStockQty > 0
                ? round2(amount / totalStockQty)
                : 0;

            const profitAmount = round2(sellingPrice - netcost);

            const profitPercent = sellingPrice > 0
                ? round2((profitAmount / sellingPrice) * 100)
                : 0;

            const roiPercent = netcost > 0
                ? round2((profitAmount / netcost) * 100)
                : 0;

           
            await Product.updateOne(
                {
                    _id: product._id,
                    superAdminId: hierarchy.superAdminId
                },
                {
                    $inc: { stock: stockQty }
                }
            );


            if (barcode) {
                await Barcode.findOneAndUpdate(
                    {
                        productId: product._id,
                        code: barcode,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        $set: {
                            productId: product._id,
                            code: barcode,

                            mrp: mrp,

                            costPrice: item.costPrice || product.costPrice || 0,
                            sellingPrice: item.sellingPrice || product.sellingPrice || 0,
                            gstRate: product.gstRate || 0,

                            unit: purchaseUnit,
                            unitValue: purchaseUnitValue,
                            isCustomUnitValue,

                            isSold: false,

                            ...hierarchy,
                            createdBy: req.user.userId
                        },
                        $inc: {
                            qty: stockQty,
                            availableQty: stockQty
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
            }

            if (item.priceLevel) {
                await PriceLevel.findOneAndUpdate(
                    {
                        productId: product._id,
                        superAdminId: hierarchy.superAdminId
                    },
                    {
                        productId: product._id,
                        pricingType: item.priceLevel.pricingType,
                        manualPrice: item.priceLevel.manualPrice || 0,
                        autoPricing: item.priceLevel.autoPricing || {
                            baseOn: "netcost",
                            profitPercent: 0
                        },
                        slabs: item.priceLevel.slabs || [],
                        ...hierarchy,
                        createdBy: req.user.userId,
                        isActive: true
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true
                    }
                );
            }

            processedItems.push({
                productId: product._id,
                productName: product.name || "",

                description: item.description
                    ? String(item.description).trim()
                    : product.description || "",

                hsnId: product.hsnId || null,
                hsnCode: product.hsnCode || "",

                categoryId: product.categoryId?._id,
                categoryName: product.categoryId?.name || "",

                taxPercentage,
                taxAmount,

                discountPercent,
                discountAmount,
                amount,
                totalCostWithGST,
                isGstIncluded,

                freeQty,
                totalStockQty,

                qty,
                qtyType,

                netcost,
                netAmount,
                Rate,
                mrp,
                sellingPrice,

                unit: purchaseUnit,
                unitValue: purchaseUnitValue,
                isCustomUnitValue,

                priceLevel: item.priceLevel || null,
                barcode,

                profitAmount,
                profitPercent,
                roiPercent,

                stockQty,
                receivedQty: stockQty,
                pendingQty: 0
            });
        }

        let finalBillDiscount = 0;

        if (billDiscountPercent > 0) {

            finalBillDiscount = round2(
                totalAmount * billDiscountPercent / 100
            );

        } else if (billDiscountAmount > 0) {

            finalBillDiscount = round2(
                billDiscountAmount
            );

        }

        if (finalBillDiscount > totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Bill discount cannot exceed purchase total."
            });
        }

        let supplierData = {};

        if (supplierId) {
            const supplier = await Supplier.findOne({
                _id: supplierId,
                superAdminId: hierarchy.superAdminId
            });

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            supplierData = {
                supplierId: supplier._id,
                supplierName: supplier.supplierName || "",
                supplierEmail: supplier.email || ""
            };
        }

        purchase.invoiceNo = invoiceNo || purchase.invoiceNo;
        let finalInvoiceDate = purchase.invoiceDate;

        if (invoiceDate) {

            finalInvoiceDate = new Date(invoiceDate);

            if (invoiceDate.includes(".")) {
                const [day, month, year] = invoiceDate.split(".");
                finalInvoiceDate = new Date(`${year}-${month}-${day}`);
            }

            if (isNaN(finalInvoiceDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid invoice date"
                });
            }
        }

        purchase.invoiceDate = finalInvoiceDate;

        let finalGrnDate = purchase.grnDate;

        if (grnDate) {

            finalGrnDate = new Date(grnDate);

            if (grnDate.includes(".")) {
                const [day, month, year] = grnDate.split(".");
                finalGrnDate = new Date(`${year}-${month}-${day}`);
            }

            if (isNaN(finalGrnDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid GRN date"
                });
            }
        }

        purchase.grnDate = finalGrnDate;

        purchase.invoiceAmount =
            Number(invoiceAmount || purchase.invoiceAmount);

        purchase.items = processedItems;
        const purchaseTotalAmount =
            round2(
                totalAmount +
                Number(freightCharge) +
                Number(packagingCharge)
            );

        purchase.totalAmount = purchaseTotalAmount;

        purchase.freightCharge = Number(freightCharge);

        purchase.packagingCharge = Number(packagingCharge);

        purchase.billDiscountPercent = billDiscountPercent;

        purchase.billDiscountAmount = finalBillDiscount;

        const finalSupplierBillAmount = Number(supplierBillAmount || totalAmount);
        const finalPaidAmount = Number(paidAmount ?? purchase.paidAmount ?? 0);

        if (finalPaidAmount > finalSupplierBillAmount) {
            return res.status(400).json({
                success: false,
                message: "Paid amount cannot be greater than supplier bill amount"
            });
        }

        const balanceAmount = round2(finalSupplierBillAmount - finalPaidAmount);

        let paymentStatus = "pending";

        if (balanceAmount === 0) {
            paymentStatus = "paid";
        } else if (finalPaidAmount > 0) {
            paymentStatus = "partial";
        }

        purchase.supplierBillAmount = finalSupplierBillAmount;
        purchase.paidAmount = finalPaidAmount;
        purchase.balanceAmount = balanceAmount;
        purchase.paymentStatus = paymentStatus;
        let finalDueDate = purchase.DueDate;

        if (DueDate) {

            finalDueDate = new Date(DueDate);

            if (DueDate.includes(".")) {

                const [day, month, year] = DueDate.split(".");

                finalDueDate = new Date(`${year}-${month}-${day}`);
            }

            if (isNaN(finalDueDate.getTime())) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid Due Date"
                });
            }
        }

        purchase.DueDate =
            balanceAmount > 0
                ? finalDueDate
                : null;

        if (
            finalPaidAmount > 0 &&
            finalPaidAmount !== purchase.paidAmount
        ) {
            purchase.paymentHistory.push({
                amount: finalPaidAmount,
                paymentType: "cash",
                note: "Purchase updated"
            });
        }

        Object.assign(purchase, supplierData);

        await purchase.save();

        await AuditLog.create({
            userId: req.user.userId,
            role: req.user.role,

            module: "Purchase",
            action: "Update",

            description: `Purchase updated - GRN: ${purchase.grnNo}`,

            referenceId: purchase._id,

            ...hierarchy
        });

        return res.status(200).json({
            success: true,
            message: "Purchase updated successfully",
            data: {
                _id: purchase._id,

                invoiceNo: purchase.invoiceNo,
                invoiceDate: purchase.invoiceDate,
                invoiceAmount: purchase.invoiceAmount,

                grnNo: purchase.grnNo,
                grnDate: purchase.grnDate,
                grnAmount: round2(purchase.totalAmount),

                grnDate: purchase.grnDate,

                freightCharge: purchase.freightCharge,
                packagingCharge: purchase.packagingCharge,

                billDiscountPercent: purchase.billDiscountPercent,
                billDiscountAmount: purchase.billDiscountAmount,

                supplierBillAmount: purchase.supplierBillAmount,
                paidAmount: purchase.paidAmount,
                balanceAmount: purchase.balanceAmount,
                paymentStatus: purchase.paymentStatus,

                totalAmount: round2(purchase.totalAmount),
                totalGrossAmount: round2(totalGrossAmount),
                totalTaxAmount: round2(totalTaxAmount),
                

                items: processedItems
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.deleteAllPurchases = async (req, res) => {
    try {

        const hierarchy = attachHierarchy(req.user);

        const result = await Purchase.deleteMany({
            superAdminId: hierarchy.superAdminId
        });

        res.json({
            success: true,
            message: "All purchases deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid purchase id"
            });
        }

        const hierarchy = attachHierarchy(req.user);

        const purchase = await Purchase.findOneAndDelete({
            _id: id,
            superAdminId: hierarchy.superAdminId
        });

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found"
            });
        }

        res.json({
            success: true,
            message: "Purchase deleted successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};
