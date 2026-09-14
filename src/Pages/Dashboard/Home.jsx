import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { API } from "../../constants/api";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

import {
  Users,
  Award,
  UserCheck,
  ExternalLink
} from "lucide-react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";
import {
  FiDollarSign,
  FiCreditCard,
  FiShoppingBag,
  FiTrendingUp,
  FiTrendingDown
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [reportType, setReportType] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  useEffect(() => {
    fetchSalesReport(reportType);
  }, [reportType]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchSalesReport = async (type) => {
    try {
      const res = await fetch(
        `${API.bill}/sales-check?type=${type}`,
        { headers: authHeaders }
      );

      const json = await res.json();
      const d = json?.data;

      setSalesData([
        {
          name: type,
          bills: d?.totalBills || 0,
          sales: d?.totalSales || 0,
        },
      ]);
    } catch (err) {
      setSalesData([]);
    }
  };

  const fetchTransactions = async () => {
  try {
    const res = await fetch(API.bill, {
      headers: authHeaders,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Failed to fetch bills");
    }

    const list = Array.isArray(json?.data) ? json.data : [];

    const allBills = list.sort(
      (a, b) => Number(b.billCount || 0) - Number(a.billCount || 0)
    );

    setTransactions(allBills);
  } catch (err) {
    console.error("Bill fetch error:", err);
    setTransactions([]);
  }
};

  return (
    <div className={styles.container}>

      {/* FIXED TOP */}
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <div className={styles.divider}></div>
      </div>
      <div className={styles.sectionHeader}> 
  <h1>Business overview</h1> 
</div>



{/* SALES GRAPH */}
<div className={styles.salesGraphCard}>

  <div className={styles.graphTop}>
    <div>
      <span className={styles.graphLabel}>SALES</span>

      <div className={styles.graphAmount}>
        ₹ {(salesData[0]?.sales || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}
      </div>
    </div>

    <div className={styles.reportButtons}>
      <button
        className={reportType === "today" ? styles.activeReport : ""}
        onClick={() => setReportType("today")}
      >
        Today
      </button>

      <button
        className={reportType === "week" ? styles.activeReport : ""}
        onClick={() => setReportType("week")}
      >
        Week
      </button>

      <button
        className={reportType === "month" ? styles.activeReport : ""}
        onClick={() => setReportType("month")}
      >
        Month
      </button>
    </div>



  </div>

  <div className={styles.graphArea}>

  <svg
    viewBox="0 0 1000 160"
    preserveAspectRatio="none"
    className={styles.salesSvg}
  >

    <defs>

      {/* Area gradient */}
      <linearGradient
        id="graphFill"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
       <stop
  offset="0%"
  stopColor="#087d78"
  stopOpacity="0.28"
/>

<stop
  offset="100%"
  stopColor="#087d78"
  stopOpacity="0"
/>
      </linearGradient>

      {/* Pink glow */}
      <filter
        id="graphGlow"
        x="-30%"
        y="-50%"
        width="160%"
        height="200%"
      >
        <feGaussianBlur
          stdDeviation="3"
          result="blur"
        />

        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

    </defs>


    {/* GRID */}

    <line
      x1="0"
      y1="25"
      x2="1000"
      y2="25"
      className={styles.graphGrid}
    />

    <line
      x1="0"
      y1="65"
      x2="1000"
      y2="65"
      className={styles.graphGrid}
    />

    <line
      x1="0"
      y1="105"
      x2="1000"
      y2="105"
      className={styles.graphGrid}
    />

    <line
      x1="0"
      y1="145"
      x2="1000"
      y2="145"
      className={styles.graphGrid}
    />


    {/* GRADIENT AREA */}

    <path
      d="
        M 0 135

        C 35 135,
          45 70,
          90 72

        C 135 74,
          125 125,
          175 130

        C 225 135,
          235 38,
          290 42

        C 345 46,
          335 115,
          390 120

        C 450 125,
          455 65,
          510 68

        C 565 71,
          555 108,
          610 112

        C 665 116,
          680 30,
          735 36

        C 790 42,
          775 92,
          830 98

        C 880 104,
          905 55,
          1000 58

        L 1000 160
        L 0 160
        Z
      "
      fill="url(#graphFill)"
    />


    {/* MAIN CURVE */}

    <path
      d="
        M 0 135

        C 35 135,
          45 70,
          90 72

        C 135 74,
          125 125,
          175 130

        C 225 135,
          235 38,
          290 42

        C 345 46,
          335 115,
          390 120

        C 450 125,
          455 65,
          510 68

        C 565 71,
          555 108,
          610 112

        C 665 116,
          680 30,
          735 36

        C 790 42,
          775 92,
          830 98

        C 880 104,
          905 55,
          1000 58
      "
      fill="none"
      stroke="#035555"
      strokeWidth="2"
      filter="url(#graphGlow)"
    />


    {/* HIGHLIGHT POINT */}

   <circle
  cx="735"
  cy="36"
  r="7"
  fill="#035555"
  opacity="0.18"
/>

<circle
  cx="735"
  cy="36"
  r="4"
  fill="#035555"
  stroke="#6fc9c3"
  strokeWidth="2"
/>

  </svg>


  <div className={styles.graphLabels}>
    <span>Mon</span>
    <span>Tue</span>
    <span>Wed</span>
    <span>Thu</span>
    <span>Fri</span>
    <span>Sat</span>
    <span>Sun</span>
  </div>

</div>

</div>

{/* ONLY THIS SCROLLS */} 
<div className={styles.pageContent}>
        <div className={styles.transactionSection}>
          <div className={styles.transactionTitleRow}>
            <div>
              <h2>All Bills</h2>
              <p>{transactions.length} bills</p>
            </div>
          </div>

          <div className={styles.transactionTableWrapper}>
            <table className={styles.transactionTable}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Bill no</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Return</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="11" className={styles.emptyCell}>
                      No bills found for today
                    </td>
                  </tr>
                ) : (
                  transactions.map((bill, index) => {
                    const paymentMethod =
                      bill.payment?.paymentMethod ||
                      bill.payment?.payments?.[0]?.method ||
                      bill.paymentMethod ||
                      "cash";

                    const paymentStatus =
                      bill.payment?.paymentStatus ||
                      bill.paymentStatus ||
                      "paid";

                    const paidAmount = Number(
                      bill.payment?.paidAmount ||
                      bill.paidAmount ||
                      0
                    );

                    const pendingAmount = Number(
                      bill.payment?.pendingAmount ||
                      bill.pendingAmount ||
                      0
                    );

                    const returnAmount = Number(
                      bill.payment?.returnAmount ||
                      bill.returnAmount ||
                      0
                    );

                    const totalAmount = Number(
                      bill.summary?.grandTotal ||
                      bill.totalAmount ||
                      0
                    );

                    return (
                      <tr
                        key={bill.billId || bill._id}
                        className={styles.tableRow}
                        onClick={() =>
                          navigate("/posbilling", {
                            state: {
                              editBill: bill,
                            },
                          })
                        }
                      >
                        <td>{index + 1}</td>

                        <td>
                          <strong>{bill.invoiceNo || "-"}</strong>
                        </td>

                        <td>{bill.invoiceTime || "-"}</td>

                        <td>
                          <div className={styles.customerDetails}>
                            <strong>
                              {bill.customer?.name ||
                                bill.customer?.customerName ||
                                "Walk in Customer"}
                            </strong>

                            <span>
                              {bill.customer?.mobile || "-"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={styles.paymentBadge}>
                            {paymentMethod}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${paymentStatus === "paid"
                              ? styles.paidStatus
                              : paymentStatus === "partial"
                                ? styles.partialStatus
                                : styles.unpaidStatus
                              }`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td>₹ {paidAmount.toFixed(2)}</td>

                        <td>₹ {pendingAmount.toFixed(2)}</td>

                        <td>₹ {returnAmount.toFixed(2)}</td>

                        <td className={styles.totalAmount}>
                          ₹ {totalAmount.toFixed(2)}
                        </td>

                        <td>
                          <ExternalLink
                            size={15}
                            className={styles.openIcon}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}