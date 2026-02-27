const elements = {
  searchForm: document.getElementById("search-form"),
  searchValue: document.getElementById("searchValue"),
  searchLabel: document.getElementById("search-label"),
  captchaText: document.getElementById("captcha-text"),
  captchaValue: document.getElementById("captchaValue"),
  refreshCaptcha: document.getElementById("refresh-captcha"),
  searchError: document.getElementById("search-error"),
  searchCard: document.getElementById("search-card"),
  challanCard: document.getElementById("challan-card"),
  paymentCard: document.getElementById("payment-card"),
  resultCard: document.getElementById("result-card"),
  displayChallanNo: document.getElementById("display-challan-no"),
  displayVehicleNo: document.getElementById("display-vehicle-no"),
  displayOwner: document.getElementById("display-owner"),
  displayViolation: document.getElementById("display-violation"),
  displayDatetime: document.getElementById("display-datetime"),
  displayLocation: document.getElementById("display-location"),
  displayFine: document.getElementById("display-fine"),
  displayStatus: document.getElementById("display-status"),
  paidBanner: document.getElementById("paid-banner"),
  payButton: document.getElementById("pay-button"),
  newSearch: document.getElementById("new-search"),
  paymentAmount: document.getElementById("payment-amount"),
  qrSimulate: document.getElementById("qr-simulate"),
  qrLabel: document.getElementById("qr-label"),
  vpa: document.getElementById("vpa"),
  paymentError: document.getElementById("payment-error"),
  confirmPay: document.getElementById("confirm-pay"),
  backToChallan: document.getElementById("back-to-challan"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultChallan: document.getElementById("result-challan"),
  resultStatus: document.getElementById("result-status"),
  resultRef: document.getElementById("result-ref"),
  resultNewSearch: document.getElementById("result-new-search"),
  overlay: document.getElementById("overlay")
};

const state = {
  challans: [],
  selectedChallan: null,
  captchaValue: "",
  searchType: "challan",
  isProcessing: false
};

const statusLabels = {
  PENDING: "Unpaid",
  PAID: "Paid"
};

const searchLabels = {
  challan: { label: "Challan Number", placeholder: "Enter Challan Number" },
  vehicle: { label: "Vehicle Number", placeholder: "Enter Vehicle Number (e.g., KL01AB1234)" },
  dl: { label: "DL Number", placeholder: "Enter Driving License Number" }
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function showError(el, message) {
  el.textContent = message;
  el.classList.toggle("hidden", !message);
}

function setOverlayVisible(isVisible) {
  state.isProcessing = Boolean(isVisible);
  elements.overlay.classList.toggle("hidden", !state.isProcessing);
  elements.overlay.hidden = !state.isProcessing;
}

function showSection(section) {
  elements.searchCard.classList.add("hidden");
  elements.challanCard.classList.add("hidden");
  elements.paymentCard.classList.add("hidden");
  elements.resultCard.classList.add("hidden");
  section.classList.remove("hidden");
  setOverlayVisible(false);
}

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 5; i++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  state.captchaValue = value;
  elements.captchaText.textContent = value;
}

function updateSearchLabel() {
  const config = searchLabels[state.searchType];
  elements.searchLabel.textContent = config.label;
  elements.searchValue.placeholder = config.placeholder;
  elements.searchValue.value = "";
}

function renderChallanDetails() {
  const challan = state.selectedChallan;
  if (!challan) return;

  elements.displayChallanNo.textContent = challan.challanNumber;
  elements.displayVehicleNo.textContent = challan.vehicleNumber;
  elements.displayOwner.textContent = challan.ownerName;
  elements.displayViolation.textContent = challan.violation;
  elements.displayDatetime.textContent = challan.dateTime;
  elements.displayLocation.textContent = challan.location;
  elements.displayFine.textContent = formatMoney(challan.fineAmount);

  elements.displayStatus.textContent = statusLabels[challan.status] || challan.status;
  elements.displayStatus.className = `status-badge ${challan.status.toLowerCase()}`;

  elements.paidBanner.classList.toggle("hidden", challan.status !== "PAID");
  elements.payButton.disabled = challan.status === "PAID";
}

function updatePaymentSection() {
  const challan = state.selectedChallan;
  if (!challan) return;
  elements.paymentAmount.textContent = `Pay ${formatMoney(challan.fineAmount)} for Challan ${challan.challanNumber}`;
  elements.qrLabel.textContent = `upi://pay?pa=echallan@gov&pn=eChallan&am=${challan.fineAmount}`;
  elements.vpa.value = "";
  showError(elements.paymentError, "");
}

function resetForm() {
  elements.searchValue.value = "";
  elements.captchaValue.value = "";
  elements.vpa.value = "";
  showError(elements.searchError, "");
  showError(elements.paymentError, "");
  state.selectedChallan = null;
  state.searchType = "challan";
  updateSearchLabel();
  generateCaptcha();

  // Reset radio buttons
  document.querySelector('input[name="searchType"][value="challan"]').checked = true;

  showSection(elements.searchCard);
}

async function handleSearch(event) {
  event.preventDefault();
  showError(elements.searchError, "");

  const searchValue = elements.searchValue.value.trim().toUpperCase();
  const captchaInput = elements.captchaValue.value.trim().toUpperCase();

  if (!searchValue) {
    showError(elements.searchError, `Please enter a ${searchLabels[state.searchType].label}.`);
    return;
  }

  if (!captchaInput) {
    showError(elements.searchError, "Please enter the captcha.");
    return;
  }

  if (captchaInput !== state.captchaValue) {
    showError(elements.searchError, "Captcha does not match. Please try again.");
    generateCaptcha();
    elements.captchaValue.value = "";
    return;
  }

  const challan = state.challans.find((item) => {
    if (state.searchType === "challan") {
      return item.challanNumber.toUpperCase() === searchValue;
    }
    if (state.searchType === "vehicle") {
      return item.vehicleNumber.toUpperCase() === searchValue;
    }
    if (state.searchType === "dl") {
      return item.dlNumber.toUpperCase() === searchValue;
    }
    return false;
  });

  if (!challan) {
    showError(elements.searchError, "No challan found for the given details.");
    generateCaptcha();
    return;
  }

  state.selectedChallan = challan;
  renderChallanDetails();
  showSection(elements.challanCard);
}

async function handlePay() {
  if (state.isProcessing) return;
  showError(elements.paymentError, "");

  const vpa = elements.vpa.value.trim();
  const challan = state.selectedChallan;

  if (!vpa) {
    showError(elements.paymentError, "Enter a UPI ID to proceed.");
    return;
  }

  if (!challan) {
    showError(elements.paymentError, "No challan selected.");
    return;
  }

  setOverlayVisible(true);
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const isFailure = vpa.toLowerCase().includes("fail");
  const isSuccess = vpa.toLowerCase().includes("success") || !isFailure;
  const data = isSuccess
    ? { status: "SUCCESS", message: "Payment captured. Your challan has been cleared." }
    : { status: "FAILURE", message: "UPI authorization failed. Please try again." };

  setOverlayVisible(false);

  if (data.status === "SUCCESS") {
    state.selectedChallan.status = "PAID";
  }

  renderChallanDetails();
  elements.resultTitle.textContent =
    data.status === "SUCCESS" ? "Payment Successful" : "Payment Failed";
  elements.resultMessage.textContent = data.message || "";
  elements.resultChallan.textContent = challan.challanNumber;
  elements.resultStatus.textContent = statusLabels[state.selectedChallan.status] || state.selectedChallan.status;
  elements.resultRef.textContent = `TXN-${Date.now().toString().slice(-6)}`;

  showSection(elements.resultCard);
}

function handleQrSimulate() {
  elements.vpa.value = "success@upi";
  handlePay();
}

async function loadChallans() {
  const response = await fetch("./data/challans.json");
  state.challans = await response.json();
}

function setupEvents() {
  elements.searchForm.addEventListener("submit", handleSearch);
  elements.refreshCaptcha.addEventListener("click", generateCaptcha);
  elements.newSearch.addEventListener("click", resetForm);
  elements.resultNewSearch.addEventListener("click", resetForm);

  // Radio button handling
  document.querySelectorAll('input[name="searchType"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      state.searchType = e.target.value;
      updateSearchLabel();
    });
  });

  elements.payButton.addEventListener("click", () => {
    updatePaymentSection();
    showSection(elements.paymentCard);
  });

  elements.backToChallan.addEventListener("click", () => {
    showSection(elements.challanCard);
  });

  elements.confirmPay.addEventListener("click", handlePay);

  elements.qrSimulate.addEventListener("click", handleQrSimulate);
  elements.qrSimulate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleQrSimulate();
    }
  });
}

loadChallans().then(() => {
  generateCaptcha();
  setupEvents();
  showSection(elements.searchCard);
});
