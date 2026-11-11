import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { TutorialReopenButton } from "@/components/tutorial-reopen-button";
import { PageHeading, Panel } from "@/components/ui";
import { getClinicaAtual } from "@/lib/clinica";
import { redirect } from "next/navigation";
import {
  linkEmailSuporte,
  linkWhatsAppSuporte,
  SUPORTE_EMAIL,
  SUPORTE_WHATSAPP_EXIBICAO,
} from "@/lib/suporte";

const perguntas = [
  {
    pergunta: "Como cadastro serviços?",
    resposta: "A responsável pela clínica pode cadastrar serviços informando nome, duração e, se desejar, preço na página Serviços. A duração é usada automaticamente no agendamento.",
  },
  {
    pergunta: "Como funciona o pacote de sessões e a barra de progresso?",
    resposta: "Um pacote reúne uma paciente, um serviço e a quantidade de sessões. A barra indica o progresso pelas sessões usadas em relação ao total; ao marcar um agendamento como realizado, uma sessão vinculada ao pacote é descontada.",
  },
  {
    pergunta: "Como cadastro uma funcionária?",
    resposta: "Somente a dona cadastra funcionárias pela página Equipe. O acesso é criado com uma senha provisória, que a funcionária precisa trocar no primeiro acesso.",
  },
  {
    pergunta: "Como troco minha senha ou o que faço se esqueci?",
    resposta: "Use Meu perfil para trocar sua senha, ou a opção de redefinição na tela de login se esqueceu. Se o e-mail não chegar, fale com o suporte. A funcionária deve pedir à dona da clínica para redefinir sua senha.",
  },
  {
    pergunta: "Como envio uma mensagem pelo botão “Enviar no Zap”?",
    resposta: "Na agenda ou no cadastro da paciente, use o botão de WhatsApp para abrir uma mensagem pronta. Você pode revisar e enviar a mensagem pelo WhatsApp.",
  },
  {
    pergunta: "O que acontece quando o teste grátis termina?",
    resposta: "Você continua consultando os dados da clínica, mas não consegue criar, editar ou excluir registros até ativar um plano. Fale com a gente para ativar.",
  },
];

export default async function SupportPage() {
  const context = await getClinicaAtual();
  if (!context) redirect("/login");
  const clinicName = context.clinicaNome;
  const userName = context.userNome;
  const whatsappMessage = `Olá! Sou ${userName} da clínica ${clinicName} e preciso de ajuda com o EsteticaFlow.`;
  const emailBody = `Olá! Preciso de ajuda com o EsteticaFlow. Clínica: ${clinicName}.`;

  return (
    <>
      <PageHeading
        eyebrow="Estamos aqui para ajudar"
        title="Central de suporte"
        description="Precisa de ajuda? Fale com a gente pelo canal que preferir."
        action={<TutorialReopenButton />}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="WhatsApp" subtitle={SUPORTE_WHATSAPP_EXIBICAO}>
          <div className="flex flex-col items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true"><MessageCircle size={23} /></span>
            <a href={linkWhatsAppSuporte(whatsappMessage)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
              <MessageCircle size={17} aria-hidden="true" /> Chamar no WhatsApp
            </a>
          </div>
        </Panel>
        <Panel title="E-mail" subtitle={SUPORTE_EMAIL}>
          <div className="flex flex-col items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden="true"><Mail size={23} /></span>
            <a href={linkEmailSuporte("Ajuda com o EsteticaFlow", emailBody)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600">
              <Mail size={17} aria-hidden="true" /> Enviar e-mail
            </a>
          </div>
        </Panel>
      </div>
      <Panel title="Dúvidas frequentes" subtitle="Respostas rápidas sobre o EsteticaFlow" className="mt-5">
        <div className="divide-y divide-rose-100">
          {perguntas.map(({ pergunta, resposta }) => (
            <details key={pergunta} className="group py-4">
              <summary className="cursor-pointer rounded-md text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                <span className="inline-flex items-center gap-2"><LifeBuoy size={16} className="text-rose-500" aria-hidden="true" />{pergunta}</span>
              </summary>
              <p className="mt-3 pl-6 text-sm leading-6 text-muted">{resposta}</p>
            </details>
          ))}
        </div>
      </Panel>
    </>
  );
}
