import { useState, useEffect, useRef } from "react";
import styles from "./CreatePurchase.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import PurchaseItemsTable from "./PurchaseItemsTable";
import { useNavigate, useLocation } from "react-router-dom";
import PurchaseTopBar from "./PurchaseTopBar";
import PurchaseFooter from "./PurchaseFooter";
import PurchaseHeader from "./PurchaseHeader";


function CreatePurchase() {
  const emptyItem = {
    productId: "",
    hsnCode: "",
    barcode: "",
    mrp: "",
    qty: "",
    freeQty: "",
    netcost: "",
    costPrice: "",
    sellingPrice: "",
    discount: "",
    description: "",
  };

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
    paidAmount: "",
    notes: "",
  });

  const [billItems, setBillItems] = useState(
    Array.from({ length: 300 }, () => ({ ...emptyItem }))
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showItemModal, setShowItemModal] = useState(false);
  const scanInputRef = useRef(null);

  const fileInputRef = useRef(null);

  const [itemSearch, setItemSearch] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const supplierId = location.state?.supplierId;
  const token = localStorage.getItem("token");

  const [purchaseTotals, setPurchaseTotals] = useState({
    totalAmount: 0,
    totalGrossAmount: 0,
    totalTaxAmount: 0,
    itemsTotal: 0,

    cgst: 0,
    sgst: 0,

    freightCharge: 0,
    packagingCharge: 0,
    billDiscountAmount: 0,
    supplierBillAmount: 0,
    balanceAmount: 0,
  });



  useEffect(() => {
    fetchSuppliers();
  }, []);


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
        itemsTotal: 0,
        cgst: 0,
        sgst: 0,
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
        totalAmount: Number(
          data.data.totalAmount ??
          data.data.supplierBillAmount ??
          0
        ),

        totalGrossAmount: Number(
          data.data.totalGrossAmount ??
          data.data.grossAmount ??
          0
        ),

        totalTaxAmount: Number(
          data.data.totalTaxAmount ??
          data.data.taxAmount ??
          0
        ),

        itemsTotal: Number(
          data.data.itemsTotal ??
          data.data.grnAmount ??
          data.data.subTotal ??
          data.data.subtotal ??
          0
        ),

        cgst: Number(
          data.data.cgst ??
          data.data.cgstAmount ??
          data.data.totalCgst ??
          data.data.totalCGST ??
          0
        ),

        sgst: Number(
          data.data.sgst ??
          data.data.sgstAmount ??
          data.data.totalSgst ??
          data.data.totalSGST ??
          0
        ),

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


  const handleSubmit = async () => {
    if (!form.supplierId) return showToast("Select supplier", "error");

    const validItems = billItems.filter((i) => i.productId);

    if (validItems.length === 0) {
      return showToast("Add at least one item", "error");
    }

    try {
      setLoading(true);

      const payload = {
        supplierId: form.supplierId,
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
            : {},
        paidAmount: String(form.paidAmount || 0),

        items: validItems.map((item) => ({
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



  const handleUploadImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setLoading(true);

      // ----------------------------
      // STEP 1 : OCR
      // ----------------------------
      const formData = new FormData();
      formData.append("billImage", file);

      const ocrRes = await fetch(
        "https://hibuz-general-billing.onrender.com/api/ocr/scan-purchase-bill",
        {
          method: "POST",
          body: formData,
        }
      );

      const ocrData = await ocrRes.json();

      if (!ocrData.success) {
        throw new Error("OCR failed");
      }

      // ----------------------------
      // STEP 2 : Parse OCR
      // ----------------------------
      const parseRes = await fetch(
        "https://hibuz-general-billing.onrender.com/api/ocr/scan-and-parse-purchase-bill",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rawText: ocrData.rawText,
          }),
        }
      );

      const parsed = await parseRes.json();

      console.log(parsed);

      // we'll use this response next
    } catch (err) {
      console.log(err);
      showToast("Failed to scan purchase bill", "error");
    } finally {
      setLoading(false);

      e.target.value = "";
    }
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} />

      {/* Hidden Image Input */}
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />

      <div className={styles.page}>
        {/* TOP BAR */}
        <PurchaseTopBar
          navigate={navigate}
          handleUploadImage={handleUploadImage}
          handleSubmit={handleSubmit}
          loading={loading}
        />


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
          <PurchaseHeader
            suppliers={suppliers}
            form={form}
            setForm={setForm}
            handleChange={handleChange}
            purchaseTotals={purchaseTotals}
          />

          {/* ITEMS TABLE */}
          <PurchaseItemsTable
            billItems={billItems}
            setBillItems={setBillItems}
            emptyItem={emptyItem}
            calculatePurchase={calculatePurchase}
            token={token}
          />
        </div>
        <PurchaseFooter
          purchaseTotals={purchaseTotals}
          form={form}
          handleChange={handleChange}
          setForm={setForm}
        />
      </div>
    </>
  );
}

export default CreatePurchase;