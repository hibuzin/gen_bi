import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./CustomerBillView.module.css";
import { API } from "../../constants/api";

function CustomerBillView() {
  const { customerId, billId } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatMoney = (v) =>
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    fetchBill();
  }, [billId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.bill}/${billId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setBill(data.data || data);
    } catch (err) {
      console.log("Bill fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading bill...</div>;
  if (!bill) return <div className={styles.loading}>Bill not found</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(`/customer/${customerId}`)}>
          ← Back
        </button>

        <div className={styles.titleBox}>
          <h2>Customer Bill View</h2>
          <p>{bill.invoiceNo || bill.billId}</p>
        </div>

        <button className={styles.printBtn} onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className={styles.billBox}>
        <div className={styles.header}>
          <div>
            <h3>PARVATHI SUPER MARKET</h3>
            <p>Tax Invoice</p>
          </div>

          <div className={styles.meta}>
            <p><b>Invoice No:</b> {bill.invoiceNo || "-"}</p>
            <p><b>Date:</b> {bill.invoiceDate || bill.billDate || "-"}</p>
            <p><b>Time:</b> {bill.invoiceTime || "-"}</p>
            <p><b>Payment:</b> {bill.paymentMethod || "-"}</p>
            <p><b>Status:</b> {bill.paymentStatus || "-"}</p>
          </div>
        </div>

        <div className={styles.customerBox}>
          <div>
            <span>Customer</span>
            <h4>{bill.customer?.customerName || bill.customer?.name || bill.customerName || "Walk-in Customer"}</h4>
            <p>{bill.customer?.mobile || bill.customer?.phone || bill.customerPhone || "-"}</p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item</th>
                <th>Barcode</th>
                <th>Qty</th>
                <th>MRP</th>
                <th>Rate</th>
                <th>GST</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              {bill.items?.map((item, index) => (
                <tr key={item.productId || index}>
                  <td>{index + 1}</td>
                  <td>{item.productName || item.name || "-"}</td>
                  <td>{item.barcode || "-"}</td>
                  <td>{item.qty || 0} {item.unit || ""}</td>
                  <td>₹ {formatMoney(item.mrp)}</td>
                  <td>₹ {formatMoney(item.sellingPrice || item.price)}</td>
                  <td>₹ {formatMoney(item.gstAmount)}</td>
                  <td>₹ {formatMoney(item.finalPrice || item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.bottomSection}>
          <div className={styles.noteBox}>
            <b>Thank you for your purchase.</b>
            <p>Please keep this invoice for your records.</p>
          </div>

          <div className={styles.totals}>
            <div>
              <span>Sub Total</span>
              <b>₹ {formatMoney(bill.summary?.subTotal)}</b>
            </div>

            <div>
              <span>Total GST</span>
              <b>₹ {formatMoney(bill.summary?.totalGST)}</b>
            </div>

            {Number(bill.summary?.loyaltyDiscount || 0) > 0 && (
              <div>
                <span>Loyalty Discount</span>
                <b>- ₹ {formatMoney(bill.summary?.loyaltyDiscount)}</b>
              </div>
            )}

            <div className={styles.grand}>
              <span>Grand Total</span>
              <b>₹ {formatMoney(bill.summary?.grandTotal)}</b>
            </div>

            <div>
              <span>Paid Amount</span>
              <b>₹ {formatMoney(bill.paidAmount)}</b>
            </div>

            <div>
              <span>Pending Amount</span>
              <b>₹ {formatMoney(bill.pendingAmount)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerBillView;