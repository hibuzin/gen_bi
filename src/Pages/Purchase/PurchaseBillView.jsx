import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./PurchaseBillView.module.css";
import { API } from "../../constants/api";

function PurchaseBillView() {
  const { supplierId, purchaseId } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(API.purchaseById(purchaseId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load purchase");
      }

      setBill(data.data);
      setEditBill(JSON.parse(JSON.stringify(data.data)));
    } catch (err) {
      console.error("Fetch purchase error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toInputDate = (value) => {
    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (/^\d{2}[.-]\d{2}[.-]\d{4}$/.test(value)) {
      const [day, month, year] = value.split(/[.-]/);
      return `${year}-${month}-${day}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDDMMYYYYDot = (value) => {
    if (!value) return "";

    const inputDate = toInputDate(value);

    if (!inputDate) return "";

    const [year, month, day] = inputDate.split("-");

    return `${day}.${month}.${year}`;
  };

  const updateBillField = (field, value) => {
    setEditBill((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateItemField = (index, field, value) => {
    setEditBill((prev) => {
      const items = [...(prev.items || [])];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...prev,
        items,
      };
    });
  };

  // fetch supplier 
  const fetchSuppliers = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(API.suppliers, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok && data.success) {
      setSuppliers(data.data || []);
    }
  } catch (err) {
    console.error("Supplier fetch error:", err);
  }
};

const handleSupplierSelect = (supplier) => {
  setEditBill((prev) => ({
    ...prev,

    supplierId: supplier._id,

    supplier: {
      ...prev.supplier,
      id: supplier._id,
      _id: supplier._id,
      name:
        supplier.supplierName ||
        supplier.name ||
        "",
      mobile:
        supplier.mobile ||
        supplier.phone ||
        "",
      email: supplier.email || "",
    },
  }));

  setSupplierSearch(
    supplier.supplierName ||
    supplier.name ||
    ""
  );

  setShowSupplierDropdown(false);
};

  const startEdit = () => {
  const clonedBill = JSON.parse(JSON.stringify(bill));

  setEditBill(clonedBill);

  setSupplierSearch(
    clonedBill.supplier?.name ||
    clonedBill.supplierName ||
    ""
  );

  fetchSuppliers();

  setIsEditing(true);
};

  const cancelEdit = () => {
    setEditBill(JSON.parse(JSON.stringify(bill)));
    setIsEditing(false);
  };

  const saveBillEdit = async () => {
    if (!editBill) return;

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const resolvedSupplierId =
  editBill.supplierId ||
  editBill.supplier?._id ||
  editBill.supplier?.id ||
  supplierId;

      if (!resolvedSupplierId) {
        throw new Error("Supplier id missing");
      }

      const payload = {
        supplierId: resolvedSupplierId,

        invoiceNo: editBill.invoiceNo || "",

        invoiceDate: toInputDate(editBill.invoiceDate),

        invoiceAmount: Number(editBill.invoiceAmount || 0),

        grnDate: formatDDMMYYYYDot(editBill.grnDate),

        supplierBillAmount: Number(
          editBill.supplierBillAmount || 0
        ),

        paidAmount: Number(editBill.paidAmount || 0),

        freightCharge: Number(
          editBill.freightCharge || 0
        ),

        packagingCharge: Number(
          editBill.packagingCharge || 0
        ),

        billDiscountPercent: Number(
          editBill.billDiscountPercent || 0
        ),

        billDiscountAmount: Number(
          editBill.billDiscountAmount || 0
        ),

        items: (editBill.items || []).map((item) => ({
          productId:
            item.productId?._id ||
            item.productId,

          qty: Number(item.qty || 0),

          freeQty: Number(item.freeQty || 0),

          netcost: Number(item.netcost || 0),

          sellingPrice: Number(item.sellingPrice || 0),

          mrp: Number(item.mrp || 0),

          barcode: item.barcode || "",

          unitValue: Number(item.unitValue || 1),

          qtyType: item.qtyType || "unit",

          isGstIncluded: item.isGstIncluded !== false,
        })),
      };

      console.log("PURCHASE UPDATE PAYLOAD:", payload);

      const res = await fetch(
        API.purchaseById(purchaseId),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      console.log("PURCHASE UPDATE RESPONSE:", data);

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update purchase"
        );
      }

      setBill(data.data);
      setEditBill(
        JSON.parse(JSON.stringify(data.data))
      );

      setIsEditing(false);

      alert(
        data.message || "Purchase updated successfully"
      );
    } catch (err) {
      console.error("Update purchase error:", err);
      alert(err.message || "Failed to update purchase");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!bill) {
    return <div style={{ padding: 40 }}>Bill not found</div>;
  }

  const displayItems =
    isEditing
      ? editBill?.items || []
      : bill.items || [];

  return (
    <div className={styles.page}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          ← Purchase Bill
        </button>

        <div className={styles.topActions}>
          {!isEditing ? (
            <>
              <button
                className={styles.outlineBtn}
                onClick={startEdit}
              >
                ✏ Edit
              </button>

              <button
                className={styles.outlineBtn}
                onClick={() => window.print()}
              >
                🖨 Print
              </button>

              <button className={styles.outlineBtn}>
                ⬇ Download PDF
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.outlineBtn}
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className={styles.saveBtn}
                onClick={saveBillEdit}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* BILL */}
      <div className={styles.billWrap}>
        <div className={styles.invoice}>
          {/* HEADER */}
          <div className={styles.billHeaderInfo}>
            <div className={styles.billFrom}>
  {isEditing ? (
    <div className={styles.supplierEditBox}>
      <label>Supplier</label>

      <div className={styles.supplierSearchWrap}>
        <input
          type="text"
          className={styles.editInput}
          value={supplierSearch}
          placeholder="Search supplier..."
          onFocus={() => setShowSupplierDropdown(true)}
          onChange={(e) => {
            setSupplierSearch(e.target.value);
            setShowSupplierDropdown(true);
          }}
        />

        {showSupplierDropdown && (
          <div className={styles.supplierDropdown}>
            {suppliers
              .filter((supplier) => {
                const search =
                  supplierSearch.toLowerCase();

                const name = (
                  supplier.supplierName ||
                  supplier.name ||
                  ""
                ).toLowerCase();

                const mobile = String(
                  supplier.mobile ||
                  supplier.phone ||
                  ""
                );

                return (
                  name.includes(search) ||
                  mobile.includes(search)
                );
              })
              .map((supplier) => (
                <div
                  key={supplier._id}
                  className={styles.supplierOption}
                  onClick={() =>
                    handleSupplierSelect(supplier)
                  }
                >
                  <strong>
                    {supplier.supplierName ||
                      supplier.name}
                  </strong>

                  <span>
                    {supplier.mobile ||
                      supplier.phone ||
                      ""}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <p>
        {editBill?.supplier?.mobile ||
          editBill?.supplierMobile ||
          "-"}
      </p>

      {editBill?.supplier?.email && (
        <p>{editBill.supplier.email}</p>
      )}
    </div>
  ) : (
    <>
      <h3>
        {bill.supplier?.name ||
          bill.supplierName ||
          "-"}
      </h3>

      <p>
        {bill.supplier?.mobile ||
          bill.supplierMobile ||
          "-"}
      </p>

      {bill.supplier?.email && (
        <p>{bill.supplier.email}</p>
      )}
    </>
  )}
</div>

            <div className={styles.invoiceInfo}>
              <div>
                <span>Invoice No</span>

                {isEditing ? (
                  <input
                    className={styles.editInput}
                    type="text"
                    value={editBill?.invoiceNo || ""}
                    onChange={(e) =>
                      updateBillField(
                        "invoiceNo",
                        e.target.value
                      )
                    }
                  />
                ) : (
                  <b>{bill.invoiceNo || "-"}</b>
                )}
              </div>

              <div>
                <span>Invoice Date</span>

                {isEditing ? (
                  <input
                    className={styles.editInput}
                    type="date"
                    value={toInputDate(
                      editBill?.invoiceDate
                    )}
                    onChange={(e) =>
                      updateBillField(
                        "invoiceDate",
                        e.target.value
                      )
                    }
                  />
                ) : (
                  <b>{bill.invoiceDate || "-"}</b>
                )}
              </div>

              <div>
                <span>GRN No</span>
                <b>{bill.grnNo || "-"}</b>
              </div>

              <div>
                <span>GRN Date</span>

                {isEditing ? (
                  <input
                    className={styles.editInput}
                    type="date"
                    value={toInputDate(
                      editBill?.grnDate
                    )}
                    onChange={(e) =>
                      updateBillField(
                        "grnDate",
                        e.target.value
                      )
                    }
                  />
                ) : (
                  <b>{bill.grnDate || "-"}</b>
                )}
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* EDIT PURCHASE DETAILS */}
          {isEditing && (
            <div className={styles.editTotals}>
              <label>
                Invoice Amount
                <input
                  type="number"
                  value={
                    editBill?.invoiceAmount ?? ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "invoiceAmount",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Supplier Bill Amount
                <input
                  type="number"
                  value={
                    editBill?.supplierBillAmount ??
                    ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "supplierBillAmount",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Paid Amount
                <input
                  type="number"
                  value={
                    editBill?.paidAmount ?? ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "paidAmount",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Freight Charge
                <input
                  type="number"
                  value={
                    editBill?.freightCharge ?? ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "freightCharge",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Packaging Charge
                <input
                  type="number"
                  value={
                    editBill?.packagingCharge ?? ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "packagingCharge",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Bill Discount %
                <input
                  type="number"
                  value={
                    editBill?.billDiscountPercent ??
                    ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "billDiscountPercent",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Bill Discount Amount
                <input
                  type="number"
                  value={
                    editBill?.billDiscountAmount ??
                    ""
                  }
                  onChange={(e) =>
                    updateBillField(
                      "billDiscountAmount",
                      e.target.value
                    )
                  }
                />
              </label>
            </div>
          )}

          {/* ITEMS TABLE */}
          <div className={styles.tableWrapper}>
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
                {displayItems.map((item, i) => (
                  <tr key={item._id || i}>
                    <td>{i + 1}</td>

                    {/* BARCODE */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="text"
                          value={
                            item.barcode || ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "barcode",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        item.barcode || "—"
                      )}
                    </td>

                    {/* PRODUCT NAME */}
                    <td
                      className={styles.itemName}
                    >
                      {item.productName || "-"}
                    </td>

                    {/* DISCOUNT % */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          value={
                            item.discountPercent ??
                            ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "discountPercent",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        `${Number(
                          item.discountPercent || 0
                        ).toFixed(2)}%`
                      )}
                    </td>

                    {/* DISCOUNT AMOUNT */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          value={
                            item.discountAmount ??
                            ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "discountAmount",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        `₹${Number(
                          item.discountAmount || 0
                        ).toFixed(2)}`
                      )}
                    </td>

                    {/* RATE */}
                    <td>
                      ₹
                      {Number(
                        item.Rate ||
                        item.rate ||
                        0
                      ).toFixed(2)}
                    </td>

                    {/* MRP */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          value={item.mrp ?? ""}
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "mrp",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        `₹${Number(
                          item.mrp || 0
                        ).toFixed(2)}`
                      )}
                    </td>

                    {/* SELLING PRICE */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          value={
                            item.sellingPrice ?? ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "sellingPrice",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        `₹${Number(
                          item.sellingPrice || 0
                        ).toFixed(2)}`
                      )}
                    </td>

                    {/* ROI */}
                    <td>
                      {Number(
                        item.roiPercent || 0
                      ).toFixed(2)}
                      %
                    </td>

                    {/* PROFIT */}
                    <td>
                      {Number(
                        item.profitPercent || 0
                      ).toFixed(2)}
                      %
                    </td>

                    {/* TAX */}
                    <td>
                      ₹
                      {Number(
                        item.taxAmount || 0
                      ).toFixed(2)}
                    </td>

                    {/* NET COST */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          value={
                            item.netcost ?? ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "netcost",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        `₹${Number(
                          item.netcost || 0
                        ).toFixed(2)}`
                      )}
                    </td>

                    {/* AMOUNT */}
                    <td>
                      ₹
                      {Number(
                        item.amount || 0
                      ).toFixed(2)}
                    </td>

                    {/* QTY */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.qty ?? ""}
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "qty",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <>
                          {item.qty || 0}{" "}
                          {item.unit || ""}
                          {item.unitValue
                            ? ` (${item.unitValue})`
                            : ""}
                        </>
                      )}
                    </td>

                    {/* FREE */}
                    <td>
                      {isEditing ? (
                        <input
                          className={
                            styles.tableInput
                          }
                          type="number"
                          min="0"
                          value={
                            item.freeQty ?? ""
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "freeQty",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        item.freeQty || 0
                      )}
                    </td>

                    {/* TOTAL */}
                    <td>
                      ₹
                      {Number(
                        item.netAmount ||
                        item.totalCostWithGST ||
                        0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.divider} />

          {/* TOTALS */}
          <div className={styles.totalsWrap}>
            <div className={styles.totalsRight}>
              <div className={styles.totalRow}>
                <span>Gross Amount</span>
                <span>
                  ₹{" "}
                  {Number(
                    bill.totalGrossAmount || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div className={styles.totalRow}>
                <span>Tax Amount</span>

                <span>
                  ₹{" "}
                  {Number(
                    bill.totalTaxAmount ||
                    (bill.items || []).reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.taxAmount || 0
                        ),
                      0
                    )
                  ).toFixed(2)}
                </span>
              </div>

              <div
                className={`${styles.totalRow} ${styles.grandTotal}`}
              >
                <span>Total Amount</span>
                <span>
                  ₹{" "}
                  {Number(
                    bill.totalAmount || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div className={styles.totalRow}>
                <span>Paid Amount</span>
                <span>
                  ₹{" "}
                  {Number(
                    bill.paidAmount || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div className={styles.totalRow}>
                <span>Balance</span>
                <span>
                  ₹{" "}
                  {Number(
                    bill.balanceAmount || 0
                  ).toFixed(2)}
                </span>
              </div>

              <div className={styles.totalRow}>
                <span>Status</span>

                <span>
                  {bill.paymentStatus || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseBillView;