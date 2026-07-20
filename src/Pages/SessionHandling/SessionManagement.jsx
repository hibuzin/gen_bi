import { useEffect, useMemo, useState } from "react";
import styles from "./SessionManagement.module.css";
import { API } from "../../constants/api";
import Toast from "../../components/Toast";

const DENOMS = [
  { key: "note500", label: "₹500 ", value: 500 },
  { key: "note200", label: "₹200 ", value: 200 },
  { key: "note100", label: "₹100 ", value: 100 },
  { key: "note50", label: "₹50 ", value: 50 },
  { key: "note20", label: "₹20 ", value: 20 },
  { key: "note10", label: "₹10 ", value: 10 },
  { key: "coin5", label: "₹5 ", value: 5 },
  { key: "coin2", label: "₹2 ", value: 2 },
  { key: "coin1", label: "₹1 ", value: 1 },
];

const emptyDenomination = DENOMS.reduce((acc, d) => {
  acc[d.key] = "";
  return acc;
}, {});

function SessionManagement() {
  const [openingDenomination, setOpeningDenomination] =
    useState(emptyDenomination);

  const [closingDenomination, setClosingDenomination] =
    useState(emptyDenomination);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutReason, setCashOutReason] = useState("");
  const [showEndReport, setShowEndReport] = useState(false);
  const [endReport, setEndReport] = useState(null);

  const printSessionReport = () => {
    window.print();
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const renderDenominationReport = (denom) => {
    if (!denom) return null;

    return DENOMS.map((d) => {
      const count = Number(denom[d.key] || 0);
      if (count <= 0) return null;

      return (
        <div className={styles.reportLine} key={d.key}>
          <span>
            {d.label} × {count}
          </span>
          <b>₹ {formatMoney(count * d.value)}</b>
        </div>
      );
    });
  };


  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const calcAmount = (denom) => {
    return DENOMS.reduce((total, d) => {
      return total + Number(denom[d.key] || 0) * d.value;
    }, 0);
  };

  const openingAmount = useMemo(
    () => calcAmount(openingDenomination),
    [openingDenomination]
  );

  const closingAmount = useMemo(
    () => calcAmount(closingDenomination),
    [closingDenomination]
  );

  const handleChange = (type, key, value) => {
    const onlyNumber = value.replace(/\D/g, "");

    if (type === "opening") {
      setOpeningDenomination((prev) => ({
        ...prev,
        [key]: onlyNumber,
      }));
    } else {
      setClosingDenomination((prev) => ({
        ...prev,
        [key]: onlyNumber,
      }));
    }
  };

  useEffect(() => {
    fetchCurrentSession();
  }, []);


  const buildPayload = (denom) => {
    const obj = {};
    DENOMS.forEach((d) => {
      obj[d.key] = Number(denom[d.key] || 0);
    });
    return obj;
  };

  const fetchCurrentSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.sessionCurrent, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success && data.session) {
        setSession(data.session);

        if (data.session.openingDenomination) {
          setOpeningDenomination(data.session.openingDenomination);
        }

        if (data.session.closingDenomination) {
          setClosingDenomination(data.session.closingDenomination);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.sessionStart, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          openingDenomination: buildPayload(openingDenomination),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Session start failed", "error");
        return;
      }

      setSession(data.session);
      showToast("Session started successfully");
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const cashOut = async () => {
    if (!cashOutAmount || Number(cashOutAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    if (!cashOutReason.trim()) {
      showToast("Enter a reason", "error");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(API.sessionCashOut, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(cashOutAmount),
          reason: cashOutReason.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Cash out failed", "error");
        return;
      }

      setSession((prev) => ({
        ...prev,
        cashOut: data.data.cashOut,
      }));

      setCashOutAmount("");
      setCashOutReason("");

      showToast("Cash out successful");
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const settleSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.sessionSettle, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          closingDenomination: buildPayload(closingDenomination),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Session settle failed", "error");
        return;
      }

      setSession(data.session);
      showToast("Session settled successfully");
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(API.sessionEnd, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.message || "Session end failed", "error");
        return;
      }
      setSession(data.session);
      setEndReport({ ...data.session });
      setShowEndReport(true);
      showToast("Session ended successfully");
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const getReportTime = (key) => {
    return endReport?.[key] || session?.[key] || "";
  };

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className={styles.header}>
        <div>
          <h2>Session handling</h2>
        </div>

        <div
          className={`${styles.statusBadge} ${session?.status ? styles[session.status] : ""
            }`}
        >
          {session?.status || "No session"}
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Opening cash</span>
          <b>₹ {formatMoney(session?.openingAmount || openingAmount)}</b>
        </div>
        <div className={styles.summaryCard}>
          <span>Cash out</span>
          <b>₹ {formatMoney(session?.cashOut)}</b>
        </div>

        <div className={styles.summaryCard}>
          <span>Expected  cash</span>
          <b>₹ {formatMoney(session?.expectedCash)}</b>
        </div>

        <div className={styles.summaryCard}>
          <span>Cash counted</span>
          <b>₹ {formatMoney(session?.cashCounted || closingAmount)}</b>
        </div>

        <div className={styles.summaryCard}>
          <span>Difference</span>
          <b
            className={
              Number(session?.difference) > 0
                ? styles.excess
                : Number(session?.difference) < 0
                  ? styles.short
                  : ""
            }
          >
            ₹ {formatMoney(session?.difference)}
          </b>
        </div>
      </div>

      {session && (
        <div className={styles.reportCard}>
          <h3>Session report</h3>

          <div className={styles.reportGrid}>
            <div>
              <span>Total bills</span>
              <b>{session.totalBills}</b>
            </div>
            <div>
              <span>Total sales</span>
              <b>₹ {formatMoney(session.totalSales)}</b>
            </div>
            <div>
              <span>Cash sales</span>
              <b>₹ {formatMoney(session.cashSales)}</b>
            </div>
            <div>
              <span>Upi sales</span>
              <b>₹ {formatMoney(session.upiSales)}</b>
            </div>
            <div>
              <span>Card sales</span>
              <b>₹ {formatMoney(session.cardSales)}</b>
            </div>
            <div>
              <span>Settlement</span>
              <b className={styles.settlement}>
                {session.settlementStatus?.replace("_", " ")}
              </b>
            </div>
          </div>
        </div>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Opening denomination</h3>
            <span>₹ {formatMoney(openingAmount)}</span>
          </div>

          <div className={styles.denomGrid}>
            {DENOMS.map((d) => (
              <div className={styles.field} key={d.key}>
                <label>{d.label}</label>
                <input
                  type="text"
                  value={openingDenomination[d.key]}
                  onChange={(e) =>
                    handleChange("opening", d.key, e.target.value)
                  }
                  placeholder="0"
                  disabled={session?.status === "open" || session?.status === "settled" || session?.status === "closed"}
                />
              </div>
            ))}
          </div>

          <button
            className={styles.primaryBtn}
            onClick={startSession}
            disabled={loading || session?.status}
          >
            {loading ? "Please wait..." : "Start session"}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Closing denomination</h3>
            <span>₹ {formatMoney(closingAmount)}</span>
          </div>
          <div className={styles.denomGrid}>
            {DENOMS.map((d) => (
              <div className={styles.field} key={d.key}>
                <label>{d.label}</label>
                <input
                  type="text"
                  value={closingDenomination[d.key]}
                  onChange={(e) =>
                    handleChange("closing", d.key, e.target.value)
                  }
                  placeholder="0"
                  disabled={!session || session?.status === "closed"}
                />
              </div>
            ))}
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.settleBtn}
              onClick={settleSession}
              disabled={loading || session?.status !== "open"}
            >
              Settle session
            </button>

            <button
              className={styles.endBtn}
              onClick={endSession}
              disabled={loading || session?.status !== "settled"}
            >
              End session
            </button>
          </div>
        </div>
        <div className={styles.cashOutBox}>
          <div className={styles.cardHeader}>
            <h3>Cash out</h3>
          </div>

          <div className={styles.cashOutGrid}>
            <div className={styles.field}>
              <label>Amount</label>
              <input
                type="text"
                placeholder="Enter amount"
                value={cashOutAmount}
                onChange={(e) =>
                  setCashOutAmount(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>

            <div className={styles.field}>
              <label>Reason</label>
              <input
                type="text"
                placeholder="Reason"
                value={cashOutReason}
                onChange={(e) => setCashOutReason(e.target.value)}
              />
            </div>

            <button
              className={styles.cashOutBtn}
              onClick={cashOut}
              disabled={loading || session?.status !== "open"}
            >
              Cash out
            </button>
          </div>
        </div>
      </div>

      {showEndReport && endReport && (
        <div className={styles.modalOverlay}>
          <div className={styles.sessionReportModal}>
            <div className={styles.modalHeader}>
              <h3>Session End report</h3>
              <button onClick={() => setShowEndReport(false)}>×</button>
            </div>

            <div className={styles.printArea}>
              <div className={styles.printTop}>
                <h2 className={styles.printTitle}>Session Report</h2>

                <div className={styles.printTime}>
                  <span>Start: {formatDateTime(getReportTime("Date"),("startTime"))}</span>
                  <span>End: {formatDateTime(getReportTime("endDate"),("endTime"))}</span>
                </div>
              </div>

              <div className={styles.reportSection}>
                <h4>Cash summary</h4>

                <div className={styles.reportLine}>
                  <span>Opening cash</span>
                  <b>₹ {formatMoney(endReport.openingAmount)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Cash out</span>
                  <b>₹ {formatMoney(endReport.cashOut)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Expected cash</span>
                  <b>₹ {formatMoney(endReport.expectedCash)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Cash counted</span>
                  <b>₹ {formatMoney(endReport.cashCounted)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Difference</span>
                  <b>₹ {formatMoney(endReport.difference)}</b>
                </div>
              </div>

              <div className={styles.reportSection}>
                <h4>Opening denomination</h4>

                {renderDenominationReport(
                  endReport.openingDenomination || openingDenomination
                )}

                <div className={styles.reportLine}>
                  <span>Total opening amount</span>
                  <b>₹ {formatMoney(endReport.openingAmount || openingAmount)}</b>
                </div>
              </div>

              <div className={styles.reportSection}>
                <h4>Closing denomination</h4>

                {renderDenominationReport(
                  endReport.closingDenomination || closingDenomination
                )}

                <div className={styles.reportLine}>
                  <span>Total closing amount</span>
                  <b>₹ {formatMoney(endReport.cashCounted || closingAmount)}</b>
                </div>
              </div>

              <div className={styles.reportSection}>
                <h4>Cash out details</h4>

                <div className={styles.reportLine}>
                  <span>Total cash out</span>
                  <b>₹ {formatMoney(endReport.cashOut)}</b>
                </div>
              </div>

              <div className={styles.reportSection}>
                <h4>Sales summary</h4>

                <div className={styles.reportLine}>
                  <span>Total bills</span>
                  <b>{endReport.totalBills || 0}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Total sales</span>
                  <b>₹ {formatMoney(endReport.totalSales)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Cash sales</span>
                  <b>₹ {formatMoney(endReport.cashSales)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Upi sales</span>
                  <b>₹ {formatMoney(endReport.upiSales)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Card sales</span>
                  <b>₹ {formatMoney(endReport.cardSales)}</b>
                </div>

                <div className={styles.reportLine}>
                  <span>Settlement</span>
                  <b>{endReport.settlementStatus?.replace("_", " ") || "-"}</b>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowEndReport(false)}
                className={styles.cancelBtn}
              >
                Close
              </button>

              <button onClick={printSessionReport} className={styles.printBtn}>
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionManagement;