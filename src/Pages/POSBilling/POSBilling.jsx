import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(false);
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

  const [previewSummary, setPreviewSummary] = useState({
    subTotal: 0,
    totalGST: 0,
    grandTotal: 0,
  });


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
    if (codes.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    try {
      setLoading(true);
      setBill(null);

     let customerId = isWalkInCustomer
  ? null
  : selectedCustomer?.id || selectedCustomer?._id || null;
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

      const res = await fetch(API.bill, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
  isWalkInCustomer,

  customerId:
    isWalkInCustomer
      ? undefined
      : customerId
        ? Number(customerId)
        : undefined,

  redeemPoints: isWalkInCustomer
    ? 0
    : Number(redeemPoints || 0),

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
          customerId: selectedCustomer?.id
            ? Number(selectedCustomer.id)
            : undefined,
          loyaltyPoints: Number(redeemPoints || 0),
          items: billItems,
          paymentStatus: "paid",
          paymentMethod,
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

  useEffect(() => {
    generatePreviewBill(scannedItems);
  }, [scannedItems, paymentMethod, redeemPoints, selectedCustomer]);

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