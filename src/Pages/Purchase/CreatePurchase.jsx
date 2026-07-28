import { useState, useEffect, useRef } from "react";
import AppBar from "../../components/AppBar/AppBar";
import Select from "react-select";
import { FiTrash2, FiPlus, FiSave, FiArrowLeft, FiSearch, FiGrid } from "react-icons/fi";
import styles from "./CreatePurchase.module.css";
import AddItemsModal from "./AddItemsModal";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import { useNavigate, useLocation } from "react-router-dom";

function CreatePurchase() {
  const emptyItem = {
    productId: "",
    productName: "",
    itemCode: "",
    hsnCode: "",
    barcode: "",

    categoryId: "",
    gstRate: "",

    mrp: "",
    qty: "",
    freeQty: "",

    netcost: "",
    costPrice: "",
    sellingPrice: "",

    discount: "",
    discountPercent: "",
    discountAmount: "",

    description: "",
    tax: "",
    stock: "",

    unit: localStorage.getItem("defaultUnit") || "pcs",
    unitValue: "",

    lowStockQty: "",
  };
  const [lang, setLang] = useState(
    localStorage.getItem("lang") || "en"
  );

  const addDays = (dateValue, days) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);

    return date.toISOString().split("T")[0];
  };

  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return "";
    const [year, month, day] = dateValue.split("-");
    return `${day}.${month}.${year}`;
  };


  const today = new Date().toISOString().split("T")[0];

  const [supplierDetails, setSupplierDetails] = useState({
    number: "",
    address: "",
    gstNumber: "",

  });

  const [form, setForm] = useState({
    supplierId: "",
    invoiceNo: "",
    invoiceDate: today,
    grnDate: today,
    invoiceAmount: "",
    dueDate: addDays(today, 7),
    supplierBillAmount: "",
    billDiscountPercent: "",
    freightCharge: "",
    packagingCharge: "",
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

  const [billItems, setBillItems] = useState(
    Array.from({ length: 300 }, () => ({ ...emptyItem }))
  );
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showItemModal, setShowItemModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const scanInputRef = useRef(null);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierList, setShowSupplierList] = useState(false);
  const [rowSearches, setRowSearches] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const itemInputRefs = useRef([]);

  const filteredSuppliers = suppliers.filter((s) =>
    (s.supplierName || "")
      .toLowerCase()
      .includes(supplierSearch.toLowerCase())
  );



  const handleQtyChange = (id, delta) => {
    setSelectedItems(prev => {
      const current = prev[id]?.qty || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [id]: { qty: newQty } };
    });
  };

  const handleAddToBill = () => {
    const selected = scannedItems.map(item => ({
      ...item,
      stock: item.stock,
      qty: selectedItems[item.productId]?.qty || 1,
      freeQty: 0,
      netcost: item.netcost || item.costPrice || 0,
    }));

    handleAddItems(selected);
    setShowBarcodeModal(false);
    setScannedItems([]);
    setSelectedItems({});
  };

  const navigate = useNavigate();
  const location = useLocation();
  const supplierId = location.state?.supplierId;
  const token = localStorage.getItem("token");

  const [scannedItems, setScannedItems] = useState([]);
  const [purchaseTotals, setPurchaseTotals] = useState({
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


  const balanceAmount =
    Number(purchaseTotals.totalAmount || 0) - Number(form.paidAmount || 0);


  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);


  const openAddItemModal = async () => {
    setProductsLoading(true);

    await fetchProducts();

    setShowItemModal(true);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(API.suppliers, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuppliers(data.data || []);

      const supplierList = data.data || [];
      setSuppliers(supplierList);

      if (supplierId) {
        setForm((prev) => ({
          ...prev,
          supplierId,
        }));
      }
    } catch {
      showToast("Failed to load suppliers", "error");
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);

      const res = await fetch(API.products, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setProducts(data.data || []);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setProductsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: value,
      };

      if (name === "grnDate") {
        updatedForm.dueDate = addDays(value, 7);
      }

      if (
        name === "freightCharge" ||
        name === "packagingCharge" ||
        name === "billDiscountPercent"
      ) {
        setTimeout(() => {
          calculatePurchase(billItems, updatedForm);
        }, 0);
      }

      return updatedForm;
    });
  };

  const round2 = (num) =>
    Math.round((Number(num) + Number.EPSILON) * 100) / 100;

  const calculateNewItemLocal = (item) => {
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

  const calculateNewPurchaseTotals = (
    items,
    currentForm = form
  ) => {
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

  const getProductOptions = () =>
    products.map((p) => ({ value: p._id, label: p.name, product: p }));

  const updateItem = async (index, field, value) => {
    let updated = [...billItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "netcost") {
      updated[index].purchasePrice = value;
      updated[index].costPrice = value;
      updated[index].originalNetcost = value;
    }

    // Don't allow negative values
    if (
      [
        "qty",
        "freeQty",
        "discountPercent",
        "discountAmount",
        "netcost",
        "mrp",
        "sellingPrice",
        "tax",
      ].includes(field) &&
      value !== "" &&
      Number(value) < 0
    ) {
      return;
    }

    // Save typed value first
    setBillItems(updated);

    // ---------------------------------
    // NEW INLINE PRODUCT
    // ---------------------------------
    if (
      !updated[index].productId &&
      String(updated[index].productName || "").trim()
    ) {
      const calculatedItem = calculateNewItemLocal(
        updated[index]
      );

      updated[index] = calculatedItem;

      console.log(
        "NEW ITEM CALCULATED:",
        calculatedItem
      );

      setBillItems(updated);

      calculateNewPurchaseTotals(updated, form);

      return;
    }

    // ---------------------------------
    // EXISTING PRODUCT
    // ---------------------------------
    if (updated[index].productId) {
      try {
        await calculatePurchase(updated, form);
      } catch (error) {
        console.error(
          "Existing product calculation error:",
          error
        );

        showToast(
          "Unable to calculate item",
          "error"
        );
      }
    }
  };

  const calculatePurchase = async (items = billItems, currentForm = form) => {
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

  const handleAddItems = async (newItems) => {
    const normalizedItems = newItems.map((item) => ({
      ...emptyItem,
      ...item,
      productId: item.productId || item._id,
      productName: item.productName || item.name || "",
      qty: Number(item.qty || 1),
      freeQty: Number(item.freeQty || 0),
      purchasePrice: Number(item.costPrice || item.purchasePrice || item.netcost || 0),
      costPrice: Number(item.costPrice || item.purchasePrice || item.netcost || 0),
      netcost: Number(item.netcost || item.costPrice || item.purchasePrice || 0),
      rate: Number(item.rate || item.costPrice || item.purchasePrice || 0),
      mrp: Number(item.mrp || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      tax: Number(item.tax || item.gstRate || 0),
    }));

    const updated = [...billItems];
    let cursor = getNextEmptyRowIndex();

    normalizedItems.forEach((item) => {
      updated[cursor] = item;
      cursor += 1;
    });

    await calculatePurchase(updated);
  };

  const handleBarcodeSearch = async (barcode) => {
    console.log("================================");
    console.log("handleBarcodeSearch called");
    console.log("Received Barcode:", barcode);
    console.log("Barcode Length:", barcode?.length);
    console.log("API URL:", API.scanProduct(barcode));
    console.log("================================");

    if (!barcode.trim()) {
      console.log("Barcode is empty");
      return;
    }

    try {
      console.log("Calling API...");

      const res = await fetch(API.scanProduct(barcode), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response Status:", res.status);

      const data = await res.json();

      console.log("API Response:", data);

      if (data.success) {
        console.log("Product Found");
        console.log("Product Name:", data.data.productName);
        console.log("Product ID:", data.data.productId);
        console.log("Barcode:", data.data.barcode);

        if (
          scannedItems.some(
            (item) => item.barcode === data.data.barcode
          )
        ) {
          console.log("Duplicate product scanned");
          return;
        }

        console.log("Adding product to scannedItems");

        setScannedItems((prev) => [...prev, data.data]);

        setSelectedItems((prev) => ({
          ...prev,
          [data.data.productId]: { qty: 1 },
        }));

        console.log("Product added successfully");

        setItemSearch("");
      } else {
        console.log("API returned success=false");
      }
    } catch (err) {
      console.error("Barcode Search Error:", err);
      showToast("Barcode not found", "error");
    }
  };

  useEffect(() => {
    console.log("Scanned Items Updated");
    console.table(scannedItems);
  }, [scannedItems]);

  const removeRow = async (index) => {
    const updated = [...billItems];

    updated[index] = { ...emptyItem };

    setBillItems(updated);

    await calculatePurchase(updated);

    setRowSearches((prev) => ({
      ...prev,
      [index]: "",
    }));

    setRowSearchResults((prev) => ({
      ...prev,
      [index]: [],
    }));
  };

  const selectedSupplier = suppliers.find(
    (s) =>
      String(s._id || s.id) === String(form.supplierId)
  );

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: (
      <div>
        <div style={{ fontWeight: 600 }}>{s.supplierName}</div>
        <div style={{ fontSize: 11, color: "#888" }}>
          {s.gstNumber || "No GST"} • {s.address || "No address"}
        </div>
      </div>
    ),
    supplier: s,
  }));

  const createInlineProduct = async (item) => {
    const productPayload = {
      name: String(item.productName || "").trim(),

      categoryId: item.categoryId || "",

      hsnCode: item.hsnCode || "",

      gstRate: Number(
        item.tax || item.gstRate || 0
      ),

      lowStockQty: Number(item.lowStockQty || 0),

      mrp: Number(item.mrp || 0),

      costPrice: Number(
        item.originalNetcost ||
        item.netcost ||
        item.costPrice ||
        0
      ),

      sellingPrice: Number(item.sellingPrice || 0),

      unit:
        item.unit ||
        localStorage.getItem("defaultUnit") ||
        "pcs",

      unitValue: Number(item.unitValue || 1),

      productType: "normal",

      barcode: item.barcode || "",

      description: item.description || "",
    };

    console.log(
      "INLINE CREATE PRODUCT PAYLOAD:",
      productPayload
    );

    const res = await fetch(API.createProduct, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productPayload),
    });

    const data = await res.json();

    console.log(
      "INLINE CREATE PRODUCT RESPONSE:",
      data
    );

    if (!res.ok || !data.success) {
      throw new Error(
        data.message ||
        `Failed to create ${item.productName}`
      );
    }

    // IMPORTANT:
    // create-product API returns actual product inside data.data.product
    const createdProduct =
      data.data?.product ||
      data.data?.createdProduct ||
      data.data;

    const productId =
      createdProduct?._id ||
      createdProduct?.productId ||
      data.data?.productId ||
      data.productId;

    console.log("CREATED PRODUCT:", createdProduct);
    console.log("CREATED PRODUCT ID:", productId);

    if (!productId) {
      console.error(
        "Created product but productId missing:",
        data
      );

      throw new Error(
        `Product created but product id not returned for ${item.productName}`
      );
    }

    return {
      ...item,

      productId: String(productId),

      productName:
        createdProduct?.name ||
        createdProduct?.productName ||
        item.productName,

      itemCode:
        createdProduct?.itemCode ||
        data.data?.barcodes?.[0]?.code ||
        item.itemCode ||
        "",

      barcode:
        createdProduct?.barcode ||
        data.data?.barcodes?.[0]?.code ||
        item.barcode ||
        "",

      hsnCode:
        createdProduct?.hsnCode ||
        item.hsnCode ||
        "",

      tax: Number(
        createdProduct?.gstRate ??
        item.tax ??
        item.gstRate ??
        0
      ),

      gstRate: Number(
        createdProduct?.gstRate ??
        item.tax ??
        item.gstRate ??
        0
      ),

      mrp: Number(
        createdProduct?.mrp ??
        item.mrp ??
        0
      ),

      costPrice: Number(
        createdProduct?.costPrice ??
        item.costPrice ??
        item.originalNetcost ??
        item.netcost ??
        0
      ),

      netcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      originalNetcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      sellingPrice: Number(
        createdProduct?.sellingPrice ??
        item.sellingPrice ??
        0
      ),

      unit:
        createdProduct?.unit ||
        item.unit ||
        "pcs",

      unitValue: Number(
        createdProduct?.unitValue ??
        item.unitValue ??
        1
      ),
    };

  };

  const createInlineSupplier = async () => {
    const supplierPayload = {
      supplierName: String(supplierSearch || "").trim(),
      mobile: String(supplierDetails.number || "").trim(),
      gstNumber: String(supplierDetails.gstNumber || "").trim(),
      address: String(supplierDetails.address || "").trim(),
      city: String(supplierDetails.city || "").trim(),
      state: String(supplierDetails.state || "").trim(),
      pincode: String(supplierDetails.pincode || "").trim(),

      panNumber: "",
      email: "",

      bankDetails: {
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        branchName: "",
      },
    };

    console.log(
      "INLINE SUPPLIER PAYLOAD:",
      supplierPayload
    );

    const res = await fetch(API.createsupplier, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(supplierPayload),
    });

    const data = await res.json();

    console.log(
      "INLINE SUPPLIER RESPONSE:",
      data
    );

    if (!res.ok || data.success === false) {
      throw new Error(
        data.message || "Failed to create supplier"
      );
    }

    // Support different possible backend response structures
    const createdSupplier =
      data.data?.supplier ||
      data.data?.createdSupplier ||
      data.supplier ||
      data.data;

    const supplierId =
      createdSupplier?._id ||
      createdSupplier?.supplierId ||
      data.data?.supplierId ||
      data.supplierId;

    console.log(
      "CREATED SUPPLIER:",
      createdSupplier
    );

    console.log(
      "CREATED SUPPLIER ID:",
      supplierId
    );

    if (!supplierId) {
      throw new Error(
        `Supplier created but supplier id not returned for ${supplierSearch}`
      );
    }

    return {
      supplierId: String(supplierId),
      supplier: createdSupplier,
    };
  };

  const handleSubmit = async () => {

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

        if (!String(supplierDetails.address || "").trim()) {
          throw new Error("Enter supplier address");
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

            address:
              createdSupplier.supplier?.address ||
              supplierDetails.address,

            gstNumber:
              createdSupplier.supplier?.gstNumber ||
              supplierDetails.gstNumber,
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
        invoiceDate: formatDateToDDMMYYYY(form.invoiceDate),
        grnDate: formatDateToDDMMYYYY(form.grnDate),
        invoiceNo: form.invoiceNo,
        invoiceAmount: Number(form.invoiceAmount || 0),
        DueDate: formatDateToDDMMYYYY(form.dueDate),
        supplierBillAmount: String(form.supplierBillAmount || 0),
        billDiscountPercent: Number(form.billDiscountPercent || 0),
        freightCharge: Number(form.freightCharge || 0),
        packagingCharge: Number(form.packagingCharge || 0),
        paymentType: form.paymentType,
        details:
          form.paymentType === "bank"
            ? {
              bankName: form.bankName,
              transactionId: form.transactionId,
            }
            : form.paymentType === "upi"
              ? {
                upiId: form.upiId,
                transactionId: form.upiTransactionId,
              }
              : form.paymentType === "card"
                ? {
                  cardType: form.cardType,
                  cardLast4: form.cardLast4,
                }
                : {},
        paidAmount: String(form.paidAmount || 0),

        items: resolvedItems.map((item) => ({
          productId: item.productId,
          freeQty: Number(item.freeQty || 0),
          qty: Number(item.qty || 0),
          unitValue: Number(item.unitValue || 1),
          netcost: Number(item.originalNetcost || item.netcost || 0),
          mrp: Number(item.mrp || 0),
          sellingPrice: Number(item.sellingPrice || 0),
        })),
      };

      const res = await fetch(API.createPurchase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Purchase failed");
      }

      showToast("Purchase created successfully", "success");

      setTimeout(() => {
        navigate("/purchase");
      }, 200);

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

  //item scan
  const handleInlineScan = async (barcode) => {
    if (!barcode.trim()) return;
    try {
      const res = await fetch(API.scanProduct(barcode), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const rowIndex = getNextEmptyRowIndex();

        const updated = [...billItems];
        updated[rowIndex] = {
          ...emptyItem,
          ...data.data,
          qty: 1,
          freeQty: 0,
        };

        await calculatePurchase(updated);
        showToast(`${data.data.productName} added`, "success");
      } else {
        showToast("Product not found", "error");
      }
    } catch {
      showToast("Scan failed", "error");
    } finally {
      setItemSearch("");
      scanInputRef.current?.focus();
    }
  };

  // auto table create 
  const getNextEmptyRowIndex = () => {
    const idx = billItems.findIndex((item) => !item.productId);
    return idx === -1 ? billItems.length : idx; // ellam full aana kadaisi-la push
  };

  const searchProductsForRow = (rowIndex, value) => {
    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));

    setActiveRowIndex(rowIndex);

    const searchValue = String(value || "")
      .trim()
      .toLowerCase();

    if (!searchValue) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));
      return;
    }

    console.log("ALL PRODUCTS:", products);
    console.log("SEARCH VALUE:", searchValue);

    const filtered = products.filter((product) => {
      const name = String(
        product.productName ||
        product.name ||
        ""
      ).toLowerCase();

      const barcode = String(
        product.barcode ||
        product.itemCode ||
        ""
      ).toLowerCase();

      const hsnCode = String(
        product.hsnCode || ""
      ).toLowerCase();

      return (
        name.includes(searchValue) ||
        barcode.includes(searchValue) ||
        hsnCode.includes(searchValue)
      );
    });

    console.log("MATCHED PRODUCTS:", filtered);

    setRowSearchResults((prev) => ({
      ...prev,
      [rowIndex]: filtered.slice(0, 20),
    }));
  };

  const selectRowProduct = async (rowIndex, product) => {
    const updated = [...billItems];

    updated[rowIndex] = {
      ...emptyItem,
      productId: product.productId || product._id,
      productName: product.productName || product.name || "",
      itemCode: product.itemCode || product.barcode || "",
      barcode: product.barcode || product.itemCode || "",
      hsnCode: product.hsnCode || "",
      mrp: Number(product.mrp || 0),
      costPrice: Number(product.costPrice || product.purchasePrice || 0),
      netcost: Number(
        product.netcost ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),
      rate: Number(
        product.rate ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),
      sellingPrice: Number(product.sellingPrice || 0),

      tax: Number(product.gstRate || product.tax || 0),

      stock: Number(
        product.stock ??
        product.currentStock ??
        product.totalQty ??
        0
      ),

      unit: product.unit || "pcs",

      qty: 1,
      freeQty: 0,
    };

    setBillItems(updated);

    setRowSearches((prev) => ({ ...prev, [rowIndex]: "" }));
    setRowSearchResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setActiveRowIndex(null);

    await calculatePurchase(updated);

    setTimeout(() => {
      itemInputRefs.current[rowIndex + 1]?.focus();
    }, 100);
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} />

      <div className={styles.page}>
        <AppBar lang={lang} setLang={setLang} />
        {/* TOP BAR */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <div className={styles.topLeft}>
              <button
                className={styles.backBtn}
                onClick={() => navigate(-1)}
              >
                <FiArrowLeft />
              </button>

              <h2>Create purchase invoice</h2>
            </div>
          </div>
          <div className={styles.topRight}>
            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={loading}
            >
              <FiSave size={14} />
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>


        {/* Inline Scanner Input */}
        <input
          ref={scanInputRef}
          autoFocus
          type="text"
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInlineScan(itemSearch);
          }}
          style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
        />

        {/* INVOICE BODY */}
        <div className={styles.invoiceBody}>
          {/* HEADER SECTION */}
          <div className={styles.headerSection}>
            <div className={styles.billFrom}>

              <div className={styles.supplierDetailsGrid}>
                <div className={styles.supplierDetailField}>
                  <label>Name</label>
                  <input
                    value={supplierSearch}
                    placeholder="Search supplier"
                    onFocus={() => setShowSupplierList(true)}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierList(true);
                      setSupplierDetails({
                        number:
                          s.phone ||
                          s.mobile ||
                          s.supplierPhone ||
                          "",

                        address:
                          s.address || "",

                        gstNumber:
                          s.gstNumber || "",

                        city:
                          s.city || "",

                        state:
                          s.state || "",

                        pincode:
                          s.pincode || "",
                      });
                      setForm((prev) => ({ ...prev, supplierId: "" }));
                    }}
                  />

                  {showSupplierList && supplierSearch && (
                    <div className={styles.supplierDropdown}>
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((s) => (
                          <div
                            key={s._id || s.id}
                            className={styles.supplierOption}
                            onClick={() => {
                              setSupplierSearch(s.supplierName || s.name || "");

                              setSupplierDetails({
                                number: "",
                                address: "",
                                gstNumber: "",
                                city: "",
                                state: "",
                                pincode: "",
                              });

                              setForm((prev) => ({
                                ...prev,
                                supplierId: s._id || s.id,
                              }));

                              setShowSupplierList(false);
                            }}
                          >
                            <div className={styles.supplierName}>
                              {s.supplierName || s.name}
                            </div>
                            <div className={styles.supplierSub}>
                              {s.phone || s.mobile || "No number"} •{" "}
                              {s.gstNumber || "No GST"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.noSupplier}>No supplier found</div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.supplierDetailField}>
                  <label>Number</label>
                  <input
                    value={supplierDetails.number}
                    readOnly={!!form.supplierId}
                    placeholder={
                      form.supplierId
                        ? ""
                        : "Enter mobile"
                    }
                    onChange={(e) =>
                      setSupplierDetails((prev) => ({
                        ...prev,
                        number: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.supplierDetailField}>
                  <label>Address</label>
                  <input
                    value={supplierDetails.address}
                    readOnly={!!form.supplierId}
                    placeholder={
                      form.supplierId
                        ? ""
                        : "Enter address"
                    }
                    onChange={(e) =>
                      setSupplierDetails((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.supplierDetailField}>
                  <label>Gst no</label>
                  <input
                    value={supplierDetails.gstNumber}
                    readOnly={!!form.supplierId}
                    placeholder={
                      form.supplierId
                        ? ""
                        : "Enter GST no"
                    }
                    onChange={(e) =>
                      setSupplierDetails((prev) => ({
                        ...prev,
                        gstNumber: e.target.value,
                      }))
                    }
                  />


                </div>
              </div>

            </div>

            <div className={styles.invoiceMeta}>
              <div className={styles.metaRow}>
                <div className={styles.metaField}>
                  <label>Purchase inv date</label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={form.invoiceDate}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.metaField}>
                  <label>Invoice Amount</label>
                  <input
                    type="text"
                    name="invoiceAmount"
                    value={form.invoiceAmount}
                    onChange={handleChange}
                    placeholder="Enter invoice amount"
                  />
                </div>


              </div>


              <div className={styles.metaRow}>
                <div className={styles.metaField}>
                  <label>Purchase inv number</label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={form.invoiceNo}
                    onChange={handleChange}
                    placeholder="INV-1235"
                  />
                </div>

                <div className={styles.metaField}>
                  <label>Grn date</label>
                  <input
                    type="date"
                    name="grnDate"
                    value={form.grnDate}
                    onChange={handleChange}
                  />
                </div>

              </div>

              <div className={styles.metaRow}>
                <div className={styles.metaField}>
                  <label>Grn amount</label>
                  <input
                    type="text"
                    value={purchaseTotals.itemsTotal.toFixed(2)}
                    readOnly
                  />
                </div>

                <div className={styles.metaField}>
                  <label>Due date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className={styles.tableSection}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th className={styles.colMrp}>No</th>
                  <th className={styles.colBarcode}>Item code</th>
                  <th className={styles.colItem}>Items</th>
                  <th className={styles.colMrp}>Dis %</th>
                  <th className={styles.colMrp}>Dis amt</th>
                  <th className={styles.colMrp}>Rate</th>
                  <th className={styles.colMrp}>GST %</th>
                  <th className={styles.colMrp}>Mrp</th>
                  <th className={styles.colMrp}>Selling</th>
                  <th className={styles.colMrp}>Roi %</th>
                  <th className={styles.colMrp}>Profit %</th>
                  <th className={styles.colMrp}>Tax amt</th>
                  <th className={styles.colMrp}>Net cost</th>
                  <th className={styles.colMrp}>Amount</th>
                  <th className={styles.colMrp}>Stock</th>
                  <th className={styles.colQty}>Qty</th>
                  <th className={styles.colQty}>Free</th>
                  <th className={styles.colAmount}>Net amount</th>
                  <th className={styles.colAction}></th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, index) => {
                  const lineTotal =
                    (Number(item.qty) || 0) * (Number(item.costPrice) || 0) -
                    (Number(item.discount) || 0);

                  return (
                    <tr key={index} className={styles.itemRow}>
                      <td className={styles.colNo}>{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          className={styles.cellInput}
                          value={item.barcode ?? item.itemCode ?? ""}
                          onChange={(e) =>
                            updateItem(index, "barcode", e.target.value)
                          }
                          placeholder=""
                        />
                      </td>
                      <td>
                        {item.productId ? (
                          item.productName || item.itemName || ""
                        ) : (
                          <div className={styles.rowSearchBox}>
                            <input
                              ref={(el) => (itemInputRefs.current[index] = el)}
                              className={styles.rowSearchInput}
                              type="text"
                              placeholder=""
                              value={rowSearches[index] ?? item.productName ?? ""}
                              onFocus={() => setActiveRowIndex(index)}
                              onChange={(e) => {
                                const value = e.target.value;

                                searchProductsForRow(index, value);

                                setBillItems((prev) => {
                                  const updated = [...prev];

                                  updated[index] = {
                                    ...updated[index],
                                    productName: value,
                                  };

                                  return updated;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const firstItem = rowSearchResults[index]?.[0];
                                  if (firstItem) selectRowProduct(index, firstItem);
                                }
                              }}
                            />

                            {activeRowIndex === index && rowSearchResults[index]?.length > 0 && (
                              <div className={styles.rowDropdown}>
                                {rowSearchResults[index].map((product) => (
                                  <div
                                    key={`${product.productId || product._id}-${product.barcode}`}
                                    className={styles.rowDropdownItem}
                                    onMouseDown={() => selectRowProduct(index, product)}
                                  >
                                    <div>
                                      <strong>{product.productName || product.name}</strong>
                                      <p>
                                        Stock:{" "}
                                        {product.stock ??
                                          product.currentStock ??
                                          product.totalQty ??
                                          0}{" "}
                                        {product.unit || "pcs"}
                                      </p>
                                    </div>
                                    <span>₹{product.costPrice || product.mrp || 0}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.discountPercent ?? ""}
                          onChange={(e) => updateItem(index, "discountPercent", e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.discountAmount ?? ""}
                          onChange={(e) => updateItem(index, "discountAmount", e.target.value)}
                        />
                      </td>

                      <td>
                        {item.rate ?? ""}
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.tax ?? ""}
                          onChange={(e) =>
                            updateItem(index, "tax", e.target.value)
                          }
                          placeholder="GST"
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.mrp ?? ""}
                          onChange={(e) => updateItem(index, "mrp", e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.sellingPrice ?? ""}
                          onChange={(e) => updateItem(index, "sellingPrice", e.target.value)}
                        />
                      </td>

                      <td>
                        {item.roiPercent !== undefined &&
                          item.roiPercent !== ""
                          ? `${item.roiPercent}%`
                          : ""}
                      </td>

                      <td>
                        {item.profitPercent !== undefined &&
                          item.profitPercent !== ""
                          ? `${item.profitPercent}%`
                          : ""}
                      </td>

                      <td>
                        {item.taxAmount !== undefined &&
                          item.taxAmount !== ""
                          ? `₹ ${item.taxAmount}`
                          : ""}
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={item.netcost ?? ""}
                          onChange={(e) => updateItem(index, "netcost", e.target.value)}
                        />
                      </td>

                      <td>
                        {item.amount !== undefined &&
                          item.amount !== ""
                          ? `₹ ${item.amount}`
                          : ""}
                      </td>

                      <td>
                        {item.productId
                          ? `${Number(item.stock || 0).toFixed(2)} ${(
                            item.unit || "pcs"
                          ).toUpperCase()}`
                          : ""}
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          min="0"
                          step="0.001"
                          value={item.qty ?? ""}
                          onChange={(e) => updateItem(index, "qty", e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          min="0"
                          value={item.freeQty ?? ""}
                          onChange={(e) => updateItem(index, "freeQty", e.target.value)}
                        />
                      </td>

                      <td>
                        {item.netAmount !== undefined &&
                          item.netAmount !== ""
                          ? `₹ ${item.netAmount}`
                          : ""}
                      </td>

                      <td className={styles.colAction}>
                        <button
                          className={styles.deleteRowBtn}
                          onClick={() => removeRow(index)}
                          type="button"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADD ITEM + SCAN BAR */}
        {/*
        <div className={styles.addItemBar}>
          <button
            className={styles.addItemBtn}
            onClick={() => setShowItemModal(true)}
            type="button"
          >
            <FiPlus size={14} />
            Add Item
          </button>
          <button
            className={styles.scanBtn}
            type="button"
            onClick={() => setShowBarcodeModal(true)}
          >
            <FiGrid size={20} />
            Scan Barcode
          </button>
        </div>
         */}
        <div className={styles.invoiceFooter}>
          <div className={styles.footerColumns}>

            {/* LEFT COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Gross amount</span>
                <strong>
                  ₹ {purchaseTotals.totalGrossAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Tax amount</span>
                <strong>
                  ₹ {purchaseTotals.totalTaxAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Items total</span>
                <strong>
                  ₹ {purchaseTotals.itemsTotal.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
            {/* TAX COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>CGST</span>
                <strong>₹ {purchaseTotals.cgst.toFixed(2)}</strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>SGST</span>
                <strong>₹ {purchaseTotals.sgst.toFixed(2)}</strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Total tax</span>
                <strong>₹ {purchaseTotals.totalTaxAmount.toFixed(2)}</strong>
              </div>
            </div>

            {/* MIDDLE COLUMN */}
            <div className={styles.footerColumn}>
              <div className={styles.footerField}>
                <span>Freight charge</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="freightCharge"
                    value={form.freightCharge}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Packaging charge</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="packagingCharge"
                    value={form.packagingCharge}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Discount %</span>
                <div className={styles.footerInput}>
                  <input
                    type="text"
                    name="billDiscountPercent"
                    value={form.billDiscountPercent}
                    onChange={handleChange}
                    placeholder="0"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.totalAmountField}`}>
                <span>Total amount</span>
                <strong>
                  ₹ {purchaseTotals.totalAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={styles.footerField}>
                <span>Amount paid</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="paidAmount"
                    value={form.paidAmount}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Payment type</span>
                <select
                  className={styles.footerSelect}
                  name="paymentType"
                  value={form.paymentType}
                  onChange={handleChange}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {form.paymentType === "bank" && (
                <>
                  <div className={styles.footerField}>
                    <span>Bank name</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="bankName"
                      value={form.bankName}
                      onChange={handleChange}
                      placeholder="State Bank of India"
                    />
                  </div>

                  <div className={styles.footerField}>
                    <span>Transaction id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="transactionId"
                      value={form.transactionId}
                      onChange={handleChange}
                      placeholder="TXN123456789"
                    />
                  </div>
                </>
              )}

              {form.paymentType === "upi" && (
                <>
                  <div className={styles.footerField}>
                    <span>UPI id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="upiId"
                      value={form.upiId}
                      onChange={handleChange}
                      placeholder="name@upi"
                    />
                  </div>

                  <div className={styles.footerField}>
                    <span>Transaction id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="upiTransactionId"
                      value={form.upiTransactionId}
                      onChange={handleChange}
                      placeholder="UPI123456789"
                    />
                  </div>
                </>
              )}

              {form.paymentType === "card" && (
                <>
                  <div className={styles.footerField}>
                    <span>Card type</span>
                    <select
                      className={styles.footerSelect}
                      name="cardType"
                      value={form.cardType}
                      onChange={handleChange}
                    >
                      <option value="">Select card</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="RuPay">RuPay</option>
                      <option value="Amex">Amex</option>
                    </select>
                  </div>

                  <div className={styles.footerField}>
                    <span>Last 4 digits</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      name="cardLast4"
                      value={form.cardLast4}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);

                        setForm((prev) => ({
                          ...prev,
                          cardLast4: value,
                        }));
                      }}
                      placeholder="1234"
                    />
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>


      {/* MODAL */}
      {showItemModal && (
        <AddItemsModal
          products={products}
          loading={productsLoading}
          onClose={() => setShowItemModal(false)}
          onAddItems={handleAddItems}
        />
      )}

      {showBarcodeModal && (
        <div className={styles.addItemsOverlay}>
          <div className={styles.addItemsModal}>
            <div className={styles.addItemsHeader}>
              <h2>Add items to bill</h2>
              <button className={styles.closeBtn} onClick={() => setShowBarcodeModal(false)}>✕</button>
            </div>

            <div className={styles.addItemsToolbar}>
              <div className={styles.searchWrapper}>
                <FiSearch className={styles.searchIcon} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Scan or Enter Barcode"
                  className={styles.searchInput}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBarcodeSearch(itemSearch);
                    }
                  }}
                />
                <FiGrid className={styles.barcodeIcon} />
              </div>
              <select className={styles.categorySelect}>
                <option value="">Select Category</option>
              </select>
              <button className={styles.createNewBtn}>Create new item</button>
            </div>

            <div className={styles.addItemsTableWrapper}>
              <table className={styles.addItemsTable}>
                <thead>
                  <tr>
                    <th>Item name</th>
                    <th>Item code</th>
                    <th>Stock</th>
                    <th>Mrp</th>
                    <th>Sales price</th>
                    <th>Purchase Price</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>Scan items to add them to your invoice</td>
                    </tr>
                  ) : (
                    scannedItems.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.productName}</td>
                        <td>{item.barcode}</td>
                        <td>
                          {item.stock != null
                            ? `${Number(item.stock).toFixed(2)} PCS`
                            : "-"}
                        </td>
                        <td>{item.mrp}</td>
                        <td>{item.sellingPrice}</td>
                        <td>{item.costPrice}</td>

                        <td>
                          <div className={styles.qtyStepper}>
                            <button onClick={() => handleQtyChange(item.productId, -1)}>−</button>
                            <span>{selectedItems[item.productId]?.qty || 1}</span>
                            <button onClick={() => handleQtyChange(item.productId, 1)}>+</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.shortcuts}>
              <span>Keyboard shortcuts :</span>
              <span>Change quantity <kbd>Enter</kbd></span>
              <span>Move between items <kbd>↑</kbd> <kbd>↓</kbd></span>
            </div>

            <div className={styles.addItemsFooter}>
              <span>{scannedItems.length} Item(s) Selected</span>
              <div>
                <button className={styles.cancelBtn} onClick={() => setShowBarcodeModal(false)}>Cancel [ESC]</button>
                <button
                  className={styles.addToBillBtn}
                  disabled={scannedItems.length === 0}
                  onClick={handleAddToBill}
                >
                  Add to bill [F7]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CreatePurchase;