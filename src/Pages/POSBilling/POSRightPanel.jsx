import { useState } from "react";
import styles from "./POSRightPanel.module.css";
import { API } from "../../constants/api";

function POSRightPanel({
  token,
  isWalkInCustomer,
  setIsWalkInCustomer,
  customerPhone,
  setCustomerPhone,
  customerName,
  setCustomerName,
  customerCity,
  setCustomerCity,
  customerGST,
  setCustomerGST,
  selectedCustomer,
  setSelectedCustomer,
  availableLoyalty,
  setAvailableLoyalty,
  customerTotalSpend,
  setCustomerTotalSpend,
  customerPrevBalance,
  setCustomerPrevBalance,
  previewSummary,
  openPaymentModal,
}) {
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // CUSTOMER SEARCH
  const searchCustomersForBill = async (value) => {
    if (!value.trim()) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const res = await fetch(`${API.customerSearch}?q=${value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCustomerResults(data.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // PHONE CHANGE
  const handlePhoneChange = (value) => {
    setCustomerPhone(value);
    setSelectedCustomer(null);
    searchCustomersForBill(value);
  };

  const handleNameChange = (value) => {
    setCustomerName(value);
    setSelectedCustomer(null);
    searchCustomersForBill(value);
  };

  const selectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerResults([]);
    setShowCustomerDropdown(false);
    setCustomerCity(customer.city || "");
    setCustomerGST(customer.gstNumber || "");

    try {
      const customerId = customer._id || customer.id;

      const res = await fetch(`${API.customers}/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const fullCustomer = data.customer || data.data || data;

      setAvailableLoyalty(
        Number(
          fullCustomer.loyaltyPoints ??
          fullCustomer.loyalty?.remaining ??
          fullCustomer.remainingPoints ??
          fullCustomer.totalLoyaltyPoints ??
          0
        )
      );

      setCustomerTotalSpend(
        Number(
          fullCustomer.totalSpend ??
          fullCustomer.totalSpent ??
          fullCustomer.totalPurchase ??
          fullCustomer.totalAmount ??
          0
        )
      );

      setCustomerPrevBalance(
        Number(
          fullCustomer.totalBalance ??
          fullCustomer.balanceAmount ??
          fullCustomer.balance ??
          0
        )
      );

      setCustomerCity(fullCustomer.city || "");
      setCustomerGST(fullCustomer.gstNumber || "");
    } catch (err) {
      console.log(err);
    }
  };


  // CLEAR CUSTOMER
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerCity("");
    setCustomerGST("");
    setCustomerPrevBalance(0);
    setAvailableLoyalty(0);
    setCustomerTotalSpend(0);
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.customerBox}>
        <div className={styles.recvLabel}>
  <span>Customer</span>

  <label className={styles.walkInCheck}>
    <input
      type="checkbox"
      checked={isWalkInCustomer}
      onChange={(e) => {
        const checked = e.target.checked;

        setIsWalkInCustomer(checked);

        if (checked) {
          clearCustomer();
        }
      }}
    />
    <span>  Walk-in Customer</span>
  </label>
</div>
        <div className={styles.customerFieldsRow}>
          <input
            type="text"
            placeholder="Mobile number"
            className={styles.customerInput}
            value={customerPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />

          <input
            type="text"
            placeholder="Customer name"
            className={styles.customerInput}
            value={customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />

          {(customerPhone || customerName) && (
            <button className={styles.clearCustomerBtn} onClick={clearCustomer}>
              ✕
            </button>
          )}
        </div>

        <div className={styles.customerFieldsRow}>
          <input
            type="text"
            placeholder="City"
            className={styles.customerInput}
            value={customerCity}
            onChange={(e) => setCustomerCity(e.target.value)}
          />

          <input
            type="text"
            placeholder="Gst number"
            className={styles.customerInput}
            value={customerGST}
            onChange={(e) => setCustomerGST(e.target.value)}
          />
        </div>

        {showCustomerDropdown && customerResults.length > 0 && (
          <div className={styles.customerDropdown}>
            {customerResults.map((c) => (
              <div
                key={c._id}
                className={styles.customerItem}
                onClick={() => selectCustomer(c)}
              >
                <span className={styles.customerName}>{c.name}</span>
                <span className={styles.customerPhone}>{c.phone}</span>

              </div>
            ))}
          </div>
        )}

        {selectedCustomer ? (
          <div className={styles.selectedCustomerTag}>
            Existing: {selectedCustomer.name} ({selectedCustomer.phone})
          </div>
        ) : (
          customerPhone.trim() &&
          customerName.trim() && (
            <div className={styles.newCustomerTag}>
              New customer will be created on save
            </div>
          )
        )}

        {selectedCustomer && (
          <div className={styles.customerSummary}>
            <div className={styles.customerSummaryItem}>
              <span>Loyalty points</span>
              <strong>{Number(availableLoyalty || 0)}</strong>
            </div>

            <div className={styles.customerSummaryItem}>
              <span>Total spend</span>
              <strong>
                ₹ {Number(customerTotalSpend || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>

            <div className={styles.customerSummaryItem}>
              <span>Total balance</span>
              <strong>
                ₹ {Number(customerPrevBalance || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className={styles.billBox}>
        <p className={styles.billBoxTitle}>Bill details</p>
        <div className={styles.billRow}>
          <span>Sub total</span>
          <span className={styles.billVal}>₹ {Number(previewSummary.subTotal || 0).toFixed(2)}</span>
        </div>
        <div className={styles.billRow}>
          <span>CGST</span>
          <span className={styles.billVal}>
            ₹ {Number(previewSummary.cgst || 0).toFixed(2)}
          </span>
        </div>

        <div className={styles.billRow}>
          <span>SGST</span>
          <span className={styles.billVal}>
            ₹ {Number(previewSummary.sgst || 0).toFixed(2)}
          </span>
        </div>
        <div className={styles.billRow}>
          <span>Tax</span>
          <span className={styles.billVal}>₹ {Number(previewSummary.totalGST || 0).toFixed(2)}</span>
        </div>
        <div className={styles.billRow}>
          <span>Offer price</span>
          <span className={styles.billVal}>
            ₹{" "}
            {Number(
              previewSummary.offerPrice ??
              previewSummary.offerAmount ??
              previewSummary.offerDiscount ??
              previewSummary.discountAmount ??
              0
            ).toFixed(2)}
          </span>
        </div>
        <div className={styles.totalBox}>
          <span>Total amount</span>

          <span>
            ₹ {Number(previewSummary.grandTotal ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.bottomActions}>
        <button
          className={styles.savePrintBtn}
          onClick={() => openPaymentModal(true)}
        >
          Save & print <kbd>[F6]</kbd>
        </button>
        <button
          className={styles.saveBtn}
          onClick={() => openPaymentModal(false)}
        >
          Save bill <kbd>[F7]</kbd>
        </button>
      </div>

    </div>
  );
}

export default POSRightPanel;