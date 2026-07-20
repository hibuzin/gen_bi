import { useEffect, useState } from "react";
import styles from "./Sales.module.css";
import { API } from "../../constants/api";

function Sales() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState({
    today: null,
    week: null,
    month: null,
    year: null,
  });

  const rows = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "year", label: "This year" },
  ];

  useEffect(() => {
    fetchAllSales();
  }, []);

  const fetchAllSales = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const types = ["today", "week", "month", "year"];

      const responses = await Promise.all(
        types.map((type) =>
          fetch(`${API.salesCheck}?type=${type}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((res) => res.json())
        )
      );

      const result = {};

      types.forEach((type, index) => {
        result[type] = responses[index]?.data || {
          totalBills: 0,
          totalSales: 0,
          totalGST: 0,
          totalDiscount: 0,
          subTotal: 0,
        };
      });

      setSalesData(result);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val) =>
    `₹ ${Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

 return (
  <div className={styles.container}>
    <div className={styles.header}>
      <h2>Sales</h2>
    </div>

    <div className={styles.tableWrap}>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>Period</th>
            <th>Total bills</th>
            <th>Sub total</th>
            <th>Total gst</th>
            <th>Total discount</th>
            <th>Total sales</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6">
                <div className={styles.tableLoader}>
                  <div className={styles.spinner}></div>
                  <p>Loading sales...</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const data = salesData[row.key];

              return (
                <tr key={row.key}>
                  <td className={styles.periodCell}>{row.label}</td>
                  <td>{data?.totalBills || 0}</td>
                  <td>{formatAmount(data?.subTotal)}</td>
                  <td>{formatAmount(data?.totalGST)}</td>
                  <td>{formatAmount(data?.totalDiscount)}</td>
                  <td className={styles.salesCell}>
                    {formatAmount(data?.totalSales)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}

export default Sales;