import { useState } from "react";
import styles from "./PrintSettings.module.css";
import {
  FaCheckCircle,
  FaImage,
} from "react-icons/fa";
import printerImg from "../../../assets/printer.png";

function PrintSettings() {

  const [logo, setLogo] = useState(null);

  const [activeTab, setActiveTab] =
    useState("thermal");

  const [paperSize, setPaperSize] =
    useState("3");

  const [barcodeType, setBarcodeType] =
    useState("a4");

  return (

      <div className={styles.card}>

        {/* HEADER */}

        <div className={styles.header}>
          <h1>Print Settings</h1>
        </div>

        <div className={styles.layout}>

          {/* LEFT SIDE */}

          <div className={styles.leftPanel}>

            {/* TABS */}

            <div className={styles.tabs}>

              <button
                className={`${styles.tabBtn} ${activeTab === "thermal"
                  ? styles.active
                  : ""
                  }`}
                onClick={() =>
                  setActiveTab("thermal")
                }
              >
                Thermal Printer
              </button>

              <button
                className={`${styles.tabBtn} ${activeTab === "barcode"
                  ? styles.active
                  : ""
                  }`}
                onClick={() =>
                  setActiveTab("barcode")
                }
              >
                Barcode Printer
              </button>

            </div>

            {/* THERMAL */}

            {activeTab === "thermal" && (
              <>

                <div className={styles.section}>

                  <div className={styles.sectionTitle}>
                    Select your Invoice theme
                  </div>

                  <div className={styles.optionList}>

                    <div
                      className={`${styles.optionCard} ${paperSize === "2"
                        ? styles.selected
                        : ""
                        }`}
                      onClick={() =>
                        setPaperSize("2")
                      }
                    >
                      <span>2 Inch</span>

                      {paperSize === "2" && (
                        <FaCheckCircle
                          className={
                            styles.check
                          }
                        />
                      )}
                    </div>

                    <div
                      className={`${styles.optionCard} ${paperSize === "3"
                        ? styles.selected
                        : ""
                        }`}
                      onClick={() =>
                        setPaperSize("3")
                      }
                    >
                      <span>3 Inch</span>

                      {paperSize === "3" && (
                        <FaCheckCircle
                          className={
                            styles.check
                          }
                        />
                      )}
                    </div>

                  </div>

                </div>

                {/* LOGO */}

                <div className={styles.section}>

                  <div className={styles.sectionTitle}>
                    Business Logo
                  </div>

                  <div className={styles.logoBox}>

                    <label
                      className={styles.logoUpload}>

                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files[0];

                          if (file) {
                            setLogo(URL.createObjectURL(file));
                          }
                        }}
                      />

                      {logo ? (
                        <img
                          src={logo}
                          alt="Logo"
                          className={styles.previewLogo}
                        />
                      ) : (
                        <>
                          <FaImage />

                          <p>
                            Upload Monochrome Logo
                          </p>
                        </>
                      )}

                    </label>

                    <div
                      className={styles.noteBox}
                    >
                      You can only upload your logo in Monochrome,
                      *.bmp extension and 210px (max width) x 70pх
                      (max height) dimensions. To learn how to resize
                      and covert your logo to Monochrome
                    </div>

                  </div>

                </div>

              </>
            )}

            {/* BARCODE */}

            {activeTab === "barcode" && (
              <div className={styles.section}>

                <div className={styles.optionList}>

                  <div
                    className={`${styles.optionCard} ${barcodeType ===
                      "label"
                      ? styles.selected
                      : ""
                      }`}
                    onClick={() =>
                      setBarcodeType(
                        "label"
                      )
                    }
                  >
                    <span>
                      Label Print
                    </span>

                    {barcodeType ===
                      "label" && (
                        <FaCheckCircle
                          className={
                            styles.check
                          }
                        />
                      )}
                  </div>

                  <div
                    className={`${styles.optionCard} ${barcodeType ===
                      "a4"
                      ? styles.selected
                      : ""
                      }`}
                    onClick={() =>
                      setBarcodeType("a4")
                    }
                  >
                    <span>A4 Print</span>

                    {barcodeType ===
                      "a4" && (
                        <FaCheckCircle
                          className={
                            styles.check
                          }
                        />
                      )}
                  </div>

                </div>

              </div>
            )}

          </div>

          {/* RIGHT SIDE */}

          <div className={styles.rightPanel}>

            <div className={styles.previewBox}>

              {activeTab === "thermal" ? (

                <>
                  <div className={styles.previewHeader}>
                    This is a preview of the
                    Thermal Print
                  </div>

                  <div
                    className={styles.bill}
                    style={{
                      width:
                        paperSize === "2"
                          ? "220px"
                          : "300px",
                    }}
                  >

                    <div className={styles.billHeader}>

                      <div className={styles.shopTop}>

                        {logo && (
                          <img
                            src={logo}
                            alt="Logo"
                            className={styles.billLogo}
                          />
                        )}

                        <div>
                          <h2>
                            ABC Super Market
                          </h2>

                          <p>Chennai</p>

                          <p>
                            GST :
                            33ABCDE1234F1Z5
                          </p>
                        </div>

                      </div>

                    </div>

                    <div
                      className={
                        styles.dashed
                      }
                    ></div>

                    <div
                      className={
                        styles.row
                      }
                    >
                      <span>Bill No</span>
                      <span>#1025</span>
                    </div>

                    <div
                      className={
                        styles.row
                      }
                    >
                      <span>Date</span>
                      <span>19/05/2026</span>
                    </div>

                    <div
                      className={
                        styles.dashed
                      }
                    ></div>

                    <table
                      className={styles.table}
                    >
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>Dove</td>
                          <td>2</td>
                          <td>40</td>
                        </tr>

                        <tr>
                          <td>Rice</td>
                          <td>1</td>
                          <td>65</td>
                        </tr>

                        <tr>
                          <td>Milk</td>
                          <td>3</td>
                          <td>90</td>
                        </tr>
                      </tbody>
                    </table>

                    <div
                      className={
                        styles.dashed
                      }
                    ></div>

                    <div
                      className={
                        styles.totalRow
                      }
                    >
                      <span>Subtotal</span>
                      <span>195</span>
                    </div>

                    <div
                      className={`${styles.totalRow} ${styles.grand}`}
                    >
                      <span>Total</span>
                      <span>₹195</span>
                    </div>

                    <div
                      className={
                        styles.dashed
                      }
                    ></div>

                    <div
                      className={
                        styles.footer
                      }
                    >
                      Thank You Visit Again
                    </div>

                  </div>
                </>

              ) : (

                <div className={styles.barcodePreview}>

                  <img
                    src={printerImg}
                    alt="Barcode Printer"
                    className={styles.printerImage}
                  />

                  <h3>
                    How Does it Work?
                  </h3>

                  <p>
                    Barcode printing on A4 paper works with barcode dimensions of 52.5
                    x25 mm, having 4 barcodes per row Visit Link to see a paper of
                    matching dimensions on Amazon.in

                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

      </div>


  );
}

export default PrintSettings;