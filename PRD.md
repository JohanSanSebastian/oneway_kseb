1. Product Overview
The goal is to create a sandbox environment that mirrors the UX/UI of the KSEB Quick Pay system. This includes consumer identification, bill fetching, and a simulated payment journey to test fintech integrations or UI/UX flows without impacting live utility accounts.

2. Target Features
2.1 Direct UI Clone

Visual Fidelity: Replicate the legacy blue-and-white theme, layout, and responsiveness of the KSEB "Quick Pay" page.

Input Fields: A 13-digit Consumer Number input and a Section Office selector.

2.2 Captcha Simulation

Logic: A custom-built engine to generate alphanumeric strings or simple arithmetic challenges.

Validation: A front-end/back-end handshake to ensure the user enters the correct string before proceeding to "Fetch Bill."

Refresh: Ability to regenerate the image without reloading the entire page.

2.3 Dynamic Consumer Data (Mock Backend)

To simulate "actual logins," the system will use a mapped database of mock consumer IDs.

Consumer Mapping:

Input: Consumer Number + Section.

Output: Dynamic values for "Consumer Name," "Address," "Bill Amount," "Due Date," and "Penalty."

Data States: The system should handle various states: Bill Paid, Bill Pending, or Invalid Consumer Number.

2.4 Simulated UPI Gateway

Gateway Interface: A mock payment page mimicking standard aggregators (like BillDesk or PayU).

UPI Intent: Generation of a static/dynamic QR code.

Transaction Flow: 1.  User selects UPI.
2.  User enters a dummy VPA (e.g., success@upi or fail@upi).
3.  The system simulates a "Processing" state for 3 seconds.
4.  The system returns a Success/Failure callback to the KSEB clone.

3. Technical Specifications
Component	Technology (Recommended)	Functionality
Frontend	React or Plain HTML/CSS	UI Cloning and state management.
Backend	Node.js (Express) or Python (FastAPI)	Logic for Captcha validation and Data fetching.
Database	PostgreSQL or JSON Mock	Storing consumer records and payment status.
Security	HTTPS / TLS	To simulate the secure feel of a payment portal.
4. User Flow
Landing: User enters the 13-digit Consumer Number and solves the Simulated Captcha.

Verification: The system queries the mock DB.

Bill Display: User views dynamic bill details (Amount, Name).

Payment Selection: User clicks "Pay via UPI."
s
Mock Gateway: User "scans" a QR code or enters a VPA.

Confirmation: A simulated success screen is shown, and the mock DB updates the bill status to "Paid."

5. Success Metrics
Response Time: Bill fetching should occur in < 500ms.

Accuracy: Captcha validation must have 0% false positives.

Persistence: A "Paid" bill should remain "Paid" if the consumer number is searched again during the session.