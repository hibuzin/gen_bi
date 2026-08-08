import { useEffect, useState } from "react";
import { API } from "../../constants/api";
import styles from "./CreatePurchase.module.css";

export default function PurchaseHeader({
    form,
    setForm,
    handleChange,
    purchaseTotals,
    token,
    supplierId,
    showToast,
    onSuppliersChange,
    onSupplierSearchChange,
    onSupplierDetailsChange,
    registerCreateSupplier,
}) {

    const [suppliers, setSuppliers] = useState([]);
    const [supplierDetails, setSupplierDetails] = useState({
        number: "",
        address: "",
        gstNumber: "",

    });
    const [supplierSearch, setSupplierSearch] = useState("");
    const [showSupplierList, setShowSupplierList] = useState(false);
    const filteredSuppliers = suppliers.filter((s) =>
        (s.supplierName || "")
            .toLowerCase()
            .includes(supplierSearch.toLowerCase())
    );


    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(API.suppliers, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuppliers(data.data || []);

            const supplierList = data.data || [];
            setSuppliers(supplierList);
            onSuppliersChange?.(supplierList);

            if (supplierId) {
                setForm((prev) => ({
                    ...prev,
                    supplierId,
                }));
            }
        } catch {
            showToast("Failed to load suppliers", "error");
        }
    };

    useEffect(() => {
        if (!form.supplierId || suppliers.length === 0) return;

        const supplier = suppliers.find(
            (s) => String(s._id || s.id) === String(form.supplierId)
        );

        if (!supplier) return;

        setSupplierSearch(
            supplier.supplierName || supplier.name || ""
        );

        setSupplierDetails({
            number:
                supplier.phone ||
                supplier.mobile ||
                supplier.supplierPhone ||
                "",

            address: supplier.address || "",

            gstNumber: supplier.gstNumber || "",

            city: supplier.city || "",

            state: supplier.state || "",

            pincode: supplier.pincode || "",
        });
    }, [form.supplierId, suppliers]);

    const createInlineSupplier = async () => {
        const supplierPayload = {
            supplierName: String(supplierSearch || "").trim(),
            mobile: String(supplierDetails.number || "").trim(),
            gstNumber: String(supplierDetails.gstNumber || "").trim(),
            address: String(supplierDetails.address || "").trim(),
            city: String(supplierDetails.city || "").trim(),
            state: String(supplierDetails.state || "").trim(),
            pincode: String(supplierDetails.pincode || "").trim(),

            panNumber: "",
            email: "",

            bankDetails: {
                accountHolderName: "",
                bankName: "",
                accountNumber: "",
                ifscCode: "",
                branchName: "",
            },
        };

        const res = await fetch(API.createsupplier, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(supplierPayload),
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(
                data.message || "Failed to create supplier"
            );
        }

        const createdSupplier =
            data.data?.supplier ||
            data.data?.createdSupplier ||
            data.supplier ||
            data.data;

        const createdSupplierId =
            createdSupplier?._id ||
            createdSupplier?.supplierId ||
            data.data?.supplierId ||
            data.supplierId;

        if (!createdSupplierId) {
            throw new Error(
                "Supplier created but supplier ID was not returned"
            );
        }

        return {
            supplierId: String(createdSupplierId),
            supplier: createdSupplier,
        };
    };

    const updateSupplierDetail = (field, value) => {
        const updatedDetails = {
            ...supplierDetails,
            [field]: value,
        };

        setSupplierDetails(updatedDetails);

        onSupplierDetailsChange?.(
            updatedDetails
        );
    };

    useEffect(() => {
        registerCreateSupplier?.(createInlineSupplier);
    }, [
        registerCreateSupplier,
        supplierSearch,
        supplierDetails,
        token,
    ]);

    const handleSupplierSearchChange = (e) => {
        const value = e.target.value;

        setSupplierSearch(value);
        onSupplierSearchChange?.(value);

        setShowSupplierList(true);

        const emptyDetails = {
            number: "",
            address: "",
            gstNumber: "",
            city: "",
            state: "",
            pincode: "",
        };

        setSupplierDetails(emptyDetails);
        onSupplierDetailsChange?.(emptyDetails);

        setForm((prev) => ({
            ...prev,
            supplierId: "",
        }));
    };

    const handleSupplierSelect = (supplier) => {
        const selectedName =
            supplier.supplierName ||
            supplier.name ||
            "";

        const selectedDetails = {
            number:
                supplier.phone ||
                supplier.mobile ||
                supplier.supplierPhone ||
                "",

            address:
                supplier.address || "",

            gstNumber:
                supplier.gstNumber || "",

            city:
                supplier.city || "",

            state:
                supplier.state || "",

            pincode:
                supplier.pincode || "",
        };

        setSupplierSearch(selectedName);
        setSupplierDetails(selectedDetails);

        onSupplierSearchChange?.(
            selectedName
        );

        onSupplierDetailsChange?.(
            selectedDetails
        );

        setForm((prev) => ({
            ...prev,
            supplierId:
                supplier._id || supplier.id,
        }));

        setShowSupplierList(false);
    };

    return (
        <div className={styles.headerSection}>
            <div className={styles.billFrom}>
                <div className={styles.supplierDetailsGrid}>
                    <div className={styles.supplierDetailField}>
                        <label>Name</label>

                        <input
                            value={supplierSearch}
                            placeholder="Search supplier"
                            onFocus={() => setShowSupplierList(true)}
                            onChange={handleSupplierSearchChange}
                        />

                        {showSupplierList && supplierSearch && (
                            <div className={styles.supplierDropdown}>
                                {filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map((supplier) => (
                                        <div
                                            key={supplier._id || supplier.id}
                                            className={styles.supplierOption}
                                            onClick={() =>
                                                handleSupplierSelect(supplier)
                                            }
                                        >
                                            <div className={styles.supplierName}>
                                                {supplier.supplierName ||
                                                    supplier.name}
                                            </div>

                                            <div className={styles.supplierSub}>
                                                {supplier.phone ||
                                                    supplier.mobile ||
                                                    "No number"}{" "}
                                                •{" "}
                                                {supplier.gstNumber ||
                                                    "No GST"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.noSupplier}>
                                        No supplier found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>Number</label>

                        <input
                            value={supplierDetails.number}
                            readOnly={Boolean(form.supplierId)}
                            placeholder={
                                form.supplierId
                                    ? ""
                                    : "Enter mobile"
                            }
                            onChange={(e) =>
                                updateSupplierDetail(
                                    "number",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>Address</label>

                        <input
                            value={supplierDetails.address}
                            readOnly={Boolean(form.supplierId)}
                            placeholder={
                                form.supplierId
                                    ? ""
                                    : "Enter address"
                            }
                            onChange={(e) =>
                                updateSupplierDetail(
                                    "address",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>GST no</label>

                        <input
                            value={supplierDetails.gstNumber}
                            readOnly={Boolean(form.supplierId)}
                            placeholder={
                                form.supplierId
                                    ? ""
                                    : "Enter GST no"
                            }
                            onChange={(e) =>
                                updateSupplierDetail(
                                    "gstNumber",
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </div>
            </div>

            <div className={styles.invoiceMeta}>
                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>Purchase inv date</label>

                        <input
                            type="date"
                            name="invoiceDate"
                            value={form.invoiceDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>Invoice Amount</label>

                        <input
                            type="text"
                            name="invoiceAmount"
                            value={form.invoiceAmount}
                            onChange={handleChange}
                            placeholder="Enter invoice amount"
                        />
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>Purchase inv number</label>

                        <input
                            type="text"
                            name="invoiceNo"
                            value={form.invoiceNo}
                            onChange={handleChange}
                            placeholder="INV-1235"
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>GRN date</label>

                        <input
                            type="date"
                            name="grnDate"
                            value={form.grnDate}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>GRN amount</label>

                        <input
                            type="text"
                            value={Number(
                                purchaseTotals.itemsTotal || 0
                            ).toFixed(2)}
                            readOnly
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>Due date</label>

                        <input
                            type="date"
                            name="dueDate"
                            value={form.dueDate}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}