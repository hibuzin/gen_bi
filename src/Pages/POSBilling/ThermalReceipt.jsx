import styles from "./ThermalReceipt.module.css";

function ThermalReceipt({
    bill,
    items = [],
    summary = {},
    customerName = "",
    customerPhone = "",
    paidAmount = 0,
    balanceAmount = 0,
    preview = false,
}) {
    const receiptData = bill || {
        invoiceNo: "PREVIEW",
        invoiceDate: new Date().toLocaleDateString("en-IN"),
        invoiceTime: new Date().toLocaleTimeString("en-IN"),
        items,
        summary,
        customer: {
            customerName,
            mobile: customerPhone,
        },
    };

    return (
        <div
            className={
                preview
                    ? styles.receiptPreview
                    : styles.receiptPrintOnly
            }
        >
            <div className={styles.receipt}>
                <div className={styles.receiptHeader}>
                    <p className={styles.receiptShopName}>Billing</p>
                    <p className={styles.receiptWelcome}>Welcome you</p>
                </div>

                <div className={styles.dashedLine} />

                <p className={styles.receiptCenter}>
                    <strong>Tax invoice</strong>
                </p>

                <div className={styles.receiptMeta}>
                    <div>
                        <span>Date: {receiptData.invoiceDate || "-"}</span>
                        <br />
                        <span>Time: {receiptData.invoiceTime || "-"}</span>
                    </div>

                    <div>
                        <span>Bill No: {receiptData.invoiceNo || "-"}</span>
                    </div>
                </div>

                {(receiptData.customer?.customerName ||
                    receiptData.customer?.mobile) && (
                        <>
                            <div className={styles.dashedLine} />

                            <div>
                                {receiptData.customer?.customerName && (
                                    <div>{receiptData.customer.customerName}</div>
                                )}

                                {receiptData.customer?.mobile && (
                                    <div>{receiptData.customer.mobile}</div>
                                )}
                            </div>
                        </>
                    )}

                <div className={styles.dashedLine} />

                <div className={styles.receiptTableHead}>
                    <span className={styles.colName}>Item</span>
                    <span className={styles.colQty}>Qty</span>
                    <span className={styles.colPrice}>Rate</span>
                    <span className={styles.colAmt}>Amt</span>
                </div>

                <div className={styles.dashedLine} />

                {receiptData.items?.map((item, index) => {
                    const qty = Number(item.qty || 0);

                    const rate = Number(
                        item.sellingPrice ??
                        item.finalPrice ??
                        item.rate ??
                        item.mrp ??
                        0
                    );

                    const amount = Number(
                        item.totalAmount ??
                        item.netAmount ??
                        rate * qty
                    );

                    return (
                        <div
                            key={item.productId || item._id || index}
                            className={styles.receiptRow}
                        >
                            <span className={styles.colName}>
                                {item.name || item.productName || "Item"}
                            </span>

                            <span className={styles.colQty}>{qty}</span>

                            <span className={styles.colPrice}>
                                {rate.toFixed(2)}
                            </span>

                            <span className={styles.colAmt}>
                                {amount.toFixed(2)}
                            </span>
                        </div>
                    );
                })}

                <div className={styles.dashedLine} />

                <div className={styles.billBottomSection}>
                    <div className={styles.totalLine}>
                        <span>Total</span>
                        <strong>
                            ₹ {Number(receiptData.summary?.grandTotal || 0).toFixed(2)}
                        </strong>
                    </div>

                    <div className={styles.paymentInfoRow}>
                        <div>
                            <span>Paid</span>
                            <strong>
                                ₹{" "}
                                {Number(
                                    receiptData.paidAmount ??
                                    receiptData.receivedAmount ??
                                    receiptData.summary?.paidAmount ??
                                    0
                                ).toFixed(2)}
                            </strong>
                        </div>


                        <div>
                            <span>Balance</span>
                            <strong>
                                ₹{" "}
                                {Number(
                                    receiptData.balanceAmount ??
                                    receiptData.summary?.balanceAmount ??
                                    0
                                ).toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    <div className={styles.taxTable}>
                        <div className={`${styles.taxRow} ${styles.taxHeader}`}>
                            <span>Tax %</span>
                            <span>Amt</span>
                            <span>GST</span>
                            <span>SGST</span>
                            <span>CGST</span>
                        </div>

                        <div className={styles.taxRow}>
                            <span>
                                {Number(receiptData.summary?.gstRate || 0).toFixed(2)}
                            </span>

                            <span>
                                {Number(receiptData.summary?.subTotal || 0).toFixed(2)}
                            </span>

                            <span>
                                {Number(receiptData.summary?.totalGST || 0).toFixed(2)}
                            </span>

                            <span>
                                {Number(receiptData.summary?.sgst || 0).toFixed(2)}
                            </span>

                            <span>
                                {Number(receiptData.summary?.cgst || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.savedAmountRow}>
                        <span>You have Saved</span>

                        <strong>
                            ₹{" "}
                            {Number(
                                receiptData.summary?.offerPrice ??
                                receiptData.summary?.offerAmount ??
                                receiptData.summary?.offerDiscount ??
                                receiptData.summary?.discountAmount ??
                                0
                            ).toFixed(2)}
                        </strong>
                    </div>
                </div>

                <div className={styles.receiptFooter}>
                    <p>Thank you for doing business with us.</p>
                </div>
            </div>
        </div>
    );
}

export default ThermalReceipt;