import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./POSBilling.module.css";
import { API } from "../../constants/api";
import BillingPopup from "./BillingPopup";

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]}`}>
      {message}
    </div>
  );
}

function POSBilling() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [scanCode, setScanCode] = useState("");
  const [codes, setCodes] = useState([]);
  const [scannedItems, setScannedItems] = useState([]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [holdTabs, setHoldTabs] = useState([]);
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [stockList, setStockList] = useState([]);
  const [customerCity, setCustomerCity] = useState("");
  const [customerGST, setCustomerGST] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [pendingPrint, setPendingPrint] = useState(false);
  const [customerPrevBalance, setCustomerPrevBalance] = useState(0);
  const [showBillingPopup, setShowBillingPopup] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [availableLoyalty, setAvailableLoyalty] = useState(0);
  const MIN_ROWS = 5;
  const itemInputRefs = useRef([]);
  const shouldPrintRef = useRef(false);
  const [rowSearches, setRowSearches] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [showBalanceAlert, setShowBalanceAlert] = useState(false);
  const [pendingPopupPrint, setPendingPopupPrint] = useState(false);
  const [chequeDetails, setChequeDetails] = useState({
    chequeNo: "",
    chequeDate: "",
    bankName: "",
    accountHolder: "",
  });

  const [upiDetails, setUpiDetails] = useState({
    upiId: "",
    transactionId: "",
  });

  const [cardDetails, setCardDetails] = useState({
    cardType: "",
    cardLast4: "",
    approvalCode: "",
  });


  const getUnit = (item) => {
    return item?.unit ? item.unit.toUpperCase() : "";
  };

  const [previewSummary, setPreviewSummary] = useState({
    subTotal: 0,
    totalGST: 0,
    grandTotal: 0,
  });

  const scanInputRef = useRef(null);

  const getEffectivePrice = (item) => {
    const qty = item.qty || 1;
    const slabs = item.priceLevel?.slabs;
    if (item.priceLevel?.pricingType === "slab" && Array.isArray(slabs)) {
      const matched = slabs.find(
        (s) => qty >= s.minQty && (s.maxQty === null || qty <= s.maxQty)
      );
      if (matched && matched.price > 0) return matched.price;
    }
    return item.sellingPrice || item.mrp || 0;
  };

  const getStockInfo = (item) => {
    const stockItem = stockList.find(
      (s) =>
        String(s.barcode) === String(item.barcode) ||
        String(s.productId) === String(item.productId)
    );

    return {
      stock: stockItem?.currentStock ?? 0,
      text: stockItem?.currentStock ?? 0,
      status: stockItem?.status || "",
      unit: stockItem?.unit || "",
    };
  };


  const subtotal = scannedItems.reduce(
    (sum, it) => sum + getEffectivePrice(it) * (it.qty || 1),
    0
  );



  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    fetchStockList();
  }, []);

  useEffect(() => {
    if (!bill || !shouldPrintRef.current) return;

    const timer = setTimeout(() => {
      window.print();
    }, 600);

    const afterPrint = () => {
      shouldPrintRef.current = false;
      setBill(null);
      setShouldPrint(false);

      setTimeout(() => {
        itemInputRefs.current[0]?.focus();
      }, 100);
    };

    window.addEventListener("afterprint", afterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [bill]);

  useEffect(() => {
    setTimeout(() => {
      itemInputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const extraRows = 20;

  const displayRows = [
    ...scannedItems,
    ...Array(extraRows).fill(null),
  ];

  const addProductToRow = async (rowIndex, value) => {
    if (!value.trim()) return;

    try {
      const res = await fetch(`${API.scan}/${value}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Product not found");

      const stockInfo = getStockInfo(data.data);

      setScannedItems((prev) => {
        const updated = [...prev];

        updated[rowIndex] = {
          ...data.data,
          barcode: data.data.barcode || value,
          qty: 1,
          unit: data.data.unit || stockInfo.unit || "",
          stock: stockInfo.stock,
          stockText: stockInfo.text,
          stockStatus: stockInfo.status,
        };

        return updated;
      });

      setCodes((prev) => [...prev, data.data.barcode || value]);

      setRowSearches((prev) => ({
        ...prev,
        [rowIndex]: "",
      }));

      setTimeout(() => {
        itemInputRefs.current[rowIndex + 1]?.focus();
      }, 100);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const searchProductsForRow = async (rowIndex, value) => {
    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));

    setActiveRowIndex(rowIndex);

    if (!value.trim()) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));
      return;
    }

    try {
      const res = await fetch(`${API.bill}/search-product?search=${value}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setRowSearchResults((prev) => ({
          ...prev,
          [rowIndex]: data.data || [],
        }));
      }
    } catch (err) {
      console.log(err);
    }
  };

  const selectRowProduct = (rowIndex, product) => {
    const stockInfo = getStockInfo(product);

    setScannedItems((prev) => {
      const updated = [...prev];

      updated[rowIndex] = {
        productId: product.productId,
        productName: product.productName,
        brand: product.brand,
        barcode: product.barcode,
        mrp: product.mrp || 0,
        priceLevel: product.priceLevel || null,
        sellingPrice: product.sellingPrice || 0,
        flavor: product.flavor || "",
        gst: product.gst || 0,
        stock: stockInfo.stock,
        unit: stockInfo.unit,
        stockText: stockInfo.text,
        stockStatus: stockInfo.status,
        qty: 1,
      };

      return updated;
    });

    setCodes((prev) => [...prev, product.barcode]);

    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: "",
    }));

    setRowSearchResults((prev) => ({
      ...prev,
      [rowIndex]: [],
    }));

    setTimeout(() => {
      itemInputRefs.current[rowIndex + 1]?.focus();
    }, 100);
  };

  const fetchStockList = async () => {
    try {
      const res = await fetch(API.stock, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setStockList(data.data || []);
      }
    } catch (err) {
      console.log("Stock fetch error:", err);
    }
  };

  useEffect(() => {
    scanInputRef.current?.focus();

    const handleClick = (e) => {
      const tag = e.target.tagName?.toLowerCase();

      // input/select/textarea/button click panna barcode focus panna koodathu
      if (
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        tag === "button"
      ) {
        return;
      }

      scanInputRef.current?.focus();
    };

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 2500);
  };

  const addCode = async () => {
    if (!scanCode.trim()) {
      showToast("Please enter a barcode", "error");
      return;
    }
    try {
      setScanLoading(true);
      const res = await fetch(`${API.scan}/${scanCode}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Scan failed");

      setCodes((prev) => [...prev, scanCode.trim()]);

      setScannedItems((prev) => {
        const existing = prev.find((it) => it.barcode === scanCode.trim());
        if (existing) {
          return prev.map((it) =>
            it.barcode === scanCode.trim()
              ? { ...it, qty: (it.qty || 1) + 1 }
              : it
          );
        }
        return [
          ...prev,
          {
            ...data.data,
            barcode: scanCode.trim(),
            qty: 1,
            unit: data.data.unit || "",
            stock: data.data.totalAvailableQty ?? data.data.availableQty ?? 0,
          },
        ];
      });

      setScanCode("");
      showToast("Item added", "success");
      scanInputRef.current?.focus();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setScanLoading(false);
    }
  };

  const updateQty = (barcode, val) => {
    const onlyNumber = val.replace(/\D/g, "");

    setScannedItems((prev) =>
      prev.map((it) =>
        String(it.barcode) === String(barcode)
          ? { ...it, qty: onlyNumber }
          : it
      )
    );

    setCodes((prev) => {
      const qty = Number(onlyNumber || 0);
      const filtered = prev.filter((c) => String(c) !== String(barcode));
      return qty > 0 ? [...filtered, ...Array(qty).fill(barcode)] : filtered;
    });
  };

  const removeItem = (barcode) => {
    setScannedItems((prev) => prev.filter((it) => it.barcode !== barcode));
    setCodes((prev) => prev.filter((c) => c !== barcode));
    showToast("Item removed", "success");
  };

  // customer bill

  const searchCustomersForBill = async (value) => {
    if (!value.trim()) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const res = await fetch(`${API.customerSearch}?q=${value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCustomerResults(data.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handlePhoneChange = (value) => {
    setCustomerPhone(value);
    setSelectedCustomer(null);
    searchCustomersForBill(value);
  };

  const handleNameChange = (value) => {
    setCustomerName(value);
    setSelectedCustomer(null);
    searchCustomersForBill(value);
  };

  const selectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerResults([]);
    setShowCustomerDropdown(false);
    setCustomerCity(customer.city || "");
    setCustomerGST(customer.gstNumber || "");

    try {
      const customerId = customer._id || customer.id;

      const res = await fetch(`${API.customers}/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const fullCustomer = data.customer || data.data || data;

      setAvailableLoyalty(
        Number(
          fullCustomer.loyaltyPoints ||
          fullCustomer.loyalty?.remaining ||
          fullCustomer.remainingPoints ||
          0
        )
      );
      setCustomerCity(fullCustomer.city || "");
      setCustomerGST(fullCustomer.gstNumber || "");
      setCustomerPrevBalance(Number(fullCustomer.totalBalance || 0));
      setCustomerPrevBalance(Number(fullCustomer.totalBalance || 0));
    } catch (err) {
      console.log(err);
    }
  };



  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerCity("");
    setCustomerGST("");
    setCustomerPrevBalance(0);
    setAvailableLoyalty(0);
  };



  const generateBill = async () => {
    if (codes.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    try {
      setLoading(true);
      setBill(null);

      let customerId = selectedCustomer?.id || null;

      // existing customer illa, but phone + name type pannirundha -> new customer create pannidu
      if (!customerId && customerPhone.trim() && customerName.trim()) {
        try {
          setCreatingCustomer(true);

          const custRes = await fetch(API.customers, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: customerName.trim(),
              phone: customerPhone.trim(),
              city: customerCity.trim(),
              gstNumber: customerGST.trim(),
            }),
          });

          const custData = await custRes.json();

          if (!custRes.ok) {
            throw new Error(custData.message || "Failed to create customer");
          }

          customerId = custData.data.id || custData.data._id;
          showToast("New customer created", "success");
        } catch (err) {
          showToast(err.message || "Customer creation failed", "error");
          setLoading(false);
          setCreatingCustomer(false);
          return;
        } finally {
          setCreatingCustomer(false);
        }
      }

      const grandTotal = Number(previewSummary.grandTotal || 0);

      let payments = [];

      if (paymentStatus === "unpaid") {
        payments = [];
      } else if (paymentMethod === "split") {
        if (Number(cashAmount || 0) > 0) payments.push({ method: "cash", amount: Number(cashAmount) });
        if (Number(upiAmount || 0) > 0) payments.push({ method: "upi", amount: Number(upiAmount) });
        if (Number(cardAmount || 0) > 0) payments.push({ method: "card", amount: Number(cardAmount) });
      } else {
        payments = [{ method: paymentMethod, amount: Number(receivedAmount || 0) }];
      }

      const billItems = scannedItems.map((item) => ({
        productId: item.productId,
        qty: Number(item.qty || 1),
      }));

      const res = await fetch(API.bill, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: customerId ? Number(customerId) : undefined,
          redeemPoints: Number(redeemPoints || 0),
          items: billItems,
          paymentStatus,
          paymentMethod,
          payments:
            paymentMethod === "split"
              ? [
                Number(cashAmount || 0) > 0 && {
                  method: "cash",
                  amount: Number(cashAmount),
                },
                Number(upiAmount || 0) > 0 && {
                  method: "upi",
                  amount: Number(upiAmount),
                  details: upiDetails,
                },
                Number(cardAmount || 0) > 0 && {
                  method: "card",
                  amount: Number(cardAmount),
                  details: cardDetails,
                },
              ].filter(Boolean)
              : [
                {
                  method: paymentMethod,
                  amount: Number(receivedAmount || 0),
                  ...(paymentMethod === "cheque" && { details: chequeDetails }),
                  ...(paymentMethod === "upi" && { details: upiDetails }),
                  ...(paymentMethod === "card" && { details: cardDetails }),
                },
              ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bill generation failed");

      setBill(data.data);
      showToast("Bill generated successfully", "success");
      setShowBillingPopup(false);

      await fetchStockList();

      if (activeHoldId) {
        try {
          await fetch(`${API.holdBill}/${activeHoldId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.log("Failed to delete hold:", e);
        }
        setHoldTabs((prev) => prev.filter((t) => t.holdId !== activeHoldId));
        setActiveHoldId(null);
      }

      setCodes([]);
      setScannedItems([]);
      setScanCode("");
      setActiveHoldId(null);
      clearCustomer();
      setRowSearches({});
      setRowSearchResults({});
      setActiveRowIndex(0);

      setTimeout(() => {
        itemInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      await fetchStockList();
    }
  };

  const generatePreviewBill = async (items) => {
    try {
      if (!items.length) {
        setPreviewSummary({
          subTotal: 0,
          totalGST: 0,
          grandTotal: 0,
        });
        return;
      }

      const billItems = items.map((item) => ({
        productId: item.productId,
        qty: Number(item.qty || 1),
      }));

      const res = await fetch(API.billCalculate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer?.id ? Number(selectedCustomer.id) : undefined,
          loyaltyPoints: Number(redeemPoints || 0),
          items: billItems,
          paymentStatus: "paid",
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPreviewSummary(data.data.summary);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    generatePreviewBill(scannedItems);
  }, [scannedItems, paymentMethod, redeemPoints, selectedCustomer]);

  const holdBill = async () => {
    if (holdTabs.length >= 5) {
      showToast("Maximum 5 billing screens only", "error");
      return;
    }
    if (scannedItems.length === 0) {
      showToast("Please add items", "error");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        customerName: "Walk-in Customer",
        items: scannedItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          sellingPrice: item.sellingPrice || item.mrp,
          mrp: item.mrp,
          gst: item.gst || 0,
          barcode: item.barcode,
          flavor: item.flavor || "",
        })),
      };

      console.log("Hold Bill Payload:", JSON.stringify(payload, null, 2));


      const res = await fetch(API.holdBill, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });


      const data = await res.json();

      console.log("Server response:", data);
      if (!res.ok) {
        throw new Error(data.message || "Failed to hold bill");
      }

      showToast(
        `Bill Hold Successfully (#${data.data.holdNo})`,
        "success"
      );

      setHoldTabs((prev) => [
        ...prev,
        {
          holdId: data.data._id,
          holdNo: data.data.holdNo,
          screenNo: prev.length + 1,
        },
      ]);


      setScannedItems([]);
      setCodes([]);
      setScanCode("");
      setSearchResults([]);
      setShowDropdown(false);

    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resumeHoldBill = async (holdId) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API.holdBill}/${holdId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      const hold = data.data;

      setActiveHoldId(hold._id);

      setScannedItems(
        hold.items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          brand: item.brand,
          barcode: item.barcode,
          mrp: item.mrp,
          sellingPrice: item.sellingPrice,
          flavor: item.flavor,
          gst: item.gst,
          qty: item.qty,
        }))
      );
      setCodes(
        hold.items.flatMap((item) =>
          Array(item.qty).fill(item.barcode)
        )
      );

      showToast(`Hold #${hold.holdNo} loaded`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (value) => {
    setScanCode(value);

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await fetch(
        `${API.bill}/search-product?search=${value}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data);
        setShowDropdown(true);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const closeHoldTab = async (e, tab) => {
    e.stopPropagation();

    try {
      await fetch(`${API.holdBill}/${tab.holdId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.log("Hold delete failed:", err);
    }

    setHoldTabs((prev) =>
      prev
        .filter((t) => t.holdId !== tab.holdId)
        .map((t, index) => ({
          ...t,
          screenNo: index + 1,
        }))
    );

    if (activeHoldId === tab.holdId) {
      setActiveHoldId(null);
      setScannedItems([]);
      setCodes([]);
      setScanCode("");
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const addSearchProduct = (product) => {
    const stockInfo = getStockInfo(product);

    setScannedItems((prev) => {
      const existing = prev.find(
        (p) => String(p.barcode) === String(product.barcode)  // type coerce panndu
      );

      if (existing) {
        return prev.map((p) =>
          String(p.barcode) === String(product.barcode)
            ? { ...p, qty: p.qty + 1 }
            : p
        );
      }

      const stockInfo = getStockInfo(product);

      return [
        ...prev,
        {
          productId: product.productId,
          productName: product.productName,
          brand: product.brand,
          barcode: product.barcode,
          mrp: product.mrp || 0,
          priceLevel: product.priceLevel || null,
          sellingPrice: product.sellingPrice || 0,
          flavor: product.flavor || "",
          gst: product.gst || 0,
          stock: stockInfo.stock,
          unit: stockInfo.unit,
          stockText: stockInfo.text,
          stockStatus: stockInfo.status,
          qty: 1,
        },
      ];
    });

    setCodes((prev) => [...prev, product.barcode]);
    setScanCode("");
    setSearchResults([]);
    setShowDropdown(false);
    showToast("Item added", "success");
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "Escape") {
        navigate(-1);
      }

      if (e.key === "F4") {
        e.preventDefault();
        openPaymentModal(false);
      }

      if (e.key === "F6") {
        e.preventDefault();
        openPaymentModal(true);
      }

      if (e.key === "F7") {
        e.preventDefault();
        openPaymentModal(false);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        holdBill();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [codes, scannedItems, previewSummary]);

  const openPaymentModal = (printFlag) => {
  if (codes.length === 0) {
    showToast("Please add at least one item", "error");
    setRedeemPoints("");
    return;
  }

  setPendingPrint(printFlag);
  setBill(null);
  setPaymentStatus("paid");
  setReceivedAmount("");
  setCashAmount("");
  setUpiAmount("");
  setCardAmount("");

  if (Number(customerPrevBalance || 0) > 0) {
    setPendingPopupPrint(printFlag);
    setShowBalanceAlert(true);
    return;
  }

  setShowBillingPopup(true);
};

  const confirmPayment = async () => {
    shouldPrintRef.current = true;
    await generateBill();
  };

  return (
    <div className={styles.posWrap}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <button className={styles.exitBtn} onClick={() => navigate(-1)}>
          <span>←</span> Exit pos <kbd>[CTRL+ESC]</kbd>
        </button>
        <span className={styles.topTitle}>Pos billing</span>
      </div>

      {/* ── Tab Row ── */}
      <div className={styles.tabsRow}>
        {holdTabs.map((tab) => (
          <div
            key={tab.holdId}
            className={
              activeHoldId === tab.holdId
                ? styles.tabActive
                : styles.tabHold
            }
            onClick={() => resumeHoldBill(tab.holdId)}
          >
            <span>Billing screen {tab.screenNo}</span>

            <button
              type="button"
              className={styles.closeTabBtn}
              onClick={(e) => closeHoldTab(e, tab)}
            >
              ×
            </button>
          </div>
        ))}

        <div
          className={!activeHoldId ? styles.tabActive : styles.tabHold}
          onClick={() => {
            setActiveHoldId(null);
            setScannedItems([]);
            setCodes([]);
            setScanCode("");
            setSearchResults([]);
            setShowDropdown(false);
          }}
        >
          <span>Billing screen {holdTabs.length + 1}</span>

          <button
            type="button"
            className={styles.closeTabBtn}
            onClick={(e) => {
              e.stopPropagation();

              setActiveHoldId(null);
              setScannedItems([]);
              setCodes([]);
              setScanCode("");
              setSearchResults([]);
              setShowDropdown(false);
              clearCustomer();
            }}
          >
            ×
          </button>
        </div>

        <div className={styles.tabAdd} onClick={holdBill}>
          + Hold bill & create another
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className={styles.mainBody}>

        {/* ── Left Panel ── */}
        <div className={styles.leftPanel}>


          <input
            ref={scanInputRef}
            className={styles.hiddenScanInput}
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const nextEmptyIndex = scannedItems.length;
                addProductToRow(nextEmptyIndex, scanCode);
                setScanCode("");
              }
            }}
            autoComplete="off"
          />
          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Item code</th>
                  <th>Items</th>
                  <th>Mrp</th>
                  <th>Sp (₹)</th>
                  <th>Disc (%)</th>
                  <th>Stock</th>
                  <th>Quantity</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>

              <tbody>
                {displayRows.map((item, idx) => (
                  <tr key={item?.barcode || `empty-${idx}`}>
                    <td>{idx + 1}</td>

                    <td>
                      {item ? (
                        item.barcode
                      ) : (
                        <div className={styles.rowSearchBox}>
                          <input
                            ref={(el) => (itemInputRefs.current[idx] = el)}
                            className={styles.cellInput}
                            type="text"
                            value={rowSearches[idx] || ""}
                            onFocus={() => setActiveRowIndex(idx)}
                            onChange={(e) => searchProductsForRow(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const firstItem = rowSearchResults[idx]?.[0];
                                if (firstItem) {
                                  selectRowProduct(idx, firstItem);
                                }
                              }
                            }}
                          />

                          {activeRowIndex === idx && rowSearchResults[idx]?.length > 0 && (
                            <div className={styles.rowDropdown}>
                              {rowSearchResults[idx].map((product) => (
                                <div
                                  key={`${product.productId}-${product.barcode}`}
                                  className={styles.rowDropdownItem}
                                  onMouseDown={() => selectRowProduct(idx, product)}
                                >
                                  <div>
                                    <strong>{product.productName}</strong>
                                    <p>Stock: {getStockInfo(product).text} {getStockInfo(product).unit}</p>
                                  </div>
                                  <span>₹{product.sellingPrice || product.mrp || 0}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td>
                      {item ? (
                        <>
                          {item.productName}
                          {item.flavor && (
                            <span className={styles.itemSub}> · {item.flavor}</span>
                          )}
                        </>
                      ) : (
                        ""
                      )}
                    </td>

                    <td>{item ? `₹${item.mrp || 0}` : ""}</td>

                    <td>
                      {item
                        ? `₹${Number(item.sellingPrice || item.finalPrice || 0).toFixed(2)}`
                        : ""}
                    </td>

                    <td>{item ? "0" : ""}</td>

                    <td>
                      {item?.stock != null
                        ? `${Number(item.stock).toFixed(2)} ${getUnit(item)}`
                        : ""}
                    </td>

                    <td>
                      {item ? (
                        <div className={styles.qtyCell}>
                          <input
                            className={styles.cellInput}
                            type="text"
                            value={item.qty}
                            onChange={(e) => updateQty(item.barcode, e.target.value)}
                          />
                          <span>{getUnit(item)}</span>
                        </div>
                      ) : (
                        ""
                      )}
                    </td>

                    <td>
                      {item ? (
                        <div className={styles.amtCell}>
                          ₹{(getEffectivePrice(item) * item.qty).toFixed(2)}
                          <button
                            className={styles.deleteBtn}
                            onClick={() => removeItem(item.barcode)}
                          >
                            🗑
                          </button>
                        </div>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className={styles.rightPanel}>

          <div className={styles.customerBox}>
            <div className={styles.recvLabel}>
              <span>Customer (optional)</span>
            </div>

            <div className={styles.customerFieldsRow}>
              <input
                type="text"
                placeholder="Mobile number"
                className={styles.customerInput}
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              />

              <input
                type="text"
                placeholder="Customer name"
                className={styles.customerInput}
                value={customerName}
                onChange={(e) => handleNameChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
              />

              {(customerPhone || customerName) && (
                <button className={styles.clearCustomerBtn} onClick={clearCustomer}>
                  ✕
                </button>
              )}
            </div>

            <div className={styles.customerFieldsRow}>
              <input
                type="text"
                placeholder="City"
                className={styles.customerInput}
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
              />

              <input
                type="text"
                placeholder="Gst number"
                className={styles.customerInput}
                value={customerGST}
                onChange={(e) => setCustomerGST(e.target.value)}
              />
            </div>

            {showCustomerDropdown && customerResults.length > 0 && (
              <div className={styles.customerDropdown}>
                {customerResults.map((c) => (
                  <div
                    key={c._id}
                    className={styles.customerItem}
                    onClick={() => selectCustomer(c)}
                  >
                    <span className={styles.customerName}>{c.name}</span>
                    <span className={styles.customerPhone}>{c.phone}</span>

                  </div>
                ))}
              </div>
            )}

            {selectedCustomer ? (
              <div className={styles.selectedCustomerTag}>
                Existing: {selectedCustomer.name} ({selectedCustomer.phone})
              </div>
            ) : (
              customerPhone.trim() &&
              customerName.trim() && (
                <div className={styles.newCustomerTag}>
                  New customer will be created on save
                </div>
              )
            )}
          </div>

          <div className={styles.billBox}>
            <p className={styles.billBoxTitle}>Bill details</p>
            <div className={styles.billRow}>
              <span>Sub total</span>
              <span className={styles.billVal}>₹ {Number(previewSummary.subTotal || 0).toFixed(2)}</span>
            </div>
            <div className={styles.billRow}>
              <span>Tax</span>
              <span className={styles.billVal}>₹ {Number(previewSummary.totalGST || 0).toFixed(2)}</span>
            </div>
            <div className={styles.totalBox}>
              <span>Total amount</span>
              <span>₹ {Number(previewSummary.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.bottomActions}>
            <button
              className={styles.savePrintBtn}
              onClick={() => openPaymentModal(true)}
            >
              Save & print <kbd>[F6]</kbd>
            </button>
            <button
              className={styles.saveBtn}
              onClick={() => openPaymentModal(false)}
            >
              Save bill <kbd>[F7]</kbd>
            </button>
          </div>

        </div>
      </div>

      {showBillingPopup && (
        <BillingPopup
          bill={bill}
          items={scannedItems}
          summary={previewSummary}
          prevBalance={customerPrevBalance}
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          receivedAmount={receivedAmount}
          setReceivedAmount={setReceivedAmount}
          cashAmount={cashAmount}
          setCashAmount={setCashAmount}
          upiAmount={upiAmount}
          setUpiAmount={setUpiAmount}
          cardAmount={cardAmount}
          setCardAmount={setCardAmount}
          redeemPoints={redeemPoints}
          setRedeemPoints={setRedeemPoints}
          availableLoyalty={availableLoyalty}
          chequeDetails={chequeDetails}
          setChequeDetails={setChequeDetails}
          upiDetails={upiDetails}
          setUpiDetails={setUpiDetails}
          cardDetails={cardDetails}
          setCardDetails={setCardDetails}
          onClose={() => {
            setShowBillingPopup(false);
            setBill(null);
          }}
          onConfirm={confirmPayment}
          onPrint={() => {
            window.print();
            showToast("Bill sent to printer", "success");
          }}
          loading={loading}
        />
      )}
      {bill && (
        <div className={styles.receiptPrintOnly}>
          <div className={styles.receipt}>
            <div className={styles.receiptHeader}>
              <p className={styles.receiptShopName}>Billing</p>
              <p className={styles.receiptWelcome}>Welcome you</p>
            </div>

            <div className={styles.dashedLine} />

            <p className={styles.receiptCenter}>
              <strong>Tax invoice</strong>
            </p>

            <div className={styles.receiptMeta}>
              <div>
                <span>Date: {bill.invoiceDate}</span><br />
                <span>Time: {bill.invoiceTime}</span>
              </div>
              <div>
                <span>Bill No: {bill.invoiceNo}</span>
              </div>
            </div>

            <div className={styles.dashedLine} />

            <div className={styles.receiptTableHead}>
              <span className={styles.colName}>Item</span>
              <span className={styles.colQty}>Qty</span>
              <span className={styles.colPrice}>Rate</span>
              <span className={styles.colAmt}>Amt</span>
            </div>

            <div className={styles.dashedLine} />

            {bill.items?.map((item, i) => (
              <div key={i} className={styles.receiptRow}>
                <span className={styles.colName}>{item.name || item.productName}</span>
                <span className={styles.colQty}>{item.qty}</span>
                <span className={styles.colPrice}>
                  {Number(item.sellingPrice || item.finalPrice || 0).toFixed(2)}
                </span>
                <span className={styles.colAmt}>
                  {Number(item.totalAmount || item.finalPrice || 0).toFixed(2)}
                </span>
              </div>
            ))}

            <div className={styles.dashedLine} />

            <div className={styles.paymentSummary}>
              <div className={styles.summaryRow}>
                <span>Sub Total</span>
                <span>{Number(bill.summary?.subTotal || 0).toFixed(2)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Tax</span>
                <span>{Number(bill.summary?.totalGST || 0).toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Total</span>
                <span>{Number(bill.summary?.grandTotal || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.receiptFooter}>
              <p>Thank you for doing business with us.</p>
            </div>
          </div>
        </div>
      )}

      {showBalanceAlert && (
  <div className={styles.balanceAlertOverlay}>
    <div className={styles.balanceAlertPopup}>
      <div className={styles.balanceAlertHeader}>
        Previous Balance
      </div>

      <div className={styles.balanceAlertBody}>
        <p>This customer has a previous balance</p>

        <strong>
          ₹ {Number(customerPrevBalance || 0).toFixed(2)}
        </strong>
      </div>

      <div className={styles.balanceAlertActions}>
        <button
          type="button"
          className={styles.balanceContinueBtn}
          onClick={() => {
            setShowBalanceAlert(false);
            setPendingPrint(pendingPopupPrint);
            setShowBillingPopup(true);
          }}
        >
          Continue
        </button>

        <button
          type="button"
          className={styles.balanceCancelBtn}
          onClick={() => {
            setShowBalanceAlert(false);

            setTimeout(() => {
              itemInputRefs.current[0]?.focus();
            }, 100);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}

export default POSBilling;