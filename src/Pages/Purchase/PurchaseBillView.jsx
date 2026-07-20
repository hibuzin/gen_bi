import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./PurchaseBillView.module.css";
import { API } from "../../constants/api";

function PurchaseBillView() {
  const { supplierId, purchaseId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API.purchaseById(purchaseId),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setBill(data.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!bill) return <div style={{ padding: 40 }}>Bill not found</div>;

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Purchase Bill
        </button>
        <div className={styles.topActions}>
          <button className={styles.outlineBtn}>🖨 Print</button>
          <button className={styles.outlineBtn}>⬇ Download PDF</button>
        </div>
      </div>

      {/* Bill Container */}
      <div className={styles.billWrap}>
        <div className={styles.invoice}>


          {/* Header Info */}
          <div className={styles.billHeaderInfo}>
            <div className={styles.billFrom}>

              <h3>
                {bill.supplier?.name || bill.supplierName || "-"}
              </h3>

              <p>{bill.supplier?.mobile || bill.supplierMobile || "-"}</p>
              {bill.supplier?.email && <p>{bill.supplier.email}</p>}
            </div>

            <div className={styles.invoiceInfo}>
              <div>
                <span>Invoice No</span>
                <b>{bill.invoiceNo || "-"}</b>
              </div>

              <div>
                <span>Invoice Date</span>
                <b>{bill.invoiceDate || "-"}</b>
              </div>

            </div>
          </div>

          <div className={styles.divider} />

          {/* Items Table */}
          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>No</th>
                <th>Item Code</th>
                <th>Items</th>
                <th>Dis %</th>
                <th>Dis Amt</th>
                <th>Rate</th>
                <th>MRP</th>
                <th>Selling</th>
                <th>ROI %</th>
                <th>Profit %</th>
                <th>Tax Amt</th>
                <th>Net Cost</th>
                <th>Amount</th>
                <th>Qty</th>
                <th>Free</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {(bill.items || []).map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{item.barcode || "—"}</td>
                  <td className={styles.itemName}>{item.productName || "-"}</td>
                  <td>{Number(item.discountPercent || 0).toFixed(2)}%</td>
                  <td>₹{Number(item.discountAmount || 0).toFixed(2)}</td>
                  <td>₹{Number(item.Rate || item.rate || 0).toFixed(2)}</td>
                  <td>₹{Number(item.mrp || 0).toFixed(2)}</td>
                  <td>₹{Number(item.sellingPrice || 0).toFixed(2)}</td>
                  <td>{Number(item.roiPercent || 0).toFixed(2)}%</td>
                  <td>{Number(item.profitPercent || 0).toFixed(2)}%</td>
                  <td>₹{Number(item.taxAmount || 0).toFixed(2)}</td>
                  <td>₹{Number(item.netcost || 0).toFixed(2)}</td>
                  <td>₹{Number(item.amount || 0).toFixed(2)}</td>
                  <td>
                    {item.qty || 0} {item.unit || ""}
                    {item.unitValue ? ` (${item.unitValue})` : ""}
                  </td>
                  <td>{item.freeQty || 0}</td>
                  <td>₹{Number(item.netAmount || item.totalCostWithGST || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.divider} />

          {/* Totals */}
          <div className={styles.totalsWrap}>
            <div className={styles.totalsRight}>
              <div className={styles.totalRow}>
                <span>Gross Amount</span>
                <span>₹ {Number(bill.totalGrossAmount || 0).toFixed(2)}</span>
              </div>

              <div className={styles.totalRow}>
                <span>Tax Amount</span>
                <span>
                  ₹ {Number(
                    bill.totalTaxAmount ||
                    (bill.items || []).reduce((sum, item) => sum + Number(item.taxAmount || 0), 0)
                  ).toFixed(2)}
                </span>
              </div>

              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total Amount</span>
                <span>₹ {Number(bill.totalAmount || 0).toFixed(2)}</span>
              </div>

              <div className={styles.totalRow}>
                <span>Paid Amount</span>
                <span>₹ {Number(bill.paidAmount || 0).toFixed(2)}</span>
              </div>

              <div className={styles.totalRow}>
                <span>Balance</span>
                <span>₹ {Number(bill.balanceAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}

export default PurchaseBillView;