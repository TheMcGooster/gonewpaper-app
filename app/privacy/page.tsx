import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Go New Paper',
  description: 'Privacy Policy for Go New Paper, your local community hub for Chariton, Iowa.',
}

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Barlow, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', textDecoration: 'none', fontSize: '14px', marginBottom: '16px' }}>
            ← Back to Go New Paper
          </Link>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', fontFamily: 'Archivo Black, sans-serif', margin: '16px 0 8px' }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Last updated: February 8, 2025</p>
        </div>

        {/* Content */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', lineHeight: '1.7', color: '#334155' }}>
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>1. Introduction</h2>
            <p>Go New Paper ("we", "our", or "us") operates the Go New Paper web application at <strong>www.gonewpaper.com</strong>. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service.</p>
            <p style={{ marginTop: '8px' }}>Go New Paper is a free, hyperlocal community hub serving Chariton, Iowa and surrounding Lucas County communities.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>2. Information We Collect</h2>
            <p><strong>Account Information:</strong> When you sign up, we collect your email address and display name. If you sign in with Google, we receive your name, email, and profile picture from Google.</p>
            <p style={{ marginTop: '8px' }}><strong>Usage Data:</strong> We may collect information about how you interact with the app, such as which tabs you view and events you mark as interested.</p>
            <p style={{ marginTop: '8px' }}><strong>Push Notification Data:</strong> If you enable notifications, we store a device identifier (OneSignal Player ID) to send you push notifications. You can disable notifications at any time through your browser settings.</p>
            <p style={{ marginTop: '8px' }}><strong>We do NOT collect:</strong> Payment information, precise location data, contacts, or any information from minors under 13.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>3. How We Use Your Information</h2>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>To provide and maintain the Go New Paper service</li>
              <li style={{ marginBottom: '6px' }}>To send push notifications about local events, daily summaries, and event reminders (if you opt in)</li>
              <li style={{ marginBottom: '6px' }}>To personalize your experience (e.g., showing events you are interested in)</li>
              <li style={{ marginBottom: '6px' }}>To improve and develop our service</li>
              <li style={{ marginBottom: '6px' }}>To communicate with you about your account</li>
            </ul>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>4. Data Storage and Security</h2>
            <p>Your data is stored securely using <strong>Supabase</strong> (database) and <strong>Vercel</strong> (hosting), both of which use industry-standard encryption and security practices. Push notification delivery is handled by <strong>OneSignal</strong>.</p>
            <p style={{ marginTop: '8px' }}>We implement reasonable security measures to protect your personal information. However, no method of electronic storage is 100% secure.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}><strong>Supabase</strong> - Database and authentication</li>
              <li style={{ marginBottom: '6px' }}><strong>Google OAuth</strong> - Sign-in with Google</li>
              <li style={{ marginBottom: '6px' }}><strong>OneSignal</strong> - Push notifications</li>
              <li style={{ marginBottom: '6px' }}><strong>Vercel</strong> - Hosting and deployment</li>
            </ul>
            <p style={{ marginTop: '8px' }}>Each of these services has their own privacy policies. We encourage you to review them.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>6. Data Sharing</h2>
            <p>We do <strong>NOT</strong> sell, trade, or rent your personal information to third parties. We may share data only in these limited circumstances:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>With service providers who help us operate the app (listed above)</li>
              <li style={{ marginBottom: '6px' }}>If required by law or legal process</li>
              <li style={{ marginBottom: '6px' }}>To protect the rights and safety of our users</li>
            </ul>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>Access your personal data</li>
              <li style={{ marginBottom: '6px' }}>Request deletion of your account and data</li>
              <li style={{ marginBottom: '6px' }}>Opt out of push notifications at any time</li>
              <li style={{ marginBottom: '6px' }}>Update your account information</li>
            </ul>
            <p style={{ marginTop: '8px' }}>To exercise any of these rights, contact us at the email below.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>8. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>9. Children's Privacy</h2>
            <p>Go New Paper is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the app or via email. Your continued use of Go New Paper after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <p style={{ marginTop: '8px' }}><strong>Email:</strong> <a href="mailto:jarrettcmcgee@gmail.com" style={{ color: '#2563eb' }}>jarrettcmcgee@gmail.com</a></p>
            <p><strong>Website:</strong> <a href="https://www.gonewpaper.com" style={{ color: '#2563eb' }}>www.gonewpaper.com</a></p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
          <Link href="/terms" style={{ color: '#64748b', textDecoration: 'underline', marginRight: '16px' }}>Terms of Service</Link>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>Back to App</Link>
        </div>
      </div>
    </div>
  )
}
