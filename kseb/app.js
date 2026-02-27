const state = {
  captchaValue: "",
  consumer: null,
  consumers: [],
  selectedBillId: "",
  paymentStatus: null,
  isProcessing: false
};

const statusLabels = {
  PENDING: "Bill Pending",
  PAID: "Bill Paid"
};

const elements = {
  landing: document.getElementById("landing"),
  billView: document.getElementById("bill-view"),
  gateway: document.getElementById("gateway"),
  result: document.getElementById("result"),
  overlay: document.getElementById("overlay"),
  consumerNumber: document.getElementById("consumerNumber"),
  section: document.getElementById("section"),
  captchaValue: document.getElementById("captchaValue"),
  captchaImage: document.getElementById("captcha-image"),
  refreshCaptcha: document.getElementById("refresh-captcha"),
  landingError: document.getElementById("landing-error"),
  billForm: document.getElementById("bill-form"),
  consumerName: document.getElementById("consumer-name"),
  consumerAddress: document.getElementById("consumer-address"),
  billStatus: document.getElementById("bill-status"),
  billList: document.getElementById("bill-list"),
  billDetails: document.getElementById("bill-details"),
  paidBanner: document.getElementById("paid-banner"),
  payButton: document.getElementById("pay-button"),
  newSearch: document.getElementById("new-search"),
  gatewayAmount: document.getElementById("gateway-amount"),
  qrSimulate: document.getElementById("qr-simulate"),
  qrLabel: document.getElementById("qr-label"),
  vpa: document.getElementById("vpa"),
  gatewayError: document.getElementById("gateway-error"),
  confirmPay: document.getElementById("confirm-pay"),
  backToBill: document.getElementById("back-to-bill"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultConsumer: document.getElementById("result-consumer"),
  resultStatus: document.getElementById("result-status"),
  resultRef: document.getElementById("result-ref"),
  resultNewSearch: document.getElementById("result-new-search")
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function showSection(section) {
  elements.landing.classList.add("hidden");
  elements.billView.classList.add("hidden");
  elements.gateway.classList.add("hidden");
  elements.result.classList.add("hidden");
  section.classList.remove("hidden");
  setOverlayVisible(false);
}

function setOverlayVisible(isVisible) {
  state.isProcessing = Boolean(isVisible);
  elements.overlay.classList.toggle("hidden", !state.isProcessing);
  elements.overlay.hidden = !state.isProcessing;
}

function showError(element, message) {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function generateTextCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function generateMathCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { text: `${a} + ${b}`, value: String(a + b) };
}

function buildCaptchaSvg(text) {
  const wobble = Math.floor(Math.random() * 6) - 3;
  return `
<svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="140" height="40" rx="8" fill="#f7fbff" />
  <line x1="10" y1="8" x2="130" y2="32" stroke="#9bb7d4" stroke-width="2" />
  <line x1="8" y1="32" x2="130" y2="12" stroke="#c2d6ee" stroke-width="2" />
  <text x="70" y="26" text-anchor="middle" font-size="18" fill="#0a3560" font-family="Courier New, monospace" transform="rotate(${wobble} 70 20)">${text}</text>
</svg>
  `.trim();
}

function refreshCaptcha() {
  const useMath = Math.random() > 0.6;
  let value = "";
  let text = "";

  if (useMath) {
    const math = generateMathCaptcha();
    value = math.value;
    text = math.text;
  } else {
    text = generateTextCaptcha();
    value = text;
  }

  state.captchaValue = value;
  elements.captchaImage.innerHTML = buildCaptchaSvg(text);
}

function loadSections() {
  const sections = Array.from(
    new Set(state.consumers.map((consumer) => consumer.section))
  ).sort();
  elements.section.innerHTML = '<option value="">Select Section</option>';
  sections.forEach((section) => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    elements.section.appendChild(option);
  });
}

function findConsumer(consumerNumber, section) {
  return state.consumers.find(
    (item) => item.consumerNumber === consumerNumber && item.section === section
  );
}

async function loadConsumers() {
  const response = await fetch("./data/consumers.json");
  const data = await response.json();
  state.consumers = data;
  loadSections();
}

function selectBill(billId) {
  state.selectedBillId = billId;
  renderBillList();
  renderBillDetails();
}

function getSelectedBill() {
  if (!state.consumer) return null;
  return state.consumer.bills.find((bill) => bill.id === state.selectedBillId) || null;
}

function renderBillList() {
  elements.billList.innerHTML = "";
  if (!state.consumer) return;

  state.consumer.bills.forEach((bill) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bill-item" + (bill.id === state.selectedBillId ? " active" : "");

    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = bill.id;
    const due = document.createElement("span");
    due.textContent = `Due ${bill.dueDate}`;
    left.appendChild(title);
    left.appendChild(due);

    const right = document.createElement("div");
    const amount = document.createElement("strong");
    amount.textContent = formatMoney(bill.billAmount);
    const status = document.createElement("span");
    status.className = `pill ${bill.status.toLowerCase()}`;
    status.textContent = statusLabels[bill.status] || bill.status;
    right.appendChild(amount);
    right.appendChild(status);

    button.appendChild(left);
    button.appendChild(right);
    button.addEventListener("click", () => selectBill(bill.id));

    elements.billList.appendChild(button);
  });
}

function renderBillDetails() {
  const bill = getSelectedBill();
  if (!state.consumer || !bill) return;

  elements.billDetails.innerHTML = `
    <div>
      <span>Bill Amount</span>
      <strong>${formatMoney(bill.billAmount)}</strong>
    </div>
    <div>
      <span>Due Date</span>
      <strong>${bill.dueDate}</strong>
    </div>
    <div>
      <span>Penalty</span>
      <strong>${formatMoney(bill.penalty)}</strong>
    </div>
    <div>
      <span>Section</span>
      <strong>${state.consumer.section}</strong>
    </div>
  `;

  elements.billStatus.className = `status ${bill.status.toLowerCase()}`;
  elements.billStatus.textContent = statusLabels[bill.status] || bill.status;

  elements.paidBanner.classList.toggle("hidden", bill.status !== "PAID");
  elements.payButton.classList.toggle("hidden", bill.status === "PAID");
}

function updateGateway() {
  const bill = getSelectedBill();
  if (!bill) return;
  elements.gatewayAmount.textContent = `Pay ${formatMoney(bill.billAmount)}`;
  elements.qrLabel.textContent = `upi://pay?pa=kseb@upi&pn=KSEB&am=${bill.billAmount}`;
}

function resetFlow() {
  state.consumer = null;
  state.selectedBillId = "";
  state.paymentStatus = null;
  elements.consumerNumber.value = "";
  elements.section.value = "";
  elements.captchaValue.value = "";
  elements.vpa.value = "";
  showError(elements.landingError, "");
  showError(elements.gatewayError, "");
  showSection(elements.landing);
  refreshCaptcha();
}

async function handleFetchBill(event) {
  event.preventDefault();
  showError(elements.landingError, "");

  const consumerNumber = elements.consumerNumber.value.trim();
  const section = elements.section.value;
  const captchaValue = elements.captchaValue.value.trim();

  if (consumerNumber.length !== 13) {
    showError(elements.landingError, "Consumer Number must be 13 digits.");
    return;
  }

  if (!section) {
    showError(elements.landingError, "Please select a Section Office.");
    return;
  }

  if (!captchaValue) {
    showError(elements.landingError, "Please enter the captcha value.");
    return;
  }

  if (captchaValue.toLowerCase() !== state.captchaValue.toLowerCase()) {
    showError(elements.landingError, "Captcha does not match. Please try again.");
    refreshCaptcha();
    return;
  }

  const consumer = findConsumer(consumerNumber, section);

  if (!consumer) {
    showError(elements.landingError, "Invalid Consumer Number or Section Office.");
    refreshCaptcha();
    return;
  }

  if (!consumer.bills || consumer.bills.length === 0) {
    showError(elements.landingError, "No bills found for this consumer.");
    refreshCaptcha();
    return;
  }

  state.consumer = consumer;
  const pendingBill = consumer.bills.find((bill) => bill.status === "PENDING");
  state.selectedBillId = pendingBill ? pendingBill.id : consumer.bills[0].id;

  elements.consumerName.textContent = consumer.name;
  elements.consumerAddress.textContent = consumer.address;

  renderBillList();
  renderBillDetails();
  showSection(elements.billView);
}

async function handlePay() {
  if (state.isProcessing) return;
  showError(elements.gatewayError, "");
  const vpa = elements.vpa.value.trim();
  const bill = getSelectedBill();

  if (!vpa) {
    showError(elements.gatewayError, "Enter a UPI ID to proceed.");
    return;
  }

  if (!bill || !state.consumer) {
    showError(elements.gatewayError, "No bill selected.");
    return;
  }

  setOverlayVisible(true);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const isFailure = vpa.toLowerCase().includes("fail");
  const isSuccess = vpa.toLowerCase().includes("success") || !isFailure;

  const data = isSuccess
    ? { status: "SUCCESS", message: "Payment captured. Your bill is marked as paid." }
    : { status: "FAILURE", message: "UPI authorization failed. Please try again." };

  setOverlayVisible(false);

  if (data.status === "SUCCESS") {
    state.consumer.bills = state.consumer.bills.map((item) =>
      item.id === bill.id ? { ...item, status: "PAID" } : item
    );
  }

  state.paymentStatus = data;
  elements.resultTitle.textContent =
    data.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
  elements.resultMessage.textContent = data.message || "";
  elements.resultConsumer.textContent = state.consumer.consumerNumber;

  const updatedBill = getSelectedBill();
  elements.resultStatus.textContent =
    statusLabels[updatedBill?.status] || updatedBill?.status || "";
  elements.resultRef.textContent = `TXN-${Date.now().toString().slice(-6)}`;

  renderBillList();
  renderBillDetails();
  showSection(elements.result);
}

function handleQrSimulate() {
  elements.vpa.value = "success@upi";
  handlePay();
}

function redirectToGateway() {
  const bill = getSelectedBill();
  if (!bill || !state.consumer) return;

  const paymentInfo = {
    merchant: "KSEB",
    merchantFull: "Kerala State Electricity Board",
    amount: bill.billAmount,
    description: `Bill ${bill.id} for ${state.consumer.name}`,
    returnUrl: window.location.href.split("?")[0],
    txnId: `KSEB-${Date.now()}`,
    consumerId: state.consumer.consumerNumber,
    billId: bill.id
  };

  sessionStorage.setItem("paymentInfo", JSON.stringify(paymentInfo));
  sessionStorage.setItem("consumerState", JSON.stringify({
    consumer: state.consumer,
    selectedBillId: state.selectedBillId
  }));
  window.location.href = "../gateway/";
}

function checkPaymentResult() {
  const resultStr = sessionStorage.getItem("paymentResult");
  const consumerStateStr = sessionStorage.getItem("consumerState");

  if (resultStr && consumerStateStr) {
    const result = JSON.parse(resultStr);
    const consumerState = JSON.parse(consumerStateStr);

    sessionStorage.removeItem("paymentResult");
    sessionStorage.removeItem("consumerState");
    sessionStorage.removeItem("paymentInfo");

    state.consumer = consumerState.consumer;
    state.selectedBillId = consumerState.selectedBillId;

    if (result.status === "SUCCESS") {
      state.consumer.bills = state.consumer.bills.map((item) =>
        item.id === state.selectedBillId ? { ...item, status: "PAID" } : item
      );
    }

    state.paymentStatus = result;
    elements.resultTitle.textContent =
      result.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
    elements.resultMessage.textContent = result.message || "";
    elements.resultConsumer.textContent = state.consumer.consumerNumber;

    const updatedBill = getSelectedBill();
    elements.resultStatus.textContent =
      statusLabels[updatedBill?.status] || updatedBill?.status || "";
    elements.resultRef.textContent = result.txnId || `TXN-${Date.now().toString().slice(-6)}`;

    renderBillList();
    renderBillDetails();
    showSection(elements.result);
    return true;
  }
  return false;
}

function setupEvents() {
  elements.billForm.addEventListener("submit", handleFetchBill);
  elements.refreshCaptcha.addEventListener("click", refreshCaptcha);
  elements.newSearch.addEventListener("click", resetFlow);
  elements.resultNewSearch.addEventListener("click", resetFlow);
  elements.payButton.addEventListener("click", redirectToGateway);
  elements.backToBill.addEventListener("click", () => showSection(elements.billView));
  elements.confirmPay.addEventListener("click", handlePay);
  elements.qrSimulate.addEventListener("click", handleQrSimulate);
  elements.qrSimulate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleQrSimulate();
    }
  });
}

loadConsumers().then(() => {
  refreshCaptcha();
  setupEvents();
  elements.overlay.classList.add("hidden");
  
  if (!checkPaymentResult()) {
    showSection(elements.landing);
  }
});
