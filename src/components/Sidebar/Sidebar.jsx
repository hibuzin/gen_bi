import styles from "./Sidebar.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaUsers, FaBox, FaChartBar, FaTags, FaCog } from "react-icons/fa";
import { MdPayments, MdInventory } from "react-icons/md";
import { RiMoneyDollarCircleLine, } from "react-icons/ri";
import { API } from "../../constants/api";
import {
  FaTruckLoading, FaUserCircle,
  FaFileInvoice,
  FaChevronRight,
  FaPrint,
  FaHeadset,
  FaShieldAlt,
} from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";
import { FaBars } from "react-icons/fa";
import { useState, useEffect } from "react";
import { APP_VERSION } from "../../version";
import { FaSignOutAlt } from "react-icons/fa";
import {
    getSavedAccounts,
    getActiveAccount,
    switchAccount,
} from "../../utils/accountManager";



const getRoleFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role;
  } catch {
    return null;
  }
};




function Sidebar({ collapsed, setCollapsed, lang }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const [settingsMode, setSettingsMode] = useState(false);

const [savedAccounts, setSavedAccounts] = useState(
    () => getSavedAccounts()
);

const [activeAccountId, setActiveAccountId] = useState(
    () => getActiveAccount()?.accountId || null
);

const [showAccountSwitcher, setShowAccountSwitcher] =
    useState(false);

  const role = getRoleFromToken();
  const location = useLocation();

  

  const [business, setBusiness] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || {};
  });

  const businessName = business.CompanyName || "";
  const phone = business.CompanyPhone || "";

  useEffect(() => {
    const updateAccounts = () => {
        setSavedAccounts(
            getSavedAccounts()
        );

        setActiveAccountId(
            getActiveAccount()?.accountId || null
        );
    };

    window.addEventListener(
        "accountSwitched",
        updateAccounts
    );

    window.addEventListener(
        "accountsUpdated",
        updateAccounts
    );

    return () => {
        window.removeEventListener(
            "accountSwitched",
            updateAccounts
        );

        window.removeEventListener(
            "accountsUpdated",
            updateAccounts
        );
    };
}, []);

  useEffect(() => {
    const updateBusiness = () => {
      const updatedUser =
        JSON.parse(localStorage.getItem("user")) || {};

      setBusiness(updatedUser);
    };

    window.addEventListener("businessUpdated", updateBusiness);

    return () => {
      window.removeEventListener("businessUpdated", updateBusiness);
    };
  }, []);

  const logo =
    localStorage.getItem(
      "businessLogo"
    ) || "";

  const settingsMenu = [
    {
      name: lang === "ta" ? "கணக்கு" : "Account",
      path: "/account",
      icon: <FaUserCircle />,
    },
    {
      name: lang === "ta" ? "வணிகத்தை நிர்வகிக்கவும்" : "Manage Business",
      path: "/managebusiness",
      icon: <FaUserCircle />,
    },
    {
      name: lang === "ta" ? "பயனர்கள் நிர்வாகம்" : "Manage Users",
      path: "/settings/users",
      icon: <FaUsers />,
    },
    {
      name: lang === "ta" ? "இன்வாய்ஸ் அமைப்புகள்" : "Invoice Settings",
      path: "/settings/invoice",
      icon: <FaFileInvoice />,
    },
    {
      name: lang === "ta" ? "அச்சு அமைப்புகள்" : "Print Settings",
      path: "/settings/print",
      icon: <FaPrint />,
    },
    {
      name: lang === "ta" ? "உதவி & ஆதரவு" : "Help & Support",
      path: "/settings/support",
      icon: <FaHeadset />,
    },

    {
    name:
        lang === "ta"
            ? "கணக்கை மாற்றவும்"
            : "Switch Account",
    path: "/switch-account",
    icon: <FaUserCircle />,
    switchAccount: true,
},

    {
      divider: true
    },

    {
      name: lang === "ta" ? "வெளியேறு" : "Logout",
      path: "/logout",
      icon: <FaSignOutAlt />,
      logout: true,
    },
  ];

  const menu = [

    {
      name: lang === "ta" ? "முகப்பு பலகம்" : "DASHBOARD",
      path: "/home",
      icon: <FaHome />
    },

    {
      name: lang === "ta" ? "வாடிக்கையாளர்கள்" : "CUSTOMERS",
      path: "/customers",
      icon: <FaUsers />
    },

    {
      name: lang === "ta" ? "பொருட்கள்" : "ITEMS",
      path: "/product",
      icon: <FaBox />,
    },

    {
      name: lang === "ta" ? "சப்ளையர்கள்" : "SUPPLIERS",
      path: "/supplier",
      icon: <FaTruckLoading />
    },

    {
      name: lang === "ta" ? "கொள்முதல்" : "PURCHASE",
      path: "/purchase",
      icon: <FaFileInvoice />
    },

    {
      name: lang === "ta" ? "விற்பனை" : "SALES",
      icon: <RiMoneyDollarCircleLine />,
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "Sales check", path: "/sales" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "Top Selling Products", path: "topsellingproduct" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "Session Handle", path: "session-management" },
      ],
    },
    {
      name: lang === "ta" ? "பொருட்கள்" : "REPACK",
      path: "/repack",
      icon: <FaBox />,
    },
    {
      name: lang === "ta" ? "பொருட்கள்" : "RETURN",
      icon: <FaBox />,
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "purchase return ", path: "/return" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "sales return", path: "/sales-return" },
      ],
    },
    {
      name: lang === "ta" ? "பொருட்கள்" : "PAYMENT",
      path: "/payment",
      icon: <FaBox />,
    },
    {
      name: lang === "ta" ? "சரக்கு" : "STOCKS",
      path: "/stocks",
      icon: <MdInventory />,
    },

    {
      name: lang === "ta" ? "விற்பனை" : "GST",
      icon: <RiMoneyDollarCircleLine />,
      onlyRole: "super_admin",
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "purchase report", path: "/Purchase-reports" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "sales reports", path: "Bill-reports" },
      ],
    },

    {
      name: lang === "ta" ? "சலுகைகள்" : "OFFERS",
      path: "/offers",
      icon: <FaTags />
    },
  ];

  const handleSwitchAccount = (accountId) => {
  try {
    const account = switchAccount(accountId);

    console.log("SWITCHED ACCOUNT:", account);

    setShowAccountSwitcher(false);
    setSettingsMode(false);

    // Notify the application
    window.dispatchEvent(
      new Event("accountSwitched")
    );

    window.dispatchEvent(
      new Event("businessUpdated")
    );

    // Reload the application so every page
    // uses the new Super Admin token/data
    window.location.reload();

  } catch (error) {
    console.error(
      "ACCOUNT SWITCH ERROR:",
      error
    );
  }
};
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.logout, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Logout failed");
      }

    } catch (err) {
      console.error(err);
    } finally {
      const defaultUnit = localStorage.getItem("defaultUnit") || "pcs";

      localStorage.clear();
      localStorage.setItem("defaultUnit", defaultUnit);

      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      className={`
    ${styles.sidebar}
    ${collapsed ? styles.collapsed : ""}
    ${settingsMode ? styles.settingsSidebar : ""}
  `}
    >

      {/* TOP FIXED */}

      <div className={styles.topFixed}>

        <div className={styles.topBar}>

          {!collapsed && (
            <div className={styles.businessSection}>



              <div className={styles.billRow}>

                <button
                  className={styles.billBtn}
                  onClick={() => navigate("/posbilling")}
                >
                  + Create Sale Invoice
                </button>
                {/*
      <button
        className={styles.menuBtn}
        onClick={() => setCollapsed(!collapsed)}
      >
        <FaBars />
      </button>
*/}
              </div>

            </div>
          )}



          {/*
{collapsed && (
  <FaBars
    className={styles.toggleBtn}
    onClick={() => setCollapsed(!collapsed)}
  />
)}
*/}


        </div>

      </div>

      <div className={styles.menuWrapper}>

        <ul className={styles.menu}>
          {!settingsMode ? (
            menu
              .filter(
                item =>
                  item.key !== "settings" &&
                  (
                    !item.onlyRole ||
                    item.onlyRole === role
                  )
              )

              .map((item, index) => (
                <div key={index}>
                  {!collapsed && index === 0 && (
                    <div className={styles.menuHeading}>General</div>
                  )}

                  {!collapsed && item.path === "/purchase" && (
                    <div className={styles.menuHeading}>Sales</div>
                  )}

                  {!collapsed && item.path === "/stocks" && (
                    <div className={styles.menuHeading}>Inventory</div>
                  )}
                  <li
                    className={`${styles.item} ${location.pathname === item.path
                      ? styles.active
                      : ""
                      }`}
                    onClick={() => {
                      if (item.key === "settings") {
                        setSettingsMode(true);
                        navigate("/account");
                      } else if (item.children) {
                        setOpenMenu(openMenu === index ? null : index);
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    <div className={styles.menuItem}>
                      <span className={styles.icon}>{item.icon}</span>

                      {!collapsed && <span className={styles.text}>
                        {item.name}
                      </span>}
                    </div>

                    {!collapsed && item.children && (
                      <span
                        className={`${styles.arrow} ${openMenu === index ? styles.rotate : ""
                          }`}
                      >
                        <FaChevronRight />
                      </span>
                    )}
                  </li>

                  {!collapsed && item.children && openMenu === index && (
                    <div className={styles.subMenu}>
                      {item.children.map((sub, i) => (
                        <li
                          key={i}
                          className={`${styles.subItem} ${location.pathname === sub.path
                            ? styles.active
                            : ""
                            }`}
                          onClick={() => navigate(sub.path)}
                        >
                          {sub.name}
                        </li>
                      ))}
                    </div>
                  )}
                </div>
              ))
          ) : (

            <>
              <li
                className={styles.backItem}
                onClick={() => {
                  setSettingsMode(false);
                  navigate("/home");
                }}
              >
                <span>← Back to Dashboard</span>
              </li>
              {settingsMenu.map((item, index) => {

                if (item.divider) {
                  return <div key={index} className={styles.settingsDivider}></div>;
                }

                return (
                  <li
                    key={index}
                    className={`${styles.item} ${location.pathname === item.path
                      ? styles.active
                      : ""
                      }`}
                    onClick={() => {

                      if (item.logout) {
  handleLogout();
  return;
}

if (item.switchAccount) {
  setShowAccountSwitcher(true);
  return;
}

navigate(item.path);
                    }}
                  >
                    <div className={styles.menuItem}>
                      <span className={styles.icon}>
                        {item.icon}
                      </span>

                      {!collapsed && <span>{item.name}</span>}
                    </div>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </div>

      <div className={styles.bottomSettings}>

        {!settingsMode && (
          <div
            className={styles.settingsButton}
            onClick={() => {
              setSettingsMode(true);
              navigate("/account");
            }}
          >
            <div className={styles.menuItem}>
              <span className={styles.icon}>
                <FaCog />
              </span>

              {!collapsed && (
                <span className={styles.settingsText}>
                  Settings
                </span>
              )}
            </div>
          </div>
        )}


      </div>
    </div>

  );
}

export default Sidebar;