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
  billStatus: document.getElementById("bill-status")
};

const state = {
  consumers: []
};

function showError(message) {
  elements.error.textContent = message;
  elements.error.classList.toggle("hidden", !message);
}

function updateProceedState() {
  const hasInput =
    elements.consumerNumber.value.trim() || elements.phone.value.trim();
  elements.proceed.disabled = !hasInput;
}

function resetForm() {
  elements.consumerNumber.value = "";
  elements.phone.value = "";
  showError("");
  elements.billCard.classList.add("hidden");
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
      return;
    }

    const bill =
      consumer.bills.find((item) => item.status === "PENDING") ||
      consumer.bills[0];

    elements.billName.textContent = consumer.name;
    elements.billNumber.textContent = consumer.consumerNumber;
    elements.billAmount.textContent = `INR ${bill.billAmount.toFixed(2)}`;
    elements.billDate.textContent = bill.dueDate;
    elements.billStatus.textContent = bill.status;
    elements.billCard.classList.remove("hidden");
  } catch (err) {
    showError("Unable to reach the server.");
  } finally {
    elements.proceed.textContent = "Proceed";
    updateProceedState();
  }
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
});
