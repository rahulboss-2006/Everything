import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import {
  adminRequest,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "./adminApi";

import "./admin.css";

const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["users", "Users", Users],
  ["payments", "Payments", CreditCard],
  ["contacts", "Messages", Mail],
  ["audit", "Audit Logs", Activity],
];

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  return `\u09F3${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function date(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  return `badge badge-${status}`;
}

/* =========================================================
   STAT
========================================================= */

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>

        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await adminRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      setAdminToken(data.accessToken);
      onLogin(data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="login-glow" />

      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">
          <ShieldCheck size={24} />
        </div>

        <div className="eyebrow">EVERYTHING ADMIN</div>

        <h1>Welcome back</h1>

        <p>
          Sign in to manage users, payments and messages.
        </p>

        {error && (
          <div className="error-box">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <label>
          Email

          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        <button
          className="primary-btn full"
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="spin" />
              Signing in...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Sign in
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function Empty({ text }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Search size={20} />
      </div>

      <strong>{text}</strong>
    </div>
  );
}

/* =========================================================
   PAGINATION
========================================================= */

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <span>{pagination.total} total</span>

      <div>
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <b>
          {pagination.page} / {pagination.pages}
        </b>

        <button
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPage(pagination.page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({ data, loading, reload }) {
  const s = data?.stats || {};

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Overview of your Everything service."
        onRefresh={reload}
        loading={loading}
      />

      <div className="stats-grid">
        <Stat
          icon={Users}
          label="Total users"
          value={s.users ?? "—"}
          hint={`${s.activeUsers ?? 0} active`}
        />

        <Stat
          icon={UserCheck}
          label="Verified users"
          value={s.verifiedUsers ?? "—"}
        />

        <Stat
          icon={CreditCard}
          label="Pending payments"
          value={s.pendingPayments ?? "—"}
          hint="Needs review"
        />

        <Stat
          icon={CircleDollarSign}
          label="Revenue"
          value={money(s.revenue)}
          hint={`${s.creditsSold ?? 0} credits sold`}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <PanelTitle title="Recent payments" />

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {(data?.latestPayments || []).map((p) => (
                  <tr key={p._id}>
                    <td>
                      <b>{p.user?.email || "Unknown"}</b>
                      <small>
                        {p.transactionId || p._id}
                      </small>
                    </td>

                    <td className="capitalize">
                      {p.provider}
                    </td>

                    <td>{money(p.amount)}</td>

                    <td>
                      <span className={statusClass(p.status)}>
                        {p.status}
                      </span>
                    </td>

                    <td>{date(p.createdAt)}</td>

                    <td>
                      {p.user == null &&
                        ["failed", "cancelled"].includes(
                          p.status
                        ) && (
                          <button
                            className="danger-icon"
                            title="Delete payment"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Delete this Unknown payment?"
                                )
                              ) {
                                return;
                              }

                              try {
                                await adminRequest(
                                  `/admin/payments/${p._id}`,
                                  {
                                    method: "DELETE",
                                  }
                                );

                                await reload();
                              } catch (error) {
                                window.alert(
                                  error.message ||
                                    "Could not delete payment."
                                );
                              }
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data?.latestPayments?.length && (
            <Empty text="No payments yet" />
          )}
        </section>

        <section className="panel">
          <PanelTitle title="System status" />

          <div className="status-list">
            <div>
              <span className="dot green" />
              Backend API
            </div>

            <b>Connected</b>

            <div>
              <span className="dot green" />
              Admin session
            </div>

            <b>Protected</b>

            <div>
              <span className="dot" />
              Unread messages
            </div>

            <b>{s.unreadMessages ?? 0}</b>
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({
  title,
  subtitle,
  onRefresh,
  loading,
}) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {onRefresh && (
        <button
          className="icon-btn"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw
            size={18}
            className={loading ? "spin" : ""}
          />
        </button>
      )}
    </div>
  );
}

function PanelTitle({ title, action }) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action}
    </div>
  );
}

/* =========================================================
   USERS PAGE
========================================================= */

function UsersPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  async function load(p = page, q = search) {
    setLoading(true);

    try {
      const d = await adminRequest(
        `/admin/users?page=${p}&limit=20&search=${encodeURIComponent(
          q
        )}`
      );

      setItems(d.items);
      setPagination(d.pagination);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, "");
  }, []);

  async function save(u, patch) {
    try {
      const d = await adminRequest(`/admin/users/${u._id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      setItems((prev) =>
        prev.map((x) =>
          x._id === u._id
            ? {
                ...x,
                ...d.user,
              }
            : x
        )
      );

      setNotice("User updated.");
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function confirmDelete() {
    if (!deleteUser) return;

    const reason = deleteReason.trim();

    if (reason.length < 5) {
      setNotice(
        "Please enter a deletion reason of at least 5 characters."
      );
      return;
    }

    setDeleting(true);

    try {
      const d = await adminRequest(
        `/admin/users/${deleteUser._id}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            reason,
            sendEmail,
          }),
        }
      );

      setItems((prev) =>
        prev.map((x) =>
          x._id === deleteUser._id
            ? {
                ...x,
                ...d.user,
              }
            : x
        )
      );

      setDeleteUser(null);
      setDeleteReason("");

      setNotice(
        d.email?.sent
          ? "User account deactivated and email sent successfully."
          : "User account deactivated successfully."
      );
    } catch (e) {
      setNotice(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function restoreUser(user) {
    if (!user?._id) return;

    setRestoring(true);

    try {
      const d = await adminRequest(
        `/admin/users/${user._id}/restore`,
        {
          method: "POST",
        }
      );

      setItems((prev) =>
        prev.map((x) =>
          x._id === user._id
            ? {
                ...x,
                ...d.user,
                accountStatus: "active",
                active: true,
                deletedAt: null,
                deletedReason: null,
                deletedBy: null,
              }
            : x
        )
      );

      setViewUser(null);

      setNotice("User account restored successfully.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <Header
        title="Users"
        subtitle="Manage accounts, verification, credits and account deletion."
        onRefresh={() => load()}
        loading={loading}
      />

      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                load(1, search);
              }
            }}
            placeholder="Search by email..."
          />
        </div>

        <button
          className="secondary-btn"
          onClick={() => {
            setPage(1);
            load(1, search);
          }}
        >
          Search
        </button>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Credits</th>
                <th>Verified</th>
                <th>Active</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((u) => (
                <UserRow
                  key={u._id}
                  user={u}
                  onSave={save}
                  onDelete={() => {
                    setDeleteUser(u);
                    setDeleteReason("");
                    setSendEmail(true);
                  }}
                  onView={() => setViewUser(u)}
                  onRestore={() => restoreUser(u)}
                  restoring={restoring}
                />
              ))}
            </tbody>
          </table>
        </div>

        {!items.length && !loading && (
          <Empty text="No users found" />
        )}

        <Pagination
          pagination={pagination}
          onPage={(p) => {
            setPage(p);
            load(p, search);
          }}
        />
      </section>

      {viewUser && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="modal-close"
              onClick={() => setViewUser(null)}
            >
              <X />
            </button>

            <div className="eyebrow">DELETED USER</div>

            <h3>{viewUser.email}</h3>

            <div className="delete-meta">
              <span>User ID</span>
              <b>{viewUser._id}</b>
            </div>

            <div className="delete-meta">
              <span>Phone</span>
              <b>{viewUser.phone || "No phone"}</b>
            </div>

            <div className="delete-meta">
              <span>Credits</span>
              <b>{viewUser.credits}</b>
            </div>

            <div className="delete-meta">
              <span>Email verification</span>
              <b>
                {viewUser.emailVerified
                  ? "Verified"
                  : "Unverified"}
              </b>
            </div>

            <div className="delete-meta">
              <span>Status</span>
              <b>{viewUser.accountStatus || "deleted"}</b>
            </div>

            <div className="delete-meta">
              <span>Deleted at</span>
              <b>
                {viewUser.deletedAt
                  ? date(viewUser.deletedAt)
                  : "Unknown"}
              </b>
            </div>

            <div className="delete-meta">
              <span>Deleted by</span>
              <b>{viewUser.deletedBy || "Admin"}</b>
            </div>

            <label>
              Deletion reason

              <textarea
                rows="4"
                value={
                  viewUser.deletedReason ||
                  "No reason recorded."
                }
                readOnly
              />
            </label>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setViewUser(null)}
                disabled={restoring}
              >
                Close
              </button>

              <button
                className="primary-btn"
                onClick={() => restoreUser(viewUser)}
                disabled={restoring}
              >
                {restoring ? "Restoring..." : "Restore User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="modal-backdrop">
          <div className="modal delete-user-modal">
            <button
              className="modal-close"
              onClick={() => setDeleteUser(null)}
            >
              <X />
            </button>

            <div className="eyebrow">DEACTIVATE USER</div>

            <h3>
              Deactivate {deleteUser.email}?
            </h3>

            <p>
              This deactivates the account without permanently
              removing the user. The same user ID and account
              history will remain available for recovery.
            </p>

            <label>
              Deletion reason{" "}
              <span className="required">*</span>

              <textarea
                rows="4"
                value={deleteReason}
                onChange={(e) =>
                  setDeleteReason(e.target.value)
                }
                placeholder="Explain why this account is being deactivated..."
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) =>
                  setSendEmail(e.target.checked)
                }
              />

              Send this reason to the user by email
            </label>

            <div className="delete-meta">
              <span>Email</span>
              <b>
                {deleteUser.email || "No email address"}
              </b>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="reject-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                <Trash2 size={16} />

                {deleting
                  ? "Deactivating..."
                  : "Deactivate User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   USER ROW
========================================================= */

function UserRow({
  user,
  onSave,
  onDelete,
  onView,
  onRestore,
  restoring,
}) {
  const [credits, setCredits] = useState(user.credits);

  const isDeleted = user.accountStatus === "deleted";

  return (
    <tr>
      <td>
        <b>{user.email}</b>
        <small>{user.phone || "No phone"}</small>
        <small>{user._id}</small>
      </td>

      <td>
        <div className="inline-edit">
          <input
            type="number"
            min="0"
            value={credits}
            disabled={isDeleted}
            onChange={(e) =>
              setCredits(e.target.value)
            }
          />

          <button
            className="mini-btn"
            disabled={isDeleted}
            onClick={() =>
              onSave(user, {
                credits: Number(credits),
              })
            }
          >
            <Check size={14} />
          </button>
        </div>
      </td>

      <td>
        <button
          className={`toggle ${
            user.emailVerified ? "on" : ""
          }`}
          disabled={isDeleted}
          onClick={() =>
            onSave(user, {
              emailVerified: !user.emailVerified,
            })
          }
        >
          {user.emailVerified
            ? "Verified"
            : "Unverified"}
        </button>
      </td>

      <td>
        {isDeleted ? (
          <button className="toggle off" disabled>
            Deleted
          </button>
        ) : (
          <button
            className={`toggle ${
              user.active ? "on" : "off"
            }`}
            onClick={() =>
              onSave(user, {
                active: !user.active,
              })
            }
          >
            {user.active ? "Active" : "Disabled"}
          </button>
        )}
      </td>

      <td>{date(user.createdAt)}</td>

      <td>
        <div className="action-row">
          {isDeleted ? (
            <>
              <button
                className="mini-btn"
                onClick={onView}
              >
                View
              </button>

              <button
                className="mini-btn"
                disabled={restoring}
                onClick={() => onRestore(user)}
              >
                {restoring ? "..." : "Restore"}
              </button>
            </>
          ) : (
            <>
              <button
                className="mini-btn"
                onClick={() =>
                  onSave(user, {
                    credits: Number(credits),
                  })
                }
              >
                Save
              </button>

              <button
                className="danger-icon"
                title="Deactivate user"
                onClick={onDelete}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   PAYMENTS PAGE
========================================================= */

function PaymentsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");

  async function load(p = page) {
    setLoading(true);

    try {
      const q = new URLSearchParams({
        page: p,
        limit: 20,
      });

      if (status) q.set("status", status);
      if (provider) q.set("provider", provider);

      const d = await adminRequest(
        `/admin/payments?${q}`
      );

      setItems(d.items);
      setPagination(d.pagination);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [status, provider]);

  async function approve() {
    if (!modal?.transactionId) {
      return setNotice(
        "Transaction ID is required."
      );
    }

    try {
      await adminRequest(
        `/admin/payments/${modal._id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            transactionId: modal.transactionId,
            amount: Number(modal.amount),
          }),
        }
      );

      setModal(null);
      setNotice(
        "Payment approved and credits added."
      );

      load(page);
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function reject(id) {
    if (!confirm("Reject this payment?")) return;

    try {
      await adminRequest(
        `/admin/payments/${id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Rejected by admin",
          }),
        }
      );

      setNotice("Payment rejected.");
      load(page);
    } catch (e) {
      setNotice(e.message);
    }
  }

  return (
    <>
      <Header
        title="Payments"
        subtitle="Review recharge requests and safely apply credits."
        onRefresh={() => load()}
        loading={loading}
      />

      <div className="filters">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={provider}
          onChange={(e) =>
            setProvider(e.target.value)
          }
        >
          <option value="">All providers</option>
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
        </select>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Credits</th>
                <th>Transaction</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <b>
                      {p.user?.email || "Unknown"}
                    </b>
                    <small>{p._id}</small>
                  </td>

                  <td className="capitalize">
                    {p.provider}
                  </td>

                  <td>{money(p.amount)}</td>

                  <td>{p.credits}</td>

                  <td>
                    {p.transactionId || "—"}
                  </td>

                  <td>
                    <span
                      className={statusClass(
                        p.status
                      )}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td>
                    {["created", "pending"].includes(
                      p.status
                    ) && !p.creditsApplied ? (
                      <div className="action-row">
                        <button
                          className="approve-btn"
                          onClick={() =>
                            setModal({
                              ...p,
                              transactionId: "",
                              amount: p.amount,
                            })
                          }
                        >
                          <Check size={14} />
                          Approve
                        </button>

                        <button
                          className="reject-btn"
                          onClick={() =>
                            reject(p._id)
                          }
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">
                        Processed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!items.length && !loading && (
          <Empty text="No payments found" />
        )}

        <Pagination
          pagination={pagination}
          onPage={(p) => {
            setPage(p);
            load(p);
          }}
        />
      </section>

      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="modal-close"
              onClick={() => setModal(null)}
            >
              <X />
            </button>

            <div className="eyebrow">
              PAYMENT APPROVAL
            </div>

            <h3>Confirm payment</h3>

            <p>
              {modal.user?.email || "Unknown"} ·{" "}
              {money(modal.amount)} · {modal.provider}
            </p>

            <label>
              Transaction ID

              <input
                autoFocus
                value={modal.transactionId}
                onChange={(e) =>
                  setModal({
                    ...modal,
                    transactionId:
                      e.target.value,
                  })
                }
                placeholder="e.g. 8A7B6C..."
              />
            </label>

            <label>
              Verified amount

              <input
                type="number"
                min="10"
                step="0.01"
                value={modal.amount}
                onChange={(e) =>
                  setModal({
                    ...modal,
                    amount: e.target.value,
                  })
                }
              />
            </label>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={approve}
              >
                <Check size={16} />
                Approve & add credits
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   CONTACTS PAGE
========================================================= */

function ContactsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);

    try {
      const d = await adminRequest(
        `/admin/contacts?limit=100${
          status ? `&status=${status}` : ""
        }`
      );

      setItems(d.items);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function mark(id, next) {
    try {
      await adminRequest(`/admin/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: next,
        }),
      });

      load();
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function del(id) {
    if (!confirm("Delete this message?")) return;

    try {
      await adminRequest(`/admin/contacts/${id}`, {
        method: "DELETE",
      });

      load();
    } catch (e) {
      setNotice(e.message);
    }
  }

  return (
    <>
      <Header
        title="Messages"
        subtitle="Contact form messages saved from your website."
        onRefresh={load}
        loading={loading}
      />

      <div className="filters">
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >
          <option value="">All messages</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <div className="message-grid">
        {items.map((m) => (
          <article
            className={`message-card ${m.status}`}
            key={m._id}
          >
            <div className="message-top">
              <div>
                <b>{m.subject}</b>

                <small>
                  {m.name} · {m.email}
                </small>
              </div>

              <span
                className={statusClass(m.status)}
              >
                {m.status}
              </span>
            </div>

            <p>{m.message}</p>

            <div className="message-bottom">
              <span>{date(m.createdAt)}</span>

              <div>
                <button
                  className="mini-btn"
                  onClick={() =>
                    mark(
                      m._id,
                      m.status === "read"
                        ? "unread"
                        : "read"
                    )
                  }
                >
                  {m.status === "read"
                    ? "Mark unread"
                    : "Mark read"}
                </button>

                <button
                  className="danger-icon"
                  onClick={() => del(m._id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}

        {!items.length && !loading && (
          <Empty text="No contact messages" />
        )}
      </div>
    </>
  );
}

/* =========================================================
   AUDIT PAGE
========================================================= */

function AuditPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const d = await adminRequest(
        "/admin/audit-logs?limit=100"
      );

      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Header
        title="Audit Logs"
        subtitle="Security trail for admin actions."
        onRefresh={load}
        loading={loading}
      />

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {items.map((x) => (
                <tr key={x._id}>
                  <td>{date(x.createdAt)}</td>

                  <td>{x.adminEmail}</td>

                  <td>
                    <span className="badge badge-created">
                      {x.action}
                    </span>
                  </td>

                  <td>
                    {x.targetType}

                    {x.targetId && (
                      <small>{x.targetId}</small>
                    )}
                  </td>

                  <td>
                    <code>
                      {JSON.stringify(
                        x.details || {}
                      )}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!items.length && !loading && (
          <Empty text="No audit events" />
        )}
      </section>
    </>
  );
}

/* =========================================================
   ADMIN APP
========================================================= */

function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [section, setSection] =
    useState("dashboard");

  const [collapsed, setCollapsed] =
    useState(false);

  const [dark, setDark] = useState(
    () =>
      localStorage.getItem("adminTheme") ===
      "dark"
  );

  const [dashboard, setDashboard] =
    useState(null);

  const [dashLoading, setDashLoading] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    localStorage.setItem(
      "adminTheme",
      dark ? "dark" : "light"
    );
  }, [dark]);

  useEffect(() => {
    if (!getAdminToken()) return;

    adminRequest("/admin/me")
      .then((d) => setAdmin(d.admin))
      .catch(() => clearAdminToken());
  }, []);

  async function loadDashboard() {
    setDashLoading(true);

    try {
      setDashboard(
        await adminRequest("/admin/dashboard")
      );

      setError("");
    } catch (e) {
      if (e.status === 401) {
        clearAdminToken();
        setAdmin(null);
      } else {
        setError(e.message);
      }
    } finally {
      setDashLoading(false);
    }
  }

  useEffect(() => {
    if (
      admin &&
      section === "dashboard"
    ) {
      loadDashboard();
    }
  }, [admin, section]);

  async function logout() {
    try {
      await adminRequest("/admin/logout", {
        method: "POST",
      });
    } catch {}

    clearAdminToken();
    setAdmin(null);
  }

  if (!admin) {
    return <Login onLogin={setAdmin} />;
  }

  let content;

  if (section === "dashboard") {
    content = (
      <Dashboard
        data={dashboard}
        loading={dashLoading}
        reload={loadDashboard}
      />
    );
  } else if (section === "users") {
    content = <UsersPage />;
  } else if (section === "payments") {
    content = <PaymentsPage />;
  } else if (section === "contacts") {
    content = <ContactsPage />;
  } else {
    content = <AuditPage />;
  }

  return (
    <div
      className={`admin-shell ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>

          {!collapsed && (
            <div>
              <b>Everything</b>
              <small>ADMIN</small>
            </div>
          )}
        </div>

        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                section === id ? "active" : ""
              }
              onClick={() => setSection(id)}
              title={label}
            >
              <Icon size={19} />

              {!collapsed && (
                <span>{label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            onClick={() => setDark((v) => !v)}
          >
            {dark ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}

            {!collapsed && (
              <span>
                {dark
                  ? "Light mode"
                  : "Dark mode"}
              </span>
            )}
          </button>

          <button onClick={logout}>
            <LogOut size={18} />

            {!collapsed && (
              <span>Sign out</span>
            )}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-btn"
            onClick={() =>
              setCollapsed((v) => !v)
            }
          >
            <Menu size={19} />
          </button>

          <div className="topbar-right">
            <span className="admin-email">
              {admin.email}
            </span>

            <span className="secure">
              <span className="dot green" />
              Secure
            </span>
          </div>
        </header>

        {error && (
          <div className="error-box global-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="admin-content">
          {content}
        </div>
      </main>
    </div>
  );
}

export default AdminApp;