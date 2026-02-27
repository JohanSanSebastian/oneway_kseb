import { useEffect, useMemo, useState } from "react";

const initialForm = {
  consumerNumber: "",
  section: "",
  captchaValue: ""
};

const statusLabels = {
  PENDING: "Bill Pending",
  PAID: "Bill Paid"
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export default function App() {
  const [sections, setSections] = useState([]);
  const [captcha, setCaptcha] = useState({ id: "", svg: "" });
  const [form, setForm] = useState(initialForm);
  const [consumer, setConsumer] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [view, setView] = useState("landing");
  const [error, setError] = useState("");
  const [payment, setPayment] = useState({
    vpa: "",
    status: "",
    message: "",
    processing: false
  });

  const selectedBill = useMemo(() => {
    if (!consumer || !consumer.bills) return null;
    return consumer.bills.find((bill) => bill.id === selectedBillId) || null;
  }, [consumer, selectedBillId]);

  const qrLabel = useMemo(() => {
    if (!selectedBill) return "";
    return `upi://pay?pa=kseb@upi&pn=KSEB&am=${selectedBill.billAmount}`;
  }, [selectedBill]);

  useEffect(() => {
    fetch("/api/sections")
      .then((res) => res.json())
      .then((data) => setSections(data.sections || []))
      .catch(() => setSections([]));
    refreshCaptcha();
  }, []);

  function refreshCaptcha() {
    fetch("/api/captcha")
      .then((res) => res.json())
      .then((data) => setCaptcha({ id: data.captchaId, svg: data.svg }))
      .catch(() => setCaptcha({ id: "", svg: "" }));
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleFetchBill(event) {
    event.preventDefault();
    setError("");

    if (form.consumerNumber.trim().length !== 13) {
      setError("Consumer Number must be 13 digits.");
      return;
    }

    if (!form.section) {
      setError("Please select a Section Office.");
      return;
    }

    if (!form.captchaValue.trim()) {
      setError("Please enter the captcha value.");
      return;
    }

    const response = await fetch("/api/bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumerNumber: form.consumerNumber.trim(),
        section: form.section,
        captchaId: captcha.id,
        captchaValue: form.captchaValue.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Unable to fetch bill.");
      refreshCaptcha();
      return;
    }

    if (data.status === "CAPTCHA_INVALID") {
      setError("Captcha does not match. Please try again.");
      refreshCaptcha();
      return;
    }

    if (data.status === "INVALID_CONSUMER") {
      setError("Invalid Consumer Number or Section Office.");
      refreshCaptcha();
      return;
    }

    if (!data.consumer || !data.consumer.bills || data.consumer.bills.length === 0) {
      setError("No bills found for this consumer.");
      refreshCaptcha();
      return;
    }

    const pendingBill = data.consumer.bills.find((billItem) => billItem.status === "PENDING");
    setConsumer(data.consumer);
    setSelectedBillId(pendingBill ? pendingBill.id : data.consumer.bills[0].id);
    setView("bill");
  }

  async function handlePay() {
    setError("");

    if (!payment.vpa.trim()) {
      setError("Enter a UPI ID to proceed.");
      return;
    }

    setPayment((prev) => ({ ...prev, processing: true, status: "" }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const response = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumerNumber: consumer.consumerNumber,
        section: consumer.section,
        billId: selectedBill?.id,
        vpa: payment.vpa.trim()
      })
    });

    const data = await response.json();

    setPayment((prev) => ({
      ...prev,
      processing: false,
      status: data.status,
      message: data.message
    }));

    if (data.status === "SUCCESS" && data.bill) {
      setConsumer((prev) => ({
        ...prev,
        bills: prev.bills.map((billItem) =>
          billItem.id === data.bill.id ? { ...billItem, status: "PAID" } : billItem
        )
      }));
    }

    setView("result");
  }

  function resetFlow() {
    setView("landing");
    setConsumer(null);
    setSelectedBillId("");
    setForm(initialForm);
    setPayment({ vpa: "", status: "", message: "", processing: false });
    refreshCaptcha();
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="top-bar">
          <div className="logo">
            <span className="bolt">⚡</span>
            <div>
              <strong>KSEB</strong>
              <span>Kerala State Electricity Board</span>
            </div>
          </div>
          <div className="contact">
            <span className="whatsapp">Chat on WhatsApp</span>
            <span className="helpline">1912 / 0471-2555544</span>
          </div>
        </div>
        <nav className="nav-bar">
          <span>HOME</span>
          <span>QUICK PAY</span>
          <span>REGISTER COMPLAINT / SERVICE</span>
          <span>ONLINE SERVICES</span>
          <span>CONTACT</span>
        </nav>
        <div className="cta-row">
          <span className="cta">CONSUMER SIGN IN →</span>
        </div>
        <div className="quickpay-bar">
          <span>Quick Pay</span>
          <span className="chevrons">»»</span>
        </div>
      </header>

      <main className="card">
        {view === "landing" && (
          <form className="stack" onSubmit={handleFetchBill}>
            <div className="section-header">
              <span className="section-icon">📄</span>
              <h2>Consumer Details</h2>
            </div>

            <div className="grid">
              <label>
                Consumer Number <span className="required">*</span>
                <span className="help-icon">?</span>
                <input
                  name="consumerNumber"
                  value={form.consumerNumber}
                  onChange={updateField}
                  maxLength={13}
                  placeholder="13 digit Consumer number"
                />
              </label>
              <label>
                Section Office <span className="required">*</span>
                <span className="help-icon">?</span>
                <select name="section" value={form.section} onChange={updateField}>
                  <option value="">Select Section</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="captcha">
              <div
                className="captcha-image"
                dangerouslySetInnerHTML={{ __html: captcha.svg }}
              />
              <div className="captcha-inputs">
                <label>
                  Enter Captcha <span className="required">*</span>
                  <input
                    name="captchaValue"
                    value={form.captchaValue}
                    onChange={updateField}
                    placeholder="Type the text shown"
                  />
                </label>
                <button type="button" className="ghost" onClick={refreshCaptcha}>
                  Refresh
                </button>
              </div>
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="primary center">
              Submit to see the bill
            </button>

            <div className="info-box">
              <span className="info-icon">i</span>
              Please register if you are not registered for online services.
            </div>

            <div className="conditions">
              <div className="conditions-title">Conditions</div>
              <ul>
                <li>Payment confirmation will be available instantly.</li>
                <li>Keep the receipt for future reference.</li>
                <li>For issues, contact the helpline.</li>
              </ul>
            </div>
          </form>
        )}

        {view === "bill" && consumer && (
          <section className="stack">
            <div className="bill-header">
              <div>
                <p className="eyebrow">Consumer Summary</p>
                <h2>{consumer.name}</h2>
                <p className="muted">{consumer.address}</p>
              </div>
              {selectedBill && (
                <div className={`status ${selectedBill.status.toLowerCase()}`}>
                  {statusLabels[selectedBill.status]}
                </div>
              )}
            </div>

            <div className="bill-list">
              {consumer.bills.map((billItem) => (
                <button
                  key={billItem.id}
                  type="button"
                  className={`bill-item ${billItem.id === selectedBillId ? "active" : ""}`}
                  onClick={() => setSelectedBillId(billItem.id)}
                >
                  <div>
                    <strong>{billItem.id}</strong>
                    <span>Due {billItem.dueDate}</span>
                  </div>
                  <div>
                    <strong>{formatMoney(billItem.billAmount)}</strong>
                    <span className={`pill ${billItem.status.toLowerCase()}`}>
                      {statusLabels[billItem.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedBill && (
              <div className="details">
                <div>
                  <span>Bill Amount</span>
                  <strong>{formatMoney(selectedBill.billAmount)}</strong>
                </div>
                <div>
                  <span>Due Date</span>
                  <strong>{selectedBill.dueDate}</strong>
                </div>
                <div>
                  <span>Penalty</span>
                  <strong>{formatMoney(selectedBill.penalty)}</strong>
                </div>
                <div>
                  <span>Section</span>
                  <strong>{consumer.section}</strong>
                </div>
              </div>
            )}

            {selectedBill?.status === "PAID" ? (
              <div className="paid-banner">
                This bill is already paid. You can search another consumer.
              </div>
            ) : (
              <button className="primary" onClick={() => setView("gateway")}>
                Pay via UPI
              </button>
            )}

            <button className="ghost" onClick={resetFlow}>
              Start New Search
            </button>
          </section>
        )}

        {view === "gateway" && consumer && selectedBill && (
          <section className="stack">
            <div className="bill-header">
              <div>
                <p className="eyebrow">Mock UPI Gateway</p>
                <h2>Pay {formatMoney(selectedBill.billAmount)}</h2>
                <p className="muted">Complete payment to KSEB Utilities</p>
              </div>
              <div className="status pending">Processing Sandbox</div>
            </div>

            <div className="gateway">
              <div className="qr">
                <img className="qr-image" src="/upi-qr.png" alt="UPI QR" />
                <p className="muted">{qrLabel}</p>
              </div>
              <div className="gateway-form">
                <label>
                  Enter UPI ID
                  <input
                    value={payment.vpa}
                    onChange={(event) =>
                      setPayment((prev) => ({ ...prev, vpa: event.target.value }))
                    }
                    placeholder="success@upi or fail@upi"
                  />
                </label>
                {error && <p className="error">{error}</p>}
                <button className="primary" onClick={handlePay}>
                  Confirm Payment
                </button>
                <button className="ghost" onClick={() => setView("bill")}
                >
                  Back to Bill
                </button>
              </div>
            </div>
          </section>
        )}

        {view === "result" && (
          <section className="stack">
            <div className="result">
              <h2>
                {payment.status === "SUCCESS"
                  ? "Payment Successful"
                  : "Payment Failed"}
              </h2>
              <p>{payment.message}</p>
            </div>
            <div className="details">
              <div>
                <span>Consumer Number</span>
                <strong>{consumer?.consumerNumber}</strong>
              </div>
              <div>
                <span>Bill Status</span>
                <strong>{statusLabels[selectedBill?.status] || ""}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>UPI Sandbox</strong>
              </div>
              <div>
                <span>Reference</span>
                <strong>TXN-{Date.now().toString().slice(-6)}</strong>
              </div>
            </div>

            <button className="primary" onClick={resetFlow}>
              Start New Search
            </button>
          </section>
        )}
      </main>

      {payment.processing && (
        <div className="overlay">
          <div className="loader">
            <div className="spinner" />
            <p>Processing UPI transaction...</p>
          </div>
        </div>
      )}
    </div>
  );
}
