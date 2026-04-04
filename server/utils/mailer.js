const nodemailer = require('nodemailer');

// Ethereal is a fake SMTP service designed for testing.
// In a real environment, you would use Sendgrid, AWS SES, or Gmail.
let transport;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return;
    }
    transport = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
});

const sendAlertEmail = async (toEmail, subject, message) => {
    if (!transport) {
      console.warn("Mail transport not initialized yet");
      return;
    }
    try {
        const info = await transport.sendMail({
            from: '"Digital Twin Alert System" <alerts@digitaltwin.edu>',
            to: toEmail,
            subject: subject,
            text: message,
            html: `<b>${message}</b>`
        });
        console.log("Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Failed to send email:", error);
    }
};

module.exports = { sendAlertEmail };
