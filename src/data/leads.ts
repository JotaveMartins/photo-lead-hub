export interface Lead {
  id: string;
  whatsapp: string;
  nome: string;
  interesse: string;
  status: 'Sem resposta' | 'Interessado sem resposta' | 'Sem interesse' | 'Em andamento' | 'Indisponibilidade Agenda' | 'Fechado';
  dataEvento?: string;
  dataPedido?: string;
  dataProposata?: string;
  followUp1?: string;
  followUp2?: string;
  followUp3?: string;
  dataFechamento?: string;
  valor?: number;
  motivoPerda?: string;
}

export const leads: Lead[] = [
  {
    id: "1",
    whatsapp: "31997528861",
    nome: "Adrielly",
    interesse: "",
    status: "Sem resposta",
    dataPedido: "10/12/2025",
    followUp1: "05/01/2025"
  },
  {
    id: "2",
    whatsapp: "37999380872",
    nome: "Alice",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "18/07/2026",
    dataPedido: "07/12/2025",
    dataProposata: "08/12/2026"
  },
  {
    id: "3",
    whatsapp: "34992735141",
    nome: "Amanda",
    interesse: "Pacote 1",
    status: "Sem resposta",
    dataEvento: "04/04/2026",
    dataPedido: "27/11/2025",
    followUp1: "28/11/2025",
    followUp2: "29/11/2025",
    followUp3: "08/12/2025"
  },
  {
    id: "4",
    whatsapp: "31999465794",
    nome: "Aquila",
    interesse: "Pacote 1",
    status: "Interessado sem resposta",
    dataEvento: "12/09/2026",
    dataPedido: "18/11/2025",
    dataProposata: "24/11/2025",
    followUp1: "26/11/2025",
    followUp2: "29/11/2025",
    followUp3: "08/12/2015"
  },
  {
    id: "5",
    whatsapp: "31983698065",
    nome: "Barbara",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataPedido: "15/12/2025",
    dataProposata: "23/12/2025",
    followUp1: "06/01/2026",
    motivoPerda: "Fechou com outra empresa"
  },
  {
    id: "6",
    whatsapp: "31997185721",
    nome: "Bruna",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "12/12/2026",
    dataPedido: "05/12/2025",
    dataProposata: "06/12/2025",
    followUp1: "08/12/2025",
    followUp2: "05/01/2026"
  },
  {
    id: "7",
    whatsapp: "31996582089",
    nome: "Carolina",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "04/07/2026",
    dataPedido: "05/12/2026",
    dataProposata: "08/12/2015",
    followUp1: "08/12/2025",
    followUp2: "05/01/2026"
  },
  {
    id: "8",
    whatsapp: "31971418336",
    nome: "Clara",
    interesse: "Pacote 2",
    status: "Sem interesse",
    dataPedido: "21/12/2025",
    followUp1: "06/01/2025"
  },
  {
    id: "9",
    whatsapp: "31971831145",
    nome: "Dayse",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "19/04/2026",
    dataPedido: "13/12/2025",
    dataProposata: "15/12/2025",
    followUp1: "06/01/2026"
  },
  {
    id: "10",
    whatsapp: "31994487054",
    nome: "Dryelly",
    interesse: "Pacote 1",
    status: "Sem resposta",
    dataPedido: "27/11/2025",
    dataProposata: "01/12/2025",
    followUp1: "02/12/2025",
    followUp2: "08/12/2025"
  },
  {
    id: "11",
    whatsapp: "31998343649",
    nome: "Elania",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "13/06/2026",
    dataPedido: "09/12/2025",
    dataProposata: "12/12/2025",
    motivoPerda: "Fechou com um amigo"
  },
  {
    id: "12",
    whatsapp: "31984771558",
    nome: "Elidiane",
    interesse: "Pacote 1",
    status: "Interessado sem resposta",
    dataEvento: "13/06/2026",
    dataPedido: "19/11/2025",
    dataProposata: "20/11/2025",
    followUp1: "29/11/2025",
    followUp2: "02/12/2025",
    followUp3: "08/12/2025"
  },
  {
    id: "13",
    whatsapp: "31975973643",
    nome: "Gabi",
    interesse: "Casamento Civil",
    status: "Sem resposta",
    dataEvento: "18/12/2025",
    dataPedido: "01/12/2025"
  },
  {
    id: "14",
    whatsapp: "11950612015",
    nome: "Grace",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "11/04/2026",
    dataPedido: "11/12/2025",
    dataProposata: "12/12/2025",
    followUp1: "05/01/2025"
  },
  {
    id: "15",
    whatsapp: "31986953862",
    nome: "Sara",
    interesse: "Casamento 2028",
    status: "Em andamento",
    dataEvento: "15/01/2028",
    dataPedido: "28/11/2025"
  },
  {
    id: "16",
    whatsapp: "31989487796",
    nome: "Silvania",
    interesse: "Pacote 2",
    status: "Sem resposta",
    dataEvento: "20/06/2026",
    dataPedido: "08/12/2025",
    dataProposata: "08/11/2025",
    followUp1: "15/12/2025",
    followUp2: "05/01/2026",
    followUp3: "07/01/2026"
  },
  {
    id: "17",
    whatsapp: "31975959995",
    nome: "Talita",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "05/06/2026",
    dataPedido: "27/11/2025",
    dataProposata: "27/11/2025",
    followUp1: "02/12/2025",
    followUp2: "08/12/2025",
    followUp3: "05/01/2026"
  },
  {
    id: "18",
    whatsapp: "31971122219",
    nome: "Thamiris",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataEvento: "01/11/2026",
    dataPedido: "14/12/2025",
    dataProposata: "15/12/2025",
    followUp1: "06/01/2026"
  },
  {
    id: "19",
    whatsapp: "31992524685",
    nome: "Veronica",
    interesse: "Pacote 2",
    status: "Interessado sem resposta",
    dataPedido: "09/12/2025",
    dataProposata: "09/12/2025",
    followUp1: "05/01/2026"
  },
  {
    id: "20",
    whatsapp: "31984755130",
    nome: "Luiza",
    interesse: "Anuncio Estatico Janeiro",
    status: "Indisponibilidade Agenda",
    dataEvento: "12/09/2026",
    dataPedido: "13/01/2026"
  }
];

export const getStatusColor = (status: Lead['status']) => {
  switch (status) {
    case 'Em andamento':
      return 'success';
    case 'Interessado sem resposta':
      return 'warning';
    case 'Sem resposta':
      return 'neutral';
    case 'Sem interesse':
      return 'danger';
    case 'Indisponibilidade Agenda':
      return 'info';
    case 'Fechado':
      return 'success';
    default:
      return 'neutral';
  }
};
