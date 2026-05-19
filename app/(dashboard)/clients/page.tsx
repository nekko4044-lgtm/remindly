"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { Search, Plus, Edit2, Trash2, X } from "lucide-react";

type ClientRow = Client & { appointments_count: number };

const inputCls =
  "w-full px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a] focus:border-transparent";

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
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  function openAdd() {
    setForm({ name: "", phone: "", email: "", notes: "" });
    setFormError(null);
    setAddOpen(true);
  }

  function openEdit(client: Client) {
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? "",
      notes: client.notes ?? "",
    });
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
        .update({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        })
        .eq("id", editTarget.id);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("clients").insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        user_id: user!.id,
      });
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Clients</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-[#e8502a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d44424] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a]"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#555555]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#555555]">
            {search
              ? "No clients match your search."
              : "No clients yet — add your first one."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#151515]">
              <tr>
                {["Name", "Phone", "Email", "Appointments", ""].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium text-[#555555] uppercase tracking-wide ${
                      h === "" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-[#1f1f1f]">
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {client.phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {client.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {client.appointments_count}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(client)}
                        className="p-1.5 text-[#555555] hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(client)}
                        className="p-1.5 text-[#555555] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
        )}
      </div>

      {/* Add / Edit modal */}
      {(addOpen || editTarget) && (
        <Modal
          title={editTarget ? "Edit Client" : "Add Client"}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="Phone *">
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className={inputCls}
                placeholder="+1 555 000 0000"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputCls}
                placeholder="jane@example.com"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Any notes…"
              />
            </Field>
            {formError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {formError}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 text-sm border border-[#2a2a2a] text-[#888888] rounded-lg hover:bg-[#222222] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-[#e8502a] text-white rounded-lg hover:bg-[#d44424] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal title="Delete Client" onClose={closeModal}>
          <p className="text-sm text-[#888888] mb-6">
            Are you sure you want to delete{" "}
            <strong className="text-white">{deleteTarget.name}</strong>? All their appointments will
            also be deleted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeModal}
              className="flex-1 px-4 py-2 text-sm border border-[#2a2a2a] text-[#888888] rounded-lg hover:bg-[#222222] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#888888] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#555555] hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
