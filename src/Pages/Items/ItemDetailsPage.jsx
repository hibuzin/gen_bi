import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBarcode, FaEdit, FaTrash, FaKeyboard } from "react-icons/fa";
import { FiEdit, FiTrash2, } from "react-icons/fi";
import { MdAdjust } from "react-icons/md";
import styles from "./ItemDetailsPage.module.css";
import { API } from "../../constants/api";
import Toast from "../../components/Toast";


function ItemDetails() {

    const { id } = useParams();
    const navigate = useNavigate();
    const [itemHistory, setItemHistory] = useState([]);

    const [data, setData] = useState(null);
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState("itemDetails");
    const [switching, setSwitching] = useState(false);
    const [search, setSearch] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Fetch all products once
    useEffect(() => {
        const fetchProducts = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(API.products, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setProducts(json.data || []);
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(API.categories, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setCategories(json.data || []);
        };
        fetchCategories();
    }, []);

    const fetchItemHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                `https://pos-backend-6uh4.onrender.com/api/product-price-history/purchase-product/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const json = await res.json();

            if (json.success) {
                setItemHistory(json.data || []);
            }
        } catch (err) {
            console.error("Item History Error:", err);
        }
    }, [id]);

    const fetchItemDetails = useCallback(async () => {
        try {
            setSwitching(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.stockList}/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setData(json);
            else setData(null);
        } catch (err) {
            console.error(err);
            setData(null);
        } finally {
            setSwitching(false);
        }
    }, [id]);

    const searchProducts = async (value) => {
        try {
            const token = localStorage.getItem("token");

            if (!value.trim()) {
                const res = await fetch(API.products, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();

                if (data.success) {
                    setProducts(data.data || []);
                }

                return;
            }

            const res = await fetch(
                `${API.products}/search?search=${encodeURIComponent(value)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await res.json();

            if (data.success) {
                setProducts(data.data || []);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const openEdit = () => {
        setEditProduct({
            ...product,
            categoryId: product.categoryId?._id || product.categoryId,
        });
        setShowEditModal(true);
        document.body.style.overflow = "hidden";
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        document.body.style.overflow = "auto";
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem("token");

            const payload = {
                name: editProduct.name || editProduct.productName,
                categoryId: editProduct.categoryId,
                description: editProduct.description,
                hsnCode: editProduct.hsnCode,
                lowStockQty: Number(editProduct.lowStockQty),
                gstRate: Number(editProduct.gstRate),
                mrp: Number(editProduct.mrp),
                costPrice: Number(editProduct.costPrice),
                sellingPrice: Number(editProduct.sellingPrice),
                barcode: editProduct.barcode,
            };

            const res = await fetch(`${API.products}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                setToast({ type: "success", message: data.message });
                closeEditModal();
                fetchItemDetails(); // refresh current item
            } else {
                setToast({ type: "error", message: data.message });
            }
        } catch (err) {
            console.log(err);
            setToast({ type: "error", message: "Server Error" });
        }
    };

    const handleDelete = async () => {
        try {
            setDeleteLoading(true);
            const token = localStorage.getItem("token");

            const res = await fetch(`${API.products}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();

            if (data.success) {
                setToast({ type: "success", message: data.message || "Item deleted" });
                navigate("/product");
            } else {
                setToast({ type: "error", message: data.message || "Delete failed" });
            }
        } catch (err) {
            console.log(err);
            setToast({ type: "error", message: "Server error" });
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    useEffect(() => {
        fetchItemDetails();
        fetchItemHistory();
    }, [fetchItemDetails, fetchItemHistory]);

    // First load — nothing yet
    if (!data && switching) return <div className={styles.loading}>Loading...</div>;
    if (!data) return <div className={styles.loading}>Item not found</div>;

    const { product, summary, data: stockData } = data;

    const firstStock = stockData?.[0] || {};

    const productFromList =
        products.find((p) => p._id === id || p.productId === id) || {};

    const item = {
        ...productFromList,
        ...product,
    };

    const firstBarcode = item.barcodes?.[0] || product.barcodes?.[0] || {};


    const getValue = (...values) => {
        const value = values.find(
            (v) =>
                v !== undefined &&
                v !== null &&
                v !== "" &&
                v !== "null" &&
                v !== "undefined" &&
                !Number.isNaN(v)
        );

        return value ?? "-";
    };

    const formatMoney = (...values) => {
        const value = getValue(...values);

        if (value === "-") return "-";

        const num = Number(value);

        if (Number.isNaN(num)) return "-";

        return num.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const categoryName =
        item.categoryId?.name ||
        item.category?.name ||
        item.categoryName ||
        categories.find(
            (cat) =>
                cat._id === item.categoryId ||
                cat._id === item.categoryId?._id ||
                cat._id === firstStock.categoryId
        )?.name ||
        "-";

    const tabs = [
        { key: "itemDetails", label: "Item details" },
        { key: "stockDetails", label: "Stock details" },
        { key: "itemHistory", label: "Item history" },
    ];

    return (
        <div className={styles.wrap}>
            {toast && <Toast {...toast} />}

            {/* LEFT PANEL */}
            <div className={styles.leftPanel}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Search Items"
                        value={search}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearch(value);
                            searchProducts(value);
                        }}
                        className={styles.searchInput}
                    />
                </div>

                <button className={styles.createBtn} onClick={() => navigate("/create-product")}>
                    + Create item
                </button>

                <div className={styles.itemsList}>
                    {products.map((item) => (
                        <div
                            key={item._id}
                            className={`${styles.itemCard} ${item._id === id ? styles.activeItem : ""}`}
                            onClick={() => item._id !== id && navigate(`/item/${item._id}`)}
                        >
                            <div className={styles.itemTop}>
                                <h4>{item.name || item.productName}</h4>
                            </div>
                            <div className={styles.itemBottom}>
                                <span>{item.stock || 0} PCS</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className={`${styles.right} ${switching ? styles.switching : ""}`}>

                {/* HEADER */}
                <div className={styles.mainHeader}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate("/product")}
                        >
                            <FaArrowLeft />
                        </button>
                        <div className={styles.headerName}>
                            {getValue(product.productName, product.name)}
                        </div>
                        <span className={`${styles.badge} ${product.status === "Available" ? styles.inStock : styles.outStock}`}>
                            {product.status === "Available" ? "In Stock" : "Out of Stock"}
                        </span>
                    </div>

                    <div className={styles.headerActions}>
                        <button
                            className={styles.editBtn}
                            onClick={openEdit}
                        >
                            <FiEdit className={styles.btnIcon} />
                            <span>Edit</span>
                        </button>

                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <FiTrash2 />
                        </button>
                        <button className={styles.actionBtnIcon}>
                            <FaKeyboard />
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className={styles.tabs}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""
                                }`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className={styles.content}>
                    {/* TAB: ITEM DETAILS */}
                    {activeTab === "itemDetails" && (
                        <div className={styles.profileGrid}>
                            <div className={styles.profileCard}>
                                <h3 className={styles.cardHeading}>General details</h3>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Item name</span>
                                    <span className={styles.val}>{getValue(product.productName, product.name)}</span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Item code</span>
                                    <span className={styles.val}>
                                        {getValue(item.itemCode, product.itemCode)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Barcode</span>
                                    <span className={styles.val}>
                                        {getValue(
                                            item.barcode,
                                            product.barcode,
                                            firstBarcode.barcode,
                                            firstStock.barcode
                                        )}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Category</span>
                                    <span className={styles.val}>{categoryName}</span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Stock</span>
                                    <span className={styles.val}>
                                        {getValue(product.currentStock, product.stock, firstStock.availableQty, 0)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Low stock</span>
                                    <span className={styles.val}>
                                        {getValue(item.lowStockQty, firstStock.lowStockQty)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Description</span>
                                    <span className={styles.val}>
                                        {getValue(item.description, firstStock.description)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.profileCard}>
                                <h3 className={styles.cardHeading}>Pricing details</h3>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Sales Price</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.sellingPrice, firstStock.sellingPrice)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Cost Price</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.costPrice, firstStock.costPrice)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Mrp</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.mrp, firstStock.mrp)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Gst</span>
                                    <span className={styles.val}>
                                        {getValue(item.gstRate, item.taxPercentage, firstStock.gstRate, firstStock.gstpercentage)}%
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Hsn code</span>
                                    <span className={styles.val}>
                                        {getValue(item.hsnCode, firstStock.hsnCode)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Stock value</span>
                                    <span className={styles.val}>₹ {formatMoney(summary?.totalCostValue)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: STOCK DETAILS */}
                    {activeTab === "stockDetails" && (
                        <div className={styles.stockDetailsTab}>


                            <div className={styles.tableWrap}>
                                <table className={styles.tbl}>
                                    <thead>
                                        <tr>
                                            <th>Current Stock</th>
                                            <th>Sold Qty</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
  {stockData.map((item, index) => (
    <tr key={item.barcode || index}>
      <td>{item.currentStock}</td>

      <td>{item.soldQty}</td>

      <td>
        <span
          className={`${styles.badge} ${
            item.status === "Available"
              ? styles.inStock
              : styles.outStock
          }`}
        >
          {item.status}
        </span>
      </td>
    </tr>
  ))}
</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: PARTY WISE */}
                    {activeTab === "itemHistory" && (
                        <div className={styles.stockDetailsTab}>
                            <div className={styles.tableWrap}>
                                <table className={styles.tbl}>
                                    <thead>
                                        <tr>
                                            <th>Invoice no</th>
                                            <th>Date</th>
                                            <th>Qty</th>
                                            <th>Cost price</th>
                                            <th>Selling price</th>
                                            <th>Mrp</th>
                                            
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {itemHistory.length > 0 ? (
                                            itemHistory.map((item, index) => (
                                                <tr key={item.purchaseId || index}>
                                                    <td>{item.invoiceNo || "-"}</td>

                                                    <td>
                                                        {item.purchaseDate &&
                                                            item.purchaseDate !== "Invalid Date"
                                                            ? item.purchaseDate
                                                            : "-"}
                                                    </td>

                                                    <td>{item.qty}</td>

                                                    <td>
                                                        ₹ {Number(item.costPrice || 0).toFixed(2)}
                                                    </td>

                                                    <td>
                                                        ₹ {Number(item.sellingPrice || 0).toFixed(2)}
                                                    </td>

                                                    <td>
                                                        ₹ {Number(item.mrp || 0).toFixed(2)}
                                                    </td>

                                                    
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: "center" }}>
                                                    No History Found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
                {showEditModal && editProduct && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3>Edit item</h3>
                                <button className={styles.closeBtn} onClick={closeEditModal}>×</button>
                            </div>

                            <div className={styles.form}>
                                <div className={styles.field}>
                                    <label>Item name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editProduct.name || editProduct.productName || ""}
                                        onChange={handleEditChange}
                                    />
                                </div>


                                <div className={styles.field}>
                                    <label>Category</label>
                                    <select name="categoryId" value={editProduct.categoryId || ""} onChange={handleEditChange}>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label>Description</label>
                                    <input type="text" name="description" value={editProduct.description || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Hsn code</label>
                                    <input type="text" name="hsnCode" value={editProduct.hsnCode || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Gst %</label>
                                    <input type="text" name="gstRate" value={editProduct.gstRate || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Low stock qty</label>
                                    <input type="text" name="lowStockQty" value={editProduct.lowStockQty || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Mrp</label>
                                    <input type="text" name="mrp" value={editProduct.mrp || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Cost price</label>
                                    <input type="text" name="costPrice" value={editProduct.costPrice || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Selling price</label>
                                    <input type="text" name="sellingPrice" value={editProduct.sellingPrice || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Barcode</label>
                                    <input type="text" name="barcode" value={editProduct.barcode || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.modalBtns}>
                                    <button className={styles.cancelBtn} onClick={closeEditModal}>Cancel</button>
                                    <button className={styles.saveBtn} onClick={handleUpdate}>Save changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.deleteModal}>
                            <h3>Delete item?</h3>
                            <p>Are you sure you want to delete this item?</p>
                            <div className={styles.deleteActions}>
                                <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={deleteLoading}>
                                    {deleteLoading ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

export default ItemDetails;