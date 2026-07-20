import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { API } from "../../constants/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
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

export default function Home() {
  const [reportType, setReportType] = useState("today");
  const [salesData, setSalesData] = useState([]);
  const [transactions, setTransactions] = useState([]);


  const token = localStorage.getItem("token");

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
      const res = await fetch(
        `${API.bill}?limit=5`,
        { headers: authHeaders }
      );

      const json = await res.json();

      const list = Array.isArray(json?.data) ? json.data : [];

      setTransactions(
        list
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
          .slice(0, 5)
      );
    } catch (err) {
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
      {/* ONLY THIS SCROLLS */}
      <div className={styles.pageContent}>
        <div className={styles.overviewGrid}>

          <div className={`${styles.infoCard} ${styles.customerCardBox}`}>
            <div className={`${styles.cardRow} ${styles.customerCard}`}>
              <div className={styles.cardTitle}>
                <FiArrowDown size={14} />
                <p>To collect</p>
              </div>

              <ExternalLink
                size={14}
                className={styles.externalIcon}
              />
            </div>

            <h2>₹0</h2>
          </div>

          <div className={`${styles.infoCard} ${styles.pointsCardBox}`}>
            <div className={`${styles.cardRow} ${styles.pointsCard}`}>
              <div className={styles.cardTitle}>
                <FiArrowUp size={14} />
                <p>To pay</p>
              </div>

              <ExternalLink
                size={14}
                className={styles.externalIcon}
              />
            </div>

            <h2>₹0</h2>
          </div>

          <div className={`${styles.infoCard} ${styles.activeCardBox}`}>
            <div className={`${styles.cardRow} ${styles.activeCard}`}>
              <div className={styles.cardTitle}>
                <FiCreditCard size={14} />
                <p>Today cash</p>
              </div>

              <ExternalLink
                size={14}
                className={styles.externalIcon}
              />
            </div>

            <h2>₹0</h2>
          </div>

        </div>

      </div>
    </div>
  );
}