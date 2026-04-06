import Sidebar from "./Sidebar";

export default function PageWrapper({ children }) {
  return (
    <div className="min-h-screen bg-surface-base">
      <Sidebar />
      <main className="ml-[220px] p-6 pb-12">{children}</main>
    </div>
  );
}
