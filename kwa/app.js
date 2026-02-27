const elements = {
  form: document.getElementById("kwa-form"),
  consumerNumber: document.getElementById("consumerNumber"),
  phone: document.getElementById("phone"),
  proceed: document.getElementById("proceed"),
  reset: document.getElementById("reset"),
  error: document.getElementById("kwa-error"),
  billCard: document.getElementById("bill-card"),
  billName: document.getElementById("bill-name"),
  billNumber: document.getElementById("bill-number"),
  billAmount: document.getElementById("bill-amount"),
  billDate: document.getElementById("bill-date"),
  billStatus: document.getElementById("bill-status"),
  payButton: document.getElementById("pay-button"),
  newSearch: document.getElementById("new-search"),
  gateway: document.getElementById("gateway"),
  gatewayAmount: document.getElementById("gateway-amount"),
  qrLabel: document.getElementById("qr-label"),
  qrSimulate: document.getElementById("qr-simulate"),
  vpa: document.getElementById("vpa"),
  gatewayError: document.getElementById("gateway-error"),
  confirmPay: document.getElementById("confirm-pay"),
  backToBill: document.getElementById("back-to-bill"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultConsumer: document.getElementById("result-consumer"),
  resultStatus: document.getElementById("result-status"),
  resultRef: document.getElementById("result-ref"),
  resultNewSearch: document.getElementById("result-new-search"),
  overlay: document.getElementById("overlay")
};

const state = {
  consumers: [],
  consumer: null,
  selectedBillId: "",
  isProcessing: false
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

function showError(message) {
  elements.error.textContent = message;
  elements.error.classList.toggle("hidden", !message);
}

function showGatewayError(message) {
  elements.gatewayError.textContent = message;
  elements.gatewayError.classList.toggle("hidden", !message);
}

function setOverlayVisible(isVisible) {
  state.isProcessing = Boolean(isVisible);
  elements.overlay.classList.toggle("hidden", !state.isProcessing);
  elements.overlay.hidden = !state.isProcessing;
}

function updateProceedState() {
  const hasInput =
    elements.consumerNumber.value.trim() || elements.phone.value.trim();
  elements.proceed.disabled = !hasInput;
}

function getSelectedBill() {
  if (!state.consumer) return null;
  return (
    state.consumer.bills.find((bill) => bill.id === state.selectedBillId) || null
  );
}

function renderBill() {
  const bill = getSelectedBill();
  if (!state.consumer || !bill) return;

  elements.billName.textContent = state.consumer.name;
  elements.billNumber.textContent = state.consumer.consumerNumber;
  elements.billAmount.textContent = formatMoney(bill.billAmount);
  elements.billDate.textContent = bill.dueDate;
  elements.billStatus.textContent = statusLabels[bill.status] || bill.status;
  elements.payButton.disabled = bill.status === "PAID";
}

function updateGateway() {
  const bill = getSelectedBill();
  if (!bill) return;
  elements.gatewayAmount.textContent = `Pay ${formatMoney(bill.billAmount)}`;
  elements.qrLabel.textContent = `upi://pay?pa=kwa@upi&pn=KWA&am=${bill.billAmount}`;
  elements.vpa.value = "";
  showGatewayError("");
}

function resetForm() {
  elements.consumerNumber.value = "";
  elements.phone.value = "";
  showError("");
  showGatewayError("");
  elements.billCard.classList.add("hidden");
  elements.gateway.classList.add("hidden");
  elements.result.classList.add("hidden");
  elements.payButton.disabled = true;
  state.consumer = null;
  state.selectedBillId = "";
  updateProceedState();
}

async function handleSubmit(event) {
  event.preventDefault();
  showError("");

  const consumerNumber = elements.consumerNumber.value.trim();
  const phone = elements.phone.value.trim();

  if (!consumerNumber && !phone) {
    showError("Consumer ID or phone number is required.");
    return;
  }

  elements.proceed.textContent = "Fetching...";
  elements.proceed.disabled = true;

  try {
    const consumer = state.consumers.find((item) => {
      if (consumerNumber && item.consumerNumber === consumerNumber) return true;
      if (phone && item.phone === phone) return true;
      return false;
    });

    if (!consumer) {
      showError("No matching account found.");
      elements.billCard.classList.add("hidden");
      elements.gateway.classList.add("hidden");
      elements.result.classList.add("hidden");
      return;
    }

    const bill =
      consumer.bills.find((item) => item.status === "PENDING") ||
      consumer.bills[0];

    state.consumer = consumer;
    state.selectedBillId = bill.id;
    renderBill();
    elements.billCard.classList.remove("hidden");
    elements.gateway.classList.add("hidden");
    elements.result.classList.add("hidden");
  } catch (err) {
    showError("Unable to reach the server.");
  } finally {
    elements.proceed.textContent = "Proceed";
    updateProceedState();
  }
}

function showGateway() {
  updateGateway();
  elements.gateway.classList.remove("hidden");
  elements.result.classList.add("hidden");
}

async function handlePay() {
  if (state.isProcessing) return;
  showGatewayError("");

  const vpa = elements.vpa.value.trim();
  const bill = getSelectedBill();

  if (!vpa) {
    showGatewayError("Enter a UPI ID to proceed.");
    return;
  }

  if (!bill || !state.consumer) {
    showGatewayError("No bill selected.");
    return;
  }

  setOverlayVisible(true);
  await new Promise((resolve) => setTimeout(resolve, 2800));

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

  renderBill();
  elements.resultTitle.textContent =
    data.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
  elements.resultMessage.textContent = data.message || "";
  elements.resultConsumer.textContent = state.consumer.consumerNumber;
  const updatedBill = getSelectedBill();
  elements.resultStatus.textContent =
    statusLabels[updatedBill?.status] || updatedBill?.status || "";
  elements.resultRef.textContent = `TXN-${Date.now().toString().slice(-6)}`;

  elements.result.classList.remove("hidden");
  elements.gateway.classList.add("hidden");
}

function handleQrSimulate() {
  elements.vpa.value = "success@upi";
  handlePay();
}

function redirectToGateway() {
  const bill = getSelectedBill();
  if (!bill || !state.consumer) return;

  const paymentInfo = {
    merchant: "KWA",
    merchantFull: "Kerala Water Authority",
    amount: bill.billAmount,
    description: `Bill ${bill.id} for ${state.consumer.name}`,
    returnUrl: window.location.href.split("?")[0],
    txnId: `KWA-${Date.now()}`,
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

    renderBill();
    elements.billCard.classList.remove("hidden");
    elements.resultTitle.textContent =
      result.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
    elements.resultMessage.textContent = result.message || "";
    elements.resultConsumer.textContent = state.consumer.consumerNumber;
    const updatedBill = getSelectedBill();
    elements.resultStatus.textContent =
      statusLabels[updatedBill?.status] || updatedBill?.status || "";
    elements.resultRef.textContent = result.txnId || `TXN-${Date.now().toString().slice(-6)}`;

    elements.result.classList.remove("hidden");
    elements.gateway.classList.add("hidden");
    return true;
  }
  return false;
}

async function loadConsumers() {
  const response = await fetch("./data/consumers.json");
  state.consumers = await response.json();
}

loadConsumers().then(() => {
  updateProceedState();
  elements.consumerNumber.addEventListener("input", updateProceedState);
  elements.phone.addEventListener("input", updateProceedState);
  elements.form.addEventListener("submit", handleSubmit);
  elements.reset.addEventListener("click", resetForm);
  elements.newSearch.addEventListener("click", resetForm);
  elements.payButton.addEventListener("click", redirectToGateway);
  elements.backToBill.addEventListener("click", () => {
    elements.gateway.classList.add("hidden");
  });
  elements.confirmPay.addEventListener("click", handlePay);
  elements.resultNewSearch.addEventListener("click", resetForm);
  elements.qrSimulate.addEventListener("click", handleQrSimulate);
  elements.qrSimulate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleQrSimulate();
    }
  });

  checkPaymentResult();
});
