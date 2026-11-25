import { useAuth } from "../context/AuthContext.jsx";

export default function SignInScreen() {
  const { authError, signIn } = useAuth();

  return (
    <div className="auth-gate">
      <img src="/favicon.svg" alt="" className="auth-logo" />
      <h1>Money Pocket</h1>
      <p className="auth-tagline">Sign in to sync your transactions across your devices.</p>
      {authError && <p className="auth-error">{authError}</p>}
      <button className="btn btn-primary" onClick={signIn}>
        Sign in with Google
      </button>
    </div>
  );
}
