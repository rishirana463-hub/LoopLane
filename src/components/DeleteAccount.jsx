import { deletionRequestURL, SUPPORT_EMAIL } from '../lib/accountSupport.js';

export default function DeleteAccount() {
  return <main className="account-support-page deletion-page">
    <a className="brand" href="/"><img src="/logo.svg" alt="" />looplane</a>
    <h1>Request account deletion</h1>
    <p>You can request deletion of your Looplane account without signing in or reinstalling the app.</p>
    <section className="account-support-panel">
      <h2>Send your request</h2>
      <p>Email <a className="privacy-contact" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address linked to your account. For Google sign-in, use that Google account’s email address.</p>
      <p>Say that you want your Looplane account and cloud progress deleted. We will verify account ownership before processing the request. Never send a password or verification code.</p>
      <a className="button" href={deletionRequestURL()}>Prepare deletion email</a>
      <p className="muted">This opens a draft in your email app. Review and send it yourself. Opening this page or draft does not delete anything.</p>
    </section>
    <h2>What will be deleted</h2>
    <p>Your Looplane sign-in account and its synced learning progress, including saved lessons, XP, streaks, goals, settings, and mistakes. Account deletion is permanent.</p>
    <h2>What stays on your device</h2>
    <p>Progress and downloaded lessons already stored in a browser or installed app remain on that device. Sign out and clear Looplane’s site data on each device if you want to remove those local copies. Clearing local data alone does not delete your cloud account.</p>
    <p>Vercel’s operational logs and aggregated traffic statistics are managed separately by the hosting provider. See our <a href="/privacy">privacy notice</a> for details.</p>
    <p>We will reply to confirm completion or explain any further ownership checks needed. Do not sign in again after confirmation unless you want to create a new account.</p>
    <a className="text-button" href="/">Back to learning</a>
  </main>;
}
