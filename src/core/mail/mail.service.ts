import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })
  }

  async sendMail(options: nodemailer.SendMailOptions) {
    try {
      return await this.transporter.sendMail({
        from: '"Memories Platform" <no-reply@memories.com>',
        ...options,
      })
    } catch {
      // console.error('Failed to send email via SMTP. Falling back to Console log:')
      // console.log(
      //   `[MAIL MOCK] To: ${options.to} | Subject: ${options.subject} | Text/HTML Content: ${options.text || options.html}`,
      // )
    }
  }

  async sendVerificationOtp(email: string, otp: string) {
    return this.sendMail({
      to: email,
      subject: 'Verify Your Email Address',
      text: `Welcome to Memories!\n\nPlease verify your email address by using the 6-digit verification code below:\n\n${otp}\n\nThis code will expire in 15 minutes.\n\nBest regards,\nThe Memories Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333;">Welcome to Memories!</h2>
          <p>Please verify your email address by using the 6-digit verification code below:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px; color: #4F46E5;">
            ${otp}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>Best regards,<br>The Memories Team</p>
        </div>
      `,
    })
  }

  async sendPasswordResetOtp(email: string, otp: string) {
    return this.sendMail({
      to: email,
      subject: 'Reset Your Password OTP',
      text: `Password Reset Request\n\nYou requested a password reset. Use the 6-digit OTP code below to set a new password:\n\n${otp}\n\nThis OTP is valid for 15 minutes. If you did not request this, you can safely ignore this email.\n\nBest regards,\nThe Memories Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Use the 6-digit OTP code below to set a new password:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px; color: #EF4444;">
            ${otp}
          </div>
          <p>This OTP is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
          <p>Best regards,<br>The Memories Team</p>
        </div>
      `,
    })
  }
}
