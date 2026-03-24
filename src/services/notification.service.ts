import pool from '../config/database';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
}

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Notification Service - Handles in-app and email notifications
 */
export const NotificationService = {
  /**
   * Create an in-app notification for a user
   */
  async createInAppNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ): Promise<NotificationRecord> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const { rows } = await pool.query<NotificationRecord>(query, [
      userId,
      type,
      title,
      message,
      JSON.stringify(data),
    ]);

    return rows[0];
  },

  /**
   * Send email notification (placeholder - integrate with email provider)
   * In production, integrate with SendGrid, AWS SES, or similar
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    // TODO: Integrate with actual email service (SendGrid, SES, etc.)
    console.log('📧 Sending email:', {
      to: notification.to,
      subject: notification.subject,
      preview: notification.body.substring(0, 100),
    });

    // Placeholder implementation - log the email
    // In production, replace with actual email API call
    try {
      // Example with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: notification.to,
      //   from: process.env.FROM_EMAIL,
      //   subject: notification.subject,
      //   text: notification.body,
      //   html: notification.html || notification.body.replace(/\n/g, '<br>'),
      // });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  },

  /**
   * Send meeting URL notification to both mentor and mentee
   */
  async sendMeetingUrlNotification(
    mentorId: string,
    menteeId: string,
    mentorEmail: string,
    menteeEmail: string,
    mentorName: string,
    menteeName: string,
    meetingUrl: string,
    scheduledAt: Date,
    durationMinutes: number,
    expiresAt: Date
  ): Promise<void> {
    const sessionTime = scheduledAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const expiryTime = expiresAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Email content
    const emailSubject = 'Your MentorMinds Session Meeting Link';
    const emailBody = `
Hello {NAME},

Your mentorship session has been confirmed! Here are your meeting details:

📅 Date & Time: ${sessionTime}
⏱️ Duration: ${durationMinutes} minutes
🔗 Meeting Link: ${meetingUrl}

⚠️ Important: This meeting room will expire at ${expiryTime} (30 minutes after your session ends).

Please join the meeting a few minutes early to ensure everything is working properly.

Best regards,
The MentorMinds Team
    `.trim();

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4A90E2;">Your MentorMinds Session is Confirmed!</h2>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Meeting Details</h3>
    <p><strong>📅 Date & Time:</strong> ${sessionTime}</p>
    <p><strong>⏱️ Duration:</strong> ${durationMinutes} minutes</p>
    <p><strong>🔗 Join Meeting:</strong> <a href="${meetingUrl}" style="color: #4A90E2;">${meetingUrl}</a></p>
  </div>

  <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
    <p style="margin: 0;"><strong>⚠️ Important:</strong> This meeting room will expire at <strong>${expiryTime}</strong> (30 minutes after your session ends).</p>
  </div>

  <p style="margin-top: 20px;">Please join the meeting a few minutes early to ensure everything is working properly.</p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  <p style="color: #666; font-size: 14px;">Best regards,<br>The MentorMinds Team</p>
</div>
    `.trim();

    // Send emails to both participants
    await Promise.all([
      this.sendEmail({
        to: mentorEmail,
        subject: emailSubject,
        body: emailBody.replace('{NAME}', mentorName),
        html: htmlBody,
      }),
      this.sendEmail({
        to: menteeEmail,
        subject: emailSubject,
        body: emailBody.replace('{NAME}', menteeName),
        html: htmlBody,
      }),
    ]);

    // Create in-app notifications
    await Promise.all([
      this.createInAppNotification(
        mentorId,
        'meeting_confirmed',
        'Session Meeting Link Available',
        `Your meeting with ${menteeName} has been scheduled. Join link: ${meetingUrl}`,
        { meetingUrl, scheduledAt, expiresAt }
      ),
      this.createInAppNotification(
        menteeId,
        'meeting_confirmed',
        'Session Meeting Link Available',
        `Your meeting with ${mentorName} has been scheduled. Join link: ${meetingUrl}`,
        { meetingUrl, scheduledAt, expiresAt }
      ),
    ]);
  },

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<NotificationRecord[]> {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const { rows } = await pool.query<NotificationRecord>(query, [userId]);
    return rows;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      RETURNING id
    `;
    
    const { rowCount } = await pool.query(query, [notificationId]);
    return (rowCount ?? 0) > 0;
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      RETURNING id
    `;
    
    const { rowCount } = await pool.query(query, [userId]);
    return rowCount ?? 0;
  },
};

export default NotificationService;
