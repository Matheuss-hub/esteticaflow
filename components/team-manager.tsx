"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  UserRound,
  UserRoundX,
  X,
} from "lucide-react";
import {
  atualizarFuncionario,
  cadastrarFuncionario,
  gerarSenhaProvisoriaAction,
  loadTeamMembersAction,
  redefinirSenhaFuncionario,
  removerFuncionario,
} from "@/app/actions/team";
import { AvatarImage } from "@/components/avatar-image";
import { EmptyState, ErrorNotice, Panel } from "@/components/ui";
import { iniciaisNome } from "@/lib/nomes";

type TeamMember = {
  id: string;
  user_id: string;
  role: string | null;
  nome: string | null;
  funcao: string | null;
  email: string;
  telefone: string;
  foto_url: string | null;
};

type AccessDetails = {
  email: string;
  senhaProvisoria: string;
  telefone: string;
  loginUrl: string;
};

type DialogState =
  | { kind: "edit"; member: TeamMember }
  | { kind: "password"; member: TeamMember }
  | { kind: "remove"; member: TeamMember }
  | null;

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${ddd}) ${number}`;
  const splitAt = digits.length === 11 ? 7 : 6;
  return `(${ddd}) ${number.slice(0, splitAt - 2)}-${number.slice(splitAt - 2)}`;
}

function phoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  return `55${national}`;
}

function accessMessage(access: AccessDetails): string {
  return `Seu acesso ao EsteticaFlow foi criado.\n\nLogin: ${access.loginUrl}\nE-mail: ${access.email}\nSenha provisória: ${access.senhaProvisoria}\n\nPor segurança, troque a senha no primeiro acesso.`;
}

function AccessibleDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    focusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-soft sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="team-dialog-title" className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-muted hover:bg-rose-50">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TeamManager({ writeEnabled = true }: { writeEnabled?: boolean }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [funcao, setFuncao] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(true);
  const [created, setCreated] = useState<AccessDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState("");
  const [dialogSuccess, setDialogSuccess] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editFuncao, setEditFuncao] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await loadTeamMembersAction();
      if ("members" in result) {
        setMembers(result.members as TeamMember[]);
        setCurrentUserId(result.currentUserId);
        setError("");
      } else setError(result.error || "Não foi possível carregar a equipe. Tente novamente.");
    } catch {
      setError("Não foi possível carregar a equipe. Tente novamente.");
    }
    setLoading(false);
  }

  async function generatePassword() {
    setPasswordLoading(true);
    try {
      const result = await gerarSenhaProvisoriaAction();
      if ("error" in result) setFormError(result.error);
      else {
        setSenha(result.senhaProvisoria);
        setFormError("");
      }
    } catch {
      setFormError("Não foi possível gerar uma senha provisória. Tente novamente.");
    }
    setPasswordLoading(false);
  }

  useEffect(() => {
    void load();
    void generatePassword();
  }, []);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setSuccess("");
    setCreated(null);
    try {
      const result = await cadastrarFuncionario({ nome, email, telefone, funcao, senha });
      if ("error" in result) {
        setFormError(result.error);
      } else {
        const access: AccessDetails = {
          ...result,
          loginUrl: `${window.location.origin}/login`,
        };
        setCreated(access);
        setSuccess("Acesso criado com sucesso.");
        setNome("");
        setEmail("");
        setTelefone("");
        setFuncao("");
        await load();
        await generatePassword();
      }
    } catch {
      setFormError("Não foi possível cadastrar o funcionário. Tente novamente.");
    }
    setPending(false);
  }

  async function copyText(value: string, successMessage?: (message: string) => void) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      successMessage?.("Acesso copiado.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      successMessage?.("Não foi possível copiar automaticamente. Selecione e copie os dados manualmente.");
    }
  }

  function openEdit(member: TeamMember) {
    setDialogError("");
    setDialogSuccess("");
    setEditNome(member.nome ?? "");
    setEditTelefone(formatPhoneInput(member.telefone));
    setEditFuncao(member.funcao ?? "");
    setDialog({ kind: "edit", member });
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog?.kind !== "edit") return;
    setPending(true);
    setDialogError("");
    try {
      const result = await atualizarFuncionario({
        userId: dialog.member.user_id,
        nome: editNome,
        telefone: editTelefone,
        funcao: editFuncao,
      });
      if ("error" in result) {
        setDialogError(result.error);
      } else {
        setDialogSuccess(result.success);
        await load();
        setDialog(null);
      }
    } catch {
      setDialogError("Não foi possível atualizar os dados do funcionário. Tente novamente.");
    }
    setPending(false);
  }

  async function resetMemberPassword() {
    if (dialog?.kind !== "password") return;
    setPending(true);
    setDialogError("");
    setResetPassword("");
    try {
      const result = await redefinirSenhaFuncionario({ userId: dialog.member.user_id });
      if ("error" in result) setDialogError(result.error);
      else setResetPassword(result.senhaProvisoria);
    } catch {
      setDialogError("Não foi possível redefinir a senha. Tente novamente.");
    }
    setPending(false);
  }

  async function removeMember() {
    if (dialog?.kind !== "remove") return;
    setPending(true);
    setDialogError("");
    try {
      const result = await removerFuncionario({ userId: dialog.member.user_id });
      if ("error" in result) {
        setDialogError(result.error);
        await load();
      } else {
        setDialog(null);
        setSuccess(result.success);
        await load();
      }
    } catch {
      setDialogError("Não foi possível remover o funcionário. Tente novamente.");
      await load();
    }
    setPending(false);
  }

  const inputField = (label: string, input: ReactNode) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {input}
    </label>
  );

  return (
    <>
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      {success && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
      {!writeEnabled && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Disponível ao ativar o plano</p>}
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Cadastrar funcionário(a)" subtitle="O acesso é criado na hora, sem envio de e-mail.">
          <form onSubmit={submitRegistration} className="space-y-4">
            {inputField("Nome *", <input required minLength={2} maxLength={80} autoComplete="name" value={nome} onChange={(event) => setNome(event.target.value)} className={inputClass} />)}
            {inputField("E-mail *", <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />)}
            {inputField("Telefone/WhatsApp", <input type="tel" inputMode="numeric" autoComplete="tel" value={telefone} onChange={(event) => setTelefone(formatPhoneInput(event.target.value))} placeholder="(11) 91234-5678" className={inputClass} />)}
            {inputField("Função", <input maxLength={60} value={funcao} onChange={(event) => setFuncao(event.target.value)} placeholder="Ex.: esteticista, recepcionista" className={inputClass} />)}
            <label className="block">
              <span className={labelClass}>Senha provisória *</span>
              <span className="flex gap-2">
                <input required minLength={8} autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} type={showPassword ? "text" : "password"} className={`${inputClass} min-w-0 flex-1 font-mono`} />
                <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)} className="rounded-xl border border-rose-100 px-3 text-muted hover:bg-rose-50">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
              <button type="button" disabled={passwordLoading || !writeEnabled} aria-disabled={!writeEnabled} title={!writeEnabled ? "Disponível ao ativar o plano" : undefined} onClick={() => void generatePassword()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50">
                <RefreshCw size={13} /> {passwordLoading ? "Gerando..." : "Gerar outra"}
              </button>
            </label>
            {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
            <button disabled={pending || !senha || !writeEnabled} aria-disabled={!writeEnabled} title={!writeEnabled ? "Disponível ao ativar o plano" : undefined} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              <UserRound size={16} /> {pending ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>

          {created && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Check size={18} />
                <h3 className="font-semibold">Acesso criado</h3>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-xs text-muted">Endereço de login</dt><dd className="break-all font-medium">{created.loginUrl}</dd></div>
                <div><dt className="text-xs text-muted">E-mail</dt><dd className="break-all font-medium">{created.email}</dd></div>
                <div><dt className="text-xs text-muted">Senha provisória</dt><dd className="font-mono font-semibold">{created.senhaProvisoria}</dd></div>
              </dl>
              <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium leading-5 text-amber-950">
                Esta senha aparece só agora. Anote ou envie ao funcionário; ele vai trocá-la no primeiro acesso.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyText(accessMessage(created), setSuccess)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                  <Copy size={14} /> {copied ? "Copiado" : "Copiar acesso"}
                </button>
                {created.telefone && (
                  <a
                    href={`https://wa.me/${phoneForWhatsApp(created.telefone)}?text=${encodeURIComponent(accessMessage(created))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle size={14} /> Enviar no Zap
                  </a>
                )}
                <button type="button" onClick={() => setCreated(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-muted hover:bg-white">Limpar painel</button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Equipe" subtitle={`${members.length} ${members.length === 1 ? "pessoa" : "pessoas"}`}>
          {loading ? <p className="py-8 text-center text-sm text-muted">Carregando equipe...</p> : members.length === 0 ? (
            <EmptyState>Nenhuma pessoa cadastrada nesta clínica.</EmptyState>
          ) : (
            <div className="divide-y divide-rose-50">
              {members.map((member) => {
                const isOwner = member.role === "dona";
                const memberName = member.nome || "Membro da equipe";
                return (
                  <article key={member.id} className="flex items-start gap-3 py-4">
                    <AvatarImage src={member.foto_url} initials={iniciaisNome(memberName)} label={memberName} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{memberName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOwner ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                          {isOwner ? "Dona" : "Atendente"}
                        </span>
                      </div>
                      {member.funcao && <p className="mt-1 text-xs text-muted">{member.funcao}</p>}
                      <div className="mt-2 space-y-1 text-xs text-muted">
                        {member.email && <p className="flex items-center gap-1.5 break-all"><Mail size={12} /> {member.email}</p>}
                        {member.telefone && <p>{formatPhoneInput(member.telefone)}</p>}
                      </div>
                      {!isOwner && member.user_id !== currentUserId && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={!writeEnabled} aria-disabled={!writeEnabled} title={!writeEnabled ? "Disponível ao ativar o plano" : undefined} onClick={() => openEdit(member)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                            <Pencil size={13} /> Editar
                          </button>
                          <button type="button" disabled={!writeEnabled} aria-disabled={!writeEnabled} title={!writeEnabled ? "Disponível ao ativar o plano" : undefined} onClick={() => { setDialogError(""); setDialogSuccess(""); setResetPassword(""); setDialog({ kind: "password", member }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                            <KeyRound size={13} /> Redefinir senha
                          </button>
                          <button type="button" disabled={!writeEnabled} aria-disabled={!writeEnabled} title={!writeEnabled ? "Disponível ao ativar o plano" : undefined} onClick={() => { setDialogError(""); setDialog({ kind: "remove", member }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                            <UserRoundX size={13} /> Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {dialog?.kind === "edit" && (
        <AccessibleDialog title={`Editar ${dialog.member.nome || "funcionário"}`} onClose={() => setDialog(null)}>
          <form onSubmit={submitEdit} className="space-y-4">
            <label className="block"><span className={labelClass}>Nome *</span><input required minLength={2} maxLength={80} value={editNome} onChange={(event) => setEditNome(event.target.value)} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>E-mail</span><input disabled value={dialog.member.email} className={`${inputClass} opacity-60`} /></label>
            <label className="block"><span className={labelClass}>Telefone/WhatsApp</span><input type="tel" inputMode="numeric" value={editTelefone} onChange={(event) => setEditTelefone(formatPhoneInput(event.target.value))} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Função</span><input maxLength={60} value={editFuncao} onChange={(event) => setEditFuncao(event.target.value)} className={inputClass} /></label>
            {dialogError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{dialogError}</p>}
            <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Salvando..." : "Salvar alterações"}</button>
          </form>
        </AccessibleDialog>
      )}

      {dialog?.kind === "password" && (
        <AccessibleDialog title="Redefinir senha" onClose={() => setDialog(null)}>
          <p className="mb-4 text-sm text-muted">Uma nova senha provisória será criada para {dialog.member.nome || "este funcionário"}.</p>
          {resetPassword ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Nova senha provisória: <strong className="font-mono">{resetPassword}</strong>
                <br />A senha aparece só agora. O funcionário deverá trocá-la ao entrar.
              </p>
              <button type="button" onClick={() => void copyText(resetPassword, setDialogSuccess)} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">
                <Copy size={15} /> Copiar senha
              </button>
            </div>
          ) : (
            <button type="button" disabled={pending} onClick={() => void resetMemberPassword()} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Redefinindo..." : "Gerar nova senha"}
            </button>
          )}
          {dialogError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{dialogError}</p>}
          {dialogSuccess && <p role="status" className="mt-3 text-sm text-emerald-700">{dialogSuccess}</p>}
        </AccessibleDialog>
      )}

      {dialog?.kind === "remove" && (
        <AccessibleDialog title="Remover funcionário" onClose={() => setDialog(null)}>
          <p className="mb-4 text-sm leading-6 text-muted">
            Remover <strong>{dialog.member.nome || "este funcionário"}</strong> da clínica? O histórico de agendamentos será mantido.
          </p>
          {dialogError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{dialogError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className="rounded-xl border border-rose-100 px-4 py-2.5 text-sm font-semibold">Cancelar</button>
            <button type="button" disabled={pending} onClick={() => void removeMember()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              <UserRoundX size={15} /> {pending ? "Removendo..." : "Remover"}
            </button>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
