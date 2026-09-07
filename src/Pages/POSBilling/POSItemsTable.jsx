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
  const qtyInputRefs = useRef([]);
  const scanInputRef = useRef(null);
  const [rowSearches, setRowSearches] = useState({});
  const [rowSearchResults, setRowSearchResults] = useState({});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const activeFocusedRowRef = useRef(0);
  const [highlightedIndexes, setHighlightedIndexes] = useState({});
  const extraRows = 20;
  const displayRows = [
    ...scannedItems,
    ...Array(extraRows).fill(null),
  ];

  const updateSellingPrice = (rowIndex, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) =>
      prev.map((item, index) =>
        index === rowIndex
          ? {
            ...item,
            sellingPrice: cleanedValue,
          }
          : item
      )
    );
  };

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

      if (Number(stockInfo.stock) <= 0) {
        showToast(`${data.data.productName} is out of stock`, "error");
        return;
      }

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
        const qtyInput = qtyInputRefs.current[rowIndex];

        if (qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
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

      setHighlightedIndexes((prev) => ({
        ...prev,
        [rowIndex]: -1,
      }));

      return;
    }

    try {
      const res = await fetch(
        `${API.searchProduct}?search=${encodeURIComponent(value.trim())}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Product search failed");
      }

      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: Array.isArray(data.data) ? data.data : [],
      }));
    } catch (err) {
      console.log("Product search error:", err);

      setRowSearchResults((prev) => ({
        ...prev,
        [rowIndex]: [],
      }));
    }
  };

  // SELECT SEARCH RESULT
  const selectRowProduct = (rowIndex, product) => {
    const stockInfo = getStockInfo(product);

    if (Number(stockInfo.stock) <= 0) {
      showToast(`${product.productName} is out of stock`, "error");
      return;
    }
    checkLowStock(stockInfo, product.productName);

    setScannedItems((prev) => {
      const updated = [...prev];

      updated[rowIndex] = {
        productId: product.productId,
        productName: product.productName,
        itemCode: product.itemCode,
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

    activeFocusedRowRef.current = rowIndex;

    setTimeout(() => {
      const qtyInput = qtyInputRefs.current[rowIndex];

      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 100);
  };

  // QUANTITY
  const updateQty = (rowIndex, value) => {
    const onlyNumber = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) => {
      const updatedItems = prev.map((item, index) => {
       
        if (index !== rowIndex) {
          return item;
        }

        if (item.stockStatus?.toLowerCase().includes("low")) {
          showToast(`Low stock: ${item.productName}`, "error");
        }

        return {
          ...item,
          qty: onlyNumber,
        };
      });

      // All rows qty அடிப்படையில் codes rebuild
      const updatedCodes = updatedItems.flatMap((item) => {
        const qty = Number(item.qty || 0);
        const barcode = item.barcode || item.itemCode;

        if (!barcode || qty <= 0) {
          return [];
        }

        return Array(Math.floor(qty)).fill(barcode);
      });

      setCodes(updatedCodes);

      return updatedItems;
    });
  };

  // Dis amount
  const updateDiscountAmount = (rowIndex, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) =>
      prev.map((item, index) => {
        if (index !== rowIndex) {
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
  const updateDiscountPercent = (rowIndex, value) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    setScannedItems((prev) =>
      prev.map((item, index) => {
        if (index !== rowIndex) {
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
  const removeItemByIndex = (rowIndex) => {
    let removedBarcode = null;

    setScannedItems((prev) => {
      if (!prev[rowIndex]) return prev;

      removedBarcode = prev[rowIndex].barcode;

      const updatedItems = prev.filter((_, index) => index !== rowIndex);

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

    if (removedBarcode) {
      setCodes((prev) => {
        const removeIndex = prev.findIndex(
          (code) => String(code) === String(removedBarcode)
        );

        if (removeIndex === -1) return prev;

        const updatedCodes = [...prev];
        updatedCodes.splice(removeIndex, 1);

        return updatedCodes;
      });
    }

    setRowSearches((prev) => {
      const updated = {};

      Object.entries(prev).forEach(([key, value]) => {
        const index = Number(key);

        if (index < rowIndex) {
          updated[index] = value;
        } else if (index > rowIndex) {
          updated[index - 1] = value;
        }
      });

      return updated;
    });

    setRowSearchResults((prev) => {
      const updated = {};

      Object.entries(prev).forEach(([key, value]) => {
        const index = Number(key);

        if (index < rowIndex) {
          updated[index] = value;
        } else if (index > rowIndex) {
          updated[index - 1] = value;
        }
      });

      return updated;
    });

    showToast("Item removed", "success");

    const nextFocusIndex = Math.min(
      rowIndex,
      Math.max(scannedItems.length - 1, 0)
    );

    activeFocusedRowRef.current = nextFocusIndex;

    setTimeout(() => {
      if (qtyInputRefs.current[nextFocusIndex]) {
        qtyInputRefs.current[nextFocusIndex].focus();
        qtyInputRefs.current[nextFocusIndex].select();
      } else {
        itemInputRefs.current[nextFocusIndex]?.focus();
      }
    }, 100);
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
    if (scannedItems.length === 0) {
      setRowSearches({});
      setRowSearchResults({});
      setActiveRowIndex(0);

      setTimeout(() => {
        itemInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [scannedItems.length]);

  useEffect(() => {
    const handleDeleteShortcut = (e) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== "d") return;

      e.preventDefault();

      const rowIndex = activeFocusedRowRef.current;

      if (
        rowIndex < 0 ||
        rowIndex >= scannedItems.length ||
        !scannedItems[rowIndex]
      ) {
        return;
      }

      removeItemByIndex(rowIndex);
    };

    document.addEventListener("keydown", handleDeleteShortcut);

    return () => {
      document.removeEventListener("keydown", handleDeleteShortcut);
    };
  }, [scannedItems]);

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
              <th>Qty</th>
              <th>Mrp</th>
              <th>Sp (₹)</th>
              <th>Stock</th>
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
                <tr key={idx}>
                  <td>{idx + 1}</td>

                  <td>
                    {item ? (
                      item.itemCode
                    ) : (
                      <div className={styles.rowSearchBox}>
                        <input
                          ref={(el) => (itemInputRefs.current[idx] = el)}
                          className={styles.cellInput}
                          type="text"
                          value={rowSearches[idx] || ""}
                          onFocus={() => {
                            setActiveRowIndex(idx);
                            activeFocusedRowRef.current = idx;
                          }}
                          onChange={(e) =>
                            searchProductsForRow(idx, e.target.value)
                          }
                          onKeyDown={(e) => {
                            const results = rowSearchResults[idx] || [];
                            const currentIndex = highlightedIndexes[idx] ?? 0;

                            if (e.key === "ArrowDown") {
                              e.preventDefault();

                              if (results.length === 0) return;

                              setHighlightedIndexes((prev) => ({
                                ...prev,
                                [idx]:
                                  currentIndex < results.length - 1
                                    ? currentIndex + 1
                                    : 0,
                              }));

                              return;
                            }

                            if (e.key === "ArrowUp") {
                              e.preventDefault();

                              if (results.length === 0) return;

                              setHighlightedIndexes((prev) => ({
                                ...prev,
                                [idx]:
                                  currentIndex > 0
                                    ? currentIndex - 1
                                    : results.length - 1,
                              }));

                              return;
                            }

                            if (e.key === "Enter") {
                              e.preventDefault();

                              const selectedProduct =
                                results[currentIndex] || results[0];

                              if (selectedProduct) {
                                selectRowProduct(idx, selectedProduct);
                              }

                              return;
                            }

                            if (e.key === "Escape") {
                              e.preventDefault();

                              setRowSearchResults((prev) => ({
                                ...prev,
                                [idx]: [],
                              }));

                              setHighlightedIndexes((prev) => ({
                                ...prev,
                                [idx]: -1,
                              }));
                            }
                          }}
                        />

                        {activeRowIndex === idx &&
                          rowSearchResults[idx]?.length > 0 && (
                            <div className={styles.rowDropdown}>
                              {rowSearchResults[idx].map((product, productIndex) => (
                                <div
                                  key={`${product.productId}-${product.itemCode}`}
                                  className={`${styles.rowDropdownItem} ${highlightedIndexes[idx] === productIndex
                                    ? styles.rowDropdownItemActive
                                    : ""
                                    }`}
                                  onMouseDown={() => {
                                    if (Number(product.stock || 0) > 0) {
                                      selectRowProduct(idx, product);
                                    }
                                  }}
                                >
                                  <div>
                                    <strong>{product.productName}</strong>

                                    <p>
                                      Stock: {product.stock || 0}{" "}
                                      {product.unit || ""}
                                    </p>
                                  </div>

                                  <span>
                                    ₹{product.sellingPrice || product.mrp || 0}
                                  </span>
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
                  <td>
                    {item ? (
                      <div className={styles.qtyCell}>
                        <input
                          ref={(el) => {
                            qtyInputRefs.current[idx] = el;
                          }}
                          className={styles.cellInput}
                          type="text"
                          inputMode="decimal"
                          value={item.qty}
                          onFocus={() => {
                            activeFocusedRowRef.current = idx;
                          }}
                          onChange={(e) => {
                            updateQty(idx, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();

                              const nextRowIndex = idx + 1;

                              activeFocusedRowRef.current = nextRowIndex;

                              setTimeout(() => {
                                itemInputRefs.current[nextRowIndex]?.focus();
                              }, 50);
                            }
                          }}
                        />
                        <span>{getUnit(item)}</span>
                      </div>
                    ) : (
                      ""
                    )}
                  </td>
                  <td>{item ? `₹${item.mrp || 0}` : ""}</td>

                  <td>
                    {item ? (
                      <input
                        className={styles.cellInput}
                        type="text"
                        inputMode="decimal"
                        value={item.sellingPrice ?? ""}
                        onChange={(e) =>
                          updateSellingPrice(idx, e.target.value)
                        }
                        onFocus={() => {
                          activeFocusedRowRef.current = idx;
                        }}
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
                      <div className={styles.amtCell}>
                        ₹{Number(
                          calculatedItem?.finalPrice ??
                          calculatedItem?.totalAmount ??
                          getEffectivePrice(item) * Number(item.qty || 1)
                        ).toFixed(2)}

                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => removeItemByIndex(idx)}
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