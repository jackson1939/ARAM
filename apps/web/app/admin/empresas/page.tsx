'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building2, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDrawer } from '@/components/Drawer';
import type { Empresa } from '@/types';

interface UsuarioEmpresa {
  id: string;
  email: string;
  nombre: string | null;
  empresa_id: string | null;
  created_at: string | null;
}

function NuevaEmpresaForm({ onSuccess }: { onSuccess: (emp: Empresa) => void }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, contacto_email: email || undefined }),
    });
    if (res.ok) {
      const json = await res.json() as { data: Empresa };
      toast.success('Empresa creada');
      onSuccess(json.data);
    } else {
      toast.error('Error al crear empresa');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="text-xs text-body-text mb-1 block">Nombre *</label>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-page"
          placeholder="Industrias Bisa"
        />
      </div>
      <div>
        <label className="text-xs text-body-text mb-1 block">Email contacto</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-page"
          placeholder="contacto@empresa.com"
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Guardando…' : 'Crear empresa'}
      </Button>
    </form>
  );
}

function CrearUsuarioForm({
  empresa,
  onSuccess,
}: {
  empresa: Empresa;
  onSuccess: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, empresa_id: empresa.id }),
    });
    if (res.ok) {
      toast.success('Usuario creado');
      onSuccess();
    } else {
      const json = await res.json() as { error?: string };
      toast.error(json.error ?? 'Error al crear usuario');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="text-xs text-body-text mb-1 block">Nombre *</label>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-page"
          placeholder="Juan Pérez"
        />
      </div>
      <div>
        <label className="text-xs text-body-text mb-1 block">Email *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-page"
          placeholder="juan@empresa.com"
        />
      </div>
      <div>
        <label className="text-xs text-body-text mb-1 block">Contraseña *</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-bg-page"
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Creando…' : 'Crear acceso'}
      </Button>
    </form>
  );
}

export default function EmpresasPage() {
  const drawer = useDrawer();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  async function cargarEmpresas() {
    setLoading(true);
    const res = await fetch('/api/empresas');
    const json = await res.json() as { data: Empresa[] };
    setEmpresas(json.data ?? []);
    setLoading(false);
  }

  async function cargarUsuarios(empresaId: string) {
    setLoadingUsuarios(true);
    const res = await fetch(`/api/usuarios?empresa_id=${empresaId}`);
    const json = await res.json() as { data: UsuarioEmpresa[] };
    setUsuarios(json.data ?? []);
    setLoadingUsuarios(false);
  }

  useEffect(() => { cargarEmpresas(); }, []);

  function handleSelectEmpresa(emp: Empresa) {
    setSelected(emp);
    cargarUsuarios(emp.id);
  }

  function abrirNuevaEmpresa() {
    drawer.open({
      title: 'Nueva empresa',
      children: (
        <NuevaEmpresaForm
          onSuccess={(emp) => {
            setEmpresas((prev) => [...prev, emp]);
            drawer.close();
          }}
        />
      ),
    });
  }

  function abrirCrearUsuario(emp: Empresa) {
    drawer.open({
      title: `Crear acceso — ${emp.nombre}`,
      children: (
        <CrearUsuarioForm
          empresa={emp}
          onSuccess={() => {
            cargarUsuarios(emp.id);
            drawer.close();
          }}
        />
      ),
    });
  }

  async function handleEliminarEmpresa(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/empresas?id=${id}`, { method: 'DELETE' });
    toast.success('Empresa eliminada');
    if (selected?.id === id) setSelected(null);
    cargarEmpresas();
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <aside className="w-72 border-r border-border-default flex flex-col bg-card flex-shrink-0">
        <div className="p-4 border-b border-border-default flex-shrink-0">
          <Button onClick={abrirNuevaEmpresa} className="w-full" size="sm">
            <Plus className="w-4 h-4" />
            Nueva empresa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : empresas.length === 0 ? (
            <p className="text-center text-body-text/70 text-sm py-10 px-4">Sin empresas registradas</p>
          ) : (
            empresas.map((emp) => (
              <button
                key={emp.id}
                onClick={() => handleSelectEmpresa(emp)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-page ${
                  selected?.id === emp.id ? 'bg-[#EDF7ED]' : ''
                }`}
              >
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black-heading truncate">{emp.nombre}</p>
                  {emp.contacto_email && (
                    <p className="text-xs text-body-text/70 truncate">{emp.contacto_email}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-body-text/70">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Seleccioná una empresa para ver sus detalles</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0">
              <div>
                <h1 className="text-xl font-extrabold text-black-heading tracking-tight">{selected.nombre}</h1>
                {selected.contacto_email && (
                  <p className="text-sm text-body-text/70 mt-0.5">{selected.contacto_email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => abrirCrearUsuario(selected)}
                  size="sm"
                >
                  <Users className="w-4 h-4" />
                  Agregar usuario
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEliminarEmpresa(selected.id, selected.nombre)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-sm font-semibold text-black-heading mb-3">Usuarios con acceso</h2>
              {loadingUsuarios ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : usuarios.length === 0 ? (
                <div className="bg-card rounded-[12px] border border-border-default flex items-center justify-center py-16">
                  <p className="text-sm text-body-text/70">Sin usuarios. Agregá el primero.</p>
                </div>
              ) : (
                <div className="bg-card rounded-[12px] border border-border-default overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-page">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-body-text uppercase tracking-wide">Nombre</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-body-text uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-body-text uppercase tracking-wide">Creado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {usuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-bg-page">
                          <td className="px-4 py-3 font-medium text-black-heading">{u.nombre ?? '—'}</td>
                          <td className="px-4 py-3 text-body-text">{u.email}</td>
                          <td className="px-4 py-3 text-body-text/70">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('es-BO') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
