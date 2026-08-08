import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import styles from "./BulkAction.module.css";
import { API } from "../../constants/api";

const columns = [
  "Name",
  "Brand",
  "Category ID",
  "HSN",
  "GST %",
  "MRP",
  "Cost Price",
  "Selling Price",
  "Barcode",
];

const ROW_HEIGHT = 34;
const BUFFER = 8;
const INITIAL_ROWS = 4000;

const createRow = () => columns.map(() => "");

function BulkAction() {
  const [data, setData] = useState(() =>
    Array.from({ length: INITIAL_ROWS }, createRow)
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const containerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(API.categories, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []))
      .catch(console.error);
  }, []);


  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalRows = data.length;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
  );
  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER
  );

  const visibleRows = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  const updateCell = useCallback((rowIdx, colIdx, value) => {
    setData((prev) => {
      const next = prev.slice();
      const row = next[rowIdx].slice();
      row[colIdx] = value;
      next[rowIdx] = row;
      return next;
    });
  }, []);

  const deleteRow = useCallback((rowIdx) => {
    setData((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  const add1000Rows = () => {
    setData((prev) => [
      ...prev,
      ...Array.from({ length: 1000 }, createRow),
    ]);
  };


  const handleCreateCategory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory,
        }),
      });

      const result = await res.json();

      console.log("Status:", res.status);
      console.log("Response:", result);

      if (!res.ok) {
        alert(result.message || "Failed");
        return;
      }

      setCategories((prev) => [...prev, result.data]);

      setNewCategory("");
      setShowCategoryModal(false);

      alert("Category Created");
    } catch (err) {
      console.error(err);
    }
  };

  const submitBulk = async () => {
    try {
      const token = localStorage.getItem("token");

      const products = data
        .filter((row) => row.some((cell) => cell))
        .map((row) => ({
          name: row[0] || "",
          brand: row[1] || "",
          categoryId: row[2] || "",
          hsnCode: row[3] || "",
          gstRate: Number(row[4] || 0),
          mrp: Number(row[5] || 0),
          costPrice: Number(row[6] || 0),
          sellingPrice: Number(row[7] || 0),
          barcode: row[8] || "",
        }));

      const payload = { products };

      const res = await fetch(
        API.bulkAddProducts,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();

      if (res.ok) {
        alert("Products Added Successfully");
      } else {
        alert(result.message || "Failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Bulk Product Upload</h2>
      </div>

      <div
        className={styles.excelGrid}
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div className={styles.excelGridInner}>
          <div className={styles.excelHeader}>
            <div className={styles.rowNumber}>#</div>
            {columns.map((col) => (
              <div key={col}>{col}</div>
            ))}
            <div></div>
          </div>

          <div style={{ height: totalRows * ROW_HEIGHT, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: startIndex * ROW_HEIGHT,
                left: 0,
                right: 0,
              }}
            >
              {visibleRows.map((row, i) => {
                const rowIdx = startIndex + i;
                return (
                  <div className={styles.excelRow} key={rowIdx}>
                    <div className={styles.rowNumber}>{rowIdx + 1}</div>
                    {row.map((cell, colIdx) => {

                      if (colIdx === 2) {
                        return (
                          <select
                            key={colIdx}
                            className={styles.excelCell}
                            value={cell}
                            onChange={(e) => {

                              if (e.target.value === "__add_category__") {
                                setShowCategoryModal(true);
                                return;
                              }

                              updateCell(rowIdx, colIdx, e.target.value);
                            }}
                          >
                            <option value="">Select</option>

                            {categories.map((cat) => (
                              <option
                                key={cat._id}
                                value={cat._id}
                              >
                                {cat.name}
                              </option>
                            ))}

                            <option value="__add_category__">
                              + Add Category
                            </option>
                          </select>
                        );
                      }

                      return (
                        <input
                          key={colIdx}
                          className={styles.excelCell}
                          value={cell}
                          onChange={(e) =>
                            updateCell(rowIdx, colIdx, e.target.value)
                          }
                        />
                      );
                    })}

                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteRow(rowIdx)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.addBtn} onClick={add1000Rows}>
          +1000 Rows
        </button>

        <button className={styles.submitBtn} onClick={submitBulk}>
          Submit Products
        </button>
      </div>
      {showCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>

            <h3>Create Category</h3>

            <input
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value)
              }
            />

            <div className={styles.modalActions}>

              <button
                onClick={() =>
                  setShowCategoryModal(false)
                }
              >
                Cancel
              </button>

              <button
                onClick={handleCreateCategory}
              >
                Create
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default BulkAction;