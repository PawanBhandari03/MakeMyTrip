import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/format";

export type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "datetime-local" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  full?: boolean;
};

export type Column = { header: string; render: (row: any) => React.ReactNode; className?: string };

type Props = {
  title: string;
  noun: string;
  description?: string;
  load: () => Promise<any[]>;
  save: (item: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  fields: Field[];
  columns: Column[];
  blank: () => any;
  searchText: (row: any) => string;
  /** Extra filtering controlled by the parent (e.g. a category dropdown). */
  filter?: (row: any) => boolean;
  toolbar?: React.ReactNode;
};

const PAGE = 15;

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const EntityManager = ({
  title,
  noun,
  description,
  load,
  save,
  remove,
  fields,
  columns,
  blank,
  searchText,
  filter,
  toolbar,
}: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRows((await load()) || []);
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load data."));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (!filter || filter(r)) && (!q || searchText(r).toLowerCase().includes(q)));
  }, [rows, query, filter, searchText]);

  useEffect(() => setVisible(PAGE), [query, filter]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload: any = { ...editing };
      fields.forEach((f) => {
        if (f.type === "number") payload[f.key] = Number(payload[f.key] ?? 0);
      });
      await save(payload);
      setEditing(null);
      flash(`${noun} saved`);
      await refresh();
    } catch (err) {
      setFormError(errorMessage(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const del = async (row: any) => {
    if (!window.confirm(`Delete this ${noun.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await remove(row.id);
      flash(`${noun} deleted`);
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not delete."));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <Button
          onClick={() => {
            setFormError("");
            setEditing(blank());
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add {noun.toLowerCase()}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-5 pb-0">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun.toLowerCase()}s...`}
            className={`${inputClass} pl-9`}
          />
        </div>
        {toolbar}
        <span className="text-sm text-slate-500">{shown.length} total</span>
      </div>

      {notice && <p className="mx-5 mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}
      {error && <p className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-slate-500">Nothing here yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                {columns.map((c) => (
                  <th key={c.header} className={`px-3 py-2 font-semibold ${c.className || ""}`}>
                    {c.header}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, visible).map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                  {columns.map((c) => (
                    <td key={c.header} className={`px-3 py-2.5 align-middle ${c.className || ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormError("");
                        setEditing({ ...row });
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => del(row)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {shown.length > visible && (
          <div className="pt-4 text-center">
            <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
              Show more ({shown.length - visible} remaining)
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit" : "Add"} {noun.toLowerCase()}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      className={inputClass}
                      value={editing[f.key] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      required={f.required}
                    >
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={editing[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      required={f.required}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      type={f.type}
                      step={f.type === "number" ? "any" : undefined}
                      value={editing[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      required={f.required}
                    />
                  )}
                  {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
                </div>
              ))}
              {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing.id ? "Update" : "Add"} {noun.toLowerCase()}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntityManager;
