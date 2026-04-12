import { useAuth } from "../../contexts/AuthContext";
import { User, Mail, Shield, LogOut } from "lucide-react";

export default function TechProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="px-4 py-5">
      <h1 className="text-lg font-display font-semibold text-gray-900 mb-5">Mi perfil</h1>

      <div className="bg-gray-50 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.role}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-gray-400" />
            <span className="text-gray-600">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield size={16} className="text-gray-400" />
            <span className="text-gray-600 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-6 w-full py-3 rounded-lg bg-red-50 text-red-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
      >
        <LogOut size={18} />
        Cerrar sesion
      </button>

      <p className="text-center text-2xs text-gray-300 mt-8">InsiteIQ v1.0 — SRS</p>
    </div>
  );
}
