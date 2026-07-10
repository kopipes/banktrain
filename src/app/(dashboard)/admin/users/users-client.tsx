"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "mentor" | "trainee";
  division: string;
  createdAt: string;
}

const roleVariant = (role: string): "destructive" | "warning" | "secondary" => {
  if (role === "admin") return "destructive";
  if (role === "mentor") return "warning";
  return "secondary";
};

export function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "trainee", division: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setIsLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setForm({ name: "", email: "", password: "", role: "trainee", division: "" });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleUpdate(id: string, updates: Partial<User>) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    setEditId(null);
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} users across all divisions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-base">New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-name">Full Name</Label>
                <Input id="new-name" className="mt-1" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-email">Email</Label>
                <Input id="new-email" type="email" className="mt-1" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-password">Password</Label>
                <Input id="new-password" type="password" className="mt-1" required minLength={6} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-division">Division</Label>
                <Input id="new-division" className="mt-1" required value={form.division}
                  onChange={(e) => setForm({ ...form, division: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-role">Role</Label>
                <Select id="new-role" className="mt-1" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="trainee">Trainee</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              {error && <p className="text-sm text-red-500 md:col-span-2">{error}</p>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" isLoading={isLoading}>Create User</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {["Name", "Email", "Division", "Role", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.division}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant(u.role)}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:text-red-700 h-7 w-7">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
