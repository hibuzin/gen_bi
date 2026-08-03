import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiShoppingBag,
  FiFileText,
  FiPackage,
  FiEye,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import styles from "./PurchaseReports.module.css";
import { API } from "../../constants/api";

function PurchaseReports() {
  const [purchaseLogs, setPurchaseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  useEffect(() => {
    fetchPurchaseReports();
  }, []);

  const fetchPurchaseReports = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(API.purchasereports, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch purchase reports"
        );
      }

      setPurchaseLogs(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (error) {
      console.error("Purchase report fetch error:", error);
      setPurchaseLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getPurchaseData = (log) => {
    return log?.newData || log?.oldData || {};
  };

  const getItems = (log) => {
    const purchaseData = getPurchaseData(log);

    return Array.isArray(purchaseData.items)
      ? purchaseData.items
      : [];
  };

  const getPurchaseAmount = (log) => {
    const items = getItems(log);

    return items.reduce((total, item) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const taxAmount = Number(item.taxAmount || 0);

      return total + qty * rate + taxAmount;
    }, 0);
  };

  const getTaxAmount = (log) => {
    return getItems(log).reduce(
      (total, item) =>
        total + Number(item.taxAmount || 0),
      0
    );
  };

  const getTotalQty = (log) => {
    return getItems(log).reduce(
      (total, item) => total + Number(item.qty || 0),
      0
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const filteredPurchaseLogs = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return purchaseLogs;
    }

    return purchaseLogs.filter((log) => {
      const purchaseData = getPurchaseData(log);

      const grnNo = String(
        purchaseData.grnNo || ""
      ).toLowerCase();

      const invoiceNo = String(
        purchaseData.invoiceNo || ""
      ).toLowerCase();

      const supplierName = String(
        purchaseData.supplierName || ""
      ).toLowerCase();

      const supplierGstNumber = String(
        purchaseData.supplierGstNumber || ""
      ).toLowerCase();

      const role = String(
        log.userId?.role || log.role || ""
      ).toLowerCase();

      const documentId = String(
        log.documentId || ""
      ).toLowerCase();

      const itemMatched = getItems(log).some((item) =>
        String(item.itemName || "")
          .toLowerCase()
          .includes(searchValue)
      );

      return (
        grnNo.includes(searchValue) ||
        invoiceNo.includes(searchValue) ||
        supplierName.includes(searchValue) ||
        supplierGstNumber.includes(searchValue) ||
        role.includes(searchValue) ||
        documentId.includes(searchValue) ||
        itemMatched
      );
    });
  }, [purchaseLogs, search]);

  const reportSummary = useMemo(() => {
    const validPurchases = filteredPurchaseLogs.filter(
      (log) => getPurchaseData(log).grnNo
    );

    const totalPurchaseAmount = validPurchases.reduce(
      (total, log) => total + getPurchaseAmount(log),
      0
    );

    const totalItems = validPurchases.reduce(
      (total, log) => total + getItems(log).length,
      0
    );

    return {
      totalPurchases: validPurchases.length,
      totalPurchaseAmount,
      totalItems,
    };
  }, [filteredPurchaseLogs]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Purchase Reports</h2>
          <p className={styles.headerDescription}>
            View purchase audit history and supplier details
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={fetchPurchaseReports}
          disabled={loading}
        >
          <FiRefreshCw
            className={loading ? styles.rotating : ""}
          />
          Refresh
        </button>
      </div>

      <div className={styles.cardsRow}>
        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div
              className={`${styles.cardTitle} ${styles.purchaseCard}`}
            >
              <FiShoppingBag />
              <p>Total Purchases</p>
            </div>
          </div>

          <h2>{reportSummary.totalPurchases}</h2>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div
              className={`${styles.cardTitle} ${styles.amountCard}`}
            >
              <FiFileText />
              <p>Total Purchase Amount</p>
            </div>
          </div>

          <h2>
            {formatCurrency(
              reportSummary.totalPurchaseAmount
            )}
          </h2>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.cardRow}>
            <div
              className={`${styles.cardTitle} ${styles.itemsCard}`}
            >
              <FiPackage />
              <p>Total Items</p>
            </div>
          </div>

          <h2>{reportSummary.totalItems}</h2>
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FiSearch />

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search GRN, invoice, supplier or item"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className={styles.reportCount}>
          {filteredPurchaseLogs.length} Records
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>GRN No</th>
              <th>Invoice No</th>
              <th>GRN Date</th>
              <th>Supplier Name</th>
              <th>Supplier GST</th>
              <th>Items</th>
              <th>Total Qty</th>
              <th>Tax Amount</th>
              <th>Purchase Amount</th>
              <th>Created By</th>
              <th>Created Date</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner} />
                    <p>Loading purchase reports...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPurchaseLogs.length === 0 ? (
              <tr>
                <td colSpan="13">
                  <div className={styles.emptyState}>
                    No purchase reports found
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchaseLogs.map((log, index) => {
                const purchaseData = getPurchaseData(log);
                const items = getItems(log);

                return (
                  <tr
                    key={log._id}
                    onClick={() =>
                      setSelectedPurchase(log)
                    }
                  >
                    <td>{index + 1}</td>

                    <td>
                      <span className={styles.grnNumber}>
                        {purchaseData.grnNo || "-"}
                      </span>
                    </td>

                    <td>
                      {purchaseData.invoiceNo || "-"}
                    </td>

                    <td>
                      {formatDate(purchaseData.grnDate)}
                    </td>

                    <td>
                      <div className={styles.supplierCell}>
                        <span>
                          {purchaseData.supplierName || "-"}
                        </span>

                        <small>
                          {purchaseData.placeOfSupply ||
                            "No place of supply"}
                        </small>
                      </div>
                    </td>

                    <td>
                      {purchaseData.supplierGstNumber ||
                        "-"}
                    </td>

                    <td>{items.length}</td>

                    <td>{getTotalQty(log)}</td>

                    <td>
                      {formatCurrency(getTaxAmount(log))}
                    </td>

                    <td>
                      <span className={styles.amountText}>
                        {formatCurrency(
                          getPurchaseAmount(log)
                        )}
                      </span>
                    </td>

                    <td>
                      <span className={styles.roleBadge}>
                        {log.userId?.role ||
                          log.role ||
                          "-"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.dateCell}>
                        <span>
                          {formatDate(log.createdAt)}
                        </span>

                        <small>
                          {formatTime(log.createdAt)}
                        </small>
                      </div>
                    </td>

                    <td
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <div className={styles.menuWrapper}>
                        <button
                          type="button"
                          className={styles.menuBtn}
                          onClick={() =>
                            setSelectedPurchase(log)
                          }
                          title="View purchase"
                        >
                          <FiEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedPurchase && (
        <PurchaseDetailsModal
          log={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatTime={formatTime}
          getPurchaseData={getPurchaseData}
          getPurchaseAmount={getPurchaseAmount}
          getTaxAmount={getTaxAmount}
          getTotalQty={getTotalQty}
          getItems={getItems}
        />
      )}
    </div>
  );
}

function PurchaseDetailsModal({
  log,
  onClose,
  formatCurrency,
  formatDate,
  formatTime,
  getPurchaseData,
  getPurchaseAmount,
  getTaxAmount,
  getTotalQty,
  getItems,
}) {
  const purchaseData = getPurchaseData(log);
  const items = getItems(log);

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={onClose}
    >
      <div
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className={styles.modalHeader}>
          <div>
            <h3>Purchase Details</h3>

            <p className={styles.modalSubTitle}>
              {purchaseData.grnNo ||
                "Purchase audit record"}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailsGrid}>
            <DetailField
              label="GRN Number"
              value={purchaseData.grnNo || "-"}
            />

            <DetailField
              label="Invoice Number"
              value={purchaseData.invoiceNo || "-"}
            />

            <DetailField
              label="GRN Date"
              value={formatDate(purchaseData.grnDate)}
            />

            <DetailField
              label="Supplier Name"
              value={purchaseData.supplierName || "-"}
            />

            <DetailField
              label="Supplier GST Number"
              value={
                purchaseData.supplierGstNumber || "-"
              }
            />

            <DetailField
              label="Place of Supply"
              value={
                purchaseData.placeOfSupply || "-"
              }
            />

            <DetailField
              label="Action"
              value={log.action || "-"}
            />

            <DetailField
              label="Created By"
              value={
                log.userId?.role || log.role || "-"
              }
            />

            <DetailField
              label="Created Date"
              value={formatDate(log.createdAt)}
            />

            <DetailField
              label="Created Time"
              value={formatTime(log.createdAt)}
            />

            <DetailField
              label="Document ID"
              value={log.documentId || "-"}
              full
            />
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.sectionHeader}>
              <h4>Purchase Items</h4>

              <span>{items.length} Items</span>
            </div>

            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Item Name</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>MRP</th>
                    <th>GST</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>Tax Amount</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="12">
                        <div
                          className={
                            styles.modalEmptyState
                          }
                        >
                          No purchase item details
                          available
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const itemAmount =
                        Number(item.qty || 0) *
                          Number(item.rate || 0) +
                        Number(item.taxAmount || 0);

                      return (
                        <tr
                          key={`${item.itemName}-${index}`}
                        >
                          <td>{index + 1}</td>
                          <td>{item.itemName || "-"}</td>
                          <td>{item.hsnCode || "-"}</td>
                          <td>{item.qty ?? 0}</td>
                          <td>{item.unit || "-"}</td>
                          <td>
                            {formatCurrency(
                              item.rate || 0
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              item.mrp || 0
                            )}
                          </td>
                          <td>{item.gst ?? 0}%</td>
                          <td>{item.cgst ?? 0}%</td>
                          <td>{item.sgst ?? 0}%</td>
                          <td>
                            {formatCurrency(
                              item.taxAmount || 0
                            )}
                          </td>
                          <td>
                            {formatCurrency(itemAmount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.summarySection}>
            <div className={styles.summaryRow}>
              <span>Total Items</span>
              <strong>{items.length}</strong>
            </div>

            <div className={styles.summaryRow}>
              <span>Total Quantity</span>
              <strong>{getTotalQty(log)}</strong>
            </div>

            <div className={styles.summaryRow}>
              <span>Total Tax Amount</span>
              <strong>
                {formatCurrency(getTaxAmount(log))}
              </strong>
            </div>

            <div
              className={`${styles.summaryRow} ${styles.grandTotalRow}`}
            >
              <span>Total Purchase Amount</span>
              <strong>
                {formatCurrency(
                  getPurchaseAmount(log)
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  full = false,
}) {
  return (
    <div
      className={`${styles.detailField} ${
        full ? styles.fullField : ""
      }`}
    >
      <label>{label}</label>
      <p title={String(value)}>{value}</p>
    </div>
  );
}

export default PurchaseReports;