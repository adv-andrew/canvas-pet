interface Props {
  onClose: () => void
}

export function PrivacyPolicy({ onClose }: Readonly<Props>) {
  return (
    <div
      className="pp-overlay"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pp-header">
          <h2>Privacy Policy</h2>
          <button className="pp-close" onClick={onClose} title="Close">×</button>
        </div>

        <div className="pp-body">
          <p className="pp-effective">Effective: April 2026</p>

          <p>
            Canvas Pet is a student productivity tool that connects to your institution's Canvas
            LMS. We are committed to collecting only the minimum data necessary for the app to
            function, consistent with FERPA and applicable privacy laws.
          </p>

          <h3>Data We Collect</h3>
          <ul>
            <li><strong>Account information</strong> — your email address and display name, provided when you sign up.</li>
            <li><strong>Canvas identifiers</strong> — your Canvas user ID and institution URL, used to link your Canvas account to Canvas Pet.</li>
            <li><strong>Assignment metadata</strong> — assignment IDs, course IDs, assignment titles, and due dates synced from Canvas with your explicit consent.</li>
            <li><strong>Completion records</strong> — timestamps for assignments you mark complete within Canvas Pet.</li>
            <li><strong>App progress</strong> — reward points and pet happiness score (internal gamification data, not sourced from Canvas grades).</li>
          </ul>

          <h3>Data We Do Not Collect</h3>
          <ul>
            <li>Your actual Canvas grades or scored results.</li>
            <li>The content of any submission you make on Canvas.</li>
            <li>Submission status details such as late, missing, or needs grading flags.</li>
            <li>Any data about other students.</li>
            <li>Browsing history outside of Canvas Pet.</li>
          </ul>

          <h3>How Your Data Is Used</h3>
          <p>
            Your data is used solely to operate Canvas Pet — displaying your assignments,
            tracking your in-app completion progress, and powering the gamification features.
            We do not sell, share, or disclose your data to third parties for advertising
            or any purpose unrelated to operating the app.
          </p>

          <h3>How Your Data Is Stored</h3>
          <p>
            All data is stored in Supabase, a secure cloud database hosted on AWS.
            Row-Level Security (RLS) policies enforce that you can only access your own records —
            no other user can read your data. Your Canvas access token is stored to enable
            live data sync with your institution's Canvas; it is used only to fetch your
            own data on your behalf.
          </p>

          <h3>Data Retention & Deletion</h3>
          <p>
            Your data is retained only while your account is active. You may request account
            deletion at any time by contacting us, which will permanently remove all stored
            records associated with your account.
          </p>

          <h3>FERPA</h3>
          <p>
            Canvas Pet accesses your Canvas education records (assignment titles, due dates,
            and course identifiers) on your behalf using credentials you provide. By creating
            an account and consenting below, you authorize Canvas Pet to access and store
            this limited set of information as described above. We do not store grades,
            submission content, or any other protected education record beyond what is listed
            in "Data We Collect."
          </p>

          <h3>Contact</h3>
          <p>
            Questions about this policy or data deletion requests can be sent to{' '}
            <a href="mailto:juancavallin@gmail.com">juancavallin@gmail.com</a>.
          </p>
        </div>

        <div className="pp-footer">
          <button className="pp-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
