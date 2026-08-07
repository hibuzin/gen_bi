import { FiArrowLeft, FiSave } from "react-icons/fi";
import styles from "./CreatePurchase.module.css";

export default function PurchaseTop({
    navigate,
    isEditMode,
    loading,
    handleSubmit,
}) {
    return (
        <div className={styles.topBar}>
            <div className={styles.topLeft}>
                <div className={styles.topLeft}>
                    <button
                        className={styles.backBtn}
                        onClick={() => navigate(-1)}
                    >
                        <FiArrowLeft />
                    </button>

                    <h2>
                        {isEditMode
                            ? "Edit purchase invoice"
                            : "Create purchase invoice"}
                    </h2>
                </div>
            </div>
            <div className={styles.topRight}>
                <button
                    className={styles.btnPrimary}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    <FiSave size={14} />

                    {loading
                        ? isEditMode
                            ? "Updating..."
                            : "Saving..."
                        : isEditMode
                            ? "Update"
                            : "Save"}
                </button>
            </div>
        </div>
    );
}