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

  async sendSpaceInvite(
    email: string,
    spaceName: string,
    token: string,
    inviterName: string,
    message?: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL
    const inviteUrl = `${frontendUrl}/spaces/invite/accept?token=${token}`

    const messageHtml = message
      ? `<div style="background-color: #f9f9f9; border-left: 4px solid #4F46E5; padding: 12px; margin: 15px 0; font-style: italic; color: #555;">
          "${message}"
         </div>`
      : ''

    return this.sendMail({
      to: email,
      subject: `Invitation to join "${spaceName}" on Memories`,
      text: `Hello!\n\n${inviterName} has invited you to join the space "${spaceName}" on Memories.\n\n${message ? `Personal Message:\n"${message}"\n\n` : ''}To accept the invitation, please open the link below:\n\n${inviteUrl}\n\nBest regards,\nThe Memories Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333;">Invitation to join "${spaceName}"</h2>
          <p><strong>${inviterName}</strong> has invited you to join their space on Memories platform.</p>
          ${messageHtml}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 13px;">If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="color: #4F46E5; font-size: 13px; word-break: break-all;">${inviteUrl}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p>Best regards,<br>The Memories Team</p>
        </div>
      `,
    })
  }
}
