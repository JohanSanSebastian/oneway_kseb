// Payment Gateway - Reads payment info from sessionStorage and processes UPI payments

const elements = {
  merchantIcon: document.getElementById("merchant-icon"),
  merchantName: document.getElementById("merchant-name"),
  merchantDesc: document.getElementById("merchant-desc"),
  amountValue: document.getElementById("amount-value"),
  btnAmount: document.getElementById("btn-amount"),
  txnId: document.getElementById("txn-id"),
  refId: document.getElementById("ref-id"),
  qrSimulate: document.getElementById("qr-simulate"),
  vpaInput: document.getElementById("vpa-input"),
  paymentError: document.getElementById("payment-error"),
  payNow: document.getElementById("pay-now"),
  cancelPayment: document.getElementById("cancel-payment"),
  processingOverlay: document.getElementById("processing-overlay"),
  resultOverlay: document.getElementById("result-overlay"),
  resultIcon: document.getElementById("result-icon"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultAmount: document.getElementById("result-amount"),
  resultTxn: document.getElementById("result-txn"),
  resultStatus: document.getElementById("result-status"),
  countdown: document.getElementById("countdown"),
  returnNow: document.getElementById("return-now")
};

let paymentInfo = null;
let countdownInterval = null;

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function generateTxnId() {
  return "TXN" + Date.now().toString().slice(-10);
}

function generateRefId() {
  return "REF" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function showError(message) {
  elements.paymentError.textContent = message;
  elements.paymentError.classList.toggle("hidden", !message);
}

function setOverlayVisible(overlay, isVisible) {
  overlay.classList.toggle("hidden", !isVisible);
  overlay.hidden = !isVisible;
}

function loadPaymentInfo() {
  const stored = sessionStorage.getItem("paymentInfo");
  if (!stored) {
    // No payment info - redirect back or show error
    alert("No payment information found. Redirecting...");
    window.location.href = "../";
    return false;
  }

  try {
    paymentInfo = JSON.parse(stored);
  } catch (e) {
    alert("Invalid payment data. Redirecting...");
    window.location.href = "../";
    return false;
  }

  // Populate UI
  const merchantIcons = {
    KSEB: "⚡",
    KWA: "💧",
    "K-SMART": "🏠",
    eChallan: "🚗"
  };

  elements.merchantIcon.textContent = merchantIcons[paymentInfo.merchant] || "M";
  elements.merchantName.textContent = paymentInfo.merchant || "Merchant";
  elements.merchantDesc.textContent = paymentInfo.description || "Payment for services";
  elements.amountValue.textContent = formatMoney(paymentInfo.amount);
  elements.btnAmount.textContent = formatMoney(paymentInfo.amount);
  elements.txnId.textContent = paymentInfo.txnId || generateTxnId();
  elements.refId.textContent = paymentInfo.refId || generateRefId();

  return true;
}

async function processPayment(vpa) {
  showError("");

  if (!vpa) {
    showError("Please enter a UPI ID");
    return;
  }

  // Show processing overlay
  setOverlayVisible(elements.processingOverlay, true);

  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 2500));

  setOverlayVisible(elements.processingOverlay, false);

  // Determine success or failure
  const isFailure = vpa.toLowerCase().includes("fail");
  const isSuccess = vpa.toLowerCase().includes("success") || !isFailure;

  // Show result
  const status = isSuccess ? "SUCCESS" : "FAILURE";
  const message = isSuccess
    ? "Your payment has been processed successfully."
    : "Payment authorization failed. Please try again.";

  elements.resultIcon.className = `result-icon ${isSuccess ? "success" : "failure"}`;
  elements.resultIcon.textContent = isSuccess ? "✓" : "✕";
  elements.resultTitle.textContent = isSuccess ? "Payment Successful" : "Payment Failed";
  elements.resultMessage.textContent = message;
  elements.resultAmount.textContent = formatMoney(paymentInfo.amount);
  elements.resultTxn.textContent = elements.txnId.textContent;
  elements.resultStatus.textContent = status;

  // Store result for return
  sessionStorage.setItem("paymentResult", JSON.stringify({
    status: status,
    txnId: elements.txnId.textContent,
    refId: elements.refId.textContent,
    amount: paymentInfo.amount,
    message: message
  }));

  setOverlayVisible(elements.resultOverlay, true);

  // Start countdown for redirect
  let count = 5;
  elements.countdown.textContent = count;
  countdownInterval = setInterval(() => {
    count--;
    elements.countdown.textContent = count;
    if (count <= 0) {
      clearInterval(countdownInterval);
      returnToMerchant();
    }
  }, 1000);
}

function returnToMerchant() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const returnUrl = paymentInfo?.returnUrl || "../";
  window.location.href = returnUrl;
}

function cancelAndReturn() {
  sessionStorage.setItem("paymentResult", JSON.stringify({
    status: "CANCELLED",
    message: "Payment was cancelled by user."
  }));

  const returnUrl = paymentInfo?.returnUrl || "../";
  window.location.href = returnUrl;
}

function setupEvents() {
  elements.payNow.addEventListener("click", () => {
    processPayment(elements.vpaInput.value.trim());
  });

  elements.vpaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      processPayment(elements.vpaInput.value.trim());
    }
  });

  elements.qrSimulate.addEventListener("click", () => {
    elements.vpaInput.value = "success@upi";
    processPayment("success@upi");
  });

  elements.qrSimulate.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.vpaInput.value = "success@upi";
      processPayment("success@upi");
    }
  });

  elements.cancelPayment.addEventListener("click", cancelAndReturn);
  elements.returnNow.addEventListener("click", returnToMerchant);
}

// Initialize
if (loadPaymentInfo()) {
  setupEvents();
}
