import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Radio, Wrench, Building2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@insiteiq.io", password: "admin123", icon: Shield, color: "bg-amber-600" },
  { label: "Coordinador", email: "coordinator@insiteiq.io", password: "tech123", icon: Radio, color: "bg-cyan-600" },
  { label: "Telefonica", email: "ops@telefonica.com", password: "client123", icon: Building2, color: "bg-blue-600", sub: "Cliente" },
  { label: "Roberto Diaz", email: "roberto.diaz@insiteiq.io", password: "tech123", icon: Wrench, color: "bg-emerald-600", sub: "Tecnico" },
  { label: "Sarah Chen", email: "sarah.chen@insiteiq.io", password: "tech123", icon: Wrench, color: "bg-emerald-600", sub: "Tecnico" },
  { label: "Diego Morales", email: "diego.morales@insiteiq.io", password: "tech123", icon: Wrench, color: "bg-emerald-600", sub: "Tecnico" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(em, pw) {
    setLoading(true);
    try {
      const user = await login(em, pw);
      navigate(user?.role === "technician" ? "/tech" : "/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await handleLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Demo quick-login */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-border" />
            <span className="label-caps text-text-tertiary">Demo accounts</span>
            <div className="h-px flex-1 bg-surface-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => handleLogin(acc.email, acc.password)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-surface-border hover:border-primary/40 hover:shadow-glow-primary/10 transition-all duration-fast ease-out-expo disabled:opacity-50"
              >
                <div className={`w-7 h-7 rounded-md ${acc.color} flex items-center justify-center flex-shrink-0`}>
                  <acc.icon size={14} className="text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{acc.label}</p>
                  {acc.sub && <p className="text-2xs text-text-tertiary">{acc.sub}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
