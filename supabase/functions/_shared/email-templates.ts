// Professional email templates for security notifications

export const emailStyles = `
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background: #f8fafc; 
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 40px 20px; 
    }
    .email-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
      color: white; 
      padding: 48px 40px; 
      text-align: center; 
    }
    .header-icon {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    .header h1 { 
      margin: 0; 
      font-size: 24px; 
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.8;
      font-size: 14px;
    }
    .content { 
      padding: 40px; 
    }
    .alert-box { 
      background: #fef2f2; 
      border-left: 4px solid #ef4444; 
      padding: 16px 20px; 
      margin: 24px 0; 
      border-radius: 0 12px 12px 0; 
    }
    .alert-box.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .alert-box.info {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }
    .alert-box.success {
      background: #f0fdf4;
      border-left-color: #22c55e;
    }
    .alert-title {
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .alert-text {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .info-card { 
      background: #f1f5f9; 
      padding: 24px; 
      border-radius: 12px; 
      margin: 24px 0; 
    }
    .info-card h3 {
      margin: 0 0 16px;
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-row { 
      display: flex; 
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-row:first-of-type {
      padding-top: 0;
    }
    .info-label { 
      font-weight: 500; 
      width: 140px;
      flex-shrink: 0;
      color: #64748b; 
      font-size: 14px;
    }
    .info-value { 
      color: #1e293b;
      font-size: 14px;
      word-break: break-all;
    }
    .cta-button { 
      display: inline-block; 
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
      color: white !important; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 10px; 
      font-weight: 600; 
      font-size: 15px;
      margin-top: 24px;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .cta-button.secondary {
      background: #f1f5f9;
      color: #1e293b !important;
    }
    .steps-list {
      margin: 24px 0;
      padding: 0;
      list-style: none;
    }
    .steps-list li {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .steps-list li:last-child {
      border-bottom: none;
    }
    .step-number {
      width: 32px;
      height: 32px;
      background: #0f172a;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }
    .step-content h4 {
      margin: 0 0 4px;
      font-size: 15px;
    }
    .step-content p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .footer { 
      text-align: center; 
      padding: 32px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { 
      margin: 0;
      color: #94a3b8; 
      font-size: 13px; 
      line-height: 1.8;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
    .logo {
      font-weight: 700;
      font-size: 18px;
      color: white;
      letter-spacing: -0.5px;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 20px 16px; }
      .header { padding: 32px 24px; }
      .content { padding: 24px; }
      .info-row { flex-direction: column; gap: 4px; }
      .info-label { width: auto; }
    }
  </style>
`;

export const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${emailStyles}
</head>
<body>
  <div class="container">
    <div class="email-card">
      ${content}
    </div>
  </div>
</body>
</html>
`;

export interface LockoutEmailData {
  email: string;
  ipAddress: string;
  attemptCount: number;
  userAgent?: string;
  timestamp: string;
  appUrl: string;
  location?: string;
}

export const generateLockoutEmail = (data: LockoutEmailData): string => {
  const browserInfo = data.userAgent 
    ? data.userAgent.substring(0, 60) + (data.userAgent.length > 60 ? '...' : '')
    : 'Unknown';

  return emailWrapper(`
    <div class="header">
      <div class="header-icon">🔒</div>
      <div class="logo">TailoredApply</div>
      <h1>Account Security Alert</h1>
      <p>Your account has been temporarily locked</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <div class="alert-title">⚠️ Multiple Failed Login Attempts</div>
        <p class="alert-text">We've detected ${data.attemptCount} failed login attempts and temporarily locked your account for protection.</p>
      </div>
      
      <p>Someone (hopefully you) attempted to sign in to your account multiple times with incorrect credentials. For your security, we've temporarily restricted access.</p>
      
      <div class="info-card">
        <h3>Attempt Details</h3>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${data.timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">IP Address</span>
          <span class="info-value">${data.ipAddress}</span>
        </div>
        ${data.location ? `
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${data.location}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Failed Attempts</span>
          <span class="info-value">${data.attemptCount}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Browser</span>
          <span class="info-value">${browserInfo}</span>
        </div>
      </div>
      
      <h3 style="margin-bottom: 16px;">What should you do?</h3>
      <ul class="steps-list">
        <li>
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>If this was you</h4>
            <p>Wait a few minutes and try again. Consider resetting your password if you've forgotten it.</p>
          </div>
        </li>
        <li>
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>If this wasn't you</h4>
            <p>Change your password immediately and enable two-factor authentication for added security.</p>
          </div>
        </li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/auth?mode=forgot-password" class="cta-button">
          Reset Your Password →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security notification from TailoredApply.</p>
      <p>If you didn't request this, please ignore this email or <a href="${data.appUrl}/support">contact support</a>.</p>
    </div>
  `);
};

export interface NewDeviceEmailData {
  email: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  timestamp: string;
  appUrl: string;
  deviceType: string;
}

export const generateNewDeviceEmail = (data: NewDeviceEmailData): string => {
  const browserInfo = data.userAgent 
    ? data.userAgent.substring(0, 80) + (data.userAgent.length > 80 ? '...' : '')
    : 'Unknown browser';

  return emailWrapper(`
    <div class="header">
      <div class="header-icon">📱</div>
      <div class="logo">TailoredApply</div>
      <h1>New Device Sign-In</h1>
      <p>A new device was used to access your account</p>
    </div>
    <div class="content">
      <div class="alert-box info">
        <div class="alert-title">🔔 New Sign-In Detected</div>
        <p class="alert-text">Your account was accessed from a new device or location.</p>
      </div>
      
      <p>We noticed a sign-in to your TailoredApply account from a device we haven't seen before. If this was you, you can safely ignore this email.</p>
      
      <div class="info-card">
        <h3>Sign-In Details</h3>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${data.timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Device</span>
          <span class="info-value">${data.deviceType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">IP Address</span>
          <span class="info-value">${data.ipAddress}</span>
        </div>
        ${data.location ? `
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${data.location}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Browser</span>
          <span class="info-value">${browserInfo}</span>
        </div>
      </div>
      
      <div class="alert-box warning">
        <div class="alert-title">🛡️ Wasn't you?</div>
        <p class="alert-text">If you don't recognize this activity, secure your account immediately by changing your password and enabling 2FA.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/settings?tab=security" class="cta-button">
          Review Account Security →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security notification from TailoredApply.</p>
      <p>You're receiving this because you have security notifications enabled.</p>
    </div>
  `);
};

export interface SessionRevokedEmailData {
  email: string;
  revokedBy: string;
  sessionInfo: string;
  timestamp: string;
  appUrl: string;
}

export const generateSessionRevokedEmail = (data: SessionRevokedEmailData): string => {
  return emailWrapper(`
    <div class="header">
      <div class="header-icon">🚫</div>
      <div class="logo">TailoredApply</div>
      <h1>Session Terminated</h1>
      <p>A session on your account was remotely ended</p>
    </div>
    <div class="content">
      <div class="alert-box warning">
        <div class="alert-title">⚡ Session Revoked</div>
        <p class="alert-text">An active session on your account has been terminated.</p>
      </div>
      
      <p>For your security, we're notifying you that one of your active sessions was revoked. This could be because you signed out from another device, or an administrator ended the session.</p>
      
      <div class="info-card">
        <h3>Session Details</h3>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${data.timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Revoked By</span>
          <span class="info-value">${data.revokedBy}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Session</span>
          <span class="info-value">${data.sessionInfo}</span>
        </div>
      </div>
      
      <p>If you didn't request this, we recommend reviewing your account security and changing your password.</p>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/auth" class="cta-button">
          Sign In Again →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security notification from TailoredApply.</p>
      <p>If you have questions, <a href="${data.appUrl}/support">contact our support team</a>.</p>
    </div>
  `);
};

export interface PasswordChangedEmailData {
  email: string;
  timestamp: string;
  ipAddress: string;
  appUrl: string;
}

export const generatePasswordChangedEmail = (data: PasswordChangedEmailData): string => {
  return emailWrapper(`
    <div class="header">
      <div class="header-icon">🔑</div>
      <div class="logo">TailoredApply</div>
      <h1>Password Changed</h1>
      <p>Your account password was successfully updated</p>
    </div>
    <div class="content">
      <div class="alert-box success">
        <div class="alert-title">✓ Password Updated</div>
        <p class="alert-text">Your password was changed successfully.</p>
      </div>
      
      <p>This email confirms that the password for your TailoredApply account was recently changed. If you made this change, no further action is needed.</p>
      
      <div class="info-card">
        <h3>Change Details</h3>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${data.timestamp}</span>
        </div>
        <div class="info-row">
          <span class="info-label">IP Address</span>
          <span class="info-value">${data.ipAddress}</span>
        </div>
      </div>
      
      <div class="alert-box">
        <div class="alert-title">🚨 Didn't change your password?</div>
        <p class="alert-text">If you didn't make this change, your account may be compromised. Reset your password immediately.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/auth?mode=forgot-password" class="cta-button">
        Reset Password Now →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security notification from TailoredApply.</p>
      <p>If you have questions, <a href="${data.appUrl}/support">contact our support team</a>.</p>
    </div>
  `);
};

export interface AdminSecurityAlertData {
  alertType: 'failed_admin_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'prompt_injection_detected' | 'unusual_access_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ipAddress?: string;
  userEmail?: string;
  location?: string;
  timestamp: string;
  appUrl: string;
  actionRequired?: string;
  eventCount?: number;
}

export const generateAdminSecurityAlertEmail = (data: AdminSecurityAlertData): string => {
  const severityColors: Record<string, { bg: string; text: string; icon: string }> = {
    low: { bg: '#eff6ff', text: '#1e40af', icon: 'ℹ️' },
    medium: { bg: '#fffbeb', text: '#92400e', icon: '⚠️' },
    high: { bg: '#fef2f2', text: '#dc2626', icon: '🚨' },
    critical: { bg: '#fdf2f8', text: '#be185d', icon: '🔴' },
  };

  const alertTypeLabels: Record<string, string> = {
    failed_admin_login: 'Failed Admin Login Attempt',
    suspicious_activity: 'Suspicious Activity Detected',
    rate_limit_exceeded: 'Rate Limit Exceeded',
    prompt_injection_detected: 'Prompt Injection Attempt',
    unusual_access_pattern: 'Unusual Access Pattern',
  };

  const colors = severityColors[data.severity] || severityColors.medium;
  const alertLabel = alertTypeLabels[data.alertType] || 'Security Alert';

  const ipAddressRow = data.ipAddress ? `
        <div class="info-row">
          <span class="info-label">IP Address</span>
          <span class="info-value">${data.ipAddress}</span>
        </div>
        ` : '';
  
  const locationRow = data.location ? `
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${data.location}</span>
        </div>
        ` : '';
  
  const userEmailRow = data.userEmail ? `
        <div class="info-row">
          <span class="info-label">User</span>
          <span class="info-value">${data.userEmail}</span>
        </div>
        ` : '';
  
  const eventCountRow = data.eventCount ? `
        <div class="info-row">
          <span class="info-label">Event Count</span>
          <span class="info-value">${data.eventCount} occurrences</span>
        </div>
        ` : '';
  
  const actionRequiredBox = data.actionRequired ? `
      <div class="alert-box warning">
        <div class="alert-title">📋 Action Required</div>
        <p class="alert-text">${data.actionRequired}</p>
      </div>
      ` : '';

  return emailWrapper(`
    <div class="header" style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);">
      <div class="header-icon">${colors.icon}</div>
      <div class="logo">TailoredApply Admin</div>
      <h1>Security Alert</h1>
      <p>${data.severity.toUpperCase()} Priority</p>
    </div>
    <div class="content">
      <div class="alert-box" style="background: ${colors.bg}; border-left-color: ${colors.text};">
        <div class="alert-title" style="color: ${colors.text};">
          ${colors.icon} ${alertLabel}
        </div>
        <p class="alert-text">${data.details}</p>
      </div>
      
      <div class="info-card">
        <h3>Event Details</h3>
        <div class="info-row">
          <span class="info-label">Alert Type</span>
          <span class="info-value">${alertLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Severity</span>
          <span class="info-value" style="color: ${colors.text}; font-weight: 600; text-transform: uppercase;">${data.severity}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time</span>
          <span class="info-value">${data.timestamp}</span>
        </div>
        ${ipAddressRow}
        ${locationRow}
        ${userEmailRow}
        ${eventCountRow}
      </div>
      
      ${actionRequiredBox}
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/admin?tab=security" class="cta-button">
          View Security Dashboard →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated admin security alert from TailoredApply.</p>
      <p>You're receiving this because you're an admin with security notifications enabled.</p>
    </div>
  `);
};

export interface PromptInjectionAlertData {
  attemptCount: number;
  recentAttempts: Array<{
    input: string;
    threatType: string;
    timestamp: string;
  }>;
  timestamp: string;
  appUrl: string;
}

export const generatePromptInjectionAlertEmail = (data: PromptInjectionAlertData): string => {
  const attemptsList = data.recentAttempts.slice(0, 5).map((attempt) => `
    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">${attempt.timestamp} - ${attempt.threatType}</div>
      <div style="font-size: 13px; color: #334155; font-family: monospace; word-break: break-all;">${attempt.input.substring(0, 100)}${attempt.input.length > 100 ? '...' : ''}</div>
    </div>
  `).join('');

  return emailWrapper(`
    <div class="header" style="background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%);">
      <div class="header-icon">🛡️</div>
      <div class="logo">TailoredApply Security</div>
      <h1>Prompt Injection Detected</h1>
      <p>${data.attemptCount} attempts blocked</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <div class="alert-title">⚠️ Security Event</div>
        <p class="alert-text">Our AI security system detected and blocked ${data.attemptCount} prompt injection attempt(s) in the last 24 hours.</p>
      </div>
      
      <h3 style="margin-bottom: 12px;">Recent Blocked Attempts</h3>
      ${attemptsList}
      
      <div class="alert-box info">
        <div class="alert-title">✓ Protection Active</div>
        <p class="alert-text">All malicious prompts were automatically sanitized and blocked before reaching the AI system.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.appUrl}/admin?tab=security" class="cta-button">
          Review Security Logs →
        </a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security alert from TailoredApply.</p>
      <p>Generated at ${data.timestamp}</p>
    </div>
  `);
};
