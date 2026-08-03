import {
  useEffect,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaRupeeSign,
  FaSearch,
} from "react-icons/fa";
import Toast from "../../components/Toast";
import styles from "./PurchaseList.module.css";
import { API } from "../../constants/api";

function PurchaseList() {
  const [purchases, setPurchases] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
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
  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPurchases(searchText);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

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

  const searchPurchases = async (value) => {
    const query = value.trim();

    if (!query) {
      fetchPurchases();
      return;
    }

    try {
      setSearchLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://pos-backend-6uh4.onrender.com/api/purchase/search?search=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Failed to search purchases"
        );
      }

      const normalizedPurchases = (data.data || []).map(
        (purchase) => ({
          ...purchase,

          supplier: {
            id:
              purchase.supplierId?._id ||
              purchase.supplier?.id ||
              purchase.supplierId ||
              "",

            name:
              purchase.supplierId?.supplierName ||
              purchase.supplier?.name ||
              purchase.supplierName ||
              "-",

            mobile:
              purchase.supplierId?.mobile ||
              purchase.supplier?.mobile ||
              "",

            email:
              purchase.supplierId?.email ||
              purchase.supplier?.email ||
              "",
          },
        })
      );

      setPurchases(normalizedPurchases);
    } catch (err) {
      console.error("Purchase search error:", err);

      setPurchases([]);

      setToast({
        type: "error",
        message: err.message || "Purchase search failed",
      });
    } finally {
      setSearchLoading(false);
    }
  };

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
      {/* PURCHASE SEARCH */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search supplier, invoice, GRN, product..."
            className={styles.searchInput}
          />

          {searchText && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchText("")}
            >
              ×
            </button>
          )}
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
            {loading || searchLoading ? (
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
                              navigate("/create-purchase", {
                                state: {
                                  mode: "edit",
                                  purchaseId: p._id,
                                },
                              });

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

      
    </div>
  );
}

export default PurchaseList;