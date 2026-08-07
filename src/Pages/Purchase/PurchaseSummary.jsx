import styles from "./CreatePurchase.module.css";

export default function PurchaseSummary({
  form,
  setForm,
  handleChange,
  purchaseTotals,
}) {
  return (
    <div className={styles.invoiceFooter}>
          <div className={styles.footerColumns}>

            {/* LEFT COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Gross amount</span>
                <strong>
                  ₹ {purchaseTotals.totalGrossAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Tax amount</span>
                <strong>
                  ₹ {purchaseTotals.totalTaxAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Items total</span>
                <strong>
                  ₹ {purchaseTotals.itemsTotal.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
            {/* TAX COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>CGST</span>
                <strong>₹ {purchaseTotals.cgst.toFixed(2)}</strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>SGST</span>
                <strong>₹ {purchaseTotals.sgst.toFixed(2)}</strong>
              </div>

              <div className={`${styles.footerField} ${styles.summaryField}`}>
                <span>Total tax</span>
                <strong>₹ {purchaseTotals.totalTaxAmount.toFixed(2)}</strong>
              </div>
            </div>

            {/* MIDDLE COLUMN */}
            <div className={styles.footerColumn}>
              <div className={styles.footerField}>
                <span>Freight charge</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="freightCharge"
                    value={form.freightCharge}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Packaging charge</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="packagingCharge"
                    value={form.packagingCharge}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Discount %</span>
                <div className={styles.footerInput}>
                  <input
                    type="text"
                    name="billDiscountPercent"
                    value={form.billDiscountPercent}
                    onChange={handleChange}
                    placeholder="0"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.footerColumn}>
              <div className={`${styles.footerField} ${styles.totalAmountField}`}>
                <span>Total amount</span>
                <strong>
                  ₹ {purchaseTotals.totalAmount.toLocaleString("en-IN")}
                </strong>
              </div>

              <div className={styles.footerField}>
                <span>Amount paid</span>
                <div className={styles.footerInput}>
                  <span>₹</span>
                  <input
                    type="text"
                    name="paidAmount"
                    value={form.paidAmount}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.footerField}>
                <span>Payment type</span>
                <select
                  className={styles.footerSelect}
                  name="paymentType"
                  value={form.paymentType}
                  onChange={handleChange}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {form.paymentType === "bank" && (
                <>
                  <div className={styles.footerField}>
                    <span>Bank name</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="bankName"
                      value={form.bankName}
                      onChange={handleChange}
                      placeholder="State Bank of India"
                    />
                  </div>

                  <div className={styles.footerField}>
                    <span>Transaction id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="transactionId"
                      value={form.transactionId}
                      onChange={handleChange}
                      placeholder="TXN123456789"
                    />
                  </div>
                </>
              )}

              {form.paymentType === "upi" && (
                <>
                  <div className={styles.footerField}>
                    <span>UPI id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="upiId"
                      value={form.upiId}
                      onChange={handleChange}
                      placeholder="name@upi"
                    />
                  </div>

                  <div className={styles.footerField}>
                    <span>Transaction id</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      name="upiTransactionId"
                      value={form.upiTransactionId}
                      onChange={handleChange}
                      placeholder="UPI123456789"
                    />
                  </div>
                </>
              )}

              {form.paymentType === "card" && (
                <>
                  <div className={styles.footerField}>
                    <span>Card type</span>
                    <select
                      className={styles.footerSelect}
                      name="cardType"
                      value={form.cardType}
                      onChange={handleChange}
                    >
                      <option value="">Select card</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="RuPay">RuPay</option>
                      <option value="Amex">Amex</option>
                    </select>
                  </div>

                  <div className={styles.footerField}>
                    <span>Last 4 digits</span>
                    <input
                      className={styles.footerTextInput}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      name="cardLast4"
                      value={form.cardLast4}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);

                        setForm((prev) => ({
                          ...prev,
                          cardLast4: value,
                        }));
                      }}
                      placeholder="1234"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>  
  );
}