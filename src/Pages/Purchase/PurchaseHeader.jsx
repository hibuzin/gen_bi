import { useState } from "react";
import styles from "./PurchaseHeader.module.css";

function PurchaseHeader({
  suppliers,
  form,
  setForm,
  handleChange,
  purchaseTotals,
}) {
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierList, setShowSupplierList] = useState(false);

  const [supplierDetails, setSupplierDetails] = useState({
    name: "",
    number: "",
    address: "",
    gstNumber: "",
  });

  const filteredSuppliers = suppliers.filter((s) =>
    (s.supplierName || s.name || "")
      .toLowerCase()
      .includes(supplierSearch.toLowerCase())
  );

  const handleSupplierSelect = (supplier) => {
    setSupplierSearch(
      supplier.supplierName ||
      supplier.name ||
      ""
    );

    setSupplierDetails({
      name:
        supplier.supplierName ||
        supplier.name ||
        "",

      number:
        supplier.phone ||
        supplier.mobile ||
        supplier.supplierPhone ||
        "",

      address:
        supplier.address ||
        "",

      gstNumber:
        supplier.gstNumber ||
        "",
    });

    setForm((prev) => ({
      ...prev,
      supplierId:
        supplier._id ||
        supplier.id ||
        "",
    }));

    setShowSupplierList(false);
  };

  const handleSupplierSearchChange = (e) => {
    const value = e.target.value;

    setSupplierSearch(value);
    setShowSupplierList(true);

    // User manually changes supplier name,
    // so clear previous selected supplier.
    setSupplierDetails({
      name: "",
      number: "",
      address: "",
      gstNumber: "",
    });

    setForm((prev) => ({
      ...prev,
      supplierId: "",
    }));
  };

  return (
    <div className={styles.headerSection}>

      {/* LEFT - SUPPLIER DETAILS */}
      <div className={styles.billFrom}>
        <div className={styles.supplierDetailsGrid}>

          {/* SUPPLIER NAME */}
          <div className={styles.supplierDetailField}>
            <label>Name</label>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={supplierSearch}
                placeholder="Search supplier"
                onFocus={() =>
                  setShowSupplierList(true)
                }
                onChange={
                  handleSupplierSearchChange
                }
              />

              {showSupplierList &&
                supplierSearch && (
                  <div
                    className={
                      styles.supplierDropdown
                    }
                  >
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(
                        (supplier) => (
                          <div
                            key={
                              supplier._id ||
                              supplier.id
                            }
                            className={
                              styles.supplierOption
                            }
                            onMouseDown={(e) => {
                              // Prevent input blur before selection.
                              e.preventDefault();

                              handleSupplierSelect(
                                supplier
                              );
                            }}
                          >
                            <div
                              className={
                                styles.supplierName
                              }
                            >
                              {supplier.supplierName ||
                                supplier.name ||
                                ""}
                            </div>

                            <div
                              className={
                                styles.supplierSub
                              }
                            >
                              {supplier.phone ||
                                supplier.mobile ||
                                supplier.supplierPhone ||
                                "No number"}

                              {" • "}

                              {supplier.gstNumber ||
                                "No GST"}
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <div
                        className={
                          styles.noSupplier
                        }
                      >
                        No supplier found
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* NUMBER */}
          <div className={styles.supplierDetailField}>
            <label>Number</label>

            <input
              type="text"
              value={supplierDetails.number}
              readOnly
            />
          </div>

          {/* ADDRESS */}
          <div className={styles.supplierDetailField}>
            <label>Address</label>

            <input
              type="text"
              value={supplierDetails.address}
              readOnly
            />
          </div>

          {/* GST NUMBER */}
          <div className={styles.supplierDetailField}>
            <label>Gst no</label>

            <input
              type="text"
              value={supplierDetails.gstNumber}
              readOnly
            />
          </div>

        </div>
      </div>

      {/* RIGHT - INVOICE DETAILS */}
      <div className={styles.invoiceMeta}>

        {/* ROW 1 */}
        <div className={styles.metaRow}>

          <div className={styles.metaField}>
            <label>Purchase inv date</label>

            <input
              type="date"
              name="invoiceDate"
              value={form.invoiceDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className={styles.metaField}>
            <label>Invoice Amount</label>

            <input
              type="text"
              name="invoiceAmount"
              value={form.invoiceAmount || ""}
              onChange={handleChange}
              placeholder="Enter invoice amount"
            />
          </div>

        </div>

        {/* ROW 2 */}
        <div className={styles.metaRow}>

          <div className={styles.metaField}>
            <label>Purchase inv number</label>

            <input
              type="text"
              name="invoiceNo"
              value={form.invoiceNo || ""}
              onChange={handleChange}
              placeholder="INV-1235"
            />
          </div>

          <div className={styles.metaField}>
            <label>Grn date</label>

            <input
              type="date"
              name="grnDate"
              value={form.grnDate || ""}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* ROW 3 */}
        <div className={styles.metaRow}>

          <div className={styles.metaField}>
            <label>Grn amount</label>

            <input
              type="text"
              value={Number(
                purchaseTotals?.supplierBillAmount || 0
              ).toFixed(2)}
              readOnly
            />
          </div>

          <div className={styles.metaField}>
            <label>Due date</label>

            <input
              type="date"
              name="dueDate"
              value={form.dueDate || ""}
              onChange={handleChange}
            />
          </div>

        </div>

      </div>

    </div>
  );
}

export default PurchaseHeader;