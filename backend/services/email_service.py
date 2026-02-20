"""
Email Service using Mailjet for RallyDesk
Handles sending verification emails and other transactional emails
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Mailjet credentials from environment
MJ_APIKEY_PUBLIC = os.environ.get('MJ_APIKEY_PUBLIC', '')
MJ_APIKEY_PRIVATE = os.environ.get('MJ_APIKEY_PRIVATE', '')
MJ_FROM_EMAIL = os.environ.get('MJ_FROM_EMAIL', 'noreply@rallydesk.app')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'Rally Desk')


def is_email_configured() -> bool:
    """Check if email service is properly configured"""
    return bool(MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE)


def send_verification_email(
    recipient_email: str,
    verification_code: str,
    recipient_name: Optional[str] = None
) -> bool:
    """
    Send verification email with 6-digit code using Mailjet.
    
    Args:
        recipient_email: Email address to send verification to
        verification_code: 6-digit verification code
        recipient_name: Optional recipient name for personalization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not is_email_configured():
        logger.warning("Mailjet not configured. Skipping email send.")
        return False
    
    try:
        from mailjet_rest import Client
        
        mailjet = Client(auth=(MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE), version='v3.1')
        
        greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">RALLYDESK</h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Multi-Sport Tournament Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
                            <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                                {greeting}
                            </p>
                            <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                                Thank you for signing up for RallyDesk! Use the verification code below to complete your registration:
                            </p>
                            
                            <!-- Verification Code Box -->
                            <div style="background-color: #f4f4f5; border: 2px dashed #d4d4d8; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                                <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                <p style="margin: 0; color: #18181b; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{verification_code}</p>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                                This code expires in 24 hours. If you didn't create an account with RallyDesk, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
                            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                                &copy; 2025 RallyDesk. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_content = f"""
RALLYDESK - Verify Your Email

{greeting}

Thank you for signing up for RallyDesk! Use the verification code below to complete your registration:

Your Verification Code: {verification_code}

This code expires in 24 hours. If you didn't create an account with RallyDesk, you can safely ignore this email.

---
(c) 2025 RallyDesk. All rights reserved.
"""

        data = {
            'Messages': [
                {
                    "From": {
                        "Email": MJ_FROM_EMAIL,
                        "Name": EMAIL_FROM_NAME
                    },
                    "To": [
                        {
                            "Email": recipient_email,
                            "Name": recipient_name or recipient_email
                        }
                    ],
                    "Subject": "Verify your RallyDesk account",
                    "TextPart": text_content,
                    "HTMLPart": html_content,
                }
            ]
        }
        
        result = mailjet.send.create(data=data)
        
        if result.status_code == 200:
            logger.info(f"Verification email sent successfully to {recipient_email}")
            return True
        else:
            logger.error(f"Failed to send verification email. Status: {result.status_code}, Response: {result.json()}")
            return False
            
    except Exception as e:
        logger.error(f"Exception while sending verification email to {recipient_email}: {str(e)}")
        return False


def send_generic_email(
    recipient_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    recipient_name: Optional[str] = None
) -> bool:
    """
    Send a generic email using Mailjet.
    
    Args:
        recipient_email: Email address to send to
        subject: Email subject
        html_content: HTML content of the email
        text_content: Plain text fallback (optional)
        recipient_name: Optional recipient name
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not is_email_configured():
        logger.warning("Mailjet not configured. Skipping email send.")
        return False
    
    try:
        from mailjet_rest import Client
        
        mailjet = Client(auth=(MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE), version='v3.1')
        
        data = {
            'Messages': [
                {
                    "From": {
                        "Email": MJ_FROM_EMAIL,
                        "Name": EMAIL_FROM_NAME
                    },
                    "To": [
                        {
                            "Email": recipient_email,
                            "Name": recipient_name or recipient_email
                        }
                    ],
                    "Subject": subject,
                    "TextPart": text_content or html_content,
                    "HTMLPart": html_content,
                }
            ]
        }
        
        result = mailjet.send.create(data=data)
        
        return result.status_code == 200
        
    except Exception as e:
        logger.error(f"Exception while sending email to {recipient_email}: {str(e)}")
        return False
