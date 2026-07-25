import { useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import styles from "./PurchaseItemsTable.module.css";
import { API } from "../../constants/api";

function PurchaseItemsTable({
    billItems,
    setBillItems,
    emptyItem,
    calculatePurchase,
    token,
}) {

    const [rowSearches, setRowSearches] = useState({});
    const [rowSearchResults, setRowSearchResults] = useState({});
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const itemInputRefs = useRef([]);

    const searchProductsForRow = async (rowIndex, value) => {
        setRowSearches((prev) => ({ ...prev, [rowIndex]: value }));
        setActiveRowIndex(rowIndex);

        if (!value.trim()) {
            setRowSearchResults((prev) => ({ ...prev, [rowIndex]: [] }));
            return;
        }

        try {
            const res = await fetch(
                `${API.products}/search?search=${encodeURIComponent(value)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();

            if (data.success) {
                setRowSearchResults((prev) => ({
                    ...prev,
                    [rowIndex]: data.data || [],
                }));
            } else {
                setRowSearchResults((prev) => ({
                    ...prev,
                    [rowIndex]: [],
                }));
            }
        } catch (err) {
            console.log(err);
            setRowSearchResults((prev) => ({
                ...prev,
                [rowIndex]: [],
            }));
        }
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
            netcost: Number(product.netcost || product.costPrice || product.purchasePrice || 0),
            rate: Number(product.rate || product.costPrice || product.purchasePrice || 0),
            sellingPrice: Number(product.sellingPrice || 0),
            tax: Number(product.gstRate || product.tax || 0),
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

    const removeRow = (index) => {
        setBillItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...emptyItem };
            return updated;
        });
    };

    return (
        <div className={styles.tableSection}>
            <table className={styles.itemsTable}>
                <thead>
                    <tr>
                        <th className={styles.colMrp}>No</th>
                        <th className={styles.colBarcode}>Item code</th>
                        <th className={styles.colItem}>Items</th>
                        <th className={styles.colMrp}>Dis %</th>
                        <th className={styles.colMrp}>Dis amt</th>
                        <th className={styles.colMrp}>Rate</th>
                        <th className={styles.colMrp}>GST %</th>
                        <th className={styles.colMrp}>Mrp</th>
                        <th className={styles.colMrp}>Selling</th>
                        <th className={styles.colMrp}>Roi %</th>
                        <th className={styles.colMrp}>Profit %</th>
                        <th className={styles.colMrp}>Tax amt</th>
                        <th className={styles.colMrp}>Net cost</th>
                        <th className={styles.colMrp}>Amount</th>
                        <th className={styles.colMrp}>Stock</th>
                        <th className={styles.colQty}>Qty</th>
                        <th className={styles.colQty}>Free</th>
                        <th className={styles.colAmount}>Net amount</th>
                        <th className={styles.colAction}></th>
                    </tr>
                </thead>
                <tbody>
                    {billItems.map((item, index) => {
                        const lineTotal =
                            (Number(item.qty) || 0) * (Number(item.costPrice) || 0) -
                            (Number(item.discount) || 0);

                        return (
                            <tr key={index} className={styles.itemRow}>
                                <td className={styles.colNo}>{index + 1}</td>
                                <td>
                                    {item.itemCode || ""}
                                </td>
                                <td>
                                    {item.productId ? (
                                        item.productName || item.itemName || ""
                                    ) : (
                                        <div className={styles.rowSearchBox}>
                                            <input
                                                ref={(el) => (itemInputRefs.current[index] = el)}
                                                className={styles.rowSearchInput}
                                                type="text"
                                                placeholder=""
                                                value={rowSearches[index] || ""}
                                                onFocus={() => setActiveRowIndex(index)}
                                                onChange={(e) => searchProductsForRow(index, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        const firstItem = rowSearchResults[index]?.[0];
                                                        if (firstItem) selectRowProduct(index, firstItem);
                                                    }
                                                }}
                                            />

                                            {activeRowIndex === index && rowSearchResults[index]?.length > 0 && (
                                                <div className={styles.rowDropdown}>
                                                    {rowSearchResults[index].map((product) => (
                                                        <div
                                                            key={`${product.productId || product._id}-${product.barcode}`}
                                                            className={styles.rowDropdownItem}
                                                            onMouseDown={() => selectRowProduct(index, product)}
                                                        >
                                                            <div>
                                                                <strong>{product.productName || product.name}</strong>
                                                                <p>
                                                                    Stock:{" "}
                                                                    {product.stock ??
                                                                        product.currentStock ??
                                                                        product.totalQty ??
                                                                        0}{" "}
                                                                    {product.unit || "pcs"}
                                                                </p>
                                                            </div>
                                                            <span>₹{product.costPrice || product.mrp || 0}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        value={item.discountPercent ?? ""}
                                        onChange={(e) => updateItem(index, "discountPercent", e.target.value)}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        value={item.discountAmount ?? ""}
                                        onChange={(e) => updateItem(index, "discountAmount", e.target.value)}
                                    />
                                </td>

                                <td>
                                    {item.rate ?? ""}
                                </td>

                                <td>
                                    {item.productId
                                        ? `${Number(item.tax || item.gstRate || 0)}%`
                                        : ""}
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        value={item.mrp ?? ""}
                                        onChange={(e) => updateItem(index, "mrp", e.target.value)}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        value={item.sellingPrice ?? ""}
                                        onChange={(e) => updateItem(index, "sellingPrice", e.target.value)}
                                    />
                                </td>

                                <td>
                                    {item.productId && item.roiPercent !== undefined && item.roiPercent !== ""
                                        ? `${item.roiPercent}%`
                                        : ""}
                                </td>

                                <td>
                                    {item.productId &&
                                        item.profitPercent !== undefined &&
                                        item.profitPercent !== ""
                                        ? `${item.profitPercent}%`
                                        : ""}
                                </td>

                                <td>
                                    {item.productId &&
                                        item.taxAmount !== undefined &&
                                        item.taxAmount !== ""
                                        ? `₹ ${item.taxAmount}`
                                        : ""}
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        value={item.netcost ?? ""}
                                        onChange={(e) => updateItem(index, "netcost", e.target.value)}
                                    />
                                </td>

                                <td>
                                    {item.productId && item.amount !== undefined && item.amount !== ""
                                        ? `₹ ${item.amount}`
                                        : ""}
                                </td>

                                <td>
                                    {item.productId
                                        ? `${Number(item.stock || 0).toFixed(2)} ${(
                                            item.unit || "pcs"
                                        ).toUpperCase()}`
                                        : ""}
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        min="1"
                                        value={item.qty ?? ""}
                                        onChange={(e) => updateItem(index, "qty", e.target.value)}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        className={styles.cellInput}
                                        min="0"
                                        value={item.freeQty ?? ""}
                                        onChange={(e) => updateItem(index, "freeQty", e.target.value)}
                                    />
                                </td>

                                <td>
                                    {item.productId &&
                                        item.netAmount !== undefined &&
                                        item.netAmount !== ""
                                        ? `₹ ${item.netAmount}`
                                        : ""}
                                </td>

                                <td className={styles.colAction}>
                                    <button
                                        className={styles.deleteRowBtn}
                                        onClick={() => removeRow(index)}
                                        type="button"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default PurchaseItemsTable;