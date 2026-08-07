import {
  useEffect,
  useRef,
  useState,
} from "react";

import { FiTrash2 } from "react-icons/fi";
import { API } from "../../constants/api";

import {
  calculateNewItemLocal,
} from "./purchaseLogic";

import styles from "./CreatePurchase.module.css";

export default function PurchaseTable({
  billItems,
  setBillItems,
  form,
  token,
  showToast,
  emptyItem,
  calculatePurchase,
  calculateNewPurchaseTotals,
  registerCreateProduct,
}) {

  useEffect(() => {
    fetchProducts();
  }, []);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [rowSearches, setRowSearches] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const itemInputRefs = useRef([]);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);

      const res = await fetch(API.products, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setProducts(data.data || []);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setProductsLoading(false);
    }
  };
  const updateItem = async (index, field, value) => {
    let updated = [...billItems];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    if (field === "netcost") {
      updated[index].purchasePrice = value;
      updated[index].costPrice = value;
      updated[index].originalNetcost = value;
    }

    // Don't allow negative values
    if (
      [
        "qty",
        "freeQty",
        "discountPercent",
        "discountAmount",
        "netcost",
        "mrp",
        "sellingPrice",
        "tax",
      ].includes(field) &&
      value !== "" &&
      Number(value) < 0
    ) {
      return;
    }

    // Save typed value first
    setBillItems(updated);

    // ---------------------------------
    // NEW INLINE PRODUCT
    // ---------------------------------
    if (
      !updated[index].productId &&
      String(updated[index].productName || "").trim()
    ) {
      const calculatedItem = calculateNewItemLocal(
        updated[index]
      );

      updated[index] = calculatedItem;

      console.log(
        "NEW ITEM CALCULATED:",
        calculatedItem
      );

      setBillItems(updated);

      calculateNewPurchaseTotals(updated, form);

      return;
    }

    // ---------------------------------
    // EXISTING PRODUCT
    // ---------------------------------
    if (updated[index].productId) {
      try {
        await calculatePurchase(updated, form);
      } catch (error) {
        console.error(
          "Existing product calculation error:",
          error
        );

        showToast(
          "Unable to calculate item",
          "error"
        );
      }
    }
  };
  const removeRow = async (index) => {
    const updated = [...billItems];

    updated[index] = { ...emptyItem };

    setBillItems(updated);

    await calculatePurchase(updated);

    setRowSearches((prev) => ({
      ...prev,
      [index]: "",
    }));

    setRowSearchResults((prev) => ({
      ...prev,
      [index]: [],
    }));
  };
  // auto table create 
  const getNextEmptyRowIndex = () => {
    const idx = billItems.findIndex((item) => !item.productId);
    return idx === -1 ? billItems.length : idx; // ellam full aana kadaisi-la push
  };

  const searchProductsForRow = (rowIndex, value) => {
    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));

    setActiveRowIndex(rowIndex);

    const searchValue = String(value || "")
      .trim()
      .toLowerCase();

    if (!searchValue) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));
      return;
    }

    console.log("ALL PRODUCTS:", products);
    console.log("SEARCH VALUE:", searchValue);

    const filtered = products.filter((product) => {
      const name = String(
        product.productName ||
        product.name ||
        ""
      ).toLowerCase();

      const barcode = String(
        product.barcode ||
        product.itemCode ||
        ""
      ).toLowerCase();

      const hsnCode = String(
        product.hsnCode || ""
      ).toLowerCase();

      return (
        name.includes(searchValue) ||
        barcode.includes(searchValue) ||
        hsnCode.includes(searchValue)
      );
    });

    console.log("MATCHED PRODUCTS:", filtered);

    setRowSearchResults((prev) => ({
      ...prev,
      [rowIndex]: filtered.slice(0, 20),
    }));
  };

  const selectRowProduct = async (rowIndex, product) => {
    const updated = [...billItems];

    updated[rowIndex] = {
      ...emptyItem,
      productId: product.productId || product._id,
      productName: product.productName || product.name || "",
      itemCode: product.itemCode || product.barcode || "",
      barcode: product.barcode || product.itemCode || "",
      hsnCode: product.hsnCode || "",
      mrp: Number(product.mrp || 0),
      costPrice: Number(product.costPrice || product.purchasePrice || 0),
      netcost: Number(
        product.netcost ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),
      rate: Number(
        product.rate ||
        product.costPrice ||
        product.purchasePrice ||
        0
      ),
      sellingPrice: Number(product.sellingPrice || 0),

      tax: Number(product.gstRate || product.tax || 0),

      stock: Number(
        product.stock ??
        product.currentStock ??
        product.totalQty ??
        0
      ),

      unit: product.unit || "pcs",

      qty: 1,
      freeQty: 0,
    };

    setBillItems(updated);

    setRowSearches((prev) => ({ ...prev, [rowIndex]: "" }));
    setRowSearchResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setActiveRowIndex(null);

    await calculatePurchase(updated);

    setTimeout(() => {
      itemInputRefs.current[rowIndex + 1]?.focus();
    }, 100);
  };

  const createInlineProduct = async (item) => {
    const productPayload = {
      name: String(item.productName || "").trim(),

      categoryId: item.categoryId || "",

      hsnCode: item.hsnCode || "",

      gstRate: Number(
        item.tax || item.gstRate || 0
      ),

      lowStockQty: Number(item.lowStockQty || 0),

      mrp: Number(item.mrp || 0),

      costPrice: Number(
        item.originalNetcost ||
        item.netcost ||
        item.costPrice ||
        0
      ),

      sellingPrice: Number(item.sellingPrice || 0),

      unit:
        item.unit ||
        localStorage.getItem("defaultUnit") ||
        "pcs",

      unitValue: Number(item.unitValue || 1),

      productType: "normal",

      barcode: item.barcode || "",

      description: item.description || "",
    };

    console.log(
      "INLINE CREATE PRODUCT PAYLOAD:",
      productPayload
    );

    const res = await fetch(API.createProduct, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productPayload),
    });

    const data = await res.json();

    console.log(
      "INLINE CREATE PRODUCT RESPONSE:",
      data
    );

    if (!res.ok || !data.success) {
      throw new Error(
        data.message ||
        `Failed to create ${item.productName}`
      );
    }

    // IMPORTANT:
    // create-product API returns actual product inside data.data.product
    const createdProduct =
      data.data?.product ||
      data.data?.createdProduct ||
      data.data;

    const productId =
      createdProduct?._id ||
      createdProduct?.productId ||
      data.data?.productId ||
      data.productId;

    console.log("CREATED PRODUCT:", createdProduct);
    console.log("CREATED PRODUCT ID:", productId);

    if (!productId) {
      console.error(
        "Created product but productId missing:",
        data
      );

      throw new Error(
        `Product created but product id not returned for ${item.productName}`
      );
    }

    return {
      ...item,

      productId: String(productId),

      productName:
        createdProduct?.name ||
        createdProduct?.productName ||
        item.productName,

      itemCode:
        createdProduct?.itemCode ||
        data.data?.barcodes?.[0]?.code ||
        item.itemCode ||
        "",

      barcode:
        createdProduct?.barcode ||
        data.data?.barcodes?.[0]?.code ||
        item.barcode ||
        "",

      hsnCode:
        createdProduct?.hsnCode ||
        item.hsnCode ||
        "",

      tax: Number(
        createdProduct?.gstRate ??
        item.tax ??
        item.gstRate ??
        0
      ),

      gstRate: Number(
        createdProduct?.gstRate ??
        item.tax ??
        item.gstRate ??
        0
      ),

      mrp: Number(
        createdProduct?.mrp ??
        item.mrp ??
        0
      ),

      costPrice: Number(
        createdProduct?.costPrice ??
        item.costPrice ??
        item.originalNetcost ??
        item.netcost ??
        0
      ),

      netcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      originalNetcost: Number(
        item.originalNetcost ||
        item.netcost ||
        createdProduct?.costPrice ||
        0
      ),

      sellingPrice: Number(
        createdProduct?.sellingPrice ??
        item.sellingPrice ??
        0
      ),

      unit:
        createdProduct?.unit ||
        item.unit ||
        "pcs",

      unitValue: Number(
        createdProduct?.unitValue ??
        item.unitValue ??
        1
      ),
    };

  };

  useEffect(() => {
    registerCreateProduct?.(createInlineProduct);
  }, [registerCreateProduct]);

  return (
    <div className={styles.tableSection}>
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th className={styles.colMrp}>No</th>
            <th className={styles.colBarcode}>Item code</th>
            <th className={styles.colItem}>Items</th>
            <th className={styles.colQty}>Qty</th>
            <th className={styles.colMrp}>Rate</th>
            <th className={styles.colMrp}>GST %</th>
            <th className={styles.colMrp}>Net cost</th>
            <th className={styles.colMrp}>Mrp</th>
            <th className={styles.colMrp}>Selling</th>
            <th className={styles.colMrp}>Roi %</th>
            <th className={styles.colMrp}>Profit %</th>
            <th className={styles.colMrp}>Tax amt</th>
            <th className={styles.colMrp}>Amount</th>
            <th className={styles.colMrp}>Stock</th>
            <th className={styles.colMrp}>Unit</th>
            <th className={styles.colMrp}>Dis %</th>
            <th className={styles.colMrp}>Dis amt</th>
            <th className={styles.colQty}>Free</th>
            <th className={styles.colAmount}>Net amount</th>
            <th className={styles.colAction}></th>
          </tr>
        </thead>

        <tbody>
          {billItems.map((item, index) => (
            <tr key={index} className={styles.itemRow}>
              <td className={styles.colNo}>{index + 1}</td>

              {/* ITEM CODE */}
              <td>
                <input
                  type="text"
                  className={styles.cellInput}
                  value={item.barcode ?? item.itemCode ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "barcode",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* ITEM NAME / SEARCH */}
              <td>
                {item.productId ? (
                  item.productName ||
                  item.itemName ||
                  ""
                ) : (
                  <div className={styles.rowSearchBox}>
                    <input
                      ref={(element) => {
                        itemInputRefs.current[index] =
                          element;
                      }}
                      className={styles.rowSearchInput}
                      type="text"
                      value={
                        rowSearches[index] ??
                        item.productName ??
                        ""
                      }
                      onFocus={() =>
                        setActiveRowIndex(index)
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        searchProductsForRow(
                          index,
                          value
                        );

                        setBillItems((previousItems) => {
                          const updatedItems = [
                            ...previousItems,
                          ];

                          updatedItems[index] = {
                            ...updatedItems[index],
                            productName: value,
                          };

                          return updatedItems;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        const firstProduct =
                          rowSearchResults[index]?.[0];

                        if (firstProduct) {
                          selectRowProduct(
                            index,
                            firstProduct
                          );
                        }
                      }}
                    />

                    {activeRowIndex === index &&
                      rowSearchResults[index]?.length >
                      0 && (
                        <div
                          className={styles.rowDropdown}
                        >
                          {rowSearchResults[index].map(
                            (product) => (
                              <div
                                key={`${product.productId ||
                                  product._id
                                  }-${product.barcode ||
                                  product.itemCode ||
                                  ""
                                  }`}
                                className={
                                  styles.rowDropdownItem
                                }
                                onMouseDown={() =>
                                  selectRowProduct(
                                    index,
                                    product
                                  )
                                }
                              >
                                <div>
                                  <strong>
                                    {product.productName ||
                                      product.name}
                                  </strong>

                                  <p>
                                    Stock:{" "}
                                    {product.stock ??
                                      product.currentStock ??
                                      product.totalQty ??
                                      0}{" "}
                                    {product.unit || "pcs"}
                                  </p>
                                </div>

                                <span>
                                  ₹
                                  {product.costPrice ||
                                    product.mrp ||
                                    0}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}
              </td>

              {/* QUANTITY */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  min="0"
                  step="0.001"
                  value={item.qty ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "qty",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* RATE */}
              <td>{item.rate ?? ""}</td>

              {/* GST */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.tax ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "tax",
                      e.target.value
                    )
                  }
                  placeholder="GST"
                />
              </td>

              {/* NET COST */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.netcost ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "netcost",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* MRP */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.mrp ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "mrp",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* SELLING PRICE */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.sellingPrice ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "sellingPrice",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* ROI */}
              <td>
                {item.roiPercent !== undefined &&
                  item.roiPercent !== ""
                  ? `${item.roiPercent}%`
                  : ""}
              </td>

              {/* PROFIT */}
              <td>
                {item.profitPercent !== undefined &&
                  item.profitPercent !== ""
                  ? `${item.profitPercent}%`
                  : ""}
              </td>

              {/* TAX AMOUNT */}
              <td>
                {item.taxAmount !== undefined &&
                  item.taxAmount !== ""
                  ? `₹ ${item.taxAmount}`
                  : ""}
              </td>

              {/* AMOUNT */}
              <td>
                {item.amount !== undefined &&
                  item.amount !== ""
                  ? `₹ ${item.amount}`
                  : ""}
              </td>

              {/* STOCK */}
              <td>
                {item.productId
                  ? `${Number(
                    item.stock || 0
                  ).toFixed(2)} ${(
                    item.unit || "pcs"
                  ).toUpperCase()}`
                  : ""}
              </td>

              {/* UNIT */}
              <td>
                {item.productId ? (
                  <span>
                    {(item.unit || "pcs").toUpperCase()}
                  </span>
                ) : (
                  <select
                    className={styles.cellInput}
                    value={item.unit || "pcs"}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "unit",
                        e.target.value
                      )
                    }
                  >
                    <option value="pcs">PCS</option>
                    <option value="kg">KG</option>
                    <option value="g">G</option>
                  </select>
                )}
              </td>

 {/* DISCOUNT PERCENT */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.discountPercent ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "discountPercent",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* DISCOUNT AMOUNT */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  value={item.discountAmount ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "discountAmount",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* FREE QUANTITY */}
              <td>
                <input
                  type="number"
                  className={styles.cellInput}
                  min="0"
                  value={item.freeQty ?? ""}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "freeQty",
                      e.target.value
                    )
                  }
                />
              </td>

              {/* NET AMOUNT */}
              <td>
                {item.netAmount !== undefined &&
                  item.netAmount !== ""
                  ? `₹ ${item.netAmount}`
                  : ""}
              </td>

              {/* DELETE */}
              <td className={styles.colAction}>
                <button
                  type="button"
                  className={styles.deleteRowBtn}
                  onClick={() => removeRow(index)}
                >
                  <FiTrash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}