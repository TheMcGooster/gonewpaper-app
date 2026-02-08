import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - Go New Paper',
  description: 'Terms of Service for Go New Paper, your local community hub for Chariton, Iowa.',
}

export default function TermsOfService() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Barlow, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', textDecoration: 'none', fontSize: '14px', marginBottom: '16px' }}>
            ← Back to Go New Paper
          </Link>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', fontFamily: 'Archivo Black, sans-serif', margin: '16px 0 8px' }}>Terms of Service</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Last updated: February 8, 2025</p>
        </div>

        {/* Content */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', lineHeight: '1.7', color: '#334155' }}>
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
            <p>By accessing and using Go New Paper ("the Service") at <strong>www.gonewpaper.com</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>2. Description of Service</h2>
            <p>Go New Paper is a free, hyperlocal community web application providing residents of Chariton, Iowa and Lucas County with local events, job listings, housing, business directories, non-profit information, community groups, and more.</p>
            <p style={{ marginTop: '8px' }}>The Service is provided "as is" and we make no guarantees about the accuracy, completeness, or timeliness of the information displayed.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>3. User Accounts</h2>
            <p>You may create an account using email/password or Google Sign-In. You are responsible for:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>Maintaining the confidentiality of your account</li>
              <li style={{ marginBottom: '6px' }}>All activities that occur under your account</li>
              <li style={{ marginBottom: '6px' }}>Providing accurate information</li>
            </ul>
            <p style={{ marginTop: '8px' }}>We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>4. Acceptable Use</h2>
            <p>When using Go New Paper, you agree NOT to:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>Use the Service for any unlawful purpose</li>
              <li style={{ marginBottom: '6px' }}>Submit false, misleading, or harmful content</li>
              <li style={{ marginBottom: '6px' }}>Attempt to access other users' accounts or data</li>
              <li style={{ marginBottom: '6px' }}>Interfere with or disrupt the Service</li>
              <li style={{ marginBottom: '6px' }}>Scrape, copy, or redistribute content without permission</li>
              <li style={{ marginBottom: '6px' }}>Use automated tools to access the Service (except authorized integrations)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>5. Content and Listings</h2>
            <p><strong>Event, Job, and Housing Listings:</strong> Information displayed in the app is gathered from public sources, community partners, and user submissions. While we strive for accuracy, we cannot guarantee that all listings are current or correct.</p>
            <p style={{ marginTop: '8px' }}><strong>Business Listings:</strong> Businesses featured in the app are either community partners or paid sponsors. Paid listings are marked accordingly.</p>
            <p style={{ marginTop: '8px' }}><strong>Non-Profit and Club Listings:</strong> Organizations listed are community-provided. Go New Paper does not endorse any specific organization.</p>
            <p style={{ marginTop: '8px' }}><strong>External Links:</strong> The Service may contain links to external websites (donation pages, business websites, etc.). We are not responsible for the content or practices of external sites.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>6. Push Notifications</h2>
            <p>By enabling push notifications, you consent to receive:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>Daily morning summaries of local events</li>
              <li style={{ marginBottom: '6px' }}>Reminders for events you have expressed interest in</li>
              <li style={{ marginBottom: '6px' }}>Important community announcements</li>
            </ul>
            <p style={{ marginTop: '8px' }}>You can disable notifications at any time through your browser or device settings.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>7. Intellectual Property</h2>
            <p>The Go New Paper name, logo, and app design are the property of Go New Paper. Community-submitted content remains the property of the original creators. You may not reproduce, distribute, or create derivative works from the Service without written permission.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>8. Disclaimer of Warranties</h2>
            <p>Go New Paper is provided "AS IS" without warranties of any kind. We do not warrant that:</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li style={{ marginBottom: '6px' }}>The Service will be uninterrupted or error-free</li>
              <li style={{ marginBottom: '6px' }}>All information is accurate or complete</li>
              <li style={{ marginBottom: '6px' }}>The Service will meet your specific requirements</li>
            </ul>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Go New Paper shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to reliance on information provided through the app.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>10. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Service at any time. Continued use of the Service after changes constitutes acceptance of the updated terms. Significant changes will be communicated through the app.</p>
          </section>

          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>11. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Iowa. Any disputes shall be resolved in the courts of Lucas County, Iowa.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>12. Contact Us</h2>
            <p>If you have questions about these Terms of Service, please contact us:</p>
            <p style={{ marginTop: '8px' }}><strong>Email:</strong> <a href="mailto:jarrettcmcgee@gmail.com" style={{ color: '#2563eb' }}>jarrettcmcgee@gmail.com</a></p>
            <p><strong>Website:</strong> <a href="https://www.gonewpaper.com" style={{ color: '#2563eb' }}>www.gonewpaper.com</a></p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px' }}>
          <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'underline', marginRight: '16px' }}>Privacy Policy</Link>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>Back to App</Link>
        </div>
      </div>
    </div>
  )
}
