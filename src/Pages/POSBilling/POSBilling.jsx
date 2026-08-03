import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./POSBilling.module.css";
import { API } from "../../constants/api";
import BillingPopup from "./BillingPopup";
import POSTopBarTabs from "./POSTopBarTabs";
import POSItemsTable from "./POSItemsTable";
import ThermalReceipt from "./ThermalReceipt";
import POSRightPanel from "./POSRightPanel";

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
  const location = useLocation();
  const [editBillId, setEditBillId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const token = localStorage.getItem("token");
  const [scanCode, setScanCode] = useState("");
  const [codes, setCodes] = useState([]);
  const [scannedItems, setScannedItems] = useState([]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
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
  const [customerTotalSpend, setCustomerTotalSpend] = useState(0);
  const shouldPrintRef = useRef(false);
  const [showBalanceAlert, setShowBalanceAlert] = useState(false);
  const [pendingPopupPrint, setPendingPopupPrint] = useState(false);
  const [calculatedItems, setCalculatedItems] = useState([]);
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(true);
  const [billDiscountPercent, setBillDiscountPercent] = useState("");
  const [billDiscountAmount, setBillDiscountAmount] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [latestBillCount, setLatestBillCount] = useState(0);
  const [chequeDetails, setChequeDetails] = useState({
    chequeNo: "",
    chequeDate: "",
    bankName: "",
    accountHolder: "",
  });
  const totalReceivedAmount =
    paymentMethod === "split"
      ? Number(cashAmount || 0) +
      Number(upiAmount || 0) +
      Number(cardAmount || 0)
      : Number(receivedAmount || 0);
  const [upiDetails, setUpiDetails] = useState({
    upiId: "",
    transactionId: "",
  });

  const [cardDetails, setCardDetails] = useState({
    cardType: "",
    cardLast4: "",
    approvalCode: "",
  });

  const [previewSummary, setPreviewSummary] = useState({
    subTotal: 0,
    totalGST: 0,
    grandTotal: 0,
  });


  // edit

  useEffect(() => {
    const editBill = location.state?.editBill;

    if (!editBill?.billId) return;

    setIsEditMode(true);
    setEditBillId(editBill.billId);

    const billItems = Array.isArray(editBill.items)
      ? editBill.items
      : [];

    setScannedItems(
      billItems.map((item) => ({
        ...item,

        productId:
          item.productId?._id ||
          item.productId?.id ||
          item.productId,

        productName:
          item.productName ||
          item.name ||
          "",

        barcode:
          item.barcode ||
          item.itemCode ||
          "",

        qty: Number(item.qty || 1),

        discountPercent:
          Number(item.discountPercent || 0),

        discountAmount:
          Number(item.discountAmount || 0),

        stock:
          Number(
            item.stock ??
            item.currentStock ??
            item.availableQty ??
            0
          ),
      }))
    );

    setCodes(
      billItems.map(
        (item, index) =>
          item.barcode ||
          item.itemCode ||
          String(item.productId?._id || item.productId || index)
      )
    );

    const customer = editBill.customer || {};

    const customerId =
      customer.customerId ||
      customer._id ||
      customer.id ||
      null;

    const walkIn =
      editBill.isWalkInCustomer === true ||
      !customerId ||
      customer.customerName === "Walk in Customer";

    setIsWalkInCustomer(walkIn);

    setCustomerName(
      walkIn
        ? ""
        : customer.customerName ||
        customer.name ||
        ""
    );

    setCustomerPhone(
      walkIn
        ? ""
        : customer.mobile ||
        customer.phone ||
        ""
    );

    setCustomerCity(customer.city || "");
    setCustomerGST(
      customer.gstNumber ||
      customer.gstnumber ||
      ""
    );

    if (!walkIn && customerId) {
      setSelectedCustomer({
        ...customer,
        _id: customerId,
        id: customerId,
        name:
          customer.customerName ||
          customer.name ||
          "",
        phone:
          customer.mobile ||
          customer.phone ||
          "",
      });
    } else {
      setSelectedCustomer(null);
    }

    const method =
      editBill.paymentMethod ||
      editBill.payment?.method ||
      "cash";

    const status =
      editBill.paymentStatus ||
      editBill.payment?.status ||
      "paid";

    const payments =
      editBill.payments ||
      editBill.payment?.payments ||
      [];

    setPaymentMethod(method);
    setPaymentStatus(status);

    if (method === "split") {
      const cashPayment = payments.find(
        (payment) => payment.method === "cash"
      );

      const upiPayment = payments.find(
        (payment) => payment.method === "upi"
      );

      const cardPayment = payments.find(
        (payment) => payment.method === "card"
      );

      setCashAmount(
        cashPayment?.amount != null
          ? String(cashPayment.amount)
          : ""
      );

      setUpiAmount(
        upiPayment?.amount != null
          ? String(upiPayment.amount)
          : ""
      );

      setCardAmount(
        cardPayment?.amount != null
          ? String(cardPayment.amount)
          : ""
      );

      if (upiPayment?.details) {
        setUpiDetails((prev) => ({
          ...prev,
          ...upiPayment.details,
        }));
      }

      if (cardPayment?.details) {
        setCardDetails((prev) => ({
          ...prev,
          ...cardPayment.details,
        }));
      }
    } else {
      const currentPayment =
        payments.find(
          (payment) => payment.method === method
        ) || payments[0];

      setReceivedAmount(
        currentPayment?.amount != null
          ? String(currentPayment.amount)
          : editBill.paidAmount != null
            ? String(editBill.paidAmount)
            : ""
      );

      if (method === "upi" && currentPayment?.details) {
        setUpiDetails((prev) => ({
          ...prev,
          ...currentPayment.details,
        }));
      }

      if (method === "card" && currentPayment?.details) {
        setCardDetails((prev) => ({
          ...prev,
          ...currentPayment.details,
        }));
      }

      if (method === "cheque" && currentPayment?.details) {
        setChequeDetails((prev) => ({
          ...prev,
          ...currentPayment.details,
        }));
      }
    }

    setBillDiscountPercent(
      editBill.summary?.billDiscountPercentage
        ? String(editBill.summary.billDiscountPercentage)
        : ""
    );

    setBillDiscountAmount(
      editBill.summary?.billDiscountAmount
        ? String(editBill.summary.billDiscountAmount)
        : ""
    );

    setRedeemPoints(
      editBill.redeemPoints
        ? String(editBill.redeemPoints)
        : ""
    );
  }, [location.state]);





  useEffect(() => {
    fetchStockList();
    fetchLatestBillCount();
  }, []);

  useEffect(() => {
    if (!bill || !shouldPrintRef.current) return;

    const timer = setTimeout(() => {
      window.print();
    }, 600);

    const afterPrint = () => {
      shouldPrintRef.current = false;
      setBill(null);

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

      const stockInfo = getStockInfo(data.data);
      checkLowStock(stockInfo, data.data.productName);

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

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerCity("");
    setCustomerGST("");
    setCustomerPrevBalance(0);
    setAvailableLoyalty(0);
    setCustomerTotalSpend(0);
  };

  const generateBill = async () => {
   if (scannedItems.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    try {
      setLoading(true);
      setBill(null);

      let customerId =
        selectedCustomer?._id ||
        selectedCustomer?.id ||
        null;


      if (
        !isWalkInCustomer &&
        !customerId &&
        customerPhone.trim() &&
        customerName.trim()
      ) {
        try {

          const custRes = await fetch(API.customers, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: customerName.trim(),
              phone: customerPhone.trim(),
              whatsappNumber: customerWhatsapp.trim(),
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
          return;
        } finally {
        }
      }

      const billItems = scannedItems.map((item) => {
        const billItem = {
          productId: item.productId,
          qty: Number(item.qty || 1),
        };

        if (Number(item.discountPercent || 0) > 0) {
          billItem.discountPercent = Number(item.discountPercent);
        } else if (Number(item.discountAmount || 0) > 0) {
          billItem.discountAmount = Number(item.discountAmount);
        }

        return billItem;
      });

      const billUrl = isEditMode
        ? API.billEdit(editBillId)
        : API.bill;

      const res = await fetch(billUrl, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isWalkInCustomer,

          ...(!isWalkInCustomer &&
            customerId && {
            customerId: /^\d+$/.test(String(customerId))
              ? Number(customerId)
              : customerId,
          }),

          redeemPoints: isWalkInCustomer
            ? 0
            : Number(redeemPoints || 0),
          ...(Number(billDiscountPercent || 0) > 0 && {
            discountPercent: Number(billDiscountPercent),
          }),

          ...(Number(billDiscountAmount || 0) > 0 && {
            discountAmount: Number(billDiscountAmount),
          }),

          items: billItems,
          paymentStatus,
          paymentMethod,
          receivedAmount: totalReceivedAmount,
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

                  ...(paymentMethod === "cheque" && {
                    details: chequeDetails,
                  }),

                  ...(paymentMethod === "upi" && {
                    details: upiDetails,
                  }),

                  ...(paymentMethod === "card" && {
                    details: cardDetails,
                  }),
                },
              ],
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Bill generation failed");

      setBill(data.data);
      setLatestBillCount(Number(data?.data?.billCount || 0));
      showToast(
        isEditMode
          ? "Bill updated successfully"
          : "Bill generated successfully",
        "success"
      );
      if (isEditMode) {
        setIsEditMode(false);
        setEditBillId(null);

        navigate("/posbilling", {
          replace: true,
          state: null,
        });
      }
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
      setIsWalkInCustomer(true);
      setBillDiscountPercent("");
      setBillDiscountAmount("");
      setCustomerWhatsapp("");
      setReceivedAmount("");
      setCashAmount("");
      setUpiAmount("");
      setCardAmount("");
      setRedeemPoints("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");

      setChequeDetails({
        chequeNo: "",
        chequeDate: "",
        bankName: "",
        accountHolder: "",
      });

      setUpiDetails({
        upiId: "",
        transactionId: "",
      });

      setCardDetails({
        cardType: "",
        cardLast4: "",
        approvalCode: "",
      });

      setTimeout(() => {
        itemInputRefs.current?.[0]?.focus();
      }, 100);

    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      await fetchStockList();
    }
  };

  const generatePreviewBill = async (items) => {
    if (!items || items.length === 0) {
      setPreviewSummary({
        subTotal: 0,
        cgst: 0,
        sgst: 0,
        totalGST: 0,
        offerPrice: 0,
        grandTotal: 0,
      });

      setCalculatedItems([]);
      return;
    }

    try {
      const billItems = items.map((item) => {
        const billItem = {
          productId: item.productId,
          qty: Number(item.qty || 1),
        };

        if (Number(item.discountPercent || 0) > 0) {
          billItem.discountPercent = Number(item.discountPercent);
        } else if (Number(item.discountAmount || 0) > 0) {
          billItem.discountAmount = Number(item.discountAmount);
        }

        return billItem;
      });

      const res = await fetch(API.billCalculate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isWalkInCustomer,

          ...(!isWalkInCustomer &&
            (selectedCustomer?._id || selectedCustomer?.id) && {
            customerId: /^\d+$/.test(
              String(selectedCustomer?._id || selectedCustomer?.id)
            )
              ? Number(selectedCustomer?._id || selectedCustomer?.id)
              : selectedCustomer?._id || selectedCustomer?.id,
          }),

          loyaltyPoints: isWalkInCustomer
            ? 0
            : Number(redeemPoints || 0),

          items: billItems,
          ...(Number(billDiscountPercent || 0) > 0 && {
            discountPercent: Number(billDiscountPercent),
          }),

          ...(Number(billDiscountAmount || 0) > 0 && {
            discountAmount: Number(billDiscountAmount),
          }),
          paymentStatus: "paid",
          paymentMethod,
          receivedAmount: totalReceivedAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Bill calculation failed");
      }

      setPreviewSummary(data.data?.summary || {});
      setCalculatedItems(data.data?.items || []);
    } catch (err) {
      console.log(err);
    }
  };

  // bill count 
  const fetchLatestBillCount = async () => {
    try {
      const res = await fetch(API.bill, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch bill count");
      }

      const bills = Array.isArray(data?.data) ? data.data : [];

      const count = bills.reduce(
        (highest, bill) =>
          Math.max(highest, Number(bill?.billCount || 0)),
        0
      );

      setLatestBillCount(count);
    } catch (error) {
      console.error("Bill count fetch error:", error);
      setLatestBillCount(0);
    }
  };

  useEffect(() => {
    generatePreviewBill(scannedItems);
  }, [
    scannedItems,
    paymentMethod,
    paymentStatus,

    receivedAmount,
    cashAmount,
    upiAmount,
    cardAmount,

    redeemPoints,
    selectedCustomer,
    isWalkInCustomer,
    billDiscountPercent,
    billDiscountAmount,
  ]);

  useEffect(() => {
  const handleKey = (e) => {
    if (e.ctrlKey && e.key === "Escape") {
      e.preventDefault();
      navigate(-1);
      return;
    }

    // F6: Open payment popup with print enabled
    if (e.key === "F6") {
      e.preventDefault();

      if (!showBillingPopup && !showBalanceAlert) {
        openPaymentModal(true);
      }

      return;
    }

    // F8: Generate and print bill from payment popup
    if (e.key === "F8") {
      e.preventDefault();

      if (showBillingPopup && !loading) {
        confirmPayment();
      }

      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === "b") {
      e.preventDefault();

      if (!showBillingPopup) {
        holdBill();
      }
    }
  };

  window.addEventListener("keydown", handleKey);

  return () => {
    window.removeEventListener("keydown", handleKey);
  };
}, [
  scannedItems,
  previewSummary,
  showBillingPopup,
  showBalanceAlert,
  loading,
  pendingPrint,
  paymentMethod,
  paymentStatus,
  receivedAmount,
  cashAmount,
  upiAmount,
  cardAmount,
]);




  const openPaymentModal = (printFlag) => {
   if (scannedItems.length === 0) {
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
    shouldPrintRef.current = pendingPrint;
    await generateBill();
  };

  return (
    <div className={styles.posWrap}>

      {/* ── Top Bar ── */}
      <POSTopBarTabs
        navigate={navigate}
        token={token}

        holdTabs={holdTabs}
        setHoldTabs={setHoldTabs}

        activeHoldId={activeHoldId}
        setActiveHoldId={setActiveHoldId}

        scannedItems={scannedItems}
        setScannedItems={setScannedItems}

        codes={codes}
        setCodes={setCodes}

        setScanCode={setScanCode}

        setLoading={setLoading}
        showToast={showToast}

        clearCustomer={clearCustomer}
        latestBillCount={latestBillCount}

        isEditMode={isEditMode}
        editInvoiceNo={location.state?.editBill?.invoiceNo}
      />

      {/* ── Main Body ── */}
      <div className={styles.mainBody}>

        {/* ── Left Panel ── */}
        <POSItemsTable
          token={token}
          scanCode={scanCode}
          setScanCode={setScanCode}
          scannedItems={scannedItems}
          setScannedItems={setScannedItems}
          codes={codes}
          setCodes={setCodes}
          stockList={stockList}
          calculatedItems={calculatedItems}
          setCalculatedItems={setCalculatedItems}
          setPreviewSummary={setPreviewSummary}
          showToast={showToast}
        />

        {/* ── Right Panel ── */}
        <POSRightPanel
          token={token}
          isWalkInCustomer={isWalkInCustomer}
          setIsWalkInCustomer={setIsWalkInCustomer}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerCity={customerCity}
          setCustomerCity={setCustomerCity}
          customerGST={customerGST}
          setCustomerGST={setCustomerGST}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          availableLoyalty={availableLoyalty}
          setAvailableLoyalty={setAvailableLoyalty}
          customerTotalSpend={customerTotalSpend}
          setCustomerTotalSpend={setCustomerTotalSpend}
          customerPrevBalance={customerPrevBalance}
          setCustomerPrevBalance={setCustomerPrevBalance}
          previewSummary={previewSummary}
          openPaymentModal={openPaymentModal}
          billDiscountPercent={billDiscountPercent}
          setBillDiscountPercent={setBillDiscountPercent}
          billDiscountAmount={billDiscountAmount}
          setBillDiscountAmount={setBillDiscountAmount}
          customerWhatsapp={customerWhatsapp}
          setCustomerWhatsapp={setCustomerWhatsapp}
        />
      </div>

      {showBillingPopup && (
        <BillingPopup
          customerName={customerName}
          customerPhone={customerPhone}
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

      {bill && <ThermalReceipt bill={bill} />}

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