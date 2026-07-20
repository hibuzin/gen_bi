import { useEffect, useState, useRef } from "react";
import styles from "./Items.module.css";
import { useNavigate } from "react-router-dom";
import { TrendingUp, PackageMinus, ExternalLink, PackageX } from 'lucide-react';
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import { FaTrash, FaEdit, FaEllipsisV, FaSearch, } from "react-icons/fa";
import { FiLayers, FiChevronDown, FiChevronUp, } from "react-icons/fi";

function Item() {
  const [product, setProduct] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const [deleteLoading, setDeleteLoading] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [menuPosition, setMenuPosition] = useState({
    top: -10,
    left: -10,
  });

  const [editProduct, setEditProduct] = useState(null);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const lowStockItems = 0;
  const [openMenu, setOpenMenu] = useState(null);
  const [stockValue, setStockValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");

  const [editCategory, setEditCategory] = useState(null);

  const [editCategoryData, setEditCategoryData] = useState({
    name: "",
    hsnCode: "",
    gstRate: "",
  });

  const categoryRef = useRef(null);


  const menuRef = useRef(null);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();



  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchStockValue();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false);
        setCategorySearch("");
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const placeholders = [
    "Search by name",
    "Search by hSN code",
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (type, message) => {
  setToast({ type, message });

  setTimeout(() => {
    setToast(null);
  }, 2500);
};

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // stock value 

  const fetchStockValue = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.stockValue, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log(data); // check response

      if (data.success) {
        setStockValue(
          data.summary?.totalCostValue || 0
        );
      }
    } catch (err) {
      console.error("Stock Value Error:", err);
    }
  };

  // FETCH PRODUCTS

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await fetch(
        API.products,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct(data.data || []);
      } else {
        setToast({
          type: "error",
          message:
            data.message ||
            "Failed to load items",
        });
      }
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message: "Server error",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (value) => {
    try {
      const token = localStorage.getItem("token");

      if (!value.trim()) {
        fetchProduct();
        return;
      }

      const res = await fetch(
        `${API.products}/search?search=${encodeURIComponent(value)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct(data.data || []);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // FETCH CATEGORIES

  const fetchCategories = async () => {
    try {
      const token =
        localStorage.getItem("token");

      const res = await fetch(
        API.categories,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.log(err);
    }
  };


  //create category
  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      setCreatingCategory(true);

      const token = localStorage.getItem("token");

      const res = await fetch(API.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCategories();

        setSelectedCategory("");

        setNewCategory("");
        setShowCategoryModal(false);

        showToast("success", "Category created successfully");
      } else {
        setToast({
          type: "error",
          message: data.message,
        });
      }
    } catch (err) {
      console.log(err);
      showToast("error", data.message || "Category create failed");
    } finally {
      setCreatingCategory(false);
    }
  };

  // DELETE

  const handleDelete = async () => {
    if (!deleteProductId) return;

    try {
      setDeleteLoading(deleteProductId);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.products}/${deleteProductId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct((prev) =>
          prev.filter(
            (item) => item._id !== deleteProductId
          )
        );

        setToast({
          type: "success",
          message:
            data.message ||
            "Item deleted successfully",
        });
      } else {
        setToast({
          type: "error",
          message:
            data.message ||
            "Delete failed",
        });
      }
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message: "Server error",
      });
    } finally {
      setDeleteLoading(null);
      setDeleteProductId(null);
    }
  };

  // OPEN EDIT

  const openEdit = (item) => {
    console.log(item);
    setEditProduct({
      ...item,

      flavor:
        item.flavor?.join(", ") || "",

      liters:
        item.litters?.join(", ") || "",

      mrps:
        item.mrps?.join(", ") || "",
    });

    setShowModal(true);

    document.body.style.overflow =
      "hidden";
  };

  // CLOSE EDIT

  const closeModal = () => {
    setShowModal(false);

    document.body.style.overflow =
      "auto";
  };

  // CHANGE

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEditProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // UPDATE
  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        name: editProduct.name,
        categoryId: editProduct.categoryId?._id || editProduct.categoryId,
        description: editProduct.description,
        hsnCode: editProduct.hsnCode,
        lowStockQty: Number(editProduct.lowStockQty),
        gstRate: Number(editProduct.gstRate),
        mrp: Number(editProduct.mrp),
        costPrice: Number(editProduct.costPrice),
        sellingPrice: Number(editProduct.sellingPrice),
        barcode: editProduct.barcode,
      };

      const res = await fetch(
        `${API.products}/${editProduct._id}`,
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

      if (data.success) {
        setProduct((prev) =>
          prev.map((item) =>
            item._id === editProduct._id ? data.data : item
          )
        );

        setToast({
          type: "success",
          message: data.message,
        });

        closeModal();
      } else {
        setToast({
          type: "error",
          message: data.message,
        });
      }
    } catch (err) {
      console.log(err);

      setToast({
        type: "error",
        message: "Server Error",
      });
    }
  };

  //update category
  const handleUpdateCategory = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await fetch(

        `${API.categories}/${editCategory._id}`,

        {

          method: "PUT",

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`

          },

          body: JSON.stringify(editCategoryData)

        }

      );

      const data = await res.json();

      if (data.success) {

        fetchCategories();

        setEditCategory(null);

        showToast("success", "Category Updated");

      }

    } catch (err) {

      console.log(err);

    }

  }
  // delete category 

  const handleDeleteCategory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.categories}/${deleteItem._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        fetchCategories();
        setShowDeleteConfirm(false);
        setDeleteItem(null);

        showToast("success", "Category deleted successfully");
      }
    } catch (err) {
  console.error(err);
  showToast("error", "Failed to delete category");
}
  };

  const filteredProducts = product.filter((item) => {
    if (!selectedCategory) return true;

    return (
      item.categoryId?._id === selectedCategory ||
      item.categoryId === selectedCategory
    );
  });

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  return (
    <div className={styles.container}>
      {toast && <Toast {...toast} />}

      {/* HEADER */}

      <div className={styles.header}>
        <div>
          <h2>items</h2>
        </div>


      </div>

      <div className={styles.cardsRow}>

        {/* STOCK VALUE */}
        <div className={styles.infoCard}>
          <div className={`${styles.cardRow} ${styles.stockCard}`}>
            <div className={styles.cardTitle}>
              <TrendingUp size={16} />
              <p>Stock value</p>
            </div>

            <ExternalLink size={16} className={styles.externalIcon} />
          </div>

          <h2>
            ₹ {Number(stockValue).toLocaleString("en-IN")}
          </h2>
        </div>

        {/* LOW STOCK */}
        <div className={styles.infoCard}>
          <div className={`${styles.cardRow} ${styles.lowStockCard}`}>
            <div className={styles.cardTitle}>
              <PackageMinus size={16} />
              <p>Low stock</p>
            </div>

            <ExternalLink size={16} className={styles.externalIcon} />
          </div>

          <h2>{lowStockItems}</h2>
        </div>

        {/* OUT OF STOCK */}
        <div className={styles.infoCard}>
          <div className={`${styles.cardRow} ${styles.outStockCard}`}>
            <div className={styles.cardTitle}>
              <PackageX size={16} />
              <p>Out of stock</p>
            </div>

            <ExternalLink size={16} className={styles.externalIcon} />
          </div>

          <h2>0</h2>
        </div>

      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <div className={styles.placeholderWrapper}>
            {!search && (
              <div
                className={styles.placeholderSlider}
                style={{
                  transform: `translateY(-${placeholderIndex * 36}px)`,
                }}
              >
                {placeholders.map((text, i) => (
                  <span key={i}>{text}</span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                searchProducts(value);
              }}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div
          className={styles.categoryDropdown}
          ref={categoryRef}
        >
          <div
            className={styles.categoryInput}
            onClick={() => {
              if (!showCategoryDropdown) {
                setShowCategoryDropdown(true);
                setTimeout(() => {
                  document.getElementById("categorySearchInput")?.focus();
                }, 0);
              }
            }}
          >
            {showCategoryDropdown ? (
              <input
                id="categorySearchInput"
                type="text"
                autoFocus
                className={styles.categorySearchInput}
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span onClick={() => setShowCategoryDropdown(true)}>
                {selectedCategory
                  ? categories.find(c => c._id === selectedCategory)?.name
                  : "Search categories"}
              </span>
            )}

           <span
  className={styles.dropdownIcon}
  onClick={(e) => {
    e.stopPropagation();
    setShowCategoryDropdown(prev => !prev);
  }}
>
  {showCategoryDropdown ? <FiChevronUp /> : <FiChevronDown />}
</span>
          </div>

          {showCategoryDropdown && (
            <div className={styles.categoryMenu}>
              <div className={styles.categoryList}>
                <div
                  className={styles.categoryItem}
                  onClick={() => {
                    setSelectedCategory("");
                    setShowCategoryDropdown(false);
                    setCategorySearch("");
                  }}
                >
                  <span>All categories</span>
                </div>

                {filteredCategories.length === 0 ? (
                  <div className={styles.categoryItem}>
                    <span style={{ color: "#aaa" }}>No match found</span>
                  </div>
                ) : (
                  filteredCategories.map(cat => (
                    <div key={cat._id} className={styles.categoryItem}>
                      <span
                        onClick={() => {
                          setSelectedCategory(cat._id);
                          setShowCategoryDropdown(false);
                          setCategorySearch("");
                        }}
                      >
                        {cat.name}
                      </span>

                      <button
                        className={styles.categoryEditBtn}
                        onClick={() => {
                          setEditCategory(cat);
                          setEditCategoryData({
                            name: cat.name,
                            hsnCode: cat.hsnCode || "",
                            gstRate: cat.gstRate || ""
                          });
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <FaEdit />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className={styles.addCategoryBtn}
                onClick={() => {
                  setShowCategoryModal(true);
                  setShowCategoryDropdown(false);
                  setCategorySearch("");
                }}
              >
                + Add category
              </button>
            </div>
          )}
        </div>
{/*
        <button
          className={styles.bulkBtn}
          onClick={() => navigate("/bulk-action")}
        >
          <FiLayers className={styles.bulkBtnIcon} />
          <span>Bulk actions</span>
        </button>
*/}
        <button
          className={styles.addBtn}
          onClick={() => navigate("/create-product")}
        >
          <span>Create items</span>
        </button>
      </div>
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
                <th>Item code</th>
                <th>Name</th>
                <th>Stock</th>
                <th>Selling price</th>
                <th>Purchase price</th>
                <th>Mrp</th>
                <th>Hsn code</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">
                    <div className={styles.tableLoader}>
                      <div className={styles.spinner}></div>
                      <p>Loading items...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className={styles.emptyState}>
                      No items found
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const itemId = p._id || p.productId;

                  return (
                    <tr
                      key={itemId}
                      onClick={() => navigate(`/item/${itemId}`)}
                    >
                      <td>{index + 1}</td>

                      <td>{p.itemCode || "—"}</td>

                      <td className={styles.nameCell}>
                        {p.name || p.productName}
                      </td>

                      <td>{p.availableQty || p.stock || 0}</td>

                      <td>₹ {p.sellingPrice || 0}</td>

                      <td>₹ {p.costPrice || 0}</td>

                      <td>₹ {p.mrp || 0}</td>

                      <td>{p.hsnCode || "—"}</td>

                      <td>
                        <div
                          ref={openMenu === itemId ? menuRef : null}
                          className={styles.menuWrapper}
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

                              setOpenMenu(openMenu === itemId ? null : itemId);
                            }}
                            type="button"
                          >
                            <FaEllipsisV />
                          </button>

                          {openMenu === itemId && (
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  openEdit({
                                    ...p,
                                    _id: itemId,

                                    name: p.name || p.productName || "",
                                    barcode: p.barcode || p.itemCode || "",
                                    hsnCode: p.hsnCode || "",
                                    description: p.description || "",

                                    gstRate: p.gstRate ?? p.taxPercentage ?? "",
                                    lowStockQty: p.lowStockQty ?? "",

                                    mrp: p.mrp ?? "",
                                    costPrice: p.costPrice ?? p.purchasePrice ?? p.netcost ?? "",
                                    sellingPrice: p.sellingPrice ?? "",

                                    categoryId:
                                      p.categoryId?._id ||
                                      p.categoryId ||
                                      p.category ||
                                      "",
                                  });

                                  setOpenMenu(null);
                                }}
                              >
                                <FaEdit />
                                Edit
                              </button>

                              <button
                                className={styles.deleteMenuItem}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteProductId(itemId);
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      
      {/* MODAL */}

      {showModal && editProduct && (
        <div
          className={styles.modalOverlay}
        >
          <div className={styles.modal}>
            <div
              className={
                styles.modalHeader
              }
            >
              <h3>Edit item</h3>

              <button
                className={
                  styles.closeBtn
                }
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>
                  item name
                </label>

                <input
                  type="text"
                  name="name"
                  value={editProduct.name}
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className={styles.field}>
                <label>
                  Category
                </label>

                <select
                  name="categoryId"
                  value={
                    editProduct.categoryId
                      ?._id ||
                    editProduct.categoryId
                  }
                  onChange={
                    handleChange
                  }
                >
                  {categories.map(
                    (cat) => (
                      <option
                        key={cat._id}
                        value={cat._id}
                      >
                        {cat.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className={styles.field}>
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={editProduct.description || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>hsn Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  value={editProduct.hsnCode || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Gst %</label>
                <input
                  type="number"
                  name="gstRate"
                  value={editProduct.gstRate || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Low stock qty</label>
                <input
                  type="number"
                  name="lowStockQty"
                  value={editProduct.lowStockQty || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Mrp</label>
                <input
                  type="number"
                  name="mrp"
                  value={editProduct.mrp || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Cost price</label>
                <input
                  type="number"
                  name="costPrice"
                  value={editProduct.costPrice || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Selling price</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={editProduct.sellingPrice || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Barcode</label>
                <input
                  type="text"
                  name="barcode"
                  value={editProduct.barcode || ""}
                  onChange={handleChange}
                />
              </div>



              <div
                className={
                  styles.modalBtns
                }
              >
                <button
                  className={
                    styles.cancelBtn
                  }
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  className={
                    styles.saveBtn
                  }
                  onClick={handleUpdate}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteProductId && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <h3>Delete product?</h3>

            <p>
              Are you sure you want to delete this
              item?
            </p>

            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() =>
                  setDeleteProductId(null)
                }
              >
                Cancel
              </button>

              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.categoryModal}>
            <div className={styles.modalHeader}>
              <h3>Create Category</h3>

              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory("");
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>Category Name</label>

                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>

              <div className={styles.modalBtns}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory("");
                  }}
                >
                  Cancel
                </button>

                <button
                  className={styles.saveBtn}
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                >
                  {creatingCategory ? "Creating..." : "Create"}
                </button>
              </div>



            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <h3>Delete category?</h3>

            <p>
              Are you sure you want to delete{" "}
              <b>{deleteItem?.name}</b> ?
            </p>

            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItem(null);
                }}
              >
                Cancel
              </button>

              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteCategory}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editCategory && (
        <div className={styles.modalOverlay}>
          <div className={styles.categoryModal}>

            <div className={styles.modalHeader}>
              <h3>Edit {editCategory.name}</h3>

              <button
                className={styles.closeBtn}
                onClick={() => setEditCategory(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>Category Name</label>

                <input
                  value={editCategoryData.name}
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Delete */}
              <button
                type="button"
                className={styles.deleteCategoryText}
                onClick={() => {
                  setDeleteItem(editCategory);
                  setShowDeleteConfirm(true);
                  setEditCategory(null);
                }}
              >
                Delete Category
              </button>

              <div className={styles.modalBtns}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setEditCategory(null)}
                >
                  Cancel
                </button>

                <button
                  className={styles.saveBtn}
                  onClick={handleUpdateCategory}
                >
                  Save
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Item;