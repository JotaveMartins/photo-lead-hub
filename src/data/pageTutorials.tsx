import { Calendar, DollarSign, Wrench, Package, Search, Trash2, Pencil, Users, BarChart3, TrendingDown, Receipt } from "lucide-react";
import type { TutorialStep } from "@/components/PageTutorial";

export const agendaTutorial: TutorialStep[] = [
  {
    title: "Gerencie seus eventos",
    description: "A Agenda é onde você registra todos os seus trabalhos: casamentos, ensaios, eventos corporativos. Cada evento fica vinculado a um cliente e um serviço.",
    icon: <Calendar className="w-7 h-7" />,
  },
  {
    title: "Crie e edite eventos",
    description: "Clique em 'Novo Evento' para criar. Clique em qualquer evento da lista ou no ícone de lápis para editar. Use o ícone de lixeira para excluir.",
    icon: <Pencil className="w-7 h-7" />,
  },
  {
    title: "Busca e filtros",
    description: "Use a barra de busca para encontrar eventos por título, cliente, serviço, local ou data. Filtre por status para ver apenas os concluídos ou pendentes.",
    icon: <Search className="w-7 h-7" />,
  },
];

export const servicosTutorial: TutorialStep[] = [
  {
    title: "Cadastre seus serviços",
    description: "Registre todos os serviços que você oferece: cobertura de casamento, ensaio pré-wedding, álbum, etc. Defina o valor base e o custo interno de cada um.",
    icon: <Wrench className="w-7 h-7" />,
  },
  {
    title: "Organize por categoria",
    description: "Agrupe seus serviços por categoria para facilitar a gestão. Use a busca para encontrar serviços rapidamente pelo nome ou categoria.",
    icon: <Search className="w-7 h-7" />,
  },
  {
    title: "Edição e exclusão",
    description: "Clique em qualquer serviço para editar. Exclua serviços com o ícone de lixeira e recupere-os pela lixeira no topo da página.",
    icon: <Trash2 className="w-7 h-7" />,
  },
];

export const pacotesTutorial: TutorialStep[] = [
  {
    title: "Monte pacotes personalizados",
    description: "Combine vários serviços em pacotes com preço especial. Ideal para oferecer combos como 'Casamento Completo' com cobertura + álbum + ensaio.",
    icon: <Package className="w-7 h-7" />,
  },
  {
    title: "Serviços incluídos",
    description: "Ao criar um pacote, selecione quais serviços estão incluídos. O valor do pacote pode ser diferente da soma individual dos serviços.",
    icon: <Wrench className="w-7 h-7" />,
  },
  {
    title: "Gerencie seus pacotes",
    description: "Clique em qualquer pacote para editar. Use a lixeira para excluir e recuperar pacotes. A busca encontra pacotes por nome, categoria ou descrição.",
    icon: <Pencil className="w-7 h-7" />,
  },
];

export const cobrancasTutorial: TutorialStep[] = [
  {
    title: "Controle suas cobranças",
    description: "Registre cobranças únicas, parceladas ou com entrada + parcelas. Vincule a um cliente e acompanhe o status de pagamento.",
    icon: <DollarSign className="w-7 h-7" />,
  },
  {
    title: "Acompanhe pagamentos",
    description: "Visualize cobranças pendentes, pagas e vencidas. Atualize o status de pagamento e a data de recebimento diretamente na edição.",
    icon: <Receipt className="w-7 h-7" />,
  },
  {
    title: "Lixeira e recuperação",
    description: "Cobranças excluídas vão para a lixeira, onde podem ser recuperadas ou excluídas permanentemente.",
    icon: <Trash2 className="w-7 h-7" />,
  },
];

export const despesasTutorial: TutorialStep[] = [
  {
    title: "Controle seus custos",
    description: "Registre despesas únicas, parceladas ou recorrentes. Vincule despesas a eventos para calcular a rentabilidade real de cada trabalho.",
    icon: <TrendingDown className="w-7 h-7" />,
  },
  {
    title: "Categorias e filtros",
    description: "Organize despesas por categoria (transporte, equipamento, etc.). Use a busca para encontrar por descrição, categoria ou data.",
    icon: <Search className="w-7 h-7" />,
  },
  {
    title: "Edição e recuperação",
    description: "Clique em qualquer despesa para editar. Itens excluídos podem ser recuperados pela lixeira no topo da página.",
    icon: <Pencil className="w-7 h-7" />,
  },
];

export const clienteDetailTutorial: TutorialStep[] = [
  {
    title: "Visão 360° do cliente",
    description: "Acompanhe tudo sobre o cliente em um só lugar: dados pessoais, cobranças, despesas, serviços, pacotes e eventos agendados.",
    icon: <Users className="w-7 h-7" />,
  },
  {
    title: "Abas organizadas",
    description: "Navegue pelas abas Dados, Cobranças, Despesas, Serviços, Agenda e Relatório para ver cada aspecto do relacionamento com o cliente.",
    icon: <BarChart3 className="w-7 h-7" />,
  },
  {
    title: "Relatório financeiro",
    description: "Na aba Relatório, veja o total de cobranças, valor recebido, custo esperado, despesas lançadas e o lucro real por cliente.",
    icon: <DollarSign className="w-7 h-7" />,
  },
];
