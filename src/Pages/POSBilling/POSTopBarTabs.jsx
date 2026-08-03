import { useEffect, useState } from "react";
import styles from "./POSTopBarTabs.module.css";
import { API } from "../../constants/api";

function POSTopBarTabs({
  navigate,
  token,
  holdTabs,
  setHoldTabs,
  activeHoldId,
  setActiveHoldId,
  scannedItems,
  setScannedItems,
  codes,
  setCodes,
  setScanCode,
  setLoading,
  showToast,
  clearCustomer,
  latestBillCount,
   isEditMode,
  editInvoiceNo,
}) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // DATE & TIME
  const formattedDate = `${String(
    currentDateTime.getDate()
  ).padStart(2, "0")} / ${String(
    currentDateTime.getMonth() + 1
  ).padStart(2, "0")} / ${currentDateTime.getFullYear()}`;

  const formattedTime = currentDateTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // CLEAR CURRENT BILL
  const clearCurrentBill = () => {
    setActiveHoldId(null);
    setScannedItems([]);
    setCodes([]);
    setScanCode("");
    clearCustomer?.();
  };

  // HOLD BILL
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

    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // RESUME HOLD BILL

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

  // DELETE HOLD TAB

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
    }
  };

  return (
    <>
      {/* TOP BAR */}

      <div className={styles.topBar}>
        <button className={styles.exitBtn} onClick={() => navigate(-1)}>
          <span>←</span> Exit pos <kbd>[CTRL+ESC]</kbd>
        </button>

        <div className={styles.topTitleSection}>
  <span className={styles.topTitle}>
    {isEditMode ? "Edit POS Bill" : "POS Billing"}
  </span>

  <span className={styles.billCount}>
    {isEditMode
      ? `Editing: ${editInvoiceNo || ""}`
      : `Current Bill: #${Number(latestBillCount || 0) + 1}`}
  </span>
</div>

        <div className={styles.dateTime}>
          {formattedDate} - {formattedTime}
        </div>
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
              clearCustomer();
            }}
          >
            ×
          </button>
        </div>

        {!isEditMode && (
  <div className={styles.tabAdd} onClick={holdBill}>
    + Hold bill & create another
  </div>
)}
      </div>
    </>
  );
}

export default POSTopBarTabs;