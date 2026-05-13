import nodemailer from 'nodemailer';
import { env } from './env';

// ─── Transporter ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true cho port 465 (SSL), false cho 587 (TLS)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── Generic send helper ──────────────────────────────────────
export const sendMail = async (options: {
  to: string;
  subject: string;
  html: string;
}) => {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};

// ─── Template: OTP đăng ký ───────────────────────────────────
export const sendOtpEmail = async (to: string, otp: string, expiresMinutes = 10) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">📚 Xác thực tài khoản Thư viện</h2>
      <p style="color: #4b5563;">Mã OTP của bạn là:</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.</p>
    </div>
  `;

  await sendMail({
    to,
    subject: `[Thư viện] Mã xác thực OTP: ${otp}`,
    html,
  });
};

// ─── Template: Reset mật khẩu ────────────────────────────────
export const sendResetPasswordEmail = async (to: string, resetLink: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">🔐 Đặt lại mật khẩu Thư viện</h2>
      <p style="color: #4b5563;">Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}"
           style="background: #1a1a2e; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Đặt lại mật khẩu
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Liên kết có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Hoặc copy link: <a href="${resetLink}" style="color: #6b7280;">${resetLink}</a></p>
    </div>
  `;

  await sendMail({
    to,
    subject: '[Thư viện] Yêu cầu đặt lại mật khẩu',
    html,
  });
};
