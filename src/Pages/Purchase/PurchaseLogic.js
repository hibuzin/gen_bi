import { API } from "../../constants/api";

export const round2 = (num) =>
    Math.round(
        (Number(num) + Number.EPSILON) * 100
    ) / 100;

export const calculateNewItemLocal = (item) => {
    const qty = Number(item.qty || 0);
    const freeQty = Number(item.freeQty || 0);

    const netcost = Number(
        item.originalNetcost ||
        item.netcost ||
        item.costPrice ||
        0
    );

    const sellingPrice = Number(item.sellingPrice || 0);

    const taxPercentage = Number(
        item.tax ||
        item.gstRate ||
        0
    );

    const discountPercent = Number(item.discountPercent || 0);
    const discountAmountInput = Number(item.discountAmount || 0);

    const isGstIncluded = item.isGstIncluded !== false;

    // Not enough data yet
    if (qty <= 0 || netcost < 0) {
        return {
            ...item,
            rate: "",
            amount: "",
            taxAmount: "",
            netAmount: "",
            totalCostWithGST: "",
            profitAmount: "",
            profitPercent: "",
            roiPercent: "",
        };
    }

    const totalStockQty = qty + freeQty;

    const grossAmount = round2(qty * netcost);

    let discountAmount = 0;
    let finalDiscountPercent = 0;

    // Same rule as backend
    if (discountPercent > 0) {
        finalDiscountPercent = round2(discountPercent);

        discountAmount = round2(
            grossAmount * finalDiscountPercent / 100
        );
    } else if (discountAmountInput > 0) {
        discountAmount = Math.min(
            round2(discountAmountInput),
            grossAmount
        );

        finalDiscountPercent =
            grossAmount > 0
                ? round2((discountAmount / grossAmount) * 100)
                : 0;
    }

    const amountAfterDiscount = round2(
        grossAmount - discountAmount
    );

    let amount = 0;
    let taxAmount = 0;
    let totalCostWithGST = 0;

    if (isGstIncluded) {
        // entered netcost already contains GST
        totalCostWithGST = amountAfterDiscount;

        taxAmount = round2(
            amountAfterDiscount *
            taxPercentage /
            (100 + taxPercentage)
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

    const rate =
        totalStockQty > 0
            ? round2(amount / totalStockQty)
            : 0;

    const profitAmount = round2(
        sellingPrice - netcost
    );

    const profitPercent =
        sellingPrice > 0
            ? round2(
                (profitAmount / sellingPrice) * 100
            )
            : 0;

    const roiPercent =
        netcost > 0
            ? round2(
                (profitAmount / netcost) * 100
            )
            : 0;

    const netAmount = round2(
        netcost * qty
    );

    return {
        ...item,

        discountPercent: finalDiscountPercent,
        discountAmount,

        totalStockQty,

        amount,
        totalCostWithGST,

        tax: taxPercentage,
        taxAmount,

        rate,

        netAmount,

        profitAmount,
        profitPercent,
        roiPercent,

        receivedQty: totalStockQty,
        pendingQty: 0,

        originalNetcost:
            item.originalNetcost || netcost,
    };
};

export const calculateNewPurchaseTotals = ({
    items,
    currentForm,
    setPurchaseTotals,
    setForm,
}) => {
    const enteredItems = items.filter(
        (item) =>
            String(item.productName || "").trim() &&
            Number(item.qty || 0) > 0
    );

    let totalGrossAmount = 0;
    let totalTaxAmount = 0;
    let itemsTotal = 0;

    enteredItems.forEach((item) => {
        // Existing item already has calculation
        // New item gets calculated here
        const calculatedItem = item.productId
            ? item
            : calculateNewItemLocal(item);

        totalGrossAmount += Number(
            calculatedItem.amount || 0
        );

        totalTaxAmount += Number(
            calculatedItem.taxAmount || 0
        );

        itemsTotal += Number(
            calculatedItem.totalCostWithGST || 0
        );
    });

    totalGrossAmount = round2(totalGrossAmount);
    totalTaxAmount = round2(totalTaxAmount);
    itemsTotal = round2(itemsTotal);

    // Bill discount
    const billDiscountPercent = Number(
        currentForm.billDiscountPercent || 0
    );

    const billDiscountAmount = round2(
        itemsTotal * billDiscountPercent / 100
    );

    const afterBillDiscount = round2(
        itemsTotal - billDiscountAmount
    );

    const freightCharge = Number(
        currentForm.freightCharge || 0
    );

    const packagingCharge = Number(
        currentForm.packagingCharge || 0
    );

    const totalAmount = round2(
        afterBillDiscount +
        freightCharge +
        packagingCharge
    );

    const cgst = round2(totalTaxAmount / 2);
    const sgst = round2(totalTaxAmount / 2);

    setPurchaseTotals({
        totalAmount,
        totalGrossAmount,
        totalTaxAmount,
        cgst,
        sgst,

        itemsTotal: afterBillDiscount,

        freightCharge,
        packagingCharge,

        billDiscountAmount,

        supplierBillAmount: afterBillDiscount,

        balanceAmount: round2(
            afterBillDiscount -
            Number(currentForm.paidAmount || 0)
        ),
    });

    setForm((prev) => ({
        ...prev,
        supplierBillAmount: afterBillDiscount,
    }));
};

export const calculatePurchase = async ({
    items,
    currentForm,
    token,
    setBillItems,
    setPurchaseTotals,
    setForm,
    showToast,
}) => {
    const validItems = items.filter(
        (item) => item.productId && String(item.qty).trim() !== ""
    );

    if (validItems.length === 0) {
        setBillItems(items);
        setPurchaseTotals({
            totalAmount: 0,
            totalGrossAmount: 0,
            totalTaxAmount: 0,
            cgst: 0,
            sgst: 0,
            itemsTotal: 0,
            freightCharge: 0,
            packagingCharge: 0,
            billDiscountAmount: 0,
            supplierBillAmount: 0,
            balanceAmount: 0,
        });
        setForm((prev) => ({
            ...prev,
            supplierBillAmount: "",
        }));
        return;
    }

    try {
        const payload = {
            items: validItems.map((item) => ({
                productId: item.productId,
                qty: Number(item.qty || 0),
                freeQty: Number(item.freeQty || 0),
                netcost: Number(item.originalNetcost || item.netcost || item.costPrice || 0),
                mrp: Number(item.mrp || 0),
                sellingPrice: Number(item.sellingPrice || 0),
                gstRate: Number(item.tax || item.gstRate || 0),
            })),
        };

        if (currentForm.billDiscountPercent !== "") {
            payload.billDiscountPercent = Number(currentForm.billDiscountPercent || 0);
        }

        if (currentForm.freightCharge !== "") {
            payload.freightCharge = Number(currentForm.freightCharge || 0);
        }
        if (currentForm.packagingCharge !== "") {
            payload.packagingCharge = Number(
                currentForm.packagingCharge || 0
            );
        }
        const res = await fetch(API.calculatePurchase, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) return;

        let calcIndex = 0;

        const updated = items.map((item) => {
            if (!item.productId || String(item.qty).trim() === "") return item;

            const calc = data.data.items[calcIndex];
            calcIndex += 1;

            if (!calc) return item;

            return {
                ...item,
                productName: item.productName || calc.productName || "",
                qty: calc.qty,
                freeQty: calc.freeQty,
                totalStockQty: calc.totalStockQty,
                receivedQty: calc.receivedQty,
                pendingQty: calc.pendingQty,

                discountPercent: calc.discountPercent,
                discountAmount: calc.discountAmount,

                amount: calc.amount,
                totalCostWithGST: calc.totalCostWithGST,
                isGstIncluded: calc.isGstIncluded,

                profitPercent: calc.profitPercent,
                roiPercent: calc.roiPercent,
                profitAmount: calc.profitAmount,

                tax: calc.taxPercentage,
                taxAmount: calc.taxAmount,

                rate: calc.Rate,
                netcost: calc.totalCostWithGST,
                costPrice: calc.totalCostWithGST,
                purchasePrice: calc.totalCostWithGST,
                originalNetcost: item.originalNetcost || calc.netcost,
                purchaseDiscount: calc.purchaseDiscount || 0,
                netAmount: calc.netAmount,

                mrp: calc.mrp,
                sellingPrice: calc.sellingPrice,

                barcode: item.barcode || calc.barcode || "",
            };
        });

        setBillItems(updated);

        setPurchaseTotals({
            totalAmount: Number(data.data.totalAmount || 0),
            totalGrossAmount: Number(data.data.totalGrossAmount || 0),
            totalTaxAmount: Number(data.data.totalTaxAmount || 0),
            cgst: Number(data.data.cgst || 0),
            sgst: Number(data.data.sgst || 0),
            itemsTotal: Number(data.data.itemsTotal || 0),
            freightCharge: Number(data.data.freightCharge || 0),
            packagingCharge: Number(data.data.packagingCharge || 0),
            billDiscountAmount: Number(data.data.billDiscountAmount || 0),
            supplierBillAmount: Number(data.data.supplierBillAmount || 0),
            balanceAmount: Number(data.data.balanceAmount || 0),
        });

        setForm((prev) => ({
            ...prev,
            supplierBillAmount: data.data.supplierBillAmount || "",
        }));
    } catch (err) {
        showToast("Calculation failed", "error");
    }
};

export const handlePurchaseSubmit = async ({
    form,
    billItems,
    purchaseTotals,
    token,
    isEditMode,
    editPurchaseId,
    navigate,
    showToast,
    setForm,
    setBillItems,
    setLoading,
    emptyItem,
    addDays,
    formatDateToDDMMYYYY,
    createInlineSupplier,
    createInlineProduct,
    calculatePurchase,
    setSuppliers,
    supplierSearch,
    supplierDetails,
}) => {

    if (
        !form.supplierId &&
        !String(supplierSearch || "").trim()
    ) {
        return showToast(
            "Select or enter supplier",
            "error"
        );
    }

    // Existing product OR newly typed product
    const enteredItems = billItems.filter(
        (item) =>
            item.productId ||
            String(item.productName || "").trim()
    );

    if (enteredItems.length === 0) {
        return showToast(
            "Add at least one item",
            "error"
        );
    }

    // Validate new products
    const invalidNewItem = enteredItems.find(
        (item) =>
            !item.productId &&
            !String(item.productName || "").trim()
    );

    if (invalidNewItem) {
        return showToast(
            "Enter item name",
            "error"
        );
    }

    const invalidQtyItem = enteredItems.find(
        (item) => Number(item.qty || 0) <= 0
    );

    if (invalidQtyItem) {
        return showToast(
            `Enter quantity for ${invalidQtyItem.productName || "item"
            }`,
            "error"
        );
    }
    if (
        Number(form.paidAmount || 0) > 0 &&
        form.paymentType === "bank" &&
        (!form.bankName.trim() || !form.transactionId.trim())
    ) {
        return showToast("Enter bank name and transaction id", "error");
    }

    if (
        Number(form.paidAmount || 0) > 0 &&
        form.paymentType === "upi" &&
        (!form.upiId.trim() || !form.upiTransactionId.trim())
    ) {
        return showToast("Enter UPI id and transaction id", "error");
    }

    if (
        Number(form.paidAmount || 0) > 0 &&
        form.paymentType === "card" &&
        (!form.cardType || form.cardLast4.length !== 4)
    ) {
        return showToast("Select card type and enter last 4 digits", "error");
    }

    try {
        setLoading(true);

        // =================================
        // RESOLVE SUPPLIER FIRST
        // =================================

        let resolvedSupplierId = form.supplierId;

        // No existing supplier selected,
        // but user typed a supplier → create it
        if (!resolvedSupplierId) {

            if (!String(supplierSearch || "").trim()) {
                throw new Error("Enter supplier name");
            }

            if (!String(supplierDetails.number || "").trim()) {
                throw new Error("Enter supplier mobile number");
            }


            showToast(
                `Creating ${supplierSearch}...`,
                "success"
            );

            const createdSupplier =
                await createInlineSupplier();

            resolvedSupplierId =
                createdSupplier.supplierId;

            // Update UI too
            setForm((prev) => ({
                ...prev,
                supplierId: resolvedSupplierId,
            }));

            setSuppliers((prev) => [
                ...prev,
                {
                    ...createdSupplier.supplier,
                    _id: resolvedSupplierId,
                    supplierName:
                        createdSupplier.supplier?.supplierName ||
                        supplierSearch,
                    mobile:
                        createdSupplier.supplier?.mobile ||
                        supplierDetails.number,
                },
            ]);
        }

        console.log(
            "RESOLVED SUPPLIER ID:",
            resolvedSupplierId
        );


        // --------------------------------
        // CREATE NEW PRODUCTS FIRST
        // --------------------------------

        const resolvedItems = [];

        for (const item of enteredItems) {

            // Existing product
            if (item.productId) {
                resolvedItems.push(item);
                continue;
            }

            // New product
            showToast(
                `Creating ${item.productName}...`,
                "success"
            );

            const createdItem =
                await createInlineProduct(item);

            resolvedItems.push(createdItem);
        }

        console.log(
            "PURCHASE ITEMS AFTER PRODUCT CREATE:",
            resolvedItems
        );

        // Update UI with newly received product ids
        setBillItems((prev) => {
            const updated = [...prev];

            let resolvedIndex = 0;

            for (let i = 0; i < updated.length; i++) {
                if (
                    updated[i].productId ||
                    String(updated[i].productName || "").trim()
                ) {
                    if (resolvedItems[resolvedIndex]) {
                        updated[i] = {
                            ...updated[i],
                            ...resolvedItems[resolvedIndex],
                        };

                        resolvedIndex++;
                    }
                }
            }

            return updated;
        });


        // --------------------------------
        // CALCULATE AFTER PRODUCT CREATION
        // --------------------------------

        const calculationItems =
            resolvedItems.map((item) => ({
                ...item,
                qty: Number(item.qty || 0),
                freeQty: Number(item.freeQty || 0),
            }));

        // purchase calculation API now has productIds
        await calculatePurchase(
            calculationItems,
            form
        );


        const payload = {
            supplierId: resolvedSupplierId,

            invoiceNo: form.invoiceNo,

            invoiceDate: form.invoiceDate,

            invoiceAmount: Number(
                form.invoiceAmount || 0
            ),

            grnDate: formatDateToDDMMYYYY(
                form.grnDate
            ),

            supplierBillAmount: Number(
                form.supplierBillAmount ||
                purchaseTotals.supplierBillAmount ||
                0
            ),

            paidAmount: Number(
                form.paidAmount || 0
            ),

            freightCharge: Number(
                form.freightCharge || 0
            ),

            packagingCharge: Number(
                form.packagingCharge || 0
            ),

            billDiscountPercent: Number(
                form.billDiscountPercent || 0
            ),

            billDiscountAmount: Number(
                purchaseTotals.billDiscountAmount || 0
            ),

            items: resolvedItems.map((item) => ({
                productId:
                    item.productId?._id ||
                    item.productId,

                qty: Number(item.qty || 0),

                freeQty: Number(
                    item.freeQty || 0
                ),

                netcost: Number(
                    item.originalNetcost ||
                    item.netcost ||
                    item.costPrice ||
                    0
                ),

                sellingPrice: Number(
                    item.sellingPrice || 0
                ),

                mrp: Number(item.mrp || 0),

                barcode:
                    item.barcode ||
                    item.itemCode ||
                    "",

                unitValue: Number(
                    item.unitValue || 1
                ),

                qtyType:
                    item.qtyType || "unit",

                isGstIncluded:
                    item.isGstIncluded !== false,
            })),
        };

        const requestUrl = isEditMode
            ? `${API.purchase}/${editPurchaseId}`
            : API.createPurchase;

        const requestMethod = isEditMode
            ? "PUT"
            : "POST";

        console.log(
            isEditMode
                ? "PURCHASE UPDATE PAYLOAD:"
                : "PURCHASE CREATE PAYLOAD:",
            payload
        );

        const res = await fetch(requestUrl, {
            method: requestMethod,

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(payload),
        });


        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(
                data.message ||
                (isEditMode
                    ? "Purchase update failed"
                    : "Purchase creation failed")
            );
        }

        showToast(
            isEditMode
                ? "Purchase updated successfully"
                : "Purchase created successfully",
            "success"
        );

        setTimeout(() => {
            navigate("/purchase", {
                replace: true,
            });
        }, 300);

        const today = new Date().toISOString().split("T")[0];

        setForm({
            supplierId: "",
            invoiceNo: "",
            invoiceDate: today,
            grnDate: today,
            invoiceAmount: "",
            dueDate: addDays(today, 7),
            supplierBillAmount: "",
            billDiscountPercent: "",
            packagingCharge: "",
            freightCharge: "",
            paymentType: "cash",
            bankName: "",
            transactionId: "",
            upiId: "",
            upiTransactionId: "",
            cardType: "",
            cardLast4: "",
            paidAmount: "",
            notes: "",
        });

        setBillItems(Array.from({ length: 300 }, () => ({ ...emptyItem })));
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        setLoading(false);
    }
};