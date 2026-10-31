"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { MailPlus, UserRound, UserRoundX } from "lucide-react";
import { inviteTeamMemberAction, loadTeamMembersAction, removeTeamMemberAction } from "@/app/actions/team";
import { EmptyState, ErrorNotice, Panel } from "@/components/ui";

type TeamMember = {
  id: string;
  user_id: string;
  role: string | null;
  nome: string | null;
  created_at: string | null;
};

export function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const result = await loadTeamMembersAction();
    if (result.error) setError(result.error);
    else {
      setMembers((result.members ?? []) as TeamMember[]);
      setCurrentUserId(result.currentUserId ?? "");
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await inviteTeamMemberAction(formData);
      if (result.error) setFormError(result.error);
      else {
        setSuccess(result.success ?? "Convite enviado.");
        form.reset();
        await load();
      }
    });
  }

  function remove(memberId: string) {
    if (!window.confirm("Remover este membro da equipe?")) return;
    setFormError("");
    setSuccess("");
    const formData = new FormData();
    formData.set("membro_id", memberId);
    startTransition(async () => {
      const result = await removeTeamMemberAction(formData);
      if (result.error) setFormError(result.error);
      else {
        setSuccess(result.success ?? "Membro removido.");
        await load();
      }
    });
  }

  return (
    <>
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
      {success && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Convidar atendente" subtitle="A pessoa receberá um convite por e-mail para acessar esta clínica.">
          <form onSubmit={invite} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">E-mail</span>
              <input required type="email" name="email" autoComplete="email" placeholder="nome@clinica.com.br" className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </label>
            <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><MailPlus size={16} />{pending ? "Enviando convite..." : "Convidar atendente"}</button>
          </form>
        </Panel>
        <Panel title="Equipe" subtitle={`${members.length} ${members.length === 1 ? "membro" : "membros"}`}>
          {loading ? <p className="py-8 text-center text-sm text-muted">Carregando equipe...</p> : members.length === 0 ? (
            <EmptyState>Nenhum membro encontrado para esta clínica.</EmptyState>
          ) : (
            <div className="divide-y divide-rose-50">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"><UserRound size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{member.nome || "Membro da equipe"}</p>
                    <p className="mt-0.5 text-xs text-muted">{member.role === "dona" ? "Dona" : "Atendente"}</p>
                  </div>
                  {member.role !== "dona" && member.user_id !== currentUserId && (
                    <button type="button" title="Remover membro" aria-label={`Remover ${member.nome || "atendente"}`} disabled={pending} onClick={() => remove(member.id)} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><UserRoundX size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
