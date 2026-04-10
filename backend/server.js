const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ─── In-memory OTP store (email → { code, expiresAt }) ───
const otpStore = new Map();

// ─── Nodemailer transporter (Gmail App Password) ───
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'thebloomorahouse.co@gmail.com',
    pass: process.env.EMAIL_PASS || 'kqyfwnmxjqvukdja',
  },
});

// ─── Helper: read or create an Excel workbook ───
function getWorkbook(filePath) {
  if (fs.existsSync(filePath)) {
    return XLSX.readFile(filePath);
  }
  return XLSX.utils.book_new();
}

// ─── Helper: get sheet data as JSON ───
function getSheetData(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws);
}

// ─── Helper: write data to a sheet and save (with retry for locked files) ───
function writeSheet(filePath, wb, sheetName, data, retries = 3) {
  const ws = XLSX.utils.json_to_sheet(data);
  if (wb.SheetNames.includes(sheetName)) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Write to a temp file first, then rename to avoid corruption
      const tempPath = filePath + '.tmp';
      XLSX.writeFile(wb, tempPath);
      // If the target file is locked, fs.renameSync will fail — use copyFileSync + unlink
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
      return;
    } catch (err) {
      if (attempt === retries) {
        // Last resort: try writing directly
        try {
          XLSX.writeFile(wb, filePath);
          return;
        } catch (directErr) {
          throw directErr;
        }
      }
      // Wait a bit before retrying
      const waitMs = attempt * 500;
      const start = Date.now();
      while (Date.now() - start < waitMs) { /* busy wait */ }
    }
  }
}

// ─── Excel file paths ───
const REGISTERED_USERS_FILE = path.join(__dirname, 'registered_users.xlsx');
const LOGIN_HISTORY_FILE = path.join(__dirname, 'login_history.xlsx');

// ═══════════════════════════════════════════════════
// POST /api/auth/send-otp
// ═══════════════════════════════════════════════════
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(email.toLowerCase(), { code, expiresAt, name });

  try {
    await transporter.sendMail({
      from: `"Pearl n Craft" <thebloomorahouse.co@gmail.com>`,
      replyTo: 'thebloomorahouse.co@gmail.com',
      to: email,
      subject: `${code} is your Pearl n Craft verification code`,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Pearl n Craft Mailer',
        'Feedback-ID': 'login-otp:pearlncraft',
      },
      text: `Hello ${name},\n\nYour Pearl n Craft verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not request this code, please ignore this email.\n\nThank you,\nPearl n Craft Team`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verification Code</title></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(165deg, #0d0618, #180036, #37036f, #1a0a2e); border-radius: 16px; overflow: hidden;">
        <tr><td style="padding: 40px 32px; font-family: Georgia, serif; color: #ede0c8;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 1.5rem; color: #c5a04e; margin: 0;">Pearl n Craft</h1>
            <p style="color: #9b84b5; font-size: .9rem; margin: 8px 0 0;">Email Verification</p>
          </div>
          <p style="margin: 0 0 8px;">Hello <strong>${name}</strong>,</p>
          <p style="margin: 0 0 24px; color: #9b84b5;">You requested a verification code to sign in to your Pearl n Craft account. Please use the code below:</p>
          <div style="text-align: center; background: rgba(197, 160, 78, .12); border: 1px solid rgba(197, 160, 78, .3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 2rem; font-weight: 700; letter-spacing: 8px; color: #c5a04e;">${code}</span>
          </div>
          <p style="font-size: .82rem; color: #9b84b5; text-align: center;">This code expires in 5 minutes. Do not share it with anyone.</p>
          <p style="font-size: .78rem; color: #9b84b5; text-align: center; margin-top: 24px;">If you did not request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid rgba(197, 160, 78, .2); margin: 24px 0 16px;" />
          <p style="font-size: .72rem; color: #7a6894; text-align: center; margin: 0;">© ${new Date().getFullYear()} Pearl n Craft. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email. Check server email config.' });
  }
});

// ═══════════════════════════════════════════════════
// POST /api/auth/verify-otp
// ═══════════════════════════════════════════════════
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const key = email.toLowerCase();
  const entry = otpStore.get(key);

  if (!entry) {
    return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  if (entry.code !== code) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  // OTP is valid — clear it
  const userName = entry.name;
  otpStore.delete(key);

  // ── Register user if not already registered ──
  const regWb = getWorkbook(REGISTERED_USERS_FILE);
  let regData = getSheetData(regWb, 'Users');
  const existing = regData.find(
    (u) => u.Email && u.Email.toLowerCase() === key
  );

  if (!existing) {
    regData.push({
      'User Name': userName,
      Email: email,
      'Registered Date': new Date().toLocaleString(),
    });
    writeSheet(REGISTERED_USERS_FILE, regWb, 'Users', regData);
  }

  // ── Log this login ──
  const loginWb = getWorkbook(LOGIN_HISTORY_FILE);
  let loginData = getSheetData(loginWb, 'Logins');
  loginData.push({
    'User Name': userName,
    Email: email,
    'Login Date': new Date().toLocaleString(),
    Verified: 'Yes',
  });
  writeSheet(LOGIN_HISTORY_FILE, loginWb, 'Logins', loginData);

  res.json({
    success: true,
    message: existing ? 'Login successful.' : 'Registration & login successful.',
    user: { name: userName, email, isNew: !existing },
  });
});

// ─── Excel file path for orders ───
const ORDERS_FILE = path.join(__dirname, 'order_info.xlsx');

// ═══════════════════════════════════════════════════
// POST /api/orders/place
// ═══════════════════════════════════════════════════
app.post('/api/orders/place', (req, res) => {
  const { billing, shipping, payment, items } = req.body;

  if (!billing || !items || items.length === 0) {
    return res.status(400).json({ error: 'Billing info and items are required.' });
  }

  // Generate 5-digit random order ID
  const orderId = String(Math.floor(10000 + Math.random() * 90000));
  const orderDate = new Date().toLocaleString();

  try {
    const wb = getWorkbook(ORDERS_FILE);

    // ── Sheet 1: Billing Info ──
    let billingData = getSheetData(wb, 'Billing');
    billingData.push({
      'Order ID': orderId,
      'Order Date': orderDate,
      'Customer Name': billing.name,
      'Email': billing.email,
      'Phone': billing.phone,
      'Address': billing.address,
      'City': billing.city,
      'State': billing.state,
      'Pincode': billing.pincode,
      'Shipping Name': shipping?.name || billing.name,
      'Shipping Phone': shipping?.phone || billing.phone,
      'Shipping Address': shipping?.address || billing.address,
      'Shipping City': shipping?.city || billing.city,
      'Shipping State': shipping?.state || billing.state,
      'Shipping Pincode': shipping?.pincode || billing.pincode,
      'Payment Method': payment,
      'Total Items': items.reduce((sum, i) => sum + i.quantity, 0),
      'Total Amount': items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2),
      'Status': payment === 'cod' ? 'Pending (COD)' : 'Paid',
    });
    writeSheet(ORDERS_FILE, wb, 'Billing', billingData);

    // ── Sheet 2: Order Items ──
    let orderItems = getSheetData(wb, 'OrderItems');
    items.forEach((item, idx) => {
      orderItems.push({
        'Order ID': orderId,
        'Order Date': orderDate,
        'Sr No': idx + 1,
        'Product ID': item.productId,
        'Product Name': item.name,
        'Category': item.category,
        'Subcategory': item.subcategory,
        'Quantity': item.quantity,
        'Unit Price': item.price.toFixed(2),
        'Line Total': (item.price * item.quantity).toFixed(2),
      });
    });
    writeSheet(ORDERS_FILE, wb, 'OrderItems', orderItems);

    // ── Send Order Confirmation Email ──
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const ship = shipping || billing;
    const paymentLabel = payment === 'cod' ? 'Cash on Delivery' : payment === 'upi' ? 'UPI Payment' : 'Credit / Debit Card';

    const itemRowsHtml = items.map((item, idx) => `
      <tr style="border-bottom: 1px solid rgba(107,76,138,0.1);">
        <td style="padding: 14px 12px; font-size: 13px; color: #1a0a2e;">${idx + 1}</td>
        <td style="padding: 14px 12px; font-size: 13px; color: #1a0a2e; font-weight: 600;">${item.name}</td>
        <td style="padding: 14px 12px; font-size: 13px; color: #6b4c8a;">${item.category}</td>
        <td style="padding: 14px 12px; font-size: 13px; color: #1a0a2e; text-align: center;">${item.quantity}</td>
        <td style="padding: 14px 12px; font-size: 13px; color: #1a0a2e; text-align: right;">Rs. ${item.price.toFixed(2)}</td>
        <td style="padding: 14px 12px; font-size: 13px; color: #c5a04e; font-weight: 700; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const confirmationHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Order Confirmation</title></head>
<body style="margin: 0; padding: 0; background-color: #f4f0f8; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f0f8; padding: 32px 0;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.08);">

        <!-- Header Banner -->
        <tr>
          <td style="background: linear-gradient(165deg, #0d0618 0%, #180036 30%, #37036f 60%, #1a0a2e 100%); padding: 40px 32px; text-align: center;">
            <h1 style="margin: 0 0 6px; font-size: 22px; color: #c5a04e; letter-spacing: 2px;">Pearl n Craft</h1>
            <p style="margin: 0; font-size: 12px; color: rgba(237,224,200,0.5); letter-spacing: 4px; text-transform: uppercase;">Order Confirmation</p>
          </td>
        </tr>

        <!-- Checkmark + Heading -->
        <tr>
          <td style="padding: 36px 32px 0; text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 50%; background: #4caf50; line-height: 64px; font-size: 32px; color: #ffffff;">✓</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #1a0a2e;">Thank You for Your Order!</h2>
            <p style="margin: 0; font-size: 14px; color: #6b4c8a;">Your order has been confirmed and is being prepared.</p>
          </td>
        </tr>

        <!-- Order Info Badge -->
        <tr>
          <td style="padding: 28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(165deg, #0d0618, #180036, #37036f, #1a0a2e); border-radius: 14px; overflow: hidden;">
              <tr>
                <td style="padding: 24px; text-align: center;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center; border-right: 1px solid rgba(237,224,200,0.1); padding: 0 12px;">
                        <p style="margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Order Number</p>
                        <p style="margin: 0; font-size: 22px; font-weight: 700; color: #c5a04e; letter-spacing: 3px;">#${orderId}</p>
                      </td>
                      <td style="text-align: center; border-right: 1px solid rgba(237,224,200,0.1); padding: 0 12px;">
                        <p style="margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Date &amp; Time</p>
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">${orderDate}</p>
                      </td>
                      <td style="text-align: center; padding: 0 12px;">
                        <p style="margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Total Items</p>
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">${totalItems} item${totalItems > 1 ? 's' : ''}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order Summary Table -->
        <tr>
          <td style="padding: 0 32px 24px;">
            <h3 style="margin: 0 0 16px; font-size: 16px; color: #1a0a2e; border-bottom: 2px solid rgba(197,160,78,0.3); padding-bottom: 10px;">
              <span style="color: #c5a04e;">◆</span> Order Summary
            </h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(107,76,138,0.06);">
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: left; font-weight: 600;">#</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: left; font-weight: 600;">Product</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: left; font-weight: 600;">Category</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: center; font-weight: 600;">Qty</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: right; font-weight: 600;">Price</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b4c8a; text-align: right; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>

            <!-- Totals -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-top: 2px solid rgba(107,76,138,0.1);">
              <tr>
                <td style="padding: 10px 12px; font-size: 13px; color: #6b4c8a;">Subtotal</td>
                <td style="padding: 10px 12px; font-size: 13px; color: #1a0a2e; text-align: right;">Rs. ${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; font-size: 13px; color: #6b4c8a;">Shipping</td>
                <td style="padding: 6px 12px; font-size: 13px; color: #4caf50; font-weight: 600; text-align: right;">FREE</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; font-size: 13px; color: #6b4c8a;">Tax</td>
                <td style="padding: 6px 12px; font-size: 13px; color: #1a0a2e; text-align: right;">Included</td>
              </tr>
              <tr style="background: linear-gradient(135deg, rgba(197,160,78,0.08), rgba(197,160,78,0.03));">
                <td style="padding: 14px 12px; font-size: 18px; font-weight: 700; color: #1a0a2e; border-radius: 8px 0 0 8px;">Grand Total</td>
                <td style="padding: 14px 12px; font-size: 18px; font-weight: 700; color: #c5a04e; text-align: right; border-radius: 0 8px 8px 0;">Rs. ${totalAmount}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Customer Info: Billing + Shipping -->
        <tr>
          <td style="padding: 0 32px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Billing Address -->
                <td style="width: 48%; vertical-align: top; padding: 20px; background: rgba(107,76,138,0.04); border-radius: 12px;">
                  <h4 style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #c5a04e;">Billing Address</h4>
                  <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1a0a2e;">${billing.name}</p>
                  <p style="margin: 0 0 2px; font-size: 13px; color: #6b4c8a;">${billing.address}</p>
                  <p style="margin: 0 0 2px; font-size: 13px; color: #6b4c8a;">${billing.city}, ${billing.state} - ${billing.pincode}</p>
                  <p style="margin: 8px 0 0; font-size: 13px; color: #6b4c8a;">📞 ${billing.phone}</p>
                  <p style="margin: 2px 0 0; font-size: 13px; color: #6b4c8a;">✉ ${billing.email}</p>
                </td>
                <td style="width: 4%;"></td>
                <!-- Shipping Address -->
                <td style="width: 48%; vertical-align: top; padding: 20px; background: rgba(107,76,138,0.04); border-radius: 12px;">
                  <h4 style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #c5a04e;">Shipping Address</h4>
                  <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1a0a2e;">${ship.name}</p>
                  <p style="margin: 0 0 2px; font-size: 13px; color: #6b4c8a;">${ship.address}</p>
                  <p style="margin: 0 0 2px; font-size: 13px; color: #6b4c8a;">${ship.city}, ${ship.state} - ${ship.pincode}</p>
                  <p style="margin: 8px 0 0; font-size: 13px; color: #6b4c8a;">📞 ${ship.phone || billing.phone}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Payment & Shipping Method -->
        <tr>
          <td style="padding: 0 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 48%; padding: 18px 20px; background: linear-gradient(165deg, #0d0618, #180036, #37036f, #1a0a2e); border-radius: 12px;">
                  <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Payment Method</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: #c5a04e;">${paymentLabel}</p>
                </td>
                <td style="width: 4%;"></td>
                <td style="width: 48%; padding: 18px 20px; background: linear-gradient(165deg, #0d0618, #180036, #37036f, #1a0a2e); border-radius: 12px;">
                  <p style="margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Shipping Method</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 700; color: #c5a04e;">Standard Delivery</p>
                  <p style="margin: 4px 0 0; font-size: 11px; color: #ffffff;">Estimated 5–7 business days</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: rgba(107,76,138,0.04); padding: 24px 32px; text-align: center; border-top: 1px solid rgba(107,76,138,0.08);">
            <p style="margin: 0 0 8px; font-size: 13px; color: #6b4c8a;">Need help? Contact us at <a href="mailto:thebloomorahouse.co@gmail.com" style="color: #c5a04e; text-decoration: none; font-weight: 600;">thebloomorahouse.co@gmail.com</a></p>
            <p style="margin: 0; font-size: 11px; color: rgba(107,76,138,0.5);">© ${new Date().getFullYear()} Pearl n Craft. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const plainText = `Order Confirmation - Pearl n Craft\n\nOrder #${orderId}\nDate: ${orderDate}\n\nItems:\n${items.map((it, i) => `${i + 1}. ${it.name} x${it.quantity} - Rs. ${(it.price * it.quantity).toFixed(2)}`).join('\n')}\n\nTotal: Rs. ${totalAmount}\nPayment: ${paymentLabel}\nShipping: Standard Delivery (5-7 business days)\n\nBilling: ${billing.name}, ${billing.address}, ${billing.city}, ${billing.state} - ${billing.pincode}\nShipping: ${ship.name}, ${ship.address}, ${ship.city}, ${ship.state} - ${ship.pincode}\n\nThank you for shopping with Pearl n Craft!`;

    // Send email (non-blocking — don't fail order if email fails)
    transporter.sendMail({
      from: '"Pearl n Craft" <thebloomorahouse.co@gmail.com>',
      replyTo: 'thebloomorahouse.co@gmail.com',
      to: billing.email,
      subject: `Order Confirmed #${orderId} — Pearl n Craft`,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Pearl n Craft Mailer',
        'Feedback-ID': 'order-confirm:pearlncraft',
      },
      text: plainText,
      html: confirmationHtml,
    }).then(() => {
      console.log(`Order confirmation email sent to ${billing.email}`);
    }).catch((emailErr) => {
      console.error('Failed to send order confirmation email:', emailErr);
    });

    res.json({ success: true, orderId, message: 'Order placed successfully!' });
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ error: 'Failed to save order. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/products
// ═══════════════════════════════════════════════════
app.get('/api/products', (req, res) => {
  const filePath = path.join(__dirname, 'products.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read products file' });
    }
    try {
      const products = JSON.parse(data);
      res.json(products);
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse products file' });
    }
  });
});

// ═══════════════════════════════════════════════════
// POST /api/contact
// ═══════════════════════════════════════════════════
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
  }

  const now = new Date().toLocaleString();

  const contactHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Contact Message</title></head>
<body style="margin: 0; padding: 0; background-color: #f4f0f8; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f0f8; padding: 32px 0;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.08);">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(165deg, #0d0618 0%, #180036 30%, #37036f 60%, #1a0a2e 100%); padding: 36px 32px; text-align: center;">
            <h1 style="margin: 0 0 6px; font-size: 22px; color: #c5a04e; letter-spacing: 2px;">Pearl n Craft</h1>
            <p style="margin: 0; font-size: 12px; color: #9b84b5; letter-spacing: 3px; text-transform: uppercase;">New Contact Message</p>
          </td>
        </tr>

        <!-- Icon + Title -->
        <tr>
          <td style="padding: 32px 32px 0; text-align: center;">
            <div style="width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg, rgba(197,160,78,0.12), rgba(197,160,78,0.04)); border: 2px solid rgba(197,160,78,0.3); line-height: 56px; font-size: 28px; color: #c5a04e;">✉</div>
            <h2 style="margin: 0 0 4px; font-size: 20px; color: #1a0a2e;">You have a new message!</h2>
            <p style="margin: 0; font-size: 13px; color: #6b4c8a;">Received on ${now}</p>
          </td>
        </tr>

        <!-- Sender Info -->
        <tr>
          <td style="padding: 28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(165deg, #0d0618, #180036, #37036f, #1a0a2e); border-radius: 14px;">
              <tr>
                <td style="padding: 22px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 0 8px; vertical-align: top;">
                        <p style="margin: 0 0 3px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">From</p>
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #c5a04e;">${name}</p>
                      </td>
                      <td style="padding: 0 8px; vertical-align: top;">
                        <p style="margin: 0 0 3px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Email</p>
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">${email}</p>
                      </td>
                      <td style="padding: 0 8px; vertical-align: top;">
                        <p style="margin: 0 0 3px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #9b84b5;">Phone</p>
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">${phone || 'Not provided'}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Subject -->
        <tr>
          <td style="padding: 0 32px 8px;">
            <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c5a04e; font-weight: 600;">Subject</p>
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1a0a2e;">${subject}</p>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding: 20px 32px 28px;">
            <p style="margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c5a04e; font-weight: 600;">Message</p>
            <div style="background: rgba(107,76,138,0.04); border: 1px solid rgba(107,76,138,0.08); border-radius: 12px; padding: 20px 18px;">
              <p style="margin: 0; font-size: 14px; color: #1a0a2e; line-height: 1.7; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; text-align: center; background: rgba(107,76,138,0.04); border-top: 1px solid rgba(107,76,138,0.08);">
            <p style="margin: 0 0 4px; font-size: 12px; color: #6b4c8a;">Reply directly to this email to respond to <strong>${name}</strong></p>
            <p style="margin: 0; font-size: 11px; color: rgba(107,76,138,0.5);">© ${new Date().getFullYear()} Pearl n Craft. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Pearl n Craft Contact" <thebloomorahouse.co@gmail.com>`,
      replyTo: email,
      to: 'thebloomorahouse.co@gmail.com',
      subject: `Contact: ${subject} — from ${name}`,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Pearl n Craft Mailer',
        'Feedback-ID': 'contact-form:pearlncraft',
      },
      text: `New Contact Message\n\nFrom: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nSubject: ${subject}\n\nMessage:\n${message}\n\nReceived: ${now}`,
      html: contactHtml,
    });

    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════
// GET /api/orders?email=...
// ═══════════════════════════════════════════════════
app.get('/api/orders', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return res.json({ orders: [] });
    }

    const wb = XLSX.readFile(ORDERS_FILE);
    const billingData = getSheetData(wb, 'Billing');
    const itemsData = getSheetData(wb, 'OrderItems');

    // Filter billing rows by email (case-insensitive)
    const userOrders = billingData.filter(
      (row) => String(row['Email']).toLowerCase() === email.toLowerCase()
    );

    const orders = userOrders.map((row) => {
      const orderId = String(row['Order ID']);
      const items = itemsData
        .filter((item) => String(item['Order ID']) === orderId)
        .map((item) => ({
          productId: item['Product ID'] || '',
          name: item['Product Name'] || '',
          category: item['Category'] || '',
          subcategory: item['Subcategory'] || '',
          quantity: Number(item['Quantity']) || 0,
          unitPrice: parseFloat(item['Unit Price']) || 0,
          lineTotal: parseFloat(item['Line Total']) || 0,
        }));

      return {
        orderId,
        orderDate: row['Order Date'] || '',
        totalItems: Number(row['Total Items']) || 0,
        totalAmount: parseFloat(row['Total Amount']) || 0,
        paymentMethod: row['Payment Method'] || '',
        status: row['Status'] || '',
        items,
      };
    });

    // Most recent orders first
    orders.reverse();

    res.json({ orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
