import {
  useEffect,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaRupeeSign,
} from "react-icons/fa";
import Toast from "../../components/Toast";
import styles from "./PurchaseList.module.css";
import { API } from "../../constants/api";

function PurchaseList() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPurchase, setEditPurchase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({
    top: -10,
    left: -10,
  });
  const [loading, setLoading] = useState(true);
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;

    const [day, month, year] = dueDate.split("-").map(Number);

    const due = new Date(year, month - 1, day);
    due.setHours(23, 59, 59, 999); // full due day allow

    return new Date() > due;
  };

  const navigate = useNavigate();


  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API.purchase}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setPurchases(data.data || []);
      }
    } catch (err) {
      console.log(err);
      setToast({ type: "error", message: "Failed to load purchases" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API.suppliers, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSuppliers(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API.products}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async () => {
    try {
      setLoadingId(deleteId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API.purchase}/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPurchases((prev) => prev.filter((p) => p._id !== deleteId));
        setToast({ type: "success", message: "Purchase deleted successfully" });
      } else {
        setToast({ type: "error", message: data.message || "Delete failed" });
      }
    } catch (err) {
      console.log(err);
      setToast({ type: "error", message: "Delete failed" });
    } finally {
      setLoadingId(null);
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const openEditModal = (purchase) => {
    setEditPurchase({
      ...purchase,
      supplierId: purchase.supplier?.id || purchase.supplierId || "",
      items: purchase.items.map((item) => ({ ...item })),
    });
    setShowEditModal(true);
    document.body.style.overflow = "hidden";
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    document.body.style.overflow = "auto";
  };

  const getProductOptions = () =>
    products.map((p) => ({ value: p._id, label: p.name, product: p }));

  const getSupplierOptions = () =>
    suppliers.map((s) => ({
      value: s._id,
      label: s.supplierName,
      supplier: s,
    }));

  const getFlavorOptions = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return [];
    return (product.flavor || []).map((f) => ({ value: f, label: f }));
  };

  const getLiterOptions = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return [];
    const liters = product.liters || product.litters || [];
    const mrps = product.mrps || [];
    return liters.map((l, i) => ({
      value: l,
      label: l,
      mrp: mrps[i] || 0,
    }));
  };

  const getMrpOptions = (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return [];
    return (product.mrps || []).map((m) => ({ value: m, label: `Rs. ${m}` }));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...editPurchase.items];
    updatedItems[index][field] = value;
    setEditPurchase({ ...editPurchase, items: updatedItems });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const payload = {
        supplierId: editPurchase.supplierId,
        invoiceNo: editPurchase.invoiceNo,
        invoiceDate: editPurchase.invoiceDate,
        items: editPurchase.items.map((item) => ({
          productId: item.productId?._id || item.productId,
          flavor: item.flavor,
          liters: item.litters || item.liters,
          mrp: Number(item.mrp),
          qty: Number(item.qty),
          costPrice: Number(item.costPrice),
          sellingPrice: Number(item.sellingPrice),
          barcode: item.barcode || "",
        })),
      };
      const res = await fetch(`${API.purchase}/${editPurchase._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setToast({ type: "success", message: "Purchase updated successfully" });
      fetchPurchases();
      closeEditModal();
    } catch (err) {
      console.log(err);
      setToast({ type: "error", message: err.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const balance = Number(p.balanceAmount || 0);
    const paid = Number(p.paidAmount || 0);

    const status =
      balance === 0
        ? "paid"
        : paid > 0
          ? "pending"
          : "unpaid";

    if (statusFilter === "all") return true;

    if (statusFilter === "paid") {
      return status === "paid" || status === "pending";
    }

    if (statusFilter === "unpaid") {
      return status === "unpaid" || status === "pending";
    }

    return true;
  });


  return (
    <div className={styles.container}>
      {toast && <Toast {...toast} />}

      {/* HEADER */}
      <div className={styles.header}>

        {/* LEFT */}
        <div>
          <h2 className={styles.title}>Purchase list</h2>
          <p className={styles.count}>
            Total purchases: {purchases.length}
          </p>
        </div>

        {/* RIGHT */}
        <div className={styles.headerActions}>

          <button
            className={styles.headerBtn}
            onClick={() => navigate("/create-supplier")}
          >
            Create supplier
          </button>

          <button
            className={styles.headerBtn}
            onClick={() => navigate("/create-purchase")}
          >
            Create purchase
          </button>

        </div>

      </div>

      {/* SUMMARY CARDS */}
      <div className={styles.cardsRow}>

        <div
          className={`${styles.infoCard} ${statusFilter === "all" ? styles.activeCard : ""
            }`}
          onClick={() => setStatusFilter("all")}
        >
          <div className={styles.cardTitle}>
            <div className={styles.cardTitle}>
              <FaRupeeSign className={styles.cardIcon} />
              <p>Total purchase</p>
            </div>
          </div>

          <h2>
            <FaRupeeSign className={styles.rupeeIcon} />
            {purchases
              .reduce(
                (sum, p) =>
                  sum + Number(p.totalAmount || p.supplierBillAmount || 0),
                0
              )
              .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </h2>
        </div>

        <div
          className={`${styles.infoCard} ${statusFilter === "paid" ? styles.activeCard : ""
            }`}
          onClick={() => setStatusFilter("paid")}
        >
          <div className={styles.cardTitle}>
            <div className={styles.cardTitle}>
              <FaRupeeSign className={styles.collectIcon} />
              <p>Paid</p>
            </div>
          </div>

          <h2>
            <FaRupeeSign className={styles.rupeeIcon} />
            {purchases
              .reduce(
                (sum, p) => sum + Number(p.paidAmount || 0),
                0
              )
              .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </h2>
        </div>

        <div
          className={`${styles.infoCard} ${statusFilter === "unpaid" ? styles.activeCard : ""
            }`}
          onClick={() => setStatusFilter("unpaid")}
        >
          <div className={styles.cardTitle}>
            <div className={styles.cardTitle}>
              <FaRupeeSign className={styles.payIcon} />
              <p>Unpaid</p>
            </div>
          </div>

          <h2>
            <FaRupeeSign className={styles.rupeeIcon} />
            {purchases
              .reduce(
                (sum, p) => sum + Number(p.balanceAmount || 0),
                0
              )
              .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </h2>
        </div>

      </div>

      {/* TABLE */}
      <div
        className={styles.tableWrapper}
        onScroll={() => setOpenMenu(null)}
        onWheel={() => setOpenMenu(null)}
        onTouchMove={() => setOpenMenu(null)}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Date</th>
              <th>Invoice no</th>
              <th>Supplier</th>
              <th>Total</th>
              <th>Due date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.loaderRow}>
                <td colSpan="8">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading purchases...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className={styles.emptyState}>
                    No purchases found
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p, index) => (
                <tr
                  key={p._id}
                  className={styles.tableRow}
                  onClick={() =>
                    navigate(`/purchase-bill/${p.supplier?.id || p.supplierId}/${p._id}`)
                  }
                >
                  <td>{index + 1}</td>
                  <td>
                    {p.invoiceDate
                      ? new Date(p.invoiceDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{p.invoiceNo}</td>
                  <td>{p.supplier?.name || "-"}</td>
                  <td>
                    Rs. {Number(p.supplierBillAmount || 0).toFixed(2)}
                  </td>
                  <td>
                    <span
                      className={
                        Number(p.balanceAmount || 0) === 0
                          ? styles.normalDate
                          : isOverdue(p.DueDate)
                            ? styles.overdueBadge
                            : styles.normalDate
                      }
                    >
                      {p.DueDate || "-"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${Number(p.balanceAmount || 0) === 0
                        ? styles.paidStatus
                        : Number(p.paidAmount || 0) > 0
                          ? styles.pendingStatus
                          : styles.unpaidStatus
                        }`}
                    >
                      {Number(p.balanceAmount || 0) === 0
                        ? "Paid"
                        : Number(p.paidAmount || 0) > 0
                          ? "Pending"
                          : "Unpaid"}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div
                      className={styles.menuWrapper}
                      ref={
                        openMenu === p._id
                          ? menuRef
                          : null
                      }
                    >
                      <button
                        className={styles.menuBtn}
                        onClick={(e) => {
                          e.stopPropagation();

                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 90;
                          const spaceBelow = window.innerHeight - rect.bottom;

                          setMenuPosition({
                            top:
                              spaceBelow < menuHeight
                                ? rect.top - menuHeight - 6
                                : rect.bottom + 6,
                            left: rect.right - 140,
                          });

                          setOpenMenu(openMenu === p._id ? null : p._id);
                        }}
                      >
                        <FaEllipsisV />
                      </button>

                      {openMenu === p._id && (
                        <div
                          className={styles.dropdownMenu}
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={styles.editMenuItem}
                            onClick={() => {
                              openEditModal(p);
                              setOpenMenu(null);
                            }}
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            className={styles.deleteMenuItem}
                            onClick={() => {
                              setDeleteId(p._id);
                              setShowDeleteModal(true);
                              setOpenMenu(null);
                            }}
                          >
                            <FaTrash />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
          </tbody>
        </table>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <h3>Delete purchase?</h3>
            <p>Are you sure you want to delete this purchase?</p>
            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}
              >
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editPurchase && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>

            {/* HEADER */}
            <div className={styles.modalHeader}>
              <h3>Edit Purchase</h3>
              <button className={styles.closeBtn} onClick={closeEditModal}>x</button>
            </div>

            {/* BODY */}
            <div className={styles.modalBody}>

              {/*  Purchase-level fields OUTSIDE the items loop */}
              <div className={styles.editCard}>
                <div className={styles.modalGrid}>

                  {/* SUPPLIER */}
                  <div className={styles.field}>
                    <label>Supplier</label>
                    <Select
                      options={getSupplierOptions()}
                      value={
                        getSupplierOptions().find(
                          (s) => s.value === editPurchase.supplierId
                        ) || null
                      }
                      onChange={(selected) =>
                        setEditPurchase({ ...editPurchase, supplierId: selected?.value })
                      }
                      placeholder="Select Supplier"
                    />
                  </div>

                  {/* INVOICE */}
                  <div className={styles.field}>
                    <label>Invoice No</label>
                    <input
                      type="text"
                      value={editPurchase.invoiceNo || ""}
                      onChange={(e) =>
                        setEditPurchase({ ...editPurchase, invoiceNo: e.target.value })
                      }
                    />
                  </div>



                  {/* DATE */}
                  <div className={styles.field}>
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      value={
                        editPurchase.invoiceDate
                          ? editPurchase.invoiceDate.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditPurchase({ ...editPurchase, invoiceDate: e.target.value })
                      }
                    />
                  </div>

                </div>
              </div>

              {/* Items loop — only item-specific fields here */}
              {editPurchase.items?.map((item, index) => (
                <div key={index} className={styles.editCard}>
                  <h4 style={{ marginBottom: "8px" }}>Item {index + 1}</h4>
                  <div className={styles.modalGrid}>

                    {/* PRODUCT */}
                    <div className={styles.field}>
                      <label>Product</label>
                      <Select
                        options={getProductOptions()}
                        value={
                          getProductOptions().find(
                            (p) => p.value === (item.productId?._id || item.productId)
                          ) || null
                        }
                        onChange={(selected) => {
                          const product = selected?.product;
                          updateItem(index, "productId", product);
                          updateItem(index, "flavor", product?.flavor?.[0] || "");
                          updateItem(index, "litters", product?.liters?.[0] || product?.litters?.[0] || "");
                          updateItem(index, "mrp", product?.mrps?.[0] || "");
                        }}
                      />
                    </div>

                    {/* FLAVOR */}
                    <div className={styles.field}>
                      <label>Flavor</label>
                      <Select
                        options={getFlavorOptions(item.productId?._id || item.productId)}
                        value={
                          getFlavorOptions(item.productId?._id || item.productId).find(
                            (f) => f.value === item.flavor
                          ) || null
                        }
                        onChange={(selected) => updateItem(index, "flavor", selected?.value)}
                      />
                    </div>

                    {/* LITERS */}
                    <div className={styles.field}>
                      <label>Liters</label>
                      <Select
                        options={getLiterOptions(item.productId?._id || item.productId)}
                        value={
                          getLiterOptions(item.productId?._id || item.productId).find(
                            (l) => l.value === (item.litters || item.liters)
                          ) || null
                        }
                        onChange={(selected) => {
                          updateItem(index, "litters", selected?.value);
                          updateItem(index, "mrp", selected?.mrp);
                        }}
                      />
                    </div>

                    {/* MRP */}
                    <div className={styles.field}>
                      <label>MRP</label>
                      <Select
                        options={getMrpOptions(item.productId?._id || item.productId)}
                        value={
                          getMrpOptions(item.productId?._id || item.productId).find(
                            (m) => m.value === item.mrp || m.value === Number(item.mrp)
                          ) || null
                        }
                        onChange={(selected) => updateItem(index, "mrp", selected?.value)}
                        placeholder="Select MRP"
                      />
                    </div>

                    {/* BARCODE —  now per-item as per GET response */}
                    <div className={styles.field}>
                      <label>Barcode</label>
                      <input
                        type="text"
                        value={item.barcode || ""}
                        onChange={(e) => updateItem(index, "barcode", e.target.value)}
                      />
                    </div>

                    {/* QTY */}
                    <div className={styles.field}>
                      <label>Quantity</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(index, "qty", e.target.value)}
                      />
                    </div>

                    {/* COST PRICE */}
                    <div className={styles.field}>
                      <label>Cost Price</label>
                      <input
                        type="number"
                        value={item.costPrice}
                        onChange={(e) => updateItem(index, "costPrice", e.target.value)}
                      />
                    </div>

                    {/* SELLING PRICE */}
                    <div className={styles.field}>
                      <label>Selling Price</label>
                      <input
                        type="number"
                        value={item.sellingPrice}
                        onChange={(e) => updateItem(index, "sellingPrice", e.target.value)}
                      />
                    </div>

                  </div>
                </div>
              ))}

              {/* SAVE */}
              <button
                className={styles.submitBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseList;