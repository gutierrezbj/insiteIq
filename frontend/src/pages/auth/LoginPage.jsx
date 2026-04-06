import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary font-display">InsiteIQ</h1>
          <p className="text-text-tertiary mt-1 text-sm">IT Field Services Platform</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
              placeholder="admin@insiteiq.io"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark hover:shadow-glow-primary disabled:opacity-50 text-text-inverse py-2 rounded-lg text-sm font-medium transition-all duration-fast ease-out-expo"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
