import { FiArrowLeft, FiUpload, FiSave } from "react-icons/fi";
import styles from "./PurchaseTopBar.module.css";

function PurchaseTopBar({
  navigate,
  handleUploadImage,
  handleSubmit,
  loading,
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.topLeft}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </button>

        <h2>Create purchase invoice</h2>
      </div>

      <div className={styles.topRight}>
        <button
          className={styles.btnSecondary}
          type="button"
          onClick={handleUploadImage}
        >
          <FiUpload size={14} />
          Upload Image
        </button>

        <button
          className={styles.btnPrimary}
          onClick={handleSubmit}
          disabled={loading}
        >
          <FiSave size={14} />
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default PurchaseTopBar;