import { useEffect, useState } from "react";
import styles from "./InvoiceSettings.module.css";

function InvoiceSettings() {

  const [business, setBusiness] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || {};
  });

  const companyName = business?.CompanyName || "Supermarket";
  const phone = business?.CompanyPhone || "";

  useEffect(() => {
  const updateBusiness = () => {
    const updated =
      JSON.parse(localStorage.getItem("user")) || {};
    setBusiness(updated);
  };

  window.addEventListener("businessUpdated", updateBusiness);

  return () => {
    window.removeEventListener("businessUpdated", updateBusiness);
  };
}, []);

  return (
    <div className={styles.container}>


      {/* INVOICE CARD */}
      <div className={styles.invoiceWrapper}>

        <div className={styles.invoice}>

          {/* TOP */}
          <div className={styles.topSection}>

            <div>
              <h2 className={styles.shopName}>
                 {companyName}
              </h2>

              <p className={styles.phone}>
                {phone}
              </p>
            </div>

            

            <div className={styles.invoiceType}>
              <h3>TAX INVOICE</h3>
              <span>
                ORIGINAL FOR RECIPIENT
              </span>
            </div>

          </div>

          {/* INFO ROW */}
          <div className={styles.infoGrid}>

            <div className={styles.infoBox}>
              <label>Invoice No.</label>
              <p>AABBCD202</p>
            </div>

            <div className={styles.infoBox}>
              <label>Invoice Date</label>
              <p>17/01/2026</p>
            </div>

            <div className={styles.infoBox}>
              <label>Due Date</label>
              <p>16/02/2026</p>
            </div>

          </div>

          {/* ADDRESS */}
          <div className={styles.addressSection}>

            <div className={styles.addressBox}>

              <h4>Bill To</h4>

              <p className={styles.bold}>
                Sample Party
              </p>

              <p>
                No F2, Outer Circle,
                Connaught Circus,
                Delhi
              </p>

              <p>110001</p>

              <p>
                Mobile 7400417400
              </p>

              <p>
                GSTIN 07ABCCF2702H4ZZ
              </p>

            </div>

            <div className={styles.addressBox}>

              <h4>Shipping Address</h4>

              <p>
                1234123 324324234,
                Bengaluru
              </p>

            </div>

          </div>

          {/* TABLE */}
          <div className={styles.tableWrapper}>

            <table className={styles.table}>

              <thead>
                <tr>
                  <th>No</th>
                  <th>Items</th>
                  <th>HSN No.</th>
                  <th>Qty.</th>
                  <th>Rate</th>
                  <th>Disc.</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                <tr>
                  <td>1</td>
                  <td>
                    Samsung A30
                    <span>
                      samsung phone
                    </span>
                  </td>
                  <td>1234</td>
                  <td>1 PCS</td>
                  <td>10,000</td>
                  <td>1,000</td>
                  <td>1,620</td>
                  <td>10,620</td>
                </tr>

                <tr>
                  <td>2</td>
                  <td>
                    Parle-G 200g
                    <span>
                      best biscuit
                    </span>
                  </td>
                  <td>405111209</td>
                  <td>1 BOX</td>
                  <td>342.86</td>
                  <td>51.43</td>
                  <td>14.57</td>
                  <td>306</td>
                </tr>

                <tr>
                  <td>3</td>
                  <td>
                    Puma Blue Round
                    Neck T-Shirt
                    <span>
                      premium cotton
                    </span>
                  </td>
                  <td>2032</td>
                  <td>2 PCS</td>
                  <td>900</td>
                  <td>0</td>
                  <td>90</td>
                  <td>1,890</td>
                </tr>

              </tbody>

              <tfoot>

                <tr className={styles.footerTotals}>

                  {/* Empty columns */}
                  <td></td>
                  <td>
                    <div className={styles.totalLabel}>
                      Sub Total
                    </div>
                  </td>
                  <td></td>
                  <td></td>

                  {/* Rate column */}
                  <td>
                  </td>

                  {/* Discount column */}
                  <td>

                    <div className={styles.totalValue}>
                      ₹ 1,051.43
                    </div>
                  </td>

                  {/* Tax column */}
                  <td>

                    <div className={styles.totalValue}>
                      ₹ 1,724.57
                    </div>
                  </td>

                  {/* Total column */}
                  <td>

                    <div className={styles.totalValue}>
                      ₹ 12,816
                    </div>
                  </td>

                </tr>

              </tfoot>
            </table>

          </div>



          {/* FOOT TOTAL */}
          <div className={styles.bottomSection}>

            <div className={styles.notes}>

              <h4>Notes</h4>

              <p>
                Sample invoice note
              </p>

              <h4 className={styles.termTitle}>
                Terms & Conditions
              </h4>

              <p>
                Goods once sold will
                not be taken back.
              </p>

            </div>

            <div className={styles.summary}>

              <div className={styles.summaryRow}>
                <span>Taxable Amount</span>
                <span>₹ 1,091.43</span>
              </div>

              <div className={styles.summaryRow}>
                <span>CGST @2.5%</span>
                <span>₹ 52.29</span>
              </div>

              <div className={styles.summaryRow}>
                <span>SGST @2.5%</span>
                <span>₹ 52.29</span>
              </div>

              <div className={styles.summaryRow}>
                <span>CGST @9%</span>
                <span>₹ 810</span>
              </div>

              <div className={styles.summaryRow}>
                <span>SGST @9%</span>
                <span>₹ 810</span>
              </div>

              <div
                className={`${styles.summaryRow} ${styles.grand}`}
              >
                <span>Grand Total</span>
                <span>₹ 12,816</span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default InvoiceSettings;