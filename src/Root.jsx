import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import SignInScreen from "./components/SignInScreen.jsx";
import App from "./App.jsx";

function Gate() {
  const { user } = useAuth();

  if (user === undefined) {
    return <div className="auth-loading">Loading…</div>;
  }

  if (!user) {
    return <SignInScreen />;
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
