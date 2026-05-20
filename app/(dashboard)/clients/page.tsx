"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { Plus, Edit2, Trash2, X, Download } from "lucide-react";

type ClientRow = Client & { appointments_count: number };

const inputCls =
  "w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a] focus:ring-1 focus:ring-[#e8502a] transition-colors";

function avatarColor(name: string) {
  const COLORS = ["#7e57c2","#42a5f5","#66bb6a","#ef5350","#ffa726","#26c6da","#ec407a","#8d6e63"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchClients() {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*, appointments(count)")
      .order("name");
    if (data) {
      setClients(
        data.map((c) => ({
          ...c,
          appointments_count:
            (c.appointments as { count: number }[] | null)?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, []); // eslint-disable-line

  const filtered = useMemo(
    () =>
      clients.filter((c) =>
        `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  function openAdd() {
    setForm({ name: "", phone: "", email: "", notes: "" });
    setFormError(null);
    setAddOpen(true);
  }

  function openEdit(client: Client) {
    setForm({ name: client.name, phone: client.phone, email: client.email ?? "", notes: client.notes ?? "" });
    setFormError(null);
    setEditTarget(client);
  }

  function closeModal() {
    setAddOpen(false);
    setEditTarget(null);
    setDeleteTarget(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setFormError(null);

    if (editTarget) {
      const { error } = await supabase
        .from("clients")
        .update({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, notes: form.notes.trim() || null })
        .eq("id", editTarget.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("clients").insert({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, notes: form.notes.trim() || null, user_id: user!.id });
      if (error) { setFormError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    closeModal();
    fetchClients();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("clients").delete().eq("id", deleteTarget.id);
    closeModal();
    fetchClients();
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">Clients</h1>
          <p className="text-[14px] text-[#a3a3a3] mt-1">
            {clients.length} total client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-[#a3a3a3] border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#222222] hover:text-white hover:border-[#353535] transition-all">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 bg-[#e8502a] text-white h-9 px-3.5 rounded-lg text-[13.5px] font-medium hover:bg-[#ff6a3d] transition-colors shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg h-[38px] px-3 flex-1 max-w-[420px] focus-within:border-[#e8502a] transition-colors">
          <svg className="w-3.5 h-3.5 text-[#6b6b6b] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-0 text-[13.5px] text-white placeholder-[#6b6b6b]"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 h-[38px] px-3 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[13px] font-medium text-[#a3a3a3]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            All clients
            <span className="font-mono text-[11.5px] text-[#6b6b6b] bg-[#0d0d0d] px-1.5 py-0.5 rounded">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[14px] text-[#6b6b6b]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-[#6b6b6b]">
            {search ? "No clients match your search." : "No clients yet — add your first one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {["Name", "Phone", "Email", "Total appts", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 font-mono text-[11.5px] font-medium text-[#6b6b6b] uppercase tracking-[0.06em] bg-[#0d0d0d] border-y border-[#2a2a2a] ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1f1f1f] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
                          style={{ background: avatarColor(client.name) }}
                        >
                          {initials(client.name)}
                        </div>
                        <span className="font-medium text-white">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-[#a3a3a3]">{client.phone}</td>
                    <td className="px-5 py-3.5 text-[#a3a3a3]">{client.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-[13px] text-[#a3a3a3]">{client.appointments_count}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(client)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(client)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#6b6b6b] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {(addOpen || editTarget) && (
        <Modal title={editTarget ? "Edit Client" : "Add Client"} onClose={closeModal}>
          <div className="space-y-4">
            <Field label="Name *">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Jane Smith" />
            </Field>
            <Field label="Phone *">
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+1 555 000 0000" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="jane@example.com" />
            </Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Any notes…" />
            </Field>
            {formError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{formError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className="flex-1 h-9 text-[13.5px] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:bg-[#222222] hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-9 text-[13.5px] bg-[#e8502a] text-white rounded-lg hover:bg-[#ff6a3d] disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal title="Delete Client" onClose={closeModal}>
          <p className="text-[13.5px] text-[#a3a3a3] mb-6">
            Are you sure you want to delete{" "}
            <strong className="text-white">{deleteTarget.name}</strong>? All their appointments will also be deleted.
          </p>
          <div className="flex gap-2">
            <button onClick={closeModal} className="flex-1 h-9 text-[13.5px] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:bg-[#222222] hover:text-white transition-colors">Cancel</button>
            <button onClick={handleDelete} className="flex-1 h-9 text-[13.5px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium text-[#a3a3a3] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
