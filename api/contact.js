const nodemailer = require('nodemailer');

function clean(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async (req, res) => {
    res.setHeader('Allow', ['POST']);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const name = clean(req.body?.name, 80);
    const email = clean(req.body?.email, 120);
    const location = clean(req.body?.location, 180);
    const message = clean(req.body?.message, 1200);

    if (!name || !email || !location || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please provide a valid email.' });
    }

    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS,
        ALERT_TO_EMAIL,
        ALERT_FROM_EMAIL
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !ALERT_TO_EMAIL || !ALERT_FROM_EMAIL) {
        return res.status(500).json({ error: 'Mail service is not configured.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: ALERT_FROM_EMAIL,
            to: ALERT_TO_EMAIL,
            replyTo: email,
            subject: `Street Dog Alert: ${location}`,
            text: [
                'A new street dog alert was submitted from the website.',
                '',
                `Name: ${name}`,
                `Email: ${email}`,
                `Location: ${location}`,
                '',
                'Message:',
                message
            ].join('\n'),
            html: `
                <h2>Street Dog Alert</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Email send failed:', error);
        return res.status(500).json({ error: 'Could not send alert email. Please try again.' });
    }
};
