/* ============================================
   Book Appointment Page (with Payment)
   ============================================ */
const BookAppointment = {
    selectedDoctor: null,
    selectedDoctorFee: 0,
    selectedDate: null,
    selectedSlot: null,
    bookedAppointment: null,

    render() {
        return `
        <div class="dashboard">
            <div class="dashboard-header">
                <h1>Book an Appointment</h1>
                <p>Select a doctor, choose a date, pick a time slot, and pay</p>
            </div>

            <!-- Step 1: Choose Doctor -->
            <div class="card">
                <div class="card-header">
                    <h2>Step 1 — Select a Doctor</h2>
                </div>
                <div class="card-body">
                    <div class="doctor-grid" id="doctor-list">
                        ${App.loading()}
                    </div>
                </div>
            </div>

            <!-- Step 2: Choose Date -->
            <div class="card" id="step-date" style="opacity:0.4; pointer-events:none;">
                <div class="card-header">
                    <h2>Step 2 — Select a Date</h2>
                </div>
                <div class="card-body">
                    <div class="form-group" style="max-width:300px;">
                        <input type="date" id="appt-date">
                    </div>
                </div>
            </div>

            <!-- Step 3: Choose Slot -->
            <div class="card" id="step-slot" style="opacity:0.4; pointer-events:none;">
                <div class="card-header">
                    <h2>Step 3 — Choose a Time Slot</h2>
                </div>
                <div class="card-body">
                    <div class="slots-grid" id="slots-container">
                        <p style="color:var(--text-muted);">Select a date to view slots</p>
                    </div>
                </div>
            </div>

            <!-- Step 4: Payment -->
            <div class="card" id="step-payment" style="opacity:0.4; pointer-events:none;">
                <div class="card-header">
                    <h2>Step 4 — Payment</h2>
                    <span id="fee-display" style="color:var(--accent);font-weight:700;"></span>
                </div>
                <div class="card-body">
                    <div id="booking-summary" class="mb-16"></div>

                    <!-- Payment Method Selection -->
                    <div class="section-title">Select Payment Method</div>
                    <div class="payment-methods" id="payment-methods">
                        <div class="payment-method-card" data-method="mtn_momo" onclick="BookAppointment.selectPaymentMethod('mtn_momo', this)">
                            <div class="pm-icon" style="background:#FFCC00;color:#000;">MTN</div>
                            <div class="pm-info">
                                <div class="pm-name">MTN Mobile Money</div>
                                <div class="pm-desc">Pay with your MoMo wallet</div>
                            </div>
                        </div>
                        <div class="payment-method-card" data-method="telecel_cash" onclick="BookAppointment.selectPaymentMethod('telecel_cash', this)">
                            <div class="pm-icon" style="background:#E60000;color:#fff;">TC</div>
                            <div class="pm-info">
                                <div class="pm-name">Telecel Cash</div>
                                <div class="pm-desc">Pay with Telecel Cash</div>
                            </div>
                        </div>
                        <div class="payment-method-card" data-method="airteltigo_money" onclick="BookAppointment.selectPaymentMethod('airteltigo_money', this)">
                            <div class="pm-icon" style="background:#0066B3;color:#fff;">AT</div>
                            <div class="pm-info">
                                <div class="pm-name">AirtelTigo Money</div>
                                <div class="pm-desc">Pay with AirtelTigo</div>
                            </div>
                        </div>
                        <div class="payment-method-card" data-method="card" onclick="BookAppointment.selectPaymentMethod('card', this)">
                            <div class="pm-icon" style="background:linear-gradient(135deg,#1A1F71,#F7B600);color:#fff;"><i data-lucide="credit-card" style="width:20px;height:20px;"></i></div>
                            <div class="pm-info">
                                <div class="pm-name">Visa / Mastercard</div>
                                <div class="pm-desc">Pay with debit or credit card</div>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Money Form (hidden by default) -->
                    <div id="momo-form" class="payment-form hidden mt-16">
                        <div class="form-group">
                            <label for="momo-phone">Mobile Money Number</label>
                            <input type="tel" id="momo-phone" placeholder="0XX XXX XXXX">
                        </div>
                        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:-12px;">
                            You will receive a prompt on your phone to confirm payment.
                        </p>
                    </div>

                    <!-- Card Form (hidden by default) -->
                    <div id="card-form" class="payment-form hidden mt-16">
                        <div class="form-group">
                            <label for="card-number">Card Number</label>
                            <input type="text" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="card-expiry">Expiry Date</label>
                                <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5">
                            </div>
                            <div class="form-group">
                                <label for="card-cvv">CVV</label>
                                <input type="password" id="card-cvv" placeholder="123" maxlength="3">
                            </div>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="form-group mt-16">
                        <label for="appt-notes">Notes for the doctor (optional)</label>
                        <textarea id="appt-notes" placeholder="Describe your symptoms or reason for visit..."></textarea>
                    </div>

                    <button class="btn btn-primary btn-block" id="confirm-booking" disabled>
                        Pay & Confirm Appointment
                    </button>
                </div>
            </div>

            <!-- Receipt (hidden, shown after payment) -->
            <div class="card hidden" id="receipt-card">
                <div class="card-header">
                    <h2>Payment Receipt</h2>
                    <button class="btn btn-secondary btn-sm" onclick="BookAppointment.printReceipt()"><i data-lucide="printer" style="width:14px;height:14px;"></i> Print</button>
                </div>
                <div class="card-body" id="receipt-content"></div>
            </div>
        </div>`;
    },

    selectedPaymentMethod: null,

    async init() {
        this.selectedDoctor = null;
        this.selectedDoctorFee = 0;
        this.selectedDate = null;
        this.selectedSlot = null;
        this.selectedPaymentMethod = null;
        this.bookedAppointment = null;

        try {
            const doctors = await App.api('/doctors');
            const container = document.getElementById('doctor-list');

            if (!doctors || doctors.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i data-lucide="stethoscope" style="width:40px;height:40px;color:var(--text-muted);"></i></div><h3>No doctors available</h3></div>';
                App.refreshIcons();
                return;
            }

            container.innerHTML = doctors.map(d => `
                <div class="doctor-card" data-id="${d.id}" data-fee="${d.consultation_fee || 0}" onclick="BookAppointment.selectDoctor('${d.id}', ${d.consultation_fee || 0}, this)">
                    <div class="doctor-name"><i data-lucide="stethoscope" style="width:16px;height:16px;display:inline;"></i> ${d.name}</div>
                    <div class="doctor-spec">${d.specialization}</div>
                    <div class="doctor-bio">${d.bio || 'No bio available'}</div>
                    <div class="doctor-fee">GHS ${(d.consultation_fee || 0).toFixed(2)} consultation fee</div>
                </div>
            `).join('');
        } catch (e) { /* handled by api */ }

        // Date input
        const dateInput = document.getElementById('appt-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.addEventListener('change', () => this.onDateChange(dateInput.value));

        // Card brand detection utility
        const detectCardBrand = (cardNumber) => {
            const cleanNumber = cardNumber.replace(/\D/g, '');
            if (/^4/.test(cleanNumber)) return 'Visa';
            if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[0-1][0-9]|2720)/.test(cleanNumber)) return 'Mastercard';
            return 'Unknown';
        };

        // Card number formatting and auto-selection
        const cardInput = document.getElementById('card-number');
        cardInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formattedValue = v.match(/.{1,4}/g)?.join(' ') || v;
            e.target.value = formattedValue;

            const brand = detectCardBrand(v);
            const pmNameElement = document.querySelector('.payment-method-card[data-method="card"] .pm-name');

            if (pmNameElement) {
                if (brand === 'Visa') {
                    pmNameElement.innerText = 'Visa';
                } else if (brand === 'Mastercard') {
                    pmNameElement.innerText = 'Mastercard';
                } else {
                    pmNameElement.innerText = 'Visa / Mastercard';
                }
            }
        });

        // Expiry formatting
        const expiryInput = document.getElementById('card-expiry');
        expiryInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
            e.target.value = v;
        });

        // Confirm button
        document.getElementById('confirm-booking').addEventListener('click', () => this.processPayment());
    },

    selectDoctor(id, fee, el) {
        document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedDoctor = id;
        this.selectedDoctorFee = fee;

        const stepDate = document.getElementById('step-date');
        stepDate.style.opacity = '1';
        stepDate.style.pointerEvents = 'auto';

        // Reset downstream
        this.selectedDate = null;
        this.selectedSlot = null;
        this.selectedPaymentMethod = null;
        document.getElementById('appt-date').value = '';
        document.getElementById('slots-container').innerHTML = '<p style="color:var(--text-muted);">Select a date to view slots</p>';
        document.getElementById('step-slot').style.opacity = '0.4';
        document.getElementById('step-slot').style.pointerEvents = 'none';
        document.getElementById('step-payment').style.opacity = '0.4';
        document.getElementById('step-payment').style.pointerEvents = 'none';
        document.getElementById('confirm-booking').disabled = true;
    },

    async onDateChange(date) {
        if (!date || !this.selectedDoctor) return;
        this.selectedDate = date;
        this.selectedSlot = null;
        this.selectedPaymentMethod = null;

        const stepSlot = document.getElementById('step-slot');
        stepSlot.style.opacity = '1';
        stepSlot.style.pointerEvents = 'auto';
        document.getElementById('step-payment').style.opacity = '0.4';
        document.getElementById('step-payment').style.pointerEvents = 'none';
        document.getElementById('confirm-booking').disabled = true;

        const container = document.getElementById('slots-container');
        container.innerHTML = App.loading();

        try {
            const data = await App.api(`/doctors/${this.selectedDoctor}/slots?date=${date}`);
            const slots = data.slots || [];

            if (slots.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);">No availability on this date. The doctor doesn\'t work this day.</p>';
                return;
            }

            container.innerHTML = slots.map(s => `
                <button class="slot-btn ${s.available ? '' : 'booked'}"
                    ${s.available ? `onclick="BookAppointment.selectSlot('${s.time}', this)"` : 'disabled'}
                    title="${s.available ? 'Available' : 'Already booked'}">
                    ${s.time}
                </button>
            `).join('');
        } catch (e) {
            container.innerHTML = '<p style="color:var(--error);">Failed to fetch slots</p>';
        }
    },

    selectSlot(time, el) {
        document.querySelectorAll('.slots-grid .slot-btn').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedSlot = time;
        this.selectedPaymentMethod = null;

        // Enable payment step
        const stepPayment = document.getElementById('step-payment');
        stepPayment.style.opacity = '1';
        stepPayment.style.pointerEvents = 'auto';

        // Update fee display
        document.getElementById('fee-display').textContent = `GHS ${this.selectedDoctorFee.toFixed(2)}`;

        // Show summary
        const doctorCard = document.querySelector(`.doctor-card.selected`);
        const doctorName = doctorCard ? doctorCard.querySelector('.doctor-name').textContent : '';
        const doctorSpec = doctorCard ? doctorCard.querySelector('.doctor-spec').textContent : '';

        document.getElementById('booking-summary').innerHTML = `
            <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem;">
                    <div><span style="color:var(--text-muted);">Doctor:</span> <strong>${App.escapeHtml(doctorName)}</strong></div>
                    <div><span style="color:var(--text-muted);">Specialization:</span> <strong>${App.escapeHtml(doctorSpec)}</strong></div>
                    <div><span style="color:var(--text-muted);">Date:</span> <strong>${App.formatDate(this.selectedDate)}</strong></div>
                    <div><span style="color:var(--text-muted);">Time:</span> <strong>${this.selectedSlot}</strong></div>
                    <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px;margin-top:4px;">
                        <span style="color:var(--text-muted);">Amount:</span>
                        <strong style="color:var(--accent);font-size:1.1rem;"> GHS ${this.selectedDoctorFee.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `;

        // Reset payment method selection
        document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.payment-form').forEach(f => f.classList.add('hidden'));
        document.getElementById('confirm-booking').disabled = true;
    },

    selectPaymentMethod(method, el) {
        document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedPaymentMethod = method;

        // Show the right form
        document.getElementById('momo-form').classList.add('hidden');
        document.getElementById('card-form').classList.add('hidden');

        if (['mtn_momo', 'telecel_cash', 'airteltigo_money'].includes(method)) {
            document.getElementById('momo-form').classList.remove('hidden');
        } else if (method === 'card') {
            document.getElementById('card-form').classList.remove('hidden');
        }

        // Enable confirm button
        document.getElementById('confirm-booking').disabled = false;
    },

    async processPayment() {
        if (!this.selectedDoctor || !this.selectedDate || !this.selectedSlot || !this.selectedPaymentMethod) {
            App.toast('Please complete all steps', 'warning');
            return;
        }

        // Validate payment details
        if (['mtn_momo', 'telecel_cash', 'airteltigo_money'].includes(this.selectedPaymentMethod)) {
            const phone = document.getElementById('momo-phone').value.trim();
            if (!phone || phone.length < 10) {
                App.toast('Please enter a valid phone number', 'warning');
                return;
            }
        } else if (this.selectedPaymentMethod === 'card') {
            const cardNum = document.getElementById('card-number').value.replace(/\s/g, '');
            const expiry = document.getElementById('card-expiry').value;
            const cvv = document.getElementById('card-cvv').value;
            if (cardNum.length < 13 || !expiry || cvv.length < 3) {
                App.toast('Please enter valid card details', 'warning');
                return;
            }
        }

        const btn = document.getElementById('confirm-booking');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Processing payment...';

        try {
            // Step 1: Book the appointment
            const appointmentResult = await App.api('/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    doctor_id: this.selectedDoctor,
                    date: this.selectedDate,
                    time_slot: this.selectedSlot,
                    notes: document.getElementById('appt-notes').value.trim()
                })
            });

            if (!appointmentResult) throw new Error('Booking failed');
            this._pendingAppointmentId = appointmentResult.appointment.id;

            // Step 2: Small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Process payment
            const paymentBody = {
                appointment_id: appointmentResult.appointment.id,
                payment_method: this.selectedPaymentMethod
            };

            if (['mtn_momo', 'telecel_cash', 'airteltigo_money'].includes(this.selectedPaymentMethod)) {
                paymentBody.phone_number = document.getElementById('momo-phone').value.trim();
            } else {
                paymentBody.card_number = document.getElementById('card-number').value.replace(/\s/g, '');
                paymentBody.card_expiry = document.getElementById('card-expiry').value;
                paymentBody.card_cvv = document.getElementById('card-cvv').value;
            }

            const paymentResult = await App.api('/payments', {
                method: 'POST',
                body: JSON.stringify(paymentBody)
            });

            // Step 4: Show receipt
            this._pendingAppointmentId = null;
            App.toast('Payment successful! Appointment confirmed!', 'success');
            this.showReceipt(appointmentResult, paymentResult);

        } catch (e) {
            // If payment failed but appointment was created, cancel the orphaned appointment
            if (this._pendingAppointmentId) {
                try {
                    await App.api(`/appointments/${this._pendingAppointmentId}/cancel`, { method: 'PATCH' });
                } catch (cancelErr) { /* best effort cleanup */ }
                this._pendingAppointmentId = null;
            }
            btn.disabled = false;
            btn.innerHTML = 'Pay & Confirm Appointment';
        }
    },

    showReceipt(appointmentResult, paymentResult) {
        const receiptCard = document.getElementById('receipt-card');
        const receiptContent = document.getElementById('receipt-content');
        receiptCard.classList.remove('hidden');

        const doctorCard = document.querySelector('.doctor-card.selected');
        const doctorName = doctorCard ? doctorCard.querySelector('.doctor-name').textContent : '';
        const doctorSpec = doctorCard ? doctorCard.querySelector('.doctor-spec').textContent : '';

        const methodNames = {
            mtn_momo: 'MTN Mobile Money',
            telecel_cash: 'Telecel Cash',
            airteltigo_money: 'AirtelTigo Money',
            card: 'Visa / Mastercard'
        };

        receiptContent.innerHTML = `
            <div class="receipt" id="receipt-printable">
                <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px dashed var(--border);">
                    <div style="font-size:1.5rem;margin-bottom:4px;">UCC Hospital</div>
                    <div style="color:var(--text-muted);font-size:0.85rem;">Payment Receipt</div>
                </div>

                <div class="receipt-grid">
                    <div class="receipt-row">
                        <span class="receipt-label">Transaction Ref</span>
                        <span class="receipt-value" style="color:var(--accent);font-weight:700;">${paymentResult.payment.transaction_ref}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Date & Time</span>
                        <span class="receipt-value">${new Date().toLocaleString()}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Patient</span>
                        <span class="receipt-value">${App.escapeHtml(App.user.name)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Doctor</span>
                        <span class="receipt-value">${App.escapeHtml(doctorName)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Specialization</span>
                        <span class="receipt-value">${App.escapeHtml(doctorSpec)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Appointment Date</span>
                        <span class="receipt-value">${App.formatDate(this.selectedDate)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Time Slot</span>
                        <span class="receipt-value">${this.selectedSlot}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Payment Method</span>
                        <span class="receipt-value">${methodNames[this.selectedPaymentMethod]}</span>
                    </div>
                    <div class="receipt-row receipt-total">
                        <span class="receipt-label">Amount Paid</span>
                        <span class="receipt-value">GHS ${paymentResult.payment.amount.toFixed(2)}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="receipt-label">Status</span>
                        <span class="status-badge completed">Paid</span>
                    </div>
                </div>

                <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:2px dashed var(--border);">
                    <p style="color:var(--text-muted);font-size:0.8rem;">Thank you for your payment</p>
                    <button class="btn btn-primary mt-16" onclick="App.navigate('patient-dashboard')">Go to Dashboard</button>
                </div>
            </div>
        `;

        // Scroll to receipt
        receiptCard.scrollIntoView({ behavior: 'smooth' });
    },

    printReceipt() {
        const content = document.getElementById('receipt-printable').innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Payment Receipt — UCC Hospital</title>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
                .receipt-grid { margin: 20px 0; }
                .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .receipt-label { color: #666; }
                .receipt-value { font-weight: 600; }
                .receipt-total { font-size: 1.2rem; border-top: 2px solid #333; margin-top: 8px; padding-top: 12px; }
                .status-badge { background: #d4edda; color: #155724; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; }
                .btn { display: none; }
            </style></head>
            <body>${content}</body></html>
        `);
        win.document.close();
        win.print();
    }
};
