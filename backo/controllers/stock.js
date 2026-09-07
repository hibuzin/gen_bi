const Product = require("../models/product");
const mongoose = require("mongoose");
const Purchase = require("../models/purchase");
const Barcode = require("../models/barcode");
const Bill = require("../models/bill");
const { attachHierarchy } = require("../utils/hierarchy");


exports.allstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };



        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId = String(product._id);

            const productBarcodes = barcodeMap.get(productId) || [];


            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const currentStock = Number(
                        Number(barcode.availableQty || 0).toFixed(2)
                    );

                    const totalQty = Number(
                        Number(barcode.qty || 0).toFixed(2)
                    );

                    const unit = barcode.unit || product.unit || "pcs";

                    const unitValue = Number(
                        barcode.unitValue || product.unitValue || 1
                    );

                    let totalStockText = "";

                    if (unit === "kg") {
                        totalStockText =
                            `${formatQty(currentStock * unitValue)} kg`;

                    } else if (unit === "g") {
                        totalStockText =
                            `${formatQty((currentStock * unitValue) / 1000)} kg`;

                    } else {
                        totalStockText =
                            `${formatQty(currentStock)} pcs`;
                    }

                    const soldQty = Math.max(
                        Number((totalQty - currentStock).toFixed(2)),
                        0
                    );

                    const costPrice = Number(
                        barcode.costPrice ??
                        product.costPrice ??
                        0
                    );

                    const stockValue = Number(
                        (currentStock * costPrice).toFixed(2)
                    );

                    data.push({
                        productId: product._id,
                        productName: product.name || "",

                        itemCode: product.itemCode || "",

                        barcode: barcode.code,

                        totalQty,
                        currentStock,
                        soldQty,

                        totalStockText,

                        stockValue,

                        mrp: barcode.mrp || product.mrp || 0,
                        costPrice: barcode.costPrice || product.costPrice || 0,
                        sellingPrice: barcode.sellingPrice || product.sellingPrice || 0,

                        gst: barcode.gstRate || product.gstRate || 0,

                        unit,
                        unitValue,
                        unitText: `${unitValue} ${unit}`,

                        status:
                            currentStock <= 0
                                ? "Out Of Stock"
                                : currentStock <= 10
                                    ? "Low Stock"
                                    : "Available"
                    });
                }
            }

            else {

                const currentStock = Number(
                    Number(product.stock || 0).toFixed(2)
                );

                const totalQty = currentStock;

                const unit = product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let totalStockText = "";

                if (unit === "kg") {

                    totalStockText =
                        `${formatQty(currentStock * unitValue)} kg`;

                } else if (unit === "g") {

                    totalStockText =
                        `${formatQty(
                            (currentStock * unitValue) / 1000
                        )} kg`;

                } else {

                    totalStockText =
                        `${formatQty(currentStock)} pcs`;
                }

                const costPrice = Number(
                    product.costPrice || 0
                );

                const stockValue = Number(
                    (currentStock * costPrice).toFixed(2)
                );

                data.push({

                    productId: product._id,

                    productName: product.name || "",

                    itemCode: product.itemCode || "",


                    barcode: null,

                    totalQty,

                    currentStock,


                    soldQty: 0,

                    totalStockText,

                    stockValue,

                    mrp: product.mrp || 0,

                    costPrice,

                    sellingPrice:
                        product.sellingPrice || 0,

                    gst:
                        product.gstRate || 0,

                    unit,

                    unitValue,

                    unitText: `${unitValue} ${unit}`,

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= 10
                                ? "Low Stock"
                                : "Available"
                });
            }
        }

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {

        console.error("allstockcheck error:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getAllRepackStock = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            productType: "repack"
        }).lean();



        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId = String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {


                    const currentStock = Number(Number(barcode.availableQty || 0).toFixed(2));
                    const totalQty = Number(Number(barcode.qty || 0).toFixed(2));
                    const soldQty = Math.max(
                        Number((totalQty - currentStock).toFixed(2)),
                        0
                    );

                    const costPrice = Number(barcode.costPrice || product.costPrice || 0);
                    const sellingPrice = Number(barcode.sellingPrice || product.sellingPrice || 0);

                    const stockValue = Number((currentStock * costPrice).toFixed(2));

                    data.push({
                        productId: product._id,
                        bulkProductId: product.parentProductId,

                        productName: product.name,

                        itemCode: product.itemCode || "",

                        barcode: barcode.code,

                        totalQty,
                        currentStock,
                        soldQty,

                        mrp: barcode.mrp || product.mrp || 0,
                        costPrice: barcode.costPrice || product.costPrice || 0,
                        sellingPrice: barcode.sellingPrice || product.sellingPrice || 0,
                        gstRate: barcode.gstRate || product.gstRate || 0,

                        stockValue,

                        unit: barcode.unit,
                        unitValue: barcode.unitValue,
                        unitText: `${barcode.unitValue} ${barcode.unit}`,

                        status:
                            currentStock <= 0
                                ? "Out Of Stock"
                                : currentStock <= 10
                                    ? "Low Stock"
                                    : "Available"
                    });
                }
            }

            else {

                const currentStock = Number(
                    Number(product.stock || 0).toFixed(2)
                );

                const totalQty = currentStock;

                const soldQty = 0;

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let totalStockText = "";

                if (unit === "kg") {

                    totalStockText =
                        `${formatQty(
                            currentStock * unitValue
                        )} kg`;

                } else if (unit === "g") {

                    totalStockText =
                        `${formatQty(
                            (currentStock * unitValue) / 1000
                        )} kg`;

                } else {

                    totalStockText =
                        `${formatQty(currentStock)} pcs`;
                }

                const costPrice = Number(
                    product.costPrice || 0
                );

                const sellingPrice = Number(
                    product.sellingPrice || 0
                );

                const stockValue = Number(
                    (currentStock * costPrice).toFixed(2)
                );

                data.push({

                    productId: product._id,

                    bulkProductId:
                        product.parentProductId || null,

                    productName:
                        product.name || "",

                    itemCode:
                        product.itemCode || "",

                   
                    barcode: null,

                    totalQty,

                    currentStock,

                    soldQty,

                    totalStockText,

                    mrp:
                        product.mrp || 0,

                    costPrice,

                    sellingPrice,

                    gstRate:
                        product.gstRate || 0,

                    stockValue,

                    unit,

                    unitValue,

                    unitText:
                        `${unitValue} ${unit}`,

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= 10
                                ? "Low Stock"
                                : "Available"
                });
            }
        }

       

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {

        console.error(
            "getAllRepackStock error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getAllBulkProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const bulkProducts = await Product.find({
            superAdminId: hierarchy.superAdminId,
            productType: "bulk"
        })
            .select(
                "name itemCode stock unit unitValue mrp costPrice sellingPrice gstRate"
            )
            .sort({ name: 1 });

        const data = bulkProducts.map((item) => {
            const stock = Number(item.stock || 0);
            const costPrice = Number(item.costPrice || 0);

            return {
                bulkId: item._id,
                productName: item.name,

                itemCode: item.itemCode || "",

                stock,
                unit: item.unit,
                unitValue: item.unitValue,

                mrp: item.mrp || 0,
                costPrice,
                sellingPrice: item.sellingPrice || 0,
                gstRate: item.gstRate || 0,

                stockValue: Number((stock * costPrice).toFixed(2)),

                status:
                    stock <= 0
                        ? "Out Of Stock"
                        : stock <= 10
                            ? "Low Stock"
                            : "Available"
            };
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};




exports.stockCheckByBulkId = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { bulkId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bulkId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bulk product id"
            });
        }

        const bulkProduct = await Product.findOne({
            _id: bulkId,
            superAdminId: hierarchy.superAdminId,
            productType: "bulk"
        });

        if (!bulkProduct) {
            return res.status(404).json({
                success: false,
                message: "Bulk product not found"
            });
        }

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).populate(
            "productId",
            "name itemCode stock unit unitValue mrp costPrice sellingPrice parentProductId productType gstRate"
        );

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        const data = [];

        for (const barcode of barcodes) {
            const product = barcode.productId;

            if (!product) continue;


            if (
                product.productType !== "repack" ||
                String(product.parentProductId) !== String(bulkId)
            ) {
                continue;
            }

            const currentStock = Number(barcode.availableQty || 0);

            const totalQty = Number(barcode.qty || 0);

            const soldQty = Math.max(totalQty - currentStock, 0);

            const costPrice = Number(barcode.costPrice || product.costPrice || 0);
            const stockValue = Number((currentStock * costPrice).toFixed(2));

            data.push({
                productId: product._id,
                productName: product.name,
                barcode: barcode.code,

                currentStock,
                soldQty,
                totalQty,

                costPrice,
                stockValue,

                unit: barcode.unit,
                unitValue: barcode.unitValue,

                gstRate: barcode.gstRate || product.gstRate || 0,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= 10
                            ? "Low Stock"
                            : "Available"
            });
        }

        return res.status(200).json({
            success: true,
            bulkProduct: {
                _id: bulkProduct._id,
                name: bulkProduct.name,
                stock: bulkProduct.stock,
                unit: bulkProduct.unit,
                unitValue: bulkProduct.unitValue
            },
            count: data.length,
            data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.getStockValue = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const round2 = (num) =>
            Math.round((Number(num) + Number.EPSILON) * 100) / 100;

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();



        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();


        let totalCostValue = 0;
        let totalSellingValue = 0;
        let totalMrpValue = 0;

        const data = [];



        const barcodeMap = new Map();

        for (const barcode of barcodes) {
            const productId = String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId = String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const currentStock = Number(barcode.availableQty || 0);

                    const mrp = Number(barcode.mrp || product.mrp || 0);
                    const costPrice = Number(barcode.costPrice || product.costPrice || 0);
                    const sellingPrice = Number(barcode.sellingPrice || product.sellingPrice || 0);

                    const costValue = round2(currentStock * costPrice);
                    const sellingValue = round2(currentStock * sellingPrice);
                    const mrpValue = round2(currentStock * mrp);

                    totalCostValue += costValue;
                    totalSellingValue += sellingValue;
                    totalMrpValue += mrpValue;

                    data.push({
                        productId: product._id,
                        productName: product.name || "",
                        itemCode: product.itemCode || "",

                        barcode: barcode.code || "",

                        currentStock,
                        productStock: Number(product.stock || 0),
                        barcodeStock: currentStock,
                        barcodeQty: Number(barcode.qty || 0),

                        mrp,
                        costPrice,
                        sellingPrice,

                        costValue,
                        sellingValue,
                        mrpValue,

                        unit: barcode.unit || product.unit || "pcs",
                        unitValue: barcode.unitValue || product.unitValue || 1,

                        gstRate: barcode.gstRate || product.gstRate || 0,

                        status:
                            currentStock <= 0
                                ? "Out Of Stock"
                                : currentStock <= 10
                                    ? "Low Stock"
                                    : "Available"
                    });
                }
            }

            else {

                const currentStock = Number(
                    Number(product.stock || 0).toFixed(2)
                );

                const mrp = Number(
                    product.mrp || 0
                );

                const costPrice = Number(
                    product.costPrice || 0
                );

                const sellingPrice = Number(
                    product.sellingPrice || 0
                );

                const costValue = round2(
                    currentStock * costPrice
                );

                const sellingValue = round2(
                    currentStock * sellingPrice
                );

                const mrpValue = round2(
                    currentStock * mrp
                );

                totalCostValue += costValue;
                totalSellingValue += sellingValue;
                totalMrpValue += mrpValue;

                data.push({

                    productId: product._id,

                    productName:
                        product.name || "",

                    itemCode:
                        product.itemCode || "",

                    
                    barcode: null,

                    currentStock,

                    productStock:
                        currentStock,

                    barcodeStock: 0,

                    barcodeQty: 0,

                    mrp,

                    costPrice,

                    sellingPrice,

                    costValue,

                    sellingValue,

                    mrpValue,

                    unit:
                        product.unit || "pcs",

                    unitValue:
                        Number(product.unitValue || 1),

                    gstRate:
                        Number(product.gstRate || 0),

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= 10
                                ? "Low Stock"
                                : "Available"
                });
            }
        }

   

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,

            count: data.length,

            summary: {
                totalCostValue:
                    round2(totalCostValue),

                totalSellingValue:
                    round2(totalSellingValue),

                totalMrpValue:
                    round2(totalMrpValue),

                expectedProfit:
                    round2(
                        totalSellingValue -
                        totalCostValue
                    )
            },

            data
        });

    } catch (err) {

        console.error(
            "getStockValue error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getproductsearchstock = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { search } = req.query;

        if (!search || search.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search is required"
            });
        }

        const searchText = search.trim();

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                {
                    name: {
                        $regex: searchText,
                        $options: "i"
                    }
                },
                {
                    itemCode: {
                        $regex: searchText,
                        $options: "i"
                    }
                }
            ]
        }).lean();


        const productIds = products.map(
            product => product._id
        );

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId,
            $or: [
                { productId: { $in: productIds } },
                { code: { $regex: searchText, $options: "i" } }
            ]
        })
            .populate(
                "productId",
                "name itemCode stock unit unitValue mrp costPrice sellingPrice gstRate"
            )

            .sort({ createdAt: -1 })
            .lean();

        const data = [];

        const barcodeMap = new Map();


        for (const barcode of barcodes) {

            if (!barcode.productId) continue;

            const productId =
                String(barcode.productId._id);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId =
                String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const currentStock = Number(barcode.availableQty || 0);
                    const barcodeQty = Number(barcode.qty || 0);

                    const costPrice = Number(barcode.costPrice || product.costPrice || 0);
                    const stockValue = Number((currentStock * costPrice).toFixed(2));

                    data.push({
                        productId: product._id,
                        itemCode: product.itemCode || "",
                        productName: product.name || "",


                        barcode: barcode.code,

                        currentStock,
                        productStock: Number(product.stock || 0),
                        barcodeStock: currentStock,
                        barcodeQty,

                        soldQty: Math.max(
                            Number((barcodeQty - currentStock).toFixed(2)),
                            0
                        ),

                        mrp: barcode.mrp || product.mrp || 0,

                        costPrice,
                        stockValue,

                        sellingPrice: barcode.sellingPrice || product.sellingPrice || 0,

                        gstRate: barcode.gstRate || product.gstRate || 0,

                        unit: barcode.unit || product.unit || "pcs",
                        unitValue: barcode.unitValue || product.unitValue || 1,

                        displayName: `${barcode.unitValue || product.unitValue || 1} ${barcode.unit || product.unit || "pcs"} ${product.name}`,

                        status:
                            currentStock <= 0
                                ? "Out Of Stock"
                                : currentStock <= 10
                                    ? "Low Stock"
                                    : "Available"
                    });
                }
            }

            else {

                const currentStock = Number(
                    Number(
                        product.stock || 0
                    ).toFixed(2)
                );

                const costPrice = Number(
                    product.costPrice || 0
                );

                const sellingPrice = Number(
                    product.sellingPrice || 0
                );

                const mrp = Number(
                    product.mrp || 0
                );

                const gstRate = Number(
                    product.gstRate || 0
                );

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                const stockValue = Number(
                    (
                        currentStock *
                        costPrice
                    ).toFixed(2)
                );

                data.push({

                    productId:
                        product._id,

                    itemCode:
                        product.itemCode || "",

                    productName:
                        product.name || "",

                  
                    barcode: null,

                    currentStock,

                    productStock:
                        currentStock,

                    barcodeStock: 0,

                    barcodeQty: 0,

                    soldQty: 0,

                    mrp,

                    costPrice,

                    stockValue,

                    sellingPrice,

                    gstRate,

                    unit,

                    unitValue,

                    displayName:
                        `${unitValue} ${unit} ${product.name}`,

                    status:
                        currentStock <= 0
                            ? "Out Of Stock"
                            : currentStock <= 10
                                ? "Low Stock"
                                : "Available"
                });
            }
        }

       
        const existingBarcodeIds = new Set(
            data
                .filter(item => item.barcode)
                .map(item => String(item.barcode))
        );

        for (const barcode of barcodes) {

            if (!barcode.productId) continue;

            if (
                !barcode.code
                    .toLowerCase()
                    .includes(
                        searchText.toLowerCase()
                    )
            ) {
                continue;
            }

            if (
                existingBarcodeIds.has(
                    String(barcode.code)
                )
            ) {
                continue;
            }

            const product =
                barcode.productId;

            const currentStock = Number(
                Number(
                    barcode.availableQty || 0
                ).toFixed(2)
            );

            const barcodeQty = Number(
                Number(
                    barcode.qty || 0
                ).toFixed(2)
            );

            const costPrice = Number(
                barcode.costPrice ??
                product.costPrice ??
                0
            );

            const sellingPrice = Number(
                barcode.sellingPrice ??
                product.sellingPrice ??
                0
            );

            const mrp = Number(
                barcode.mrp ??
                product.mrp ??
                0
            );

            const gstRate = Number(
                barcode.gstRate ??
                product.gstRate ??
                0
            );

            const unit =
                barcode.unit ||
                product.unit ||
                "pcs";

            const unitValue = Number(
                barcode.unitValue ??
                product.unitValue ??
                1
            );

            const stockValue = Number(
                (
                    currentStock *
                    costPrice
                ).toFixed(2)
            );

            const soldQty = Math.max(
                Number(
                    (
                        barcodeQty -
                        currentStock
                    ).toFixed(2)
                ),
                0
            );

            data.push({

                productId:
                    product._id,

                itemCode:
                    product.itemCode || "",

                productName:
                    product.name || "",

                barcode:
                    barcode.code,

                currentStock,

                productStock:
                    Number(
                        product.stock || 0
                    ),

                barcodeStock:
                    currentStock,

                barcodeQty,

                soldQty,

                mrp,

                costPrice,

                stockValue,

                sellingPrice,

                gstRate,

                unit,

                unitValue,

                displayName:
                    `${unitValue} ${unit} ${product.name}`,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= 10
                            ? "Low Stock"
                            : "Available"
            });

            existingBarcodeIds.add(
                String(barcode.code)
            );
        }


        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (err) {

        console.error(
            "getproductsearchstock error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

exports.productStockById = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product id is required"
            });
        }

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

        const barcodes = await Barcode.find({
            productId,
            superAdminId: hierarchy.superAdminId
        }).sort({ createdAt: -1 });

        let totalQty = 0;
        let currentStock = 0;
        let totalCostValue = 0;
        let totalSellingValue = 0;

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        for (const barcode of barcodes) {
            const barcodeQty = Number(barcode.qty || 0);
            const availableQty = Number(barcode.availableQty || 0);

            const unit = barcode.unit || product.unit || "pcs";
            const unitValue = Number(barcode.unitValue || product.unitValue || 1);

            totalQty += barcodeQty;
            currentStock += availableQty;

            totalCostValue += availableQty * Number(barcode.costPrice || product.costPrice || 0);
            totalSellingValue += availableQty * Number(barcode.sellingPrice || product.sellingPrice || 0);

            let totalStockText = "";

            if (unit === "kg") {
                totalStockText = `${formatQty(availableQty * unitValue)} kg`;
            } else if (unit === "g") {
                totalStockText = `${formatQty((availableQty * unitValue) / 1000)} kg`;
            } else {
                totalStockText = `${formatQty(availableQty)} pcs`;
            }

            data.push({
                productId: product._id,
                productName: product.name,
                itemCode: product.itemCode || "",

                barcode: barcode.code,

                totalQty: barcodeQty,
                currentStock: availableQty,
                soldQty: Math.max(Number((barcodeQty - availableQty).toFixed(2)), 0),

                stockValue: Number(
                    (
                        availableQty *
                        Number(barcode.costPrice || product.costPrice || 0)
                    ).toFixed(2)
                ),

                totalStockText,

                mrp: barcode.mrp || product.mrp || 0,
                costPrice: barcode.costPrice || product.costPrice || 0,
                sellingPrice: barcode.sellingPrice || product.sellingPrice || 0,

                gstRate: barcode.gstRate || product.gstRate || 0,

                unit,
                unitValue,
                unitText: `${unitValue} ${unit}`,

                status:
                    availableQty <= 0
                        ? "Out Of Stock"
                        : availableQty <= 10
                            ? "Low Stock"
                            : "Available"
            });
        }

        let productTotalStockText = "";

        if (product.unit === "kg") {
            productTotalStockText = `${formatQty(currentStock * Number(product.unitValue || 1))} kg`;
        } else if (product.unit === "g") {
            productTotalStockText = `${formatQty((currentStock * Number(product.unitValue || 1)) / 1000)} kg`;
        } else {
            productTotalStockText = `${formatQty(currentStock)} pcs`;
        }

        return res.status(200).json({
            success: true,
            product: {
                productId: product._id,
                productName: product.name,
                itemCode: product.itemCode || "",

                unit: product.unit || "pcs",
                unitValue: product.unitValue || 1,

                currentStock: Number(currentStock.toFixed(2)),
                totalStock: productTotalStockText,

                gstRate: product.gstRate || 0,

                status:
                    currentStock <= 0
                        ? "Out Of Stock"
                        : currentStock <= 10
                            ? "Low Stock"
                            : "Available"
            },
            summary: {
                totalQty: Number(totalQty.toFixed(2)),
                currentStock: Number(currentStock.toFixed(2)),
                soldQty: Math.max(Number((totalQty - currentStock).toFixed(2)), 0),
                totalCostValue: Number(totalCostValue.toFixed(2)),
                totalSellingValue: Number(totalSellingValue.toFixed(2)),
                expectedProfit: Number((totalSellingValue - totalCostValue).toFixed(2))
            },
            count: data.length,
            data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.getTopSellingProducts = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);
        const limit = Math.max(1, Number(req.query.limit || 10));

        const result = await Bill.aggregate([
            {
                $match: {
                    superAdminId: hierarchy.superAdminId
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        productId: "$items.productId",
                        barcode: "$items.barcode"
                    },
                    productNameFromBill: { $first: "$items.productName" },
                    nameFromBill: { $first: "$items.name" },
                    barcode: { $first: "$items.barcode" },
                    totalQtySold: { $sum: "$items.qty" },
                    totalSalesAmount: { $sum: "$items.finalPrice" },
                    totalGST: { $sum: "$items.gstAmount" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "barcodes",
                    let: {
                        productId: "$_id.productId",
                        barcodeCode: "$_id.barcode",
                        superAdminId: hierarchy.superAdminId
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$productId", "$$productId"] },
                                        { $eq: ["$code", "$$barcodeCode"] },
                                        { $eq: ["$superAdminId", "$$superAdminId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "barcodeData"
                }
            },
            {
                $unwind: {
                    path: "$barcodeData",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: {
                    totalQtySold: -1
                }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    _id: 0,
                    productId: "$_id.productId",

                    productName: {
                        $ifNull: [
                            "$productNameFromBill",
                            {
                                $ifNull: [
                                    "$nameFromBill",
                                    "$product.name"
                                ]
                            }
                        ]
                    },

                    barcode: "$_id.barcode",

                    gstRate: {
                        $ifNull: [
                            "$barcodeData.gstRate",
                            "$product.gstRate"
                        ]
                    },

                    currentStock: {
                        $ifNull: ["$barcodeData.availableQty", "$product.stock"]
                    },

                    barcodeStock: {
                        $ifNull: ["$barcodeData.availableQty", 0]
                    },

                    productStock: {
                        $ifNull: ["$product.stock", 0]
                    },

                    unit: {
                        $ifNull: ["$barcodeData.unit", "$product.unit"]
                    },

                    unitValue: {
                        $ifNull: ["$barcodeData.unitValue", "$product.unitValue"]
                    },

                    totalQtySold: 1,
                    totalSalesAmount: { $round: ["$totalSalesAmount", 2] },
                    totalGST: { $round: ["$totalGST", 2] }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            message: "Top selling products fetched successfully",
            data: result
        });

    } catch (error) {
        console.error("TOP SELLING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.lowstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();



        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        let totalLowStockQty = 0;
        let totalStockValue = 0;

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);
            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

        const barcodeMap = new Map();

        for (const barcode of barcodes) {

            const productId =
                String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }



        for (const product of products) {

            const productId =
                String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];

            const lowStockQty = Number(
                product.lowStockQty || 10
            );



            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const qty = Number(
                        Number(
                            barcode.availableQty || 0
                        ).toFixed(2)
                    );


                    if (
                        qty <= 0 ||
                        qty > lowStockQty
                    ) {
                        continue;
                    }

                    const costPrice = Number(
                        barcode.costPrice ??
                        product.costPrice ??
                        0
                    );

                    const mrp = Number(
                        barcode.mrp ??
                        product.mrp ??
                        0
                    );

                    const sellingPrice = Number(
                        barcode.sellingPrice ??
                        product.sellingPrice ??
                        0
                    );

                    const stockValue = Number(
                        (
                            qty *
                            costPrice
                        ).toFixed(2)
                    );

                    const unit =
                        barcode.unit ||
                        product.unit ||
                        "pcs";

                    const unitValue = Number(
                        barcode.unitValue ??
                        product.unitValue ??
                        1
                    );

                    let totalUnitText = "";

                    if (unit === "kg") {

                        totalUnitText =
                            `${formatQty(
                                qty * unitValue
                            )} kg`;

                    } else if (unit === "g") {

                        totalUnitText =
                            `${formatQty(
                                (qty * unitValue) / 1000
                            )} kg`;

                    } else {

                        totalUnitText =
                            `${formatQty(qty)} pcs`;
                    }

                    totalLowStockQty += qty;
                    totalStockValue += stockValue;

                    data.push({
                        productId: barcode.productId?._id || "",
                        productName: barcode.productId?.name || "",
                        itemCode: barcode.productId?.itemCode || "",
                        barcode: barcode.code || "",

                        currentStock: qty,
                        lowStockQty,
                        totalProductStock: Number(barcode.productId?.stock || 0),

                        unit,
                        unitValue,
                        totalUnitText,

                        mrp: barcode.mrp || 0,
                        costPrice: barcode.costPrice || 0,
                        sellingPrice: barcode.sellingPrice || 0,

                        stockValue: Number(stockValue.toFixed(2)),

                        gstRate: Number(
                            barcode.gstRate ||
                            barcode.productId?.gstRate ||
                            0
                        ),

                        status: "Low Stock"
                    });
                }
            }

           

            else {

                const qty = Number(
                    Number(
                        product.stock || 0
                    ).toFixed(2)
                );

                
                if (
                    qty <= 0 ||
                    qty > lowStockQty
                ) {
                    continue;
                }

                const costPrice = Number(
                    product.costPrice || 0
                );

                const mrp = Number(
                    product.mrp || 0
                );

                const sellingPrice = Number(
                    product.sellingPrice || 0
                );

                const stockValue = Number(
                    (
                        qty *
                        costPrice
                    ).toFixed(2)
                );

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let totalUnitText = "";

                if (unit === "kg") {

                    totalUnitText =
                        `${formatQty(
                            qty * unitValue
                        )} kg`;

                } else if (unit === "g") {

                    totalUnitText =
                        `${formatQty(
                            (qty * unitValue) / 1000
                        )} kg`;

                } else {

                    totalUnitText =
                        `${formatQty(qty)} pcs`;
                }

                totalLowStockQty += qty;
                totalStockValue += stockValue;

                data.push({

                    productId:
                        product._id,

                    productName:
                        product.name || "",

                    itemCode:
                        product.itemCode || "",

                   
                    barcode: null,

                    currentStock:
                        qty,

                    lowStockQty,

                    totalProductStock:
                        qty,

                    unit,

                    unitValue,

                    totalUnitText,

                    mrp,

                    costPrice,

                    sellingPrice,

                    stockValue,

                    gstRate:
                        Number(
                            product.gstRate || 0
                        ),

                    status:
                        "Low Stock"
                });
            }
        }

      

        data.sort((a, b) => {
            return (
                Number(a.currentStock) -
                Number(b.currentStock)
            );
        });

        

        data.forEach((item, index) => {
            item.sno = index + 1;
        });

        return res.status(200).json({

            success: true,

            summary: {
                totalLowStockProducts:
                    data.length,

                totalLowStockQty:
                    Number(
                        totalLowStockQty.toFixed(2)
                    ),

                totalStockValue:
                    Number(
                        totalStockValue.toFixed(2)
                    )
            },

            count: data.length,

            data
        });

    } catch (err) {

        console.error(
            "lowstockcheck error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


exports.outofstockcheck = async (req, res) => {
    try {
        const hierarchy = attachHierarchy(req.user);

       

        const products = await Product.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        

        const barcodes = await Barcode.find({
            superAdminId: hierarchy.superAdminId
        }).lean();

        const data = [];

        const formatQty = (value) => {
            const num = Number(value || 0);

            return Number.isInteger(num)
                ? String(num)
                : String(Number(num.toFixed(2)));
        };

       

        const barcodeMap = new Map();

        for (const barcode of barcodes) {

            const productId =
                String(barcode.productId);

            if (!barcodeMap.has(productId)) {
                barcodeMap.set(productId, []);
            }

            barcodeMap.get(productId).push(barcode);
        }

       

        for (const product of products) {

            const productId =
                String(product._id);

            const productBarcodes =
                barcodeMap.get(productId) || [];


            if (productBarcodes.length > 0) {

                for (const barcode of productBarcodes) {

                    const qty = Number(
                        Number(
                            barcode.availableQty || 0
                        ).toFixed(2)
                    );

                    
                    if (qty > 0) {
                        continue;
                    }

                    const unit =
                        barcode.unit ||
                        product.unit ||
                        "pcs";

                    const unitValue = Number(
                        barcode.unitValue ??
                        product.unitValue ??
                        1
                    );

                    let totalUnitText = "";

                    if (unit === "kg") {

                        totalUnitText =
                            `${formatQty(
                                qty * unitValue
                            )} kg`;

                    } else if (unit === "g") {

                        totalUnitText =
                            `${formatQty(
                                (qty * unitValue) / 1000
                            )} kg`;

                    } else {

                        totalUnitText =
                            `${formatQty(qty)} pcs`;
                    }

                    data.push({

                        productId:
                            product._id,

                        productName:
                            product.name || "",

                        itemCode:
                            product.itemCode || "",

                        barcode:
                            barcode.code || "",

                        currentStock:
                            qty,

                        totalProductStock:
                            Number(
                                product.stock || 0
                            ),

                        unit,

                        unitValue,

                        totalUnitText,

                        mrp:
                            Number(
                                barcode.mrp ??
                                product.mrp ??
                                0
                            ),

                        costPrice:
                            Number(
                                barcode.costPrice ??
                                product.costPrice ??
                                0
                            ),

                        sellingPrice:
                            Number(
                                barcode.sellingPrice ??
                                product.sellingPrice ??
                                0
                            ),

                        gstRate:
                            Number(
                                barcode.gstRate ??
                                product.gstRate ??
                                0
                            ),

                        status:
                            "Out Of Stock"
                    });
                }
            }

           

            else {

                const qty = Number(
                    Number(
                        product.stock || 0
                    ).toFixed(2)
                );

               
                if (qty > 0) {
                    continue;
                }

                const unit =
                    product.unit || "pcs";

                const unitValue = Number(
                    product.unitValue || 1
                );

                let totalUnitText = "";

                if (unit === "kg") {

                    totalUnitText =
                        `${formatQty(
                            qty * unitValue
                        )} kg`;

                } else if (unit === "g") {

                    totalUnitText =
                        `${formatQty(
                            (qty * unitValue) / 1000
                        )} kg`;

                } else {

                    totalUnitText =
                        `${formatQty(qty)} pcs`;
                }

                data.push({

                    productId:
                        product._id,

                    productName:
                        product.name || "",

                    itemCode:
                        product.itemCode || "",

                   
                    barcode: null,

                    currentStock:
                        qty,

                    totalProductStock:
                        qty,

                    unit,

                    unitValue,

                    totalUnitText,

                    mrp:
                        Number(
                            product.mrp || 0
                        ),

                    costPrice:
                        Number(
                            product.costPrice || 0
                        ),

                    sellingPrice:
                        Number(
                            product.sellingPrice || 0
                        ),

                    gstRate:
                        Number(
                            product.gstRate || 0
                        ),

                    status:
                        "Out Of Stock"
                });
            }
        }

       

        data.sort((a, b) => {
            return String(b.productId).localeCompare(
                String(a.productId)
            );
        });

        

        data.forEach((item, index) => {
            item.sno = index + 1;
        });

        return res.status(200).json({

            success: true,

            summary: {
                totalOutOfStockProducts:
                    data.length
            },

            count:
                data.length,

            data
        });

    } catch (err) {

        console.error(
            "outofstockcheck error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};