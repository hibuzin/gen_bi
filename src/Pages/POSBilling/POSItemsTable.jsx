import { useEffect, useRef, useState } from "react";
import styles from "./POSItemsTable.module.css";
import { API } from "../../constants/api";

function POSItemsTable({
    token,
    scanCode,
    setScanCode,
    scannedItems,
    setScannedItems,
    codes,
    setCodes,
    stockList,
    calculatedItems,
    setCalculatedItems,
    setPreviewSummary,
    showToast,
}) {
    const itemInputRefs = useRef([]);
    const scanInputRef = useRef(null);
    const [rowSearches, setRowSearches] = useState({});
    const [rowSearchResults, setRowSearchResults] = useState({});
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const extraRows = 20;
    const displayRows = [
        ...scannedItems,
        ...Array(extraRows).fill(null),
    ];

    // UNIT
    const getUnit = (item) => {
        return item?.unit ? item.unit.toUpperCase() : "";
    };

    // EFFECTIVE SELLING PRICE
    const getEffectivePrice = (item) => {
        const qty = item.qty || 1;
        const slabs = item.priceLevel?.slabs;
        if (item.priceLevel?.pricingType === "slab" && Array.isArray(slabs)) {
            const matched = slabs.find(
                (s) => qty >= s.minQty && (s.maxQty === null || qty <= s.maxQty)
            );
            if (matched && matched.price > 0) return matched.price;
        }
        return item.sellingPrice || item.mrp || 0;
    };

    // STOCK INFO
    const getStockInfo = (item) => {
        const stockItem = stockList.find(
            (s) =>
                String(s.barcode) === String(item.barcode) ||
                String(s.productId) === String(item.productId)
        );

        return {
            stock: stockItem?.currentStock ?? 0,
            text: stockItem?.currentStock ?? 0,
            status: stockItem?.status || "",
            unit: stockItem?.unit || "",
        };
    };

    // LOW STOCK WARNING
    const checkLowStock = (stockInfo, productName) => {
        if (stockInfo.status?.toLowerCase().includes("low")) {
            showToast(`Low stock: ${productName}`, "error");
        }
    };

    // BARCODE / ITEM CODE ADD
    const addProductToRow = async (rowIndex, value) => {
    if (!value.trim()) return;

    try {
      const res = await fetch(`${API.scan}/${value}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Product not found");

      const stockInfo = getStockInfo(data.data);
      checkLowStock(stockInfo, data.data.productName);

      setScannedItems((prev) => {
        const updated = [...prev];

        updated[rowIndex] = {
          ...data.data,
          barcode: data.data.barcode || value,
          qty: 1,
          unit: data.data.unit || stockInfo.unit || "",
          stock: stockInfo.stock,
          stockText: stockInfo.text,
          stockStatus: stockInfo.status,
        };

        return updated;
      });

      setCodes((prev) => [...prev, data.data.barcode || value]);

      setRowSearches((prev) => ({
        ...prev,
        [rowIndex]: "",
      }));

      setTimeout(() => {
        itemInputRefs.current[rowIndex + 1]?.focus();
      }, 100);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

    // PRODUCT SEARCH
    const searchProductsForRow = async (rowIndex, value) => {
    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: value,
    }));

    setActiveRowIndex(rowIndex);

    if (!value.trim()) {
      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));
      return;
    }

    try {
      const res = await fetch(`${API.bill}/search-product?search=${value}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setRowSearchResults((prev) => ({
          ...prev,
          [rowIndex]: data.data || [],
        }));
      }
    } catch (err) {
      console.log(err);
    }
  };

    // SELECT SEARCH RESULT
    const selectRowProduct = (rowIndex, product) => {
    const stockInfo = getStockInfo(product);
    checkLowStock(stockInfo, product.productName);

    setScannedItems((prev) => {
      const updated = [...prev];

      updated[rowIndex] = {
        productId: product.productId,
        productName: product.productName,
        brand: product.brand,
        barcode: product.barcode,
        mrp: product.mrp || 0,
        priceLevel: product.priceLevel || null,
        sellingPrice: product.sellingPrice || 0,
        flavor: product.flavor || "",
        gst: product.gst || 0,
        stock: stockInfo.stock,
        unit: stockInfo.unit,
        stockText: stockInfo.text,
        stockStatus: stockInfo.status,
        qty: 1,
        discountAmount: "",
        discountPercent: "",
      };

      return updated;
    });

    setCodes((prev) => [...prev, product.barcode]);

    setRowSearches((prev) => ({
      ...prev,
      [rowIndex]: "",
    }));

    setRowSearchResults((prev) => ({
      ...prev,
      [rowIndex]: [],
    }));

    setTimeout(() => {
      itemInputRefs.current[rowIndex + 1]?.focus();
    }, 100);
  };

    // QUANTITY
    const updateQty = (barcode, val) => {
    const onlyNumber = val.replace(/\D/g, "");

    let updatedProductName = null;
    let isLowStock = false;

    setScannedItems((prev) =>
      prev.map((it) => {
        if (String(it.barcode) !== String(barcode)) return it;

        if (it.stockStatus?.toLowerCase().includes("low")) {   // 👈 fix here
          isLowStock = true;
          updatedProductName = it.productName;
        }

        return { ...it, qty: onlyNumber };
      })
    );

    if (isLowStock) {
      showToast(`Low stock: ${updatedProductName}`, "error");
    }

    setCodes((prev) => {
      const qty = Number(onlyNumber || 0);
      const filtered = prev.filter((c) => String(c) !== String(barcode));
      return qty > 0 ? [...filtered, ...Array(qty).fill(barcode)] : filtered;
    });
  };

  // Dis amount
  const updateDiscountAmount = (barcode, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) =>
      prev.map((item) => {
        if (String(item.barcode) !== String(barcode)) {
          return item;
        }

        const qty = Number(item.qty || 1);
        const price = Number(getEffectivePrice(item) || 0);
        const totalAmount = price * qty;

        const enteredAmount = Math.min(
          Number(cleanedValue || 0),
          totalAmount
        );

        const calculatedPercent =
          totalAmount > 0
            ? (enteredAmount / totalAmount) * 100
            : 0;

        return {
          ...item,

          discountAmount:
            cleanedValue === ""
              ? ""
              : Number(enteredAmount.toFixed(2)),

          discountPercent:
            cleanedValue === ""
              ? ""
              : Number(calculatedPercent.toFixed(2)),
        };
      })
    );
  };

  // Dis percent
  const updateDiscountPercent = (barcode, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) =>
      prev.map((item) => {
        if (String(item.barcode) !== String(barcode)) {
          return item;
        }

        const percent = Math.min(
          Number(cleanedValue || 0),
          100
        );

        const qty = Number(item.qty || 1);
        const price = Number(getEffectivePrice(item) || 0);
        const totalAmount = price * qty;

        const calculatedAmount =
          (totalAmount * percent) / 100;

        return {
          ...item,

          discountPercent:
            cleanedValue === ""
              ? ""
              : Number(percent.toFixed(2)),

          discountAmount:
            cleanedValue === ""
              ? ""
              : Number(calculatedAmount.toFixed(2)),
        };
      })
    );
  };

    // REMOVE ITEM
   const removeItem = (barcode) => {
    setScannedItems((prev) => {
      const updatedItems = prev.filter(
        (item) => String(item.barcode) !== String(barcode)
      );

      if (updatedItems.length === 0) {
        setPreviewSummary({
          subTotal: 0,
          cgst: 0,
          sgst: 0,
          totalGST: 0,
          offerPrice: 0,
          grandTotal: 0,
        });

        setCalculatedItems([]);
      }

      return updatedItems;
    });

    setCodes((prev) =>
      prev.filter((code) => String(code) !== String(barcode))
    );

    showToast("Item removed", "success");
  };

    // SCANNER FOCUS
     useEffect(() => {
    scanInputRef.current?.focus();

    const handleClick = (e) => {
      const tag = e.target.tagName?.toLowerCase();

      if (
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        tag === "button"
      ) {
        return;
      }

      scanInputRef.current?.focus();
    };

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  }, []);

    // FIRST ITEM INPUT FOCUS
    useEffect(() => {
        setTimeout(() => {
            itemInputRefs.current[0]?.focus();
        }, 100);
    }, []);

    return (
        <div className={styles.leftPanel}>


            <input
                ref={scanInputRef}
                className={styles.hiddenScanInput}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        const nextEmptyIndex = scannedItems.length;
                        addProductToRow(nextEmptyIndex, scanCode);
                        setScanCode("");
                    }
                }}
                autoComplete="off"
            />
            {/* Table */}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Item code</th>
                            <th>Items</th>
                            <th>Mrp</th>
                            <th>Sp (₹)</th>
                            <th>Dis (₹)</th>
                            <th>Dis (%)</th>
                            <th>Stock</th>
                            <th>Quantity</th>
                            <th>Amount (₹)</th>
                        </tr>
                    </thead>

                    <tbody>
                        {displayRows.map((item, idx) => {
                            const calculatedItem = item
                                ? calculatedItems[idx] ||
                                calculatedItems.find(
                                    (calc) =>
                                        String(calc.productId) === String(item.productId) &&
                                        Number(calc.qty) === Number(item.qty)
                                )
                                : null;

                            return (
                                <tr key={item?.barcode || `empty-${idx}`}>
                                    <td>{idx + 1}</td>

                                    <td>
                                        {item ? (
                                            item.barcode
                                        ) : (
                                            <div className={styles.rowSearchBox}>
                                                <input
                                                    ref={(el) => (itemInputRefs.current[idx] = el)}
                                                    className={styles.cellInput}
                                                    type="text"
                                                    value={rowSearches[idx] || ""}
                                                    onFocus={() => setActiveRowIndex(idx)}
                                                    onChange={(e) => searchProductsForRow(idx, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            const firstItem = rowSearchResults[idx]?.[0];
                                                            if (firstItem) {
                                                                selectRowProduct(idx, firstItem);
                                                            }
                                                        }
                                                    }}
                                                />

                                                {activeRowIndex === idx && rowSearchResults[idx]?.length > 0 && (
                                                    <div className={styles.rowDropdown}>
                                                        {rowSearchResults[idx].map((product) => (
                                                            <div
                                                                key={`${product.productId}-${product.barcode}`}
                                                                className={styles.rowDropdownItem}
                                                                onMouseDown={() => selectRowProduct(idx, product)}
                                                            >
                                                                <div>
                                                                    <strong>{product.productName}</strong>
                                                                    <p>Stock: {getStockInfo(product).text} {getStockInfo(product).unit}</p>
                                                                </div>
                                                                <span>₹{product.sellingPrice || product.mrp || 0}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td>
                                        {item ? (
                                            <>
                                                {item.productName}
                                                {item.flavor && (
                                                    <span className={styles.itemSub}> · {item.flavor}</span>
                                                )}
                                            </>
                                        ) : (
                                            ""
                                        )}
                                    </td>

                                    <td>{item ? `₹${item.mrp || 0}` : ""}</td>

                                    <td>
                                        {item
                                            ? `₹${Number(item.sellingPrice || 0).toFixed(2)}`
                                            : ""}
                                    </td>

                                    <td>
                                        {item ? (
                                            <input
                                                className={styles.cellInput}
                                                type="text"
                                                inputMode="decimal"
                                                value={item.discountAmount ?? ""}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    updateDiscountAmount(item.barcode, e.target.value)
                                                }
                                            />
                                        ) : (
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        {item ? (
                                            <input
                                                className={styles.cellInput}
                                                type="text"
                                                inputMode="decimal"
                                                value={item.discountPercent ?? ""}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    updateDiscountPercent(
                                                        item.barcode,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        ) : (
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        {item?.stock != null
                                            ? `${Number(item.stock).toFixed(2)} ${getUnit(item)}`
                                            : ""}
                                    </td>

                                    <td>
                                        {item ? (
                                            <div className={styles.qtyCell}>
                                                <input
                                                    className={styles.cellInput}
                                                    type="text"
                                                    value={item.qty}
                                                    onChange={(e) => updateQty(item.barcode, e.target.value)}
                                                />
                                                <span>{getUnit(item)}</span>
                                            </div>
                                        ) : (
                                            ""
                                        )}
                                    </td>

                                    <td>
                                        {item ? (
                                            <div className={styles.amtCell}>
                                                ₹{Number(
                                                    calculatedItem?.finalPrice ??
                                                    calculatedItem?.totalAmount ??
                                                    getEffectivePrice(item) * Number(item.qty || 1)
                                                ).toFixed(2)}

                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => removeItem(item.barcode)}
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        ) : (
                                            ""
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default POSItemsTable;